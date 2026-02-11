import type { NextApiResponse } from 'next'
import {
  withSupabaseAuth,
  type AuthenticatedRequest,
} from '@/lib/supabase-middleware'

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const { method } = req
  const supabase = req.supabaseClient
  const userId = req.user.id
  const conversationId = req.query.id as string

  if (!conversationId) {
    return res.status(400).json({
      success: false,
      message: 'ID da conversa e obrigatorio',
    })
  }

  try {
    // GET - Buscar conversa especifica
    if (method === 'GET') {
      const { data, error } = await supabase
        .from('agent_conversations')
        .select('*')
        .eq('id', conversationId)
        .eq('usuario_id', userId)
        .eq('is_active', true)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({
            success: false,
            message: 'Conversa nao encontrada',
          })
        }
        throw error
      }

      return res.status(200).json({ success: true, data })
    }

    // PUT - Atualizar conversa (titulo, is_pinned)
    if (method === 'PUT') {
      const { titulo, is_pinned } = req.body

      const updateData: Record<string, unknown> = {}
      if (titulo !== undefined) updateData.titulo = titulo
      if (is_pinned !== undefined) updateData.is_pinned = is_pinned

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Nenhum campo para atualizar',
        })
      }

      const { data, error } = await supabase
        .from('agent_conversations')
        .update(updateData)
        .eq('id', conversationId)
        .eq('usuario_id', userId)
        .select()
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({
            success: false,
            message: 'Conversa nao encontrada',
          })
        }
        throw error
      }

      return res.status(200).json({ success: true, data })
    }

    // DELETE - Soft delete (is_active = false)
    if (method === 'DELETE') {
      const { error } = await supabase
        .from('agent_conversations')
        .update({ is_active: false })
        .eq('id', conversationId)
        .eq('usuario_id', userId)

      if (error) throw error

      return res.status(200).json({
        success: true,
        message: 'Conversa removida com sucesso',
      })
    }

    res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
    return res.status(405).json({
      success: false,
      message: `Method ${method} Not Allowed`,
    })
  } catch (error) {
    console.error('[API Agente Conversation] Erro:', error)
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

export default withSupabaseAuth(handler)
