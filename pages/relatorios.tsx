import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/router'
import { ColumnDef } from '@tanstack/react-table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Download,
  Calendar,
  BarChart3,
  PieChart,
  TrendingUp,
  FileText,
  Eye,
  ShoppingCart,
  Package,
  Users,
  DollarSign,
} from 'lucide-react'
import { DataTable, SortableHeader } from '@/components/ui/data-table'
import { ReportCard } from '@/components/reports/ReportCard'
import type { ReportType } from '@/types/reports'

interface ReportData {
  id: string
  tipo: string
  nome: string
  periodo: string
  dataGeracao: string
  status: 'disponivel' | 'processando' | 'erro'
}

export default function RelatoriosPage() {
  const router = useRouter()

  const handleReportConfig = (tipo: ReportType) => {
    // Redirecionar para página específica do relatório
    router.push(`/relatorios/${tipo}`)
  }

  const reportTypes = [
    {
      id: 'vendas' as ReportType,
      title: 'Relatório de Vendas',
      description: 'Análise completa de vendas, faturamento, impostos e margem de lucro',
      icon: <ShoppingCart className="h-6 w-6" />,
    },
    {
      id: 'produtos' as ReportType,
      title: 'Relatório de Produtos',
      description: 'Produtos mais vendidos, rotatividade de estoque e análise ABC',
      icon: <Package className="h-6 w-6" />,
    },
    {
      id: 'clientes' as ReportType,
      title: 'Relatório de Clientes',
      description: 'Análise de clientes, novos cadastros e análise RFM',
      icon: <Users className="h-6 w-6" />,
    },
    {
      id: 'financeiro' as ReportType,
      title: 'Relatório Financeiro',
      description: 'DRE completo com receitas, despesas, lucros e margens',
      icon: <DollarSign className="h-6 w-6" />,
    }
  ]

  // Sample data for recent reports - in production this would come from an API
  const recentReports: ReportData[] = [
    {
      id: '1',
      tipo: 'vendas',
      nome: 'Relatório de Vendas - Mensal',
      periodo: 'Dezembro 2024',
      dataGeracao: '2024-12-15',
      status: 'disponivel'
    },
    {
      id: '2',
      tipo: 'produtos',
      nome: 'Relatório de Produtos Mais Vendidos',
      periodo: 'Novembro 2024',
      dataGeracao: '2024-12-01',
      status: 'disponivel'
    },
    {
      id: '3',
      tipo: 'clientes',
      nome: 'Análise de Clientes',
      periodo: 'Outubro-Dezembro 2024',
      dataGeracao: '2024-12-10',
      status: 'disponivel'
    },
    {
      id: '4',
      tipo: 'financeiro',
      nome: 'Relatório Financeiro - Trimestral',
      periodo: 'Q4 2024',
      dataGeracao: '2024-12-20',
      status: 'disponivel'
    }
  ]

  const getStatusColor = (status: ReportData['status']) => {
    switch (status) {
      case 'disponivel': return 'text-green-600'
      case 'processando': return 'text-yellow-600'
      case 'erro': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusLabel = (status: ReportData['status']) => {
    switch (status) {
      case 'disponivel': return 'Disponível'
      case 'processando': return 'Processando'
      case 'erro': return 'Erro'
      default: return 'Desconhecido'
    }
  }

  // Column definitions for reports table
  const reportsColumns = useMemo<ColumnDef<ReportData>[]>(() => {
    return [
    {
      accessorKey: "nome",
      header: ({ column }) => <SortableHeader column={column}>Relatório</SortableHeader>,
      cell: ({ row }) => (
        <div className="min-w-[250px]">
          <div className="font-medium text-gray-900">{row.original.nome}</div>
          <div className="text-sm text-gray-500">{row.original.tipo}</div>
        </div>
      ),
    },
    {
      accessorKey: "periodo",
      header: ({ column }) => <SortableHeader column={column}>Período</SortableHeader>,
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-600">{row.original.periodo}</span>
        </div>
      ),
    },
    {
      accessorKey: "dataGeracao",
      header: ({ column }) => <SortableHeader column={column}>Data de Geração</SortableHeader>,
      cell: ({ row }) => (
        <span className="text-sm text-gray-600">
          {new Date(row.original.dataGeracao).toLocaleDateString('pt-BR')}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => <SortableHeader column={column}>Status</SortableHeader>,
      cell: ({ row }) => (
        <span className={`text-sm font-medium ${getStatusColor(row.original.status)}`}>
          {getStatusLabel(row.original.status)}
        </span>
      ),
    },
    {
      id: "acoes",
      header: "Ações",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" title="Visualizar">
            <Eye className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            title="Download PDF"
            disabled={row.original.status !== 'disponivel'}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
          <p className="text-gray-600">Gere relatórios detalhados do seu negócio</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Button className="bg-meguispet-primary hover:bg-meguispet-primary/90">
            <Download className="mr-2 h-4 w-4" />
            Exportar Todos
          </Button>
        </div>
      </div>

      {/* Report Types - Cards de relatórios disponíveis */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Tipos de Relatórios</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-6">
          {reportTypes.map((report, index) => (
            <ReportCard
              key={report.id}
              tipo={report.id}
              titulo={report.title}
              descricao={report.description}
              icon={report.icon}
              onClick={() => handleReportConfig(report.id)}
              animationDelay={index * 0.1}
            />
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vendas</CardTitle>
            <BarChart3 className="h-4 w-4 text-meguispet-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">No período</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento</CardTitle>
            <TrendingUp className="h-4 w-4 text-meguispet-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ 0,00</div>
            <p className="text-xs text-muted-foreground">No período</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produtos Vendidos</CardTitle>
            <PieChart className="h-4 w-4 text-meguispet-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Unidades</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Novos Clientes</CardTitle>
            <Calendar className="h-4 w-4 text-meguispet-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">No período</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Relatórios Recentes</CardTitle>
          <CardDescription>Últimos relatórios gerados</CardDescription>
        </CardHeader>
        <CardContent>
          {recentReports.length > 0 ? (
            <DataTable 
              columns={reportsColumns} 
              data={recentReports}
              enableColumnResizing={true}
              enableSorting={true}
              enableColumnVisibility={true}
              mobileVisibleColumns={['nome', 'tipo', 'periodo', 'acoes']}
            />
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum relatório gerado</h3>
              <p className="text-gray-600">Os relatórios aparecerão aqui quando forem gerados</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
