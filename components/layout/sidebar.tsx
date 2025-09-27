import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { cn } from "@/lib/utils"
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
  Menu,
  Package2
} from 'lucide-react'

interface MenuItem {
  icon: React.ComponentType<any>
  label: string
  href: string
  badge?: number
}

const menuItems: MenuItem[] = [
  { icon: Home, label: 'Dashboard', href: '/dashboard' },
  { icon: ShoppingCart, label: 'Vendas', href: '/vendas' },
  { icon: Package, label: 'Produtos', href: '/produtos' },
  { icon: Package2, label: 'Estoque', href: '/estoque' },
  { icon: Users, label: 'Clientes', href: '/clientes' },
  { icon: UserCheck, label: 'Vendedores', href: '/vendedores' },
  { icon: DollarSign, label: 'Financeiro', href: '/financeiro' },
  { icon: BarChart3, label: 'Relatórios', href: '/relatorios' },
  { icon: Settings, label: 'Usuários', href: '/usuarios' },
]

interface SidebarProps {
  isCollapsed: boolean
  onToggle: () => void
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const router = useRouter()

  const handleLogout = () => {
    // Implementar logout
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token')
      router.push('/login')
    }
  }

  return (
    <div className={cn(
      "bg-white border-r border-gray-200 h-full flex flex-col transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg overflow-hidden">
                <Image
                  src="/Meguis-pet-1280x1147.png"
                  alt="MeguisPet Logo"
                  width={32}
                  height={32}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="font-semibold text-gray-900">MeguisPet</span>
            </div>
          )}
          {isCollapsed && (
            <div className="w-8 h-8 rounded-lg overflow-hidden">
              <Image
                src="/Meguis-pet-1280x1147.png"
                alt="MeguisPet Logo"
                width={32}
                height={32}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <button
            onClick={onToggle}
            className="p-1 hover:bg-gray-100 rounded-md transition-colors"
          >
            <Menu size={20} />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = router.pathname === item.href
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-meguispet-primary text-white"
                    : "text-gray-700 hover:bg-gray-100",
                  isCollapsed ? "justify-center" : "justify-start"
                )}
              >
                <Icon size={20} />
                {!isCollapsed && (
                  <span className="ml-3">{item.label}</span>
                )}
                {!isCollapsed && item.badge && (
                  <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-1">
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className={cn(
            "flex items-center px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors w-full",
            isCollapsed ? "justify-center" : "justify-start"
          )}
        >
          <LogOut size={20} />
          {!isCollapsed && (
            <span className="ml-3">Sair</span>
          )}
        </button>
      </div>
    </div>
  )
}
