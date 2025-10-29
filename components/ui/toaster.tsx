import React from 'react'
import { useToast } from './use-toast'
import { X } from 'lucide-react'

export function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            px-4 py-3 rounded-lg shadow-lg text-white min-w-[300px] max-w-[400px]
            animate-fade-in
            ${toast.variant === 'destructive' ? 'bg-red-600' : 'bg-green-600'}
          `}
          role="alert"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className="font-medium">{toast.title}</p>
              {toast.description && (
                <p className="text-sm text-white/90 mt-1">{toast.description}</p>
              )}
            </div>
            <button
              onClick={() => dismiss(toast.id)}
              className="text-white/80 hover:text-white flex-shrink-0"
              aria-label="Fechar"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
