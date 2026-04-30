import React from 'react'
import { cn } from '@/lib/utils'

interface ContextWindowIndicatorProps {
  usedTokens: number
  maxTokens: number
  className?: string
}

export function ContextWindowIndicator({
  usedTokens,
  maxTokens,
  className,
}: ContextWindowIndicatorProps) {
  const percentage = Math.min((usedTokens / maxTokens) * 100, 100)

  const barColor =
    percentage >= 80
      ? 'bg-destructive'
      : percentage >= 60
        ? 'bg-amber-500'
        : 'bg-success'

  return (
    <div
      className={cn(
        'flex items-center gap-2 text-xs text-muted-foreground',
        className
      )}
    >
      <span>Contexto</span>
      <div className="h-2 w-20 overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full transition-all duration-300', barColor)}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span>{Math.round(percentage)}%</span>
    </div>
  )
}
