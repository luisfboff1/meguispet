import type { NextApiResponse } from "next";
import {
    AuthenticatedRequest,
    withSupabaseAuth,
} from "@/lib/supabase-middleware";
import type { BlingProdutoMapeamentoForm } from "@/types";

/**
 * PUT    /api/bling/mapeamento/[id] - Atualiza mapeamento existente
 * DELETE /api/bling/mapeamento/[id] - Desativa/deleta mapeamento
 */
const handler = async (
    req: AuthenticatedRequest,
    res: NextApiResponse,
): Promise<void> => {
    const supabase = req.supabaseClient;
    const { id } = req.query;

    if (!id || Array.isArray(id)) {
        res.status(400).json({
            success: false,
            message: "ID inválido",
        });
        return;
    }

    const mapeamentoId = parseInt(id, 10);

    if (isNaN(mapeamentoId)) {
        res.status(400).json({
            success: false,
            message: "ID deve ser um número",
        });
        return;
    }

    // ============================================================================
    // PUT - Atualiza mapeamento
    // ============================================================================
    if (req.method === "PUT") {
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

            // Verificar se mapeamento existe
            const { data: existing, error: existsError } = await supabase
                .from("bling_produtos_mapeamento")
                .select("id")
                .eq("id", mapeamentoId)
                .single();

            if (existsError || !existing) {
                res.status(404).json({
                    success: false,
                    message: "Mapeamento não encontrado",
                });
                return;
            }

            // Verificar duplicatas (exceto o próprio registro)
            if (formData.bling_produto_id || formData.codigo) {
                let dupeQuery = supabase
                    .from("bling_produtos_mapeamento")
                    .select("id")
                    .neq("id", mapeamentoId);

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
                    dupeQuery = dupeQuery.or(conditions.join(","));

                    const { data: duplicate, error: dupeError } =
                        await dupeQuery.single();

                    if (!dupeError && duplicate) {
                        res.status(409).json({
                            success: false,
                            message:
                                "Já existe outro mapeamento para este produto do Bling",
                        });
                        return;
                    }
                }
            }

            // Atualizar mapeamento principal
            const { error: updateError } = await supabase
                .from("bling_produtos_mapeamento")
                .update({
                    bling_produto_id: formData.bling_produto_id || null,
                    codigo: formData.codigo?.trim() || null,
                    descricao: formData.descricao.trim(),
                    observacoes: formData.observacoes?.trim() || null,
                    ativo: formData.ativo !== false,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", mapeamentoId);

            if (updateError) {
                throw new Error(
                    `Erro ao atualizar mapeamento: ${updateError.message}`,
                );
            }

            // Deletar itens existentes
            const { error: deleteItensError } = await supabase
                .from("bling_produtos_mapeamento_itens")
                .delete()
                .eq("mapeamento_id", mapeamentoId);

            if (deleteItensError) {
                throw new Error(
                    `Erro ao deletar itens: ${deleteItensError.message}`,
                );
            }

            // Inserir novos itens
            const itensToInsert = formData.itens.map((item) => ({
                mapeamento_id: mapeamentoId,
                produto_local_id: item.produto_local_id,
                quantidade: item.quantidade,
            }));

            const { error: insertItensError } = await supabase
                .from("bling_produtos_mapeamento_itens")
                .insert(itensToInsert);

            if (insertItensError) {
                throw new Error(
                    `Erro ao inserir itens: ${insertItensError.message}`,
                );
            }

            // Buscar mapeamento completo atualizado
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
                    .eq("id", mapeamentoId)
                    .single();

            if (fetchError) {
                throw new Error(
                    `Erro ao buscar mapeamento: ${fetchError.message}`,
                );
            }

            res.status(200).json({
                success: true,
                data: mapeamentoCompleto,
                message: "Mapeamento atualizado com sucesso",
            });
        } catch (err) {
            console.error("[Bling Mapeamento API] PUT Error:", err);
            res.status(500).json({
                success: false,
                message: "Erro ao atualizar mapeamento",
                error: err instanceof Error ? err.message : "Unknown error",
            });
        }
        return;
    }

    // ============================================================================
    // DELETE - Desativa ou deleta mapeamento
    // ============================================================================
    if (req.method === "DELETE") {
        try {
            // Verificar se mapeamento existe
            const { data: existing, error: existsError } = await supabase
                .from("bling_produtos_mapeamento")
                .select("id")
                .eq("id", mapeamentoId)
                .single();

            if (existsError || !existing) {
                res.status(404).json({
                    success: false,
                    message: "Mapeamento não encontrado",
                });
                return;
            }

            // Por padrão, fazer soft delete (desativar)
            // Para hard delete, adicionar query param ?hard=true
            const hardDelete = req.query.hard === "true";

            if (hardDelete) {
                // Hard delete: remover registro (CASCADE irá remover itens)
                const { error: deleteError } = await supabase
                    .from("bling_produtos_mapeamento")
                    .delete()
                    .eq("id", mapeamentoId);

                if (deleteError) {
                    throw new Error(
                        `Erro ao deletar mapeamento: ${deleteError.message}`,
                    );
                }

                res.status(200).json({
                    success: true,
                    message: "Mapeamento deletado permanentemente",
                });
            } else {
                // Soft delete: desativar
                const { error: updateError } = await supabase
                    .from("bling_produtos_mapeamento")
                    .update({
                        ativo: false,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", mapeamentoId);

                if (updateError) {
                    throw new Error(
                        `Erro ao desativar mapeamento: ${updateError.message}`,
                    );
                }

                res.status(200).json({
                    success: true,
                    message: "Mapeamento desativado com sucesso",
                });
            }
        } catch (err) {
            console.error("[Bling Mapeamento API] DELETE Error:", err);
            res.status(500).json({
                success: false,
                message: "Erro ao deletar mapeamento",
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
