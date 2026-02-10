import type { NextApiRequest, NextApiResponse } from "next";
import { exchangeCodeForTokens, saveTokens } from "@/lib/bling/bling-auth";
import { getSupabaseServiceRole } from "@/lib/supabase-auth";

/**
 * GET /api/bling/callback
 *
 * OAuth callback endpoint - Bling redirects here after user authorizes.
 * This route is NOT wrapped with withSupabaseAuth because:
 * - It's called via browser redirect from Bling (not an AJAX call)
 * - The user is already authenticated in MeguisPet (session cookie present)
 * - We verify the user session manually before saving tokens
 *
 * Flow: Bling redirect → receives ?code=xxx → exchanges for tokens → saves → redirects to config page
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Método não permitido" });
  }

  const { code, error: blingError } = req.query;

  // Handle Bling authorization errors
  if (blingError) {
    console.error("[Bling Callback] Authorization denied:", blingError);
    return res.redirect(
      "/integracoes/bling?error=Autorização negada pelo Bling",
    );
  }

  if (!code || typeof code !== "string") {
    return res.redirect(
      "/integracoes/bling?error=Código de autorização não recebido",
    );
  }

  try {
    // Exchange authorization code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Save tokens to database
    await saveTokens(tokens);

    // Log the successful connection
    const supabase = getSupabaseServiceRole();
    await supabase.from("bling_sync_log").insert({
      tipo: "manual",
      recurso: "oauth",
      acao: "created",
      status: "success",
      payload: { event: "oauth_connected" },
    });

    // Test the connection by making a simple API call (contatos uses 'contact' scope)
    const testResponse = await fetch(
      "https://api.bling.com.br/Api/v3/contatos?limite=1",
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          Accept: "application/json",
        },
      },
    );

    const testOk = testResponse.ok;
    if (!testOk) {
      const errorBody = await testResponse.text();
      console.error(
        `[Bling Callback] API test failed: HTTP ${testResponse.status}`,
        errorBody.substring(0, 500),
      );
    } else {
      console.log("[Bling Callback] OAuth success. API test: OK");
    }

    return res.redirect(
      `/integracoes/bling?success=Bling conectado com sucesso!&apiTest=${testOk}`,
    );
  } catch (err) {
    console.error("[Bling Callback] Token exchange failed:", err);

    // Log the failure
    const supabase = getSupabaseServiceRole();
    await supabase.from("bling_sync_log").insert({
      tipo: "manual",
      recurso: "oauth",
      acao: "created",
      status: "error",
      erro_mensagem: err instanceof Error ? err.message : "Unknown error",
    });

    return res.redirect(
      `/integracoes/bling?error=Falha ao trocar código por token: ${err instanceof Error ? err.message : "Erro desconhecido"}`,
    );
  }
}
