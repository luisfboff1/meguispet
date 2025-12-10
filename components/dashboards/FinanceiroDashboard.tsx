import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Eye,
  CreditCard,
  AlertCircle,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { usePermissions } from '@/hooks/usePermissions'
import { vendasService, dashboardService } from '@/services/api'
import type { Venda } from '@/types'
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
 * FinanceiroDashboard - Dashboard personalizado para financeiro
 *
 * Mostra:
 * - Todas as vendas (não filtradas por vendedor)
 * - Métricas financeiras gerais
 * - Receitas e despesas
 * - Transações pendentes
 *
 * Não mostra:
 * - Gestão de produtos/estoque
 * - Configurações do sistema
 */
export function FinanceiroDashboard() {
  const router = useRouter()
  const { userName } = usePermissions()
  const [vendas, setVendas] = useState<Venda[]>([])
  const [vendasPeriodo, setVendasPeriodo] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadFinanceiroData()
  }, [])

  const loadFinanceiroData = async () => {
    try {
      setLoading(true)

      // Buscar dados em paralelo
      const [vendasResponse, periodoResponse] = await Promise.all([
        vendasService.getAll(1, 100), // Pega até 100 vendas recentes
        dashboardService.getVendasPeriodo(30), // Dados dos últimos 30 dias
      ])

      if (vendasResponse.success && vendasResponse.data) {
        // Se for resposta paginada
        if (typeof vendasResponse.data === 'object' && 'items' in vendasResponse.data) {
          const items = (vendasResponse.data as any).items
          setVendas(Array.isArray(items) ? items : [])
        } else if (Array.isArray(vendasResponse.data)) {
          setVendas(vendasResponse.data)
        } else {
          setVendas([])
        }
      }

      if (periodoResponse.success && periodoResponse.data) {
        setVendasPeriodo(periodoResponse.data)
      }
    } catch (error) {
      console.error('Erro ao carregar dados financeiros:', error)
    } finally {
      setLoading(false)
    }
  }

  // ===== CALCULAR MÉTRICAS FINANCEIRAS =====

  // Vendas do mês atual
  const vendasDoMes = vendas.filter((v) => {
    const dataVenda = new Date(v.data_venda)
    const hoje = new Date()
    return (
      dataVenda.getMonth() === hoje.getMonth() &&
      dataVenda.getFullYear() === hoje.getFullYear()
    )
  })

  // Receita total do mês
  const receitaDoMes = vendasDoMes.reduce((sum, v) => sum + (v.valor_final || 0), 0)

  // Receita média por venda
  const receitaMedia =
    vendasDoMes.length > 0 ? receitaDoMes / vendasDoMes.length : 0

  // Vendas pendentes (status não finalizado)
  const vendasPendentes = vendas.filter(
    (v) => v.status && v.status.toLowerCase() !== 'concluida' && v.status.toLowerCase() !== 'finalizada'
  )

  // Calcular trend (comparar com mês anterior)
  const mesAnterior = new Date()
  mesAnterior.setMonth(mesAnterior.getMonth() - 1)

  const vendasMesAnterior = vendas.filter((v) => {
    const dataVenda = new Date(v.data_venda)
    return (
      dataVenda.getMonth() === mesAnterior.getMonth() &&
      dataVenda.getFullYear() === mesAnterior.getFullYear()
    )
  })

  const receitaMesAnterior = vendasMesAnterior.reduce(
    (sum, v) => sum + (v.valor_final || 0),
    0
  )

  const trendReceita =
    receitaMesAnterior > 0
      ? `${(((receitaDoMes - receitaMesAnterior) / receitaMesAnterior) * 100).toFixed(1)}%`
      : receitaDoMes > 0
      ? '+100%'
      : '0%'

  const isReceitaPositiva = parseFloat(trendReceita) >= 0

  // ===== RENDERIZAÇÃO =====

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-meguispet-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <WelcomeCard
        name={userName || 'Financeiro'}
        role="Financeiro"
        message="Bem-vindo ao painel financeiro"
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
              onClick={() => router.push('/financeiro')}
            >
              <DollarSign className="h-5 w-5 mb-1" />
              <span className="text-sm">Financeiro</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/vendas')}
              className="h-16 flex-col"
            >
              <ShoppingCart className="h-5 w-5 mb-1" />
              <span className="text-sm">Ver Vendas</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/relatorios')}
              className="h-16 flex-col"
            >
              <Eye className="h-5 w-5 mb-1" />
              <span className="text-sm">Relatórios</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Métricas Financeiras */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Receita do Mês"
          value={formatCurrency(receitaDoMes)}
          icon={DollarSign}
          color="green"
          trend={{
            value: trendReceita,
            isPositive: isReceitaPositiva,
          }}
          subtitle="vs. mês anterior"
        />
        <MetricCard
          title="Vendas do Mês"
          value={vendasDoMes.length}
          icon={ShoppingCart}
          color="blue"
          subtitle={`Total de vendas`}
        />
        <MetricCard
          title="Ticket Médio"
          value={formatCurrency(receitaMedia)}
          icon={TrendingUp}
          color="orange"
          subtitle="Por venda"
        />
        <MetricCard
          title="Vendas Pendentes"
          value={vendasPendentes.length}
          icon={AlertCircle}
          color="red"
          subtitle="Requer atenção"
        />
      </div>

      {/* Gráfico de Receitas */}
      {vendasPeriodo.length > 0 ? (
        <DashboardChart
          data={vendasPeriodo}
          loading={false}
          selectedPeriod={30}
          onPeriodChange={() => {}}
        />
      ) : (
        <EmptyState
          icon={TrendingUp}
          title="Nenhum dado financeiro"
          description="Não há dados de vendas para exibir no gráfico"
        />
      )}

      {/* Vendas Recentes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Vendas Recentes</CardTitle>
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
              {vendas.slice(0, 8).map((venda) => (
                <div
                  key={venda.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition"
                >
                  <div>
                    <p className="font-medium">Venda #{venda.id}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(venda.data_venda).toLocaleDateString('pt-BR')}
                    </p>
                    {venda.vendedor_id && (
                      <p className="text-xs text-gray-500">
                        Vendedor ID: {venda.vendedor_id}
                      </p>
                    )}
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
              Nenhuma venda registrada
            </p>
          )}
        </CardContent>
      </Card>

      {/* Vendas Pendentes (se houver) */}
      {vendasPendentes.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Vendas Pendentes - Requer Atenção
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {vendasPendentes.slice(0, 5).map((venda) => (
                <div
                  key={venda.id}
                  className="flex items-center justify-between p-3 bg-white border border-red-200 rounded-lg"
                >
                  <div>
                    <p className="font-medium">Venda #{venda.id}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(venda.data_venda).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(venda.valor_final)}</p>
                    <span className="inline-block px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                      {venda.status || 'Pendente'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
