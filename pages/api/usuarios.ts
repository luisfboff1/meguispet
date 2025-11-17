import type { NextApiResponse } from 'next';
import { getSupabase } from '@/lib/supabase';
import { withSupabaseAuth, AuthenticatedRequest } from '@/lib/supabase-middleware';

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const { method } = req;

  try {
    const supabase = getSupabase();

    if (method === 'GET') {
      const { page = '1', limit = '10' } = req.query;
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const offset = (pageNum - 1) * limitNum;

      const { data: usuarios, count, error } = await supabase
        .from('usuarios')
        .select('id, nome, email, role, permissoes, ativo, created_at, updated_at', { count: 'exact' })
        .eq('ativo', true)
        .order('nome', { ascending: true })
        .range(offset, offset + limitNum - 1);

      if (error) throw error;

      return res.status(200).json({
        success: true,
        data: usuarios || [],
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: count || 0,
          pages: Math.ceil((count || 0) / limitNum),
        },
      });
    }

    if (method === 'POST') {
      const { nome, email, password, role, permissoes } = req.body;

      if (!nome || !email || !password) {
        return res.status(400).json({ success: false, message: 'Nome, email e senha são obrigatórios' });
      }

      // Note: User creation now needs to use Supabase Auth signup
      // For now, this endpoint is deprecated for creating auth users
      // It can be used for updating user metadata only
      return res.status(501).json({
        success: false,
        message: 'Criação de usuário deve ser feita via Supabase Auth signup',
      });
    }

    if (method === 'PUT') {
      // Accept ID from either body or query parameter
      const idFromBody = req.body?.id;
      const idFromQuery = req.query?.id;
      const id = idFromBody || idFromQuery;
      
      const { nome, email, role, permissoes } = req.body;

      if (!id) {
        return res.status(400).json({ success: false, message: 'ID do usuário é obrigatório' });
      }

      // Only update metadata in usuarios table
      // Password changes should be done via Supabase Auth
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      
      // Only add fields that were provided
      if (nome !== undefined) updateData.nome = nome;
      if (email !== undefined) updateData.email = email;
      if (role !== undefined) updateData.role = role;
      if (permissoes !== undefined) updateData.permissoes = permissoes;

      const { data, error } = await supabase
        .from('usuarios')
        .update(updateData)
        .eq('id', id)
        .select('id, nome, email, role, permissoes, ativo, created_at, updated_at');

      if (error) throw error;

      if (!data || data.length === 0) {
        return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
      }

      return res.status(200).json({
        success: true,
        message: 'Usuário atualizado com sucesso',
        data: data[0],
      });
    }

    if (method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ success: false, message: 'ID do usuário é obrigatório' });
      }

      const { data, error } = await supabase
        .from('usuarios')
        .update({ ativo: false, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
      }

      return res.status(200).json({
        success: true,
        message: 'Usuário removido com sucesso',
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
