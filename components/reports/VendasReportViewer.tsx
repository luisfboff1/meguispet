import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, FileSpreadsheet, FileText, Share2 } from 'lucide-react'
import { Line, LineChart, Bar, BarChart, Pie, PieChart, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { VendasReportData, ReportConfiguration, ReportFormat } from '@/types/reports'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export interface VendasReportViewerProps {
  data: VendasReportData
  configuracao: ReportConfiguration
  onExport: (formato: ReportFormat) => void
  className?: string
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

const formatDate = (dateString: string) => {
  try {
    return format(new Date(dateString), 'dd/MM', { locale: ptBR })
  } catch {
    return dateString
  }
}

export const VendasReportViewer: React.FC<VendasReportViewerProps> = ({
  data,
  configuracao,
  onExport,
  className,
}) => {
  const { resumo, vendasPorDia, vendasPorVendedor, vendasPorProduto, vendasDetalhadas } = data

  return (
    <div className={className}>
      {/* Header com ações */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Relatório de Vendas</h2>
          <p className="text-muted-foreground">
            Período: {configuracao.filtros.periodo.startDate} a {configuracao.filtros.periodo.endDate}
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onExport('pdf')}
          >
            <FileText className="mr-2 h-4 w-4" />
            PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onExport('excel')}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onExport('csv')}
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
            <CardDescription>Total de Vendas</CardDescription>
            <CardTitle className="text-3xl">{resumo.totalVendas}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Vendas realizadas no período
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Faturamento Total</CardDescription>
            <CardTitle className="text-3xl">
              {formatCurrency(resumo.faturamentoTotal)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Valor total faturado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ticket Médio</CardDescription>
            <CardTitle className="text-3xl">
              {formatCurrency(resumo.ticketMedio)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Valor médio por venda
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Impostos</CardDescription>
            <CardTitle className="text-3xl">
              {formatCurrency(resumo.totalImpostos)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              IPI + ST
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Custo Total</CardDescription>
            <CardTitle className="text-3xl">
              {formatCurrency(resumo.custoTotal)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Custo dos produtos vendidos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Margem de Lucro</CardDescription>
            <CardTitle className="text-3xl">
              {resumo.margemLucro.toFixed(2)}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Percentual de lucratividade
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Vendas ao longo do tempo */}
        {vendasPorDia.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Vendas ao Longo do Tempo</CardTitle>
              <CardDescription>
                Quantidade e faturamento diário
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={vendasPorDia}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="data"
                    tickFormatter={formatDate}
                    style={{ fontSize: 12 }}
                  />
                  <YAxis yAxisId="left" style={{ fontSize: 12 }} />
                  <YAxis yAxisId="right" orientation="right" style={{ fontSize: 12 }} />
                  <Tooltip
                    labelFormatter={formatDate}
                    formatter={(value: number, name: string) => {
                      if (name === 'Faturamento') {
                        return formatCurrency(value)
                      }
                      return value
                    }}
                  />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="quantidade"
                    stroke="#3b82f6"
                    name="Quantidade"
                    strokeWidth={2}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="faturamento"
                    stroke="#10b981"
                    name="Faturamento"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Top Vendedores */}
        {vendasPorVendedor.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Vendas por Vendedor</CardTitle>
              <CardDescription>
                Top vendedores do período
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={vendasPorVendedor.slice(0, 5)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="vendedorNome" style={{ fontSize: 12 }} />
                  <YAxis 
                    yAxisId="left" 
                    style={{ fontSize: 12 }}
                    label={{ value: 'Quantidade', angle: -90, position: 'insideLeft' }}
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    style={{ fontSize: 12 }}
                    tickFormatter={(value) => `R$ ${value.toLocaleString('pt-BR')}`}
                    label={{ value: 'Faturamento (R$)', angle: 90, position: 'insideRight' }}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      if (name === 'Faturamento') {
                        return [formatCurrency(value), name]
                      }
                      return [value, name]
                    }}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="quantidade" fill="#3b82f6" name="Quantidade" />
                  <Bar yAxisId="right" dataKey="faturamento" fill="#10b981" name="Faturamento" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Top 10 Produtos */}
      {vendasPorProduto.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Top 10 Produtos Mais Vendidos</CardTitle>
            <CardDescription>
              Produtos com maior volume de vendas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 text-sm font-medium">#</th>
                    <th className="text-left p-2 text-sm font-medium">Produto</th>
                    <th className="text-right p-2 text-sm font-medium">Quantidade</th>
                    <th className="text-right p-2 text-sm font-medium">Faturamento</th>
                  </tr>
                </thead>
                <tbody>
                  {vendasPorProduto.map((produto, index) => (
                    <tr key={produto.produtoId} className="border-b hover:bg-muted/50">
                      <td className="p-2 text-sm">{index + 1}</td>
                      <td className="p-2 text-sm font-medium">{produto.produtoNome}</td>
                      <td className="p-2 text-sm text-right">{produto.quantidade}</td>
                      <td className="p-2 text-sm text-right">{formatCurrency(produto.faturamento)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vendas Detalhadas */}
      {vendasDetalhadas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Vendas Detalhadas</CardTitle>
            <CardDescription>
              Lista completa de vendas (primeiras 100)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 text-sm font-medium">Data</th>
                    <th className="text-left p-2 text-sm font-medium">Cliente</th>
                    <th className="text-left p-2 text-sm font-medium">Vendedor</th>
                    <th className="text-right p-2 text-sm font-medium">Produtos</th>
                    <th className="text-right p-2 text-sm font-medium">Subtotal</th>
                    <th className="text-right p-2 text-sm font-medium">Valor Líquido</th>
                    <th className="text-right p-2 text-sm font-medium">IPI</th>
                    <th className="text-right p-2 text-sm font-medium">ICMS</th>
                    <th className="text-right p-2 text-sm font-medium">ST</th>
                    <th className="text-right p-2 text-sm font-medium">Total c/ Impostos</th>
                    <th className="text-center p-2 text-sm font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {vendasDetalhadas.map((venda) => (
                    <tr key={venda.id} className="border-b hover:bg-muted/50">
                      <td className="p-2 text-sm">
                        {format(new Date(venda.data), 'dd/MM/yyyy', { locale: ptBR })}
                      </td>
                      <td className="p-2 text-sm">{venda.cliente}</td>
                      <td className="p-2 text-sm">{venda.vendedor}</td>
                      <td className="p-2 text-sm text-right">{venda.produtos}</td>
                      <td className="p-2 text-sm text-right">
                        {formatCurrency(venda.subtotal)}
                      </td>
                      <td className="p-2 text-sm text-right">
                        {formatCurrency(venda.valorLiquido)}
                      </td>
                      <td className="p-2 text-sm text-right">
                        {formatCurrency(venda.ipi)}
                      </td>
                      <td className="p-2 text-sm text-right">
                        {formatCurrency(venda.icms)}
                      </td>
                      <td className="p-2 text-sm text-right">
                        {formatCurrency(venda.st)}
                      </td>
                      <td className="p-2 text-sm text-right font-medium">
                        {formatCurrency(venda.total)}
                      </td>
                      <td className="p-2 text-center">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            venda.status === 'pago'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : venda.status === 'pendente'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}
                        >
                          {venda.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default VendasReportViewer
