import type { NextApiResponse } from "next";
import {
    AuthenticatedRequest,
    withSupabaseAuth,
} from "@/lib/supabase-middleware";
import { fetchUserAccessProfile } from "@/lib/user-access";
import { adjustProductStock } from "@/lib/stock-manager";

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
    const { method } = req;
    const supabase = req.supabaseClient;

    try {
        if (method !== "POST") {
            return res.status(405).json({
                success: false,
                message: "Método não permitido",
            });
        }

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

        // Validate required fields
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
                message: "tipo_ajuste deve ser: adicionar, remover ou definir",
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
            !motivo || typeof motivo !== "string" || motivo.trim().length === 0
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Motivo/justificativa é obrigatório para ajuste direto",
            });
        }

        // Get current stock for the product at this location
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
                return res.status(400).json({
                    success: false,
                    message: "tipo_ajuste inválido",
                });
        }

        // If defining same value, nothing to do
        if (quantidadeMudanca === 0) {
            return res.status(200).json({
                success: true,
                message:
                    "Nenhuma alteração necessária - estoque já está no valor informado",
                data: {
                    produto_id,
                    estoque_id,
                    quantidade_anterior: estoqueAtual,
                    quantidade_nova: estoqueAtual,
                    quantidade_mudanca: 0,
                },
            });
        }

        // Apply the adjustment using the stock manager (with locking and audit trail)
        const result = await adjustProductStock(
            produto_id,
            estoque_id,
            quantidadeMudanca,
            "AJUSTE_MANUAL",
            undefined, // no operacao_id
            req.user?.id,
            motivo.trim(),
        );

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: "Erro ao ajustar estoque: " +
                    (result.error || "Erro desconhecido"),
            });
        }

        return res.status(200).json({
            success: true,
            message:
                `✅ Estoque ajustado com sucesso! ${estoqueAtual} → ${result.newQuantity}`,
            data: {
                produto_id,
                estoque_id,
                quantidade_anterior: result.oldQuantity,
                quantidade_nova: result.newQuantity,
                quantidade_mudanca: quantidadeMudanca,
                tipo_ajuste,
                motivo: motivo.trim(),
            },
        });
    } catch (error) {
        console.error("[ESTOQUE_AJUSTE_DIRETO ERROR]", error);
        return res.status(500).json({
            success: false,
            message: "Erro ao processar ajuste de estoque",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};

export default withSupabaseAuth(handler);
