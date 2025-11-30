import { createServerClient } from '@supabase/ssr'
import type { NextApiRequest, NextApiResponse } from 'next'
import type { Usuario, ApiResponse } from '@/types'

/**
 * GET /api/usuarios/me
 *
 * Retorna os dados completos do usuário autenticado, incluindo:
 * - Informações básicas (nome, email, tipo_usuario)
 * - Roles (primário + adicionais)
 * - Permissões (calculadas + customizadas)
 * - Vinculação com vendedor (se aplicável)
 *
 * @returns Usuario completo com todas as permissões
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<Usuario>>
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
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

    // Fetch user data from database with all permissions and roles
    const { data: usuario, error: usuarioError } = await supabase
      .from('usuarios')
      .select(`
        id,
        nome,
        email,
        password_hash,
        role,
        tipo_usuario,
        roles,
        permissoes,
        permissoes_custom,
        vendedor_id,
        departamento,
        ativo,
        supabase_user_id,
        created_at,
        updated_at
      `)
      .eq('supabase_user_id', user.id)
      .single()

    if (usuarioError || !usuario) {
      return res.status(404).json({
        success: false,
        error: 'Usuário não encontrado no banco de dados'
      })
    }

    // Return complete user data
    return res.status(200).json({
      success: true,
      data: usuario as Usuario
    })

  } catch (error) {
    console.error('Error fetching user data:', error)
    return res.status(500).json({
      success: false,
      error: 'Erro ao buscar dados do usuário'
    })
  }
}
