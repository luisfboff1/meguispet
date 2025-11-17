import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Check, Loader2 } from 'lucide-react'
import { PeriodSelector } from './PeriodSelector'
import { FilterPanel } from './FilterPanel'
import { MetricsSelector } from './MetricsSelector'
import type {
  ReportType,
  ReportPeriod,
  ReportFilters,
  ReportMetrics,
  ReportCharts,
  ReportConfiguration,
  ReportFormat,
} from '@/types/reports'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

export interface ReportConfigWizardProps {
  tipo: ReportType
  onGenerate: (config: ReportConfiguration, formato: ReportFormat) => Promise<void>
  onCancel: () => void
  className?: string
}

const steps = ['Período', 'Filtros', 'Métricas', 'Formato']

const defaultPeriod = (): ReportPeriod => {
  const today = new Date()
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(today.getDate() - 29)

  return {
    startDate: format(thirtyDaysAgo, 'yyyy-MM-dd'),
    endDate: format(today, 'yyyy-MM-dd'),
  }
}

export const ReportConfigWizard: React.FC<ReportConfigWizardProps> = ({
  tipo,
  onGenerate,
  onCancel,
  className,
}) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)

  // Estado do wizard
  const [periodo, setPeriodo] = useState<ReportPeriod>(defaultPeriod())
  const [filters, setFilters] = useState<Partial<ReportFilters>>({})
  const [metrics, setMetrics] = useState<ReportMetrics>({})
  const [charts, setCharts] = useState<ReportCharts>({})
  const [formato, setFormato] = useState<ReportFormat>('web')

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleGenerate = async () => {
    setIsGenerating(true)

    try {
      const config: ReportConfiguration = {
        tipo,
        filtros: {
          ...filters,
          periodo,
        },
        metricas: metrics,
        graficos: charts,
      }

      await onGenerate(config, formato)
    } catch (error) {
    } finally {
      setIsGenerating(false)
    }
  }

  const clearFilters = () => {
    setFilters({})
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <PeriodSelector
            value={periodo}
            onChange={setPeriodo}
          />
        )
      case 1:
        return (
          <FilterPanel
            tipo={tipo}
            filters={filters}
            onChange={setFilters}
            onClear={clearFilters}
          />
        )
      case 2:
        return (
          <MetricsSelector
            tipo={tipo}
            metrics={metrics}
            charts={charts}
            onMetricsChange={setMetrics}
            onChartsChange={setCharts}
          />
        )
      case 3:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Formato de Exportação</CardTitle>
              <CardDescription>
                Escolha como deseja visualizar ou exportar o relatório
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <label
                className={cn(
                  'flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors',
                  formato === 'web'
                    ? 'bg-primary/5 border-primary/20'
                    : 'hover:bg-muted/50'
                )}
              >
                <input
                  type="radio"
                  name="formato"
                  value="web"
                  checked={formato === 'web'}
                  onChange={(e) => setFormato(e.target.value as ReportFormat)}
                  className="mt-0.5 h-4 w-4"
                />
                <div className="flex-1">
                  <div className="font-medium">Visualizar no Navegador</div>
                  <div className="text-sm text-muted-foreground">
                    Exibir relatório interativo com gráficos
                  </div>
                </div>
              </label>

              <label
                className={cn(
                  'flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors',
                  formato === 'pdf'
                    ? 'bg-primary/5 border-primary/20'
                    : 'hover:bg-muted/50'
                )}
              >
                <input
                  type="radio"
                  name="formato"
                  value="pdf"
                  checked={formato === 'pdf'}
                  onChange={(e) => setFormato(e.target.value as ReportFormat)}
                  className="mt-0.5 h-4 w-4"
                />
                <div className="flex-1">
                  <div className="font-medium">Exportar PDF</div>
                  <div className="text-sm text-muted-foreground">
                    Relatório formatado para impressão
                  </div>
                </div>
              </label>

              <label
                className={cn(
                  'flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors',
                  formato === 'excel'
                    ? 'bg-primary/5 border-primary/20'
                    : 'hover:bg-muted/50'
                )}
              >
                <input
                  type="radio"
                  name="formato"
                  value="excel"
                  checked={formato === 'excel'}
                  onChange={(e) => setFormato(e.target.value as ReportFormat)}
                  className="mt-0.5 h-4 w-4"
                />
                <div className="flex-1">
                  <div className="font-medium">Exportar Excel</div>
                  <div className="text-sm text-muted-foreground">
                    Planilha com dados e fórmulas
                  </div>
                </div>
              </label>

              <label
                className={cn(
                  'flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors',
                  formato === 'csv'
                    ? 'bg-primary/5 border-primary/20'
                    : 'hover:bg-muted/50'
                )}
              >
                <input
                  type="radio"
                  name="formato"
                  value="csv"
                  checked={formato === 'csv'}
                  onChange={(e) => setFormato(e.target.value as ReportFormat)}
                  className="mt-0.5 h-4 w-4"
                />
                <div className="flex-1">
                  <div className="font-medium">Exportar CSV</div>
                  <div className="text-sm text-muted-foreground">
                    Dados brutos para análise externa
                  </div>
                </div>
              </label>
            </CardContent>
          </Card>
        )
      default:
        return null
    }
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Stepper */}
      <div className="flex items-center justify-center">
        {steps.map((step, index) => (
          <React.Fragment key={step}>
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors',
                  index === currentStep
                    ? 'border-primary bg-primary text-primary-foreground'
                    : index < currentStep
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-muted bg-background text-muted-foreground'
                )}
              >
                {index < currentStep ? (
                  <Check className="h-5 w-5" />
                ) : (
                  index + 1
                )}
              </div>
              <span className="mt-2 text-xs font-medium hidden sm:block">
                {step}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'mx-4 h-0.5 w-12 sm:w-20 transition-colors',
                  index < currentStep ? 'bg-primary' : 'bg-muted'
                )}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step Content */}
      <div>{renderStepContent()}</div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-4">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>

        <div className="flex gap-2">
          {currentStep > 0 && (
            <Button variant="outline" onClick={handleBack}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          )}

          {currentStep < steps.length - 1 ? (
            <Button onClick={handleNext}>
              Próximo
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Gerar Relatório
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ReportConfigWizard
