import type { NextApiResponse } from "next";
import { getSupabase } from "@/lib/supabase";
import {
  AuthenticatedRequest,
  withSupabaseAuth,
} from "@/lib/supabase-middleware";
import { getSupabaseServiceRole } from "@/lib/supabase-auth";

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const { method } = req;

  try {
    // Use authenticated Supabase client for RLS
    const supabase = req.supabaseClient;

    if (method === "GET") {
      // HOTFIX: Admin needs to see all users, but RLS only allows own record
      // Solution: Check if user is admin, then use service role

      // Get current user from auth
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        return res.status(401).json({
          success: false,
          message: "Não autenticado",
        });
      }

      // Get current user's tipo_usuario (RLS allows reading own record)
      const { data: currentUser, error: userError } = await supabase
        .from("usuarios")
        .select("tipo_usuario")
        .eq("supabase_user_id", user.id)
        .single();

      if (userError || !currentUser) {
        return res.status(403).json({
          success: false,
          message: "Usuário não encontrado no sistema",
        });
      }

      // Only admin and gerente can list all users
      if (!['admin', 'gerente'].includes(currentUser.tipo_usuario)) {
        return res.status(403).json({
          success: false,
          message: "Sem permissão para listar usuários",
        });
      }

      // Use service role to list all users (bypasses RLS)
      const supabaseAdmin = getSupabaseServiceRole();

      const { page = "1", limit = "10" } = req.query;
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const offset = (pageNum - 1) * limitNum;

      const { data: usuarios, count, error } = await supabaseAdmin
        .from("usuarios")
        .select(
          "id, nome, email, role, tipo_usuario, roles, permissoes, permissoes_custom, vendedor_id, departamento, ativo, created_at, updated_at",
          { count: "exact" },
        )
        .eq("ativo", true)
        .order("nome", { ascending: true })
        .range(offset, offset + limitNum - 1);

      if (error) throw error;

      return res.status(200).json({
        success: true,
        data: usuarios || [],
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: count || 0,
          pages: Math.ceil((count || 0) / limitNum),
        },
      });
    }

    if (method === "POST") {
      const { nome, email, password, role, permissoes } = req.body;

      if (!nome || !email || !password) {
        return res.status(400).json({
          success: false,
          message: "Nome, email e senha são obrigatórios",
        });
      }

      // Note: User creation now needs to use Supabase Auth signup
      // For now, this endpoint is deprecated for creating auth users
      // It can be used for updating user metadata only
      return res.status(501).json({
        success: false,
        message: "Criação de usuário deve ser feita via Supabase Auth signup",
      });
    }

    if (method === "PUT") {
      // HOTFIX: Check if user is admin before updating (use service role)

      // Get current user from auth
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        return res.status(401).json({
          success: false,
          message: "Não autenticado",
        });
      }

      // Get current user's tipo_usuario (RLS allows reading own record)
      const { data: currentUser, error: userError } = await supabase
        .from("usuarios")
        .select("tipo_usuario, id")
        .eq("supabase_user_id", user.id)
        .single();

      if (userError || !currentUser) {
        return res.status(403).json({
          success: false,
          message: "Usuário não encontrado no sistema",
        });
      }

      // Accept ID from either body or query parameter
      const idFromBody = req.body?.id;
      const idFromQuery = req.query?.id;
      const id = idFromBody || idFromQuery;

      const { nome, email, permissoes } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "ID do usuário é obrigatório",
        });
      }

      // Check permissions: admin can update anyone, users can only update themselves
      const isUpdatingSelf = currentUser.id === parseInt(id as string);
      const isAdmin = ['admin', 'gerente'].includes(currentUser.tipo_usuario);

      if (!isUpdatingSelf && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: "Sem permissão para atualizar este usuário",
        });
      }

      // Use appropriate client based on permissions
      const clientToUse = isAdmin ? getSupabaseServiceRole() : supabase;

      // Only update metadata in usuarios table
      // Password changes should be done via Supabase Auth
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      // Only add fields that were provided
      if (nome !== undefined) updateData.nome = nome;
      if (email !== undefined) updateData.email = email;
      if (req.body.tipo_usuario !== undefined) {
        updateData.tipo_usuario = req.body.tipo_usuario;
      }
      if (req.body.roles !== undefined) updateData.roles = req.body.roles;
      if (permissoes !== undefined) updateData.permissoes = permissoes;
      if (req.body.permissoes_custom !== undefined) {
        updateData.permissoes_custom = req.body.permissoes_custom;
      }
      if (req.body.vendedor_id !== undefined) {
        updateData.vendedor_id = req.body.vendedor_id;
      }
      if (req.body.departamento !== undefined) {
        updateData.departamento = req.body.departamento;
      }

      const { data, error } = await clientToUse
        .from("usuarios")
        .update(updateData)
        .eq("id", id)
        .select(
          "id, nome, email, role, tipo_usuario, roles, permissoes, permissoes_custom, vendedor_id, departamento, ativo, created_at, updated_at",
        );

      if (error) throw error;

      if (!data || data.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Usuário não encontrado",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Usuário atualizado com sucesso",
        data: data[0],
      });
    }

    if (method === "DELETE") {
      // HOTFIX: Check if user is admin before deleting (use service role)

      // Get current user from auth
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        return res.status(401).json({
          success: false,
          message: "Não autenticado",
        });
      }

      // Get current user's tipo_usuario (RLS allows reading own record)
      const { data: currentUser, error: userError } = await supabase
        .from("usuarios")
        .select("tipo_usuario")
        .eq("supabase_user_id", user.id)
        .single();

      if (userError || !currentUser) {
        return res.status(403).json({
          success: false,
          message: "Usuário não encontrado no sistema",
        });
      }

      // Only admin can delete users
      if (currentUser.tipo_usuario !== 'admin') {
        return res.status(403).json({
          success: false,
          message: "Sem permissão para deletar usuários",
        });
      }

      const { id } = req.query;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "ID do usuário é obrigatório",
        });
      }

      // Use service role for delete operation
      const supabaseAdmin = getSupabaseServiceRole();

      const { data, error } = await supabaseAdmin
        .from("usuarios")
        .update({ ativo: false, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Usuário não encontrado",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Usuário removido com sucesso",
      });
    }

    return res.status(405).json({
      success: false,
      message: "Método não permitido",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export default withSupabaseAuth(handler);
