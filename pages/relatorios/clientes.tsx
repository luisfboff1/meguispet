import React, { useState } from 'react'
import { useRouter } from 'next/router'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ReportConfigWizard, ClientesReportViewer } from '@/components/reports'
import { useToast } from '@/components/ui/use-toast'
import { reportsService, downloadReport, getExportFilename } from '@/services/reportsService'
import type { ClientesReportData, ReportConfiguration, ReportFormat } from '@/types/reports'

export default function ClientesReportPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [step, setStep] = useState<'config' | 'viewing'>('config')
  const [reportData, setReportData] = useState<ClientesReportData | null>(null)
  const [reportConfig, setReportConfig] = useState<ReportConfiguration | null>(null)

  const handleGenerate = async (config: ReportConfiguration, formato: ReportFormat) => {
    try {
      if (formato === 'web') {
        const response = await reportsService.generate(
          'clientes',
          config,
          'web',
          true,
          `Relatório de Clientes - ${new Date().toLocaleDateString('pt-BR')}`
        )

        setReportData(response.preview?.dados as unknown as ClientesReportData)
        setReportConfig(config)
        setStep('viewing')

        toast({
          title: 'Relatório gerado!',
          description: 'Relatório de clientes gerado e salvo no histórico',
          variant: 'default',
        })
      } else {
        const blob = await reportsService.export('clientes', config, formato)
        const filename = getExportFilename(
          'clientes',
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

  const handleExport = async (formato: ReportFormat) => {
    if (!reportConfig) return
    if (formato === 'web') return

    try {
      const blob = await reportsService.export('clientes', reportConfig, formato as 'pdf' | 'excel' | 'csv')
      const filename = getExportFilename(
        'clientes',
        formato,
        reportConfig.filtros.periodo.startDate,
        reportConfig.filtros.periodo.endDate
      )
      downloadReport(blob, filename)
    } catch (error) {
      toast({
        title: 'Erro ao exportar relatório',
        description: error instanceof Error ? error.message : 'Ocorreu um erro ao exportar o relatório',
        variant: 'destructive',
      })
    }
  }

  const handleBack = () => {
    if (step === 'viewing') {
      setStep('config')
      setReportData(null)
      return
    }

    router.push('/relatorios')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Relatório de Clientes</h1>
          <p className="text-muted-foreground">
            {step === 'config' ? 'Configure os parâmetros do relatório' : 'Visualização do relatório'}
          </p>
        </div>
      </div>

      {step === 'config' ? (
        <Card className="p-6">
          <ReportConfigWizard
            tipo="clientes"
            onGenerate={handleGenerate}
            onCancel={() => router.push('/relatorios')}
          />
        </Card>
      ) : reportData && reportConfig ? (
        <ClientesReportViewer
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
