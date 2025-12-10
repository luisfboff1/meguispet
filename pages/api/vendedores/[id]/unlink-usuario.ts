import { createServerClient } from '@supabase/ssr'
import type { NextApiRequest, NextApiResponse } from 'next'
import type { ApiResponse } from '@/types'

/**
 * DELETE /api/vendedores/[id]/unlink-usuario
 *
 * Remove vinculação entre vendedor e usuário.
 *
 * Validações:
 * - Apenas admin pode executar
 * - Vendedor deve existir
 *
 * Sincronização Bidirecional (via trigger):
 * - vendedores.usuario_id = NULL
 * - usuarios.vendedor_id = NULL
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  // Set UTF-8 encoding for proper character display
  res.setHeader('Content-Type', 'application/json; charset=utf-8')

  // Only allow DELETE requests
  if (req.method !== 'DELETE') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }

  const { id } = req.query

  if (!id || Array.isArray(id)) {
    return res.status(400).json({
      success: false,
      error: 'ID do vendedor inválido'
    })
  }

  try {
    // Create Supabase client for API route
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return Object.keys(req.cookies).map(name => ({
              name,
              value: req.cookies[name] || ''
            }))
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              res.setHeader('Set-Cookie', `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict`)
            })
          },
        },
      }
    )

    // Get authenticated user from Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return res.status(401).json({
        success: false,
        error: 'Não autenticado'
      })
    }

    // Check if current user is admin
    const { data: currentUser } = await supabase
      .from('usuarios')
      .select('tipo_usuario')
      .eq('supabase_user_id', user.id)
      .single()

    if (!currentUser || currentUser.tipo_usuario !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Sem permissão. Apenas administradores podem desvincular vendedores.'
      })
    }

    // Validate vendedor exists
    const { data: vendedor, error: vendedorError } = await supabase
      .from('vendedores')
      .select('id, nome, usuario_id')
      .eq('id', id)
      .single()

    if (vendedorError || !vendedor) {
      return res.status(404).json({
        success: false,
        error: 'Vendedor não encontrado'
      })
    }

    // Check if vendedor is linked
    if (!vendedor.usuario_id) {
      return res.status(400).json({
        success: false,
        error: 'Vendedor não está vinculado a nenhum usuário'
      })
    }

    // Store the usuario_id before unlinking for bidirectional sync
    const previousUsuarioId = vendedor.usuario_id

    // Unlink vendedor from usuario with bidirectional sync
    const { error: updateError } = await supabase
      .from('vendedores')
      .update({
        usuario_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) {
      console.error('Error unlinking vendedor from usuario:', updateError)
      return res.status(500).json({
        success: false,
        error: 'Erro ao desvincular vendedor do usuário'
      })
    }

    // Sync bidirectional relationship: remove usuario.vendedor_id
    if (previousUsuarioId) {
      const { error: syncError } = await supabase
        .from('usuarios')
        .update({
          vendedor_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', previousUsuarioId)

      if (syncError) {
        console.error('Error syncing usuario.vendedor_id removal:', syncError)
        // Don't fail the request, but log the error
      }
    }

    return res.status(200).json({
      success: true,
      message: `Vendedor "${vendedor.nome}" desvinculado com sucesso`
    })

  } catch (error) {
    console.error('Error in unlink-usuario API:', error)
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
}
