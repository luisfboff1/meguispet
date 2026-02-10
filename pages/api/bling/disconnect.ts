import type { NextApiResponse } from "next";
import {
  withSupabaseAuth,
  AuthenticatedRequest,
} from "@/lib/supabase-middleware";
import { disconnectBling } from "@/lib/bling/bling-auth";

/**
 * POST /api/bling/disconnect
 *
 * Deactivates the Bling integration (sets is_active = false).
 * Admin/gerente only.
 */
const handler = async (
  req: AuthenticatedRequest,
  res: NextApiResponse,
): Promise<void> => {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, message: "Método não permitido" });
    return;
  }

  if (!["admin", "gerente"].includes(req.user.tipo_usuario)) {
    res.status(403).json({
      success: false,
      message: "Apenas administradores e gerentes podem desconectar.",
    });
    return;
  }

  try {
    await disconnectBling();
    res.status(200).json({
      success: true,
      message: "Bling desconectado com sucesso",
    });
  } catch (err) {
    console.error("[Bling Disconnect] Error:", err);
    res.status(500).json({
      success: false,
      message: "Erro ao desconectar Bling",
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
};

export default withSupabaseAuth(handler);
