import type { NextApiResponse } from 'next';
import { getSupabase } from '@/lib/supabase';
import { withSupabaseAuth, AuthenticatedRequest } from '@/lib/supabase-middleware';

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const { method } = req;

  try {
    // Use authenticated Supabase client for RLS
    const supabase = req.supabaseClient;

    if (method === 'GET') {
      const { data: formasPagamento, error } = await supabase
        .from('formas_pagamento')
        .select('*')
        .eq('ativo', true)
        .order('ordem', { ascending: true });

      if (error) throw error;

      return res.status(200).json({
        success: true,
        data: formasPagamento || [],
      });
    }

    if (method === 'POST') {
      const { nome, ordem } = req.body;

      if (!nome) {
        return res.status(400).json({ success: false, message: 'Nome da forma de pagamento é obrigatório' });
      }

      const { data, error } = await supabase
        .from('formas_pagamento')
        .insert({
          nome,
          ordem: ordem || 0,
        })
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json({
        success: true,
        message: 'Forma de pagamento criada com sucesso',
        data,
      });
    }

    if (method === 'PUT') {
      const { id, nome, ordem } = req.body;

      if (!id) {
        return res.status(400).json({ success: false, message: 'ID da forma de pagamento é obrigatório' });
      }

      const { data, error } = await supabase
        .from('formas_pagamento')
        .update({
          nome,
          ordem: ordem || 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        return res.status(404).json({ success: false, message: 'Forma de pagamento não encontrada' });
      }

      return res.status(200).json({
        success: true,
        message: 'Forma de pagamento atualizada com sucesso',
        data: data[0],
      });
    }

    if (method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ success: false, message: 'ID da forma de pagamento é obrigatório' });
      }

      const { data, error } = await supabase
        .from('formas_pagamento')
        .delete()
        .eq('id', id)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        return res.status(404).json({ success: false, message: 'Forma de pagamento não encontrada' });
      }

      return res.status(200).json({
        success: true,
        message: 'Forma de pagamento removida com sucesso',
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
