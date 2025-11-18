import type { NextApiRequest, NextApiResponse } from 'next';
import { verifySupabaseUser, getUserProfile, getSupabaseServerAuth } from '@/lib/supabase-auth';

/**
 * Get current user profile
 * GET /api/auth/profile - Get authenticated user's profile
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  if (method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Método não permitido' });
  }

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

    // Get user profile from custom usuarios table (with RLS context)
    const userProfile = await getUserProfile(supabaseUser.email, supabase);

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
    return res.status(500).json({
      success: false,
      message: 'Erro ao carregar perfil',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
