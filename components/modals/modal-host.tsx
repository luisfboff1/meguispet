import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import type { Easing } from 'framer-motion'
import { X } from 'lucide-react'

import { useModal } from '@/hooks/useModal'
import VendaForm from '@/components/forms/VendaForm'
import ProdutoForm from '@/components/forms/ProdutoForm'
import ClienteForm from '@/components/forms/ClienteForm'
import MovimentacaoForm from '@/components/forms/MovimentacaoForm'
import type {
  ClienteForm as ClienteFormValues,
  MovimentacaoForm as MovimentacaoFormValues,
  Produto,
  ProdutoForm as ProdutoFormValues,
  VendaForm as VendaFormValues
} from '@/types'

interface VendaModalPayload {
  onSubmit: (values: VendaFormValues) => Promise<void> | void
  onCancel?: () => void
  loading?: boolean
  errorMessage?: string
}

interface ProdutoModalPayload {
  onSubmit: (values: ProdutoFormValues) => Promise<void> | void
  onCancel?: () => void
  loading?: boolean
  produto?: Produto
}

interface ClienteModalPayload {
  onSubmit: (values: ClienteFormValues) => Promise<void> | void
  onCancel?: () => void
  loading?: boolean
}

interface MovimentacaoModalPayload {
  onSubmit: (values: MovimentacaoFormValues) => Promise<void> | void
  onCancel?: () => void
  loading?: boolean
}

type ModalPayloadMap = {
  venda: VendaModalPayload
  produto: ProdutoModalPayload
  cliente: ClienteModalPayload
  movimentacao: MovimentacaoModalPayload
  generic: {
    title?: string
    description?: string
    content?: React.ReactNode
    actions?: React.ReactNode
  }
}

type KnownModalId = keyof ModalPayloadMap

const MODAL_EASE: Easing = [0.16, 1, 0.3, 1]

export function ModalHost() {
  const { id, data, isOpen, close } = useModal()
  const [mounted, setMounted] = useState(false)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const lastFocusedElementRef = useRef<Element | null>(null)
  const shouldReduceMotion = useReducedMotion()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || typeof document === 'undefined') return

    const body = document.body
    if (isOpen) {
      body.dataset.modalOpen = 'true'
      body.style.overflow = 'hidden'
    } else {
      delete body.dataset.modalOpen
      if (!body.dataset.sidebarLocked) {
        body.style.overflow = ''
      }
    }

    return () => {
      delete body.dataset.modalOpen
      if (!body.dataset.sidebarLocked) {
        body.style.overflow = ''
      }
    }
  }, [isOpen, mounted])

  useEffect(() => {
    if (!isOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close()
      }

      if (event.key === 'Tab') {
        const modal = closeButtonRef.current?.closest('[role="dialog"]')
        if (!modal) return

        const focusable = modal.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        )
        if (focusable.length === 0) return

        const first = focusable[0]
        const last = focusable[focusable.length - 1]

        if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [close, isOpen])

  useEffect(() => {
    if (!isOpen) return

    lastFocusedElementRef.current = document.activeElement

    const frame = requestAnimationFrame(() => {
      closeButtonRef.current?.focus({ preventScroll: true })
    })

    return () => {
      cancelAnimationFrame(frame)
      const lastFocused = lastFocusedElementRef.current
      if (lastFocused instanceof HTMLElement) {
        lastFocused.focus({ preventScroll: true })
      }
    }
  }, [isOpen])

  const portalTarget = useMemo(() => {
    if (!mounted || typeof document === 'undefined') return null

    const existing = document.getElementById('modal-root')
    if (existing) return existing

    const element = document.createElement('div')
    element.id = 'modal-root'
    document.body.appendChild(element)
    return element
  }, [mounted])

  const renderModalContent = () => {
    const modalId = id as KnownModalId | null
    if (!modalId) return null

    switch (modalId) {
      case 'venda': {
        const payload = (data as ModalPayloadMap['venda']) ?? {
          onSubmit: () => undefined
        }
        return (
          <VendaForm
            onSubmit={payload.onSubmit}
            onCancel={() => {
              payload.onCancel?.()
              close()
            }}
            loading={payload.loading}
            errorMessage={payload.errorMessage}
          />
        )
      }
      case 'produto': {
        const payload = (data as ModalPayloadMap['produto']) ?? {
          onSubmit: () => undefined
        }
        return (
          <ProdutoForm
            produto={payload.produto}
            onSubmit={payload.onSubmit}
            onCancel={() => {
              payload.onCancel?.()
              close()
            }}
            loading={payload.loading}
          />
        )
      }
      case 'cliente': {
        const payload = (data as ModalPayloadMap['cliente']) ?? {
          onSubmit: () => undefined
        }
        return (
          <ClienteForm
            onSubmit={payload.onSubmit}
            onCancel={() => {
              payload.onCancel?.()
              close()
            }}
            loading={payload.loading}
          />
        )
      }
      case 'movimentacao': {
        const payload = (data as ModalPayloadMap['movimentacao']) ?? {
          onSubmit: () => undefined
        }
        return (
          <MovimentacaoForm
            onSubmit={payload.onSubmit}
            onCancel={() => {
              payload.onCancel?.()
              close()
            }}
            loading={payload.loading}
          />
        )
      }
      case 'generic': {
        const payload = (data as ModalPayloadMap['generic']) ?? {}
        return (
          <div className="space-y-4">
            {payload.title && (
              <div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                  {payload.title}
                </h3>
                {payload.description && (
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    {payload.description}
                  </p>
                )}
              </div>
            )}
            {payload.content}
            {payload.actions && (
              <div className="flex justify-end gap-2">{payload.actions}</div>
            )}
          </div>
        )
      }
      default:
        return null
    }
  }

  if (!portalTarget) {
    return null
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.24, ease: MODAL_EASE }}
          className="modal-overlay fixed inset-0 z-[1000] flex items-center justify-center p-6 backdrop-blur-lg"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              close()
            }
          }}
        >
          <motion.div
            key="modal-content"
            role="dialog"
            aria-modal="true"
            initial={shouldReduceMotion ? { opacity: 0 } : { y: 24, opacity: 0, scale: 0.98 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { y: 0, opacity: 1, scale: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { y: 24, opacity: 0, scale: 0.98 }}
            transition={{ duration: shouldReduceMotion ? 0.12 : 0.28, ease: MODAL_EASE }}
            className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-white/40 bg-white/95 p-6 shadow-[0_30px_60px_-15px_rgba(15,23,42,0.35)] backdrop-blur-2xl dark:border-slate-800/60 dark:bg-slate-950/90"
          >
            <button
              ref={closeButtonRef}
              onClick={close}
              className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-transparent bg-white/70 text-slate-500 transition hover:bg-white hover:text-slate-900 dark:bg-slate-900/70 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
              aria-label="Fechar modal"
            >
              <X size={18} />
            </button>
            <div className="max-h-[80vh] overflow-y-auto pr-1">
              {renderModalContent()}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    portalTarget
  )
}
