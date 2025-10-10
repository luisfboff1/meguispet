import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { Bell, Search, User, ChevronDown, LogOut, Settings, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { cn } from '@/lib/utils'

interface HeaderProps {
  title?: string
  description?: string
  sidebarCollapsed: boolean
  onMenuClick?: () => void
  isMobile?: boolean
}

type NotificationType = 'warning' | 'success' | 'info'

interface NotificationItem {
  id: number
  title: string
  message: string
  time: string
  read: boolean
  type: NotificationType
}

const defaultNotifications: NotificationItem[] = [
  { id: 1, title: 'Estoque baixo', message: 'Produto "Ração Premium" com estoque baixo', time: 'Há 2 horas', read: false, type: 'warning' },
  { id: 2, title: 'Nova venda', message: 'Venda "#1234" realizada com sucesso', time: 'Há 4 horas', read: false, type: 'success' },
  { id: 3, title: 'Novo cliente', message: 'Cliente "João Silva" cadastrado', time: 'Ontem', read: false, type: 'info' }
]

const isNotificationItem = (value: unknown): value is NotificationItem => {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<NotificationItem>
  return (
    typeof item.id === 'number' &&
    typeof item.title === 'string' &&
    typeof item.message === 'string' &&
    typeof item.time === 'string' &&
    typeof item.read === 'boolean' &&
    (item.type === 'warning' || item.type === 'success' || item.type === 'info')
  )
}

const loadStoredNotifications = (): NotificationItem[] => {
  if (typeof window === 'undefined') {
    return defaultNotifications
  }

  const saved = window.localStorage.getItem('meguispet-notifications')
  if (!saved) {
    return defaultNotifications
  }

  try {
    const parsed = JSON.parse(saved)
    if (Array.isArray(parsed)) {
      const validNotifications = parsed.filter(isNotificationItem)
      if (validNotifications.length > 0) {
        return validNotifications
      }
    }
  } catch (error) {
    console.warn('Erro ao carregar notificações salvas:', error)
  }

  return defaultNotifications
}

// Títulos das páginas
const pageTitles: Record<string, { title: string; description: string }> = {
  '/dashboard': { 
    title: 'Dashboard', 
    description: 'Visão geral do seu negócio' 
  },
  '/vendas': { 
    title: 'Vendas', 
    description: 'Gerencie suas vendas e pedidos' 
  },
  '/produtos': { 
    title: 'Produtos', 
    description: 'Cadastre e gerencie seus produtos' 
  },
  '/estoque': { 
    title: 'Estoque', 
    description: 'Controle seu estoque em tempo real' 
  },
  '/clientes': { 
    title: 'Clientes', 
    description: 'Gerencie sua base de clientes' 
  },
  '/vendedores': { 
    title: 'Vendedores', 
    description: 'Cadastre e gerencie vendedores' 
  },
  '/financeiro': { 
    title: 'Financeiro', 
    description: 'Controle financeiro e relatórios' 
  },
  '/relatorios': { 
    title: 'Relatórios', 
    description: 'Relatórios e análises do negócio' 
  },
  '/usuarios': { 
    title: 'Usuários', 
    description: 'Gerencie usuários do sistema' 
  },
}

export function Header({ title, description, sidebarCollapsed, onMenuClick, isMobile }: HeaderProps) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>(loadStoredNotifications)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const notificationsRef = useRef<HTMLDivElement>(null)
  
  // Pegar título e descrição automaticamente baseado na rota
  const pageInfo = pageTitles[router.pathname] || { 
    title: title || 'MeguisPet', 
    description: description || 'Sistema de gestão' 
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchTerm.trim()) {
      router.push(`/busca?q=${encodeURIComponent(searchTerm)}`)
    }
  }

  const handleLogout = () => {
    // Implementar logout
    localStorage.removeItem('token')
    router.push('/login')
  }

  const handleNotifications = () => {
    setShowNotifications(!showNotifications)
    // Marcar todas as notificações como lidas quando abrir
    if (!showNotifications) {
      setNotifications(prev => prev.map(notif => ({ ...notif, read: true })))
    }
  }

  const markNotificationAsRead = (id: number) => {
    setNotifications(prev => prev.map(notif => 
      notif.id === id ? { ...notif, read: true } : notif
    ))
  }

  const unreadCount = notifications.filter(notification => !notification.read).length

  const handleUserMenu = () => {
    setShowUserMenu(!showUserMenu)
  }

  const handleVerTodasNotificacoes = () => {
    setShowNotifications(false)
    router.push('/notificacoes')
  }

  // Salvar notificações no localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('meguispet-notifications', JSON.stringify(notifications))
    }
  }, [notifications])

  // Fechar dropdowns quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Mobile Menu Button */}
        {isMobile && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="mr-4"
            onClick={onMenuClick}
          >
            <Menu size={20} />
          </Button>
        )}

        {/* Título da página */}
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {pageInfo.title}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {pageInfo.description}
          </p>
        </div>

        {/* Barra de busca - Hidden em mobile */}
        <div className={cn(
          "flex-1 max-w-md mx-8",
          isMobile ? "hidden" : "block"
        )}>
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <Input 
              placeholder="Buscar vendas, clientes, produtos..." 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </form>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          {/* Theme Toggle */}
          <ThemeToggle variant="icon-only" />

          {/* Notificações */}
          <div className="relative" ref={notificationsRef}>
            <Button 
              variant="ghost" 
              size="icon" 
              className="relative"
              onClick={handleNotifications}
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </Button>
            
            {/* Dropdown de notificações */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                <div className="p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Notificações</h3>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {notifications.map((notification) => (
                      <div 
                        key={notification.id}
                        className={`flex items-start space-x-3 p-3 rounded-lg cursor-pointer hover:bg-gray-50 ${
                          notification.type === 'warning' ? 'bg-yellow-50' :
                          notification.type === 'success' ? 'bg-green-50' :
                          'bg-blue-50'
                        } ${notification.read ? 'opacity-60' : ''}`}
                        onClick={() => markNotificationAsRead(notification.id)}
                      >
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          notification.type === 'warning' ? 'bg-yellow-500' :
                          notification.type === 'success' ? 'bg-green-500' :
                          'bg-blue-500'
                        }`}></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                          <p className="text-xs text-gray-600">{notification.message}</p>
                          <p className="text-xs text-gray-400">{notification.time}</p>
                        </div>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full"
                      onClick={handleVerTodasNotificacoes}
                    >
                      Ver todas as notificações
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Avatar do usuário */}
          <div className="relative" ref={userMenuRef}>
            <div 
              className="flex items-center space-x-2 cursor-pointer"
              onClick={handleUserMenu}
            >
              <div className="w-8 h-8 bg-meguispet-primary rounded-full flex items-center justify-center">
                <User size={16} className="text-white" />
              </div>
              <div className={cn(
                "flex items-center space-x-1 transition-all duration-300",
                sidebarCollapsed ? "opacity-100" : "opacity-100"
              )}>
                <span className="text-sm font-medium text-gray-700">Admin</span>
                <ChevronDown size={16} className="text-gray-400" />
              </div>
            </div>
            
            {/* Dropdown do usuário */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                <div className="py-1">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">Admin</p>
                    <p className="text-xs text-gray-500">admin@meguispet.com</p>
                  </div>
                  <button 
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => {
                      setShowUserMenu(false)
                      router.push('/perfil')
                    }}
                  >
                    <User className="mr-3 h-4 w-4" />
                    Perfil
                  </button>
                  <button 
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => {
                      setShowUserMenu(false)
                      router.push('/configuracoes')
                    }}
                  >
                    <Settings className="mr-3 h-4 w-4" />
                    Configurações
                  </button>
                  <div className="border-t border-gray-100"></div>
                  <button 
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-3 h-4 w-4" />
                    Sair
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
