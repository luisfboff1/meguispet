import type { NextApiResponse } from 'next';
import { getSupabase } from '@/lib/supabase';
import { withSupabaseAuth, AuthenticatedRequest } from '@/lib/supabase-middleware';

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const { method } = req;
  const supabase = getSupabase();

  try {
    if (method === 'GET') {
      const { page = '1', limit = '10', tipo = '', status = '' } = req.query;
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const offset = (pageNum - 1) * limitNum;

      let query = supabase.from('transacoes').select('*', { count: 'exact' });

      if (tipo) query = query.eq('tipo', tipo);
      if (status) query = query.eq('status', status);

      const { data, count, error } = await query
        .order('data_transacao', { ascending: false })
        .range(offset, offset + limitNum - 1);

      if (error) throw error;

      return res.status(200).json({
        success: true,
        data: data || [],
        pagination: { page: pageNum, limit: limitNum, total: count || 0, pages: Math.ceil((count || 0) / limitNum) },
      });
    }

    if (method === 'POST') {
      const { tipo, categoria, categoria_id, descricao, valor, data_transacao, forma_pagamento, status, venda_id, observacoes, transacao_recorrente_id } = req.body;

      const { data, error } = await supabase
        .from('transacoes')
        .insert({
          tipo,
          categoria: categoria || null,
          categoria_id: categoria_id || null,
          descricao: descricao || null,
          valor,
          data_transacao: data_transacao || new Date().toISOString(),
          forma_pagamento: forma_pagamento || null,
          status: status || 'pendente',
          venda_id: venda_id || null,
          transacao_recorrente_id: transacao_recorrente_id || null,
          observacoes: observacoes || null,
        })
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json({ success: true, message: 'Transação criada com sucesso', data });
    }

    return res.status(405).json({ success: false, message: 'Método não permitido' });
  } catch (error) {
    console.error('Transacoes API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export default withSupabaseAuth(handler);
