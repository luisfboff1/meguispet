/**
 * Cache Manager para APIs
 * Gerencia caches in-memory e fornece invalidação centralizada
 */

// Cache de métricas financeiras
let metricasCache: { data: unknown; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const cacheManager = {
  // Métricas Financeiras
  metricas: {
    get: (): { data: unknown; timestamp: number } | null => {
      return metricasCache;
    },

    set: (data: unknown): void => {
      metricasCache = { data, timestamp: Date.now() };
    },

    invalidate: (): void => {
      metricasCache = null;
    },

    isValid: (): boolean => {
      if (!metricasCache) return false;
      const now = Date.now();
      return (now - metricasCache.timestamp) < CACHE_TTL;
    }
  },

  // Invalidar TODOS os caches (útil para operações que afetam múltiplos dados)
  invalidateAll: (): void => {
    metricasCache = null;
  }
};

/**
 * Helper para invalidar cache após operações de escrita
 * Use em endpoints POST, PUT, DELETE que modificam dados financeiros
 */
export const invalidateCacheAfterMutation = (): void => {
  cacheManager.metricas.invalidate();
  // Adicione outros caches aqui conforme necessário
};
