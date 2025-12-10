import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DollarSign,
  ShoppingCart,
  Users,
  TrendingUp,
  Eye,
  Package,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { usePermissions } from '@/hooks/usePermissions'
import { vendasService, clientesService, vendedoresService } from '@/services/api'
import type { Venda, Cliente, Vendedor } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { MetricCard } from './shared/MetricCard'
import { WelcomeCard } from './shared/WelcomeCard'
import { EmptyState } from './shared/EmptyState'
import { useRouter } from 'next/router'

// Lazy load do gráfico
const DashboardChart = dynamic(() => import('@/components/charts/DashboardChart'), {
  ssr: false,
  loading: () => (
    <div className="h-80 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-meguispet-primary"></div>
    </div>
  ),
})

/**
 * VendedorDashboard - Dashboard personalizado para vendedores
 *
 * Mostra APENAS:
 * - Vendas do próprio vendedor
 * - Clientes do vendedor
 * - Comissões calculadas
 * - Métricas pessoais
 *
 * Não mostra:
 * - Vendas de outros vendedores
 * - Dados financeiros gerais
 * - Configurações do sistema
 */
export function VendedorDashboard() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { vendedorId, userName } = usePermissions()
  const [vendedor, setVendedor] = useState<Vendedor | null>(null)
  const [vendas, setVendas] = useState<Venda[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadVendedorData()
  }, [vendedorId])

  const loadVendedorData = async () => {
    try {
      setLoading(true)

      // Buscar dados do vendedor vinculado
      if (vendedorId) {
        // Buscar em paralelo para otimizar
        const [vendedorResponse, vendasResponse, clientesResponse] = await Promise.all([
          vendedoresService.getById(vendedorId),
          vendasService.getMyVendas(), // API filtra automaticamente por vendedor
          clientesService.getAll(1, 100), // API filtra automaticamente por vendedor via middleware
        ])

        if (vendedorResponse.success && vendedorResponse.data) {
          setVendedor(vendedorResponse.data)
        }

        if (vendasResponse.success && vendasResponse.data) {
          setVendas(Array.isArray(vendasResponse.data) ? vendasResponse.data : [])
        }

        if (clientesResponse.success && clientesResponse.data) {
          // clientesService.getAll retorna resposta paginada
          const items = (clientesResponse as any).items || []
          setClientes(Array.isArray(items) ? items : [])
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados do vendedor:', error)
    } finally {
      setLoading(false)
    }
  }

  // ===== CALCULAR MÉTRICAS =====

  // Vendas do mês atual
  const vendasDoMes = vendas.filter((v) => {
    const dataVenda = new Date(v.data_venda)
    const hoje = new Date()
    return (
      dataVenda.getMonth() === hoje.getMonth() &&
      dataVenda.getFullYear() === hoje.getFullYear()
    )
  })

  // Faturamento do mês
  const faturamentoDoMes = vendasDoMes.reduce((sum, v) => sum + (v.valor_final || 0), 0)

  // Comissões (baseado na taxa do vendedor)
  const taxaComissao = vendedor?.comissao || 0
  const comissoesDoMes = (faturamentoDoMes * taxaComissao) / 100

  // Clientes ativos
  const clientesAtivos = clientes.filter((c) => c.ativo).length

  // Vendas ontem vs hoje (para trend)
  const hoje = new Date()
  const ontem = new Date(hoje)
  ontem.setDate(ontem.getDate() - 1)

  const vendasHoje = vendas.filter((v) => {
    const dataVenda = new Date(v.data_venda)
    return dataVenda.toDateString() === hoje.toDateString()
  }).length

  const vendasOntem = vendas.filter((v) => {
    const dataVenda = new Date(v.data_venda)
    return dataVenda.toDateString() === ontem.toDateString()
  }).length

  const trendVendas =
    vendasOntem > 0
      ? `${((vendasHoje - vendasOntem) / vendasOntem * 100).toFixed(1)}%`
      : vendasHoje > 0
      ? '+100%'
      : '0%'

  // ===== RENDERIZAÇÃO =====

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-meguispet-primary"></div>
      </div>
    )
  }

  // Vendedor sem vínculo - mostrar alerta
  if (!vendedorId || !vendedor) {
    return (
      <div className="space-y-6">
        <WelcomeCard name={userName || 'Vendedor'} role="Vendedor" />
        <EmptyState
          icon={Users}
          title="Perfil de vendedor não vinculado"
          description="Seu usuário ainda não foi vinculado a um perfil de vendedor. Entre em contato com o administrador para configurar seu perfil."
          actionLabel="Falar com Suporte"
          onAction={() => router.push('/feedback')}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <WelcomeCard
        name={userName || 'Vendedor'}
        role="Vendedor"
        message="Bem-vindo ao seu painel de vendas pessoal"
      />

      {/* Ações Rápidas */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Button
              className="bg-meguispet-primary hover:bg-meguispet-primary/90 h-16 flex-col"
              onClick={() => router.push('/vendas')}
            >
              <ShoppingCart className="h-5 w-5 mb-1" />
              <span className="text-sm">Minhas Vendas</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/clientes')}
              className="h-16 flex-col"
            >
              <Users className="h-5 w-5 mb-1" />
              <span className="text-sm">Meus Clientes</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/produtos-estoque')}
              className="h-16 flex-col"
            >
              <Package className="h-5 w-5 mb-1" />
              <span className="text-sm">Ver Produtos</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Métricas do Vendedor */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Vendas do Mês"
          value={vendasDoMes.length}
          icon={ShoppingCart}
          color="blue"
          trend={{
            value: trendVendas,
            isPositive: parseFloat(trendVendas) >= 0,
          }}
          subtitle="vs. ontem"
        />
        <MetricCard
          title="Faturamento"
          value={formatCurrency(faturamentoDoMes)}
          icon={DollarSign}
          color="green"
          subtitle="Total do mês"
        />
        <MetricCard
          title="Comissões"
          value={formatCurrency(comissoesDoMes)}
          icon={TrendingUp}
          color="orange"
          subtitle={`${taxaComissao}% de comissão`}
        />
        <MetricCard
          title="Clientes Ativos"
          value={clientesAtivos}
          icon={Users}
          color="purple"
          subtitle={`de ${clientes.length} total`}
        />
      </div>

      {/* Gráfico de Vendas */}
      {vendas.length > 0 ? (
        <DashboardChart
          data={prepareChartData(vendas)}
          loading={false}
          selectedPeriod={30}
          onPeriodChange={() => {}}
        />
      ) : (
        <EmptyState
          icon={ShoppingCart}
          title="Nenhuma venda registrada"
          description="Você ainda não tem vendas registradas. Comece fazendo sua primeira venda!"
          actionLabel="Ver Produtos"
          onAction={() => router.push('/produtos-estoque')}
        />
      )}

      {/* Últimas Vendas */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Minhas Últimas Vendas</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/vendas')}
            >
              <Eye className="h-4 w-4 mr-2" />
              Ver Todas
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {vendas.length > 0 ? (
            <div className="space-y-4">
              {vendas.slice(0, 5).map((venda) => (
                <div
                  key={venda.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition"
                >
                  <div>
                    <p className="font-medium">Venda #{venda.id}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(venda.data_venda).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">
                      {formatCurrency(venda.valor_final)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {venda.status || 'Concluída'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">
              Nenhuma venda registrada ainda
            </p>
          )}
        </CardContent>
      </Card>

      {/* Meus Clientes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Meus Clientes</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/clientes')}
            >
              <Eye className="h-4 w-4 mr-2" />
              Ver Todos
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {clientes.length > 0 ? (
            <div className="space-y-4">
              {clientes.slice(0, 5).map((cliente) => (
                <div
                  key={cliente.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition"
                >
                  <div>
                    <p className="font-medium">{cliente.nome}</p>
                    <p className="text-sm text-gray-600">
                      {cliente.email || cliente.telefone || 'Sem contato'}
                    </p>
                  </div>
                  <div>
                    {cliente.ativo ? (
                      <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        Ativo
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                        Inativo
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">
              Nenhum cliente cadastrado ainda
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Helper: Preparar dados para o gráfico
function prepareChartData(vendas: Venda[]) {
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (29 - i))
    return date.toISOString().split('T')[0]
  })

  return last30Days.map((date) => {
    const vendasDoDia = vendas.filter(
      (v) => v.data_venda.split('T')[0] === date
    )
    return {
      data: date,
      vendas: vendasDoDia.length,
      receita: vendasDoDia.reduce((sum, v) => sum + (v.valor_final || 0), 0),
    }
  })
}
