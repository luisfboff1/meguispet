import type { NextApiResponse } from "next";
import {
    AuthenticatedRequest,
    withSupabaseAuth,
} from "@/lib/supabase-middleware";
import type {
    BlingProdutoMapeamento,
    BlingProdutoMapeamentoForm,
} from "@/types";

/**
 * GET  /api/bling/mapeamento - Lista todos os mapeamentos com paginação
 * POST /api/bling/mapeamento - Cria novo mapeamento
 */
const handler = async (
    req: AuthenticatedRequest,
    res: NextApiResponse,
): Promise<void> => {
    const supabase = req.supabaseClient;

    // ============================================================================
    // GET - Lista mapeamentos
    // ============================================================================
    if (req.method === "GET") {
        try {
            const page = parseInt(String(req.query.page || "1"), 10);
            const limit = Math.min(
                parseInt(String(req.query.limit || "50"), 10),
                200,
            );
            const offset = (page - 1) * limit;

            const { search, ativo } = req.query;

            // Build query
            let query = supabase
                .from("bling_produtos_mapeamento")
                .select(
                    `
          *,
          itens:bling_produtos_mapeamento_itens(
            *,
            produto:produtos(id, nome, codigo_barras)
          )
        `,
                    { count: "exact" },
                );

            // Filtros
            if (search && typeof search === "string") {
                query = query.or(
                    `descricao.ilike.%${search}%,codigo.ilike.%${search}%`,
                );
            }

            if (ativo !== undefined && ativo !== null && ativo !== "") {
                const ativoValue = ativo === "true" || ativo === "1";
                query = query.eq("ativo", ativoValue);
            }

            // Pagination and ordering
            const { data, error, count } = await query
                .order("created_at", { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) {
                throw new Error(`Query failed: ${error.message}`);
            }

            res.status(200).json({
                success: true,
                data: data || [],
                pagination: {
                    page,
                    limit,
                    total: count || 0,
                    pages: Math.ceil((count || 0) / limit),
                },
            });
        } catch (err) {
            console.error("[Bling Mapeamento API] GET Error:", err);
            res.status(500).json({
                success: false,
                message: "Erro ao buscar mapeamentos",
                error: err instanceof Error ? err.message : "Unknown error",
            });
        }
        return;
    }

    // ============================================================================
    // POST - Cria novo mapeamento
    // ============================================================================
    if (req.method === "POST") {
        try {
            const formData = req.body as BlingProdutoMapeamentoForm;

            // Validações básicas
            if (!formData.descricao?.trim()) {
                res.status(400).json({
                    success: false,
                    message: "Descrição é obrigatória",
                });
                return;
            }

            if (!formData.itens || formData.itens.length === 0) {
                res.status(400).json({
                    success: false,
                    message: "É necessário mapear ao menos um produto local",
                });
                return;
            }

            // Validar quantidades
            for (const item of formData.itens) {
                if (!item.produto_local_id || item.quantidade <= 0) {
                    res.status(400).json({
                        success: false,
                        message:
                            "Todos os itens devem ter produto e quantidade válidos",
                    });
                    return;
                }
            }

            // Verificar se já existe mapeamento com mesmo bling_produto_id ou codigo
            if (formData.bling_produto_id || formData.codigo) {
                let existsQuery = supabase
                    .from("bling_produtos_mapeamento")
                    .select("id");

                const conditions = [];
                if (formData.bling_produto_id) {
                    conditions.push(
                        `bling_produto_id.eq.${formData.bling_produto_id}`,
                    );
                }
                if (formData.codigo) {
                    conditions.push(`codigo.eq.${formData.codigo}`);
                }

                if (conditions.length > 0) {
                    existsQuery = existsQuery.or(conditions.join(","));

                    const { data: existing, error: existsError } =
                        await existsQuery.single();

                    if (!existsError && existing) {
                        res.status(409).json({
                            success: false,
                            message:
                                "Já existe um mapeamento para este produto do Bling",
                        });
                        return;
                    }
                }
            }

            // Inserir mapeamento principal
            const { data: mapeamento, error: mapeamentoError } = await supabase
                .from("bling_produtos_mapeamento")
                .insert({
                    bling_produto_id: formData.bling_produto_id || null,
                    codigo: formData.codigo?.trim() || null,
                    descricao: formData.descricao.trim(),
                    observacoes: formData.observacoes?.trim() || null,
                    ativo: formData.ativo !== false,
                })
                .select()
                .single();

            if (mapeamentoError) {
                throw new Error(
                    `Erro ao criar mapeamento: ${mapeamentoError.message}`,
                );
            }

            // Inserir itens
            const itensToInsert = formData.itens.map((item) => ({
                mapeamento_id: mapeamento.id,
                produto_local_id: item.produto_local_id,
                quantidade: item.quantidade,
            }));

            const { error: itensError } = await supabase
                .from("bling_produtos_mapeamento_itens")
                .insert(itensToInsert);

            if (itensError) {
                // Rollback: deletar mapeamento criado
                await supabase
                    .from("bling_produtos_mapeamento")
                    .delete()
                    .eq("id", mapeamento.id);

                throw new Error(`Erro ao criar itens: ${itensError.message}`);
            }

            // Buscar mapeamento completo com itens
            const { data: mapeamentoCompleto, error: fetchError } =
                await supabase
                    .from("bling_produtos_mapeamento")
                    .select(
                        `
          *,
          itens:bling_produtos_mapeamento_itens(
            *,
            produto:produtos(id, nome, codigo_barras)
          )
        `,
                    )
                    .eq("id", mapeamento.id)
                    .single();

            if (fetchError) {
                throw new Error(
                    `Erro ao buscar mapeamento: ${fetchError.message}`,
                );
            }

            res.status(201).json({
                success: true,
                data: mapeamentoCompleto,
                message: "Mapeamento criado com sucesso",
            });
        } catch (err) {
            console.error("[Bling Mapeamento API] POST Error:", err);
            res.status(500).json({
                success: false,
                message: "Erro ao criar mapeamento",
                error: err instanceof Error ? err.message : "Unknown error",
            });
        }
        return;
    }

    // ============================================================================
    // Método não permitido
    // ============================================================================
    res.status(405).json({ success: false, message: "Método não permitido" });
};

export default withSupabaseAuth(handler);
