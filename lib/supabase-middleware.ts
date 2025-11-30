import { NextApiRequest, NextApiResponse } from "next";
import {
  AppUserProfile,
  getSupabaseServerAuth,
  getUserProfile,
  verifySupabaseUser,
} from "./supabase-auth";
import type { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * Extended request with authenticated user information
 */
export interface AuthenticatedRequest extends NextApiRequest {
  user: {
    id: number; // App user ID from usuarios table
    email: string;
    tipo_usuario: string; // admin, gerente, vendedor, etc
    permissoes: Record<string, boolean> | null;
    vendedor_id: number | null;
    supabaseUser: User; // Full Supabase auth user object
  };
  /**
   * Supabase client with user context for RLS
   * Use this instead of raw queries to respect Row Level Security
   */
  supabaseClient: SupabaseClient;
}

/**
 * Higher-order function to protect API routes with Supabase Auth
 *
 * @param handler - API route handler que requer autenticação
 * @returns Protected API route handler
 */
export const withSupabaseAuth = (
  handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>,
) => {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      // Verificar JWT do Supabase
      const supabaseUser = await verifySupabaseUser(req, res);

      if (!supabaseUser || !supabaseUser.email) {
        return res.status(401).json({
          success: false,
          message: "Sessão expirada. Faça login novamente.",
        });
      }

      // Criar cliente Supabase com contexto do usuário (para RLS)
      const supabaseClient = getSupabaseServerAuth(req, res);

      // Buscar perfil do usuário da tabela usuarios
      const userProfile = await getUserProfile(
        supabaseUser.email,
        supabaseClient,
      );

      if (!userProfile) {
        return res.status(401).json({
          success: false,
          message: "Usuário não encontrado ou inativo",
        });
      }

      // Anexar info do usuário ao request
      const authenticatedReq = req as AuthenticatedRequest;
      authenticatedReq.user = {
        id: userProfile.id,
        email: userProfile.email,
        tipo_usuario: userProfile.tipo_usuario,
        permissoes: userProfile.permissoes,
        vendedor_id: userProfile.vendedor_id,
        supabaseUser,
      };
      authenticatedReq.supabaseClient = supabaseClient;

      // Chamar o handler
      return handler(authenticatedReq, res);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Erro ao validar autenticação",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };
};

/**
 * Role-based access control middleware
 * Chain com withSupabaseAuth para proteção adicional
 */
export const withRole = (allowedRoles: string[]) => {
  return (
    handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>,
  ) => {
    return withSupabaseAuth(
      async (req: AuthenticatedRequest, res: NextApiResponse) => {
        if (!allowedRoles.includes(req.user.tipo_usuario)) {
          return res.status(403).json({
            success: false,
            message: "Acesso negado: permissões insuficientes",
          });
        }

        return handler(req, res);
      },
    );
  };
};
