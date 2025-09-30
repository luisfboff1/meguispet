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
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  // Páginas que não precisam de layout (login, etc)
  const noLayoutPages = ['/login', '/register', '/forgot-password']
  const isNoLayoutPage = noLayoutPages.includes(router.pathname)

  // Verificar se o componente foi montado no cliente
  useEffect(() => {
    setMounted(true)
  }, [])

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

  return (
    <div className="flex h-screen bg-gray-50" suppressHydrationWarning>
      {/* Sidebar */}
      <Sidebar 
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header 
          title={title}
          description={description}
          sidebarCollapsed={sidebarCollapsed}
        />

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          <div className={cn(
            "mx-auto transition-all duration-300",
            sidebarCollapsed ? "max-w-7xl" : "max-w-6xl"
          )}>
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
