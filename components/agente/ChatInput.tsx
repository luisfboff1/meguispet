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
    <div className="border-t bg-card p-3">
      <div className="flex items-end gap-2">
        {/* Attach button (future) */}
        <button
          className="mb-1 rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
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
            'flex-1 resize-none rounded-xl border bg-muted px-4 py-2.5 text-sm text-foreground',
            'placeholder:text-muted-foreground',
            'focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20',
            'disabled:cursor-not-allowed disabled:opacity-50'
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

      <p className="mt-1 text-center text-[10px] text-muted-foreground">
        Enter para enviar, Shift+Enter para nova linha
      </p>
    </div>
  )
}
