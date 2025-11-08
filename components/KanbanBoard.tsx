import React from 'react'
import { cn } from '@/lib/utils'
import {
  Bug,
  Lightbulb,
  Sparkles,
  HelpCircle,
  AlertCircle,
  Clock,
  CheckCircle2,
  User
} from 'lucide-react'
import type { FeedbackTicket, FeedbackStatus, FeedbackTipo } from '@/types'

interface KanbanBoardProps {
  tickets: Record<FeedbackStatus, FeedbackTicket[]>
  onTicketClick?: (ticket: FeedbackTicket) => void
  onStatusChange?: (ticketId: string, newStatus: FeedbackStatus) => void
  isAdmin?: boolean
}

const statusConfig: Record<
  FeedbackStatus,
  { label: string; color: string; bgColor: string; icon: React.ComponentType<{ size?: number; className?: string }> }
> = {
  backlog: {
    label: 'Backlog',
    color: 'text-slate-600',
    bgColor: 'bg-slate-100 dark:bg-slate-800',
    icon: Clock
  },
  em_andamento: {
    label: 'Em Andamento',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    icon: AlertCircle
  },
  em_teste: {
    label: 'Em Teste',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    icon: AlertCircle
  },
  concluido: {
    label: 'Concluído',
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    icon: CheckCircle2
  },
  cancelado: {
    label: 'Cancelado',
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    icon: CheckCircle2
  }
}

const tipoConfig: Record<
  FeedbackTipo,
  { label: string; icon: React.ComponentType<{ size?: number; className?: string }>; color: string }
> = {
  bug: { label: 'Bug', icon: Bug, color: 'text-red-600' },
  melhoria: { label: 'Melhoria', icon: Lightbulb, color: 'text-amber-600' },
  funcionalidade: { label: 'Funcionalidade', icon: Sparkles, color: 'text-blue-600' },
  outro: { label: 'Outro', icon: HelpCircle, color: 'text-slate-600' }
}

const prioridadeColors = {
  baixa: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
  media: 'bg-blue-200 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  alta: 'bg-orange-200 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
  critica: 'bg-red-200 text-red-700 dark:bg-red-900/50 dark:text-red-300'
}

export default function KanbanBoard({
  tickets,
  onTicketClick,
  onStatusChange,
  isAdmin = false
}: KanbanBoardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, ticket: FeedbackTicket) => {
    if (!isAdmin) {
      e.preventDefault()
      return
    }
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('ticketId', ticket.id)
    e.dataTransfer.setData('currentStatus', ticket.status)
  }

  const handleDragOver = (e: React.DragEvent) => {
    if (!isAdmin) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, newStatus: FeedbackStatus) => {
    if (!isAdmin) return
    e.preventDefault()
    const ticketId = e.dataTransfer.getData('ticketId')
    const currentStatus = e.dataTransfer.getData('currentStatus')
    
    if (ticketId && currentStatus !== newStatus && onStatusChange) {
      onStatusChange(ticketId, newStatus)
    }
  }

  const renderTicketCard = (ticket: FeedbackTicket) => {
    const TipoIcon = tipoConfig[ticket.tipo].icon
    const hasAttachments = (ticket.anexos?.length || 0) > 0
    const hasComments = (ticket.comentarios?.length || 0) > 0

    return (
      <div
        key={ticket.id}
        draggable={isAdmin}
        onDragStart={(e) => handleDragStart(e, ticket)}
        onClick={() => onTicketClick?.(ticket)}
        className={cn(
          'group cursor-pointer rounded-xl border bg-white p-3 sm:p-4 shadow-sm transition-all hover:shadow-md dark:bg-slate-900',
          'border-slate-200 dark:border-slate-700',
          isAdmin && 'hover:scale-[1.02]'
        )}
      >
        {/* Header */}
        <div className="mb-2 sm:mb-3 flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <TipoIcon size={14} className={tipoConfig[ticket.tipo].color} />
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
              {tipoConfig[ticket.tipo].label}
            </span>
          </div>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap flex-shrink-0',
              prioridadeColors[ticket.prioridade]
            )}
          >
            {ticket.prioridade}
          </span>
        </div>

        {/* Title */}
        <h4 className="mb-2 line-clamp-2 text-sm font-semibold text-slate-900 dark:text-white break-words">
          {ticket.titulo}
        </h4>

        {/* Description Preview */}
        <p className="mb-2 sm:mb-3 line-clamp-2 text-xs text-slate-600 dark:text-slate-400 break-words">
          {ticket.descricao}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-2 sm:pt-3 dark:border-slate-800">
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-slate-500 dark:text-slate-400 min-w-0 flex-1">
            <User size={12} className="flex-shrink-0" />
            <span className="truncate">{ticket.usuario?.nome || 'Usuário'}</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {hasAttachments && (
              <span className="rounded-full bg-slate-100 px-1.5 sm:px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400 whitespace-nowrap">
                📎 {ticket.anexos?.length}
              </span>
            )}
            {hasComments && (
              <span className="rounded-full bg-slate-100 px-1.5 sm:px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400 whitespace-nowrap">
                💬 {ticket.comentarios?.length}
              </span>
            )}
          </div>
        </div>

        {/* Date */}
        <div className="mt-2 text-xs text-slate-400">
          {formatDate(ticket.created_at)}
        </div>
      </div>
    )
  }

  const renderColumn = (status: FeedbackStatus) => {
    const config = statusConfig[status]
    const StatusIcon = config.icon
    const columnTickets = tickets[status] || []

    return (
      <div
        key={status}
        className="flex w-full min-w-[280px] sm:min-w-[320px] flex-col rounded-2xl border border-slate-200 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-900/50"
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, status)}
      >
        {/* Column Header */}
        <div className={cn('rounded-t-2xl p-4', config.bgColor)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StatusIcon size={18} className={config.color} />
              <h3 className={cn('font-semibold', config.color)}>{config.label}</h3>
            </div>
            <span
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                config.bgColor,
                config.color
              )}
            >
              {columnTickets.length}
            </span>
          </div>
        </div>

        {/* Column Content */}
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {columnTickets.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-slate-400">
              Nenhum ticket
            </div>
          ) : (
            columnTickets.map(renderTicketCard)
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
      {renderColumn('backlog')}
      {renderColumn('em_andamento')}
      {renderColumn('em_teste')}
      {renderColumn('concluido')}
    </div>
  )
}
