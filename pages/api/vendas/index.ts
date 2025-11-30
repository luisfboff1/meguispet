import { createServerClient } from '@supabase/ssr'
import type { NextApiRequest, NextApiResponse } from 'next'
import type { Venda, ApiResponse, PaginatedResponse } from '@/types'

/**
 * GET /api/vendas
 *
 * Lista vendas com filtros e paginação.
 *
 * Query Parameters:
 * - page: número da página (padrão: 1)
 * - limit: itens por página (padrão: 10)
 * - vendedor_id: filtrar por vendedor específico
 * - cliente_id: filtrar por cliente específico
 * - status: filtrar por status (pendente, pago, cancelado)
 * - data_inicio: filtrar vendas a partir desta data (YYYY-MM-DD)
 * - data_fim: filtrar vendas até esta data (YYYY-MM-DD)
 *
 * Controle de Acesso:
 * - Admin: vê TODAS as vendas
 * - Vendedor: vê APENAS suas próprias vendas (filtro automático)
 * - Financeiro/Gerente: vê TODAS as vendas
 * - Outros: array vazio
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PaginatedResponse<Venda> | ApiResponse>
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
    const limit = parseInt(req.query.limit as string) || 10
    const vendedorIdFilter = req.query.vendedor_id as string | undefined
    const clienteIdFilter = req.query.cliente_id as string | undefined
    const statusFilter = req.query.status as string | undefined
    const dataInicio = req.query.data_inicio as string | undefined
    const dataFim = req.query.data_fim as string | undefined

    // Build query with access control
    let query = supabase
      .from('vendas')
      .select(`
        *,
        cliente:clientes(id, nome, documento),
        vendedor:vendedores(id, nome, email)
      `, { count: 'exact' })

    // Apply access control based on user role and permissions
    const userPermissions = (usuario.permissoes || {}) as Record<string, boolean>
    const canViewAllSales = userPermissions.vendas_visualizar_todas === true
    const isAdmin = usuario.tipo_usuario === 'admin'

    // If user is NOT admin and does NOT have permission to view all sales
    // and has a vendedor_id, filter by their vendedor_id
    if (!isAdmin && !canViewAllSales && usuario.vendedor_id) {
      query = query.eq('vendedor_id', usuario.vendedor_id)
    }

    // Apply optional filters (only if user has permission to view all sales)
    if (vendedorIdFilter && (isAdmin || canViewAllSales)) {
      query = query.eq('vendedor_id', vendedorIdFilter)
    }

    if (clienteIdFilter) {
      query = query.eq('cliente_id', clienteIdFilter)
    }

    if (statusFilter) {
      query = query.eq('status', statusFilter)
    }

    if (dataInicio) {
      query = query.gte('data_venda', dataInicio)
    }

    if (dataFim) {
      query = query.lte('data_venda', dataFim)
    }

    // Apply pagination
    const start = (page - 1) * limit
    const end = start + limit - 1
    query = query.range(start, end)

    // Order by most recent first
    query = query.order('data_venda', { ascending: false })

    // Execute query
    const { data: vendas, error: vendasError, count } = await query

    if (vendasError) {
      console.error('Error fetching vendas:', vendasError)
      return res.status(500).json({
        success: false,
        error: 'Erro ao buscar vendas'
      })
    }

    // Calculate pagination
    const total = count || 0
    const pages = Math.ceil(total / limit)

    return res.status(200).json({
      success: true,
      data: vendas as Venda[],
      pagination: {
        page,
        limit,
        total,
        pages
      }
    })

  } catch (error) {
    console.error('Error in vendas API:', error)
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
}
