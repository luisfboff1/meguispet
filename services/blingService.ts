import axios from "axios";
import type {
  ApiResponse,
  PaginatedResponse,
  BlingVenda,
  BlingNfe,
  BlingStatus,
  BlingSyncResult,
} from "@/types";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "/api"
).replace(/\/$/, "");

/**
 * Create axios instance with credentials (for Supabase auth cookies)
 */
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // 2 min (sync can take long)
  withCredentials: true,
});

// Auto-inject Supabase token
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const supabaseKey = Object.keys(localStorage).find((key) =>
      key.startsWith("sb-") && key.endsWith("-auth-token"),
    );
    if (supabaseKey) {
      try {
        const session = JSON.parse(localStorage.getItem(supabaseKey) || "{}");
        const token = session?.access_token;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch {
        // Ignore parse errors
      }
    }
  }
  return config;
});

export const blingService = {
  // Status
  async getStatus(): Promise<ApiResponse<BlingStatus>> {
    const { data } = await api.get("/bling/status");
    return data;
  },

  // Vendas
  async getVendas(params?: {
    page?: number;
    limit?: number;
    canal_venda?: string;
    situacao_id?: number;
    data_inicio?: string;
    data_fim?: string;
    search?: string;
  }): Promise<PaginatedResponse<BlingVenda>> {
    const { data } = await api.get("/bling/vendas", { params });
    return data;
  },

  // NFe
  async getNfe(params?: {
    page?: number;
    limit?: number;
    situacao?: number;
    tipo?: number;
    data_inicio?: string;
    data_fim?: string;
    search?: string;
  }): Promise<PaginatedResponse<BlingNfe>> {
    const { data } = await api.get("/bling/nfe", { params });
    return data;
  },

  // Sync
  async sync(body: {
    tipo: "vendas" | "nfe" | "all";
    dataInicial?: string;
    dataFinal?: string;
  }): Promise<ApiResponse<BlingSyncResult>> {
    const { data } = await api.post("/bling/sync", body);
    return data;
  },
};
