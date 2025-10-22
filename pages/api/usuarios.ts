import type { NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import { getSupabase } from '@/lib/supabase';
import { withAuth, AuthenticatedRequest } from '@/lib/api-middleware';

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

      const password_hash = await bcrypt.hash(password, 10);

      const { data, error } = await supabase
        .from('usuarios')
        .insert({
          nome,
          email,
          password_hash,
          role: role || 'user',
          permissoes: permissoes || null,
        })
        .select('id, nome, email, role, permissoes, ativo, created_at, updated_at')
        .single();

      if (error) throw error;

      return res.status(201).json({
        success: true,
        message: 'Usuário criado com sucesso',
        data,
      });
    }

    if (method === 'PUT') {
      const { id, nome, email, password, role, permissoes } = req.body;

      if (!id) {
        return res.status(400).json({ success: false, message: 'ID do usuário é obrigatório' });
      }

      interface UpdateData {
        nome: string;
        email: string;
        role: string;
        permissoes: string | null;
        updated_at: string;
        password_hash?: string;
      }

      const updateData: UpdateData = {
        nome,
        email,
        role: role || 'user',
        permissoes: permissoes || null,
        updated_at: new Date().toISOString(),
      };

      if (password) {
        updateData.password_hash = await bcrypt.hash(password, 10);
      }

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
    console.error('Usuarios API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export default withAuth(handler);
