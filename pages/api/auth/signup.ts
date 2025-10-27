import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseServiceRole, getSupabaseServerAuth } from '@/lib/supabase-auth';

/**
 * User Signup endpoint using Supabase Auth
 * Creates a user in both Supabase auth.users and custom usuarios table
 * 
 * POST /api/auth/signup - Create new user account
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  if (method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método não permitido' });
  }

  try {
    const { email, password, nome, role = 'user', permissoes = null } = req.body;

    if (!email || !password || !nome) {
      return res.status(400).json({
        success: false,
        message: 'Email, senha e nome são obrigatórios',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Email inválido',
      });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'A senha deve ter pelo menos 6 caracteres',
      });
    }

    // Use service role client for admin operations
    const supabaseAdmin = getSupabaseServiceRole();

    // 1. Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for internal users
      user_metadata: {
        nome,
        role,
      },
    });

    if (authError || !authData.user) {
      console.error('Supabase auth signup error:', authError);
      return res.status(400).json({
        success: false,
        message: authError?.message || 'Erro ao criar usuário no sistema de autenticação',
      });
    }

    // 2. Create user profile in custom usuarios table
    // Try with supabase_user_id first, fallback if column doesn't exist
    const usuarioData: any = {
      email,
      nome,
      role,
      permissoes,
      ativo: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Only add supabase_user_id if the migration has been run
    try {
      usuarioData.supabase_user_id = authData.user.id;
    } catch (e) {
      console.log('supabase_user_id column may not exist yet');
    }

    const { data: profileData, error: usuarioError } = await supabaseAdmin
      .from('usuarios')
      .insert(usuarioData)
      .select('id, nome, email, role, permissoes, ativo')
      .single();

    if (usuarioError) {
      // Rollback: Delete the auth user if profile creation fails
      console.error('Error creating user profile:', usuarioError);
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      
      return res.status(500).json({
        success: false,
        message: 'Erro ao criar perfil do usuário',
        error: usuarioError.message,
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Usuário criado com sucesso',
      data: {
        user: profileData,
        auth_user_id: authData.user.id,
      },
    });
  } catch (error) {
    console.error('Signup API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
