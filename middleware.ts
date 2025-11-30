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
 * - JWT-based authentication via Supabase
 * - Redirects unauthenticated users to /login
 * - Simple admin-only route protection
 * - BACKWARD COMPATIBLE with old schema
 *
 * Permission System (Optional - V2.1):
 * - Checks for new schema (tipo_usuario, permissoes fields)
 * - If new schema exists, protects admin-only routes (/usuarios, /configuracoes)
 * - If old schema, allows access normally
 * - Adds headers (X-User-Id, X-User-Role, X-Vendedor-Id) for API routes
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

  // 🆕 Simple permission checks (BACKWARD COMPATIBLE)
  // Try to get user data from database (optional, for new schema)
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('id, tipo_usuario, role, permissoes, vendedor_id')
    .eq('supabase_user_id', user.id)
    .maybeSingle() // Use maybeSingle() to avoid errors if user doesn't exist

  // Check if new schema exists (has tipo_usuario field)
  const hasNewSchema = usuario?.tipo_usuario !== undefined

  // Simple admin-only route protection (only if new schema exists)
  if (hasNewSchema) {
    const ADMIN_ONLY_ROUTES = ['/usuarios', '/configuracoes']
    const path = request.nextUrl.pathname
    const isAdminRoute = ADMIN_ONLY_ROUTES.some(route => path.startsWith(route))

    if (isAdminRoute && usuario.tipo_usuario !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      url.searchParams.set('error', 'permission_denied')
      return NextResponse.redirect(url)
    }

    // Add user info to headers for API routes to use
    if (usuario) {
      supabaseResponse.headers.set('X-User-Id', usuario.id.toString())
      supabaseResponse.headers.set('X-User-Role', usuario.tipo_usuario || usuario.role || 'user')
      if (usuario.vendedor_id) {
        supabaseResponse.headers.set('X-Vendedor-Id', usuario.vendedor_id.toString())
      }
    }
  }

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
