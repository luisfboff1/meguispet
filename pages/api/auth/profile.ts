import type { NextApiRequest, NextApiResponse } from "next";
import {
  getSupabaseServerAuth,
  getUserProfile,
  verifySupabaseUser,
} from "@/lib/supabase-auth";

/**
 * Get current user profile
 * GET /api/auth/profile - Get authenticated user's profile
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { method } = req;

  if (method !== "GET") {
    return res.status(405).json({
      success: false,
      message: "Método não permitido",
    });
  }

  try {
    // Verify Supabase user from JWT token
    const supabaseUser = await verifySupabaseUser(req, res);

    if (!supabaseUser || !supabaseUser.email) {
      return res.status(401).json({
        success: false,
        message: "Token inválido ou expirado",
      });
    }

    // Get authenticated supabase client
    const supabase = getSupabaseServerAuth(req, res);

    // Get user profile from custom usuarios table (with RLS context)
    const userProfile = await getUserProfile(supabaseUser.email, supabase);

    if (!userProfile) {
      return res.status(404).json({
        success: false,
        message: "Usuário não encontrado",
      });
    }

    // Note: supabase_user_id fallback is for legacy users that don't have it stored yet
    const resolvedSupabaseUserId = userProfile.supabase_user_id ||
      supabaseUser.id;
    if (!userProfile.supabase_user_id) {
      console.warn(
        "[AUTH] User missing supabase_user_id in database (profile endpoint):",
        {
          userId: userProfile.id,
          email: userProfile.email,
          sessionUserId: supabaseUser.id,
        },
      );
    }

    return res.status(200).json({
      success: true,
      data: {
        id: userProfile.id,
        nome: userProfile.nome,
        email: userProfile.email,
        tipo_usuario: userProfile.tipo_usuario,
        permissoes: userProfile.permissoes,
        vendedor_id: userProfile.vendedor_id,
        ativo: userProfile.ativo,
        supabase_user_id: resolvedSupabaseUserId,
      },
      message: "Perfil carregado com sucesso",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Erro ao carregar perfil",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
