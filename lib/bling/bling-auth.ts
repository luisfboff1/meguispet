import { getSupabaseServiceRole } from "@/lib/supabase-auth";

/**
 * Bling OAuth Token Management
 *
 * Handles token storage, retrieval, refresh, and revocation.
 * Tokens are stored in the `bling_config` table in Supabase.
 *
 * Token durations (confirmed by Bling support):
 * - Access Token: 6 hours (21600s)
 * - Refresh Token: 30 days
 */

const BLING_TOKEN_URL = "https://www.bling.com.br/Api/v3/oauth/token";

interface BlingTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
}

interface BlingConfig {
  id: number;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  is_active: boolean;
}

/**
 * Get Basic auth header for Bling OAuth requests
 */
function getBasicAuth(): string {
  const clientId = process.env.BLING_CLIENT_ID;
  const clientSecret = process.env.BLING_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing BLING_CLIENT_ID or BLING_CLIENT_SECRET");
  }

  return Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
}

/**
 * Exchange authorization code for tokens (OAuth step 2)
 * Called from the callback route after user authorizes in Bling
 */
export async function exchangeCodeForTokens(
  code: string,
): Promise<BlingTokenResponse> {
  const response = await fetch(BLING_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${getBasicAuth()}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Bling token exchange failed (${response.status}): ${error}`);
  }

  return response.json();
}

/**
 * Refresh access token using the refresh token
 */
export async function refreshAccessToken(
  currentRefreshToken: string,
): Promise<BlingTokenResponse> {
  const response = await fetch(BLING_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${getBasicAuth()}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: currentRefreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Bling token refresh failed (${response.status}): ${error}`);
  }

  return response.json();
}

/**
 * Save tokens to bling_config table
 * Upserts: if a config exists, updates it; otherwise inserts new row
 */
export async function saveTokens(tokens: BlingTokenResponse): Promise<void> {
  const supabase = getSupabaseServiceRole();
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  // Check if config already exists
  const { data: existing } = await supabase
    .from("bling_config")
    .select("id")
    .eq("is_active", true)
    .limit(1)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("bling_config")
      .update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (error) throw new Error(`Failed to update bling_config: ${error.message}`);
  } else {
    const { error } = await supabase.from("bling_config").insert({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: expiresAt,
      is_active: true,
    });

    if (error) throw new Error(`Failed to insert bling_config: ${error.message}`);
  }
}

/**
 * Get a valid access token, refreshing if expired
 * This is the main function other modules should call
 */
export async function getValidToken(): Promise<string> {
  const supabase = getSupabaseServiceRole();

  const { data: config, error } = await supabase
    .from("bling_config")
    .select("*")
    .eq("is_active", true)
    .limit(1)
    .single<BlingConfig>();

  if (error || !config) {
    throw new Error("Bling integration not configured. Please authorize first.");
  }

  // Check if token is still valid (with 5 min buffer)
  const expiresAt = new Date(config.token_expires_at);
  const bufferMs = 5 * 60 * 1000; // 5 minutes

  if (expiresAt.getTime() - bufferMs > Date.now()) {
    return config.access_token;
  }

  // Token expired or about to expire - refresh it
  console.log("[Bling Auth] Token expired, refreshing...");
  const newTokens = await refreshAccessToken(config.refresh_token);
  await saveTokens(newTokens);

  return newTokens.access_token;
}

/**
 * Get the current Bling config status (without sensitive token data)
 */
export async function getBlingStatus(): Promise<{
  connected: boolean;
  token_expires_at?: string;
  last_sync_vendas?: string;
  last_sync_nfe?: string;
  is_active?: boolean;
}> {
  const supabase = getSupabaseServiceRole();

  const { data: config } = await supabase
    .from("bling_config")
    .select("token_expires_at, last_sync_vendas, last_sync_nfe, is_active")
    .eq("is_active", true)
    .limit(1)
    .single();

  if (!config) {
    return { connected: false };
  }

  return {
    connected: true,
    token_expires_at: config.token_expires_at,
    last_sync_vendas: config.last_sync_vendas,
    last_sync_nfe: config.last_sync_nfe,
    is_active: config.is_active,
  };
}

/**
 * Disconnect Bling integration (deactivate config)
 */
export async function disconnectBling(): Promise<void> {
  const supabase = getSupabaseServiceRole();

  const { error } = await supabase
    .from("bling_config")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("is_active", true);

  if (error) throw new Error(`Failed to disconnect Bling: ${error.message}`);
}
