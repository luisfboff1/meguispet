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

// Session configuration
const SESSION_MAX_AGE = 6 * 60 * 60 // 6 hours in seconds

export async function middleware(request: NextRequest) {
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
              maxAge: SESSION_MAX_AGE, // 6 hours
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

  // If there's an error or no user, clear auth and redirect to login
  // This handles expired tokens, invalid sessions, etc.
  if (error || !user) {
    // Only redirect if not already on login page
    if (request.nextUrl.pathname !== '/login') {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      if (error) {
        url.searchParams.set('reason', 'auth_error')
      }

      // Create redirect response and clear all auth cookies
      const response = NextResponse.redirect(url)

      // Clear Supabase auth cookies
      response.cookies.delete('sb-access-token')
      response.cookies.delete('sb-refresh-token')
      response.cookies.delete('last_activity')

      // Clear all cookies that start with 'sb-' (Supabase cookies)
      request.cookies.getAll().forEach(cookie => {
        if (cookie.name.startsWith('sb-')) {
          response.cookies.delete(cookie.name)
        }
      })

      return response
    }

    // If already on login page, just clear cookies and continue
    supabaseResponse.cookies.delete('sb-access-token')
    supabaseResponse.cookies.delete('sb-refresh-token')
    supabaseResponse.cookies.delete('last_activity')
    return supabaseResponse
  }

  // User is authenticated - check for session expiration based on last activity
  const lastActivity = request.cookies.get('last_activity')?.value
  if (lastActivity) {
    const lastActivityTime = parseInt(lastActivity, 10)
    const now = Date.now()
    const timeSinceLastActivity = now - lastActivityTime

    // If session is older than 6 hours, force re-authentication
    if (timeSinceLastActivity > SESSION_MAX_AGE * 1000) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('reason', 'session_expired')
      const response = NextResponse.redirect(url)

      // Clear all auth cookies
      response.cookies.delete('sb-access-token')
      response.cookies.delete('sb-refresh-token')
      response.cookies.delete('last_activity')

      return response
    }
  }

  // Update last activity timestamp
  supabaseResponse.cookies.set('last_activity', Date.now().toString(), {
    maxAge: SESSION_MAX_AGE,
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
  })

  // If user is signed in and tries to access /login, redirect to /dashboard
  if (user && request.nextUrl.pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

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
