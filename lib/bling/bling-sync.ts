import { getSupabaseServiceRole } from "@/lib/supabase-auth";
import {
  getPedidosVenda,
  getPedidoVenda,
  getNfeList,
  getNfe,
  getSituacoesVendas,
  type BlingPedidoVendaDetail,
  type BlingNfeDetail,
} from "./bling-client";

/**
 * Bling Sync Logic
 *
 * Transforms Bling API responses into local database records.
 * Handles upsert (insert or update) to prevent duplicates.
 *
 * Architecture:
 * - Layer 1: Webhook (real-time) → calls syncPedidoVenda/syncNfe
 * - Layer 2: Incremental poll → only fetches changes since last_sync
 * - Layer 3: Historical import → one-time with date range
 */

// ============================================================================
// Marketplace Detection
// ============================================================================

/**
 * Known marketplace CNPJ → name mapping
 * These are the official CNPJs used by marketplaces as intermediadores
 */
const MARKETPLACE_BY_CNPJ: Record<string, string> = {
  // Shopee (multiple CNPJs)
  "35635824000112": "Shopee",
  "05570714000159": "Shopee",
  "57981711000101": "Shopee",
  // Amazon
  "03007331000181": "Amazon",
  "15436940000103": "Amazon",
  // Mercado Livre
  "10573521000191": "Mercado Livre",
  "02757556000148": "Mercado Livre",
  "33014556000196": "Mercado Livre",
  // Outros marketplaces
  "09339936000116": "Magazine Luiza",
  "22567970000130": "Americanas",
  "00776574000156": "Casas Bahia/Via",
  "14380200000121": "AliExpress",
  "09346601000125": "B2W/Submarino",
};

/**
 * Detect marketplace origin from pedido data.
 * Uses multiple strategies:
 * 1. Intermediador CNPJ (most reliable)
 * 2. Loja ID prefix patterns in numero_pedido_loja
 * 3. Known numero_pedido_loja patterns
 */
export function detectMarketplace(blingData: BlingPedidoVendaDetail): string | null {
  // Strategy 1: Intermediador CNPJ
  const cnpj = blingData.intermediador?.cnpj?.replace(/\D/g, "");
  if (cnpj && MARKETPLACE_BY_CNPJ[cnpj]) {
    return MARKETPLACE_BY_CNPJ[cnpj];
  }

  // Strategy 2: numero_pedido_loja patterns
  const numLoja = blingData.numeroLoja || "";
  if (numLoja) {
    // Amazon: starts with "7xx-" pattern (e.g., "701-9929051-5347409")
    if (/^\d{3}-\d{7}-\d{7}$/.test(numLoja)) return "Amazon";
    // Shopee: long alphanumeric starting with digits (e.g., "260210B42XE0F4")
    if (/^26\d{4}[A-Z0-9]+$/i.test(numLoja)) return "Shopee";
    // Mercado Livre: numeric with a lot of digits
    if (/^\d{10,}$/.test(numLoja)) return "Mercado Livre";
  }

  // Strategy 3: intermediador nomeUsuario
  const nomeUsuario = (blingData.intermediador?.nomeUsuario || "").toLowerCase();
  if (nomeUsuario.includes("amazon")) return "Amazon";
  if (nomeUsuario.includes("shopee")) return "Shopee";
  if (nomeUsuario.includes("mercado")) return "Mercado Livre";
  if (nomeUsuario.includes("magalu") || nomeUsuario.includes("magazine")) return "Magazine Luiza";

  return null;
}

// ============================================================================
// Sync Log Helper
// ============================================================================

export async function logSync(entry: {
  tipo: "webhook" | "polling" | "manual";
  recurso: string;
  bling_id?: number;
  acao?: string;
  status: "success" | "error";
  erro_mensagem?: string;
  payload?: Record<string, unknown>;
}): Promise<void> {
  try {
    const supabase = getSupabaseServiceRole();
    await supabase.from("bling_sync_log").insert(entry);
  } catch (err) {
    console.error("[Bling Sync Log] Failed to write log:", err);
  }
}

// ============================================================================
// Sync Pedido de Venda
// ============================================================================

/**
 * Sync a single pedido de venda from Bling API response to local DB.
 * Upserts bling_vendas and replaces bling_vendas_itens.
 */
export async function syncPedidoVenda(
  blingData: BlingPedidoVendaDetail,
  situacoesMap?: Record<number, string>,
): Promise<number> {
  const supabase = getSupabaseServiceRole();

  // Resolve situação name from map or fallback
  const sitId = blingData.situacao?.id;
  const sitNome = (situacoesMap && sitId != null ? situacoesMap[sitId] : null) || null;

  const marketplace = detectMarketplace(blingData);

  const vendaRow = {
    bling_id: blingData.id,
    numero_pedido: String(blingData.numero || ""),
    numero_pedido_loja: blingData.numeroLoja || null,
    data_pedido: blingData.data || null,
    data_saida: blingData.dataSaida || null,

    // Contato
    bling_contato_id: blingData.contato?.id || null,
    contato_nome: blingData.contato?.nome || null,
    contato_documento: blingData.contato?.numeroDocumento || null,

    // Canal/Loja + Marketplace detection
    loja_id: blingData.loja?.id || null,
    loja_nome: marketplace,
    canal_venda: marketplace,

    // Valores
    total_produtos: blingData.totalProdutos || 0,
    total_desconto: blingData.desconto?.valor || 0,
    total_frete: blingData.transporte?.frete || 0,
    total_outras_despesas: blingData.outrasDespesas || 0,
    valor_total: blingData.total || 0,

    // Pagamento (first installment's payment method)
    forma_pagamento: blingData.parcelas?.[0]?.formaPagamento?.descricao || null,

    // Situação
    situacao_id: sitId || null,
    situacao_nome: sitNome,

    // Vendedor
    bling_vendedor_id: blingData.vendedor?.id || null,

    // Intermediador (marketplace)
    intermediador_cnpj: blingData.intermediador?.cnpj || null,
    intermediador_usuario: blingData.intermediador?.nomeUsuario || null,
    taxa_comissao: blingData.taxas?.taxaComissao || null,
    custo_frete_marketplace: blingData.taxas?.custoFrete || null,

    // Observações
    observacoes: blingData.observacoes || null,
    observacoes_internas: blingData.observacoesInternas || null,

    // Endereço e transporte (JSONB)
    endereco_entrega: blingData.transporte?.etiqueta || null,
    transporte: blingData.transporte || null,

    // NFe vinculada
    bling_nfe_id: blingData.notaFiscal?.id || null,

    // Raw data backup
    raw_data: blingData,
    synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Upsert venda
  const { data: venda, error: vendaError } = await supabase
    .from("bling_vendas")
    .upsert(vendaRow, { onConflict: "bling_id" })
    .select("id")
    .single();

  if (vendaError) {
    throw new Error(`Failed to upsert bling_vendas: ${vendaError.message}`);
  }

  // Replace items (delete + insert)
  if (venda && blingData.itens?.length > 0) {
    await supabase
      .from("bling_vendas_itens")
      .delete()
      .eq("bling_venda_id", venda.id);

    const itensRows = blingData.itens.map(
      (item: Record<string, unknown>) => ({
        bling_venda_id: venda.id,
        bling_produto_id: (item.produto as Record<string, unknown>)?.id || null,
        codigo_produto: item.codigo || null,
        descricao: item.descricao || "",
        quantidade: item.quantidade || 0,
        valor_unitario: item.valor || 0,
        valor_desconto: item.desconto || 0,
        valor_total:
          ((item.quantidade as number) || 0) * ((item.valor as number) || 0),
      }),
    );

    const { error: itensError } = await supabase
      .from("bling_vendas_itens")
      .insert(itensRows);

    if (itensError) {
      console.error(
        `[Bling Sync] Failed to insert items for venda ${venda.id}:`,
        itensError.message,
      );
    }
  }

  return venda.id;
}

// ============================================================================
// Sync NFe
// ============================================================================

const NFE_SITUACAO_MAP: Record<number, string> = {
  1: "Pendente",
  2: "Cancelada",
  3: "Aguardando Recebimento",
  4: "Rejeitada",
  5: "Autorizada",
  6: "DANFE Emitida",
  7: "Registrada",
  8: "Aguardando Protocolo",
  9: "Denegada",
  10: "Consultar Situação",
  11: "Bloqueada",
};

/**
 * Sync a single NFe from Bling API response to local DB.
 */
export async function syncNfe(blingData: BlingNfeDetail): Promise<number> {
  const supabase = getSupabaseServiceRole();

  const nfeRow = {
    bling_id: blingData.id,
    numero: blingData.numero ? parseInt(blingData.numero, 10) : null,
    serie: blingData.serie || null,
    chave_acesso: blingData.chaveAcesso || null,

    tipo: blingData.tipo,
    situacao: blingData.situacao,
    situacao_nome: NFE_SITUACAO_MAP[blingData.situacao] || null,

    data_emissao: blingData.dataEmissao || null,
    data_operacao: blingData.dataOperacao || null,

    bling_contato_id: blingData.contato?.id || null,
    contato_nome: blingData.contato?.nome || null,
    contato_documento: blingData.contato?.numeroDocumento || null,
    contato_endereco: blingData.contato?.endereco || null,

    valor_produtos: null, // Calculated from items if needed
    valor_frete: blingData.valorFrete || 0,
    valor_total: blingData.valorNota || 0,

    xml_url: blingData.xml || null,
    danfe_url: blingData.linkDanfe || null,
    pdf_url: blingData.linkPDF || null,

    finalidade: blingData.finalidade || null,
    bling_pedido_id: blingData.numeroPedidoLoja
      ? null
      : null, // Linked via separate logic if needed

    raw_data: blingData,
    synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Upsert NFe
  const { data: nfe, error: nfeError } = await supabase
    .from("bling_nfe")
    .upsert(nfeRow, { onConflict: "bling_id" })
    .select("id")
    .single();

  if (nfeError) {
    throw new Error(`Failed to upsert bling_nfe: ${nfeError.message}`);
  }

  // Replace NFe items
  if (nfe && blingData.itens?.length > 0) {
    await supabase
      .from("bling_nfe_itens")
      .delete()
      .eq("bling_nfe_id", nfe.id);

    const itensRows = blingData.itens.map(
      (item: Record<string, unknown>) => ({
        bling_nfe_id: nfe.id,
        codigo: item.codigo || null,
        descricao: item.descricao || "",
        unidade: item.unidade || null,
        quantidade: item.quantidade || 0,
        valor_unitario: item.valor || 0,
        valor_total: item.valorTotal || 0,
        tipo: item.tipo || null,
        ncm: item.classificacaoFiscal || null,
        cfop: item.cfop || null,
        origem: item.origem != null ? Number(item.origem) : null,
        gtin: item.gtin || null,
        impostos: item.impostos || null,
      }),
    );

    const { error: itensError } = await supabase
      .from("bling_nfe_itens")
      .insert(itensRows);

    if (itensError) {
      console.error(
        `[Bling Sync] Failed to insert items for nfe ${nfe.id}:`,
        itensError.message,
      );
    }
  }

  // Try to link NFe to existing bling_venda
  if (nfe && blingData.numeroPedidoLoja) {
    const { data: linkedVenda } = await supabase
      .from("bling_vendas")
      .select("id")
      .eq("numero_pedido_loja", blingData.numeroPedidoLoja)
      .limit(1)
      .single();

    if (linkedVenda) {
      await supabase
        .from("bling_nfe")
        .update({ bling_venda_id: linkedVenda.id })
        .eq("id", nfe.id);
    }
  }

  return nfe.id;
}

// ============================================================================
// Incremental Sync (Polling)
// ============================================================================

interface SyncResult {
  synced: number;
  errors: string[];
}

/**
 * Incremental sync vendas - only fetches changes since last sync
 */
export async function incrementalSyncVendas(): Promise<SyncResult> {
  const supabase = getSupabaseServiceRole();
  const { data: config } = await supabase
    .from("bling_config")
    .select("last_sync_vendas")
    .eq("is_active", true)
    .limit(1)
    .single();

  const dataAlteracaoInicial = config?.last_sync_vendas
    ? new Date(config.last_sync_vendas).toISOString().replace("T", " ").substring(0, 19)
    : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().replace("T", " ").substring(0, 19);

  return syncVendasByDateRange(
    "polling",
    dataAlteracaoInicial,
    undefined,
    true,
  );
}

/**
 * Incremental sync NFe
 */
export async function incrementalSyncNfe(): Promise<SyncResult> {
  const supabase = getSupabaseServiceRole();
  const { data: config } = await supabase
    .from("bling_config")
    .select("last_sync_nfe")
    .eq("is_active", true)
    .limit(1)
    .single();

  const dataEmissaoInicial = config?.last_sync_nfe
    ? new Date(config.last_sync_nfe).toISOString().substring(0, 10)
    : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().substring(0, 10);

  return syncNfeByDateRange("polling", dataEmissaoInicial);
}

// ============================================================================
// Historical Import
// ============================================================================

/**
 * Import vendas for a date range (historical import or manual sync)
 */
export async function syncVendasByDateRange(
  tipo: "polling" | "manual",
  dataInicial: string,
  dataFinal?: string,
  useAlteracao = false,
): Promise<SyncResult> {
  const supabase = getSupabaseServiceRole();
  let pagina = 1;
  let hasMore = true;
  let synced = 0;
  const errors: string[] = [];

  // Fetch situações once for all pedidos
  const situacoesMap = await getSituacoesVendas();

  while (hasMore) {
    try {
      const params = useAlteracao
        ? { pagina, limite: 100, dataAlteracaoInicial: dataInicial, dataAlteracaoFinal: dataFinal }
        : { pagina, limite: 100, dataInicial, dataFinal };

      const listing = await getPedidosVenda(params);

      if (!listing.data || listing.data.length === 0) {
        hasMore = false;
        break;
      }

      for (const pedido of listing.data) {
        try {
          const detail = await getPedidoVenda(pedido.id);
          await syncPedidoVenda(detail.data, situacoesMap);
          synced++;
          await logSync({
            tipo,
            recurso: "pedido_venda",
            bling_id: pedido.id,
            acao: "updated",
            status: "success",
          });
        } catch (err) {
          const msg = `Pedido ${pedido.id}: ${err instanceof Error ? err.message : "Unknown"}`;
          errors.push(msg);
          await logSync({
            tipo,
            recurso: "pedido_venda",
            bling_id: pedido.id,
            acao: "updated",
            status: "error",
            erro_mensagem: msg,
          });
        }
      }

      // If less than limit, no more pages
      hasMore = listing.data.length >= 100;
      pagina++;
    } catch (err) {
      errors.push(
        `Page ${pagina}: ${err instanceof Error ? err.message : "Unknown"}`,
      );
      hasMore = false;
    }
  }

  // Update last sync timestamp
  await supabase
    .from("bling_config")
    .update({
      last_sync_vendas: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("is_active", true);

  console.log(
    `[Bling Sync] Vendas sync complete: ${synced} synced, ${errors.length} errors`,
  );
  return { synced, errors };
}

/**
 * Import NFe for a date range
 */
export async function syncNfeByDateRange(
  tipo: "polling" | "manual",
  dataInicial: string,
  dataFinal?: string,
): Promise<SyncResult> {
  const supabase = getSupabaseServiceRole();
  let pagina = 1;
  let hasMore = true;
  let synced = 0;
  const errors: string[] = [];

  while (hasMore) {
    try {
      const listing = await getNfeList({
        pagina,
        limite: 100,
        dataEmissaoInicial: dataInicial,
        dataEmissaoFinal: dataFinal,
      });

      if (!listing.data || listing.data.length === 0) {
        hasMore = false;
        break;
      }

      for (const nfeItem of listing.data) {
        try {
          const detail = await getNfe(nfeItem.id);
          await syncNfe(detail.data);
          synced++;
          await logSync({
            tipo,
            recurso: "nfe",
            bling_id: nfeItem.id,
            acao: "updated",
            status: "success",
          });
        } catch (err) {
          const msg = `NFe ${nfeItem.id}: ${err instanceof Error ? err.message : "Unknown"}`;
          errors.push(msg);
          await logSync({
            tipo,
            recurso: "nfe",
            bling_id: nfeItem.id,
            acao: "updated",
            status: "error",
            erro_mensagem: msg,
          });
        }
      }

      hasMore = listing.data.length >= 100;
      pagina++;
    } catch (err) {
      errors.push(
        `Page ${pagina}: ${err instanceof Error ? err.message : "Unknown"}`,
      );
      hasMore = false;
    }
  }

  // Update last sync timestamp
  await supabase
    .from("bling_config")
    .update({
      last_sync_nfe: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("is_active", true);

  console.log(
    `[Bling Sync] NFe sync complete: ${synced} synced, ${errors.length} errors`,
  );
  return { synced, errors };
}
