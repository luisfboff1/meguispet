# Stock Management System

## Overview

This document describes the centralized stock management system implemented in MeguisPet to handle all inventory operations related to sales.

## Architecture

### Stock Manager Service (`/lib/stock-manager.ts`)

A modular, reusable service that centralizes all stock operations with proper error handling and logging.

#### Core Functions

1. **`adjustProductStock(produto_id, estoque_id, quantityChange)`**
   - Low-level function that adjusts stock for a single product
   - Validates stock availability before making changes
   - Prevents negative stock
   - Returns detailed operation result with old/new quantities
   - Handles errors gracefully with descriptive messages

2. **`applySaleStock(itens, estoque_id)`**
   - Used when creating a sale to subtract stock
   - Processes multiple sale items at once
   - Returns comprehensive results with all adjustments and errors
   - Fetches product names for better error messages

3. **`revertSaleStock(itens, estoque_id)`**
   - Used when deleting a sale to return stock
   - Adds quantities back to inventory
   - Mirrors `applySaleStock()` but with positive adjustments

4. **`calculateStockDelta(oldItems, newItems)`**
   - Calculates net stock changes when updating a sale
   - Returns only products with actual quantity changes
   - Optimizes update operations by avoiding unnecessary adjustments

5. **`applyStockDeltas(deltas, estoque_id)`**
   - Applies calculated stock deltas from sale updates
   - Handles both positive (returning) and negative (removing) adjustments
   - Used when updating sales in the same stock location

## Sales API Integration (`/pages/api/vendas.ts`)

### POST - Create Sale

```typescript
// After creating sale and items:
const stockResult = await applySaleStock(itens, estoque_id);

if (!stockResult.success) {
  // Automatic rollback: delete sale and items
  await supabase.from('vendas_itens').delete().eq('venda_id', venda.id);
  await supabase.from('vendas').delete().eq('id', venda.id);
  
  return res.status(500).json({
    success: false,
    message: 'Stock adjustment failed',
    stock_details: stockResult.adjustments,
  });
}
```

**Features:**
- Validates stock availability before creating sale
- Automatically rolls back if stock update fails
- Returns detailed stock adjustment information
- Prevents overselling

### PUT - Update Sale

```typescript
// Fetch current sale items and stock location
const { data: vendaAtual } = await supabase
  .from('vendas')
  .select('estoque_id, itens:vendas_itens(produto_id, quantidade)')
  .eq('id', id)
  .single();

// After updating sale record:
if (oldEstoqueId !== estoque_id) {
  // Stock location changed: revert old + apply new
  await revertSaleStock(oldItems, oldEstoqueId);
  await applySaleStock(newItems, estoque_id);
} else {
  // Same location: calculate and apply delta
  const deltas = calculateStockDelta(oldItems, newItems);
  await applyStockDeltas(deltas, estoque_id);
}
```

**Features:**
- Handles stock location changes (moves inventory between locations)
- Calculates efficient deltas when updating items
- Updates `vendas_itens` table with new items
- Proper error handling with detailed messages

### DELETE - Delete Sale

```typescript
// Fetch sale with items:
const { data: venda } = await supabase
  .from('vendas')
  .select('*, itens:vendas_itens(produto_id, quantidade)')
  .eq('id', id)
  .single();

// Revert stock before deleting:
if (venda.itens && venda.estoque_id) {
  const stockResult = await revertSaleStock(venda.itens, venda.estoque_id);
  
  if (!stockResult.success) {
    return res.status(500).json({
      success: false,
      message: 'Failed to revert stock',
      stock_details: stockResult.adjustments,
    });
  }
}

// Then delete items and sale
```

**Features:**
- Returns stock to inventory when deleting sales
- Proper error handling prevents data inconsistency
- Logs all operations for debugging
- Detailed error messages

## Error Handling

All stock operations return a `StockOperationResult`:

```typescript
interface StockOperationResult {
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
```

### Error Scenarios Handled

1. **Stock not configured** - Product doesn't exist in stock location
2. **Insufficient stock** - Attempted to subtract more than available
3. **Database errors** - Supabase query failures
4. **Validation errors** - Invalid parameters or missing data

## Logging

All operations log to console with emoji indicators:

- ✅ Success: Stock adjusted successfully
- ❌ Error: Operation failed
- ⚠️ Warning: Partial success or rollback
- 📊 Info: Delta calculations and adjustments
- 📦 Info: Stock location changes

## Benefits

1. **Modularity** - Centralized logic, easy to maintain and test
2. **Reusability** - Same functions used across create/update/delete
3. **Safety** - Prevents negative stock and validates all operations
4. **Transparency** - Detailed logging and error messages
5. **Consistency** - All stock operations follow the same pattern
6. **Rollback** - Automatic rollback on failures prevents data corruption

## Future Enhancements

Potential improvements to consider:

1. **Transaction support** - Wrap all operations in database transactions
2. **Stock history** - Log all stock changes with timestamps and reasons
3. **Stock alerts** - Notify when stock reaches minimum levels
4. **Batch operations** - Optimize multiple stock adjustments
5. **Stock reservations** - Reserve stock for pending sales
6. **Audit trail** - Track who made stock changes and when

## Testing Recommendations

When testing stock operations:

1. **Create sale** - Verify stock decreases correctly
2. **Update sale items** - Check delta calculations work
3. **Change stock location** - Ensure stock moves between locations
4. **Delete sale** - Confirm stock is returned
5. **Error cases** - Test insufficient stock, missing products
6. **Concurrent operations** - Test race conditions and locking

## Database Schema

Relevant tables:

```sql
-- Products in stock locations
CREATE TABLE produtos_estoques (
  id BIGSERIAL PRIMARY KEY,
  produto_id BIGINT NOT NULL,
  estoque_id BIGINT NOT NULL,
  quantidade INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_produto_estoque UNIQUE (produto_id, estoque_id)
);

-- Sales
CREATE TABLE vendas (
  id BIGSERIAL PRIMARY KEY,
  estoque_id BIGINT,  -- Stock location for this sale
  -- other fields...
);

-- Sale items
CREATE TABLE vendas_itens (
  id BIGSERIAL PRIMARY KEY,
  venda_id BIGINT NOT NULL,
  produto_id BIGINT NOT NULL,
  quantidade INT NOT NULL,
  -- other fields...
);
```
