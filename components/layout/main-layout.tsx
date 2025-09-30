import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { Sidebar } from './sidebar'
import { Header } from './header'
import { cn } from '@/lib/utils'

interface MainLayoutProps {
  children: React.ReactNode
  title?: string
  description?: string
}

export function MainLayout({ children, title, description }: MainLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const router = useRouter()

  // Páginas que não precisam de layout (login, etc)
  const noLayoutPages = ['/login', '/register', '/forgot-password']
  const isNoLayoutPage = noLayoutPages.includes(router.pathname)

  // Verificar se o componente foi montado no cliente
  useEffect(() => {
    setMounted(true)
  }, [])

  // Detectar mobile e gerenciar sidebar
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      
      if (mobile) {
        setSidebarCollapsed(false) // Em mobile, sempre expandida quando aberta
        setSidebarOpen(false) // Fechada por padrão em mobile
      } else {
        setSidebarOpen(false) // Em desktop, não usa overlay
      }
    }

    if (mounted) {
      checkMobile()
      window.addEventListener('resize', checkMobile)
      return () => window.removeEventListener('resize', checkMobile)
    }
  }, [mounted])

  // Forçar re-render após hidratação para evitar mismatches
  useEffect(() => {
    if (mounted) {
      // Pequeno delay para garantir que tudo foi hidratado
      const timer = setTimeout(() => {
        setMounted(true) // Força re-render
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [mounted])

  // Verificar autenticação
  useEffect(() => {
    if (mounted && typeof window !== 'undefined' && !isNoLayoutPage) {
      try {
        const token = localStorage.getItem('token')
        if (!token) {
          router.push('/login')
        }
      } catch (error) {
        console.warn('Erro ao verificar token:', error)
      }
    }
  }, [mounted, router.pathname, isNoLayoutPage])

  // Se for página sem layout, renderizar só o conteúdo
  if (isNoLayoutPage) {
    return <>{children}</>
  }

  // Evitar hidratação mismatch - só renderizar após montar no cliente
  if (!mounted) {
    return <div className="flex h-screen bg-gray-50" suppressHydrationWarning>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">Carregando...</div>
      </div>
    </div>
  }

  // Função para toggle da sidebar
  const toggleSidebar = () => {
    if (isMobile) {
      setSidebarOpen(!sidebarOpen)
    } else {
      setSidebarCollapsed(!sidebarCollapsed)
    }
  }

  // Fechar sidebar em mobile ao clicar fora
  const closeSidebar = () => {
    if (isMobile) {
      setSidebarOpen(false)
    }
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900" suppressHydrationWarning>
      {/* Sidebar */}
      <div className={cn(
        "transition-all duration-300",
        isMobile ? (
          sidebarOpen 
            ? "fixed inset-y-0 left-0 z-50 w-64" 
            : "fixed inset-y-0 left-0 z-50 w-64 -translate-x-full"
        ) : (
          sidebarCollapsed ? "w-20" : "w-64"
        )
      )}>
        <Sidebar 
          isCollapsed={isMobile ? false : sidebarCollapsed}
          onToggle={toggleSidebar}
          hideToggle={isMobile}
        />
      </div>

      {/* Mobile Backdrop - deve vir depois do sidebar para ficar atrás */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header 
          title={title}
          description={description}
          sidebarCollapsed={sidebarCollapsed}
          onMenuClick={toggleSidebar}
          isMobile={isMobile}
        />

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          <div className={cn(
            "mx-auto transition-all duration-300",
            !isMobile && (sidebarCollapsed ? "max-w-7xl" : "max-w-6xl")
          )}>
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
