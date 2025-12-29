import type { NextApiResponse } from 'next';
import { getSupabase } from '@/lib/supabase';
import { withSupabaseAuth, AuthenticatedRequest } from '@/lib/supabase-middleware';

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const { method } = req;
  const supabase = req.supabaseClient;

  try {
    if (method === 'GET') {
      const { produto_id, limit = '100' } = req.query;

      if (!produto_id) {
        return res.status(400).json({
          success: false,
          message: 'produto_id é obrigatório'
        });
      }

      // Buscar histórico completo do produto
      const { data: historico, error } = await supabase
        .from('estoques_historico')
        .select(`
          id,
          produto_id,
          estoque_id,
          quantidade_anterior,
          quantidade_nova,
          quantidade_mudanca,
          tipo_operacao,
          operacao_id,
          motivo,
          created_at,
          estoque:estoques(nome)
        `)
        .eq('produto_id', produto_id)
        .order('created_at', { ascending: true })
        .limit(parseInt(limit as string, 10));

      if (error) throw error;

      // Buscar o nome do produto
      const { data: produto } = await supabase
        .from('produtos')
        .select('id, nome, preco_custo, preco_venda')
        .eq('id', produto_id)
        .single();

      return res.status(200).json({
        success: true,
        data: {
          produto,
          historico: historico || [],
          total_mudancas: historico?.length || 0
        }
      });
    }

    return res.status(405).json({ success: false, message: 'Método não permitido' });
  } catch (error) {
    console.error('[ESTOQUE_HISTORICO ERROR]', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar histórico de estoque',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export default withSupabaseAuth(handler);
