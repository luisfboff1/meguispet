import { createServerClient } from '@supabase/ssr'
import type { NextApiRequest, NextApiResponse } from 'next'
import type { Cliente, ApiResponse } from '@/types'

/**
 * GET /api/clientes/my
 *
 * Retorna os clientes do usuário autenticado.
 *
 * Controle de Acesso:
 * - Admin: retorna TODOS os clientes
 * - Vendedor: retorna APENAS os clientes vinculados ao seu vendedor_id
 * - Financeiro/Gerente: retorna TODOS os clientes
 * - Outros: array vazio
 *
 * Query Parameters:
 * - page: número da página (padrão: 1)
 * - limit: itens por página (padrão: 50)
 * - search: busca por nome ou documento
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<Cliente[]>>
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

    // Fetch user data from database to get permissions
    const { data: usuario, error: usuarioError } = await supabase
      .from('usuarios')
      .select('id, tipo_usuario, permissoes, vendedor_id')
      .eq('supabase_user_id', user.id)
      .single()

    if (usuarioError || !usuario) {
      return res.status(404).json({
        success: false,
        error: 'Usuário não encontrado no banco de dados'
      })
    }

    // Parse query parameters
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 50
    const search = req.query.search as string | undefined

    // Build query with access control
    let query = supabase
      .from('clientes')
      .select('*')
      .eq('ativo', true)

    // Apply access control based on user role and permissions
    const userPermissions = (usuario.permissoes || {}) as Record<string, boolean>
    const canViewAllClientes = userPermissions.clientes_visualizar_todos === true
    const isAdmin = usuario.tipo_usuario === 'admin'

    // If user is NOT admin and does NOT have permission to view all clientes
    // and has a vendedor_id, filter by their vendedor_id
    if (!isAdmin && !canViewAllClientes && usuario.vendedor_id) {
      query = query.eq('vendedor_id', usuario.vendedor_id)
    }

    // Apply search filter
    if (search) {
      query = query.or(`nome.ilike.%${search}%,documento.ilike.%${search}%`)
    }

    // Apply pagination
    const start = (page - 1) * limit
    const end = start + limit - 1
    query = query.range(start, end)

    // Order by name
    query = query.order('nome', { ascending: true })

    // Execute query
    const { data: clientes, error: clientesError } = await query

    if (clientesError) {
      console.error('Error fetching clientes:', clientesError)
      return res.status(500).json({
        success: false,
        error: 'Erro ao buscar clientes'
      })
    }

    return res.status(200).json({
      success: true,
      data: clientes as Cliente[]
    })

  } catch (error) {
    console.error('Error in clientes/my API:', error)
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
}
