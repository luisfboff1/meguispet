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

  const categoriaId = parseInt(id, 10);

  try {
    if (method === 'GET') {
      const { data, error } = await supabase
        .from('categorias_financeiras')
        .select('*')
        .eq('id', categoriaId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ success: false, message: 'Categoria não encontrada' });
        }
        throw error;
      }

      return res.status(200).json({ success: true, data });
    }

    if (method === 'PUT') {
      const { nome, tipo, cor, icone, descricao, ativo, ordem } = req.body;

      // Check if categoria exists
      const { data: existing, error: checkError } = await supabase
        .from('categorias_financeiras')
        .select('id')
        .eq('id', categoriaId)
        .single();

      if (checkError || !existing) {
        return res.status(404).json({ success: false, message: 'Categoria não encontrada' });
      }

      // Check name uniqueness if changing name
      if (nome) {
        const { data: duplicate } = await supabase
          .from('categorias_financeiras')
          .select('id')
          .eq('nome', nome)
          .neq('id', categoriaId)
          .single();

        if (duplicate) {
          return res.status(400).json({ 
            success: false, 
            message: 'Já existe uma categoria com este nome' 
          });
        }
      }

      const updateData = {
        ...(nome !== undefined && { nome }),
        ...(tipo !== undefined && { tipo }),
        ...(cor !== undefined && { cor }),
        ...(icone !== undefined && { icone }),
        ...(descricao !== undefined && { descricao }),
        ...(ativo !== undefined && { ativo }),
        ...(ordem !== undefined && { ordem }),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('categorias_financeiras')
        .update(updateData)
        .eq('id', categoriaId)
        .select()
        .single();

      if (error) throw error;

      return res.status(200).json({ 
        success: true, 
        message: 'Categoria atualizada com sucesso', 
        data 
      });
    }

    if (method === 'DELETE') {
      // Check if categoria exists
      const { data: existing, error: checkError } = await supabase
        .from('categorias_financeiras')
        .select('id')
        .eq('id', categoriaId)
        .single();

      if (checkError || !existing) {
        return res.status(404).json({ success: false, message: 'Categoria não encontrada' });
      }

      // Check if categoria is being used
      const { data: usedInTransacoes } = await supabase
        .from('transacoes')
        .select('id')
        .eq('categoria_id', categoriaId)
        .limit(1);

      if (usedInTransacoes && usedInTransacoes.length > 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Não é possível excluir uma categoria que está sendo utilizada em transações' 
        });
      }

      const { error } = await supabase
        .from('categorias_financeiras')
        .delete()
        .eq('id', categoriaId);

      if (error) throw error;

      return res.status(200).json({ 
        success: true, 
        message: 'Categoria excluída com sucesso' 
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
