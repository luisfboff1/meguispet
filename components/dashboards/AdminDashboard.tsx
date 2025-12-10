import React, { useCallback, useEffect, useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  Eye,
  Package2,
  Settings,
  UserCheck,
} from 'lucide-react'
import { dashboardService, produtosService, clientesService, movimentacoesService, vendasService } from '@/services/api'
import TopProductsTable from '@/components/tables/TopProductsTable'
import { usePermissions } from '@/hooks/usePermissions'
import { WelcomeCard } from './shared/WelcomeCard'
import type {
  DashboardTopProduct,
  DashboardVendasDia,
  VendaForm as VendaFormValues,
  ProdutoForm as ProdutoFormValues,
  ClienteForm as ClienteFormValues,
  MovimentacaoForm as MovimentacaoFormValues
} from '@/types'
import { useModal } from '@/hooks/useModal'
import { AnimatedCard } from '@/components/ui/animated-card'

// Lazy load do gráfico
const DashboardChart = dynamic(() => import('@/components/charts/DashboardChart'), {
  ssr: false,
  loading: () => <div className="h-80 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-meguispet-primary"></div></div>
})

// Cache duration: 5 minutes
const CACHE_DURATION = 5 * 60 * 1000

const metricIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  ShoppingCart,
  DollarSign,
  Users,
  Package
}

interface MetricCard {
  title: string
  value: string | number
  change: string
  changeType: 'positive' | 'negative'
  icon: React.ComponentType<{ className?: string }>
}

/**
 * AdminDashboard - Dashboard completo para administradores
 *
 * Mostra:
 * - Todas as métricas do sistema
 * - Acesso a todos os módulos
 * - Gráficos e relatórios completos
 * - Produtos mais vendidos
 * - Ações administrativas
 */
export function AdminDashboard() {
  const router = useRouter()
  const { userName } = usePermissions()
  const [metrics, setMetrics] = useState<MetricCard[]>([])
  const [topProducts, setTopProducts] = useState<DashboardTopProduct[]>([])
  const [vendasPeriodo, setVendasPeriodo] = useState<DashboardVendasDia[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<7 | 14 | 30>(7)
  const [loading, setLoading] = useState(true)
  const [chartLoading, setChartLoading] = useState(false)
  const { open, close, setData } = useModal()

  // Cache timestamps
  const lastFetchRef = useRef<number>(0)
  const isFetchingRef = useRef<boolean>(false)

  // Load chart data for selected period
  const loadChartData = useCallback(async (days: 7 | 14 | 30) => {
    try {
      setChartLoading(true)
      const vendasResponse = await dashboardService.getVendasPeriodo(days)
      if (vendasResponse.success && vendasResponse.data) {
        setVendasPeriodo(vendasResponse.data)
      }
    } catch (error) {
      setVendasPeriodo([])
    } finally {
      setChartLoading(false)
    }
  }, [])

  const handlePeriodChange = useCallback((days: 7 | 14 | 30) => {
    setSelectedPeriod(days)
    loadChartData(days)
  }, [loadChartData])

  const loadDashboardData = useCallback(async (force = false) => {
    const now = Date.now()

    if (!force && now - lastFetchRef.current < CACHE_DURATION) {
      return
    }

    if (isFetchingRef.current) {
      return
    }

    try {
      isFetchingRef.current = true
      setLoading(true)

      // Parallel loading
      const [metricsResponse, productsResponse, vendasResponse] = await Promise.all([
        dashboardService.getMetrics(),
        dashboardService.getTopProducts(),
        dashboardService.getVendasPeriodo(selectedPeriod)
      ])

      if (metricsResponse.success && metricsResponse.data) {
        const mappedMetrics: MetricCard[] = metricsResponse.data.map((metric) => ({
          ...metric,
          icon: metricIconMap[metric.icon as keyof typeof metricIconMap] ?? Package
        }))
        setMetrics(mappedMetrics)
      }

      if (productsResponse.success && productsResponse.data) {
        setTopProducts(productsResponse.data)
      }

      if (vendasResponse.success && vendasResponse.data) {
        setVendasPeriodo(vendasResponse.data)
      }

      lastFetchRef.current = now
    } catch (error) {
      setMetrics([])
      setTopProducts([])
      setVendasPeriodo([])
    } finally {
      setLoading(false)
      isFetchingRef.current = false
    }
  }, [selectedPeriod])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  const updateModalLoading = useCallback(
    (value: boolean) => {
      setData((current: unknown) => {
        if (!current || typeof current !== 'object') {
          return current
        }
        const payload = current as Record<string, unknown>
        return { ...payload, loading: value }
      })
    },
    [setData]
  )

  const showVendaModal = useCallback(() => {
    open('venda', {
      onSubmit: async (values: VendaFormValues) => {
        try {
          updateModalLoading(true)
          const response = await vendasService.create(values)
          if (response.success) {
            await loadDashboardData(true)
            close()
            window.alert(response.message || '✅ Venda realizada com sucesso!')
          } else {
            window.alert('❌ Erro: ' + (response.message || response.error))
          }
        } catch (error) {
          window.alert('❌ Erro ao salvar venda')
        } finally {
          updateModalLoading(false)
        }
      }
    })
  }, [close, loadDashboardData, open, updateModalLoading])

  const showProdutoModal = useCallback(() => {
    open('produto', {
      onSubmit: async (values: ProdutoFormValues) => {
        try {
          updateModalLoading(true)
          const response = await produtosService.create(values)
          if (response.success) {
            await loadDashboardData(true)
            close()
          } else {
            window.alert('Erro: ' + (response.message || response.error))
          }
        } catch (error) {
        } finally {
          updateModalLoading(false)
        }
      }
    })
  }, [close, loadDashboardData, open, updateModalLoading])

  const showClienteModal = useCallback(() => {
    open('cliente', {
      onSubmit: async (values: ClienteFormValues) => {
        try {
          updateModalLoading(true)
          const response = await clientesService.create(values)
          if (response.success) {
            await loadDashboardData(true)
            close()
            window.alert('✅ Cliente cadastrado com sucesso!')
          } else {
            window.alert('❌ Erro: ' + (response.message || response.error))
          }
        } catch (error) {
          window.alert('❌ Erro ao salvar cliente')
        } finally {
          updateModalLoading(false)
        }
      }
    })
  }, [close, loadDashboardData, open, updateModalLoading])

  const showMovimentacaoModal = useCallback(() => {
    open('movimentacao', {
      onSubmit: async (values: MovimentacaoFormValues) => {
        try {
          updateModalLoading(true)
          const response = await movimentacoesService.create(values)
          if (response.success) {
            await loadDashboardData(true)
            close()
            window.alert('✅ Movimentação cadastrada!')
          } else {
            window.alert('❌ Erro: ' + (response.message || response.error))
          }
        } catch (error) {
          window.alert('❌ Erro ao salvar movimentação')
        } finally {
          updateModalLoading(false)
        }
      }
    })
  }, [close, loadDashboardData, open, updateModalLoading])

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <WelcomeCard
        name={userName || 'Administrador'}
        role="Administrador"
        message="Bem-vindo ao painel administrativo completo"
      />

      {/* Quick Actions */}
      <AnimatedCard>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <Button
              className="bg-meguispet-primary hover:bg-meguispet-primary/90 h-20 flex-col"
              onClick={showVendaModal}
            >
              <ShoppingCart className="h-6 w-6 mb-2" />
              <span className="text-sm">Nova Venda</span>
            </Button>
            <Button
              variant="outline"
              onClick={showProdutoModal}
              className="h-20 flex-col"
            >
              <Package className="h-6 w-6 mb-2" />
              <span className="text-sm">Novo Produto</span>
            </Button>
            <Button
              variant="outline"
              onClick={showClienteModal}
              className="h-20 flex-col"
            >
              <Users className="h-6 w-6 mb-2" />
              <span className="text-sm">Novo Cliente</span>
            </Button>
            <Button
              variant="outline"
              onClick={showMovimentacaoModal}
              className="h-20 flex-col"
            >
              <Package2 className="h-6 w-6 mb-2" />
              <span className="text-sm">Movimentação</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/vendedores')}
              className="h-20 flex-col"
            >
              <UserCheck className="h-6 w-6 mb-2" />
              <span className="text-sm">Vendedores</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/usuarios')}
              className="h-20 flex-col"
            >
              <Settings className="h-6 w-6 mb-2" />
              <span className="text-sm">Usuários</span>
            </Button>
          </div>
        </CardContent>
      </AnimatedCard>

      {/* Chart */}
      <DashboardChart
        data={vendasPeriodo}
        loading={loading || chartLoading}
        selectedPeriod={selectedPeriod}
        onPeriodChange={handlePeriodChange}
      />

      {/* Top Products */}
      <TopProductsTable data={topProducts} loading={loading} />

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardHeader className="space-y-0 pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
              </CardContent>
            </Card>
          ))
        ) : (
          metrics.map((metric, index) => {
            const Icon = metric.icon
            return (
              <AnimatedCard key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 truncate pr-2">
                    {metric.title}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-meguispet-primary flex-shrink-0" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900 break-words">
                    {metric.value}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {metric.change} vs. ontem
                  </p>
                </CardContent>
              </AnimatedCard>
            )
          })
        )}
      </div>
    </div>
  )
}
