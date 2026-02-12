import React from 'react'
import { Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TokenCounterProps {
  inputTokens: number
  outputTokens: number
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
  className,
}: TokenCounterProps) {
  const totalTokens = inputTokens + outputTokens

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300',
        className
      )}
      title={`Total da conversa: ${inputTokens.toLocaleString()} input + ${outputTokens.toLocaleString()} output`}
    >
      <Zap className="h-3.5 w-3.5 text-amber-500" />
      <span className="font-medium">
        {formatTokenCount(totalTokens)} tokens
      </span>
      <span className="text-[10px] text-slate-400">
        ({formatTokenCount(inputTokens)} in / {formatTokenCount(outputTokens)} out)
      </span>
    </div>
  )
}
