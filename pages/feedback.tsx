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

  const isAdmin = user?.role === 'admin'

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
      console.error('Error loading tickets:', error)
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

  const handleTicketClick = (ticket: FeedbackTicket) => {
    openModal('feedbackDetails', {
      ticket,
      onClose: () => {
        // Reload tickets when modal closes
        loadTickets()
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

    const result = await feedbackService.update(ticketId, { status: newStatus }, user.id)

    if (result.success) {
      toast({
        title: 'Status atualizado',
        description: 'O status do ticket foi atualizado com sucesso'
      })
      await loadTickets()
    } else {
      toast({
        title: 'Erro ao atualizar status',
        description: result.error || 'Erro desconhecido',
        variant: 'destructive'
      })
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
    <div className="h-full space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Feedback & Suporte
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Gerencie bugs, melhorias e novas funcionalidades
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={loadTickets}
            disabled={refreshing}
          >
            <RefreshCw
              size={16}
              className={refreshing ? 'animate-spin' : ''}
            />
            <span className="ml-2">Atualizar</span>
          </Button>
          <Button onClick={handleCreateFeedback}>
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
      {isAdmin && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
          <p className="text-sm text-amber-800 dark:text-amber-300">
            🎯 Como administrador, você pode arrastar os tickets entre as colunas para
            atualizar o status.
          </p>
        </div>
      )}

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
