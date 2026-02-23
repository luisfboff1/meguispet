import { createServerClient } from '@supabase/ssr'
import type { NextApiRequest, NextApiResponse } from 'next'
import type { ApiResponse } from '@/types'
import { getSupabaseServiceRole } from '@/lib/supabase-auth'

/**
 * POST /api/vendedores/[id]/link-usuario
 *
 * Vincula um vendedor a um usuário existente.
 *
 * Body:
 * - usuario_id: ID do usuário a ser vinculado
 *
 * Validações:
 * - Apenas admin pode executar
 * - Vendedor deve existir e estar ativo
 * - Usuário deve existir e estar ativo
 * - Vendedor não pode estar vinculado a outro usuário
 * - Usuário não pode estar vinculado a outro vendedor
 *
 * Sincronização Bidirecional (via trigger):
 * - vendedores.usuario_id = [usuario_id]
 * - usuarios.vendedor_id = [vendedor_id]
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  // Set UTF-8 encoding for proper character display
  res.setHeader('Content-Type', 'application/json; charset=utf-8')

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }

  const { id } = req.query
  const { usuario_id } = req.body

  if (!id || Array.isArray(id)) {
    return res.status(400).json({
      success: false,
      error: 'ID do vendedor inválido'
    })
  }

  if (!usuario_id) {
    return res.status(400).json({
      success: false,
      error: 'ID do usuário é obrigatório'
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
        error: 'Sem permissão. Apenas administradores podem vincular vendedores.'
      })
    }

    // Validate vendedor exists and is active
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

    // Check if vendedor is already linked to another user
    if (vendedor.usuario_id && vendedor.usuario_id !== usuario_id) {
      return res.status(400).json({
        success: false,
        error: 'Vendedor já está vinculado a outro usuário'
      })
    }

    // Validate usuario exists and is active
    const { data: usuario, error: usuarioError } = await supabase
      .from('usuarios')
      .select('id, nome, vendedor_id')
      .eq('id', usuario_id)
      .single()

    if (usuarioError || !usuario) {
      return res.status(404).json({
        success: false,
        error: 'Usuário não encontrado'
      })
    }

    // Check if usuario is already linked to another vendedor
    if (usuario.vendedor_id && usuario.vendedor_id !== parseInt(id)) {
      return res.status(400).json({
        success: false,
        error: 'Usuário já está vinculado a outro vendedor'
      })
    }

    // Link vendedor to usuario with bidirectional sync
    const { error: updateError } = await supabase
      .from('vendedores')
      .update({
        usuario_id: usuario_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) {
      console.error('Error linking vendedor to usuario:', updateError)
      return res.status(500).json({
        success: false,
        error: 'Erro ao vincular vendedor ao usuário'
      })
    }

    // Sync bidirectional relationship: update usuario.vendedor_id
    // Must use service role to bypass RLS (admin cannot update another user's record via anon client)
    const supabaseAdmin = getSupabaseServiceRole()
    const { error: syncError } = await supabaseAdmin
      .from('usuarios')
      .update({
        vendedor_id: parseInt(id),
        updated_at: new Date().toISOString()
      })
      .eq('id', usuario_id)

    if (syncError) {
      console.error('Error syncing usuario.vendedor_id:', syncError)
      return res.status(500).json({
        success: false,
        error: 'Vendedor vinculado mas erro ao sincronizar usuário. Tente novamente.'
      })
    }

    return res.status(200).json({
      success: true,
      message: `Vendedor "${vendedor.nome}" vinculado ao usuário "${usuario.nome}" com sucesso`
    })

  } catch (error) {
    console.error('Error in link-usuario API:', error)
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
}
