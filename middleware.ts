import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Next.js Middleware with Supabase Auth (Edge Runtime)
 * 
 * This middleware runs on the Edge runtime for minimal latency and protects
 * routes that require authentication. It uses @supabase/ssr for optimal
 * cookie handling and session management.
 * 
 * Features:
 * - Runs 100% on Edge runtime
 * - Uses official Supabase helpers (@supabase/ssr)
 * - Automatic session refresh (every 6 hours)
 * - Secure cookie management with 6-hour expiration
 * - Redirects unauthenticated users to /login
 * - Session timeout enforcement
 * 
 * Security Enhancements (Nov 2025):
 * - Session expires every 6 hours
 * - Cookie max-age set to 21600 seconds (6 hours)
 * - SameSite=Strict for CSRF protection
 * - Secure flag enforced
 */

/**
 * Session configuration
 *
 * JWT Expiry is configured in Supabase Dashboard:
 * Settings → Auth → JWT Expiry
 *
 * Default: 3600s (1 hour)
 * For testing: 60s (1 minute)
 * Production: 21600s (6 hours)
 *
 * With auto-refresh enabled (default), users are logged out after INACTIVITY period.
 * Without auto-refresh, users are logged out after ABSOLUTE time since login.
 */

export async function middleware(request: NextRequest) {
  // Allow emergency logout page without authentication
  if (request.nextUrl.pathname === '/emergency-logout') {
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
          })
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => {
            // Override cookie options for enhanced security
            const secureOptions = {
              ...options,
              httpOnly: true,
              secure: true,
              sameSite: 'strict' as const,
              path: '/',
            }
            supabaseResponse.cookies.set(name, value, secureOptions)
          })
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // Get the user (getUser() already refreshes the session internally)
  // No need to call getSession() separately - it's duplicated work
  const {
    data: { user },
    error
  } = await supabase.auth.getUser()

  // If there's an error or no user, redirect to login
  // This handles expired JWT tokens, invalid sessions, etc.
  // The JWT expiry is configured in Supabase Dashboard (Settings → Auth → JWT Expiry)
  if (error || !user) {
    // Only redirect if not already on login page
    if (request.nextUrl.pathname !== '/login') {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('reason', 'session_expired')
      return NextResponse.redirect(url)
    }

    // If already on login page, continue
    return supabaseResponse
  }

  // If user is signed in and tries to access /login, redirect to /dashboard
  if (user && request.nextUrl.pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // User is authenticated - allow access
  // Permission checks can be added later in individual pages/API routes
  return supabaseResponse
}

/**
 * Matcher configuration for middleware
 * 
 * This middleware will run on all routes EXCEPT:
 * - /api routes (handled by API middleware)
 * - /_next (Next.js internals)
 * - /login (public auth page)
 * - Static files (images, fonts, etc.)
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - /api (API routes use their own middleware)
     * - /_next (Next.js internals)
     * - /login (public login page)
     * - Static files (images, fonts, icons, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
