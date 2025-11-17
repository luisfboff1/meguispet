import type { NextApiResponse } from 'next';
import { getSupabase } from '@/lib/supabase';
import { withSupabaseAuth, AuthenticatedRequest } from '@/lib/supabase-middleware';

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const supabase = getSupabase();

  try {
    const { limit = '5' } = req.query;
    const limitNum = parseInt(limit as string, 10);

    const { data: vendas, error } = await supabase
      .from('vendas')
      .select('*, cliente:clientes_fornecedores(nome), vendedor:vendedores(nome)')
      .order('data_venda', { ascending: false })
      .limit(limitNum);

    if (error) throw error;

    return res.status(200).json({
      success: true,
      data: vendas || [],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export default withSupabaseAuth(handler);
