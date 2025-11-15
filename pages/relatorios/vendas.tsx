import React, { useState } from 'react'
import { useRouter } from 'next/router'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { ReportConfigWizard, VendasReportViewer } from '@/components/reports'
import type { ReportConfiguration, ReportFormat, VendasReportData } from '@/types/reports'
import { reportsService, downloadReport, getExportFilename } from '@/services/reportsService'
import { useToast } from '@/components/ui/use-toast'

export default function VendasReportPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [step, setStep] = useState<'config' | 'viewing'>('config')
  const [reportData, setReportData] = useState<VendasReportData | null>(null)
  const [reportConfig, setReportConfig] = useState<ReportConfiguration | null>(null)

  const handleGenerate = async (config: ReportConfiguration, formato: ReportFormat) => {
    try {
      if (formato === 'web') {
        // Visualizar no navegador
        const data = await reportsService.vendas.getData(config)
        setReportData(data)
        setReportConfig(config)
        setStep('viewing')

        toast({
          title: 'Relatório gerado!',
          description: 'Relatório gerado com sucesso',
          variant: 'default',
        })
      } else {
        // Exportar arquivo
        const blob = await reportsService.export('vendas', config, formato)
        const filename = getExportFilename(
          'vendas',
          formato,
          config.filtros.periodo.startDate,
          config.filtros.periodo.endDate
        )
        downloadReport(blob, filename)

        toast({
          title: 'Relatório exportado!',
          description: `Arquivo ${filename} baixado com sucesso`,
          variant: 'default',
        })
      }
    } catch (error) {
      console.error('Erro ao gerar relatório:', error)
      toast({
        title: 'Erro ao gerar relatório',
        description: error instanceof Error ? error.message : 'Ocorreu um erro ao gerar o relatório',
        variant: 'destructive',
      })
    }
  }

  const handleExport = async (formato: ReportFormat, chartImages?: {
    temporal?: { image: string; width: number; height: number }
    vendedor?: { image: string; width: number; height: number }
  }) => {
    if (!reportConfig) return

    try {
      const blob = await reportsService.export('vendas', reportConfig, formato as 'pdf' | 'excel' | 'csv', chartImages)
      const filename = getExportFilename(
        'vendas',
        formato,
        reportConfig.filtros.periodo.startDate,
        reportConfig.filtros.periodo.endDate
      )
      downloadReport(blob, filename)

      toast({
        title: 'Relatório exportado!',
        description: `Arquivo ${filename} baixado com sucesso`,
        variant: 'default',
      })
    } catch (error) {
      console.error('Erro ao exportar relatório:', error)
      toast({
        title: 'Erro ao exportar relatório',
        description: error instanceof Error ? error.message : 'Ocorreu um erro ao exportar o relatório',
        variant: 'destructive',
      })
    }
  }

  const handleCancel = () => {
    router.push('/relatorios')
  }

  const handleBack = () => {
    setStep('config')
    setReportData(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={step === 'viewing' ? handleBack : handleCancel}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Relatório de Vendas</h1>
          <p className="text-muted-foreground">
            {step === 'config' ? 'Configure os parâmetros do relatório' : 'Visualização do relatório'}
          </p>
        </div>
      </div>

      {/* Content */}
      {step === 'config' ? (
        <Card className="p-6">
          <ReportConfigWizard
            tipo="vendas"
            onGenerate={handleGenerate}
            onCancel={handleCancel}
          />
        </Card>
      ) : reportData && reportConfig ? (
        <VendasReportViewer
          data={reportData}
          configuracao={reportConfig}
          onExport={handleExport}
        />
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Carregando relatório...</p>
        </div>
      )}
    </div>
  )
}
