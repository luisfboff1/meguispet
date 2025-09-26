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
  const router = useRouter()

  // Páginas que não precisam de layout (login, etc)
  const noLayoutPages = ['/login', '/register', '/forgot-password']
  const isNoLayoutPage = noLayoutPages.includes(router.pathname)

  // Verificar autenticação
  useEffect(() => {
    if (typeof window !== 'undefined' && !isNoLayoutPage) {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login')
      }
    }
  }, [router.pathname, isNoLayoutPage])

  // Se for página sem layout, renderizar só o conteúdo
  if (isNoLayoutPage) {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen bg-gray-50">
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
