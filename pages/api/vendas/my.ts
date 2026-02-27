import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import type { Venda } from "@/types";

/**
 * API: GET /api/vendas/my
 *
 * Retorna as vendas do usuário autenticado baseado em seu tipo_usuario:
 * - Admin/Gerente/Financeiro: TODAS as vendas
 * - Vendedor: APENAS suas vendas (filtrado por vendedor_id)
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  try {
    // Service role client para buscar dados
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    // Verificar autenticação
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, error: "Não autenticado" });
    }

    const token = authHeader.substring(7);

    // Verificar token e obter usuário
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      token,
    );

    if (authError || !user) {
      return res.status(401).json({
        success: false,
        error: "Sessão expirada. Faça login novamente.",
      });
    }

    // Buscar dados do usuário
    const { data: usuario, error: userError } = await supabase
      .from("usuarios")
      .select("id, tipo_usuario, vendedor_id")
      .eq("supabase_user_id", user.id)
      .single();

    console.log("[vendas/my] Usuário encontrado no banco:", {
      supabase_user_id: user.id,
      usuario_id: usuario?.id,
      tipo_usuario: usuario?.tipo_usuario,
      vendedor_id: usuario?.vendedor_id ??
        "NULL (sem vínculo - vendas não serão filtradas)",
      userError: userError?.message ?? null,
    });

    if (userError || !usuario) {
      return res.status(404).json({
        success: false,
        error: "Usuário não encontrado",
      });
    }

    // Query base de vendas
    let query = supabase
      .from("vendas")
      .select(`
        *,
        cliente:cliente_id(id, nome, documento, telefone, email),
        vendedor:vendedor_id(id, nome, email, comissao),
        itens:vendas_itens(
          *,
          produto:produto_id(id, nome, preco_venda)
        ),
        parcelas:venda_parcelas(*)
      `)
      .order("created_at", { ascending: false });

    // Filtrar baseado no tipo_usuario
    if (usuario.tipo_usuario === "vendedor" && usuario.vendedor_id) {
      // Vendedor: apenas suas vendas
      console.log(
        `[vendas/my] Filtrando vendas por vendedor_id=${usuario.vendedor_id} (usuário ${usuario.id})`,
      );
      query = query.eq("vendedor_id", usuario.vendedor_id);
    } else if (usuario.tipo_usuario === "vendedor" && !usuario.vendedor_id) {
      console.warn(
        `[vendas/my] ⚠️ Usuário ${usuario.id} é vendedor MAS não tem vendedor_id! Nenhuma venda será retornada. Verifique vinculos na tabela usuarios e vendedores.`,
      );
    } else {
      console.log(
        `[vendas/my] Usuário ${usuario.id} (${usuario.tipo_usuario}): retornando TODAS as vendas (sem filtro de vendedor)`,
      );
    }
    // Admin, Gerente, Financeiro: todas as vendas (sem filtro)

    // Executar query
    const { data: vendas, error: vendasError } = await query.limit(100);

    console.log(
      `[vendas/my] Resultado: ${
        vendas?.length ?? 0
      } vendas encontradas para usuário ${usuario.id} (${usuario.tipo_usuario}, vendedor_id=${
        usuario.vendedor_id ?? "NULL"
      })`,
    );

    if (vendasError) {
      console.error("Erro ao buscar vendas:", vendasError);
      return res.status(500).json({
        success: false,
        error: "Erro ao buscar vendas",
      });
    }

    return res.json({
      success: true,
      data: vendas as Venda[],
      usuario: {
        tipo_usuario: usuario.tipo_usuario,
        vendedor_id: usuario.vendedor_id,
      },
    });
  } catch (error) {
    console.error("Erro no endpoint /api/vendas/my:", error);
    return res.status(500).json({
      success: false,
      error: "Erro ao buscar vendas",
    });
  }
}
