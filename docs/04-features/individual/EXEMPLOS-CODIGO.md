# 💻 Exemplos de Código - Dashboards Personalizados

Este arquivo contém exemplos prontos de código para implementar os principais componentes do sistema.

---

## 1️⃣ Dashboard do Vendedor

### `components/dashboards/VendedorDashboard.tsx`

```typescript
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DollarSign,
  ShoppingCart,
  Users,
  TrendingUp,
  Target,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { vendasService, clientesService, vendedoresService } from '@/services/api'
import type { Venda, Cliente, Vendedor } from '@/types'
import { formatCurrency } from '@/lib/utils'
import VendasChart from '@/components/charts/VendasChart'

export function VendedorDashboard() {
  const { user } = useAuthStore()
  const [vendedor, setVendedor] = useState<Vendedor | null>(null)
  const [vendas, setVendas] = useState<Venda[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)

      // Buscar vendedor vinculado ao usuário
      if (user?.vendedor_id) {
        const vendedorData = await vendedoresService.getById(user.vendedor_id)
        setVendedor(vendedorData.data)

        // Buscar vendas do vendedor
        const vendasResponse = await vendasService.getByVendedorId(
          user.vendedor_id
        )
        setVendas(vendasResponse.data || [])

        // Buscar clientes do vendedor
        const clientesResponse = await clientesService.getByVendedorId(
          user.vendedor_id
        )
        setClientes(clientesResponse.data || [])
      }
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calcular métricas
  const vendasDoMes = vendas.filter(v => {
    const dataVenda = new Date(v.data_venda)
    const hoje = new Date()
    return (
      dataVenda.getMonth() === hoje.getMonth() &&
      dataVenda.getFullYear() === hoje.getFullYear()
    )
  })

  const faturamentoDoMes = vendasDoMes.reduce(
    (sum, v) => sum + v.valor_final,
    0
  )

  const comissoesDoMes = faturamentoDoMes * ((vendedor?.comissao || 0) / 100)

  const clientesAtivos = clientes.filter(c => c.ativo).length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-meguispet-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <Card className="bg-gradient-to-r from-meguispet-primary to-meguispet-secondary text-white">
        <CardContent className="pt-6">
          <h1 className="text-2xl font-bold mb-2">
            Olá, {user?.nome}! 👋
          </h1>
          <p className="text-white/90">
            Bem-vindo ao seu painel de vendas pessoal
          </p>
        </CardContent>
      </Card>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Vendas do Mês"
          value={vendasDoMes.length}
          icon={ShoppingCart}
          color="blue"
        />
        <MetricCard
          title="Faturamento"
          value={formatCurrency(faturamentoDoMes)}
          icon={DollarSign}
          color="green"
        />
        <MetricCard
          title="Comissões"
          value={formatCurrency(comissoesDoMes)}
          icon={TrendingUp}
          color="orange"
        />
        <MetricCard
          title="Clientes Ativos"
          value={clientesAtivos}
          icon={Users}
          color="purple"
        />
      </div>

      {/* Gráfico de Vendas */}
      <Card>
        <CardHeader>
          <CardTitle>Minhas Vendas - Últimos 30 dias</CardTitle>
        </CardHeader>
        <CardContent>
          <VendasChart data={prepareChartData(vendas)} />
        </CardContent>
      </Card>

      {/* Últimas Vendas */}
      <Card>
        <CardHeader>
          <CardTitle>Minhas Últimas Vendas</CardTitle>
        </CardHeader>
        <CardContent>
          <UltimasVendasTable vendas={vendas.slice(0, 5)} />
        </CardContent>
      </Card>

      {/* Meus Clientes */}
      <Card>
        <CardHeader>
          <CardTitle>Meus Clientes</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientesTable clientes={clientes.slice(0, 10)} />
        </CardContent>
      </Card>
    </div>
  )
}

// Helper: Card de Métrica
interface MetricCardProps {
  title: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  color: 'blue' | 'green' | 'orange' | 'purple'
}

function MetricCard({ title, value, icon: Icon, color }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    orange: 'bg-orange-500',
    purple: 'bg-purple-500',
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{title}</p>
            <h3 className="text-2xl font-bold">{value}</h3>
          </div>
          <div className={`p-3 rounded-full ${colorClasses[color]}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Helper: Preparar dados do gráfico
function prepareChartData(vendas: Venda[]) {
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (29 - i))
    return date.toISOString().split('T')[0]
  })

  return last30Days.map(date => {
    const vendasDoDia = vendas.filter(
      v => v.data_venda.split('T')[0] === date
    )
    return {
      data: date,
      vendas: vendasDoDia.length,
      receita: vendasDoDia.reduce((sum, v) => sum + v.valor_final, 0),
    }
  })
}
```

---

## 2️⃣ Componente de Proteção de Permissões

### `components/auth/PermissionGate.tsx`

```typescript
import { usePermissions } from '@/hooks/usePermissions'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import type { Permissoes } from '@/types'
import { AlertCircle } from 'lucide-react'

interface PermissionGateProps {
  permission: keyof Permissoes
  fallback?: React.ReactNode
  redirect?: string
  children: React.ReactNode
}

export function PermissionGate({
  permission,
  fallback,
  redirect,
  children,
}: PermissionGateProps) {
  const router = useRouter()
  const { hasPermission } = usePermissions()

  useEffect(() => {
    if (redirect && !hasPermission(permission)) {
      router.push(`${redirect}?error=permission_denied`)
    }
  }, [permission, redirect, hasPermission, router])

  if (!hasPermission(permission)) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Acesso Negado</h1>
          <p className="text-gray-600 mb-4">
            Você não tem permissão para acessar esta funcionalidade.
          </p>
          <p className="text-sm text-gray-500">
            Entre em contato com o administrador se precisar de acesso.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
```

**Uso:**

```typescript
// Em qualquer página
import { PermissionGate } from '@/components/auth/PermissionGate'

export default function FinanceiroPage() {
  return (
    <PermissionGate permission="financeiro" redirect="/dashboard">
      <div>
        {/* Conteúdo da página financeiro */}
      </div>
    </PermissionGate>
  )
}
```

---

## 3️⃣ Sidebar com Permissões

### Atualizar `components/layout/sidebar.tsx`

```typescript
import { usePermissions } from '@/hooks/usePermissions'
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Package,
  DollarSign,
  FileText,
  Settings,
} from 'lucide-react'

export function Sidebar() {
  const { hasPermission } = usePermissions()

  const menuItems = [
    {
      label: 'Dashboard',
      icon: LayoutDashboard,
      href: '/dashboard',
      permission: 'dashboard' as const,
    },
    {
      label: 'Vendas',
      icon: ShoppingCart,
      href: '/vendas',
      permission: 'vendas' as const,
    },
    {
      label: 'Clientes',
      icon: Users,
      href: '/clientes',
      permission: 'clientes' as const,
    },
    {
      label: 'Produtos',
      icon: Package,
      href: '/produtos',
      permission: 'produtos' as const,
    },
    {
      label: 'Financeiro',
      icon: DollarSign,
      href: '/financeiro',
      permission: 'financeiro' as const,
    },
    {
      label: 'Relatórios',
      icon: FileText,
      href: '/relatorios',
      permission: 'relatorios' as const,
    },
    {
      label: 'Configurações',
      icon: Settings,
      href: '/configuracoes',
      permission: 'config_sistema' as const,
    },
  ]

  // Filtrar itens do menu baseado nas permissões
  const visibleItems = menuItems.filter(item =>
    hasPermission(item.permission)
  )

  return (
    <aside className="w-64 bg-white border-r">
      <nav className="p-4 space-y-2">
        {visibleItems.map(item => (
          <SidebarItem key={item.href} {...item} />
        ))}
      </nav>
    </aside>
  )
}
```

---

## 4️⃣ API com Filtros de Vendedor

### `pages/api/vendas/my.ts`

```typescript
import type { NextApiResponse } from 'next'
import { withSupabaseAuth, AuthenticatedRequest } from '@/lib/supabase-middleware'
import { createClient } from '@supabase/supabase-js'

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Buscar dados do usuário autenticado
    const { data: usuario, error: userError } = await supabase
      .from('usuarios')
      .select('id, tipo_usuario, vendedor_id, permissoes')
      .eq('supabase_user_id', req.user.id)
      .single()

    if (userError || !usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' })
    }

    // Se for admin, retornar todas as vendas
    if (usuario.tipo_usuario === 'admin') {
      const { data: vendas, error } = await supabase
        .from('vendas')
        .select(`
          *,
          cliente:clientes(*),
          vendedor:vendedores(*),
          itens:itens_venda(*)
        `)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error

      return res.json({ success: true, data: vendas })
    }

    // Se for vendedor, retornar apenas suas vendas
    if (usuario.tipo_usuario === 'vendedor' && usuario.vendedor_id) {
      const { data: vendas, error } = await supabase
        .from('vendas')
        .select(`
          *,
          cliente:clientes(*),
          vendedor:vendedores(*),
          itens:itens_venda(*)
        `)
        .eq('vendedor_id', usuario.vendedor_id)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error

      return res.json({ success: true, data: vendas })
    }

    // Se não tem permissão, retornar vazio
    return res.json({ success: true, data: [] })

  } catch (error) {
    console.error('Erro ao buscar vendas:', error)
    return res.status(500).json({ error: 'Erro ao buscar vendas' })
  }
}

export default withSupabaseAuth(handler)
```

### Atualizar `services/api.ts`

```typescript
// services/api.ts
export const vendasService = {
  // Existente
  getAll: (page = 1, limit = 10) =>
    api.get<PaginatedResponse<Venda>>(`/api/vendas?page=${page}&limit=${limit}`),

  // 🆕 NOVO: Minhas vendas (com filtro automático)
  getMyVendas: () =>
    api.get<ApiResponse<Venda[]>>('/api/vendas/my'),

  // 🆕 NOVO: Vendas de um vendedor específico
  getByVendedorId: (vendedorId: number, page = 1, limit = 100) =>
    api.get<ApiResponse<Venda[]>>(
      `/api/vendas?vendedor_id=${vendedorId}&page=${page}&limit=${limit}`
    ),

  getById: (id: number) =>
    api.get<ApiResponse<Venda>>(`/api/vendas/${id}`),

  create: (venda: VendaForm) =>
    api.post<ApiResponse<Venda>>('/api/vendas', venda),

  update: (id: number, venda: VendaForm) =>
    api.put<ApiResponse<Venda>>(`/api/vendas/${id}`, venda),

  delete: (id: number) =>
    api.delete(`/api/vendas/${id}`),
}
```

---

## 5️⃣ Atualizar Middleware com Permissões

### Adicionar ao `middleware.ts`

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Mapa de rotas e permissões necessárias
const ROUTE_PERMISSIONS: Record<string, keyof Permissoes> = {
  '/dashboard': 'dashboard',
  '/vendas': 'vendas',
  '/clientes': 'clientes',
  '/produtos': 'produtos',
  '/estoque': 'estoque',
  '/financeiro': 'financeiro',
  '/relatorios': 'relatorios',
  '/configuracoes': 'config_sistema',
  '/usuarios': 'config_usuarios',
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, {
              ...options,
              maxAge: 6 * 60 * 60,
              httpOnly: true,
              secure: true,
              sameSite: 'strict',
              path: '/',
            })
          })
        },
      },
    }
  )

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    if (request.nextUrl.pathname !== '/login') {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // 🆕 NOVO: Buscar permissões do usuário
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('id, tipo_usuario, vendedor_id, permissoes')
    .eq('supabase_user_id', user.id)
    .single()

  if (!usuario) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('error', 'user_not_found')
    return NextResponse.redirect(url)
  }

  // 🆕 NOVO: Verificar permissões da rota
  const path = request.nextUrl.pathname
  const routeKey = Object.keys(ROUTE_PERMISSIONS).find(route =>
    path.startsWith(route)
  )

  if (routeKey) {
    const requiredPermission = ROUTE_PERMISSIONS[routeKey]
    const userPermissions = usuario.permissoes as Record<string, boolean>

    if (!userPermissions[requiredPermission]) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      url.searchParams.set('error', 'permission_denied')
      return NextResponse.redirect(url)
    }
  }

  // 🆕 NOVO: Adicionar dados do usuário aos headers
  supabaseResponse.headers.set('X-User-Id', usuario.id.toString())
  supabaseResponse.headers.set('X-User-Role', usuario.tipo_usuario)
  if (usuario.vendedor_id) {
    supabaseResponse.headers.set(
      'X-Vendedor-Id',
      usuario.vendedor_id.toString()
    )
  }

  // ... resto do código de session timeout ...

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
```

---

## 🎯 Checklist de Implementação

Use este checklist para acompanhar o progresso:

### Backend
- [ ] ✅ Migrations executadas
- [ ] ✅ Usuários vinculados a vendedores
- [ ] ✅ Permissões aplicadas
- [ ] ✅ API `/api/vendas/my` criada
- [ ] ✅ Filtros em endpoints existentes

### Frontend
- [ ] ✅ Types atualizados
- [ ] ✅ Hook `usePermissions` criado
- [ ] ✅ Componente `PermissionGate` criado
- [ ] ✅ Sidebar atualizada
- [ ] ✅ Dashboard do Vendedor criado
- [ ] ✅ Middleware com permissões

### Testes
- [ ] ✅ Vendedor vê só suas vendas
- [ ] ✅ Vendedor não acessa financeiro
- [ ] ✅ Admin acessa tudo
- [ ] ✅ Redirecionamentos funcionam

---

**Pronto para começar! 🚀**
