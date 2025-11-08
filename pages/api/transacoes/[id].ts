import type { NextApiResponse } from 'next';
import { getSupabase } from '@/lib/supabase';
import { withSupabaseAuth, AuthenticatedRequest } from '@/lib/supabase-middleware';

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const { method, query } = req;
  const { id } = query;
  const supabase = getSupabase();

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ success: false, message: 'ID inválido' });
  }

  const transacaoId = parseInt(id, 10);

  try {
    if (method === 'GET') {
      // Buscar transação individual
      const { data, error } = await supabase
        .from('transacoes')
        .select('*')
        .eq('id', transacaoId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ success: false, message: 'Transação não encontrada' });
        }
        throw error;
      }

      return res.status(200).json({ success: true, data });
    }

    if (method === 'PUT') {
      // Atualizar transação
      const { tipo, categoria, categoria_id, descricao, valor, data_transacao, forma_pagamento, status, venda_id, observacoes } = req.body;

      // Verificar se a transação existe
      const { data: existingTransacao, error: checkError } = await supabase
        .from('transacoes')
        .select('id')
        .eq('id', transacaoId)
        .single();

      if (checkError || !existingTransacao) {
        return res.status(404).json({ success: false, message: 'Transação não encontrada' });
      }

      // Preparar dados para atualização
      const updateData = {
        ...(tipo !== undefined && { tipo }),
        ...(categoria !== undefined && { categoria }),
        ...(categoria_id !== undefined && { categoria_id }),
        ...(descricao !== undefined && { descricao }),
        ...(valor !== undefined && { valor }),
        ...(data_transacao !== undefined && { data_transacao }),
        ...(forma_pagamento !== undefined && { forma_pagamento }),
        ...(status !== undefined && { status }),
        ...(venda_id !== undefined && { venda_id }),
        ...(observacoes !== undefined && { observacoes }),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('transacoes')
        .update(updateData)
        .eq('id', transacaoId)
        .select()
        .single();

      if (error) throw error;

      return res.status(200).json({ 
        success: true, 
        message: 'Transação atualizada com sucesso', 
        data 
      });
    }

    if (method === 'DELETE') {
      // Verificar se a transação existe
      const { data: existingTransacao, error: checkError } = await supabase
        .from('transacoes')
        .select('id')
        .eq('id', transacaoId)
        .single();

      if (checkError || !existingTransacao) {
        return res.status(404).json({ success: false, message: 'Transação não encontrada' });
      }

      // Excluir transação
      const { error } = await supabase
        .from('transacoes')
        .delete()
        .eq('id', transacaoId);

      if (error) throw error;

      return res.status(200).json({ 
        success: true, 
        message: 'Transação excluída com sucesso' 
      });
    }

    return res.status(405).json({ success: false, message: 'Método não permitido' });
  } catch (error) {
    console.error('Transacoes [id] API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export default withSupabaseAuth(handler);
