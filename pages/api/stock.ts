import type { NextApiResponse } from "next";
import {
    AuthenticatedRequest,
    withSupabaseAuth,
} from "@/lib/supabase-middleware";
import { fetchUserAccessProfile } from "@/lib/user-access";
import { adjustProductStock, type TipoOperacao } from "@/lib/stock-manager";

/**
 * Unified Stock API
 *
 * GET /api/stock?produto_id=X
 *   → Returns current stock per location + total
 *
 * GET /api/stock?produto_id=X&historico=true[&estoque_id=Y][&limit=500]
 *   → Returns current stock + history entries
 *
 * POST /api/stock
 *   → Adjusts stock (replaces estoque-ajuste-direto)
 *   Body: { produto_id, estoque_id, tipo_ajuste, quantidade, motivo }
 */
const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
    const { method } = req;
    const supabase = req.supabaseClient;

    try {
        if (method === "GET") {
            const { produto_id, estoque_id, historico, limit = "500" } =
                req.query;

            if (!produto_id) {
                return res.status(400).json({
                    success: false,
                    message: "produto_id é obrigatório",
                });
            }

            // 1. Buscar estoque atual real de produtos_estoques
            let estoqueQuery = supabase
                .from("produtos_estoques")
                .select("estoque_id, quantidade, estoque:estoques(id, nome)")
                .eq("produto_id", produto_id);

            if (estoque_id) {
                estoqueQuery = estoqueQuery.eq("estoque_id", estoque_id);
            }

            const { data: estoqueAtual, error: estoqueError } =
                await estoqueQuery;
            if (estoqueError) throw estoqueError;

            const estoques = (estoqueAtual || []).map((e: any) => ({
                estoque_id: e.estoque_id,
                nome: e.estoque?.nome || `Local ${e.estoque_id}`,
                quantidade: e.quantidade,
            }));

            const estoque_total = estoques.reduce(
                (sum: number, e: any) => sum + e.quantidade,
                0,
            );

            // 2. Buscar produto info
            const { data: produto } = await supabase
                .from("produtos")
                .select("id, nome, preco_custo, preco_venda")
                .eq("id", produto_id)
                .single();

            // 3. Opcionalmente buscar histórico
            let historicoData: any[] = [];
            let total_mudancas = 0;

            if (historico === "true") {
                let histQuery = supabase
                    .from("estoques_historico")
                    .select(
                        `
            id,
            produto_id,
            estoque_id,
            quantidade_anterior,
            quantidade_nova,
            quantidade_mudanca,
            tipo_operacao,
            operacao_id,
            motivo,
            created_at,
            estoque:estoques(nome)
          `,
                    )
                    .eq("produto_id", produto_id);

                if (estoque_id) {
                    histQuery = histQuery.eq("estoque_id", estoque_id);
                }

                const { data: hist, error: histError } = await histQuery
                    .order("created_at", { ascending: true })
                    .limit(parseInt(limit as string, 10));

                if (histError) throw histError;
                historicoData = hist || [];
                total_mudancas = historicoData.length;
            }

            return res.status(200).json({
                success: true,
                data: {
                    produto,
                    estoques,
                    estoque_total,
                    ...(historico === "true" && {
                        historico: historicoData,
                        total_mudancas,
                    }),
                },
            });
        }

        if (method === "POST") {
            // Check stock permission
            const accessProfile = await fetchUserAccessProfile(supabase, {
                id: req.user?.id,
                email: req.user?.email,
            });

            if (accessProfile && !accessProfile.permissions.estoque) {
                return res.status(403).json({
                    success: false,
                    message: "Sem permissão para ajustar estoque",
                });
            }

            const { produto_id, estoque_id, tipo_ajuste, quantidade, motivo } =
                req.body;

            if (!produto_id || !estoque_id) {
                return res.status(400).json({
                    success: false,
                    message: "produto_id e estoque_id são obrigatórios",
                });
            }

            if (
                !tipo_ajuste ||
                !["adicionar", "remover", "definir"].includes(tipo_ajuste)
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "tipo_ajuste deve ser: adicionar, remover ou definir",
                });
            }

            const qty = Number(quantidade);
            if (isNaN(qty) || qty < 0) {
                return res.status(400).json({
                    success: false,
                    message: "quantidade deve ser um número >= 0",
                });
            }

            if (
                !motivo ||
                typeof motivo !== "string" ||
                motivo.trim().length === 0
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Motivo/justificativa é obrigatório para ajuste direto",
                });
            }

            // Get current stock
            const { data: currentStock, error: stockError } = await supabase
                .from("produtos_estoques")
                .select("quantidade")
                .eq("produto_id", produto_id)
                .eq("estoque_id", estoque_id)
                .single();

            if (stockError || !currentStock) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Registro de estoque não encontrado para este produto nesta localização",
                });
            }

            const estoqueAtual = currentStock.quantidade;
            let quantidadeMudanca: number;

            switch (tipo_ajuste) {
                case "adicionar":
                    quantidadeMudanca = qty;
                    break;
                case "remover":
                    quantidadeMudanca = -qty;
                    break;
                case "definir":
                    quantidadeMudanca = qty - estoqueAtual;
                    break;
                default:
                    quantidadeMudanca = 0;
            }

            if (quantidadeMudanca === 0) {
                return res.status(200).json({
                    success: true,
                    message:
                        "Estoque já está no valor solicitado. Nenhuma alteração.",
                    data: {
                        quantidade_anterior: estoqueAtual,
                        quantidade_nova: estoqueAtual,
                        quantidade_mudanca: 0,
                    },
                });
            }

            // Get user ID from profile
            const { data: userProfile } = await supabase
                .from("usuarios")
                .select("id")
                .eq("auth_uid", req.user?.id)
                .single();

            const result = await adjustProductStock(
                produto_id,
                estoque_id,
                quantidadeMudanca,
                "AJUSTE_MANUAL" as TipoOperacao,
                undefined,
                userProfile?.id,
                motivo.trim(),
            );

            if (!result.success) {
                return res.status(500).json({
                    success: false,
                    message: result.error || "Erro ao ajustar estoque",
                });
            }

            return res.status(200).json({
                success: true,
                message:
                    `Estoque ajustado com sucesso: ${estoqueAtual} → ${result.newQuantity}`,
                data: {
                    quantidade_anterior: result.oldQuantity,
                    quantidade_nova: result.newQuantity,
                    quantidade_mudanca: quantidadeMudanca,
                },
            });
        }

        return res.status(405).json({
            success: false,
            message: "Método não permitido",
        });
    } catch (error) {
        console.error("[STOCK API ERROR]", error);
        return res.status(500).json({
            success: false,
            message: "Erro interno do servidor",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};

export default withSupabaseAuth(handler);
