import type { NextApiResponse } from 'next'
import {
  withSupabaseAuth,
  type AuthenticatedRequest,
} from '@/lib/supabase-middleware'

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const { method } = req
  const supabase = req.supabaseClient
  const userId = req.user.id

  try {
    // GET - Listar conversas do usuario
    if (method === 'GET') {
      const page = parseInt(req.query.page as string) || 1
      const limit = parseInt(req.query.limit as string) || 20
      const offset = (page - 1) * limit

      const { data, error, count } = await supabase
        .from('agent_conversations')
        .select('*', { count: 'exact' })
        .eq('usuario_id', userId)
        .eq('is_active', true)
        .order('is_pinned', { ascending: false })
        .order('last_message_at', { ascending: false })
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
    }

    // POST - Criar nova conversa
    if (method === 'POST') {
      const { titulo } = req.body

      const { data, error } = await supabase
        .from('agent_conversations')
        .insert({
          usuario_id: userId,
          titulo: titulo || 'Nova conversa',
        })
        .select()
        .single()

      if (error) throw error

      return res.status(201).json({
        success: true,
        data,
      })
    }

    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).json({
      success: false,
      message: `Method ${method} Not Allowed`,
    })
  } catch (error) {
    console.error('[API Agente Conversations] Erro:', error)
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

export default withSupabaseAuth(handler)
