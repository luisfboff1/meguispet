import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

let supabaseInstance: SupabaseClient | null = null;

/**
 * Get Supabase client for server-side database operations (no auth)
 * For API routes that need auth, use getSupabaseServerAuth from supabase-auth.ts
 */
export const getSupabase = (): SupabaseClient => {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return supabaseInstance;
};

/**
 * Get Supabase client for browser-side use with auth enabled
 * Uses @supabase/ssr for optimal cookie handling and middleware integration
 * Use this in React components and hooks
 * 
 * Token Configuration:
 * - JWT expiration is configured in Supabase dashboard (recommended: 10 hours = 36000 seconds)
 * - Auto-refresh is enabled to refresh tokens before expiration
 */
export const getSupabaseBrowser = (): SupabaseClient => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  // Use createBrowserClient from @supabase/ssr for better integration
  // with Next.js middleware and automatic cookie handling
  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true, // Automatically refresh tokens before expiration
      persistSession: true, // Persist session in localStorage
      detectSessionInUrl: true, // Detect auth redirects
    },
  });
};
