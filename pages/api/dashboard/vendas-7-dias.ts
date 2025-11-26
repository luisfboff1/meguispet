import type { NextApiResponse } from 'next';
import { getSupabase } from '@/lib/supabase';
import { withSupabaseAuth, AuthenticatedRequest } from '@/lib/supabase-middleware';

// Simple in-memory cache (1 minute TTL for fresher data)
// Reset cache to force reload with new data structure
let vendas7DiasCache: { data: unknown; timestamp: number } | null = null;
const CACHE_TTL = 1 * 60 * 1000; // 1 minute (dados mais frescos)

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  // Check cache first
  const now = Date.now();

  // Invalidar cache ao trocar de dia
  if (vendas7DiasCache) {
    const cacheDate = new Date(vendas7DiasCache.timestamp).toISOString().split('T')[0];
    const currentDate = new Date().toISOString().split('T')[0];
    if (cacheDate !== currentDate) {
      vendas7DiasCache = null; // Limpa cache ao trocar de dia
    }
  }

  if (vendas7DiasCache && (now - vendas7DiasCache.timestamp) < CACHE_TTL) {
    return res.status(200).json(vendas7DiasCache.data);
  }

  // Use authenticated Supabase client for RLS
    const supabase = req.supabaseClient;

  try {
    const currentDate = new Date();
    const sevenDaysAgo = new Date(currentDate);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // -6 = inclui hoje = 7 dias total
    sevenDaysAgo.setHours(0, 0, 0, 0); // Início do dia

    interface DayData {
      data: string;
      vendas: number;
      receita: number;
      despesas: number;
      impostos: number;
    }

    // Inicializar todos os 7 dias com valores zero (garante que todos os dias aparecem no gráfico)
    const allDays: Record<string, DayData> = {};
    for (let i = 0; i < 7; i++) {
      const date = new Date(sevenDaysAgo);
      date.setDate(sevenDaysAgo.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      allDays[dateStr] = { data: dateStr, vendas: 0, receita: 0, despesas: 0, impostos: 0 };
    }

    // Buscar vendas com itens para calcular custos
    const { data: vendas, error } = await supabase
      .from('vendas')
      .select(`
        data_venda,
        valor_final,
        total_produtos_liquido,
        total_ipi,
        total_st,
        itens:vendas_itens(
          quantidade,
          produto:produtos(preco_custo)
        )
      `)
      .gte('data_venda', sevenDaysAgo.toISOString().split('T')[0])
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
      total_produtos_liquido: number;
      total_ipi: number;
      total_st: number;
      itens: ItemRaw[];
    }

    // Agregar dados de vendas nos dias pré-inicializados
    ((vendas || []) as unknown as VendaRaw[]).forEach((venda: VendaRaw) => {
      const date = new Date(venda.data_venda).toISOString().split('T')[0];
      // Só processa se a data estiver no range dos 7 dias
      if (allDays[date]) {
        // Receita líquida SEM impostos (consistente com relatórios)
        const receitaLiquida = venda.total_produtos_liquido ||
          (venda.valor_final - (venda.total_ipi || 0) - (venda.total_st || 0));
        allDays[date].receita += parseFloat(String(receitaLiquida)) || 0;
        allDays[date].vendas += 1;

        // Impostos (IPI + ST)
        allDays[date].impostos += (parseFloat(String(venda.total_ipi)) || 0) + (parseFloat(String(venda.total_st)) || 0);

        // Despesas (custo total dos produtos)
        const custo = (venda.itens || []).reduce((sum, item) => {
          const precoCusto = item.produto?.preco_custo || 0;
          const quantidade = item.quantidade || 0;
          return sum + (precoCusto * quantidade);
        }, 0);
        allDays[date].despesas += custo;
      }
    });

    // Ordenar por data (do mais antigo ao mais recente)
    const result = Object.values(allDays).sort((a, b) => a.data.localeCompare(b.data));

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
