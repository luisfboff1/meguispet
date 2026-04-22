import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { reportsService } from '@/services/reportsService'
import type {
  FinanceiroReportData,
  ProdutosReportData,
  SavedReport,
  VendasReportData,
} from '@/types/reports'
import {
  FinanceiroReportViewer,
  ProdutosReportViewer,
  VendasReportViewer,
} from '@/components/reports'
import { useToast } from '@/components/ui/use-toast'

export default function HistoricoReportPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { id } = router.query
  const [report, setReport] = useState<SavedReport | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id || Array.isArray(id)) return

    const loadReport = async () => {
      try {
        setLoading(true)
        const saved = await reportsService.savedReports.getById(Number(id))
        setReport(saved)
      } catch (error) {
        toast({
          title: 'Erro ao carregar relatório',
          description: error instanceof Error ? error.message : 'Não foi possível abrir o relatório salvo',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    loadReport()
  }, [id, toast])

  const handleBack = () => {
    router.push('/relatorios')
  }

  if (loading) {
    return <div className="py-12 text-center text-muted-foreground">Carregando relatório...</div>
  }

  if (!report) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <div className="py-12 text-center text-muted-foreground">Relatório não encontrado.</div>
      </div>
    )
  }

  const exportSaved = (formato: 'pdf' | 'excel' | 'csv', chartImages?: Record<string, { image: string; width: number; height: number }>) => {
    return reportsService.export(report.tipo, report.configuracao, formato, chartImages)
      .then((blob) => {
        const filename = `${report.nome.replace(/[^\w.-]+/g, '_')}.${formato === 'excel' ? 'xlsx' : formato}`
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(link.href)
      })
      .catch((error) => {
        toast({
          title: 'Erro ao exportar relatório',
          description: error instanceof Error ? error.message : 'Não foi possível exportar o relatório salvo',
          variant: 'destructive',
        })
      })
  }

  const handleViewerExport = (
    formato: 'web' | 'pdf' | 'excel' | 'csv',
    chartImages?: Record<string, { image: string; width: number; height: number }>
  ) => {
    if (formato === 'web') return
    void exportSaved(formato, chartImages)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{report.nome}</h1>
          <p className="text-muted-foreground capitalize">{report.tipo}</p>
        </div>
      </div>

      {report.tipo === 'vendas' && report.dados ? (
        <VendasReportViewer
          data={((report.dados as { dados?: VendasReportData }).dados || report.dados) as VendasReportData}
          configuracao={report.configuracao}
          onExport={handleViewerExport}
        />
      ) : null}

      {report.tipo === 'produtos' && report.dados ? (
        <ProdutosReportViewer
          data={report.dados as ProdutosReportData}
          configuracao={report.configuracao}
          onExport={handleViewerExport}
        />
      ) : null}

      {report.tipo === 'financeiro' && report.dados ? (
        <FinanceiroReportViewer
          data={((report.dados as { dados?: FinanceiroReportData }).dados || report.dados) as FinanceiroReportData}
          configuracao={report.configuracao}
          onExport={handleViewerExport}
        />
      ) : null}

      {report.tipo === 'clientes' && (
        <Card className="p-6 text-muted-foreground">
          Este relatório salvo é do tipo clientes, mas a visualização dedicada ainda não existe neste projeto.
        </Card>
      )}
    </div>
  )
}
