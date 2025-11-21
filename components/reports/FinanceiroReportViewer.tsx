import React, { useRef, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, FileSpreadsheet, FileText } from 'lucide-react'
import {
  Bar, BarChart,
  Pie, PieChart, Cell,
  Line, LineChart,
  XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts'
import type { FinanceiroReportData, ReportConfiguration, ReportFormat } from '@/types/reports'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import html2canvas from 'html2canvas'

export interface FinanceiroReportViewerProps {
  data: FinanceiroReportData
  configuracao: ReportConfiguration
  onExport: (formato: ReportFormat, chartImages?: {
    receitasMes?: { image: string; width: number; height: number }
    receitasCategoria?: { image: string; width: number; height: number }
    despesasCategoria?: { image: string; width: number; height: number }
  }) => void
  className?: string
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export const FinanceiroReportViewer: React.FC<FinanceiroReportViewerProps> = ({
  data,
  configuracao,
  onExport,
  className,
}) => {
  const { resumo, receitasPorMes, receitasPorCategoria, despesasPorCategoria, dre } = data
  const { graficos = {} } = configuracao

  // Refs para capturar gráficos
  const graficoReceitasMesRef = useRef<HTMLDivElement>(null)
  const graficoReceitasCategoriaRef = useRef<HTMLDivElement>(null)
  const graficoDespesasCategoriaRef = useRef<HTMLDivElement>(null)

  // Estado para tipo de gráfico de categorias
  const [tipoGraficoReceitas, setTipoGraficoReceitas] = useState<'pizza' | 'barras'>('barras')
  const [tipoGraficoDespesas, setTipoGraficoDespesas] = useState<'pizza' | 'barras'>('barras')

  // Função para capturar gráficos como base64
  const captureCharts = async () => {
    const charts: {
      receitasMes?: { image: string; width: number; height: number }
      receitasCategoria?: { image: string; width: number; height: number }
      despesasCategoria?: { image: string; width: number; height: number }
    } = {}

    try {
      if (graficoReceitasMesRef.current && graficos.incluirGraficoTemporal) {
        const canvas = await html2canvas(graficoReceitasMesRef.current, {
          backgroundColor: '#ffffff',
          scale: 3,
          useCORS: true,
          logging: false,
          width: graficoReceitasMesRef.current.offsetWidth,
          height: graficoReceitasMesRef.current.offsetHeight,
        })
        charts.receitasMes = {
          image: canvas.toDataURL('image/png', 1.0),
          width: canvas.width,
          height: canvas.height,
        }
      }

      if (graficoReceitasCategoriaRef.current) {
        const canvas = await html2canvas(graficoReceitasCategoriaRef.current, {
          backgroundColor: '#ffffff',
          scale: 3,
          useCORS: true,
          logging: false,
          width: graficoReceitasCategoriaRef.current.offsetWidth,
          height: graficoReceitasCategoriaRef.current.offsetHeight,
        })
        charts.receitasCategoria = {
          image: canvas.toDataURL('image/png', 1.0),
          width: canvas.width,
          height: canvas.height,
        }
      }

      if (graficoDespesasCategoriaRef.current) {
        const canvas = await html2canvas(graficoDespesasCategoriaRef.current, {
          backgroundColor: '#ffffff',
          scale: 3,
          useCORS: true,
          logging: false,
          width: graficoDespesasCategoriaRef.current.offsetWidth,
          height: graficoDespesasCategoriaRef.current.offsetHeight,
        })
        charts.despesasCategoria = {
          image: canvas.toDataURL('image/png', 1.0),
          width: canvas.width,
          height: canvas.height,
        }
      }
    } catch (error) {
    }

    return charts
  }

  // Handler de export modificado para capturar gráficos
  const handleExportWithCharts = async (formato: ReportFormat) => {
    if (formato === 'pdf') {
      const chartImages = await captureCharts()
      onExport(formato, chartImages)
    } else {
      onExport(formato)
    }
  }

  return (
    <div className={className}>
      {/* Header com ações */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Relatório Financeiro</h2>
          <p className="text-muted-foreground">
            Período: {configuracao.filtros.periodo.startDate} a {configuracao.filtros.periodo.endDate}
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExportWithCharts('pdf')}
          >
            <FileText className="mr-2 h-4 w-4" />
            PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExportWithCharts('excel')}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExportWithCharts('csv')}
          >
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
        </div>
      </div>

      {/* Resumo Executivo */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Receita Total (sem impostos)</CardDescription>
            <CardTitle className="text-3xl text-green-600">
              {formatCurrency(resumo.receitaTotal)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Faturamento sem impostos (pagos pelo cliente)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Despesa Total</CardDescription>
            <CardTitle className="text-3xl text-red-600">
              {formatCurrency(resumo.despesaTotal)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Gastos do período
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Lucro Líquido (sem impostos)</CardDescription>
            <CardTitle className={`text-3xl ${resumo.lucroLiquido >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {formatCurrency(resumo.lucroLiquido)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Margem: {resumo.margemLucro.toFixed(2)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* DRE - Demonstração do Resultado do Exercício */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>DRE - Demonstração do Resultado do Exercício</CardTitle>
          <CardDescription>
            Receitas e custos (impostos pagos pelo cliente não entram no cálculo)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="font-semibold">Receita Bruta (sem impostos)</span>
              <span className="font-mono text-green-600">{formatCurrency(dre.receitaBruta)}</span>
            </div>
            <div className="flex justify-between items-center pl-4 text-sm">
              <span className="text-muted-foreground">(-) Deduções</span>
              <span className="font-mono text-red-600">{formatCurrency(dre.deducoes)}</span>
            </div>
            <div className="flex justify-between items-center border-b pb-2 font-semibold">
              <span>(=) Receita Líquida</span>
              <span className="font-mono">{formatCurrency(dre.receitaLiquida)}</span>
            </div>
            <div className="flex justify-between items-center pl-4 text-sm">
              <span className="text-muted-foreground">(-) Custo dos Produtos</span>
              <span className="font-mono text-red-600">{formatCurrency(dre.custoProdutos)}</span>
            </div>
            <div className="flex justify-between items-center border-b pb-2 font-semibold">
              <span>(=) Lucro Bruto</span>
              <span className="font-mono text-blue-600">{formatCurrency(dre.lucroBruto)}</span>
            </div>
            <div className="flex justify-between items-center pl-4 text-sm">
              <span className="text-muted-foreground">(-) Despesas Operacionais</span>
              <span className="font-mono text-red-600">{formatCurrency(dre.despesasOperacionais)}</span>
            </div>
            <div className="flex justify-between items-center border-b pb-2 font-semibold">
              <span>(=) Lucro Operacional</span>
              <span className="font-mono text-blue-600">{formatCurrency(dre.lucroOperacional)}</span>
            </div>
            <div className="flex justify-between items-center pl-4 text-sm bg-muted/30 py-2 rounded">
              <span className="text-muted-foreground">(i) Impostos (IPI + ST)</span>
              <span className="font-mono text-orange-600">{formatCurrency(dre.impostos)}</span>
            </div>
            <div className="pl-4 text-xs text-muted-foreground italic">
              * Impostos são pagos pelo cliente e não entram no cálculo da empresa
            </div>
            <div className="flex justify-between items-center border-t-2 border-black pt-2 font-bold text-lg">
              <span>(=) Lucro Líquido</span>
              <span className={`font-mono ${dre.lucroLiquido >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(dre.lucroLiquido)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráficos */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Receitas e Despesas ao Longo do Tempo */}
        {graficos.incluirGraficoTemporal && receitasPorMes.length > 0 && (
          <Card ref={graficoReceitasMesRef}>
            <CardHeader>
              <CardTitle>Fluxo Financeiro Mensal</CardTitle>
              <CardDescription>
                Receitas, despesas e lucro por mês
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={receitasPorMes}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" style={{ fontSize: 12 }} />
                  <YAxis style={{ fontSize: 12 }} />
                  <Tooltip
                    wrapperStyle={{ zIndex: 1000 }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="receita" stroke="#10b981" name="Receita" strokeWidth={2} />
                  <Line type="monotone" dataKey="despesa" stroke="#ef4444" name="Despesa" strokeWidth={2} />
                  <Line type="monotone" dataKey="lucro" stroke="#3b82f6" name="Lucro" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Receitas por Categoria */}
        {receitasPorCategoria.length > 0 && (
          <Card ref={graficoReceitasCategoriaRef}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Receitas por Categoria</CardTitle>
                  <CardDescription>Distribuição do faturamento</CardDescription>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant={tipoGraficoReceitas === 'pizza' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTipoGraficoReceitas('pizza')}
                  >
                    Pizza
                  </Button>
                  <Button
                    variant={tipoGraficoReceitas === 'barras' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTipoGraficoReceitas('barras')}
                  >
                    Barras
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                {tipoGraficoReceitas === 'pizza' ? (
                  <PieChart>
                    <Pie
                      data={receitasPorCategoria}
                      dataKey="valor"
                      nameKey="categoria"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={(props) => {
                        const payload = props.payload as { categoria: string; percentual: number }
                        return `${payload.categoria} (${payload.percentual.toFixed(1)}%)`
                      }}
                    >
                      {receitasPorCategoria.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      wrapperStyle={{ zIndex: 1000 }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                  </PieChart>
                ) : (
                  <BarChart data={receitasPorCategoria}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="categoria" style={{ fontSize: 12 }} />
                    <YAxis style={{ fontSize: 12 }} />
                    <Tooltip
                      wrapperStyle={{ zIndex: 1000 }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Bar dataKey="valor" fill="#10b981" name="Receita" />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Despesas por Categoria */}
      {despesasPorCategoria.length > 0 && (
        <Card ref={graficoDespesasCategoriaRef} className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Despesas por Categoria</CardTitle>
                <CardDescription>Distribuição dos gastos</CardDescription>
              </div>
              <div className="flex gap-1">
                <Button
                  variant={tipoGraficoDespesas === 'pizza' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTipoGraficoDespesas('pizza')}
                >
                  Pizza
                </Button>
                <Button
                  variant={tipoGraficoDespesas === 'barras' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTipoGraficoDespesas('barras')}
                >
                  Barras
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              {tipoGraficoDespesas === 'pizza' ? (
                <PieChart>
                  <Pie
                    data={despesasPorCategoria}
                    dataKey="valor"
                    nameKey="categoria"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(props) => {
                      const payload = props.payload as { categoria: string; percentual: number }
                      return `${payload.categoria} (${payload.percentual.toFixed(1)}%)`
                    }}
                  >
                    {despesasPorCategoria.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    wrapperStyle={{ zIndex: 1000 }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                </PieChart>
              ) : (
                <BarChart data={despesasPorCategoria}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="categoria" style={{ fontSize: 12 }} />
                  <YAxis style={{ fontSize: 12 }} />
                  <Tooltip
                    wrapperStyle={{ zIndex: 1000 }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Bar dataKey="valor" fill="#ef4444" name="Despesa" />
                </BarChart>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default FinanceiroReportViewer
