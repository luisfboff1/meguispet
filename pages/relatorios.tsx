import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import { ColumnDef } from '@tanstack/react-table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Download,
  Calendar,
  FileText,
  Eye,
  ShoppingCart,
  Package,
  Users,
  DollarSign,
  Trash2,
} from 'lucide-react'
import { DataTable, SortableHeader } from '@/components/ui/data-table'
import { ReportCard } from '@/components/reports/ReportCard'
import { reportsService, downloadReport, getExportFilename } from '@/services/reportsService'
import type { ReportFormat, ReportType, SavedReport } from '@/types/reports'
import { formatLocalDate } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'

interface ReportCardEntry {
  key: string
  tipo: ReportType
  title: string
  description: string
  href: string
  icon: React.ReactNode
}

interface ReportHistoryRow {
  id: number
  tipo: ReportType
  nome: string
  periodo: string
  dataGeracao: string
  status: SavedReport['status']
  configuracao: SavedReport['configuracao']
}

export default function RelatoriosPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [recentReports, setRecentReports] = useState<ReportHistoryRow[]>([])
  const [loadingReports, setLoadingReports] = useState(true)
  const [busyId, setBusyId] = useState<number | null>(null)

  const reportTypes: ReportCardEntry[] = [
    {
      key: 'vendas',
      tipo: 'vendas',
      title: 'Relatório de Vendas',
      description: 'Análise completa de vendas, faturamento, impostos e margem de lucro',
      href: '/relatorios/vendas',
      icon: <ShoppingCart className="h-6 w-6" />,
    },
    {
      key: 'vendedores',
      tipo: 'vendas',
      title: 'Relatório de Vendedores',
      description: 'Visão da equipe comercial com ranking, gráfico e detalhamento por vendedor',
      href: '/relatorios/vendas?foco=vendedores',
      icon: <Users className="h-6 w-6" />,
    },
    {
      key: 'produtos',
      tipo: 'produtos',
      title: 'Relatório de Produtos',
      description: 'Produtos mais vendidos, rotatividade de estoque e análise por categoria',
      href: '/relatorios/produtos',
      icon: <Package className="h-6 w-6" />,
    },
    {
      key: 'financeiro',
      tipo: 'financeiro',
      title: 'Relatório Financeiro',
      description: 'DRE completo com receitas, despesas, lucros e margens',
      href: '/relatorios/financeiro',
      icon: <DollarSign className="h-6 w-6" />,
    },
    {
      key: 'clientes',
      tipo: 'clientes',
      title: 'Relatório de Clientes',
      description: 'Ranking de clientes, ticket médio, novos clientes e distribuição por estado',
      href: '/relatorios/clientes',
      icon: <Users className="h-6 w-6" />,
    },
  ]

  const loadReports = useCallback(async () => {
    try {
      setLoadingReports(true)
      const response = await reportsService.savedReports.list(1, 20)

      const mapped = (response.data || []).map((report) => ({
        id: report.id,
        tipo: report.tipo,
        nome: report.nome,
        periodo: `${formatLocalDate(report.periodoInicio)} até ${formatLocalDate(report.periodoFim)}`,
        dataGeracao: report.createdAt,
        status: report.status,
        configuracao: report.configuracao,
      }))

      setRecentReports(mapped)
    } catch (error) {
      toast({
        title: 'Erro ao carregar histórico',
        description: error instanceof Error ? error.message : 'Não foi possível carregar os relatórios salvos',
        variant: 'destructive',
      })
    } finally {
      setLoadingReports(false)
    }
  }, [toast])

  useEffect(() => {
    loadReports()
  }, [loadReports])

  const handleReportConfig = (href: string) => {
    router.push(href)
  }

  const handleViewReport = (id: number) => {
    router.push(`/relatorios/historico/${id}`)
  }

  const handleDeleteReport = async (id: number) => {
    try {
      setBusyId(id)
      await reportsService.savedReports.delete(id)
      setRecentReports((current) => current.filter((report) => report.id !== id))
      toast({
        title: 'Relatório removido',
        description: 'O relatório foi removido do histórico',
        variant: 'default',
      })
    } catch (error) {
      toast({
        title: 'Erro ao remover relatório',
        description: error instanceof Error ? error.message : 'Não foi possível remover o relatório',
        variant: 'destructive',
      })
    } finally {
      setBusyId(null)
    }
  }

  const handleDownloadReport = async (row: ReportHistoryRow) => {
    try {
      setBusyId(row.id)
      const formato: ReportFormat = row.tipo === 'vendas' || row.tipo === 'produtos' || row.tipo === 'financeiro'
        ? 'pdf'
        : 'pdf'
      const blob = await reportsService.export(row.tipo, row.configuracao, formato)
      const filename = getExportFilename(
        row.tipo,
        formato,
        row.configuracao.filtros.periodo.startDate,
        row.configuracao.filtros.periodo.endDate
      )
      downloadReport(blob, filename)
    } catch (error) {
      toast({
        title: 'Erro ao baixar relatório',
        description: error instanceof Error ? error.message : 'Não foi possível exportar o relatório',
        variant: 'destructive',
      })
    } finally {
      setBusyId(null)
    }
  }

  const getStatusColor = (status: ReportHistoryRow['status']) => {
    switch (status) {
      case 'disponivel': return 'text-success'
      case 'processando': return 'text-warning'
      case 'erro': return 'text-destructive'
      default: return 'text-muted-foreground'
    }
  }

  const getStatusLabel = (status: ReportHistoryRow['status']) => {
    switch (status) {
      case 'disponivel': return 'Disponível'
      case 'processando': return 'Processando'
      case 'erro': return 'Erro'
      default: return 'Desconhecido'
    }
  }

  const reportsColumns = useMemo<ColumnDef<ReportHistoryRow>[]>(() => {
    return [
      {
        accessorKey: 'nome',
        header: ({ column }) => <SortableHeader column={column}>Relatório</SortableHeader>,
        cell: ({ row }) => (
          <div className="min-w-[250px]">
            <div className="font-medium text-foreground">{row.original.nome}</div>
            <div className="text-sm text-muted-foreground capitalize">{row.original.tipo}</div>
          </div>
        ),
      },
      {
        accessorKey: 'periodo',
        header: ({ column }) => <SortableHeader column={column}>Período</SortableHeader>,
        cell: ({ row }) => (
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{row.original.periodo}</span>
          </div>
        ),
      },
      {
        accessorKey: 'dataGeracao',
        header: ({ column }) => <SortableHeader column={column}>Data de Geração</SortableHeader>,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatLocalDate(row.original.dataGeracao)}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <SortableHeader column={column}>Status</SortableHeader>,
        cell: ({ row }) => (
          <span className={`text-sm font-medium ${getStatusColor(row.original.status)}`}>
            {getStatusLabel(row.original.status)}
          </span>
        ),
      },
      {
        id: 'acoes',
        header: 'Ações',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              title="Visualizar"
              onClick={() => handleViewReport(row.original.id)}
              disabled={busyId === row.original.id}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              title="Download PDF"
              onClick={() => handleDownloadReport(row.original)}
              disabled={row.original.status !== 'disponivel' || busyId === row.original.id}
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              title="Excluir"
              onClick={() => handleDeleteReport(row.original.id)}
              disabled={busyId === row.original.id}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ]
  }, [busyId])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-4">Tipos de Relatórios</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-6">
          {reportTypes.map((report, index) => (
            <ReportCard
              key={report.key}
              tipo={report.tipo}
              titulo={report.title}
              descricao={report.description}
              icon={report.icon}
              onClick={() => handleReportConfig(report.href)}
              animationDelay={index * 0.1}
            />
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Relatórios</CardTitle>
          <CardDescription>Últimos relatórios gerados e salvos</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingReports ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando histórico...
            </div>
          ) : recentReports.length > 0 ? (
            <DataTable
              columns={reportsColumns}
              data={recentReports}
              enableColumnResizing={true}
              enableSorting={true}
              enableColumnVisibility={true}
              mobileVisibleColumns={['nome', 'periodo', 'acoes']}
            />
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Nenhum relatório gerado</h3>
              <p className="text-muted-foreground">Ao gerar um relatório web, ele ficará disponível aqui no histórico.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
