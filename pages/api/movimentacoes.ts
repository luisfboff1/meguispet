import type { NextApiResponse } from 'next';
import { getSupabase } from '@/lib/supabase';
import { withSupabaseAuth, AuthenticatedRequest } from '@/lib/supabase-middleware';

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const { method } = req;
  // Use authenticated Supabase client for RLS
    const supabase = req.supabaseClient;

  try {
    if (method === 'GET') {
      const { page = '1', limit = '10', tipo = '', status = '' } = req.query;
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const offset = (pageNum - 1) * limitNum;

      let query = supabase
        .from('movimentacoes_estoque')
        .select('*, fornecedor:fornecedores(nome), itens:movimentacoes_itens(*, produto:produtos(nome))', { count: 'exact' });

      if (tipo) query = query.eq('tipo', tipo);
      if (status) query = query.eq('status', status);

      const { data, count, error } = await query
        .order('data_movimentacao', { ascending: false })
        .range(offset, offset + limitNum - 1);

      if (error) throw error;

      return res.status(200).json({
        success: true,
        data: data || [],
        pagination: { page: pageNum, limit: limitNum, total: count || 0, pages: Math.ceil((count || 0) / limitNum) },
      });
    }

    if (method === 'POST') {
      const { tipo, fornecedor_id, numero_pedido, data_movimentacao, valor_total, condicao_pagamento, status, observacoes, itens } = req.body;

      const { data: movimentacao, error } = await supabase
        .from('movimentacoes_estoque')
        .insert({
          tipo,
          fornecedor_id: fornecedor_id || null,
          numero_pedido: numero_pedido || null,
          data_movimentacao: data_movimentacao || new Date().toISOString(),
          valor_total: valor_total || 0,
          condicao_pagamento: condicao_pagamento || 'avista',
          status: status || 'pendente',
          observacoes: observacoes || null,
        })
        .select()
        .single();

      if (error) throw error;

      if (itens && Array.isArray(itens)) {
        interface MovimentacaoItemInput {
          produto_id: number;
          quantidade: number;
          preco_unitario: number;
          subtotal: number;
        }

        const itensInsert = itens.map((item: MovimentacaoItemInput) => ({
          movimentacao_id: movimentacao.id,
          produto_id: item.produto_id,
          quantidade: item.quantidade,
          preco_unitario: item.preco_unitario,
          subtotal: item.subtotal,
        }));

        await supabase.from('movimentacoes_itens').insert(itensInsert);
      }

      return res.status(201).json({
        success: true,
        message: 'Movimentação criada com sucesso',
        data: movimentacao,
      });
    }

    if (method === 'PUT') {
      const { id, status, observacoes } = req.body;

      if (!id) {
        return res.status(400).json({ success: false, message: 'ID da movimentação é obrigatório' });
      }

      const { data, error } = await supabase
        .from('movimentacoes_estoque')
        .update({ status, observacoes, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select();

      if (error) throw error;

      return res.status(200).json({
        success: true,
        message: 'Movimentação atualizada com sucesso',
        data: data?.[0],
      });
    }

    return res.status(405).json({ success: false, message: 'Método não permitido' });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export default withSupabaseAuth(handler);
