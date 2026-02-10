import type { NextApiResponse } from "next";
import {
  withSupabaseAuth,
  AuthenticatedRequest,
} from "@/lib/supabase-middleware";

/**
 * GET /api/bling/nfe
 *
 * Query local bling_nfe table with filters and pagination.
 * Includes related items from bling_nfe_itens.
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

    const { situacao, tipo, data_inicio, data_fim, search } = req.query;

    // Build query
    let query = supabase
      .from("bling_nfe")
      .select("*, itens:bling_nfe_itens(*)", { count: "exact" });

    // Filters
    if (situacao && typeof situacao === "string") {
      query = query.eq("situacao", parseInt(situacao, 10));
    }

    if (tipo && typeof tipo === "string") {
      query = query.eq("tipo", parseInt(tipo, 10));
    }

    if (data_inicio && typeof data_inicio === "string") {
      query = query.gte("data_emissao", data_inicio);
    }

    if (data_fim && typeof data_fim === "string") {
      query = query.lte("data_emissao", `${data_fim}T23:59:59`);
    }

    if (search && typeof search === "string") {
      query = query.or(
        `contato_nome.ilike.%${search}%,chave_acesso.ilike.%${search}%,contato_documento.ilike.%${search}%`,
      );
    }

    // Pagination and ordering
    const { data, error, count } = await query
      .order("data_emissao", { ascending: false })
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
    console.error("[Bling NFe API] Error:", err);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar NFe Bling",
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
};

export default withSupabaseAuth(handler);
