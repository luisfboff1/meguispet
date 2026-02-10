import { getValidToken } from "./bling-auth";
import { withRetry } from "@/lib/retry-logic";

/**
 * Bling API v3 HTTP Client
 *
 * Features:
 * - Rate limiting: 3 req/s (334ms delay between requests)
 * - Auto retry on 429 (rate limit) and network errors
 * - Auto token injection via getValidToken()
 * - Typed response handling
 *
 * Rate limits (confirmed by Bling support):
 * - 3 requests/second
 * - 120,000 requests/day
 * - HTTP 429 when exceeded
 * - 300 errors in 10s → IP blocked 10 min
 */

const BLING_API_BASE = "https://api.bling.com.br/Api/v3";
const MIN_REQUEST_INTERVAL_MS = 334; // ~3 req/s

let lastRequestTime = 0;

/**
 * Enforce rate limit by waiting between requests
 */
async function enforceRateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_REQUEST_INTERVAL_MS) {
    await new Promise((resolve) =>
      setTimeout(resolve, MIN_REQUEST_INTERVAL_MS - elapsed),
    );
  }
  lastRequestTime = Date.now();
}

/**
 * Bling API response wrapper
 */
interface BlingListResponse<T> {
  data: T[];
}

interface BlingDetailResponse<T> {
  data: T;
}

/**
 * Make a GET request to Bling API with rate limiting and retry
 */
async function blingGet<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
): Promise<T> {
  await enforceRateLimit();

  const token = await getValidToken();
  const url = new URL(`${BLING_API_BASE}${path}`);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const result = await withRetry(
    async () => {
      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (response.status === 429) {
        throw new Error("429: Rate limit exceeded");
      }

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `Bling API ${response.status}: ${errorBody.substring(0, 500)}`,
        );
      }

      return response.json() as Promise<T>;
    },
    {
      maxAttempts: 3,
      initialDelayMs: 1000,
      maxDelayMs: 10000,
      backoffMultiplier: 2,
      retryableErrors: [
        "429",
        "rate limit",
        "ECONNREFUSED",
        "ETIMEDOUT",
        "ENOTFOUND",
        "503",
        "fetch failed",
      ],
      onRetry: (error, attempt, delay) => {
        console.warn(
          `[Bling Client] Retry ${attempt} in ${delay}ms: ${error.message}`,
        );
      },
    },
  );

  if (!result.success || !result.data) {
    throw new Error(
      result.error?.message || "Bling API request failed after retries",
    );
  }

  return result.data;
}

// ============================================================================
// Pedidos de Venda
// ============================================================================

export interface BlingPedidoVendaListItem {
  id: number;
  numero: number;
  numeroLoja: string;
  data: string;
  dataSaida: string;
  totalProdutos: number;
  total: number;
  contato: { id: number; nome: string; tipoPessoa: string; numeroDocumento: string };
  situacao: { id: number; valor: number };
  loja: { id: number };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type BlingPedidoVendaDetail = Record<string, any>;

export async function getPedidosVenda(params: {
  pagina?: number;
  limite?: number;
  dataAlteracaoInicial?: string;
  dataAlteracaoFinal?: string;
  dataInicial?: string;
  dataFinal?: string;
}): Promise<BlingListResponse<BlingPedidoVendaListItem>> {
  return blingGet<BlingListResponse<BlingPedidoVendaListItem>>(
    "/pedidos/vendas",
    params as Record<string, string | number>,
  );
}

export async function getPedidoVenda(
  id: number,
): Promise<BlingDetailResponse<BlingPedidoVendaDetail>> {
  return blingGet<BlingDetailResponse<BlingPedidoVendaDetail>>(
    `/pedidos/vendas/${id}`,
  );
}

// ============================================================================
// NFe
// ============================================================================

export interface BlingNfeListItem {
  id: number;
  tipo: number;
  situacao: number;
  numero: string;
  dataEmissao: string;
  valorNota: number;
  chaveAcesso: string;
  contato: { id: number; nome: string; numeroDocumento: string };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type BlingNfeDetail = Record<string, any>;

export async function getNfeList(params: {
  pagina?: number;
  limite?: number;
  situacao?: number;
  tipo?: number;
  dataEmissaoInicial?: string;
  dataEmissaoFinal?: string;
}): Promise<BlingListResponse<BlingNfeListItem>> {
  return blingGet<BlingListResponse<BlingNfeListItem>>(
    "/nfe",
    params as Record<string, string | number>,
  );
}

export async function getNfe(
  id: number,
): Promise<BlingDetailResponse<BlingNfeDetail>> {
  return blingGet<BlingDetailResponse<BlingNfeDetail>>(`/nfe/${id}`);
}

// ============================================================================
// Contatos (for connection test)
// ============================================================================

export async function getContatos(params?: {
  pagina?: number;
  limite?: number;
}): Promise<BlingListResponse<{ id: number; nome: string }>> {
  return blingGet("/contatos", params as Record<string, string | number>);
}
