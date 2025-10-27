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
 * - Automatic session refresh
 * - Secure cookie management
 * - Redirects unauthenticated users to /login
 */

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
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // Try to refresh the session - this will automatically refresh expired tokens
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Get the user (this will use the refreshed session if available)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If user is not signed in and the current path is not /login, redirect to /login
  if (!user && request.nextUrl.pathname !== '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    // Clear any stale auth cookies
    const response = NextResponse.redirect(url)
    response.cookies.delete('sb-access-token')
    response.cookies.delete('sb-refresh-token')
    return response
  }

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
