import React, { useRef, useCallback } from 'react'
import { Send, Square, Paperclip } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ChatInputProps {
  onSend: (message: string) => void
  isStreaming: boolean
  onStop: () => void
  disabled?: boolean
}

export function ChatInput({
  onSend,
  isStreaming,
  onStop,
  disabled = false,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [value, setValue] = React.useState('')

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed || isStreaming || disabled) return

    onSend(trimmed)
    setValue('')

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [value, isStreaming, disabled, onSend])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit]
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setValue(e.target.value)

      // Auto-resize textarea
      const textarea = e.target
      textarea.style.height = 'auto'
      const maxHeight = 6 * 24 // ~6 lines
      textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`
    },
    []
  )

  return (
    <div className="border-t border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-end gap-2">
        {/* Attach button (future) */}
        <button
          className="mb-1 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          title="Anexar arquivo (em breve)"
          disabled
        >
          <Paperclip className="h-5 w-5" />
        </button>

        {/* Input textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Digite sua pergunta..."
          disabled={isStreaming || disabled}
          rows={1}
          className={cn(
            'flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm',
            'placeholder:text-slate-400',
            'focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100',
            'dark:focus:border-amber-500 dark:focus:ring-amber-500/20'
          )}
          style={{ maxHeight: '144px' }}
        />

        {/* Send / Stop button */}
        {isStreaming ? (
          <Button
            onClick={onStop}
            variant="destructive"
            size="icon"
            className="mb-0.5 h-10 w-10 shrink-0 rounded-xl"
            title="Parar"
          >
            <Square className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={!value.trim() || disabled}
            className="mb-0.5 h-10 w-10 shrink-0 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50"
            size="icon"
            title="Enviar (Enter)"
          >
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>

      <p className="mt-1 text-center text-[10px] text-slate-400">
        Enter para enviar, Shift+Enter para nova linha
      </p>
    </div>
  )
}
