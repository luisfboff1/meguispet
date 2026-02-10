import type { NextApiResponse } from "next";
import {
  withSupabaseAuth,
  AuthenticatedRequest,
} from "@/lib/supabase-middleware";
import crypto from "crypto";

/**
 * GET /api/bling/authorize
 *
 * Initiates Bling OAuth flow by redirecting user to Bling's authorization page.
 * User must be authenticated in MeguisPet (admin only).
 */
const handler = async (
  req: AuthenticatedRequest,
  res: NextApiResponse,
): Promise<void> => {
  if (req.method !== "GET") {
    res.status(405).json({ success: false, message: "Método não permitido" });
    return;
  }

  // Only admin can connect Bling
  if (req.user.tipo_usuario !== "admin") {
    res.status(403).json({
      success: false,
      message: "Apenas administradores podem conectar o Bling.",
    });
    return;
  }

  const clientId = process.env.BLING_CLIENT_ID;
  if (!clientId) {
    res.status(500).json({
      success: false,
      message: "BLING_CLIENT_ID não configurado.",
    });
    return;
  }

  // Generate CSRF state token
  const state = crypto.randomBytes(16).toString("hex");

  const authUrl = new URL("https://www.bling.com.br/Api/v3/oauth/authorize");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("state", state);

  res.redirect(302, authUrl.toString());
};

export default withSupabaseAuth(handler);
