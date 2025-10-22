import type { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import { getSupabase } from '@/lib/supabase';
import { signJWT, verifyJWT, extractTokenFromHeader } from '@/lib/jwt-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  try {
    if (method === 'POST') {
      return await handleLogin(req, res);
    } else if (method === 'GET') {
      return await handleGetProfile(req, res);
    } else {
      return res.status(405).json({ success: false, message: 'Método não permitido' });
    }
  } catch (error) {
    console.error('Auth API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

const handleLogin = async (req: NextApiRequest, res: NextApiResponse) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email e senha são obrigatórios',
    });
  }

  const supabase = getSupabase();

  const { data: user, error } = await supabase
    .from('usuarios')
    .select('id, nome, email, password_hash, role, permissoes, ativo')
    .eq('email', email)
    .eq('ativo', true)
    .single();

  if (error || !user) {
    return res.status(401).json({
      success: false,
      message: 'Credenciais inválidas',
    });
  }

  const passwordMatch = await bcrypt.compare(password, user.password_hash);

  if (!passwordMatch) {
    return res.status(401).json({
      success: false,
      message: 'Credenciais inválidas',
    });
  }

  const token = signJWT({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  const userData = {
    id: user.id,
    nome: user.nome,
    email: user.email,
    role: user.role,
    permissoes: user.permissoes,
    ativo: user.ativo,
  };

  return res.status(200).json({
    success: true,
    data: {
      token,
      user: userData,
    },
    message: 'Login realizado com sucesso',
  });
};

const handleGetProfile = async (req: NextApiRequest, res: NextApiResponse) => {
  const token = extractTokenFromHeader(req.headers.authorization);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Token não fornecido',
    });
  }

  const payload = verifyJWT(token);

  if (!payload) {
    return res.status(401).json({
      success: false,
      message: 'Token inválido ou expirado',
    });
  }

  const supabase = getSupabase();

  const { data: user, error } = await supabase
    .from('usuarios')
    .select('id, nome, email, role, permissoes, ativo')
    .eq('id', payload.id)
    .single();

  if (error || !user) {
    return res.status(404).json({
      success: false,
      message: 'Usuário não encontrado',
    });
  }

  return res.status(200).json({
    success: true,
    data: user,
    message: 'Perfil carregado com sucesso',
  });
};
