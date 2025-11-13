import React from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable, SortableHeader } from '@/components/ui/data-table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Package } from 'lucide-react'
import type { DashboardTopProduct } from '@/types'

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('pt-BR').format(value)
}

export const topProductsColumns: ColumnDef<DashboardTopProduct>[] = [
  {
    id: 'posicao',
    header: '#',
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
            row.index === 0
              ? 'bg-yellow-100 text-yellow-700'
              : row.index === 1
              ? 'bg-gray-100 text-gray-700'
              : row.index === 2
              ? 'bg-orange-100 text-orange-700'
              : 'bg-blue-50 text-blue-700'
          }`}
        >
          {row.index + 1}
        </div>
      </div>
    ),
    enableSorting: false,
  },
  {
    accessorKey: 'nome',
    header: ({ column }) => <SortableHeader column={column}>Produto</SortableHeader>,
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Package className="h-4 w-4 text-meguispet-primary" />
        <div>
          <div className="font-medium text-gray-900">{row.original.nome}</div>
        </div>
      </div>
    ),
  },
  {
    accessorKey: 'vendas',
    header: ({ column }) => <SortableHeader column={column}>Vendas</SortableHeader>,
    cell: ({ row }) => (
      <div className="text-center">
        <div className="font-medium text-gray-900">{formatNumber(row.original.vendas)}</div>
        <div className="text-xs text-gray-500">unidades</div>
      </div>
    ),
  },
  {
    accessorKey: 'receita',
    header: ({ column }) => <SortableHeader column={column}>Faturamento</SortableHeader>,
    cell: ({ row }) => (
      <div className="text-right">
        <div className="font-medium text-meguispet-primary">
          {formatCurrency(row.original.receita)}
        </div>
      </div>
    ),
  },
  {
    id: 'ticket_medio',
    header: ({ column }) => <SortableHeader column={column}>Ticket Médio</SortableHeader>,
    accessorFn: (row) => (row.vendas > 0 ? row.receita / row.vendas : 0),
    cell: ({ row }) => {
      const ticketMedio = row.original.vendas > 0 ? row.original.receita / row.original.vendas : 0
      return (
        <div className="text-right">
          <div className="font-medium text-gray-700">{formatCurrency(ticketMedio)}</div>
        </div>
      )
    },
  },
]

interface TopProductsTableProps {
  data: DashboardTopProduct[]
  loading?: boolean
}

export default function TopProductsTable({ data, loading = false }: TopProductsTableProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-1/3 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mt-2 animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="h-12 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Produtos Mais Vendidos</CardTitle>
          <CardDescription>Ranking dos produtos com melhor desempenho</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Nenhum produto vendido ainda</p>
            <p className="text-sm text-gray-400 mt-1">
              Os dados aparecerão aqui assim que houver vendas
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Produtos Mais Vendidos</CardTitle>
        <CardDescription>
          Ranking dos {data.length} produtos com melhor desempenho
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={topProductsColumns}
          data={data}
          enableColumnResizing={false}
          enableColumnVisibility={false}
          mobileVisibleColumns={['nome', 'vendas', 'receita']}
        />
      </CardContent>
    </Card>
  )
}
