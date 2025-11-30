import { createServerClient } from '@supabase/ssr'
import type { NextApiRequest, NextApiResponse } from 'next'
import type { ApiResponse, Usuario } from '@/types'
import bcrypt from 'bcryptjs'

/**
 * POST /api/vendedores/[id]/create-usuario
 *
 * Cria automaticamente um usuário para um vendedor e vincula.
 *
 * Body:
 * - email: Email do usuário (opcional, usa email do vendedor se não fornecido)
 * - senha: Senha inicial do usuário (opcional, gera senha automática se não fornecido)
 *
 * Funcionalidade:
 * 1. Cria novo usuário no Supabase Auth
 * 2. Cria registro na tabela 'usuarios' com tipo_usuario = 'vendedor'
 * 3. Vincula bidirecional vendedor ↔ usuario (via trigger)
 * 4. Aplica permissões padrão de vendedor (via trigger)
 *
 * Validações:
 * - Apenas admin pode executar
 * - Vendedor deve existir e estar ativo
 * - Vendedor não pode estar vinculado a outro usuário
 * - Email não pode estar em uso
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<Usuario>>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }

  const { id } = req.query
  const { email: customEmail, senha: customSenha } = req.body

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
        error: 'Sem permissão. Apenas administradores podem criar usuários.'
      })
    }

    // Validate vendedor exists and is active
    const { data: vendedor, error: vendedorError } = await supabase
      .from('vendedores')
      .select('id, nome, email, usuario_id')
      .eq('id', id)
      .eq('ativo', true)
      .single()

    if (vendedorError || !vendedor) {
      return res.status(404).json({
        success: false,
        error: 'Vendedor não encontrado ou inativo'
      })
    }

    // Check if vendedor is already linked
    if (vendedor.usuario_id) {
      return res.status(400).json({
        success: false,
        error: 'Vendedor já está vinculado a um usuário'
      })
    }

    // Use vendedor email if not provided
    const email = customEmail || vendedor.email
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email é obrigatório (vendedor não possui email cadastrado)'
      })
    }

    // Generate password if not provided
    const senha = customSenha || generatePassword()

    // Hash password
    const password_hash = await bcrypt.hash(senha, 10)

    // Create user in Supabase Auth
    const { data: authUser, error: createAuthError } = await supabase.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true // Auto-confirm email
    })

    if (createAuthError || !authUser.user) {
      console.error('Error creating auth user:', createAuthError)
      return res.status(500).json({
        success: false,
        error: 'Erro ao criar usuário no Supabase Auth'
      })
    }

    // Create user in database
    const { data: novoUsuario, error: createUserError } = await supabase
      .from('usuarios')
      .insert({
        nome: vendedor.nome,
        email,
        password_hash,
        tipo_usuario: 'vendedor',
        supabase_user_id: authUser.user.id,
        ativo: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('*')
      .single()

    if (createUserError || !novoUsuario) {
      console.error('Error creating user in database:', createUserError)

      // Rollback: delete auth user
      await supabase.auth.admin.deleteUser(authUser.user.id)

      return res.status(500).json({
        success: false,
        error: 'Erro ao criar usuário no banco de dados'
      })
    }

    // Link vendedor to usuario (trigger will sync bidirectionally and apply permissions)
    const { error: linkError } = await supabase
      .from('vendedores')
      .update({
        usuario_id: novoUsuario.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (linkError) {
      console.error('Error linking vendedor to usuario:', linkError)
      return res.status(500).json({
        success: false,
        error: 'Usuário criado mas erro ao vincular ao vendedor'
      })
    }

    return res.status(201).json({
      success: true,
      data: novoUsuario as Usuario,
      message: `Usuário criado e vinculado ao vendedor "${vendedor.nome}" com sucesso. Senha: ${senha}`
    })

  } catch (error) {
    console.error('Error in create-usuario API:', error)
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
}

/**
 * Generate random password
 */
function generatePassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}
