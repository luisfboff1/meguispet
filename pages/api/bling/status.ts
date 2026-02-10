import type { NextApiResponse } from "next";
import {
  withSupabaseAuth,
  AuthenticatedRequest,
} from "@/lib/supabase-middleware";
import { getBlingStatus, getValidToken } from "@/lib/bling/bling-auth";

/**
 * GET /api/bling/status
 *
 * Returns the current Bling integration status.
 * Includes: connection state, token validity, last sync timestamps, counters.
 */
const handler = async (
  req: AuthenticatedRequest,
  res: NextApiResponse,
): Promise<void> => {
  if (req.method !== "GET") {
    res.status(405).json({ success: false, message: "Método não permitido" });
    return;
  }

  try {
    const status = await getBlingStatus();

    if (!status.connected) {
      res.status(200).json({
        success: true,
        data: {
          connected: false,
          message: "Bling não conectado. Autorize a integração.",
        },
      });
      return;
    }

    // Check if we can actually use the token (optionally test API)
    let tokenValid = false;
    let apiReachable = false;

    let apiError: string | undefined;

    try {
      const token = await getValidToken();
      tokenValid = !!token;

      // Quick API test - fetch contatos (uses 'contact' scope)
      const testResponse = await fetch(
        "https://api.bling.com.br/Api/v3/contatos?limite=1",
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        },
      );
      apiReachable = testResponse.ok;

      if (!testResponse.ok) {
        const errorBody = await testResponse.text();
        apiError = `HTTP ${testResponse.status}: ${errorBody.substring(0, 500)}`;
        console.error("[Bling Status] API test failed:", apiError);
      }
    } catch (e) {
      // Token refresh failed or API unreachable
      tokenValid = false;
      apiError = e instanceof Error ? e.message : "Unknown error";
      console.error("[Bling Status] Token/API error:", apiError);
    }

    // Get sync counters
    const supabase = req.supabaseClient;

    const [vendasCount, nfeCount] = await Promise.all([
      supabase
        .from("bling_vendas")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("bling_nfe")
        .select("id", { count: "exact", head: true }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        connected: true,
        token_valid: tokenValid,
        api_reachable: apiReachable,
        token_expires_at: status.token_expires_at,
        last_sync_vendas: status.last_sync_vendas,
        last_sync_nfe: status.last_sync_nfe,
        total_vendas_sync: vendasCount.count ?? 0,
        total_nfe_sync: nfeCount.count ?? 0,
        ...(apiError && { api_error: apiError }),
      },
    });
  } catch (err) {
    console.error("[Bling Status] Error:", err);
    res.status(500).json({
      success: false,
      message: "Erro ao verificar status da integração Bling",
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
};

export default withSupabaseAuth(handler);
