import React, { useState, useEffect } from 'react'
import { Plus, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { useModal } from '@/hooks/useModal'
import { useAuth } from '@/hooks/useAuth'
import KanbanBoard from '@/components/KanbanBoard'
import { feedbackService } from '@/services/feedbackService'
import type { FeedbackTicket, FeedbackStatus, FeedbackTicketForm } from '@/types'

export default function FeedbackPage() {
  const { toast } = useToast()
  const { open: openModal } = useModal()
  const { user } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [tickets, setTickets] = useState<Record<FeedbackStatus, FeedbackTicket[]>>({
    backlog: [],
    em_andamento: [],
    em_teste: [],
    concluido: [],
    cancelado: []
  })

  const isAdmin = user?.tipo_usuario === 'admin'

  const loadTickets = async () => {
    try {
      setRefreshing(true)
      const result = await feedbackService.getByStatus()

      if (result.success && result.data) {
        setTickets(result.data)
      } else {
        toast({
          title: 'Erro ao carregar feedbacks',
          description: result.error || 'Erro desconhecido',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Erro ao carregar feedbacks',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadTickets()
  }, [])

  const handleCreateFeedback = () => {
    openModal('feedback', {
      onSubmit: async (formData: FeedbackTicketForm) => {
        if (!user) {
          toast({
            title: 'Erro',
            description: 'Você precisa estar logado para criar um feedback',
            variant: 'destructive'
          })
          return
        }

        const result = await feedbackService.create(formData, user.id)

        if (result.success) {
          toast({
            title: 'Feedback criado!',
            description: 'Seu feedback foi enviado com sucesso e está no backlog.'
          })
          await loadTickets()
        } else {
          toast({
            title: 'Erro ao criar feedback',
            description: result.error || 'Erro desconhecido',
            variant: 'destructive'
          })
          throw new Error(result.error || 'Erro ao criar feedback')
        }
      },
      loading: false
    })
  }

  const handleTicketClick = async (ticket: FeedbackTicket) => {
    // Fetch fresh data to ensure we have the latest
    const freshTicket = await feedbackService.getById(ticket.id)
    const ticketData = freshTicket.success && freshTicket.data ? freshTicket.data : ticket
    
    openModal('feedbackDetails', {
      ticket: ticketData,
      isAdmin,
      onClose: () => {
        loadTickets()
      },
      onDelete: async (ticketId: string) => {
        if (!user) return
        
        const result = await feedbackService.delete(ticketId)
        
        if (result.success) {
          toast({
            title: 'Ticket excluído',
            description: 'O ticket foi excluído com sucesso'
          })
          await loadTickets()
        } else {
          toast({
            title: 'Erro ao excluir ticket',
            description: result.error || 'Erro desconhecido',
            variant: 'destructive'
          })
          throw new Error(result.error || 'Erro ao excluir')
        }
      },
      onAddComment: async (ticketId: string, comment: string) => {
        if (!user) return
        
        const result = await feedbackService.addComment(
          { ticket_id: ticketId, comentario: comment },
          user.id
        )
        
        if (result.success) {
          toast({
            title: 'Comentário adicionado',
            description: 'Seu comentário foi adicionado com sucesso'
          })
          // Refresh the ticket to show the new comment
          const updatedTicket = await feedbackService.getById(ticketId)
          if (updatedTicket.success && updatedTicket.data) {
            handleTicketClick(updatedTicket.data)
          }
        } else {
          toast({
            title: 'Erro ao adicionar comentário',
            description: result.error || 'Erro desconhecido',
            variant: 'destructive'
          })
          throw new Error(result.error || 'Erro ao adicionar comentário')
        }
      }
    })
  }

  const handleStatusChange = async (ticketId: string, newStatus: FeedbackStatus) => {
    if (!isAdmin || !user) {
      toast({
        title: 'Acesso negado',
        description: 'Apenas administradores podem mover tickets',
        variant: 'destructive'
      })
      return
    }

    // Optimistic update - update UI immediately
    setTickets((prevTickets) => {
      const newTickets = { ...prevTickets }
      let movedTicket: FeedbackTicket | null = null

      // Find and remove the ticket from its current status
      for (const status in newTickets) {
        const index = newTickets[status as FeedbackStatus].findIndex(t => t.id === ticketId)
        if (index !== -1) {
          movedTicket = { ...newTickets[status as FeedbackStatus][index], status: newStatus }
          newTickets[status as FeedbackStatus] = newTickets[status as FeedbackStatus].filter(t => t.id !== ticketId)
          break
        }
      }

      // Add to new status column
      if (movedTicket) {
        newTickets[newStatus] = [...newTickets[newStatus], movedTicket]
      }

      return newTickets
    })

    // Persist to database
    const result = await feedbackService.update(ticketId, { status: newStatus }, user.id)

    if (result.success) {
      toast({
        title: 'Status atualizado',
        description: 'O status do ticket foi atualizado com sucesso'
      })
      // Reload to ensure we have the latest data
      await loadTickets()
    } else {
      toast({
        title: 'Erro ao atualizar status',
        description: result.error || 'Erro desconhecido',
        variant: 'destructive'
      })
      // Revert optimistic update on error
      await loadTickets()
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-amber-500" />
          <p className="mt-2 text-sm text-slate-500">Carregando feedbacks...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Feedback & Suporte
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Gerencie bugs, melhorias e novas funcionalidades
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Button
            variant="outline"
            onClick={loadTickets}
            disabled={refreshing}
            className="w-full sm:w-auto"
          >
            <RefreshCw
              size={16}
              className={refreshing ? 'animate-spin' : ''}
            />
            <span className="ml-2">Atualizar</span>
          </Button>
          <Button onClick={handleCreateFeedback} className="w-full sm:w-auto">
            <Plus size={16} />
            <span className="ml-2">Criar Feedback</span>
          </Button>
        </div>
      </div>

      {/* Info Banner for non-admin users */}
      {!isAdmin && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            ℹ️ Você pode criar novos feedbacks, mas apenas administradores podem mover os
            tickets entre as colunas do quadro.
          </p>
        </div>
      )}

      {/* Admin Banner */}
      {/* {isAdmin && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
          <p className="text-sm text-amber-800 dark:text-amber-300">
            🎯 Como administrador, você pode arrastar os tickets entre as colunas para
            atualizar o status.
          </p>
        </div>
      )} */}

      {/* Kanban Board */}
      <KanbanBoard
        tickets={tickets}
        onTicketClick={handleTicketClick}
        onStatusChange={handleStatusChange}
        isAdmin={isAdmin}
      />
    </div>
  )
}
