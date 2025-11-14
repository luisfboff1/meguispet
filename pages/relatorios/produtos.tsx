import React, { useState } from 'react'
import { useRouter } from 'next/router'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { ReportConfigWizard } from '@/components/reports/ReportConfigWizard'
import { ProdutosReportViewer } from '@/components/reports/ProdutosReportViewer'
import { useToast } from '@/hooks/useToast'
import { reportsService } from '@/services/reportsService'
import type { ReportConfiguration, ReportFormat, ProdutosReportData } from '@/types/reports'

type Step = 'config' | 'viewing'

export default function ProdutosReportPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [step, setStep] = useState<Step>('config')
  const [currentConfig, setCurrentConfig] = useState<ReportConfiguration | null>(null)
  const [reportData, setReportData] = useState<ProdutosReportData | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleGenerate = async (config: ReportConfiguration, formato: ReportFormat) => {
    try {
      setIsLoading(true)
      setCurrentConfig(config)

      if (formato === 'web') {
        // Gerar para visualização web
        const response = await reportsService.produtos.getData(config)
        setReportData(response)
        setStep('viewing')

        toast({
          title: 'Relatório gerado',
          description: 'Relatório de produtos gerado com sucesso',
          variant: 'success'
        })
      } else {
        // Exportar diretamente (PDF, Excel, CSV)
        const blob = await reportsService.export('produtos', config, formato)

        // Download do arquivo
        const filename = reportsService.getExportFilename(
          'produtos',
          formato,
          config.filtros.periodo.startDate,
          config.filtros.periodo.endDate
        )

        reportsService.downloadReport(blob, filename)

        toast({
          title: 'Relatório exportado',
          description: `Relatório exportado como ${formato.toUpperCase()}`,
          variant: 'success'
        })
      }
    } catch (error) {
      console.error('Erro ao gerar relatório:', error)
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao gerar relatório',
        variant: 'error'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleExport = async (formato: ReportFormat) => {
    if (!currentConfig) return

    try {
      setIsLoading(true)

      const blob = await reportsService.export('produtos', currentConfig, formato)

      // Download do arquivo
      const filename = reportsService.getExportFilename(
        'produtos',
        formato,
        currentConfig.filtros.periodo.startDate,
        currentConfig.filtros.periodo.endDate
      )

      reportsService.downloadReport(blob, filename)

      toast({
        title: 'Relatório exportado',
        description: `Relatório exportado como ${formato.toUpperCase()}`,
        variant: 'success'
      })
    } catch (error) {
      console.error('Erro ao exportar relatório:', error)
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao exportar relatório',
        variant: 'error'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    if (step === 'viewing') {
      setStep('config')
      setReportData(null)
    } else {
      router.push('/relatorios')
    }
  }

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={handleBack}
          className="mb-4"
          disabled={isLoading}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <h1 className="text-3xl font-bold">
          {step === 'config' ? 'Configurar Relatório de Produtos' : 'Relatório de Produtos'}
        </h1>
        <p className="text-muted-foreground mt-1">
          {step === 'config'
            ? 'Configure os parâmetros do relatório de produtos'
            : 'Visualização do relatório gerado'}
        </p>
      </div>

      {/* Content */}
      {step === 'config' && (
        <ReportConfigWizard
          tipo="produtos"
          onGenerate={handleGenerate}
          onCancel={() => router.push('/relatorios')}
        />
      )}

      {step === 'viewing' && reportData && currentConfig && (
        <ProdutosReportViewer
          data={reportData}
          configuracao={currentConfig}
          onExport={handleExport}
        />
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <div className="flex items-center gap-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-lg">Gerando relatório...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
