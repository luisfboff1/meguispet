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
  const foco = router.query.foco === 'vendedores' ? 'vendedores' : 'vendas'
  const pageTitle = foco === 'vendedores' ? 'Relatório de Vendedores' : 'Relatório de Vendas'
  const filePrefix = foco === 'vendedores' ? 'vendedores' : 'vendas'
  const savedName = foco === 'vendedores'
    ? `Relatório de Vendedores - ${new Date().toLocaleDateString('pt-BR')}`
    : `Relatório de Vendas - ${new Date().toLocaleDateString('pt-BR')}`

  const [step, setStep] = useState<'config' | 'viewing'>('config')
  const [reportData, setReportData] = useState<VendasReportData | null>(null)
  const [reportConfig, setReportConfig] = useState<ReportConfiguration | null>(null)

  const getFilename = (formato: ReportFormat, config: ReportConfiguration) => {
    return getExportFilename(
      'vendas',
      formato,
      config.filtros.periodo.startDate,
      config.filtros.periodo.endDate
    ).replace('relatorio_vendas_', `relatorio_${filePrefix}_`)
  }

  const handleGenerate = async (config: ReportConfiguration, formato: ReportFormat) => {
    try {
      if (formato === 'web') {
        const response = await reportsService.generate('vendas', config, 'web', true, savedName)
        setReportData(response.preview?.dados as unknown as VendasReportData)
        setReportConfig(config)
        setStep('viewing')

        toast({
          title: 'Relatório gerado!',
          description: 'Relatório gerado e salvo no histórico',
          variant: 'default',
        })
      } else {
        const blob = await reportsService.export('vendas', config, formato)
        const filename = getFilename(formato, config)
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
    temporal?: { image: string; width: number; height: number }
    vendedor?: { image: string; width: number; height: number }
  }) => {
    if (!reportConfig) return

    try {
      const blob = await reportsService.export('vendas', reportConfig, formato as 'pdf' | 'excel' | 'csv', chartImages)
      const filename = getFilename(formato, reportConfig)
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
