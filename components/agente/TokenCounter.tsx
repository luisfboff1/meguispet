import React from 'react'
import { Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TokenCounterProps {
  inputTokens: number
  outputTokens: number
  maxTokens: number
  className?: string
}

function formatTokenCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`
  return String(count)
}

export function TokenCounter({
  inputTokens,
  outputTokens,
  maxTokens,
  className,
}: TokenCounterProps) {
  const totalTokens = inputTokens + outputTokens

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400',
        className
      )}
    >
      <Zap className="h-3 w-3" />
      <span>
        {formatTokenCount(totalTokens)} / {formatTokenCount(maxTokens)}
      </span>
    </div>
  )
}
