import React, { useMemo, useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Bell,
  Search,
  User,
  ChevronDown,
  LogOut,
  Settings,
  Menu,
  Sparkles
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { cn } from '@/lib/utils'
import { useSidebar } from '@/hooks/useSidebar'
import { useAuth } from '@/hooks/useAuth'

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
  const { logout, user } = useAuth()
  const { toggle } = useSidebar()
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
    <header className="relative z-30 border-b border-white/30 bg-white/70 px-6 py-4 backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-950/60">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {isMobile && (
            <Button
              variant="secondary"
              size="icon"
              className="h-10 w-10 rounded-2xl border border-white/50 bg-white/80 text-slate-600 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/70 dark:text-slate-100"
              onClick={() => (onMenuClick ? onMenuClick() : toggle())}
            >
              <Menu size={18} />
            </Button>
          )}

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-slate-900 drop-shadow-sm dark:text-white md:text-2xl">
                {pageInfo.title}
              </h1>
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{pageInfo.description}</p>
          </div>
        </div>

        <div className={cn('hidden flex-1 max-w-xl lg:block')}>
          <form onSubmit={handleSearch} className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Buscar vendas, clientes, produtos..."
              className="h-12 rounded-2xl border border-white/60 bg-white/80 pl-12 pr-4 shadow-sm backdrop-blur-md transition focus:border-amber-400/60 focus:ring-amber-400/20 dark:border-slate-800/70 dark:bg-slate-900/70"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </form>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle variant="icon-only" />

          <div className="relative" ref={userMenuRef}>
            <button
              className="group flex items-center gap-3 rounded-2xl border border-transparent bg-white/70 px-2 py-1 pl-1.5 pr-3 text-left transition hover:-translate-y-0.5 hover:border-white/60 hover:bg-white/90 dark:bg-slate-900/70 dark:hover:border-slate-800/80 dark:hover:bg-slate-900/90"
              onClick={handleUserMenu}
            >
              <span className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/40">
                <User size={18} />
              </span>
              <span className="hidden min-w-0 flex-1 text-left md:block">
                <span className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {user?.nome ?? 'Admin'}
                </span>
                <span className="block text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  {user?.email ?? 'admin@meguispet.com'}
                </span>
              </span>
              <ChevronDown size={16} className="text-slate-400 transition group-hover:text-slate-600 dark:text-slate-500" />
            </button>

            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                  className="absolute right-0 mt-3 w-60 overflow-hidden rounded-3xl border border-white/40 bg-white/95 p-3 shadow-2xl backdrop-blur-2xl dark:border-slate-800/70 dark:bg-slate-950/90"
                >
                  <div className="rounded-2xl bg-slate-100/60 p-3 dark:bg-slate-900/70">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{user?.nome ?? 'Admin'}</p>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{user?.email ?? 'admin@meguispet.com'}</p>
                  </div>
                  <div className="mt-2 space-y-1">
                    <button
                      className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900/80"
                      onClick={() => {
                        setShowUserMenu(false)
                        router.push('/perfil')
                      }}
                    >
                      <User size={16} /> Perfil
                    </button>
                    <button
                      className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900/80"
                      onClick={() => {
                        setShowUserMenu(false)
                        router.push('/configuracoes')
                      }}
                    >
                      <Settings size={16} /> Configurações
                    </button>
                  </div>
                  <div className="mt-2 border-t border-white/40 dark:border-slate-800/60" />
                  <button
                    className="mt-2 flex w-full items-center justify-between rounded-2xl bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-500/15 dark:text-rose-300"
                    onClick={() => logout()}
                  >
                    <span>Encerrar sessão</span>
                    <LogOut size={16} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  )
}
