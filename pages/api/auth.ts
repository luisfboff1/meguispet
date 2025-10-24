import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseBrowser } from '@/lib/supabase';
import { verifySupabaseUser, getUserProfile } from '@/lib/supabase-auth';

/**
 * Authentication endpoint using Supabase Auth
 * Replaces custom JWT implementation
 * 
 * POST /api/auth - Login with email/password
 * GET /api/auth/profile - Get current user profile
 */
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

  try {
    // Use Supabase Auth for authentication
    const supabase = getSupabaseBrowser();
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas',
      });
    }

    // Get user profile from custom usuarios table
    const userProfile = await getUserProfile(email);

    if (!userProfile) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não encontrado ou inativo',
      });
    }

    // Return session token and user data
    return res.status(200).json({
      success: true,
      data: {
        token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
        user: {
          id: userProfile.id,
          nome: userProfile.nome,
          email: userProfile.email,
          role: userProfile.role,
          permissoes: userProfile.permissoes,
          ativo: userProfile.ativo,
        },
      },
      message: 'Login realizado com sucesso',
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao realizar login',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

const handleGetProfile = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    // Verify Supabase user from JWT token
    const supabaseUser = await verifySupabaseUser(req);

    if (!supabaseUser || !supabaseUser.email) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido ou expirado',
      });
    }

    // Get user profile from custom usuarios table
    const userProfile = await getUserProfile(supabaseUser.email);

    if (!userProfile) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: userProfile.id,
        nome: userProfile.nome,
        email: userProfile.email,
        role: userProfile.role,
        permissoes: userProfile.permissoes,
        ativo: userProfile.ativo,
      },
      message: 'Perfil carregado com sucesso',
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao carregar perfil',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
