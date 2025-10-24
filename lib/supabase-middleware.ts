import { NextApiRequest, NextApiResponse } from 'next';
import { verifySupabaseUser, getUserProfile, AppUserProfile } from './supabase-auth';
import type { User } from '@supabase/supabase-js';

/**
 * Extended request with authenticated user information
 * Replaces the custom JWT-based AuthenticatedRequest
 */
export interface AuthenticatedRequest extends NextApiRequest {
  user: {
    id: number; // App user ID from usuarios table
    email: string;
    role: string;
    permissoes: string | null;
    supabaseUser: User; // Full Supabase auth user object
  };
}

/**
 * Higher-order function to protect API routes with Supabase Auth
 * Replaces the custom JWT-based withAuth middleware
 * 
 * @param handler - API route handler that requires authentication
 * @returns Protected API route handler
 */
export const withSupabaseAuth = (
  handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>
) => {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      // Verify Supabase JWT token and get user
      const supabaseUser = await verifySupabaseUser(req, res);

      if (!supabaseUser || !supabaseUser.email) {
        return res.status(401).json({
          success: false,
          message: 'Token de autenticação inválido ou expirado',
        });
      }

      // Get user profile from custom usuarios table
      const userProfile = await getUserProfile(supabaseUser.email);

      if (!userProfile) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não encontrado ou inativo',
        });
      }

      // Attach user info to request
      const authenticatedReq = req as AuthenticatedRequest;
      authenticatedReq.user = {
        id: userProfile.id,
        email: userProfile.email,
        role: userProfile.role,
        permissoes: userProfile.permissoes,
        supabaseUser,
      };

      // Call the actual handler
      return handler(authenticatedReq, res);
    } catch (error) {
      console.error('Authentication middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao validar autenticação',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
};

/**
 * Optional: Role-based access control middleware
 * Can be chained with withSupabaseAuth for additional protection
 */
export const withRole = (allowedRoles: string[]) => {
  return (handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>) => {
    return withSupabaseAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Acesso negado: permissões insuficientes',
        });
      }

      return handler(req, res);
    });
  };
};
