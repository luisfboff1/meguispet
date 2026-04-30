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
  UserCheck,
  Award,
  Target,
} from 'lucide-react'
import { usePermissions } from '@/hooks/usePermissions'
import { vendasService, vendedoresService, dashboardService } from '@/services/api'
import type { Venda, Vendedor } from '@/types'
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

interface VendedorPerformance {
  id: number
  nome: string
  totalVendas: number
  totalFaturamento: number
  comissao: number
  ranking: number
}

/**
 * GerenteDashboard - Dashboard personalizado para gerentes
 *
 * Mostra:
 * - Visão consolidada da equipe
 * - Performance de vendedores
 * - Métricas gerais do negócio
 * - Ranking de vendedores
 *
 * Não mostra:
 * - Configurações do sistema
 * - Gestão de usuários
 */
export function GerenteDashboard() {
  const router = useRouter()
  const { userName } = usePermissions()
  const [vendas, setVendas] = useState<Venda[]>([])
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [vendasPeriodo, setVendasPeriodo] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadGerenteData()
  }, [])

  const loadGerenteData = async () => {
    try {
      setLoading(true)

      // Buscar dados em paralelo
      const [vendasResponse, vendedoresResponse, periodoResponse] = await Promise.all([
        vendasService.getAll(1, 200), // Buscar mais vendas para análise
        vendedoresService.getAll(1, 100),
        dashboardService.getVendasPeriodo(30),
      ])

      if (vendasResponse.success && vendasResponse.data) {
        if (typeof vendasResponse.data === 'object' && 'items' in vendasResponse.data) {
          const items = (vendasResponse.data as any).items
          setVendas(Array.isArray(items) ? items : [])
        } else if (Array.isArray(vendasResponse.data)) {
          setVendas(vendasResponse.data)
        } else {
          setVendas([])
        }
      }

      if (vendedoresResponse.success && vendedoresResponse.data) {
        if (typeof vendedoresResponse.data === 'object' && 'items' in vendedoresResponse.data) {
          const items = (vendedoresResponse.data as any).items
          setVendedores(Array.isArray(items) ? items : [])
        } else if (Array.isArray(vendedoresResponse.data)) {
          setVendedores(vendedoresResponse.data)
        } else {
          setVendedores([])
        }
      }

      if (periodoResponse.success && periodoResponse.data) {
        setVendasPeriodo(periodoResponse.data)
      }
    } catch (error) {
      console.error('Erro ao carregar dados de gerente:', error)
    } finally {
      setLoading(false)
    }
  }

  // ===== CALCULAR MÉTRICAS DA EQUIPE =====

  // Vendas do mês
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

  // Vendedores ativos
  const vendedoresAtivos = vendedores.filter((v) => v.ativo).length

  // Ticket médio
  const ticketMedio = vendasDoMes.length > 0 ? receitaDoMes / vendasDoMes.length : 0

  // ===== CALCULAR PERFORMANCE DOS VENDEDORES =====

  const vendedoresPerformance: VendedorPerformance[] = vendedores
    .map((vendedor) => {
      const vendasVendedor = vendasDoMes.filter(
        (v) => v.vendedor_id === vendedor.id
      )
      const totalVendas = vendasVendedor.length
      const totalFaturamento = vendasVendedor.reduce(
        (sum, v) => sum + (v.valor_final || 0),
        0
      )
      const comissao = (totalFaturamento * (vendedor.comissao || 0)) / 100

      return {
        id: vendedor.id,
        nome: vendedor.nome,
        totalVendas,
        totalFaturamento,
        comissao,
        ranking: 0, // Será calculado depois
      }
    })
    .sort((a, b) => b.totalFaturamento - a.totalFaturamento)
    .map((v, index) => ({ ...v, ranking: index + 1 }))

  // Top 3 vendedores
  const top3Vendedores = vendedoresPerformance.slice(0, 3)

  // ===== TREND (comparar com mês anterior) =====
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
        name={userName || 'Gerente'}
        role="Gerente"
        message="Bem-vindo ao painel de gestão da equipe"
      />

      {/* Ações Rápidas */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              className="bg-meguispet-primary hover:bg-meguispet-primary/90 h-16 flex-col"
              onClick={() => router.push('/vendas')}
            >
              <ShoppingCart className="h-5 w-5 mb-1" />
              <span className="text-sm">Todas Vendas</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/vendedores')}
              className="h-16 flex-col"
            >
              <UserCheck className="h-5 w-5 mb-1" />
              <span className="text-sm">Vendedores</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/clientes')}
              className="h-16 flex-col"
            >
              <Users className="h-5 w-5 mb-1" />
              <span className="text-sm">Clientes</span>
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

      {/* Métricas da Equipe */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Receita do Mês"
          value={formatCurrency(receitaDoMes)}
          icon={DollarSign}
          color="success"
          trend={{
            value: trendReceita,
            isPositive: parseFloat(trendReceita) >= 0,
          }}
          subtitle="vs. mês anterior"
        />
        <MetricCard
          title="Vendas do Mês"
          value={vendasDoMes.length}
          icon={ShoppingCart}
          color="info"
          subtitle="Total da equipe"
        />
        <MetricCard
          title="Vendedores Ativos"
          value={vendedoresAtivos}
          icon={UserCheck}
          color="accent"
          subtitle={`de ${vendedores.length} total`}
        />
        <MetricCard
          title="Ticket Médio"
          value={formatCurrency(ticketMedio)}
          icon={Target}
          color="warning"
          subtitle="Por venda"
        />
      </div>

      {/* Gráfico de Performance */}
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
          title="Sem dados para exibir"
          description="Não há dados de vendas para o período selecionado"
        />
      )}

      {/* Ranking de Vendedores */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-500" />
              Ranking de Vendedores - Mês Atual
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/vendedores')}
            >
              <Eye className="h-4 w-4 mr-2" />
              Ver Todos
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {vendedoresPerformance.length > 0 ? (
            <div className="space-y-4">
              {vendedoresPerformance.map((vendedor) => (
                <div
                  key={vendedor.id}
                  className={`flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition ${
                    vendedor.ranking <= 3
                      ? 'border-warning/30 bg-warning-muted'
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${
                        vendedor.ranking === 1
                          ? 'bg-warning text-white'
                          : vendedor.ranking === 2
                          ? 'bg-muted text-foreground'
                          : vendedor.ranking === 3
                          ? 'bg-warning text-white'
                          : 'bg-muted text-foreground'
                      }`}
                    >
                      {vendedor.ranking}º
                    </div>
                    <div>
                      <p className="font-medium">{vendedor.nome}</p>
                      <p className="text-sm text-muted-foreground">
                        {vendedor.totalVendas} vendas
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-success">
                      {formatCurrency(vendedor.totalFaturamento)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Comissão: {formatCurrency(vendedor.comissao)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma venda registrada neste mês
            </p>
          )}
        </CardContent>
      </Card>

      {/* Top 3 Destaques */}
      {top3Vendedores.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {top3Vendedores.map((vendedor, index) => (
            <Card
              key={vendedor.id}
              className={
                index === 0
                  ? 'border-warning bg-gradient-to-br from-warning-muted to-warning-muted'
                  : index === 1
                  ? 'border-border bg-gradient-to-br from-muted to-muted'
                  : 'border-warning bg-gradient-to-br from-warning-muted to-warning-muted'
              }
            >
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                  {index === 0
                    ? '1º Lugar'
                    : index === 1
                    ? '2º Lugar'
                    : '3º Lugar'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-bold text-lg mb-2">{vendedor.nome}</p>
                <div className="space-y-1 text-sm">
                  <p className="text-foreground">
                    <span className="font-medium">Vendas:</span> {vendedor.totalVendas}
                  </p>
                  <p className="text-success font-medium">
                    {formatCurrency(vendedor.totalFaturamento)}
                  </p>
                  <p className="text-muted-foreground">
                    Comissão: {formatCurrency(vendedor.comissao)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
