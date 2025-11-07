# Stock Management V2 - Testing Guide

## 📋 Overview

This guide provides step-by-step instructions to test the improved stock management system and verify that all features work correctly.

## 🛠️ Prerequisites

1. Database migration has been applied (`001_stock_improvements.sql`)
2. Application is running (`pnpm dev`)
3. Test data exists (products, stock locations)
4. Access to database console (Supabase dashboard)

## 🧪 Test Scenarios

### Test 1: Basic Stock Adjustment with History

**Objective**: Verify that stock adjustments create proper audit trail.

#### Steps:

1. **Check initial stock**:
```sql
SELECT * FROM produtos_estoques
WHERE produto_id = 1 AND estoque_id = 1;
-- Note the current quantity
```

2. **Create a sale via API**:
```bash
curl -X POST http://localhost:3000/api/vendas \
  -H "Content-Type: application/json" \
  -d '{
    "numero_venda": "TEST-001",
    "estoque_id": 1,
    "itens": [
      {
        "produto_id": 1,
        "quantidade": 3,
        "preco_unitario": 50.00
      }
    ],
    "valor_total": 150.00,
    "valor_final": 150.00
  }'
```

3. **Verify stock decreased**:
```sql
SELECT * FROM produtos_estoques
WHERE produto_id = 1 AND estoque_id = 1;
-- Quantity should be 3 less than before
```

4. **Check history was created**:
```sql
SELECT * FROM estoques_historico
WHERE produto_id = 1
ORDER BY created_at DESC
LIMIT 5;
-- Should show VENDA operation with correct quantities
```

**Expected Results**:
- ✅ Stock decreased by 3 units
- ✅ History entry created with:
  - `tipo_operacao` = 'VENDA'
  - `quantidade_mudanca` = -3
  - `operacao_id` = sale ID
  - `quantidade_anterior` and `quantidade_nova` correct

---

### Test 2: Insufficient Stock Prevention

**Objective**: Verify that sales with insufficient stock are rejected.

#### Steps:

1. **Check current stock**:
```sql
SELECT quantidade FROM produtos_estoques
WHERE produto_id = 1 AND estoque_id = 1;
-- Let's say it's 10 units
```

2. **Attempt to sell more than available**:
```bash
curl -X POST http://localhost:3000/api/vendas \
  -H "Content-Type: application/json" \
  -d '{
    "numero_venda": "TEST-002",
    "estoque_id": 1,
    "itens": [
      {
        "produto_id": 1,
        "quantidade": 50,
        "preco_unitario": 50.00
      }
    ],
    "valor_total": 2500.00,
    "valor_final": 2500.00
  }'
```

3. **Verify rejection**:
```json
// Expected response: 400 Bad Request
{
  "success": false,
  "message": "❌ Estoque insuficiente para os seguintes produtos:\nProduto X (disponível: 10, solicitado: 50)",
  "insufficient_stock": [...]
}
```

4. **Confirm stock unchanged**:
```sql
SELECT quantidade FROM produtos_estoques
WHERE produto_id = 1 AND estoque_id = 1;
-- Should still be 10 units (unchanged)
```

**Expected Results**:
- ✅ Sale rejected with clear error message
- ✅ Stock unchanged
- ✅ No history entry created

---

### Test 3: Stock Reversion on Sale Deletion

**Objective**: Verify that deleting a sale returns stock.

#### Steps:

1. **Create a sale** (use Test 1 steps)

2. **Note the stock after sale**:
```sql
SELECT quantidade FROM produtos_estoques
WHERE produto_id = 1 AND estoque_id = 1;
-- Let's say it's now 7 units (was 10, sold 3)
```

3. **Delete the sale**:
```bash
curl -X DELETE http://localhost:3000/api/vendas?id=<sale_id>
```

4. **Verify stock restored**:
```sql
SELECT quantidade FROM produtos_estoques
WHERE produto_id = 1 AND estoque_id = 1;
-- Should be back to 10 units
```

5. **Check history**:
```sql
SELECT * FROM estoques_historico
WHERE produto_id = 1
ORDER BY created_at DESC
LIMIT 10;
-- Should show both VENDA and ESTORNO operations
```

**Expected Results**:
- ✅ Stock returned to original value
- ✅ ESTORNO history entry created
- ✅ Both VENDA and ESTORNO visible in history
- ✅ Sale and items deleted from database

---

### Test 4: Race Condition Prevention (Manual Simulation)

**Objective**: Verify that concurrent sales don't cause negative stock.

#### Steps:

1. **Set product stock to exactly 5 units**:
```sql
UPDATE produtos_estoques
SET quantidade = 5
WHERE produto_id = 1 AND estoque_id = 1;
```

2. **In one terminal, start a long transaction**:
```sql
BEGIN;
SELECT * FROM adjust_stock_with_lock(1, 1, -4, 'VENDA'::VARCHAR, NULL, NULL, NULL);
-- DO NOT COMMIT YET
```

3. **In another terminal/browser, attempt another sale**:
```bash
curl -X POST http://localhost:3000/api/vendas \
  -H "Content-Type: application/json" \
  -d '{
    "estoque_id": 1,
    "itens": [{"produto_id": 1, "quantidade": 3, "preco_unitario": 50}],
    ...
  }'
```

4. **Observe behavior**:
- Second request should wait (retry logic)
- Check logs for retry messages:
  ```
  ⚠️ Attempt 2/5 failed: Stock is currently locked. Retrying in 120ms...
  ```

5. **Commit first transaction**:
```sql
COMMIT;
```

6. **Verify second request**:
- Should either succeed (if stock = 5 - 4 = 1 >= 3? No, fails) or fail with insufficient stock
- Stock should never go negative

**Expected Results**:
- ✅ Second request waits and retries
- ✅ Retry attempts logged
- ✅ Final result is consistent (no negative stock)
- ✅ One succeeds or both succeed if stock sufficient

---

### Test 5: Sale Update with Stock Location Change

**Objective**: Verify that changing stock location moves inventory correctly.

#### Steps:

1. **Check stock in both locations**:
```sql
SELECT estoque_id, quantidade
FROM produtos_estoques
WHERE produto_id = 1;
-- Estoque 1: 10 units
-- Estoque 2: 15 units
```

2. **Create sale from Estoque 1**:
```bash
curl -X POST http://localhost:3000/api/vendas \
  -d '{
    "estoque_id": 1,
    "itens": [{"produto_id": 1, "quantidade": 3, ...}],
    ...
  }'
# Returns sale_id = 123
```

3. **Verify stock after creation**:
```sql
-- Estoque 1: 7 units (10 - 3)
-- Estoque 2: 15 units (unchanged)
```

4. **Update sale to use Estoque 2**:
```bash
curl -X PUT http://localhost:3000/api/vendas \
  -d '{
    "id": 123,
    "estoque_id": 2,
    "itens": [{"produto_id": 1, "quantidade": 3, ...}],
    ...
  }'
```

5. **Verify stock moved**:
```sql
SELECT estoque_id, quantidade
FROM produtos_estoques
WHERE produto_id = 1;
-- Estoque 1: 10 units (restored)
-- Estoque 2: 12 units (15 - 3)
```

6. **Check history**:
```sql
SELECT estoque_id, tipo_operacao, quantidade_mudanca
FROM estoques_historico
WHERE operacao_id = 123
ORDER BY created_at;
-- Should show:
-- 1. VENDA in Estoque 1 (-3)
-- 2. ESTORNO in Estoque 1 (+3)
-- 3. VENDA in Estoque 2 (-3)
```

**Expected Results**:
- ✅ Stock removed from Estoque 1 initially
- ✅ Stock restored to Estoque 1 on update
- ✅ Stock removed from Estoque 2 on update
- ✅ Complete audit trail in history

---

### Test 6: Sale Update with Item Changes (Delta Calculation)

**Objective**: Verify efficient delta calculation for item updates.

#### Steps:

1. **Create sale with 2 items**:
```bash
curl -X POST http://localhost:3000/api/vendas \
  -d '{
    "estoque_id": 1,
    "itens": [
      {"produto_id": 1, "quantidade": 5, "preco_unitario": 50},
      {"produto_id": 2, "quantidade": 3, "preco_unitario": 30}
    ],
    ...
  }'
# Returns sale_id = 456
```

2. **Note stock levels**:
```sql
SELECT produto_id, quantidade
FROM produtos_estoques
WHERE estoque_id = 1 AND produto_id IN (1, 2);
-- Product 1: decreased by 5
-- Product 2: decreased by 3
```

3. **Update sale - change quantities**:
```bash
curl -X PUT http://localhost:3000/api/vendas \
  -d '{
    "id": 456,
    "estoque_id": 1,
    "itens": [
      {"produto_id": 1, "quantidade": 8, "preco_unitario": 50},
      {"produto_id": 2, "quantidade": 1, "preco_unitario": 30}
    ],
    ...
  }'
```

4. **Calculate expected delta**:
```
Product 1: old = 5, new = 8, delta = -3 (subtract 3 more)
Product 2: old = 3, new = 1, delta = +2 (return 2)
```

5. **Verify stock changes**:
```sql
SELECT produto_id, quantidade
FROM produtos_estoques
WHERE estoque_id = 1 AND produto_id IN (1, 2);
-- Product 1: 3 less than before update
-- Product 2: 2 more than before update
```

6. **Check logs** (in development mode):
```
📊 Ajustes de estoque necessários: [
  { produto_id: 1, quantityChange: -3 },
  { produto_id: 2, quantityChange: 2 }
]
✅ Estoque ajustado com sucesso: [...]
```

**Expected Results**:
- ✅ Only products that changed are adjusted
- ✅ Deltas calculated correctly
- ✅ Stock levels reflect the net change
- ✅ AJUSTE entries in history

---

### Test 7: Transaction Rollback on Partial Failure

**Objective**: Verify that failed bulk operations roll back completely.

#### Steps:

1. **Set up test data**:
```sql
-- Product 1: 10 units available
-- Product 2: 2 units available (intentionally low)
UPDATE produtos_estoques SET quantidade = 10 WHERE produto_id = 1 AND estoque_id = 1;
UPDATE produtos_estoques SET quantidade = 2 WHERE produto_id = 2 AND estoque_id = 1;
```

2. **Attempt sale with insufficient stock for one product**:
```bash
curl -X POST http://localhost:3000/api/vendas \
  -d '{
    "estoque_id": 1,
    "itens": [
      {"produto_id": 1, "quantidade": 5, "preco_unitario": 50},
      {"produto_id": 2, "quantidade": 5, "preco_unitario": 30}
    ],
    ...
  }'
```

3. **Expected response**:
```json
{
  "success": false,
  "message": "❌ Erro ao dar baixa no estoque após múltiplas tentativas:\n...",
  "stock_details": [
    {"produto_id": 1, "produto_nome": "Product 1", "quantidade_anterior": 10, "quantidade_nova": 5},
    {"produto_id": 2, "produto_nome": "Product 2", "erro": "Insufficient stock: ..."}
  ]
}
```

4. **Verify rollback**:
```sql
SELECT produto_id, quantidade
FROM produtos_estoques
WHERE estoque_id = 1 AND produto_id IN (1, 2);
-- Product 1: still 10 (not 5!)
-- Product 2: still 2
```

5. **Confirm no sale created**:
```sql
SELECT COUNT(*) FROM vendas WHERE numero_venda = 'TEST-XXX';
-- Should be 0
```

**Expected Results**:
- ✅ Error message explains which product failed
- ✅ ALL stock adjustments rolled back (Product 1 not changed)
- ✅ No sale record created
- ✅ No history entries created

---

### Test 8: Retry Logic with Lock Contention

**Objective**: Verify exponential backoff retry works.

#### Steps:

1. **Enable detailed logging** (if not already):
```typescript
// In lib/retry-logic.ts, ensure logs are enabled
// Or check console in development mode
```

2. **Simulate lock by holding transaction**:
```sql
-- Session 1 (hold lock for 2 seconds)
BEGIN;
SELECT * FROM produtos_estoques WHERE produto_id = 1 FOR UPDATE;
SELECT pg_sleep(2);
COMMIT;
```

3. **While lock is held, attempt sale** (Session 2):
```bash
curl -X POST http://localhost:3000/api/vendas \
  -d '{
    "estoque_id": 1,
    "itens": [{"produto_id": 1, "quantidade": 2, ...}],
    ...
  }'
```

4. **Watch console logs**:
```
🔒 Lock conflict detected (attempt 1). Retrying in 50ms...
🔒 Lock conflict detected (attempt 2). Retrying in 120ms...
✅ Stock adjusted for product 1: 10 → 8 (-2) [VENDA] [attempts: 3]
```

5. **Verify success**:
- Sale should eventually succeed (after Session 1 commits)
- Response should be 201 Created
- Stock should be adjusted

**Expected Results**:
- ✅ Automatic retry on lock conflict
- ✅ Increasing delays (exponential backoff)
- ✅ Success after lock released
- ✅ Logs show retry attempts

---

### Test 9: Stock History Retrieval

**Objective**: Verify history functions work correctly.

#### Steps:

1. **Perform several operations** on Product 1:
   - Create sale (VENDA)
   - Update sale (AJUSTE)
   - Delete sale (ESTORNO)

2. **Retrieve history via SQL**:
```sql
SELECT * FROM get_stock_history(1, 1, 50);
```

3. **Or via API** (if you create endpoint):
```bash
curl http://localhost:3000/api/stock/history?produto_id=1&estoque_id=1&limit=50
```

4. **Verify results**:
```json
[
  {
    "id": 123,
    "produto_nome": "Ração Premium 10kg",
    "estoque_nome": "Loja Principal",
    "quantidade_anterior": 10,
    "quantidade_nova": 13,
    "quantidade_mudanca": 3,
    "tipo_operacao": "ESTORNO",
    "operacao_id": 456,
    "motivo": "Estorno de venda #456",
    "created_at": "2025-11-07T18:30:00Z"
  },
  ...
]
```

**Expected Results**:
- ✅ All operations shown chronologically
- ✅ Product and stock names resolved
- ✅ Quantities accurate
- ✅ Operation types correct
- ✅ Reference IDs present

---

### Test 10: Recent Movements Dashboard

**Objective**: Verify dashboard query for recent activity.

#### Steps:

1. **Query recent movements**:
```sql
SELECT
  id,
  produto_nome,
  estoque_nome,
  quantidade_mudanca,
  tipo_operacao,
  created_at
FROM get_recent_stock_movements(100)
ORDER BY created_at DESC;
```

2. **Or create API endpoint**:
```typescript
// In pages/api/stock/recent.ts
export default async function handler(req, res) {
  const movements = await getRecentStockMovements(100);
  res.json({ success: true, data: movements });
}
```

```bash
curl http://localhost:3000/api/stock/recent
```

**Expected Results**:
- ✅ Last 100 movements across all products
- ✅ Sorted by date (newest first)
- ✅ Product and stock names included
- ✅ All operation types visible

---

## 🔍 Validation Checklist

After running tests, verify:

### Database State
- [ ] No negative stock quantities
- [ ] History entries match operations
- [ ] Indexes are being used (check EXPLAIN ANALYZE)
- [ ] Foreign key constraints intact

### Application Behavior
- [ ] All CRUD operations work (Create, Read, Update, Delete)
- [ ] Error messages are clear and actionable
- [ ] Logs provide useful debugging information
- [ ] UI reflects stock changes immediately

### Performance
- [ ] Sales complete in reasonable time (<500ms typical)
- [ ] Retry overhead is minimal (most succeed first attempt)
- [ ] No lock timeout errors under normal load
- [ ] Database queries are efficient

### Audit Trail
- [ ] Every stock change has history entry
- [ ] User IDs are tracked (when available)
- [ ] Operation IDs link to source records
- [ ] Timestamps are accurate

## 🐛 Common Issues and Solutions

### Issue: "lock_not_available" errors

**Diagnosis**:
```sql
-- Check for blocking transactions
SELECT * FROM pg_stat_activity
WHERE state = 'active' AND wait_event_type = 'Lock';
```

**Solution**:
- Ensure all transactions commit or rollback promptly
- Increase retry attempts if high concurrency expected
- Check for application code holding transactions open

### Issue: History table not updating

**Diagnosis**:
```sql
-- Check if function exists
SELECT proname FROM pg_proc WHERE proname = 'adjust_stock_with_lock';

-- Check permissions
SELECT grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_name = 'adjust_stock_with_lock';
```

**Solution**:
- Re-run migration if function missing
- Grant execute permissions to appropriate roles

### Issue: Stock count mismatch

**Diagnosis**:
```sql
-- Compare expected vs actual
WITH history_sum AS (
  SELECT
    produto_id,
    estoque_id,
    SUM(quantidade_mudanca) as total_change
  FROM estoques_historico
  WHERE produto_id = 1 AND estoque_id = 1
  GROUP BY produto_id, estoque_id
)
SELECT
  pe.quantidade as current_stock,
  10 + hs.total_change as expected_stock
FROM produtos_estoques pe
JOIN history_sum hs USING (produto_id, estoque_id)
WHERE pe.produto_id = 1 AND pe.estoque_id = 1;
```

**Solution**:
- If mismatch found, investigate history for missing/duplicate entries
- May indicate transaction that didn't complete properly
- Use history to reconstruct correct value

## 📊 Performance Benchmarks

Run these queries to assess performance:

### Average Response Time
```sql
-- Requires pg_stat_statements extension
SELECT
  query,
  mean_exec_time,
  calls
FROM pg_stat_statements
WHERE query LIKE '%adjust_stock_with_lock%'
ORDER BY mean_exec_time DESC;
```

### Lock Wait Statistics
```sql
SELECT
  COUNT(*) as retry_count,
  AVG(EXTRACT(epoch FROM (created_at - lag(created_at) OVER (ORDER BY created_at)))) as avg_delay_seconds
FROM estoques_historico
WHERE tipo_operacao = 'VENDA'
  AND created_at > NOW() - INTERVAL '1 hour';
```

### History Table Size
```sql
SELECT
  pg_size_pretty(pg_total_relation_size('estoques_historico')) as total_size,
  COUNT(*) as record_count
FROM estoques_historico;
```

---

## ✅ Test Completion

When all tests pass:

1. **Document results** in test log
2. **Take database backup** before going to production
3. **Monitor metrics** for first 48 hours in production
4. **Set up alerts** for:
   - High retry rates (>5% of operations)
   - Lock timeout errors
   - History table growth rate

---

**Version**: 1.0
**Last Updated**: 2025-11-07
**Tested By**: ___________
**Date Tested**: ___________
**Environment**: [ ] Development [ ] Staging [ ] Production
