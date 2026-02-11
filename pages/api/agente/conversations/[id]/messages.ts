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

  if (method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({
      success: false,
      message: `Method ${method} Not Allowed`,
    })
  }

  if (!conversationId) {
    return res.status(400).json({
      success: false,
      message: 'ID da conversa e obrigatorio',
    })
  }

  try {
    // Verify conversation belongs to user
    const { data: conversation, error: convError } = await supabase
      .from('agent_conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('usuario_id', userId)
      .eq('is_active', true)
      .single()

    if (convError || !conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversa nao encontrada',
      })
    }

    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 50
    const offset = (page - 1) * limit

    const { data, error, count } = await supabase
      .from('agent_messages')
      .select('*', { count: 'exact' })
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) throw error

    return res.status(200).json({
      success: true,
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error('[API Agente Messages] Erro:', error)
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

export default withSupabaseAuth(handler)
