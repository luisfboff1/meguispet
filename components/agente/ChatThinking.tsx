import React, { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Bot } from 'lucide-react'

interface ChatThinkingProps {
  status?: string
  reasoning?: string
}

export function ChatThinking({ status = 'Analisando sua pergunta...', reasoning }: ChatThinkingProps) {
  const reasoningRef = useRef<HTMLDivElement>(null)

  // Auto-scroll reasoning text as it grows
  useEffect(() => {
    if (reasoningRef.current) {
      reasoningRef.current.scrollTop = reasoningRef.current.scrollHeight
    }
  }, [reasoning])

  return (
    <div className="flex gap-3 px-4 py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
        <Bot className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      </div>
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Megui
        </span>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="h-2 w-2 rounded-full bg-amber-500"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>
          {status && (
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {status}
            </span>
          )}
        </div>
        {reasoning && (
          <div
            ref={reasoningRef}
            className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-white/50 p-3 dark:border-slate-700 dark:bg-slate-800/50"
          >
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
              {reasoning}
              <motion.span
                className="inline-block ml-0.5 w-1.5 h-3.5 bg-amber-500"
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
