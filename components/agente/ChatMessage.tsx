import React from 'react'
import { Bot, User, Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { SqlQueryPanel } from './SqlQueryPanel'
import type { AgentMessage } from '@/types'

interface ChatMessageProps {
  message: AgentMessage
  isStreaming?: boolean
}

export function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const [copied, setCopied] = React.useState(false)
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formattedTime = message.created_at
    ? new Date(message.created_at).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : ''

  return (
    <div
      className={cn(
        'group flex gap-3 px-4 py-3',
        isUser && 'flex-row-reverse'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          isUser
            ? 'bg-blue-100 dark:bg-blue-900/30'
            : 'bg-amber-100 dark:bg-amber-900/30'
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        ) : (
          <Bot className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        )}
      </div>

      {/* Content */}
      <div
        className={cn(
          'flex max-w-[80%] flex-col gap-1',
          isUser && 'items-end'
        )}
      >
        {/* Header */}
        <div
          className={cn(
            'flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400',
            isUser && 'flex-row-reverse'
          )}
        >
          <span className="font-medium">
            {isUser ? 'Voce' : 'Megui'}
          </span>
          {formattedTime && <span>{formattedTime}</span>}
          {isAssistant && message.model_used && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {message.model_used}
            </Badge>
          )}
        </div>

        {/* Message bubble */}
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
            isUser
              ? 'rounded-tr-md bg-blue-600 text-white'
              : 'rounded-tl-md bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700'
          )}
        >
          {/* SQL Query Panel (assistant only) */}
          {isAssistant && (
            <SqlQueryPanel
              toolCalls={message.tool_calls}
              sqlQueries={message.sql_queries}
            />
          )}

          {/* Message content with basic markdown rendering */}
          <div
            className={cn(
              'whitespace-pre-wrap break-words',
              isAssistant && 'prose prose-sm max-w-none dark:prose-invert'
            )}
          >
            {renderContent(message.content)}
          </div>

          {/* Streaming cursor */}
          {isStreaming && (
            <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-amber-500" />
          )}
        </div>

        {/* Footer - tokens & copy */}
        {isAssistant && !isStreaming && (
          <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
            {message.output_tokens > 0 && (
              <span className="text-[10px] text-slate-400">
                {message.output_tokens} tokens
              </span>
            )}
            <button
              onClick={handleCopy}
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
              title="Copiar resposta"
            >
              {copied ? (
                <Check className="h-3 w-3 text-emerald-500" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Simple markdown-like rendering for bold and lists
 */
function renderContent(content: string): React.ReactNode {
  if (!content) return null

  // Split by **bold** markers
  const parts = content.split(/(\*\*[^*]+\*\*)/g)

  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      )
    }
    return <React.Fragment key={i}>{part}</React.Fragment>
  })
}
