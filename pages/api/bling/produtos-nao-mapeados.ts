import type { NextApiResponse } from "next";
import {
    AuthenticatedRequest,
    withSupabaseAuth,
} from "@/lib/supabase-middleware";
import type { BlingProdutoNaoMapeado } from "@/types";

/**
 * GET /api/bling/produtos-nao-mapeados
 *
 * Retorna lista de produtos do Bling que aparecem em vendas
 * mas ainda não possuem mapeamento definido.
 *
 * Útil para identificar produtos que precisam ser configurados.
 */
const handler = async (
    req: AuthenticatedRequest,
    res: NextApiResponse,
): Promise<void> => {
    if (req.method !== "GET") {
        res.status(405).json({
            success: false,
            message: "Método não permitido",
        });
        return;
    }

    try {
        const supabase = req.supabaseClient;

        // Query para buscar produtos não mapeados
        // 1. Buscar produtos distintos de bling_vendas_itens
        // 2. Que NÃO existem em bling_produtos_mapeamento (por bling_produto_id ou codigo)
        const { data: itensVendas, error: itensError } = await supabase
            .from("bling_vendas_itens")
            .select("bling_produto_id, codigo_produto, descricao")
            .not("bling_produto_id", "is", null)
            .order("descricao");

        if (itensError) {
            throw new Error(
                `Erro ao buscar itens de vendas: ${itensError.message}`,
            );
        }

        if (!itensVendas || itensVendas.length === 0) {
            res.status(200).json({
                success: true,
                data: [],
                message: "Nenhum produto do Bling encontrado em vendas",
            });
            return;
        }

        // Buscar todos os mapeamentos existentes
        const { data: mapeamentos, error: mapeamentosError } = await supabase
            .from("bling_produtos_mapeamento")
            .select("bling_produto_id, codigo");

        if (mapeamentosError) {
            throw new Error(
                `Erro ao buscar mapeamentos: ${mapeamentosError.message}`,
            );
        }

        // Criar sets para lookup rápido
        const blingIdsMaped = new Set(
            (mapeamentos || [])
                .filter((m) => m.bling_produto_id)
                .map((m) => m.bling_produto_id),
        );

        const codigosMaped = new Set(
            (mapeamentos || []).filter((m) => m.codigo).map((m) => m.codigo),
        );

        // Agrupar produtos e contar ocorrências
        const produtosMap = new Map<
            string,
            {
                bling_produto_id?: number | null;
                codigo_produto?: string | null;
                descricao: string;
                ocorrencias: number;
            }
        >();

        for (const item of itensVendas) {
            // Verificar se já está mapeado
            const isMapped =
                (item.bling_produto_id &&
                    blingIdsMaped.has(item.bling_produto_id)) ||
                (item.codigo_produto && codigosMaped.has(item.codigo_produto));

            if (isMapped) {
                continue;
            }

            // Criar chave única (priorizar bling_produto_id)
            const key = item.bling_produto_id
                ? `id_${item.bling_produto_id}`
                : `cod_${item.codigo_produto || "unknown"}`;

            if (produtosMap.has(key)) {
                const existing = produtosMap.get(key)!;
                existing.ocorrencias += 1;
            } else {
                produtosMap.set(key, {
                    bling_produto_id: item.bling_produto_id,
                    codigo_produto: item.codigo_produto,
                    descricao: item.descricao || "Sem descrição",
                    ocorrencias: 1,
                });
            }
        }

        // Converter para array e ordenar por ocorrências (mais frequente primeiro)
        const produtos: BlingProdutoNaoMapeado[] = Array.from(
            produtosMap.values(),
        ).sort((a, b) => (b.ocorrencias || 0) - (a.ocorrencias || 0));

        res.status(200).json({
            success: true,
            data: produtos,
            message:
                `${produtos.length} produto(s) não mapeado(s) encontrado(s)`,
        });
    } catch (err) {
        console.error("[Bling Produtos Não Mapeados API] Error:", err);
        res.status(500).json({
            success: false,
            message: "Erro ao buscar produtos não mapeados",
            error: err instanceof Error ? err.message : "Unknown error",
        });
    }
};

export default withSupabaseAuth(handler);
