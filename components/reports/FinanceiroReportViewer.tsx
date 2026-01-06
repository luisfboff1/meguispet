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
import { formatNumber } from '@/lib/utils'

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

const formatPeriodDate = (dateStr: string): string => {
  try {
    const [year, month, day] = dateStr.split('-')
    return `${day}/${month}/${year}`
  } catch {
    return dateStr
  }
}

export const FinanceiroReportViewer: React.FC<FinanceiroReportViewerProps> = ({
  data,
  configuracao,
  onExport,
  className,
}) => {
  const { resumo, receitasPorMes, receitasPorCategoria, despesasPorCategoria, receitasDetalhadas, despesasDetalhadas, dre, validacao } = data
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
            Período: {formatPeriodDate(configuracao.filtros.periodo.startDate)} a {formatPeriodDate(configuracao.filtros.periodo.endDate)}
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
            Análise de resultados do período (faturamento de vendas)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="font-semibold">Receita Bruta (vendas)</span>
              <span className="font-mono text-green-600">R$ {formatNumber(dre.receitaBruta)}</span>
            </div>
            <div className="flex justify-between items-center pl-4 text-sm">
              <span className="text-muted-foreground">(-) Deduções (despesas)</span>
              <span className="font-mono text-red-600">R$ {formatNumber(dre.deducoes)}</span>
            </div>
            <div className="flex justify-between items-center border-b pb-2 font-semibold">
              <span>(=) Receita Líquida</span>
              <span className="font-mono">R$ {formatNumber(dre.receitaLiquida)}</span>
            </div>
            <div className="flex justify-between items-center pl-4 text-sm">
              <span className="text-muted-foreground">(-) Custo dos Produtos</span>
              <span className="font-mono text-red-600">R$ {formatNumber(dre.custoProdutos)}</span>
            </div>
            <div className="flex justify-between items-center border-b pb-2 font-semibold">
              <span>(=) Lucro Bruto</span>
              <span className="font-mono text-blue-600">R$ {formatNumber(dre.lucroBruto)}</span>
            </div>
            <div className="flex justify-between items-center border-t-2 border-black pt-2 font-bold text-lg">
              <span>(=) Lucro Líquido</span>
              <span className={`font-mono ${dre.lucroLiquido >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                R$ {formatNumber(dre.lucroLiquido)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabelas Detalhadas de Receitas e Despesas */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Receitas Detalhadas */}
        {receitasDetalhadas && receitasDetalhadas.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Receitas do Período</CardTitle>
              <CardDescription>
                Todas as receitas registradas ({receitasDetalhadas.length} transações)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background border-b">
                    <tr>
                      <th className="text-left p-2">Data</th>
                      <th className="text-left p-2">Descrição</th>
                      <th className="text-left p-2">Categoria</th>
                      <th className="text-right p-2">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receitasDetalhadas.map((receita) => (
                      <tr key={receita.id} className="border-b hover:bg-muted/50">
                        <td className="p-2">{formatPeriodDate(receita.data)}</td>
                        <td className="p-2">{receita.descricao}</td>
                        <td className="p-2 text-xs text-muted-foreground">{receita.categoria}</td>
                        <td className="p-2 text-right font-mono text-green-600">R$ {formatNumber(receita.valor)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 font-semibold">
                    <tr>
                      <td colSpan={3} className="p-2 text-right">Total:</td>
                      <td className="p-2 text-right font-mono text-green-600">
                        R$ {formatNumber(receitasDetalhadas.reduce((sum, r) => sum + r.valor, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Despesas Detalhadas */}
        {despesasDetalhadas && despesasDetalhadas.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Despesas do Período</CardTitle>
              <CardDescription>
                Todas as despesas registradas ({despesasDetalhadas.length} transações)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background border-b">
                    <tr>
                      <th className="text-left p-2">Data</th>
                      <th className="text-left p-2">Descrição</th>
                      <th className="text-left p-2">Categoria</th>
                      <th className="text-right p-2">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {despesasDetalhadas.map((despesa) => (
                      <tr key={despesa.id} className="border-b hover:bg-muted/50">
                        <td className="p-2">{formatPeriodDate(despesa.data)}</td>
                        <td className="p-2">{despesa.descricao}</td>
                        <td className="p-2 text-xs text-muted-foreground">{despesa.categoria}</td>
                        <td className="p-2 text-right font-mono text-red-600">R$ {formatNumber(despesa.valor)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 font-semibold">
                    <tr>
                      <td colSpan={3} className="p-2 text-right">Total:</td>
                      <td className="p-2 text-right font-mono text-red-600">
                        R$ {formatNumber(despesasDetalhadas.reduce((sum, d) => sum + d.valor, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

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

      {/* Validação: Vendas vs Receitas */}
      {validacao && (
        <Card className="mt-6 border-orange-200 bg-orange-50/50">
          <CardHeader>
            <CardTitle className="text-orange-900">Validação: Vendas vs Receitas</CardTitle>
            <CardDescription>
              Comparação entre faturamento de vendas e receitas lançadas manualmente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Faturamento de Vendas:</span>
                <span className="font-mono font-semibold">R$ {formatNumber(validacao.faturamentoVendas)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Receitas de Transações:</span>
                <span className="font-mono font-semibold">R$ {formatNumber(validacao.receitasTransacoes)}</span>
              </div>
              <div className="flex justify-between items-center border-t pt-2 mt-2">
                <span className="text-sm font-semibold">Diferença:</span>
                <span className={`font-mono font-bold ${validacao.diferenca === 0 ? 'text-green-600' : 'text-orange-600'}`}>
                  R$ {formatNumber(Math.abs(validacao.diferenca))}
                  {validacao.diferenca !== 0 && (
                    <span className="text-xs ml-2">
                      ({validacao.diferenca > 0 ? 'vendas maiores' : 'receitas maiores'})
                    </span>
                  )}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-3 italic">
                * Se houver diferença, pode indicar receitas lançadas manualmente que já foram contabilizadas nas vendas,
                ou receitas extras (não operacionais) que não vieram de vendas.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default FinanceiroReportViewer
