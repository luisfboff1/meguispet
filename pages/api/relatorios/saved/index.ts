import type { NextApiResponse } from 'next'
import { getSupabase } from '@/lib/supabase'
import { withSupabaseAuth, AuthenticatedRequest } from '@/lib/supabase-middleware'

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Método não permitido'
    })
  }

  try {
    const supabase = getSupabase()
    const { page = '1', limit = '10', tipo } = req.query

    const pageNum = parseInt(page as string, 10)
    const limitNum = parseInt(limit as string, 10)
    const offset = (pageNum - 1) * limitNum

    let query = supabase
      .from('relatorios_salvos')
      .select('*', { count: 'exact' })
      .eq('usuario_id', req.user?.id || 1)

    if (tipo) {
      query = query.eq('tipo', tipo)
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1)

    if (error) {
      console.error('[saved/index] Erro ao buscar relatórios:', error)
      throw error
    }

    return res.status(200).json({
      success: true,
      data: data || [],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limitNum),
      },
    })

  } catch (error: any) {
    console.error('[saved/index] Erro:', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Erro ao listar relatórios',
    })
  }
}

export default withSupabaseAuth(handler)
