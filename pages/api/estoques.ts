import type { NextApiResponse } from 'next';
import { getSupabase } from '@/lib/supabase';
import { withSupabaseAuth, AuthenticatedRequest } from '@/lib/supabase-middleware';

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const { method } = req;

  try {
    // Use authenticated Supabase client for RLS
    const supabase = req.supabaseClient;

    if (method === 'GET') {
      const { data: estoques, error } = await supabase
        .from('estoques')
        .select('*')
        .eq('ativo', true)
        .order('nome', { ascending: true });

      if (error) throw error;

      return res.status(200).json({
        success: true,
        data: estoques || [],
      });
    }

    if (method === 'POST') {
      const { nome, descricao } = req.body;

      if (!nome) {
        return res.status(400).json({ success: false, message: 'Nome do estoque é obrigatório' });
      }

      const { data, error } = await supabase
        .from('estoques')
        .insert({
          nome,
          descricao: descricao || null,
        })
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json({
        success: true,
        message: 'Estoque criado com sucesso',
        data,
      });
    }

    if (method === 'PUT') {
      const { id, nome, descricao } = req.body;

      if (!id) {
        return res.status(400).json({ success: false, message: 'ID do estoque é obrigatório' });
      }

      const { data, error } = await supabase
        .from('estoques')
        .update({
          nome,
          descricao: descricao || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        return res.status(404).json({ success: false, message: 'Estoque não encontrado' });
      }

      return res.status(200).json({
        success: true,
        message: 'Estoque atualizado com sucesso',
        data: data[0],
      });
    }

    if (method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ success: false, message: 'ID do estoque é obrigatório' });
      }

      const { data, error } = await supabase
        .from('estoques')
        .update({ ativo: false, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        return res.status(404).json({ success: false, message: 'Estoque não encontrado' });
      }

      return res.status(200).json({
        success: true,
        message: 'Estoque removido com sucesso',
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
