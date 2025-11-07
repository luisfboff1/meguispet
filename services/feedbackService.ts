import { createClient } from '@supabase/supabase-js'
import type {
  FeedbackTicket,
  FeedbackTicketForm,
  FeedbackTicketUpdate,
  FeedbackAnexo,
  FeedbackComentario,
  FeedbackComentarioForm,
  ApiResponse
} from '@/types'

// Initialize Supabase client only if environment variables are available
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null

/**
 * Convert File to base64 string
 */
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // Remove data URL prefix (e.g., "data:image/png;base64,")
        const base64 = reader.result.split(',')[1]
        resolve(base64)
      } else {
        reject(new Error('Failed to convert file to base64'))
      }
    }
    reader.onerror = (error) => reject(error)
  })
}

/**
 * Feedback Service
 * All operations for managing feedback tickets, attachments, and comments
 */
export const feedbackService = {
  /**
   * Get all feedback tickets with optional filtering
   */
  async getAll(filters?: {
    status?: string
    tipo?: string
    usuario_id?: number
  }): Promise<ApiResponse<FeedbackTicket[]>> {
    try {
      if (!supabase) {
        return {
          success: false,
          error: 'Supabase client not initialized'
        }
      }

      let query = supabase
        .from('feedback_tickets')
        .select(`
          *,
          usuario:usuarios!feedback_tickets_usuario_id_fkey(id, nome, email),
          anexos:feedback_anexos(id, nome_arquivo, tipo_arquivo, tamanho_bytes, url),
          comentarios:feedback_comentarios(
            id,
            comentario,
            created_at,
            usuario:usuarios!feedback_comentarios_usuario_id_fkey(id, nome, email)
          )
        `)
        .order('created_at', { ascending: false })

      if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      if (filters?.tipo) {
        query = query.eq('tipo', filters.tipo)
      }
      if (filters?.usuario_id) {
        query = query.eq('usuario_id', filters.usuario_id)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching feedback tickets:', error)
        return {
          success: false,
          error: error.message
        }
      }

      return {
        success: true,
        data: data as FeedbackTicket[]
      }
    } catch (error) {
      console.error('Error in getAll:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  },

  /**
   * Get a single feedback ticket by ID
   */
  async getById(id: string): Promise<ApiResponse<FeedbackTicket>> {
    try {
      if (!supabase) {
        return {
          success: false,
          error: 'Supabase client not initialized'
        }
      }

      const { data, error } = await supabase
        .from('feedback_tickets')
        .select(`
          *,
          usuario:usuarios!feedback_tickets_usuario_id_fkey(id, nome, email),
          anexos:feedback_anexos(*),
          comentarios:feedback_comentarios(
            *,
            usuario:usuarios!feedback_comentarios_usuario_id_fkey(id, nome, email)
          )
        `)
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error fetching feedback ticket:', error)
        return {
          success: false,
          error: error.message
        }
      }

      return {
        success: true,
        data: data as FeedbackTicket
      }
    } catch (error) {
      console.error('Error in getById:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  },

  /**
   * Create a new feedback ticket with attachments
   */
  async create(
    ticketData: FeedbackTicketForm,
    usuarioId: number
  ): Promise<ApiResponse<FeedbackTicket>> {
    try {
      if (!supabase) {
        return {
          success: false,
          error: 'Supabase client not initialized'
        }
      }

      // Create the ticket
      const { data: ticket, error: ticketError } = await supabase
        .from('feedback_tickets')
        .insert({
          titulo: ticketData.titulo,
          descricao: ticketData.descricao,
          tipo: ticketData.tipo,
          prioridade: ticketData.prioridade,
          status: 'backlog',
          usuario_id: usuarioId
        })
        .select()
        .single()

      if (ticketError) {
        console.error('Error creating ticket:', ticketError)
        return {
          success: false,
          error: ticketError.message
        }
      }

      const ticketId = ticket.id

      // Process file attachments
      if (ticketData.anexos && ticketData.anexos.length > 0) {
        const anexosPromises = ticketData.anexos.map(async (file) => {
          const base64 = await fileToBase64(file)
          return {
            ticket_id: ticketId,
            nome_arquivo: file.name,
            tipo_arquivo: file.type,
            tamanho_bytes: file.size,
            conteudo_base64: base64
          }
        })

        const anexosData = await Promise.all(anexosPromises)

        const { error: anexosError } = await supabase
          .from('feedback_anexos')
          .insert(anexosData)

        if (anexosError) {
          console.error('Error creating attachments:', anexosError)
          // Don't fail the whole operation, just log the error
        }
      }

      // Process pasted images
      if (ticketData.imagens_coladas && ticketData.imagens_coladas.length > 0) {
        const imagensData = ticketData.imagens_coladas.map((base64, index) => ({
          ticket_id: ticketId,
          nome_arquivo: `imagem-colada-${index + 1}.png`,
          tipo_arquivo: 'image/png',
          tamanho_bytes: Math.round((base64.length * 3) / 4), // Approximate size
          conteudo_base64: base64
        }))

        const { error: imagensError } = await supabase
          .from('feedback_anexos')
          .insert(imagensData)

        if (imagensError) {
          console.error('Error creating pasted images:', imagensError)
          // Don't fail the whole operation, just log the error
        }
      }

      // Fetch the complete ticket with relations
      return await this.getById(ticketId)
    } catch (error) {
      console.error('Error in create:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  },

  /**
   * Update a feedback ticket (admin only for status changes)
   */
  async update(
    id: string,
    updates: FeedbackTicketUpdate,
    usuarioId: number
  ): Promise<ApiResponse<FeedbackTicket>> {
    try {
      if (!supabase) {
        return {
          success: false,
          error: 'Supabase client not initialized'
        }
      }

      const { data, error } = await supabase
        .from('feedback_tickets')
        .update({
          ...updates,
          updated_by: usuarioId
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating ticket:', error)
        return {
          success: false,
          error: error.message
        }
      }

      return await this.getById(id)
    } catch (error) {
      console.error('Error in update:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  },

  /**
   * Delete a feedback ticket
   */
  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      if (!supabase) {
        return {
          success: false,
          error: 'Supabase client not initialized'
        }
      }

      const { error } = await supabase
        .from('feedback_tickets')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting ticket:', error)
        return {
          success: false,
          error: error.message
        }
      }

      return {
        success: true
      }
    } catch (error) {
      console.error('Error in delete:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  },

  /**
   * Add a comment to a ticket
   */
  async addComment(
    comentarioData: FeedbackComentarioForm,
    usuarioId: number
  ): Promise<ApiResponse<FeedbackComentario>> {
    try {
      if (!supabase) {
        return {
          success: false,
          error: 'Supabase client not initialized'
        }
      }

      const { data, error } = await supabase
        .from('feedback_comentarios')
        .insert({
          ticket_id: comentarioData.ticket_id,
          usuario_id: usuarioId,
          comentario: comentarioData.comentario
        })
        .select(`
          *,
          usuario:usuarios!feedback_comentarios_usuario_id_fkey(id, nome, email)
        `)
        .single()

      if (error) {
        console.error('Error adding comment:', error)
        return {
          success: false,
          error: error.message
        }
      }

      return {
        success: true,
        data: data as FeedbackComentario
      }
    } catch (error) {
      console.error('Error in addComment:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  },

  /**
   * Get tickets grouped by status (for Kanban board)
   */
  async getByStatus(): Promise<
    ApiResponse<Record<string, FeedbackTicket[]>>
  > {
    try {
      const result = await this.getAll()

      if (!result.success || !result.data) {
        return {
          success: false,
          error: result.error || 'Failed to get tickets'
        }
      }

      const grouped: Record<string, FeedbackTicket[]> = {
        backlog: [],
        em_andamento: [],
        em_teste: [],
        concluido: []
      }

      result.data.forEach((ticket) => {
        if (ticket.status in grouped) {
          grouped[ticket.status].push(ticket)
        }
      })

      return {
        success: true,
        data: grouped
      }
    } catch (error) {
      console.error('Error in getByStatus:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}
