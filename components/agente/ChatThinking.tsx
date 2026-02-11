import React from 'react'
import { motion } from 'framer-motion'
import { Bot } from 'lucide-react'

interface ChatThinkingProps {
  status?: string
}

export function ChatThinking({ status = 'Analisando sua pergunta...' }: ChatThinkingProps) {
  return (
    <div className="flex gap-3 px-4 py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
        <Bot className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      </div>
      <div className="flex flex-col gap-1">
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
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {status}
          </span>
        </div>
      </div>
    </div>
  )
}
