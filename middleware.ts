import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Next.js Middleware with Supabase Auth (Edge Runtime)
 *
 * Proteção de rotas com autenticação JWT do Supabase.
 *
 * Features:
 * - Runs on Edge runtime (low latency)
 * - JWT expiration handling (configurado no Supabase Dashboard)
 * - Redirects para /login quando sessão expirar
 * - Admin-only route protection
 * - Headers com user info para API routes
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
  if (request.nextUrl.pathname === "/emergency-logout") {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            // Override cookie options for enhanced security
            const secureOptions = {
              ...options,
              httpOnly: true,
              secure: true,
              sameSite: "strict" as const,
              path: "/",
            };
            supabaseResponse.cookies.set(name, value, secureOptions);
          });
        },
      },
    },
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // Get the user (getUser() already refreshes the session internally)
  // No need to call getSession() separately - it's duplicated work
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // JWT expirado ou sessão inválida → redirecionar para /login
  // JWT expiry configurado em: Supabase Dashboard → Auth → JWT Expiry
  if (error || !user) {
    // Não redirecionar se já estiver na página de login
    if (request.nextUrl.pathname !== "/login") {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set(
        "message",
        "Sua sessão expirou. Faça login novamente.",
      );
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  }

  // If user is signed in and tries to access /login, redirect to /dashboard
  if (user && request.nextUrl.pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Buscar dados do usuário no banco
  const { data: usuario } = await supabase
    .from("usuarios")
    .select("id, tipo_usuario, permissoes, vendedor_id")
    .eq("supabase_user_id", user.id)
    .single();

  // Se usuário não existe no banco, redirecionar para login
  if (!usuario) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("message", "Usuário não encontrado no sistema.");
    return NextResponse.redirect(url);
  }

  // Proteção de rotas admin-only
  const ADMIN_ONLY_ROUTES = ["/usuarios", "/configuracoes"];
  const path = request.nextUrl.pathname;
  const isAdminRoute = ADMIN_ONLY_ROUTES.some((route) =>
    path.startsWith(route)
  );

  if (isAdminRoute && usuario.tipo_usuario !== "admin") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.searchParams.set(
      "error",
      "Acesso negado. Apenas administradores podem acessar esta página.",
    );
    return NextResponse.redirect(url);
  }

  // Adicionar headers com info do usuário para API routes
  supabaseResponse.headers.set("X-User-Id", usuario.id.toString());
  supabaseResponse.headers.set("X-User-Role", usuario.tipo_usuario);
  if (usuario.vendedor_id) {
    supabaseResponse.headers.set(
      "X-Vendedor-Id",
      usuario.vendedor_id.toString(),
    );
  }

  return supabaseResponse;
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
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
