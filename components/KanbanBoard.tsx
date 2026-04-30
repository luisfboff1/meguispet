import React from 'react'
import { cn, parseLocalDate } from '@/lib/utils'
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
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    icon: Clock
  },
  em_andamento: {
    label: 'Em Andamento',
    color: 'text-info',
    bgColor: 'bg-info-muted',
    icon: AlertCircle
  },
  em_teste: {
    label: 'Em Teste',
    color: 'text-warning',
    bgColor: 'bg-warning-muted',
    icon: AlertCircle
  },
  concluido: {
    label: 'Concluído',
    color: 'text-success',
    bgColor: 'bg-success-muted',
    icon: CheckCircle2
  },
  cancelado: {
    label: 'Cancelado',
    color: 'text-destructive',
    bgColor: 'bg-destructive/15',
    icon: CheckCircle2
  }
}

const tipoConfig: Record<
  FeedbackTipo,
  { label: string; icon: React.ComponentType<{ size?: number; className?: string }>; color: string }
> = {
  bug: { label: 'Bug', icon: Bug, color: 'text-destructive' },
  melhoria: { label: 'Melhoria', icon: Lightbulb, color: 'text-warning' },
  funcionalidade: { label: 'Funcionalidade', icon: Sparkles, color: 'text-info' },
  outro: { label: 'Outro', icon: HelpCircle, color: 'text-muted-foreground' }
}

const prioridadeColors = {
  baixa: 'bg-muted text-muted-foreground',
  media: 'bg-info-muted text-info',
  alta: 'bg-warning-muted text-warning',
  critica: 'bg-destructive/15 text-destructive'
}

export default function KanbanBoard({
  tickets,
  onTicketClick,
  onStatusChange,
  isAdmin = false
}: KanbanBoardProps) {
  const formatDate = (dateString: string) => {
    const date = parseLocalDate(dateString)
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
          'group cursor-pointer rounded-xl border bg-card p-3 sm:p-4 shadow-sm transition-all hover:shadow-md',
          'border-border',
          isAdmin && 'hover:scale-[1.02]'
        )}
      >
        {/* Header */}
        <div className="mb-2 sm:mb-3 flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <TipoIcon size={14} className={tipoConfig[ticket.tipo].color} />
            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
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
        <h4 className="mb-2 line-clamp-2 text-sm font-semibold text-foreground break-words">
          {ticket.titulo}
        </h4>

        {/* Description Preview */}
        <p className="mb-2 sm:mb-3 line-clamp-2 text-xs text-muted-foreground break-words">
          {ticket.descricao}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border pt-2 sm:pt-3">
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-muted-foreground min-w-0 flex-1">
            <User size={12} className="flex-shrink-0" />
            <span className="truncate">{ticket.usuario?.nome || 'Usuário'}</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {hasAttachments && (
              <span className="rounded-full bg-muted px-1.5 sm:px-2 py-0.5 text-xs text-muted-foreground whitespace-nowrap">
                📎 {ticket.anexos?.length}
              </span>
            )}
            {hasComments && (
              <span className="rounded-full bg-muted px-1.5 sm:px-2 py-0.5 text-xs text-muted-foreground whitespace-nowrap">
                💬 {ticket.comentarios?.length}
              </span>
            )}
          </div>
        </div>

        {/* Date */}
        <div className="mt-2 text-xs text-muted-foreground">
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
        className="flex w-full min-w-[280px] sm:min-w-[320px] flex-col rounded-2xl border border-border bg-muted"
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
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
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
