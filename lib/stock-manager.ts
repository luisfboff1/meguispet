// 📦 STOCK MANAGER - Centralized Stock Management Service
// Manages all stock operations for sales with proper error handling and rollback

import { getSupabase } from '@/lib/supabase';

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

/**
 * Adjusts stock for a single product
 * @param produto_id - Product ID
 * @param estoque_id - Stock location ID
 * @param quantityChange - Positive to add, negative to subtract
 * @returns Result with success status and details
 */
export async function adjustProductStock(
  produto_id: number,
  estoque_id: number,
  quantityChange: number
): Promise<{ success: boolean; error?: string; oldQuantity?: number; newQuantity?: number }> {
  const supabase = getSupabase();

  try {
    // Get current stock
    const { data: produtoEstoque, error: fetchError } = await supabase
      .from('produtos_estoques')
      .select('quantidade')
      .eq('produto_id', produto_id)
      .eq('estoque_id', estoque_id)
      .single();

    if (fetchError) {
      console.error('Error fetching product stock:', fetchError);
      return { 
        success: false, 
        error: `Failed to fetch stock for product ${produto_id}: ${fetchError.message}` 
      };
    }

    if (!produtoEstoque) {
      return { 
        success: false, 
        error: `Stock not configured for product ${produto_id} in stock location ${estoque_id}` 
      };
    }

    const oldQuantity = produtoEstoque.quantidade;
    const newQuantity = oldQuantity + quantityChange;

    // Prevent negative stock
    if (newQuantity < 0) {
      return { 
        success: false, 
        error: `Insufficient stock: attempted to set ${newQuantity} (current: ${oldQuantity}, change: ${quantityChange})`,
        oldQuantity 
      };
    }

    // Update stock
    const { error: updateError } = await supabase
      .from('produtos_estoques')
      .update({ 
        quantidade: newQuantity, 
        updated_at: new Date().toISOString() 
      })
      .eq('produto_id', produto_id)
      .eq('estoque_id', estoque_id);

    if (updateError) {
      console.error('Error updating product stock:', updateError);
      return { 
        success: false, 
        error: `Failed to update stock for product ${produto_id}: ${updateError.message}`,
        oldQuantity 
      };
    }

    console.log(`✅ Stock adjusted for product ${produto_id}: ${oldQuantity} → ${newQuantity} (change: ${quantityChange > 0 ? '+' : ''}${quantityChange})`);
    
    return { success: true, oldQuantity, newQuantity };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Unexpected error in adjustProductStock:', error);
    return { success: false, error: errorMsg };
  }
}

/**
 * Apply stock changes for a sale (subtract stock)
 * @param itens - Sale items with product_id and quantidade
 * @param estoque_id - Stock location ID
 * @returns Result with all adjustments and any errors
 */
export async function applySaleStock(
  itens: Array<{ produto_id: number; quantidade: number }>,
  estoque_id: number
): Promise<StockOperationResult> {
  const supabase = getSupabase();
  const errors: string[] = [];
  const adjustments: StockOperationResult['adjustments'] = [];

  for (const item of itens) {
    // Get product name for better error messages
    const { data: produto } = await supabase
      .from('produtos')
      .select('nome')
      .eq('id', item.produto_id)
      .single();

    const produto_nome = produto?.nome || `Product ${item.produto_id}`;

    // Subtract stock (negative quantity change)
    const result = await adjustProductStock(item.produto_id, estoque_id, -item.quantidade);

    if (!result.success) {
      errors.push(`${produto_nome}: ${result.error || 'Unknown error'}`);
      adjustments.push({
        produto_id: item.produto_id,
        produto_nome,
        erro: result.error,
      });
    } else {
      adjustments.push({
        produto_id: item.produto_id,
        produto_nome,
        quantidade_anterior: result.oldQuantity,
        quantidade_nova: result.newQuantity,
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
 * @param itens - Sale items with product_id and quantidade
 * @param estoque_id - Stock location ID
 * @returns Result with all adjustments and any errors
 */
export async function revertSaleStock(
  itens: Array<{ produto_id: number; quantidade: number }>,
  estoque_id: number
): Promise<StockOperationResult> {
  const supabase = getSupabase();
  const errors: string[] = [];
  const adjustments: StockOperationResult['adjustments'] = [];

  for (const item of itens) {
    // Get product name for better error messages
    const { data: produto } = await supabase
      .from('produtos')
      .select('nome')
      .eq('id', item.produto_id)
      .single();

    const produto_nome = produto?.nome || `Product ${item.produto_id}`;

    // Add stock back (positive quantity change)
    const result = await adjustProductStock(item.produto_id, estoque_id, item.quantidade);

    if (!result.success) {
      errors.push(`${produto_nome}: ${result.error || 'Unknown error'}`);
      adjustments.push({
        produto_id: item.produto_id,
        produto_nome,
        erro: result.error,
      });
    } else {
      adjustments.push({
        produto_id: item.produto_id,
        produto_nome,
        quantidade_anterior: result.oldQuantity,
        quantidade_nova: result.newQuantity,
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
 * @param deltas - Array of product ID and quantity changes
 * @param estoque_id - Stock location ID
 * @returns Result with all adjustments and any errors
 */
export async function applyStockDeltas(
  deltas: Array<{ produto_id: number; quantityChange: number }>,
  estoque_id: number
): Promise<StockOperationResult> {
  const supabase = getSupabase();
  const errors: string[] = [];
  const adjustments: StockOperationResult['adjustments'] = [];

  for (const delta of deltas) {
    // Get product name for better error messages
    const { data: produto } = await supabase
      .from('produtos')
      .select('nome')
      .eq('id', delta.produto_id)
      .single();

    const produto_nome = produto?.nome || `Product ${delta.produto_id}`;

    // Apply the delta
    const result = await adjustProductStock(delta.produto_id, estoque_id, delta.quantityChange);

    if (!result.success) {
      errors.push(`${produto_nome}: ${result.error || 'Unknown error'}`);
      adjustments.push({
        produto_id: delta.produto_id,
        produto_nome,
        erro: result.error,
      });
    } else {
      adjustments.push({
        produto_id: delta.produto_id,
        produto_nome,
        quantidade_anterior: result.oldQuantity,
        quantidade_nova: result.newQuantity,
      });
    }
  }

  return {
    success: errors.length === 0,
    errors,
    adjustments,
  };
}
