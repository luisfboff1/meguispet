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
      ? 'bg-red-500'
      : percentage >= 60
        ? 'bg-amber-500'
        : 'bg-emerald-500'

  return (
    <div
      className={cn(
        'flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400',
        className
      )}
    >
      <span>Contexto</span>
      <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className={cn('h-full rounded-full transition-all duration-300', barColor)}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span>{Math.round(percentage)}%</span>
    </div>
  )
}
