import type { NextApiResponse } from 'next'
import { getSupabase } from '@/lib/supabase'
import { withSupabaseAuth, AuthenticatedRequest } from '@/lib/supabase-middleware'

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const { method } = req
  const { id } = req.query

  if (!id || Array.isArray(id)) {
    return res.status(400).json({
      success: false,
      message: 'ID inválido'
    })
  }

  try {
    // Use authenticated supabase client from middleware to respect RLS policies
    const supabase = req.supabaseClient
    const reportId = parseInt(id, 10)

    if (method === 'GET') {
      const { data, error } = await supabase
        .from('relatorios_salvos')
        .select('*')
        .eq('id', reportId)
        .eq('usuario_id', req.user?.id || 1)
        .single()

      if (error) {
        throw error
      }

      if (!data) {
        return res.status(404).json({
          success: false,
          message: 'Relatório não encontrado'
        })
      }

      return res.status(200).json({
        success: true,
        data,
      })

    } else if (method === 'DELETE') {
      const { error } = await supabase
        .from('relatorios_salvos')
        .delete()
        .eq('id', reportId)
        .eq('usuario_id', req.user?.id || 1)

      if (error) {
        throw error
      }

      return res.status(200).json({
        success: true,
        message: 'Relatório deletado com sucesso'
      })

    } else {
      return res.status(405).json({
        success: false,
        message: 'Método não permitido'
      })
    }

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Erro ao processar requisição',
    })
  }
}

export default withSupabaseAuth(handler)
