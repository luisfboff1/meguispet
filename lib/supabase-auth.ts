import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { NextApiRequest, NextApiResponse } from 'next';

/**
 * Supabase Auth utilities for server-side API routes
 * Replaces custom JWT implementation
 */

/**
 * Get Supabase client with service role for server-side operations
 * WARNING: Only use this for admin operations, not for user-scoped queries
 */
export const getSupabaseServiceRole = (): SupabaseClient => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase service role credentials');
  }

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
  res: NextApiResponse
): SupabaseClient => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  // Use createServerClient from @supabase/ssr for better cookie handling
  const client = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        const cookies: { name: string; value: string }[] = [];
        const cookieHeader = req.headers.cookie;
        if (cookieHeader) {
          cookieHeader.split(';').forEach((cookie) => {
            const [name, ...valueParts] = cookie.trim().split('=');
            if (name && valueParts.length > 0) {
              cookies.push({ name, value: valueParts.join('=') });
            }
          });
        }
        return cookies;
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          res.setHeader('Set-Cookie', `${name}=${value}; Path=${options?.path || '/'}; ${options?.httpOnly ? 'HttpOnly; ' : ''}${options?.secure ? 'Secure; ' : ''}${options?.sameSite ? `SameSite=${options.sameSite}; ` : ''}${options?.maxAge ? `Max-Age=${options.maxAge}` : ''}`);
        });
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
  res: NextApiResponse
): Promise<User | null> => {
  try {
    const client = getSupabaseServerAuth(req, res);
    const { data, error } = await client.auth.getUser();

    if (error || !data.user) {
      return null;
    }

    return data.user;
  } catch (error) {
    console.error('Error verifying Supabase user:', error);
    return null;
  }
};

/**
 * Extract user metadata from custom usuarios table
 * Maps Supabase auth user to app-specific user profile
 */
export interface AppUserProfile {
  id: number;
  email: string;
  nome: string;
  role: string;
  permissoes: string | null;
  ativo: boolean;
  supabase_user_id?: string;
}

export const getUserProfile = async (
  email: string,
  supabase?: SupabaseClient
): Promise<AppUserProfile | null> => {
  try {
    const client = supabase || getSupabaseServiceRole();
    
    const { data, error } = await client
      .from('usuarios')
      .select('id, nome, email, role, permissoes, ativo')
      .eq('email', email)
      .eq('ativo', true)
      .single();

    if (error || !data) {
      return null;
    }

    return data as AppUserProfile;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
};
