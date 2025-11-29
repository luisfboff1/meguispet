import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/router'
import { ColumnDef } from '@tanstack/react-table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable, SortableHeader } from '@/components/ui/data-table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import {
  X,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Percent,
  Clock,
  Search,
  Eye,
  Mail,
  Phone,
  CreditCard,
  Calendar,
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { Vendedor, VendedorVenda } from '@/types'
import { useVendedorMetricas, useVendedorVendas } from '@/hooks/useVendedorDetails'
import { formatLocalDate } from '@/lib/utils'

interface VendedorDetailsModalProps {
  vendedor: Vendedor
  isOpen: boolean
  onClose: () => void
}

export function VendedorDetailsModal({
  vendedor,
  isOpen,
  onClose,
}: VendedorDetailsModalProps) {
  const router = useRouter()

  // Estados dos filtros
  const [periodo, setPeriodo] = useState<'7d' | '30d' | '90d'>('30d')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  // Carregar dados
  const { data: metricas, isLoading: loadingMetricas } = useVendedorMetricas(
    vendedor.id,
    periodo
  )

  const { data: vendasData, isLoading: loadingVendas } = useVendedorVendas(
    vendedor.id,
    {
      periodo,
      status: statusFilter,
      search: searchTerm,
      page: currentPage,
      limit: 10,
    }
  )

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return formatLocalDate(dateString)
  }

  const getVariationIcon = (variation: number) => {
    if (variation > 0) return <TrendingUp className="h-4 w-4 text-green-600" />
    if (variation < 0) return <TrendingDown className="h-4 w-4 text-red-600" />
    return null
  }

  const getVariationColor = (variation: number) => {
    if (variation > 0) return 'text-green-600'
    if (variation < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  const handleVerVenda = (vendaId: number) => {
    router.push(`/vendas?id=${vendaId}`)
    onClose()
  }

  // Colunas da tabela de vendas
  const vendasColumns = useMemo<ColumnDef<VendedorVenda>[]>(
    () => [
      {
        accessorKey: 'numero_venda',
        header: ({ column }) => <SortableHeader column={column}>Nº Venda</SortableHeader>,
        cell: ({ row }) => (
          <span className="font-medium text-gray-900 dark:text-white">
            {row.original.numero_venda}
          </span>
        ),
      },
      {
        accessorKey: 'cliente',
        header: ({ column }) => <SortableHeader column={column}>Cliente</SortableHeader>,
        cell: ({ row }) => (
          <span className="text-gray-700 dark:text-gray-300">
            {row.original.cliente?.nome || 'Sem cliente'}
          </span>
        ),
      },
      {
        accessorKey: 'data_venda',
        header: ({ column }) => <SortableHeader column={column}>Data</SortableHeader>,
        cell: ({ row }) => (
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {formatDate(row.original.data_venda)}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'valor_final',
        header: ({ column }) => <SortableHeader column={column}>Valor</SortableHeader>,
        cell: ({ row }) => (
          <span className="font-bold text-green-600">
            {formatCurrency(row.original.valor_final)}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <SortableHeader column={column}>Status</SortableHeader>,
        cell: ({ row }) => {
          const status = row.original.status
          const statusColors: Record<string, string> = {
            pago: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
            pendente: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
            cancelado: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
          }
          return (
            <span
              className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                statusColors[status] || 'bg-gray-100 text-gray-800'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
          )
        },
      },
      {
        id: 'acoes',
        header: 'Ações',
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleVerVenda(row.original.id)}
            title="Ver detalhes da venda"
          >
            <Eye className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    [router, onClose]
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold">
              Detalhes do Vendedor - {vendedor.nome}
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Informações Básicas */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
              {vendedor.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-700 dark:text-gray-300">{vendedor.email}</span>
                </div>
              )}
              {vendedor.telefone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-700 dark:text-gray-300">{vendedor.telefone}</span>
                </div>
              )}
              {vendedor.cpf && (
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-700 dark:text-gray-300">{vendedor.cpf}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-gray-500" />
                <span className="text-gray-700 dark:text-gray-300">
                  Comissão: {vendedor.comissao}%
                </span>
              </div>
            </div>
          </div>

          {/* Filtro de Período */}
          <div className="flex items-center gap-4">
            <Select value={periodo} onValueChange={(value) => setPeriodo(value as '7d' | '30d' | '90d')}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Selecione o período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="90d">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Métricas */}
          {loadingMetricas ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-meguispet-primary"></div>
            </div>
          ) : metricas ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Faturamento Total */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium truncate pr-2">Faturamento Total</CardTitle>
                    <DollarSign className="h-4 w-4 text-meguispet-primary flex-shrink-0" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold whitespace-nowrap">
                      {formatCurrency(metricas.faturamentoTotal)}
                    </div>
                    {metricas.variacaoFaturamento !== 0 && (
                      <div className={`flex items-center gap-1 text-xs mt-1 ${getVariationColor(metricas.variacaoFaturamento)}`}>
                        {getVariationIcon(metricas.variacaoFaturamento)}
                        <span className="whitespace-nowrap">{Math.abs(metricas.variacaoFaturamento).toFixed(1)}%</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Quantidade de Vendas */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium truncate pr-2">Vendas Realizadas</CardTitle>
                    <ShoppingCart className="h-4 w-4 text-meguispet-primary flex-shrink-0" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold whitespace-nowrap">{metricas.quantidadeVendas}</div>
                    {metricas.variacaoQuantidade !== 0 && (
                      <div className={`flex items-center gap-1 text-xs mt-1 ${getVariationColor(metricas.variacaoQuantidade)}`}>
                        {getVariationIcon(metricas.variacaoQuantidade)}
                        <span className="whitespace-nowrap">{Math.abs(metricas.variacaoQuantidade).toFixed(1)}%</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Ticket Médio */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium truncate pr-2">Ticket Médio</CardTitle>
                    <TrendingUp className="h-4 w-4 text-meguispet-primary flex-shrink-0" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold whitespace-nowrap">
                      {formatCurrency(metricas.ticketMedio)}
                    </div>
                    {metricas.variacaoTicketMedio !== 0 && (
                      <div className={`flex items-center gap-1 text-xs mt-1 ${getVariationColor(metricas.variacaoTicketMedio)}`}>
                        {getVariationIcon(metricas.variacaoTicketMedio)}
                        <span className="whitespace-nowrap">{Math.abs(metricas.variacaoTicketMedio).toFixed(1)}%</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Cards Secundários */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Comissão Total */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium truncate pr-2">Comissão Total</CardTitle>
                    <Percent className="h-4 w-4 text-green-600 flex-shrink-0" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600 whitespace-nowrap">
                      {formatCurrency(metricas.comissaoTotal)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {vendedor.comissao}% sobre o faturamento
                    </p>
                  </CardContent>
                </Card>

                {/* Última Venda */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium truncate pr-2">Última Venda</CardTitle>
                    <Clock className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  </CardHeader>
                  <CardContent>
                    {metricas.ultimaVenda ? (
                      <>
                        <div className="text-xl font-bold">
                          {formatCurrency(metricas.ultimaVenda.valor_final)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {metricas.ultimaVenda.numero_venda} -{' '}
                          {formatDate(metricas.ultimaVenda.data_venda)}
                        </p>
                      </>
                    ) : (
                      <div className="text-sm text-gray-500">Nenhuma venda no período</div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Gráfico de Vendas */}
              {metricas.graficoVendas.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Desempenho de Vendas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={metricas.graficoVendas}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="data"
                          tickFormatter={(value) => {
                            const date = new Date(value)
                            return `${date.getDate()}/${date.getMonth() + 1}`
                          }}
                        />
                        <YAxis
                          yAxisId="left"
                          tickFormatter={(value) => `R$ ${value}`}
                        />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip
                          labelFormatter={(value) => formatDate(value)}
                          formatter={(value: number | string, name: string) => {
                            if (name === 'faturamento') {
                              return [formatCurrency(Number(value)), 'Faturamento']
                            }
                            return [value, 'Quantidade']
                          }}
                        />
                        <Legend />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="faturamento"
                          stroke="#8b5cf6"
                          strokeWidth={2}
                          name="Faturamento"
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="quantidade"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          name="Quantidade"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </>
          ) : null}

          {/* Histórico de Vendas */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardTitle>Histórico de Vendas</CardTitle>

                {/* Filtros */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Buscar nº venda..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value)
                        setCurrentPage(1)
                      }}
                      className="pl-10 w-full sm:w-48"
                    />
                  </div>
                  <Select
                    value={statusFilter || 'todos'}
                    onValueChange={(value) => {
                      setStatusFilter(value === 'todos' ? '' : value)
                      setCurrentPage(1)
                    }}
                  >
                    <SelectTrigger className="w-full sm:w-[150px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="pago">Pago</SelectItem>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingVendas ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-meguispet-primary"></div>
                </div>
              ) : vendasData && vendasData.vendas.length > 0 ? (
                <>
                  <DataTable
                    columns={vendasColumns}
                    data={vendasData.vendas}
                    enableSorting
                    enableColumnVisibility
                  />

                  {/* Paginação */}
                  {vendasData.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Mostrando {vendasData.vendas.length} de {vendasData.total} vendas
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          Anterior
                        </Button>
                        <span className="flex items-center px-3 text-sm">
                          Página {currentPage} de {vendasData.totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setCurrentPage((p) => Math.min(vendasData.totalPages, p + 1))
                          }
                          disabled={currentPage === vendasData.totalPages}
                        >
                          Próxima
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Nenhuma venda encontrada
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {searchTerm || statusFilter
                      ? 'Nenhuma venda corresponde aos filtros aplicados'
                      : 'Este vendedor ainda não realizou vendas no período selecionado'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
