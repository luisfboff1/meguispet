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
  TrendingUp,
  TrendingDown,
  Eye,
  Package2
} from 'lucide-react'
import { dashboardService, produtosService, clientesService, movimentacoesService, vendasService } from '@/services/api'
import TopProductsTable from '@/components/tables/TopProductsTable'
import { usePermissions } from '@/hooks/usePermissions'

// 🆕 DASHBOARDS PERSONALIZADOS POR ROLE
import { VendedorDashboard } from '@/components/dashboards/VendedorDashboard'
import { FinanceiroDashboard } from '@/components/dashboards/FinanceiroDashboard'
import { GerenteDashboard } from '@/components/dashboards/GerenteDashboard'
import { AdminDashboard } from '@/components/dashboards/AdminDashboard'

// Lazy load do gráfico para otimização (economiza ~100KB)
const DashboardChart = dynamic(() => import('@/components/charts/DashboardChart'), {
  ssr: false,
  loading: () => <div className="h-80 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-meguispet-primary"></div></div>
})
import { useModal } from '@/hooks/useModal'
import { AnimatedCard } from '@/components/ui/animated-card'
import type {
  DashboardTopProduct,
  DashboardVendasDia,
  VendaForm as VendaFormValues,
  ProdutoForm as ProdutoFormValues,
  ClienteForm as ClienteFormValues,
  MovimentacaoForm as MovimentacaoFormValues
} from '@/types'

// 📊 PÁGINA DASHBOARD - DADOS REAIS DO BANCO
// Esta página não precisa configurar layout - é automático!
// O layout é aplicado pelo _app.tsx globalmente

// 🚀 FEATURE FLAG - DASHBOARDS PERSONALIZADOS
// Para ativar os dashboards personalizados por role, defina esta env var:
// NEXT_PUBLIC_CUSTOM_DASHBOARDS=true
//
// Ativo por padrão. Para desabilitar, setar NEXT_PUBLIC_CUSTOM_DASHBOARDS=false
const ENABLE_CUSTOM_DASHBOARDS = process.env.NEXT_PUBLIC_CUSTOM_DASHBOARDS !== 'false'

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

export default function DashboardPage() {
  const router = useRouter()
  const { userRole } = usePermissions()
  const [metrics, setMetrics] = useState<MetricCard[]>([])
  const [topProducts, setTopProducts] = useState<DashboardTopProduct[]>([])
  const [vendasPeriodo, setVendasPeriodo] = useState<DashboardVendasDia[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<7 | 14 | 30>(7)
  const [loading, setLoading] = useState(true)
  const [chartLoading, setChartLoading] = useState(false)
  const { open, close, setData } = useModal()

  // 🚀 ROUTING DE DASHBOARDS PERSONALIZADOS POR ROLE
  // Se feature flag estiver ativa, renderizar dashboard específico por role
  if (ENABLE_CUSTOM_DASHBOARDS) {
    switch (userRole) {
      case 'vendedor':
        return <VendedorDashboard />
      case 'financeiro':
        return <FinanceiroDashboard />
      case 'gerente':
        return <GerenteDashboard />
      case 'admin':
        return <AdminDashboard />
      default:
        // Fallback: usar dashboard genérico para roles não mapeados
        break
    }
  }

  // 📊 DASHBOARD GENÉRICO (FALLBACK)
  // Usado quando feature flag está desabilitada ou role não tem dashboard específico
  
  // Cache timestamps to prevent unnecessary refetches
  const lastFetchRef = useRef<number>(0)
  const isFetchingRef = useRef<boolean>(false)

  // Load chart data for selected period (separate from full dashboard load)
  // This allows changing the chart period without reloading metrics and top products
  const loadChartData = useCallback(async (days: 7 | 14 | 30) => {
    try {
      setChartLoading(true)
      const vendasResponse = await dashboardService.getVendasPeriodo(days)
      if (vendasResponse.success && vendasResponse.data) {
        setVendasPeriodo(vendasResponse.data)
      }
    } catch (error) {
      // Fallback para dados vazios se API falhar
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
    
    // If data was fetched recently and not forcing, skip
    if (!force && now - lastFetchRef.current < CACHE_DURATION) {
      return
    }
    
    // Prevent multiple simultaneous fetches
    if (isFetchingRef.current) {
      return
    }

    try {
      isFetchingRef.current = true
      setLoading(true)
      
      // 🚀 PARALLEL LOADING - Load all dashboard data simultaneously
      const [metricsResponse, productsResponse, vendasResponse] = await Promise.all([
        dashboardService.getMetrics(),
        dashboardService.getTopProducts(),
        dashboardService.getVendasPeriodo(selectedPeriod)
      ])
      
      // 📊 PROCESS METRICS
      if (metricsResponse.success && metricsResponse.data) {
        const mappedMetrics: MetricCard[] = metricsResponse.data.map((metric) => ({
          ...metric,
          icon: metricIconMap[metric.icon as keyof typeof metricIconMap] ?? Package
        }))
        setMetrics(mappedMetrics)
      }
      
      // 📈 PROCESS TOP PRODUCTS
      if (productsResponse.success && productsResponse.data) {
        setTopProducts(productsResponse.data)
      }
      
      // 📊 PROCESS SALES DATA
      if (vendasResponse.success && vendasResponse.data) {
        setVendasPeriodo(vendasResponse.data)
      }
      
      // Update cache timestamp
      lastFetchRef.current = now
    } catch (error) {
      // Fallback para dados vazios se API falhar
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
          // Salvar venda via API
          const response = await vendasService.create(values)
          if (response.success) {
            await loadDashboardData(true) // Force refresh after successful operation
            close()
            // Mostrar mensagem de sucesso
            window.alert(response.message || '✅ Venda realizada com sucesso! Estoque atualizado.')
          } else {
            window.alert('❌ Erro ao criar venda: ' + (response.message || response.error || 'não especificado'))
          }
        } catch (error) {
          window.alert('❌ Erro ao salvar venda. Tente novamente.')
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
          // Persist the product via API and reload dashboard if successful
          const response = await produtosService.create(values)
          if (response.success) {
            await loadDashboardData(true) // Force refresh after successful operation
            close()
          } else {
            window.alert('Erro ao criar produto: ' + (response.message || response.error || 'não especificado'))
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
          // Salvar cliente via API
          const response = await clientesService.create(values)
          if (response.success) {
            await loadDashboardData(true) // Force refresh after successful operation
            close()
            // Mostrar mensagem de sucesso
            window.alert('✅ Cliente cadastrado com sucesso!')
          } else {
            window.alert('❌ Erro ao criar cliente: ' + (response.message || response.error || 'não especificado'))
          }
        } catch (error) {
          window.alert('❌ Erro ao salvar cliente. Tente novamente.')
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
          // Salvar movimentação via API
          const response = await movimentacoesService.create(values)
          if (response.success) {
            await loadDashboardData(true) // Force refresh after successful operation
            close()
            // Mostrar mensagem de sucesso
            window.alert('✅ Movimentação cadastrada com sucesso!')
          } else {
            window.alert('❌ Erro ao criar movimentação: ' + (response.message || response.error || 'não especificado'))
          }
        } catch (error) {
          window.alert('❌ Erro ao salvar movimentação. Tente novamente.')
        } finally {
          updateModalLoading(false)
        }
      }
    })
  }, [close, loadDashboardData, open, updateModalLoading])

  // Funções para formulários
  const handleNovaVenda = showVendaModal
  const handleNovoProduto = showProdutoModal
  const handleNovoCliente = showClienteModal
  const handleNovaMovimentacao = showMovimentacaoModal

  const handleVerRelatorios = () => {
    // Redirecionar para página de relatórios usando Next.js routing
    router.push('/relatorios')
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  return (
    <div className="space-y-5">
      {/* Metrics Grid - BIG NUMBERS first */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          // Loading skeleton
          Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardContent className="pt-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 bg-gray-200 rounded-xl"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
              </CardContent>
            </Card>
          ))
        ) : metrics.length > 0 ? (
          metrics.map((metric, index) => {
            const Icon = metric.icon
            const iconColors = [
              'bg-info-muted text-info',
              'bg-success-muted text-success',
              'bg-accent text-accent-foreground',
              'bg-warning-muted text-warning',
            ]
            const colorClass = iconColors[index % iconColors.length]
            return (
              <AnimatedCard key={index}>
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`flex items-center justify-center h-10 w-10 rounded-xl flex-shrink-0 ${colorClass}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground truncate">{metric.title}</p>
                  </div>
                  <div className="text-3xl font-bold text-foreground mb-1 break-words">
                    {metric.value}
                  </div>
                  <div className="flex items-center text-xs gap-1">
                    {metric.changeType === 'positive' ? (
                      <>
                        <TrendingUp className="h-3 w-3 text-success flex-shrink-0" />
                        <span className="text-success font-medium">{metric.change}</span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="h-3 w-3 text-destructive flex-shrink-0" />
                        <span className="text-destructive font-medium">{metric.change}</span>
                      </>
                    )}
                    <span className="text-muted-foreground">vs. ontem</span>
                  </div>
                </CardContent>
              </AnimatedCard>
            )
          })
        ) : (
          // Fallback quando não há dados
          <div className="col-span-full">
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">Nenhum dado disponível</h3>
                <p className="text-muted-foreground text-center">
                  Os dados do dashboard serão carregados quando houver vendas e produtos cadastrados
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Chart - Bar by default */}
      <DashboardChart 
        data={vendasPeriodo} 
        loading={loading || chartLoading}
        selectedPeriod={selectedPeriod}
        onPeriodChange={handlePeriodChange}
      />

      {/* Quick Actions */}
      <AnimatedCard>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
            <Button
              className="bg-meguispet-primary hover:bg-meguispet-primary/90 h-16 flex-col gap-1"
              onClick={handleNovaVenda}
            >
              <ShoppingCart className="h-5 w-5" />
              <span className="text-xs">Nova Venda</span>
            </Button>
            <Button
              variant="outline"
              onClick={handleNovoProduto}
              className="h-16 flex-col gap-1"
            >
              <Package className="h-5 w-5" />
              <span className="text-xs">Cadastrar Produto</span>
            </Button>
            <Button
              variant="outline"
              onClick={handleNovoCliente}
              className="h-16 flex-col gap-1"
            >
              <Users className="h-5 w-5" />
              <span className="text-xs">Novo Cliente</span>
            </Button>
            <Button
              variant="outline"
              onClick={handleNovaMovimentacao}
              className="h-16 flex-col gap-1"
            >
              <Package2 className="h-5 w-5" />
              <span className="text-xs">Nova Movimentação</span>
            </Button>
            <Button
              variant="outline"
              onClick={handleVerRelatorios}
              className="h-16 flex-col gap-1"
            >
              <Eye className="h-5 w-5" />
              <span className="text-xs">Ver Relatórios</span>
            </Button>
          </div>
        </CardContent>
      </AnimatedCard>

      {/* Top Products Table - Full Width */}
      <TopProductsTable data={topProducts} loading={loading} />
    </div>
  )
}