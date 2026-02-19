import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseServiceRole, getSupabaseServerAuth } from '@/lib/supabase-auth';
import { hashPassword } from '@/lib/password';
import { withAuthRateLimit, RateLimitPresets } from '@/lib/rate-limit';
import { getUserFinalPermissions } from '@/lib/role-permissions';
import type { UserRole } from '@/types';

/**
 * User Signup endpoint using Supabase Auth
 * Creates a user in both Supabase auth.users and custom usuarios table
 *
 * POST /api/auth/signup - Create new user account (rate-limited: 3 attempts/hour)
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  if (method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método não permitido' });
  }

  try {
    const { email, password, nome, tipo_usuario = 'operador' } = req.body;
    const tipoUsuario: UserRole = tipo_usuario as UserRole;

    if (!email || !password || !nome) {
      return res.status(400).json({
        success: false,
        message: 'Email, senha e nome são obrigatórios',
      });
    }

    // Validate email format - using a simple but safe regex
    // This regex avoids catastrophic backtracking by using character classes
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
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

    // 0. Calculate permissions for the role (from DB config or presets)
    const permissoes = await getUserFinalPermissions(supabaseAdmin, tipoUsuario);

    // 1. Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for internal users
      user_metadata: {
        nome,
        tipo_usuario: tipoUsuario,
      },
    });

    if (authError || !authData.user) {
      return res.status(400).json({
        success: false,
        message: authError?.message || 'Erro ao criar usuário no sistema de autenticação',
      });
    }

    // 2. Create user profile in custom usuarios table
    // Hash the password for the usuarios table (legacy compatibility)
    const password_hash = await hashPassword(password);
    
    const usuarioData = {
      email,
      nome,
      password_hash,
      tipo_usuario: tipoUsuario,
      role: tipoUsuario, // backward compat
      permissoes,
      ativo: true,
      supabase_user_id: authData.user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: profileData, error: usuarioError } = await supabaseAdmin
      .from('usuarios')
      .insert(usuarioData)
      .select('id, nome, email, tipo_usuario, role, permissoes, ativo')
      .single();

    if (usuarioError) {
      // Rollback: Delete the auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);

      return res.status(500).json({
        success: false,
        message: 'Erro ao criar perfil do usuário',
        error: usuarioError.message,
      });
    }

    // 3. If role is vendedor, auto-create vendedor record and link bidirectionally
    if (tipoUsuario === 'vendedor' && profileData) {
      try {
        const { data: vendedorData, error: vendedorError } = await supabaseAdmin
          .from('vendedores')
          .insert({
            nome,
            email,
            comissao: 0,
            ativo: true,
            usuario_id: profileData.id,
          })
          .select('id')
          .single();

        if (!vendedorError && vendedorData) {
          // Link usuario → vendedor
          await supabaseAdmin
            .from('usuarios')
            .update({ vendedor_id: vendedorData.id })
            .eq('id', profileData.id);
        }
      } catch {
        // Non-fatal: vendedor link failed, admin can link manually via /admin/vendedores-usuarios
      }
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
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// Apply rate limiting: 3 signup attempts per hour per email
export default withAuthRateLimit(RateLimitPresets.SIGNUP, handler);
