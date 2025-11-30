import { createServerClient } from '@supabase/ssr'
import type { NextApiRequest, NextApiResponse } from 'next'
import type { Vendedor, ApiResponse } from '@/types'

/**
 * GET /api/vendedores/by-usuario/[id]
 *
 * Busca vendedor vinculado a um usuário específico pelo usuario_id.
 *
 * Retorna:
 * - Dados completos do vendedor se encontrado
 * - 404 se não houver vendedor vinculado ao usuário
 *
 * Uso:
 * - Dashboard do vendedor: buscar vendedor_id do usuário logado
 * - Admin: buscar vendedor de qualquer usuário
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<Vendedor>>
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }

  const { id } = req.query

  if (!id || Array.isArray(id)) {
    return res.status(400).json({
      success: false,
      error: 'ID do usuário inválido'
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

    // Fetch user data to validate access
    const { data: currentUser, error: userError } = await supabase
      .from('usuarios')
      .select('id, tipo_usuario')
      .eq('supabase_user_id', user.id)
      .single()

    if (userError || !currentUser) {
      return res.status(404).json({
        success: false,
        error: 'Usuário não encontrado'
      })
    }

    // Check permissions: user can only view their own vendedor unless admin
    const isAdmin = currentUser.tipo_usuario === 'admin'
    const requestedUserId = parseInt(id)

    if (!isAdmin && currentUser.id !== requestedUserId) {
      return res.status(403).json({
        success: false,
        error: 'Sem permissão para acessar este vendedor'
      })
    }

    // Query vendedor by usuario_id
    const { data: vendedor, error: vendedorError } = await supabase
      .from('vendedores')
      .select('*')
      .eq('usuario_id', requestedUserId)
      .eq('ativo', true)
      .single()

    if (vendedorError || !vendedor) {
      return res.status(404).json({
        success: false,
        error: 'Vendedor não encontrado para este usuário'
      })
    }

    return res.status(200).json({
      success: true,
      data: vendedor as Vendedor
    })

  } catch (error) {
    console.error('Error in vendedores/by-usuario API:', error)
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
}
