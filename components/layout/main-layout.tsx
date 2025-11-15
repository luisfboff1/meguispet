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

  const { loading, isAuthenticated } = useAuth()

  // Páginas que não precisam de layout (login, etc)
  const noLayoutPages = ['/login', '/register', '/forgot-password']
  const isNoLayoutPage = noLayoutPages.includes(router.pathname)

  const sidebarWidth = useMemo(() => (isCollapsed && !isTemporary ? 88 : 268), [isCollapsed, isTemporary])

  const sidebarContent = useMemo(
    () => (
      <Sidebar
        isCollapsed={isTemporary ? false : isCollapsed}
        onToggle={isTemporary ? toggle : toggleCollapsed}
        hideToggle={isTemporary}
      />
    ),
    [isCollapsed, isTemporary, toggle, toggleCollapsed]
  )

  useEffect(() => {
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!isNoLayoutPage && hydrated && !loading && !isAuthenticated) {
      router.replace('/login')
    }
  }, [hydrated, isAuthenticated, isNoLayoutPage, loading, router])

  useEffect(() => {
    const handleRouteChange = () => {
      closeOnNavigate()
      // Trigger a custom event that pages can listen to for refreshing data
      window.dispatchEvent(new CustomEvent('routechange', { 
        detail: { path: router.asPath } 
      }))
    }

    router.events.on('routeChangeComplete', handleRouteChange)
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange)
    }
  }, [closeOnNavigate, router.events, router.asPath])

  // Se for página sem layout, renderizar só o conteúdo
  if (isNoLayoutPage) {
    return <>{children}</>
  }

  // Evitar hidratação mismatch - só renderizar após montar no cliente
  if (!hydrated || loading) {
    return <div className="flex h-screen bg-gray-50" suppressHydrationWarning>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">Carregando...</div>
      </div>
    </div>
  }

  if (!isAuthenticated) {
    return null
  }

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
