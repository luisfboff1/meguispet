import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { X, Trash2, Edit2, Send } from 'lucide-react'
import type { FeedbackTicket } from '@/types'

interface FeedbackDetailsModalProps {
  ticket: FeedbackTicket
  onClose: () => void
  onDelete?: (ticketId: string) => Promise<void>
  onAddComment?: (ticketId: string, comment: string) => Promise<void>
  isAdmin?: boolean
}

export default function FeedbackDetailsModal({
  ticket,
  onClose,
  onDelete,
  onAddComment,
  isAdmin = false
}: FeedbackDetailsModalProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [isAddingComment, setIsAddingComment] = useState(false)

  const handleDelete = async () => {
    if (!onDelete) return
    
    const confirmed = window.confirm(
      'Tem certeza que deseja excluir este ticket? Esta ação não pode ser desfeita.'
    )
    
    if (!confirmed) return

    setIsDeleting(true)
    try {
      await onDelete(ticket.id)
      onClose()
    } catch (error) {
    } finally {
      setIsDeleting(false)
    }
  }

  const handleAddComment = async () => {
    if (!onAddComment || !newComment.trim()) return

    setIsAddingComment(true)
    try {
      await onAddComment(ticket.id, newComment)
      setNewComment('')
    } catch (error) {
    } finally {
      setIsAddingComment(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTipoBadgeColor = (tipo: string) => {
    const colors = {
      bug: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
      melhoria: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
      funcionalidade: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      outro: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
    }
    return colors[tipo as keyof typeof colors] || colors.outro
  }

  const getPrioridadeBadgeColor = (prioridade: string) => {
    const colors = {
      baixa: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
      media: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      alta: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
      critica: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
    }
    return colors[prioridade as keyof typeof colors] || colors.media
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {ticket.titulo}
          </h2>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${getTipoBadgeColor(ticket.tipo)}`}>
              {ticket.tipo}
            </span>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${getPrioridadeBadgeColor(ticket.prioridade)}`}>
              {ticket.prioridade}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-300">
              {ticket.status.replace('_', ' ')}
            </span>
          </div>
        </div>
        {isAdmin && onDelete && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            <Trash2 size={16} />
            <span className="ml-2">{isDeleting ? 'Excluindo...' : 'Excluir'}</span>
          </Button>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <h3 className="font-semibold text-slate-900 dark:text-white">Descrição</h3>
        <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-400">
          {ticket.descricao}
        </p>
      </div>

      {/* Attachments */}
      {ticket.anexos && ticket.anexos.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-slate-900 dark:text-white">
            Anexos ({ticket.anexos.length})
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {ticket.anexos.map((anexo) => (
              <div
                key={anexo.id}
                className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700"
              >
                {anexo.conteudo_base64 && anexo.tipo_arquivo.startsWith('image/') ? (
                  <div className="space-y-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`data:${anexo.tipo_arquivo};base64,${anexo.conteudo_base64}`}
                      alt={anexo.nome_arquivo}
                      className="h-48 w-full object-cover"
                    />
                    <p className="px-2 pb-2 text-xs text-slate-500 dark:text-slate-400">
                      {anexo.nome_arquivo}
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                      <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                        📎
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                        {anexo.nome_arquivo}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {anexo.tipo_arquivo}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comments */}
      {ticket.comentarios && ticket.comentarios.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-slate-900 dark:text-white">
            Comentários ({ticket.comentarios.length})
          </h3>
          <div className="space-y-3">
            {ticket.comentarios.map((comentario) => (
              <div
                key={comentario.id}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    {comentario.usuario?.nome || 'Usuário'}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {formatDate(comentario.created_at)}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">
                  {comentario.comentario}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Comment */}
      {onAddComment && (
        <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white">
            <Edit2 size={16} className="mr-2 inline" />
            Adicionar Comentário
          </h3>
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Digite seu comentário aqui..."
            rows={3}
            disabled={isAddingComment}
          />
          <div className="flex justify-end">
            <Button
              onClick={handleAddComment}
              disabled={isAddingComment || !newComment.trim()}
              size="sm"
            >
              <Send size={16} />
              <span className="ml-2">
                {isAddingComment ? 'Enviando...' : 'Enviar Comentário'}
              </span>
            </Button>
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="border-t border-slate-200 pt-4 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
        <p>Criado por: {ticket.usuario?.nome || 'Usuário'}</p>
        <p>Data de criação: {formatDate(ticket.created_at)}</p>
        {ticket.updated_at !== ticket.created_at && (
          <p>Última atualização: {formatDate(ticket.updated_at)}</p>
        )}
      </div>
    </div>
  )
}
