import React from 'react'
import { useRouter } from 'next/router'
import { Bell, Search, User, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface HeaderProps {
  title?: string
  description?: string
  sidebarCollapsed: boolean
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

export function Header({ title, description, sidebarCollapsed }: HeaderProps) {
  const router = useRouter()
  
  // Pegar título e descrição automaticamente baseado na rota
  const pageInfo = pageTitles[router.pathname] || { 
    title: title || 'MeguisPet', 
    description: description || 'Sistema de gestão' 
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Título da página */}
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            {pageInfo.title}
          </h1>
          <p className="text-sm text-gray-600">
            {pageInfo.description}
          </p>
        </div>

        {/* Barra de busca */}
        <div className="flex-1 max-w-md mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <Input 
              placeholder="Buscar..." 
              className="pl-10"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-4">
          {/* Notificações */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell size={20} />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              3
            </span>
          </Button>

          {/* Avatar do usuário */}
          <div className="flex items-center space-x-2">
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
        </div>
      </div>
    </header>
  )
}
