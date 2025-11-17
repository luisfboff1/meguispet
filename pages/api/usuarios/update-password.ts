import type { NextApiResponse } from 'next';
import { getSupabaseServiceRole } from '@/lib/supabase-auth';
import { withSupabaseAuth, AuthenticatedRequest } from '@/lib/supabase-middleware';
import { hashPassword } from '@/lib/password';

/**
 * Update user password endpoint
 * Updates password in both Supabase Auth and custom usuarios table
 *
 * PUT /api/usuarios/update-password - Update user password
 */
const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const { method } = req;

  if (method !== 'PUT') {
    return res.status(405).json({ success: false, message: 'Método não permitido' });
  }

  try {
    const { user_id, new_password } = req.body;

    if (!user_id || !new_password) {
      return res.status(400).json({
        success: false,
        message: 'ID do usuário e nova senha são obrigatórios',
      });
    }

    // Validate password strength
    if (new_password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'A senha deve ter pelo menos 6 caracteres',
      });
    }

    // Get service role client for admin operations
    const supabaseAdmin = getSupabaseServiceRole();

    // 1. Get user from usuarios table to find supabase_user_id
    const { data: usuario, error: usuarioError } = await supabaseAdmin
      .from('usuarios')
      .select('id, email, supabase_user_id')
      .eq('id', user_id)
      .single();

    if (usuarioError || !usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado',
      });
    }

    let supabaseUserId = usuario.supabase_user_id;

    // If supabase_user_id is not set, try to find it by email
    if (!supabaseUserId) {
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.listUsers();

      if (!authError && authUser?.users) {
        const foundUser = authUser.users.find(u => u.email === usuario.email);
        if (foundUser) {
          supabaseUserId = foundUser.id;

          // Update the usuarios table with the supabase_user_id
          await supabaseAdmin
            .from('usuarios')
            .update({ supabase_user_id: supabaseUserId })
            .eq('id', user_id);
        }
      }
    }

    // 2. Update password in Supabase Auth
    if (supabaseUserId) {
      const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
        supabaseUserId,
        { password: new_password }
      );

      if (authUpdateError) {
        return res.status(500).json({
          success: false,
          message: 'Erro ao atualizar senha no sistema de autenticação',
          error: authUpdateError.message,
        });
      }
    } else {
      // If no Supabase user exists, create one
      const { data: newAuthUser, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
        email: usuario.email,
        password: new_password,
        email_confirm: true,
      });

      if (createAuthError || !newAuthUser.user) {
        return res.status(500).json({
          success: false,
          message: 'Erro ao criar usuário no sistema de autenticação',
          error: createAuthError?.message,
        });
      }

      supabaseUserId = newAuthUser.user.id;

      // Update usuarios table with new supabase_user_id
      await supabaseAdmin
        .from('usuarios')
        .update({ supabase_user_id: supabaseUserId })
        .eq('id', user_id);
    }

    // 3. Update password hash in usuarios table (for legacy compatibility)
    const password_hash = await hashPassword(new_password);

    const { error: updateHashError } = await supabaseAdmin
      .from('usuarios')
      .update({
        password_hash,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user_id);

    if (updateHashError) {
      return res.status(500).json({
        success: false,
        message: 'Erro ao atualizar hash da senha',
        error: updateHashError.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Senha atualizada com sucesso',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export default withSupabaseAuth(handler);
