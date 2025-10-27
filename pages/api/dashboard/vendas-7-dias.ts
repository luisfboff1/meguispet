import type { NextApiResponse } from 'next';
import { getSupabase } from '@/lib/supabase';
import { withSupabaseAuth, AuthenticatedRequest } from '@/lib/supabase-middleware';

// Simple in-memory cache (5 minutes TTL)
let vendas7DiasCache: { data: unknown; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  // Check cache first
  const now = Date.now();
  if (vendas7DiasCache && (now - vendas7DiasCache.timestamp) < CACHE_TTL) {
    console.log('📈 Serving vendas 7 dias from cache');
    return res.status(200).json(vendas7DiasCache.data);
  }

  const supabase = getSupabase();

  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: vendas, error } = await supabase
      .from('vendas')
      .select('data_venda, valor_final')
      .gte('data_venda', sevenDaysAgo.toISOString())
      .neq('status', 'cancelado')
      .order('data_venda', { ascending: true });

    if (error) throw error;

    interface VendaRaw {
      data_venda: string;
      valor_final: number;
    }

    interface DayData {
      data: string;
      vendas: number;
      receita: number;
    }

    const groupedByDate = (vendas || []).reduce((acc: Record<string, DayData>, venda: VendaRaw) => {
      const date = new Date(venda.data_venda).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { data: date, vendas: 0, receita: 0 };
      }
      acc[date].receita += parseFloat(String(venda.valor_final)) || 0;
      acc[date].vendas += 1;
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
    console.error('Dashboard Vendas 7 Dias API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export default withSupabaseAuth(handler);
