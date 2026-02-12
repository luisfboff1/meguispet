import type { NextApiResponse } from "next";
import {
  withSupabaseAuth,
  AuthenticatedRequest,
} from "@/lib/supabase-middleware";

/**
 * GET /api/bling/vendas
 *
 * Query local bling_vendas table with filters and pagination.
 * Includes related items from bling_vendas_itens.
 */
const handler = async (
  req: AuthenticatedRequest,
  res: NextApiResponse,
): Promise<void> => {
  if (req.method !== "GET") {
    res.status(405).json({ success: false, message: "Método não permitido" });
    return;
  }

  try {
    const supabase = req.supabaseClient;

    const page = parseInt(String(req.query.page || "1"), 10);
    const limit = Math.min(parseInt(String(req.query.limit || "50"), 10), 200);
    const offset = (page - 1) * limit;

    const { canal_venda, situacao_id, data_inicio, data_fim, search } =
      req.query;

    // Build query
    let query = supabase
      .from("bling_vendas")
      .select("*, itens:bling_vendas_itens(*)", { count: "exact" });

    // Filters
    if (canal_venda && typeof canal_venda === "string") {
      query = query.ilike("loja_nome", `%${canal_venda}%`);
    }

    if (situacao_id && typeof situacao_id === "string") {
      query = query.eq("situacao_id", parseInt(situacao_id, 10));
    }

    if (data_inicio && typeof data_inicio === "string") {
      query = query.gte("data_pedido", data_inicio);
    }

    if (data_fim && typeof data_fim === "string") {
      query = query.lte("data_pedido", `${data_fim}T23:59:59`);
    }

    if (search && typeof search === "string") {
      query = query.or(
        `contato_nome.ilike.%${search}%,numero_pedido.ilike.%${search}%,numero_pedido_loja.ilike.%${search}%,contato_documento.ilike.%${search}%`,
      );
    }

    // Pagination and ordering
    const { data, error, count } = await query
      .order("data_pedido", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Query failed: ${error.message}`);
    }

    // Fetch aggregations (total value, first/last dates)
    let aggQuery = supabase
      .from("bling_vendas")
      .select("valor_total, data_pedido");

    // Apply same filters to aggregation query
    if (canal_venda && typeof canal_venda === "string") {
      aggQuery = aggQuery.ilike("loja_nome", `%${canal_venda}%`);
    }
    if (situacao_id && typeof situacao_id === "string") {
      aggQuery = aggQuery.eq("situacao_id", parseInt(situacao_id, 10));
    }
    if (data_inicio && typeof data_inicio === "string") {
      aggQuery = aggQuery.gte("data_pedido", data_inicio);
    }
    if (data_fim && typeof data_fim === "string") {
      aggQuery = aggQuery.lte("data_pedido", `${data_fim}T23:59:59`);
    }
    if (search && typeof search === "string") {
      aggQuery = aggQuery.or(
        `contato_nome.ilike.%${search}%,numero_pedido.ilike.%${search}%,numero_pedido_loja.ilike.%${search}%,contato_documento.ilike.%${search}%`,
      );
    }

    const { data: aggData } = await aggQuery;

    const aggregations = {
      total_value: aggData?.reduce((sum, v) => sum + (v.valor_total || 0), 0) || 0,
      first_date: aggData && aggData.length > 0
        ? aggData.reduce((min, v) => !min || v.data_pedido < min ? v.data_pedido : min, aggData[0].data_pedido)
        : null,
      last_date: aggData && aggData.length > 0
        ? aggData.reduce((max, v) => !max || v.data_pedido > max ? v.data_pedido : max, aggData[0].data_pedido)
        : null,
    };

    res.status(200).json({
      success: true,
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
      aggregations,
    });
  } catch (err) {
    console.error("[Bling Vendas API] Error:", err);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar vendas Bling",
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
};

export default withSupabaseAuth(handler);
