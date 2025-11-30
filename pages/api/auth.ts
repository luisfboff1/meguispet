import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseServerAuth, verifySupabaseUser, getUserProfile } from '@/lib/supabase-auth';
import { withRateLimit, withAuthRateLimit, RateLimitPresets } from '@/lib/rate-limit';

/**
 * Authentication endpoint using Supabase Auth
 * Replaces custom JWT implementation
 *
 * POST /api/auth - Login with email/password (rate-limited: 5 attempts/15min)
 * GET /api/auth/profile - Get current user profile
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
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
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// Apply rate limiting only to POST (login) endpoint
// POST uses email-based rate limiting, GET uses IP-based
const authHandler = function (req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    // Login: 5 attempts per 15 minutes per email
    return withAuthRateLimit(RateLimitPresets.LOGIN, handler)(req, res);
  } else if (req.method === 'GET') {
    // Profile: 100 requests per minute per IP
    return withRateLimit(RateLimitPresets.GENERAL, handler)(req, res);
  } else {
    return handler(req, res);
  }
}

export default authHandler;

const handleLogin = async (req: NextApiRequest, res: NextApiResponse) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email e senha são obrigatórios',
    });
  }

  try {
    // Use Supabase Auth for authentication with server client
    const supabase = getSupabaseServerAuth(req, res);
    
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
    const userProfile = await getUserProfile(email, supabase);

    if (!userProfile) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não encontrado ou inativo',
      });
    }

    // Return session token and user data
    // Note: supabase_user_id fallback is for legacy users that don't have it stored yet
    const resolvedSupabaseUserId = userProfile.supabase_user_id || data.session.user.id;
    if (!userProfile.supabase_user_id) {
      console.warn('[AUTH] User missing supabase_user_id in database, using session ID:', {
        userId: userProfile.id,
        email: userProfile.email,
        sessionUserId: data.session.user.id
      });
    }

    // Login successful - Supabase cookies are set automatically by getSupabaseServerAuth
    console.log('✅ Login successful', {
      email: userProfile.email,
      userId: resolvedSupabaseUserId
    });

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
          supabase_user_id: resolvedSupabaseUserId,
        },
      },
      message: 'Login realizado com sucesso',
    });
  } catch (error) {
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
    const supabaseUser = await verifySupabaseUser(req, res);

    if (!supabaseUser || !supabaseUser.email) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido ou expirado',
      });
    }

    // Get authenticated supabase client
    const supabase = getSupabaseServerAuth(req, res);

    // Get user profile from custom usuarios table
    const userProfile = await getUserProfile(supabaseUser.email, supabase);

    if (!userProfile) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado',
      });
    }

    // Note: supabase_user_id fallback is for legacy users that don't have it stored yet
    const resolvedSupabaseUserId = userProfile.supabase_user_id || supabaseUser.id;
    if (!userProfile.supabase_user_id) {
      console.warn('[AUTH] User missing supabase_user_id in database (GET profile):', {
        userId: userProfile.id,
        email: userProfile.email,
        sessionUserId: supabaseUser.id
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
        supabase_user_id: resolvedSupabaseUserId,
      },
      message: 'Perfil carregado com sucesso',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro ao carregar perfil',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
