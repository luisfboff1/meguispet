import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { NextApiRequest, NextApiResponse } from 'next'
import type { Usuario, ApiResponse } from '@/types'

/**
 * API Routes for /api/usuarios/[id]
 *
 * GET - Get user by ID
 * PUT - Update user (including roles, permissions, vendedor_id)
 * DELETE - Delete user
 */

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<Usuario>>
) {
  const { id } = req.query

  if (!id || Array.isArray(id)) {
    return res.status(400).json({
      success: false,
      error: 'ID inválido'
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

    // Check if current user is admin (only admins can manage users)
    const { data: currentUser } = await supabase
      .from('usuarios')
      .select('tipo_usuario')
      .eq('supabase_user_id', user.id)
      .single()

    if (!currentUser || currentUser.tipo_usuario !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Sem permissão. Apenas administradores podem gerenciar usuários.'
      })
    }

    // Handle different HTTP methods
    switch (req.method) {
      case 'GET':
        return handleGet(supabase, id, res)
      case 'PUT':
        return handlePut(supabase, id, req.body, res)
      case 'DELETE':
        return handleDelete(supabase, id, res)
      default:
        return res.status(405).json({
          success: false,
          error: 'Method not allowed'
        })
    }
  } catch (error) {
    console.error('Error in usuarios API:', error)
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
}

/**
 * GET /api/usuarios/[id]
 * Get user by ID with all data
 */
async function handleGet(
  supabase: SupabaseClient,
  id: string,
  res: NextApiResponse<ApiResponse<Usuario>>
) {
  const { data: usuario, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !usuario) {
    return res.status(404).json({
      success: false,
      error: 'Usuário não encontrado'
    })
  }

  return res.status(200).json({
    success: true,
    data: usuario as Usuario
  })
}

/**
 * PUT /api/usuarios/[id]
 * Update user with new multi-role support
 */
async function handlePut(
  supabase: SupabaseClient,
  id: string,
  body: Partial<Usuario>,
  res: NextApiResponse<ApiResponse<Usuario>>
) {
  // Validate and prepare update data
  const updateData: Record<string, unknown> = {}

  // Basic fields
  if (body.nome !== undefined) updateData.nome = body.nome
  if (body.email !== undefined) updateData.email = body.email
  if (body.ativo !== undefined) updateData.ativo = body.ativo
  if (body.departamento !== undefined) updateData.departamento = body.departamento

  // Role and permissions (new multi-role system)
  if (body.tipo_usuario !== undefined) {
    updateData.tipo_usuario = body.tipo_usuario
  }

  if (body.roles !== undefined) {
    updateData.roles = body.roles
  }

  if (body.permissoes_custom !== undefined) {
    updateData.permissoes_custom = body.permissoes_custom
  }

  // Vendedor link (optional)
  if (body.vendedor_id !== undefined) {
    updateData.vendedor_id = body.vendedor_id
  }

  // Always update timestamp
  updateData.updated_at = new Date().toISOString()

  // Update user in database
  // Note: The trigger 'apply_default_permissions' will automatically
  // recalculate the 'permissoes' field based on tipo_usuario, roles, and permissoes_custom
  const { data: usuario, error } = await supabase
    .from('usuarios')
    .update(updateData)
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    console.error('Error updating user:', error)
    return res.status(500).json({
      success: false,
      error: 'Erro ao atualizar usuário'
    })
  }

  return res.status(200).json({
    success: true,
    data: usuario as Usuario,
    message: 'Usuário atualizado com sucesso'
  })
}

/**
 * DELETE /api/usuarios/[id]
 * Delete user (soft delete by setting ativo = false)
 */
async function handleDelete(
  supabase: SupabaseClient,
  id: string,
  res: NextApiResponse<ApiResponse<Usuario>>
) {
  // Soft delete: set ativo = false instead of actually deleting
  const { data: usuario, error } = await supabase
    .from('usuarios')
    .update({
      ativo: false,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    console.error('Error deleting user:', error)
    return res.status(500).json({
      success: false,
      error: 'Erro ao deletar usuário'
    })
  }

  return res.status(200).json({
    success: true,
    data: usuario as Usuario,
    message: 'Usuário deletado com sucesso'
  })
}
