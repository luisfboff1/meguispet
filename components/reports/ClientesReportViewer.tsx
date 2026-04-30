import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollableContainer } from '@/components/ui/scrollable-container'
import { Download, FileSpreadsheet, FileText } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from 'recharts'
import type { ClientesReportData, ReportConfiguration, ReportFormat } from '@/types/reports'
import { cn, formatLocalDate } from '@/lib/utils'

export interface ClientesReportViewerProps {
  data: ClientesReportData
  configuracao: ReportConfiguration
  onExport: (formato: ReportFormat) => void
  className?: string
}

const COLORS = ['#0f766e', '#2563eb', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#65a30d']

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
}).format(value)

const buildAddress = (cliente: ClientesReportData['clientesDetalhados'][number]) => {
  return [cliente.endereco, cliente.cidade, cliente.estado, cliente.cep].filter(Boolean).join(' - ')
}

export function ClientesReportViewer({
  data,
  configuracao,
  onExport,
  className,
}: ClientesReportViewerProps) {
  const periodo = `${formatLocalDate(configuracao.filtros.periodo.startDate)} - ${formatLocalDate(configuracao.filtros.periodo.endDate)}`

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Relatório de Clientes</h1>
          <p className="text-muted-foreground mt-1">Período: {periodo}</p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => onExport('pdf')} variant="outline" size="sm" className="gap-2">
            <FileText className="h-4 w-4" />
            Exportar PDF
          </Button>
          <Button onClick={() => onExport('excel')} variant="outline" size="sm" className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Exportar Excel
          </Button>
          <Button onClick={() => onExport('csv')} variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total de Clientes</CardDescription>
            <CardTitle className="text-3xl">{data.resumo.totalClientes}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Clientes Ativos</CardDescription>
            <CardTitle className="text-3xl text-success">{data.resumo.clientesAtivos}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Novos Clientes</CardDescription>
            <CardTitle className="text-3xl text-info">{data.resumo.novosClientes}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Ticket Médio</CardDescription>
            <CardTitle className="text-3xl">{formatCurrency(data.resumo.ticketMedio)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Faturamento Total</CardDescription>
            <CardTitle className="text-3xl">{formatCurrency(data.resumo.faturamentoTotal)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {data.topClientes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Top Clientes</CardTitle>
              <CardDescription>Maiores compradores do período</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.topClientes.slice(0, 10).map((cliente) => ({
                  nome: cliente.clienteNome.length > 18 ? `${cliente.clienteNome.slice(0, 15)}...` : cliente.clienteNome,
                  totalCompras: cliente.totalCompras,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="nome" angle={-35} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="totalCompras" fill="#2563eb" name="Total Compras" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {data.clientesPorEstado.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Clientes por Estado</CardTitle>
              <CardDescription>Distribuição de clientes e faturamento</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.clientesPorEstado.map((estado) => ({
                      name: estado.estado,
                      value: estado.quantidade,
                    }))}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label
                  >
                    {data.clientesPorEstado.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [value, 'Clientes']} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {data.topClientes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ranking de Clientes</CardTitle>
            <CardDescription>Detalhamento dos principais clientes do período</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollableContainer>
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">Cliente</th>
                    <th className="text-right py-2 px-2">Total Compras</th>
                    <th className="text-right py-2 px-2">Ticket Médio</th>
                    <th className="text-right py-2 px-2">Última Compra</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topClientes.map((cliente) => (
                    <tr key={cliente.clienteId} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-2 text-sm">{cliente.clienteNome}</td>
                      <td className="py-2 px-2 text-sm text-right">{formatCurrency(cliente.totalCompras)}</td>
                      <td className="py-2 px-2 text-sm text-right">{formatCurrency(cliente.ticketMedio)}</td>
                      <td className="py-2 px-2 text-sm text-right">{cliente.ultimaCompra ? formatLocalDate(cliente.ultimaCompra) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollableContainer>
          </CardContent>
        </Card>
      )}

      {data.clientesDetalhados.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Clientes Detalhados</CardTitle>
            <CardDescription>Base completa de clientes no recorte do relatório</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollableContainer>
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">Nome</th>
                    <th className="text-left py-2 px-2">CPF/CNPJ</th>
                    <th className="text-left py-2 px-2">Endereço</th>
                    <th className="text-left py-2 px-2">Tipo</th>
                    <th className="text-right py-2 px-2">Vendas</th>
                    <th className="text-right py-2 px-2">Total Compras</th>
                    <th className="text-right py-2 px-2">Ticket Médio</th>
                    <th className="text-right py-2 px-2">Última Compra</th>
                    <th className="text-center py-2 px-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.clientesDetalhados.map((cliente) => (
                    <tr key={cliente.id} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-2 text-sm">{cliente.nome}</td>
                      <td className="py-2 px-2 text-sm">{cliente.documento || '-'}</td>
                      <td className="py-2 px-2 text-sm">{buildAddress(cliente) || '-'}</td>
                      <td className="py-2 px-2 text-sm uppercase">{cliente.tipo}</td>
                      <td className="py-2 px-2 text-sm text-right">{cliente.quantidadeCompras}</td>
                      <td className="py-2 px-2 text-sm text-right">{formatCurrency(cliente.totalCompras)}</td>
                      <td className="py-2 px-2 text-sm text-right">{formatCurrency(cliente.ticketMedio)}</td>
                      <td className="py-2 px-2 text-sm text-right">{cliente.ultimaCompra ? formatLocalDate(cliente.ultimaCompra) : '-'}</td>
                      <td className="py-2 px-2 text-center">
                        <span className={cn(
                          'inline-flex rounded-full px-2 py-1 text-xs font-medium',
                          cliente.status === 'ativo'
                            ? 'bg-success-muted text-success'
                            : 'bg-muted text-foreground'
                        )}>
                          {cliente.status}
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
    </div>
  )
}
