import type { NextApiResponse } from 'next';
import { getSupabase } from '@/lib/supabase';
import { withSupabaseAuth, AuthenticatedRequest } from '@/lib/supabase-middleware';

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
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

    return res.status(200).json({
      success: true,
      data: result,
    });
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
