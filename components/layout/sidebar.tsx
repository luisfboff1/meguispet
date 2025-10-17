import React, { useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { cn } from '@/lib/utils'
import {
  Home,
  ShoppingCart,
  Package,
  Users,
  DollarSign,
  BarChart3,
  UserCheck,
  Settings,
  LogOut,
  Package2,
  Truck,
  X,
  Building2
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useSidebar } from '@/hooks/useSidebar'

interface MenuItem {
  icon: LucideIcon
  label: string
  href: string
  badge?: number
}

const menuItems: MenuItem[] = [
  { icon: Home, label: 'Dashboard', href: '/dashboard' },
  { icon: ShoppingCart, label: 'Vendas', href: '/vendas' },
  { icon: Package, label: 'Produtos & Estoque', href: '/produtos-estoque' },
  { icon: Building2, label: 'Fornecedores', href: '/fornecedores' },
  { icon: Users, label: 'Clientes', href: '/clientes' },
  { icon: UserCheck, label: 'Vendedores', href: '/vendedores' },
  { icon: DollarSign, label: 'Financeiro', href: '/financeiro' },
  { icon: BarChart3, label: 'Relatórios', href: '/relatorios' },
  { icon: Settings, label: 'Usuários', href: '/usuarios' },
]

interface SidebarProps {
  isCollapsed: boolean
  onToggle: () => void
  hideToggle?: boolean
}

export function Sidebar({ isCollapsed, onToggle, hideToggle = false }: SidebarProps) {
  const router = useRouter()
  const { logout } = useAuth()
  const { handleItemSelect, isTemporary, close } = useSidebar()

  const activePath = router.pathname

  const navigation = useMemo(
    () =>
      menuItems.map((item) => ({
        ...item,
        active: activePath === item.href
      })),
    [activePath]
  )

  const renderLabel = (label: string) => (
    <span className="truncate font-medium tracking-tight">{label}</span>
  )

  return (
    <div
      className={cn(
        'relative flex h-full w-full flex-col overflow-hidden',
        'bg-gradient-to-br from-white/95 via-white/90 to-white/80 backdrop-blur-xl dark:from-slate-950/95 dark:via-slate-950/85 dark:to-slate-900/80',
        'border-r border-white/40 shadow-xl shadow-slate-900/5 dark:border-slate-800/70'
      )}
    >
      <div className="relative border-b border-white/40 px-4 py-5 dark:border-slate-800/70">
        <div className={cn('flex items-center gap-3', isCollapsed && 'flex-col gap-2 text-center')}>
          <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-tr from-amber-400 via-amber-500 to-orange-500 shadow-lg shadow-amber-500/30">
            <Image
              src="/Meguis-pet-1280x1147.png"
              alt="MeguisPet Logo"
              width={isCollapsed ? 40 : 44}
              height={isCollapsed ? 40 : 44}
              className="h-full w-full object-cover"
            />
          </div>
          {!isCollapsed && (
            <div className="flex flex-1 flex-col text-left">
              <span className="text-xs uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
                Painel
              </span>
              <span className="text-lg font-semibold text-slate-900 dark:text-white">
                MeguisPet
              </span>
              <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                Gestão integrada de pet shop
              </span>
            </div>
          )}
          {!hideToggle && !isTemporary && (
            <button
              onClick={onToggle}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-transparent bg-white/80 text-slate-500 shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 dark:bg-slate-900/80 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
              aria-label={isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
            >
              <Package2 size={18} />
            </button>
          )}
          {isTemporary && (
            <button
              onClick={close}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-transparent bg-white/80 text-slate-500 shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 dark:bg-slate-900/80 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
              aria-label="Fechar menu lateral"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-200/80 dark:scrollbar-thumb-slate-700/60">
        <div className="space-y-5">
          <div className={cn('space-y-2 rounded-3xl px-2 py-1', isCollapsed ? 'px-1' : 'px-2')}>
            <p className={cn('px-3 text-xs font-semibold uppercase tracking-widest text-slate-400/80 dark:text-slate-500/80', isCollapsed && 'hidden')}>
              Navegação principal
            </p>
            {navigation.map((item) => {
              const Icon = item.icon
              const active = item.active

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleItemSelect}
                  className={cn(
                    'group relative flex items-center gap-3 overflow-hidden rounded-2xl px-3 py-2 text-sm transition-all duration-200',
                    active
                      ? 'bg-amber-500/90 text-white shadow-lg shadow-amber-500/30'
                      : 'text-slate-600 hover:bg-white/90 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900/80 dark:hover:text-white'
                  )}
                  title={isCollapsed ? item.label : undefined}
                >
                  <span
                    className={cn(
                      'flex h-10 w-10 transform items-center justify-center rounded-2xl bg-white/80 text-amber-500 shadow-sm shadow-amber-500/20 transition-all duration-200 dark:bg-slate-900/60 dark:text-amber-300',
                      active && 'scale-95 bg-white text-amber-500'
                    )}
                  >
                    <Icon size={20} />
                  </span>
                  {!isCollapsed && (
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      {renderLabel(item.label)}
                      {item.badge !== undefined && (
                        <span className="ml-auto inline-flex items-center rounded-full bg-white/80 px-2 py-0.5 text-xs font-semibold text-slate-500 shadow-sm dark:bg-slate-900/70 dark:text-slate-300">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}
                </Link>
              )
            })}
          </div>

          {!isCollapsed && (
            <div className="rounded-3xl border border-white/40 bg-white/70 p-4 shadow-md shadow-amber-500/10 backdrop-blur-sm dark:border-slate-800/70 dark:bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-amber-500/10 p-3 text-amber-500">
                  <Truck size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-widest text-amber-600/80 dark:text-amber-300/90">
                    Insights rápidos
                  </p>
                  <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                    Organização de estoque em tempo real
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-white/40 px-4 py-4 dark:border-slate-800/70">
        <button
          onClick={() => logout()}
          className={cn(
            'group flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium text-rose-500 transition-all duration-200 hover:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/15',
            isCollapsed && 'justify-center'
          )}
          title={isCollapsed ? 'Encerrar sessão' : undefined}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-100/60 text-rose-500 shadow-sm dark:bg-rose-500/20 dark:text-rose-300">
            <LogOut size={20} />
          </span>
          {!isCollapsed && (
            <span className="flex-1 text-left font-semibold tracking-tight">Encerrar sessão</span>
          )}
        </button>
      </div>
    </div>
  )
}
