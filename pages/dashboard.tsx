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
  const [metrics, setMetrics] = useState<MetricCard[]>([])
  const [topProducts, setTopProducts] = useState<DashboardTopProduct[]>([])
  const [vendas7Dias, setVendas7Dias] = useState<DashboardVendasDia[]>([])
  const [loading, setLoading] = useState(true)
  const { open, close, setData } = useModal()
  
  // Cache timestamps to prevent unnecessary refetches
  const lastFetchRef = useRef<number>(0)
  const isFetchingRef = useRef<boolean>(false)

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
        dashboardService.getVendas7Dias()
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
      
      // 📊 PROCESS 7-DAY SALES
      if (vendasResponse.success && vendasResponse.data) {
        setVendas7Dias(vendasResponse.data)
      }
      
      // Update cache timestamp
      lastFetchRef.current = now
    } catch (error) {
      // Fallback para dados vazios se API falhar
      setMetrics([])
      setTopProducts([])
    } finally {
      setLoading(false)
      isFetchingRef.current = false
    }
  }, [])

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Visão geral do seu negócio</p>
        </div>
      </div>

      {/* Quick Actions - Botões de Acesso Rápido */}
      <AnimatedCard>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Button
              className="bg-meguispet-primary hover:bg-meguispet-primary/90 h-20 flex-col"
              onClick={handleNovaVenda}
            >
              <ShoppingCart className="h-6 w-6 mb-2" />
              <span className="text-sm">Nova Venda</span>
            </Button>
            <Button
              variant="outline"
              onClick={handleNovoProduto}
              className="h-20 flex-col"
            >
              <Package className="h-6 w-6 mb-2" />
              <span className="text-sm">Cadastrar Produto</span>
            </Button>
            <Button
              variant="outline"
              onClick={handleNovoCliente}
              className="h-20 flex-col"
            >
              <Users className="h-6 w-6 mb-2" />
              <span className="text-sm">Novo Cliente</span>
            </Button>
            <Button
              variant="outline"
              onClick={handleNovaMovimentacao}
              className="h-20 flex-col"
            >
              <Package2 className="h-6 w-6 mb-2" />
              <span className="text-sm">Nova Movimentação</span>
            </Button>
            <Button
              variant="outline"
              onClick={handleVerRelatorios}
              className="h-20 flex-col"
            >
              <Eye className="h-6 w-6 mb-2" />
              <span className="text-sm">Ver Relatórios</span>
            </Button>
          </div>
        </CardContent>
      </AnimatedCard>

      {/* Customizable Chart - Full Width */}
      <DashboardChart data={vendas7Dias} loading={loading} />

      {/* Top Products Table - Full Width */}
      <TopProductsTable data={topProducts} loading={loading} />

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          // Loading skeleton
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
        ) : metrics.length > 0 ? (
          metrics.map((metric, index) => {
            const Icon = metric.icon
            return (
              <AnimatedCard key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    {metric.title}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-meguispet-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {metric.value}
                  </div>
                  <div className="flex items-center text-xs">
                    {metric.changeType === 'positive' ? (
                      <TrendingUp className="mr-1 h-3 w-3 text-green-600" />
                    ) : (
                      <TrendingDown className="mr-1 h-3 w-3 text-red-600" />
                    )}
                    <span className={
                      metric.changeType === 'positive'
                        ? 'text-green-600'
                        : 'text-red-600'
                    }>
                      {metric.change}
                    </span>
                    <span className="text-gray-500 ml-1">vs. ontem</span>
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
                <Package className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum dado disponível</h3>
                <p className="text-gray-600 text-center">
                  Os dados do dashboard serão carregados quando houver vendas e produtos cadastrados
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}