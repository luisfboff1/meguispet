import React, { useState } from 'react'
import { useRouter } from 'next/router'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { ReportConfigWizard, FinanceiroReportViewer } from '@/components/reports'
import type { ReportConfiguration, ReportFormat, FinanceiroReportData } from '@/types/reports'
import { reportsService, downloadReport, getExportFilename } from '@/services/reportsService'
import { useToast } from '@/components/ui/use-toast'

export default function FinanceiroReportPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [step, setStep] = useState<'config' | 'viewing'>('config')
  const [reportData, setReportData] = useState<FinanceiroReportData | null>(null)
  const [reportConfig, setReportConfig] = useState<ReportConfiguration | null>(null)

  const handleGenerate = async (config: ReportConfiguration, formato: ReportFormat) => {
    try {
      if (formato === 'web') {
        const response = await reportsService.generate(
          'financeiro',
          config,
          'web',
          true,
          `Relatório Financeiro - ${new Date().toLocaleDateString('pt-BR')}`
        )

        setReportData(response.preview?.dados as unknown as FinanceiroReportData)
        setReportConfig(config)
        setStep('viewing')

        toast({
          title: 'Relatório gerado!',
          description: 'Relatório financeiro gerado e salvo no histórico',
          variant: 'default',
        })
      } else {
        const blob = await reportsService.export('financeiro', config, formato)
        const filename = getExportFilename(
          'financeiro',
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
      toast({
        title: 'Erro ao gerar relatório',
        description: error instanceof Error ? error.message : 'Ocorreu um erro ao gerar o relatório',
        variant: 'destructive',
      })
    }
  }

  const handleExport = async (formato: ReportFormat, chartImages?: {
    receitasMes?: { image: string; width: number; height: number }
    receitasCategoria?: { image: string; width: number; height: number }
    despesasCategoria?: { image: string; width: number; height: number }
  }) => {
    if (!reportConfig) return

    try {
      const blob = await reportsService.export('financeiro', reportConfig, formato as 'pdf' | 'excel' | 'csv', chartImages)
      const filename = getExportFilename(
        'financeiro',
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
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={step === 'viewing' ? handleBack : handleCancel}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </div>

      {step === 'config' ? (
        <Card className="p-6">
          <ReportConfigWizard
            tipo="financeiro"
            onGenerate={handleGenerate}
            onCancel={handleCancel}
          />
        </Card>
      ) : reportData && reportConfig ? (
        <FinanceiroReportViewer
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
