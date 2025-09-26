import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  DollarSign, 
  ShoppingCart, 
  Users, 
  Package,
  TrendingUp,
  TrendingDown,
  Eye
} from 'lucide-react'
import { dashboardService } from '@/services/api'
import VendaForm from '@/components/forms/VendaForm'
import ProdutoForm from '@/components/forms/ProdutoForm'
import ClienteForm from '@/components/forms/ClienteForm'
import VendasChart from '@/components/charts/VendasChart'

// 📊 PÁGINA DASHBOARD - DADOS REAIS DO BANCO
// Esta página não precisa configurar layout - é automático!
// O layout é aplicado pelo _app.tsx globalmente

interface MetricCard {
  title: string
  value: string
  change: string
  changeType: 'positive' | 'negative'
  icon: React.ComponentType<{ className?: string }>
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<MetricCard[]>([])
  const [topProducts, setTopProducts] = useState<any[]>([])
  const [vendas7Dias, setVendas7Dias] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Estados para formulários
  const [showVendaForm, setShowVendaForm] = useState(false)
  const [showProdutoForm, setShowProdutoForm] = useState(false)
  const [showClienteForm, setShowClienteForm] = useState(false)
  const [formLoading, setFormLoading] = useState(false)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // 📊 CARREGAR MÉTRICAS REAIS
      const metricsResponse = await dashboardService.getMetrics()
      if (metricsResponse.success && metricsResponse.data) {
        setMetrics(metricsResponse.data)
      }
      
      // 📈 CARREGAR PRODUTOS MAIS VENDIDOS
      const productsResponse = await dashboardService.getTopProducts()
      if (productsResponse.success && productsResponse.data) {
        setTopProducts(productsResponse.data)
      }
      
      // 📊 CARREGAR VENDAS DOS ÚLTIMOS 7 DIAS
      const vendasResponse = await dashboardService.getVendas7Dias()
      if (vendasResponse.success && vendasResponse.data) {
        setVendas7Dias(vendasResponse.data)
      }
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error)
      // Fallback para dados vazios se API falhar
      setMetrics([])
      setTopProducts([])
    } finally {
      setLoading(false)
    }
  }

  // Funções para formulários
  const handleNovaVenda = () => {
    setShowVendaForm(true)
  }

  const handleNovoProduto = () => {
    setShowProdutoForm(true)
  }

  const handleNovoCliente = () => {
    setShowClienteForm(true)
  }

  const handleVerRelatorios = () => {
    // Redirecionar para página de relatórios
    window.location.href = '/relatorios'
  }

  const handleSalvarVenda = async (vendaData: any) => {
    try {
      setFormLoading(true)
      // Aqui você implementaria a lógica de salvar venda
      console.log('Salvando venda:', vendaData)
      setShowVendaForm(false)
      // Recarregar dados do dashboard
      await loadDashboardData()
    } catch (error) {
      console.error('Erro ao salvar venda:', error)
    } finally {
      setFormLoading(false)
    }
  }

  const handleSalvarProduto = async (produtoData: any) => {
    try {
      setFormLoading(true)
      // Aqui você implementaria a lógica de salvar produto
      console.log('Salvando produto:', produtoData)
      setShowProdutoForm(false)
      // Recarregar dados do dashboard
      await loadDashboardData()
    } catch (error) {
      console.error('Erro ao salvar produto:', error)
    } finally {
      setFormLoading(false)
    }
  }

  const handleSalvarCliente = async (clienteData: any) => {
    try {
      setFormLoading(true)
      // Aqui você implementaria a lógica de salvar cliente
      console.log('Salvando cliente:', clienteData)
      setShowClienteForm(false)
      // Recarregar dados do dashboard
      await loadDashboardData()
    } catch (error) {
      console.error('Erro ao salvar cliente:', error)
    } finally {
      setFormLoading(false)
    }
  }

  const handleCancelarForm = () => {
    setShowVendaForm(false)
    setShowProdutoForm(false)
    setShowClienteForm(false)
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
              <Card key={index} className="hover:shadow-md transition-shadow">
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
              </Card>
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

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vendas Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Vendas dos Últimos 7 Dias</CardTitle>
            <CardDescription>
              Acompanhe o desempenho das suas vendas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VendasChart data={vendas7Dias} loading={loading} />
          </CardContent>
        </Card>

        {/* Produtos Mais Vendidos */}
        <Card>
          <CardHeader>
            <CardTitle>Produtos Mais Vendidos</CardTitle>
            <CardDescription>
              Top 5 produtos mais vendidos hoje
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : topProducts.length > 0 ? (
              <div className="space-y-4">
                {topProducts.map((product, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{product.nome}</p>
                      <p className="text-sm text-gray-500">{product.vendas} vendas</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-meguispet-primary">
                        {formatCurrency(product.receita)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Package className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">Nenhum produto vendido ainda</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-4">
        <Button 
          className="bg-meguispet-primary hover:bg-meguispet-primary/90"
          onClick={handleNovaVenda}
        >
          <ShoppingCart className="mr-2 h-4 w-4" />
          Nova Venda
        </Button>
        <Button 
          variant="outline"
          onClick={handleNovoProduto}
        >
          <Package className="mr-2 h-4 w-4" />
          Cadastrar Produto
        </Button>
        <Button 
          variant="outline"
          onClick={handleNovoCliente}
        >
          <Users className="mr-2 h-4 w-4" />
          Novo Cliente
        </Button>
        <Button 
          variant="outline"
          onClick={handleVerRelatorios}
        >
          <Eye className="mr-2 h-4 w-4" />
          Ver Relatórios
        </Button>
      </div>

      {/* Formulários Modais */}
      {showVendaForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <VendaForm
            onSubmit={handleSalvarVenda}
            onCancel={handleCancelarForm}
            loading={formLoading}
          />
        </div>
      )}

      {showProdutoForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <ProdutoForm
            onSubmit={handleSalvarProduto}
            onCancel={handleCancelarForm}
            loading={formLoading}
          />
        </div>
      )}

      {showClienteForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <ClienteForm
            onSubmit={handleSalvarCliente}
            onCancel={handleCancelarForm}
            loading={formLoading}
          />
        </div>
      )}
    </div>
  )
}