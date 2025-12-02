import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import { AnimatePresence, motion } from 'framer-motion'
import { Sidebar } from './sidebar'
import { Header } from './header'
import { cn } from '@/lib/utils'
import { useSidebar } from '@/hooks/useSidebar'
import { useAuth } from '@/hooks/useAuth'
import { ModalHost } from '@/components/modals/modal-host'

interface MainLayoutProps {
  children: React.ReactNode
  title?: string
  description?: string
}

export function MainLayout({ children, title, description }: MainLayoutProps) {
  const router = useRouter()
  const [hydrated, setHydrated] = useState(false)
  const [redirectAttempts, setRedirectAttempts] = useState(0)
  const [lastRedirectTime, setLastRedirectTime] = useState(0)
  const [showCircuitBreakerError, setShowCircuitBreakerError] = useState(false)
  const [isEmergencyLogout, setIsEmergencyLogout] = useState(false)

  const {
    isOpen,
    isCollapsed,
    isTemporary,
    shouldShowOverlay,
    toggle,
    close,
    closeOnNavigate,
    toggleCollapsed
  } = useSidebar()

  const { loading, isAuthenticated, user, status } = useAuth()

  // Páginas que não precisam de layout (login, etc)
  const noLayoutPages = ['/login', '/register', '/forgot-password']
  const isNoLayoutPage = noLayoutPages.includes(router.pathname)

  const sidebarWidth = useMemo(() => (isCollapsed && !isTemporary ? 88 : 268), [isCollapsed, isTemporary])

  // Sidebar content - removed useMemo to allow re-renders on route change
  // This fixes mobile navigation issue where URL changes but content doesn't update
  const sidebarContent = (
    <Sidebar
      isCollapsed={isTemporary ? false : isCollapsed}
      onToggle={isTemporary ? toggle : toggleCollapsed}
      hideToggle={isTemporary}
    />
  )

  // Reset circuit breaker state when navigating to emergency logout or login page
  useEffect(() => {
    if (router.pathname === '/login' || router.pathname === '/emergency-logout') {
      setShowCircuitBreakerError(false)
      setRedirectAttempts(0)
      setLastRedirectTime(0)
    }
  }, [router.pathname])

  useEffect(() => {
    setHydrated(true)
  }, [])

  // Defense-in-depth: Redirect to login if no user after hydration
  // This catches edge cases where middleware might not have redirected
  // IMPORTANT: Also redirect if status is 'unauthenticated' (not just checking isAuthenticated)
  // This prevents being stuck when user is null but loading is false
  // Added circuit breaker to prevent infinite redirect loops
  useEffect(() => {
    if (!hydrated || isNoLayoutPage) return
    
    // Don't trigger circuit breaker during emergency logout
    if (isEmergencyLogout) return

    // Circuit breaker: Prevent infinite redirects
    const now = Date.now()
    const REDIRECT_COOLDOWN = 5000 // 5 seconds
    const MAX_REDIRECT_ATTEMPTS = 3

    // Reset redirect attempts if enough time has passed
    if (now - lastRedirectTime > REDIRECT_COOLDOWN) {
      setRedirectAttempts(0)
    }

    // If we've tried too many times, stop trying to prevent infinite loop
    if (redirectAttempts >= MAX_REDIRECT_ATTEMPTS) {
      console.error('🚨 MainLayout: Too many redirect attempts, stopping to prevent infinite loop')
      setShowCircuitBreakerError(true)
      return
    }

    // Redirect if:
    // 1. Not loading AND not authenticated
    // 2. OR explicitly unauthenticated (even if still loading)
    // 3. OR no user object exists after a reasonable time (handles edge cases)
    const shouldRedirect =
      (!loading && !isAuthenticated) ||
      status === 'unauthenticated' ||
      (hydrated && !user && !loading)

    if (shouldRedirect) {
      console.log('🔒 MainLayout: Redirecting to login', {
        loading,
        isAuthenticated,
        status,
        hasUser: !!user,
        attempt: redirectAttempts + 1
      })
      
      setRedirectAttempts(prev => prev + 1)
      setLastRedirectTime(now)
      
      // Use replace to avoid adding to history
      router.replace('/login')
    }
  }, [hydrated, loading, isAuthenticated, status, user, isNoLayoutPage, router, redirectAttempts, lastRedirectTime, isEmergencyLogout])

  useEffect(() => {
    const handleRouteChange = () => {
      closeOnNavigate()
    }

    router.events.on('routeChangeComplete', handleRouteChange)
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange)
    }
  }, [closeOnNavigate, router.events])

  // Se for página sem layout, renderizar só o conteúdo
  if (isNoLayoutPage) {
    return <>{children}</>
  }

  // Evitar hidratação mismatch - só renderizar após montar no cliente
  // Removed 'loading' check to prevent blocking page transitions
  // Middleware handles auth, so we can render immediately after hydration
  if (!hydrated) {
    return <div className="flex h-screen bg-gray-50" suppressHydrationWarning>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <div className="text-gray-500">Carregando...</div>
        </div>
      </div>
    </div>
  }

  // Show a better loading state when verifying session
  if (!isNoLayoutPage && status === 'loading') {
    return <div className="flex h-screen bg-gray-50" suppressHydrationWarning>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <div className="text-gray-500">Verificando sessão...</div>
        </div>
      </div>
    </div>
  }

  // Show circuit breaker error if triggered
  if (showCircuitBreakerError) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <div className="max-w-md rounded-lg border border-red-200 bg-white p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-bold text-gray-900">Erro de Autenticação</h2>
          <p className="mb-6 text-sm text-gray-600">
            Ocorreu um problema ao verificar sua sessão. Por favor, tente uma das opções abaixo:
          </p>
          <div className="space-y-3">
            <button
              onClick={async () => {
                // Clear circuit breaker state before navigating
                setShowCircuitBreakerError(false)
                setRedirectAttempts(0)
                setIsEmergencyLogout(true)
                // Use router.push to maintain React state
                await router.push('/emergency-logout')
              }}
              className="w-full rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Limpar Sessão e Fazer Login
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Recarregar Página
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Allow rendering even if not authenticated - middleware will redirect if needed
  // This prevents flash of loading screen during navigation

  return (
  <div className="flex h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900" suppressHydrationWarning>
      <AnimatePresence initial={false}>
        {isTemporary ? (
          isOpen && (
            <motion.aside
              key="sidebar-mobile"
              initial={{ x: '-100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '-100%', opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw]"
            >
              <div className="h-full bg-white/95 dark:bg-slate-900/95 shadow-2xl backdrop-blur-xl border-r border-white/20 dark:border-slate-800 rounded-r-3xl overflow-hidden">
                {sidebarContent}
              </div>
            </motion.aside>
          )
        ) : (
          <motion.aside
            key="sidebar-desktop"
            animate={{ width: sidebarWidth }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="relative z-40 hidden h-full border-r border-slate-200/80 bg-white/90 shadow-lg backdrop-blur-lg transition-colors dark:border-slate-800/80 dark:bg-slate-900/80 lg:block"
            style={{ width: sidebarWidth }}
          >
            {sidebarContent}
          </motion.aside>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {shouldShowOverlay && (
          <motion.div
            key="sidebar-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
            onClick={close}
          />
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          title={title}
          description={description}
          sidebarCollapsed={!isTemporary && isCollapsed}
          onMenuClick={toggle}
          isMobile={isTemporary}
        />

        <main className="relative flex-1 overflow-auto p-6">
          <div
            className={cn(
              'mx-auto min-h-full w-full max-w-7xl space-y-6 transition-all duration-300',
              !isTemporary && (isCollapsed ? 'px-6' : 'px-2')
            )}
          >
            {children}
          </div>
        </main>
      </div>
      <ModalHost />
    </div>
  )
}
