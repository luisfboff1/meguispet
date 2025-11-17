// ============================================================================
// 📦 STOCK MANAGER V2 - Enhanced Centralized Stock Management Service
// ============================================================================
// Manages all stock operations with:
// - Row-level locking (prevents race conditions)
// - Automatic transaction handling
// - Audit trail with history tracking
// - Exponential backoff retry logic
// - Comprehensive error handling
// ============================================================================

import { getSupabase } from '@/lib/supabase';
import { withLockRetry, withRetry } from '@/lib/retry-logic';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface StockAdjustment {
  produto_id: number;
  quantidade: number;
  estoque_id: number;
}

export interface StockOperationResult {
  success: boolean;
  errors: string[];
  adjustments: Array<{
    produto_id: number;
    produto_nome?: string;
    quantidade_anterior?: number;
    quantidade_nova?: number;
    erro?: string;
  }>;
}

export interface StockHistoryEntry {
  id: number;
  produto_nome: string;
  estoque_nome: string;
  quantidade_anterior: number;
  quantidade_nova: number;
  quantidade_mudanca: number;
  tipo_operacao: 'VENDA' | 'COMPRA' | 'AJUSTE' | 'ESTORNO' | 'TRANSFERENCIA' | 'DEVOLUCAO';
  operacao_id?: number;
  motivo?: string;
  created_at: string;
}

export type TipoOperacao = 'VENDA' | 'COMPRA' | 'AJUSTE' | 'ESTORNO' | 'TRANSFERENCIA' | 'DEVOLUCAO';

// ============================================================================
// CORE FUNCTIONS - WITH ROW-LEVEL LOCKING
// ============================================================================

/**
 * Adjusts stock for a single product using database-level locking
 * This prevents race conditions in concurrent operations
 *
 * @param produto_id - Product ID
 * @param estoque_id - Stock location ID
 * @param quantityChange - Positive to add, negative to subtract
 * @param tipoOperacao - Type of operation (VENDA, COMPRA, etc.)
 * @param operacaoId - Reference ID (venda_id, compra_id, etc.)
 * @param usuarioId - User who performed the operation
 * @param motivo - Optional reason for the adjustment
 * @returns Result with success status and details
 */
export async function adjustProductStock(
  produto_id: number,
  estoque_id: number,
  quantityChange: number,
  tipoOperacao: TipoOperacao = 'AJUSTE',
  operacaoId?: number,
  usuarioId?: number,
  motivo?: string
): Promise<{ success: boolean; error?: string; oldQuantity?: number; newQuantity?: number }> {
  // Use retry logic for lock contention
  const result = await withLockRetry(async () => {
    const supabase = getSupabase();

    // Call database function with row-level locking
    const { data, error } = await supabase.rpc('adjust_stock_with_lock', {
      p_produto_id: produto_id,
      p_estoque_id: estoque_id,
      p_quantidade_mudanca: quantityChange,
      p_tipo_operacao: tipoOperacao,
      p_operacao_id: operacaoId || null,
      p_usuario_id: usuarioId || null,
      p_motivo: motivo || null,
    });

    if (error) {
      throw new Error(error.message);
    }

    // Database function returns array with single result
    const adjustmentResult = Array.isArray(data) ? data[0] : data;

    if (!adjustmentResult || !adjustmentResult.success) {
      throw new Error(adjustmentResult?.error_message || 'Stock adjustment failed');
    }

    return adjustmentResult;
  });

  // Handle retry result
  if (!result.success) {
    return {
      success: false,
      error: result.error?.message || 'Stock adjustment failed after retries',
    };
  }

  if (process.env.NODE_ENV === 'development') {
    const change = quantityChange > 0 ? `+${quantityChange}` : `${quantityChange}`;
  }

  return {
    success: true,
    oldQuantity: result.data.old_quantity,
    newQuantity: result.data.new_quantity,
  };
}

/**
 * Validates stock availability before a sale (with locking)
 * This ensures no race condition between validation and actual sale
 *
 * @param itens - Sale items with product_id and quantidade
 * @param estoque_id - Stock location ID
 * @returns Validation result with insufficient stock details
 */
export async function validateStockAvailability(
  itens: Array<{ produto_id: number; quantidade: number }>,
  estoque_id: number
): Promise<{ valid: boolean; insufficientStock: Array<{ produto_id: number; produto_nome: string; disponivel: number; solicitado: number }> }> {
  const supabase = getSupabase();
  const insufficientStock: Array<{ produto_id: number; produto_nome: string; disponivel: number; solicitado: number }> = [];

  for (const item of itens) {
    // Get stock with locking to prevent TOCTOU (Time-of-check to time-of-use) race condition
    const { data, error } = await supabase.rpc('get_stock_with_lock', {
      p_produto_id: item.produto_id,
      p_estoque_id: estoque_id,
    });

    if (error) {
      insufficientStock.push({
        produto_id: item.produto_id,
        produto_nome: `Product ${item.produto_id}`,
        disponivel: 0,
        solicitado: item.quantidade,
      });
      continue;
    }

    const stockData = Array.isArray(data) ? data[0] : data;

    if (!stockData) {
      insufficientStock.push({
        produto_id: item.produto_id,
        produto_nome: `Product ${item.produto_id}`,
        disponivel: 0,
        solicitado: item.quantidade,
      });
      continue;
    }

    if (stockData.quantidade < item.quantidade) {
      insufficientStock.push({
        produto_id: item.produto_id,
        produto_nome: stockData.produto_nome || `Product ${item.produto_id}`,
        disponivel: stockData.quantidade,
        solicitado: item.quantidade,
      });
    }
  }

  return {
    valid: insufficientStock.length === 0,
    insufficientStock,
  };
}

// ============================================================================
// HIGH-LEVEL FUNCTIONS - FOR SALES OPERATIONS
// ============================================================================

/**
 * Apply stock changes for a sale (subtract stock)
 * Uses database transaction to ensure atomicity
 *
 * @param itens - Sale items with product_id and quantidade
 * @param estoque_id - Stock location ID
 * @param vendaId - Sale ID for audit trail
 * @param usuarioId - User who made the sale
 * @returns Result with all adjustments and any errors
 */
export async function applySaleStock(
  itens: Array<{ produto_id: number; quantidade: number }>,
  estoque_id: number,
  vendaId?: number,
  usuarioId?: number
): Promise<StockOperationResult> {
  const supabase = getSupabase();
  const errors: string[] = [];
  const adjustments: StockOperationResult['adjustments'] = [];

  // Use bulk adjustment with transaction for atomicity
  const result = await withRetry(async () => {
    const { data, error } = await supabase.rpc('adjust_bulk_stock_with_lock', {
      p_estoque_id: estoque_id,
      p_adjustments: itens.map((item) => ({
        produto_id: item.produto_id,
        quantidade_mudanca: -item.quantidade, // Negative for sale
      })),
      p_tipo_operacao: 'VENDA',
      p_operacao_id: vendaId || null,
      p_usuario_id: usuarioId || null,
      p_motivo: vendaId ? `Venda #${vendaId}` : 'Venda',
    });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  });

  if (!result.success) {
    return {
      success: false,
      errors: [result.error?.message || 'Bulk stock adjustment failed'],
      adjustments: [],
    };
  }

  // Process results
  const results = Array.isArray(result.data) ? result.data : [result.data];

  for (const res of results) {
    // Get product name for better error messages
    const { data: produto } = await supabase
      .from('produtos')
      .select('nome')
      .eq('id', res.produto_id)
      .single();

    const produto_nome = produto?.nome || `Product ${res.produto_id}`;

    if (!res.success) {
      errors.push(`${produto_nome}: ${res.error_message || 'Unknown error'}`);
      adjustments.push({
        produto_id: res.produto_id,
        produto_nome,
        erro: res.error_message,
      });
    } else {
      adjustments.push({
        produto_id: res.produto_id,
        produto_nome,
        quantidade_anterior: res.old_quantity,
        quantidade_nova: res.new_quantity,
      });
    }
  }

  return {
    success: errors.length === 0,
    errors,
    adjustments,
  };
}

/**
 * Revert stock changes for a sale (add stock back)
 * Used when deleting or canceling a sale
 *
 * @param itens - Sale items with product_id and quantidade
 * @param estoque_id - Stock location ID
 * @param vendaId - Sale ID for audit trail
 * @param usuarioId - User who deleted the sale
 * @returns Result with all adjustments and any errors
 */
export async function revertSaleStock(
  itens: Array<{ produto_id: number; quantidade: number }>,
  estoque_id: number,
  vendaId?: number,
  usuarioId?: number
): Promise<StockOperationResult> {
  const supabase = getSupabase();
  const errors: string[] = [];
  const adjustments: StockOperationResult['adjustments'] = [];

  // Use bulk adjustment with transaction
  const result = await withRetry(async () => {
    const { data, error } = await supabase.rpc('adjust_bulk_stock_with_lock', {
      p_estoque_id: estoque_id,
      p_adjustments: itens.map((item) => ({
        produto_id: item.produto_id,
        quantidade_mudanca: item.quantidade, // Positive for return
      })),
      p_tipo_operacao: 'ESTORNO',
      p_operacao_id: vendaId || null,
      p_usuario_id: usuarioId || null,
      p_motivo: vendaId ? `Estorno de venda #${vendaId}` : 'Estorno de venda',
    });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  });

  if (!result.success) {
    return {
      success: false,
      errors: [result.error?.message || 'Bulk stock revert failed'],
      adjustments: [],
    };
  }

  // Process results
  const results = Array.isArray(result.data) ? result.data : [result.data];

  for (const res of results) {
    // Get product name
    const { data: produto } = await supabase
      .from('produtos')
      .select('nome')
      .eq('id', res.produto_id)
      .single();

    const produto_nome = produto?.nome || `Product ${res.produto_id}`;

    if (!res.success) {
      errors.push(`${produto_nome}: ${res.error_message || 'Unknown error'}`);
      adjustments.push({
        produto_id: res.produto_id,
        produto_nome,
        erro: res.error_message,
      });
    } else {
      adjustments.push({
        produto_id: res.produto_id,
        produto_nome,
        quantidade_anterior: res.old_quantity,
        quantidade_nova: res.new_quantity,
      });
    }
  }

  return {
    success: errors.length === 0,
    errors,
    adjustments,
  };
}

/**
 * Calculate stock delta when updating a sale
 * Returns the net change needed for each product
 */
export function calculateStockDelta(
  oldItems: Array<{ produto_id: number; quantidade: number }>,
  newItems: Array<{ produto_id: number; quantidade: number }>
): Array<{ produto_id: number; quantityChange: number }> {
  const delta: Map<number, number> = new Map();

  // Add back old items (they were subtracted, now we return them)
  for (const item of oldItems) {
    delta.set(item.produto_id, (delta.get(item.produto_id) || 0) + item.quantidade);
  }

  // Subtract new items (they need to be removed from stock)
  for (const item of newItems) {
    delta.set(item.produto_id, (delta.get(item.produto_id) || 0) - item.quantidade);
  }

  // Convert to array format
  return Array.from(delta.entries())
    .filter(([_, change]) => change !== 0) // Only include products with actual changes
    .map(([produto_id, quantityChange]) => ({ produto_id, quantityChange }));
}

/**
 * Apply stock delta changes for sale update
 * Uses transaction to ensure all-or-nothing updates
 *
 * @param deltas - Array of product ID and quantity changes
 * @param estoque_id - Stock location ID
 * @param vendaId - Sale ID for audit trail
 * @param usuarioId - User who updated the sale
 * @returns Result with all adjustments and any errors
 */
export async function applyStockDeltas(
  deltas: Array<{ produto_id: number; quantityChange: number }>,
  estoque_id: number,
  vendaId?: number,
  usuarioId?: number
): Promise<StockOperationResult> {
  const supabase = getSupabase();
  const errors: string[] = [];
  const adjustments: StockOperationResult['adjustments'] = [];

  // Use bulk adjustment
  const result = await withRetry(async () => {
    const { data, error } = await supabase.rpc('adjust_bulk_stock_with_lock', {
      p_estoque_id: estoque_id,
      p_adjustments: deltas.map((delta) => ({
        produto_id: delta.produto_id,
        quantidade_mudanca: delta.quantityChange,
      })),
      p_tipo_operacao: 'AJUSTE',
      p_operacao_id: vendaId || null,
      p_usuario_id: usuarioId || null,
      p_motivo: vendaId ? `Atualização de venda #${vendaId}` : 'Atualização de venda',
    });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  });

  if (!result.success) {
    return {
      success: false,
      errors: [result.error?.message || 'Delta stock adjustment failed'],
      adjustments: [],
    };
  }

  // Process results
  const results = Array.isArray(result.data) ? result.data : [result.data];

  for (const res of results) {
    const { data: produto } = await supabase
      .from('produtos')
      .select('nome')
      .eq('id', res.produto_id)
      .single();

    const produto_nome = produto?.nome || `Product ${res.produto_id}`;

    if (!res.success) {
      errors.push(`${produto_nome}: ${res.error_message || 'Unknown error'}`);
      adjustments.push({
        produto_id: res.produto_id,
        produto_nome,
        erro: res.error_message,
      });
    } else {
      adjustments.push({
        produto_id: res.produto_id,
        produto_nome,
        quantidade_anterior: res.old_quantity,
        quantidade_nova: res.new_quantity,
      });
    }
  }

  return {
    success: errors.length === 0,
    errors,
    adjustments,
  };
}

// ============================================================================
// STOCK HISTORY FUNCTIONS
// ============================================================================

/**
 * Get stock movement history for a product
 *
 * @param produto_id - Product ID
 * @param estoque_id - Optional stock location ID (null for all locations)
 * @param limit - Maximum number of records to return
 * @returns Array of history entries
 */
export async function getStockHistory(
  produto_id: number,
  estoque_id?: number,
  limit: number = 50
): Promise<StockHistoryEntry[]> {
  const supabase = getSupabase();

  const { data, error } = await supabase.rpc('get_stock_history', {
    p_produto_id: produto_id,
    p_estoque_id: estoque_id || null,
    p_limit: limit,
  });

  if (error) {
    return [];
  }

  return Array.isArray(data) ? data : [];
}

/**
 * Get recent stock movements across all products
 * Useful for dashboard/audit view
 *
 * @param limit - Maximum number of records
 * @returns Array of recent history entries
 */
export async function getRecentStockMovements(limit: number = 100): Promise<StockHistoryEntry[]> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('estoques_historico')
    .select(`
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
      produto:produtos(nome),
      estoque:estoques(nome)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return [];
  }

  // Transform to StockHistoryEntry format
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((entry: any) => ({
    id: entry.id,
    produto_nome: entry.produto?.nome || 'Unknown',
    estoque_nome: entry.estoque?.nome || 'Unknown',
    quantidade_anterior: entry.quantidade_anterior,
    quantidade_nova: entry.quantidade_nova,
    quantidade_mudanca: entry.quantidade_mudanca,
    tipo_operacao: entry.tipo_operacao,
    operacao_id: entry.operacao_id,
    motivo: entry.motivo,
    created_at: entry.created_at,
  }));
}

// ============================================================================
// EXPORTS
// ============================================================================

const stockManager = {
  adjustProductStock,
  validateStockAvailability,
  applySaleStock,
  revertSaleStock,
  calculateStockDelta,
  applyStockDeltas,
  getStockHistory,
  getRecentStockMovements,
};

export default stockManager;
