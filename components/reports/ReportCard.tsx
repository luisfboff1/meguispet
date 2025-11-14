import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Settings2 } from 'lucide-react'
import type { ReportType } from '@/types/reports'
import { cn } from '@/lib/utils'

export interface ReportCardProps {
  tipo: ReportType
  titulo: string
  descricao: string
  icon: React.ReactNode
  onClick: () => void
  disabled?: boolean
  animationDelay?: number
}

const reportTypeColors: Record<ReportType, string> = {
  vendas: 'from-emerald-500 to-teal-600',
  produtos: 'from-blue-500 to-indigo-600',
  clientes: 'from-purple-500 to-pink-600',
  financeiro: 'from-amber-500 to-orange-600',
}

const reportTypeIconBg: Record<ReportType, string> = {
  vendas: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  produtos: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  clientes: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  financeiro: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
}

export const ReportCard = ({
  tipo,
  titulo,
  descricao,
  icon,
  onClick,
  disabled = false,
  animationDelay = 0,
}: ReportCardProps) => {
  return (
    <Card
      animationDelay={animationDelay}
      hoverElevation={!disabled}
      className={cn(
        'relative overflow-hidden cursor-pointer transition-all duration-300',
        disabled && 'opacity-60 cursor-not-allowed'
      )}
      onClick={!disabled ? onClick : undefined}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onClick()
        }
      }}
    >
      {/* Gradient accent on top */}
      <div
        className={cn(
          'absolute top-0 left-0 right-0 h-1 bg-gradient-to-r',
          reportTypeColors[tipo]
        )}
      />

      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          {/* Icon */}
          <div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-lg shrink-0',
              reportTypeIconBg[tipo]
            )}
          >
            {icon}
          </div>

          {/* Config button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation()
              if (!disabled) onClick()
            }}
            disabled={disabled}
            aria-label={`Configurar ${titulo}`}
          >
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-1 pt-2">
          <CardTitle className="text-lg">{titulo}</CardTitle>
          <CardDescription className="text-sm line-clamp-2">
            {descricao}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="pb-6">
        <Button
          variant="outline"
          size="sm"
          className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
          disabled={disabled}
          onClick={(e) => e.stopPropagation()}
        >
          Configurar Relatório
        </Button>
      </CardContent>
    </Card>
  )
}

export default ReportCard
