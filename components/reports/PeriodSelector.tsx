import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar } from 'lucide-react'
import type { ReportPeriod } from '@/types/reports'
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export interface PeriodSelectorProps {
  value: ReportPeriod
  onChange: (period: ReportPeriod) => void
  className?: string
}

interface PeriodPreset {
  label: string
  getPeriod: () => ReportPeriod
}

const formatDateToInput = (date: Date): string => {
  return format(date, 'yyyy-MM-dd')
}

const presets: PeriodPreset[] = [
  {
    label: 'Hoje',
    getPeriod: () => {
      const today = new Date()
      return {
        startDate: formatDateToInput(today),
        endDate: formatDateToInput(today),
      }
    },
  },
  {
    label: 'Últimos 7 dias',
    getPeriod: () => {
      const today = new Date()
      const sevenDaysAgo = subDays(today, 6)
      return {
        startDate: formatDateToInput(sevenDaysAgo),
        endDate: formatDateToInput(today),
      }
    },
  },
  {
    label: 'Últimos 30 dias',
    getPeriod: () => {
      const today = new Date()
      const thirtyDaysAgo = subDays(today, 29)
      return {
        startDate: formatDateToInput(thirtyDaysAgo),
        endDate: formatDateToInput(today),
      }
    },
  },
  {
    label: 'Este mês',
    getPeriod: () => {
      const today = new Date()
      return {
        startDate: formatDateToInput(startOfMonth(today)),
        endDate: formatDateToInput(endOfMonth(today)),
      }
    },
  },
  {
    label: 'Mês passado',
    getPeriod: () => {
      const today = new Date()
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1)
      return {
        startDate: formatDateToInput(startOfMonth(lastMonth)),
        endDate: formatDateToInput(endOfMonth(lastMonth)),
      }
    },
  },
  {
    label: 'Este ano',
    getPeriod: () => {
      const today = new Date()
      return {
        startDate: formatDateToInput(startOfYear(today)),
        endDate: formatDateToInput(endOfYear(today)),
      }
    },
  },
]

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  value,
  onChange,
  className,
}) => {
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...value,
      startDate: e.target.value,
    })
  }

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...value,
      endDate: e.target.value,
    })
  }

  const handlePresetClick = (preset: PeriodPreset) => {
    onChange(preset.getPeriod())
  }

  const formatDisplayDate = (dateString: string): string => {
    try {
      const date = new Date(dateString + 'T00:00:00')
      return format(date, 'dd/MM/yyyy', { locale: ptBR })
    } catch {
      return dateString
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg">Período</CardTitle>
        </div>
        <CardDescription>
          Selecione o período do relatório
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date inputs */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="start-date" className="text-sm font-medium">
              Data Inicial
            </label>
            <input
              id="start-date"
              type="date"
              value={value.startDate}
              onChange={handleStartDateChange}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
            {value.startDate && (
              <p className="text-xs text-muted-foreground">
                {formatDisplayDate(value.startDate)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="end-date" className="text-sm font-medium">
              Data Final
            </label>
            <input
              id="end-date"
              type="date"
              value={value.endDate}
              onChange={handleEndDateChange}
              min={value.startDate}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
            {value.endDate && (
              <p className="text-xs text-muted-foreground">
                {formatDisplayDate(value.endDate)}
              </p>
            )}
          </div>
        </div>

        {/* Presets */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Períodos rápidos</p>
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <Button
                key={preset.label}
                variant="outline"
                size="sm"
                onClick={() => handlePresetClick(preset)}
                className="text-xs"
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default PeriodSelector
