import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3, CheckSquare } from 'lucide-react'
import type { ReportType, ReportMetrics, ReportCharts } from '@/types/reports'
import { cn } from '@/lib/utils'

export interface MetricsSelectorProps {
  tipo: ReportType
  metrics: ReportMetrics
  charts: ReportCharts
  onMetricsChange: (metrics: ReportMetrics) => void
  onChartsChange: (charts: ReportCharts) => void
  className?: string
}

interface MetricOption {
  key: keyof ReportMetrics
  label: string
  description: string
}

interface ChartOption {
  key: keyof ReportCharts
  label: string
  description: string
}

const vendasMetrics: MetricOption[] = [
  {
    key: 'incluirTotalVendas',
    label: 'Total de Vendas',
    description: 'Quantidade total de vendas realizadas',
  },
  {
    key: 'incluirFaturamento',
    label: 'Faturamento Total',
    description: 'Valor total faturado no período',
  },
  {
    key: 'incluirTicketMedio',
    label: 'Ticket Médio',
    description: 'Valor médio por venda',
  },
  {
    key: 'incluirImpostos',
    label: 'Impostos',
    description: 'Total de IPI, ST e ICMS',
  },
  {
    key: 'incluirMargemLucro',
    label: 'Margem de Lucro',
    description: 'Percentual de lucro sobre as vendas',
  },
  {
    key: 'incluirCustos',
    label: 'Custos',
    description: 'Custo total dos produtos vendidos',
  },
]

const produtosMetrics: MetricOption[] = [
  {
    key: 'incluirProdutosMaisVendidos',
    label: 'Produtos Mais Vendidos',
    description: 'Top produtos por quantidade vendida',
  },
  {
    key: 'incluirProdutosMenosVendidos',
    label: 'Produtos Menos Vendidos',
    description: 'Produtos com baixa rotatividade',
  },
  {
    key: 'incluirRotatividade',
    label: 'Rotatividade de Estoque',
    description: 'Análise de giro de estoque',
  },
  {
    key: 'incluirEstoqueBaixo',
    label: 'Estoque Baixo',
    description: 'Produtos abaixo do estoque mínimo',
  },
]

const clientesMetrics: MetricOption[] = [
  {
    key: 'incluirNovosClientes',
    label: 'Novos Clientes',
    description: 'Clientes cadastrados no período',
  },
  {
    key: 'incluirClientesAtivos',
    label: 'Clientes Ativos',
    description: 'Clientes que compraram no período',
  },
  {
    key: 'incluirTopClientes',
    label: 'Top Clientes',
    description: 'Maiores compradores do período',
  },
  {
    key: 'incluirAnaliseRFM',
    label: 'Análise RFM',
    description: 'Recência, Frequência e Monetário',
  },
]

const financeiroMetrics: MetricOption[] = [
  {
    key: 'incluirReceitas',
    label: 'Receitas',
    description: 'Total de receitas do período',
  },
  {
    key: 'incluirDespesas',
    label: 'Despesas',
    description: 'Total de despesas do período',
  },
  {
    key: 'incluirLucro',
    label: 'Lucro',
    description: 'Lucro bruto e líquido',
  },
  {
    key: 'incluirDRE',
    label: 'DRE',
    description: 'Demonstrativo de Resultados do Exercício',
  },
]

const commonCharts: ChartOption[] = [
  {
    key: 'incluirGraficoTemporal',
    label: 'Gráfico Temporal',
    description: 'Evolução ao longo do tempo',
  },
  {
    key: 'incluirGraficoCategoria',
    label: 'Gráfico por Categoria',
    description: 'Distribuição por categorias',
  },
  {
    key: 'incluirGraficoComparativo',
    label: 'Gráfico Comparativo',
    description: 'Comparação entre períodos',
  },
]

const vendasCharts: ChartOption[] = [
  ...commonCharts,
  {
    key: 'incluirGraficoVendedor',
    label: 'Gráfico por Vendedor',
    description: 'Vendas por vendedor',
  },
  {
    key: 'incluirGraficoProduto',
    label: 'Gráfico por Produto',
    description: 'Top produtos vendidos',
  },
]

const getMetricsForType = (tipo: ReportType): MetricOption[] => {
  switch (tipo) {
    case 'vendas':
      return vendasMetrics
    case 'produtos':
      return produtosMetrics
    case 'clientes':
      return clientesMetrics
    case 'financeiro':
      return financeiroMetrics
    default:
      return []
  }
}

const getChartsForType = (tipo: ReportType): ChartOption[] => {
  switch (tipo) {
    case 'vendas':
      return vendasCharts
    default:
      return commonCharts
  }
}

export const MetricsSelector: React.FC<MetricsSelectorProps> = ({
  tipo,
  metrics,
  charts,
  onMetricsChange,
  onChartsChange,
  className,
}) => {
  const availableMetrics = getMetricsForType(tipo)
  const availableCharts = getChartsForType(tipo)

  const handleMetricToggle = (key: keyof ReportMetrics) => {
    onMetricsChange({
      ...metrics,
      [key]: !metrics[key],
    })
  }

  const handleChartToggle = (key: keyof ReportCharts) => {
    onChartsChange({
      ...charts,
      [key]: !charts[key],
    })
  }

  const handleSelectAllMetrics = () => {
    const allSelected = availableMetrics.reduce(
      (acc, metric) => ({
        ...acc,
        [metric.key]: true,
      }),
      {}
    )
    onMetricsChange(allSelected)
  }

  const handleClearAllMetrics = () => {
    onMetricsChange({})
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Métricas e Visualizações</CardTitle>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSelectAllMetrics}
              className="text-xs text-primary hover:underline"
            >
              Marcar todas
            </button>
            <span className="text-xs text-muted-foreground">|</span>
            <button
              onClick={handleClearAllMetrics}
              className="text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              Limpar
            </button>
          </div>
        </div>
        <CardDescription>
          Selecione as métricas e gráficos para incluir
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Metrics */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Métricas</h4>
          <div className="space-y-2">
            {availableMetrics.map((metric) => (
              <label
                key={metric.key}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                  metrics[metric.key]
                    ? 'bg-primary/5 border-primary/20'
                    : 'hover:bg-muted/50'
                )}
              >
                <input
                  type="checkbox"
                  checked={!!metrics[metric.key]}
                  onChange={() => handleMetricToggle(metric.key)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer"
                />
                <div className="flex-1 space-y-0.5">
                  <div className="text-sm font-medium leading-none">
                    {metric.label}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {metric.description}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Charts */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-semibold">Gráficos</h4>
          </div>
          <div className="space-y-2">
            {availableCharts.map((chart) => (
              <label
                key={chart.key}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                  charts[chart.key]
                    ? 'bg-primary/5 border-primary/20'
                    : 'hover:bg-muted/50'
                )}
              >
                <input
                  type="checkbox"
                  checked={!!charts[chart.key]}
                  onChange={() => handleChartToggle(chart.key)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer"
                />
                <div className="flex-1 space-y-0.5">
                  <div className="text-sm font-medium leading-none">
                    {chart.label}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {chart.description}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default MetricsSelector
