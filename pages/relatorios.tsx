import React, { useState, useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Download, 
  Filter, 
  Calendar,
  BarChart3,
  PieChart,
  TrendingUp,
  FileText,
  Eye
} from 'lucide-react'
import { DataTable, SortableHeader } from '@/components/ui/data-table'

interface ReportData {
  id: string
  tipo: string
  nome: string
  periodo: string
  dataGeracao: string
  status: 'disponivel' | 'processando' | 'erro'
}

export default function RelatoriosPage() {
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  })

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const reportTypes = [
    {
      id: 'vendas',
      title: 'Relatório de Vendas',
      description: 'Vendas por período, vendedor e produto',
      icon: BarChart3,
      color: 'text-blue-600'
    },
    {
      id: 'produtos',
      title: 'Relatório de Produtos',
      description: 'Produtos mais vendidos e estoque',
      icon: PieChart,
      color: 'text-green-600'
    },
    {
      id: 'clientes',
      title: 'Relatório de Clientes',
      description: 'Análise de clientes e compras',
      icon: TrendingUp,
      color: 'text-purple-600'
    },
    {
      id: 'financeiro',
      title: 'Relatório Financeiro',
      description: 'Receitas, despesas e lucros',
      icon: FileText,
      color: 'text-orange-600'
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

      {/* Date Range Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros de Período</CardTitle>
          <CardDescription>Selecione o período para os relatórios</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Inicial
              </label>
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Final
              </label>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
              />
            </div>
            <div className="flex items-end">
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                Aplicar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reportTypes.map((report) => {
          const IconComponent = report.icon
          return (
            <Card key={report.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center`}>
                      <IconComponent className={`h-5 w-5 ${report.color}`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{report.title}</CardTitle>
                      <CardDescription>{report.description}</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Período:</span>
                    <span className="font-medium">
                      {dateRange.start && dateRange.end 
                        ? `${dateRange.start} - ${dateRange.end}`
                        : 'Últimos 30 dias'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Status:</span>
                    <span className="text-green-600 font-medium">Disponível</span>
                  </div>
                  <div className="flex space-x-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Eye className="mr-2 h-4 w-4" />
                      Visualizar
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Download className="mr-2 h-4 w-4" />
                      PDF
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
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
