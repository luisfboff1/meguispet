import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// 🔐 MIDDLEWARE DE AUTENTICAÇÃO
// Protege rotas que precisam de login

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Páginas que NÃO precisam de autenticação
  const publicPages = [
    '/',
    '/login',
    '/password-reset',
    '/api/auth'
  ]
  
  // Verificar se é uma página pública
  const isPublicPage = publicPages.some(page => pathname.startsWith(page))
  
  if (isPublicPage) {
    return NextResponse.next()
  }
  
  // Para páginas protegidas, verificar token
  const token = request.cookies.get('token')?.value || 
                request.headers.get('authorization')?.replace('Bearer ', '')
  
  if (!token) {
    // Redirecionar para login se não tiver token
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }
  
  return NextResponse.next()
}

// Configurar quais rotas o middleware deve executar
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
}
