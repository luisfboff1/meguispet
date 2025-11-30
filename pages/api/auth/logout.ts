import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseServerAuth } from '@/lib/supabase-auth';

/**
 * Logout endpoint using Supabase Auth
 * POST /api/auth/logout - Sign out current user
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  if (method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método não permitido' });
  }

  try {
    // Get Supabase client with user context
    const supabase = getSupabaseServerAuth(req, res);
    
    // Sign out the user
    const { error } = await supabase.auth.signOut();

    if (error) {
      return res.status(500).json({
        success: false,
        message: 'Erro ao realizar logout',
        error: error.message,
      });
    }

    // Logout successful - Supabase cookies are cleared automatically
    console.log('✅ Logout successful');

    return res.status(200).json({
      success: true,
      message: 'Logout realizado com sucesso',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
