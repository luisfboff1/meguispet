import { createClient, SupabaseClient, User } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { NextApiRequest, NextApiResponse } from "next";

/**
 * Supabase Auth utilities for server-side API routes
 * Replaces custom JWT implementation
 */

/**
 * ⚠️ CRITICAL WARNING: This function bypasses ALL RLS policies!
 *
 * getSupabaseServiceRole() provides unrestricted database access.
 * Only use for legitimate admin operations where you MUST bypass RLS.
 *
 * ✅ VALID use cases:
 * - Creating users (auth.admin.createUser)
 * - Health checks (testing DB connectivity)
 * - System migrations
 * - Admin-only operations with explicit permission checks
 *
 * ❌ INVALID use cases:
 * - User-scoped queries (use getSupabaseServerAuth instead)
 * - Any operation that should respect RLS
 * - Reading/writing user data without permission checks
 *
 * All usage is logged for security auditing.
 */
export const getSupabaseServiceRole = (): SupabaseClient => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase service role credentials");
  }

  // Log usage for security audit
  const stack = new Error().stack;
  const callerLine = stack?.split("\n")[2]?.trim() || "unknown";

  console.warn("[SECURITY] Service Role Key accessed (bypasses RLS):", {
    timestamp: new Date().toISOString(),
    caller: callerLine,
    // Only log in development to avoid performance impact
    ...(process.env.NODE_ENV === "development" && { stack }),
  });

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

/**
 * Get Supabase client for server-side with user context in API routes
 * Uses @supabase/ssr for optimal cookie handling
 * Extracts JWT from Authorization header and creates authenticated client
 */
export const getSupabaseServerAuth = (
  req: NextApiRequest,
  res: NextApiResponse,
): SupabaseClient => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables");
  }

  // Use createServerClient from @supabase/ssr for better cookie handling
  const client = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        const cookies: { name: string; value: string }[] = [];
        const cookieHeader = req.headers.cookie;
        if (cookieHeader) {
          cookieHeader.split(";").forEach((cookie) => {
            const [name, ...valueParts] = cookie.trim().split("=");
            if (name && valueParts.length > 0) {
              cookies.push({ name, value: valueParts.join("=") });
            }
          });
        }
        return cookies;
      },
      setAll(cookiesToSet) {
        // Build array of cookie strings
        const cookies = cookiesToSet.map(({ name, value, options }) => {
          const parts = [`${name}=${value}`];
          parts.push(`Path=${options?.path || "/"}`);

          if (options?.httpOnly) parts.push("HttpOnly");

          // Skip Secure flag in development (localhost HTTP doesn't support it)
          if (options?.secure && process.env.NODE_ENV === "production") {
            parts.push("Secure");
          }

          if (options?.sameSite) parts.push(`SameSite=${options.sameSite}`);
          if (options?.maxAge) parts.push(`Max-Age=${options.maxAge}`);

          return parts.join("; ");
        });

        // Set all cookies at once (res.setHeader with array adds all cookies)
        res.setHeader("Set-Cookie", cookies);
      },
    },
  });

  return client;
};

/**
 * Verify user from Supabase JWT token
 * Returns user object if valid, null if invalid/expired
 */
export const verifySupabaseUser = async (
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<User | null> => {
  try {
    const client = getSupabaseServerAuth(req, res);
    const { data, error } = await client.auth.getUser();

    if (error || !data.user) {
      return null;
    }

    return data.user;
  } catch (error) {
    return null;
  }
};

/**
 * Extract user metadata from custom usuarios table
 */
export interface AppUserProfile {
  id: number;
  email: string;
  nome: string;
  tipo_usuario: string; // admin, gerente, vendedor, etc
  permissoes: Record<string, boolean> | null;
  permissoes_custom: Record<string, boolean> | null;
  vendedor_id: number | null;
  ativo: boolean;
  supabase_user_id: string | null;
}

/**
 * Get user profile from custom usuarios table
 *
 * @param email - User email to lookup
 * @param supabase - Authenticated Supabase client (respects RLS)
 * @returns User profile or null if not found
 */
export const getUserProfile = async (
  email: string,
  supabase: SupabaseClient,
): Promise<AppUserProfile | null> => {
  try {
    const { data, error } = await supabase
      .from("usuarios")
      .select(
        "id, nome, email, tipo_usuario, permissoes, permissoes_custom, vendedor_id, ativo, supabase_user_id",
      )
      .eq("email", email)
      .eq("ativo", true)
      .single();

    if (error || !data) {
      return null;
    }

    return data as AppUserProfile;
  } catch (error) {
    return null;
  }
};
