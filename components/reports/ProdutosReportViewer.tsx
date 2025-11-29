import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollableContainer } from '@/components/ui/scrollable-container'
import { Download, FileText, FileSpreadsheet } from 'lucide-react'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import type { ProdutosReportData, ReportConfiguration, ReportFormat } from '@/types/reports'
import { cn, formatLocalDate } from '@/lib/utils'

export interface ProdutosReportViewerProps {
  data: ProdutosReportData
  configuracao: ReportConfiguration
  onExport: (formato: ReportFormat) => void
  className?: string
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B6B']

export function ProdutosReportViewer({
  data,
  configuracao,
  onExport,
  className
}: ProdutosReportViewerProps) {
  const { periodo } = configuracao.filtros

  const periodoStr = `${formatLocalDate(periodo.startDate)} - ${formatLocalDate(periodo.endDate)}`

  // Dados para gráfico de barras (Top 10 Mais Vendidos)
  const chartDataMaisVendidos = data.produtosMaisVendidos.slice(0, 10).map(p => ({
    nome: p.produtoNome.length > 20 ? p.produtoNome.substring(0, 17) + '...' : p.produtoNome,
    quantidade: p.quantidadeVendida,
    faturamento: p.faturamento
  }))

  // Dados para gráfico de pizza (Distribuição por Categoria)
  const chartDataCategorias = data.produtosPorCategoria.map(c => ({
    name: c.categoria,
    value: c.faturamento
  }))

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header com ações */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Relatório de Produtos</h1>
          <p className="text-muted-foreground mt-1">Período: {periodoStr}</p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={() => onExport('pdf')}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            Exportar PDF
          </Button>
          <Button
            onClick={() => onExport('excel')}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Exportar Excel
          </Button>
          <Button
            onClick={() => onExport('csv')}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Resumo Executivo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total de Produtos</CardDescription>
            <CardTitle className="text-3xl">{data.resumo.totalProdutos}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Produtos Ativos</CardDescription>
            <CardTitle className="text-3xl text-green-600">
              {data.resumo.produtosAtivos}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Baixo Estoque</CardDescription>
            <CardTitle className="text-3xl text-red-600">
              {data.resumo.produtosBaixoEstoque}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Faturamento Total</CardDescription>
            <CardTitle className="text-3xl">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(data.resumo.faturamentoTotal)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Margem Média</CardDescription>
            <CardTitle className="text-3xl text-blue-600">
              {data.resumo.margemMedia.toFixed(1)}%
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Gráfico de Barras - Top Produtos Mais Vendidos */}
        {chartDataMaisVendidos.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Produtos Mais Vendidos</CardTitle>
              <CardDescription>Por quantidade vendida</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartDataMaisVendidos}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="nome" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      if (name === 'quantidade') return [value, 'Quantidade']
                      return [
                        new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        }).format(value),
                        'Faturamento'
                      ]
                    }}
                  />
                  <Legend />
                  <Bar dataKey="quantidade" fill="#3b82f6" name="Quantidade" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Gráfico de Pizza - Distribuição por Categoria */}
        {chartDataCategorias.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Categoria</CardTitle>
              <CardDescription>Faturamento por categoria</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartDataCategorias}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }: { name?: string; percent?: number }) =>
                      `${name}: ${((percent || 0) * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartDataCategorias.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) =>
                      new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      }).format(value)
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tabelas */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Produtos Mais Vendidos */}
        {data.produtosMaisVendidos.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Produtos Mais Vendidos</CardTitle>
              <CardDescription>Produtos com maior saída no período</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollableContainer>
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">Produto</th>
                      <th className="text-right py-2 px-2">Qtd</th>
                      <th className="text-right py-2 px-2">Faturamento</th>
                      <th className="text-right py-2 px-2">Margem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.produtosMaisVendidos.map((produto, idx) => (
                      <tr key={produto.produtoId} className="border-b hover:bg-muted/50">
                        <td className="py-2 px-2 text-sm">{produto.produtoNome}</td>
                        <td className="text-right py-2 px-2 text-sm">
                          {produto.quantidadeVendida}
                        </td>
                        <td className="text-right py-2 px-2 text-sm">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          }).format(produto.faturamento)}
                        </td>
                        <td className="text-right py-2 px-2 text-sm">
                          <span
                            className={cn(
                              'font-medium',
                              produto.margem > 20
                                ? 'text-green-600'
                                : produto.margem > 10
                                  ? 'text-yellow-600'
                                  : 'text-red-600'
                            )}
                          >
                            {produto.margem.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollableContainer>
            </CardContent>
          </Card>
        )}

        {/* Produtos com Baixo Estoque */}
        {data.produtosBaixoEstoque.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Produtos com Baixo Estoque</CardTitle>
              <CardDescription>Produtos que precisam de reposição</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollableContainer>
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">Produto</th>
                      <th className="text-right py-2 px-2">Atual</th>
                      <th className="text-right py-2 px-2">Mínimo</th>
                      <th className="text-right py-2 px-2">Diferença</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.produtosBaixoEstoque.slice(0, 10).map((produto) => {
                      const diferenca = produto.estoqueAtual - produto.estoqueMinimo
                      return (
                        <tr key={produto.produtoId} className="border-b hover:bg-muted/50">
                          <td className="py-2 px-2 text-sm">{produto.produtoNome}</td>
                          <td className="text-right py-2 px-2 text-sm">
                            {produto.estoqueAtual}
                          </td>
                          <td className="text-right py-2 px-2 text-sm">
                            {produto.estoqueMinimo}
                          </td>
                          <td className="text-right py-2 px-2 text-sm">
                            <span
                              className={cn(
                                'font-medium',
                                diferenca < 0 ? 'text-red-600' : 'text-yellow-600'
                              )}
                            >
                              {diferenca}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </ScrollableContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Vendas por Categoria */}
      {data.produtosPorCategoria.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Vendas por Categoria</CardTitle>
            <CardDescription>Desempenho de cada categoria no período</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollableContainer>
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4">Categoria</th>
                    <th className="text-right py-2 px-4">Quantidade Vendida</th>
                    <th className="text-right py-2 px-4">Faturamento</th>
                  </tr>
                </thead>
                <tbody>
                  {data.produtosPorCategoria.map((cat, idx) => (
                    <tr key={idx} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-4">{cat.categoria}</td>
                      <td className="text-right py-2 px-4">{cat.quantidade}</td>
                      <td className="text-right py-2 px-4">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        }).format(cat.faturamento)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollableContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
