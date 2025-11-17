import type { NextApiResponse } from 'next';
import { getSupabase } from '@/lib/supabase';
import { withSupabaseAuth, AuthenticatedRequest } from '@/lib/supabase-middleware';

// Simple in-memory cache (5 minutes TTL)
// Reset cache to force reload with new data structure
let vendas7DiasCache: { data: unknown; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  // Check cache first
  const now = Date.now();
  if (vendas7DiasCache && (now - vendas7DiasCache.timestamp) < CACHE_TTL) {
    return res.status(200).json(vendas7DiasCache.data);
  }

  const supabase = getSupabase();

  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Buscar vendas com itens para calcular custos
    const { data: vendas, error } = await supabase
      .from('vendas')
      .select(`
        data_venda,
        valor_final,
        total_ipi,
        total_st,
        itens:vendas_itens(
          quantidade,
          produto:produtos(preco_custo)
        )
      `)
      .gte('data_venda', sevenDaysAgo.toISOString())
      .neq('status', 'cancelado')
      .order('data_venda', { ascending: true });

    if (error) throw error;

    interface ItemRaw {
      quantidade: number;
      produto: { preco_custo: number } | null;
    }

    interface VendaRaw {
      data_venda: string;
      valor_final: number;
      total_ipi: number;
      total_st: number;
      itens: ItemRaw[];
    }

    interface DayData {
      data: string;
      vendas: number;
      receita: number;
      despesas: number;
      impostos: number;
    }

    const groupedByDate = ((vendas || []) as unknown as VendaRaw[]).reduce((acc: Record<string, DayData>, venda: VendaRaw) => {
      const date = new Date(venda.data_venda).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { data: date, vendas: 0, receita: 0, despesas: 0, impostos: 0 };
      }

      // Receita e contagem
      acc[date].receita += parseFloat(String(venda.valor_final)) || 0;
      acc[date].vendas += 1;

      // Impostos (IPI + ST)
      acc[date].impostos += (parseFloat(String(venda.total_ipi)) || 0) + (parseFloat(String(venda.total_st)) || 0);

      // Despesas (custo total dos produtos)
      const custo = (venda.itens || []).reduce((sum, item) => {
        const precoCusto = item.produto?.preco_custo || 0;
        const quantidade = item.quantidade || 0;
        return sum + (precoCusto * quantidade);
      }, 0);
      acc[date].despesas += custo;

      return acc;
    }, {});

    const result = Object.values(groupedByDate);

    const response = {
      success: true,
      data: result,
    };

    // Cache the response
    vendas7DiasCache = { data: response, timestamp: now };

    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export default withSupabaseAuth(handler);
