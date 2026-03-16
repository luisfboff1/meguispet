import api from "@/services/api";
import type { ApiResponse } from "@/types";

// ============================================================================
// 📦 UNIFIED STOCK SERVICE
// ============================================================================
// Single source of truth for all stock reads and writes on the frontend.
// Uses /api/stock unified endpoint.
// ============================================================================

export interface StockLocation {
    estoque_id: number;
    nome: string;
    quantidade: number;
}

export interface StockData {
    produto: {
        id: number;
        nome: string;
        preco_custo: number;
        preco_venda: number;
    } | null;
    estoques: StockLocation[];
    estoque_total: number;
}

export interface StockHistoricoItem {
    id: number;
    produto_id: number;
    estoque_id: number;
    quantidade_anterior: number;
    quantidade_nova: number;
    quantidade_mudanca: number;
    tipo_operacao: string;
    operacao_id: number | null;
    motivo: string | null;
    created_at: string;
    estoque: { nome: string };
}

export interface StockWithHistorico extends StockData {
    historico: StockHistoricoItem[];
    total_mudancas: number;
}

export interface StockAjustePayload {
    produto_id: number;
    estoque_id: number;
    tipo_ajuste: "adicionar" | "remover" | "definir";
    quantidade: number;
    motivo: string;
}

export interface StockAjusteResult {
    quantidade_anterior: number;
    quantidade_nova: number;
    quantidade_mudanca: number;
}

const stockService = {
    /**
     * Get current stock for a product (all locations or specific location)
     */
    async getEstoque(
        produtoId: number,
        estoqueId?: number,
    ): Promise<ApiResponse<StockData>> {
        let url = `/stock?produto_id=${produtoId}`;
        if (estoqueId) url += `&estoque_id=${estoqueId}`;
        const response = await api.get(url);
        return response.data;
    },

    /**
     * Get stock + history for a product
     */
    async getHistorico(
        produtoId: number,
        estoqueId?: number,
        limit = 500,
    ): Promise<ApiResponse<StockWithHistorico>> {
        let url =
            `/stock?produto_id=${produtoId}&historico=true&limit=${limit}`;
        if (estoqueId) url += `&estoque_id=${estoqueId}`;
        const response = await api.get(url);
        return response.data;
    },

    /**
     * Adjust stock directly (add, remove, or set value)
     */
    async ajustarEstoque(
        payload: StockAjustePayload,
    ): Promise<ApiResponse<StockAjusteResult>> {
        const response = await api.post("/stock", payload);
        return response.data;
    },
};

export default stockService;
