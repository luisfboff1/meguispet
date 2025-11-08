# Stock Management Flow Diagrams

## 1. Create Sale Flow (POST /api/vendas)

```
┌─────────────────────────────────────────────────────────────────┐
│                      CREATE SALE REQUEST                         │
│  { numero_venda, cliente_id, estoque_id, itens: [...] }         │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│              VALIDATE STOCK AVAILABILITY                         │
│  For each item: Check produtos_estoques.quantidade              │
│  ✓ Stock exists?                                                │
│  ✓ Quantity sufficient?                                         │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ├─── NO ──► Return Error (400)
                      │            "Insufficient stock"
                      ▼ YES
┌─────────────────────────────────────────────────────────────────┐
│                   CREATE VENDA RECORD                            │
│  INSERT INTO vendas (...values...)                              │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                  INSERT VENDAS_ITENS                             │
│  For each item: INSERT INTO vendas_itens                        │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│           APPLY STOCK CHANGES (applySaleStock)                   │
│  For each item:                                                  │
│    - Get current stock quantity                                 │
│    - Calculate new quantity (current - sold)                    │
│    - UPDATE produtos_estoques SET quantidade = new              │
│    - Log adjustment                                             │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ├─── SUCCESS ──► Return 201
                      │                  { venda, estoque_info }
                      │
                      └─── FAILURE ──► ROLLBACK
                                      │
                                      ▼
                            ┌──────────────────────┐
                            │ DELETE vendas_itens  │
                            │ DELETE vendas        │
                            │ Return Error (500)   │
                            └──────────────────────┘
```

## 2. Update Sale Flow (PUT /api/vendas)

```
┌─────────────────────────────────────────────────────────────────┐
│                      UPDATE SALE REQUEST                         │
│  { id, estoque_id, itens: [...], ...other fields }             │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                FETCH CURRENT SALE DATA                           │
│  SELECT estoque_id, vendas_itens                                │
│  Store: oldEstoqueId, oldItems                                  │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                  UPDATE VENDA RECORD                             │
│  UPDATE vendas SET ...new values... WHERE id = ?                │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
                Stock Location Changed?
                      │
        ┌─────────────┴─────────────┐
        │                           │
       YES                         NO
        │                           │
        ▼                           ▼
┌──────────────────┐    ┌─────────────────────────┐
│ REVERT OLD STOCK │    │ CALCULATE DELTA         │
│ revertSaleStock  │    │ calculateStockDelta     │
│ (oldItems,       │    │ (oldItems, newItems)    │
│  oldEstoqueId)   │    │                         │
└────────┬─────────┘    │ Returns only products   │
         │              │ with quantity changes   │
         ▼              └────────┬────────────────┘
┌──────────────────┐             │
│ APPLY NEW STOCK  │             ▼
│ applySaleStock   │    ┌─────────────────────────┐
│ (newItems,       │    │ APPLY DELTAS            │
│  estoque_id)     │    │ applyStockDeltas        │
└────────┬─────────┘    │ (deltas, estoque_id)    │
         │              └────────┬────────────────┘
         │                       │
         └───────────┬───────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │ DELETE old vendas_itens    │
        │ INSERT new vendas_itens    │
        └────────────┬───────────────┘
                     │
                     ▼
              Return 200 OK
```

## 3. Delete Sale Flow (DELETE /api/vendas)

```
┌─────────────────────────────────────────────────────────────────┐
│                   DELETE SALE REQUEST                            │
│                     DELETE /api/vendas?id=X                      │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│              FETCH VENDA WITH ITEMS                              │
│  SELECT *, vendas_itens(produto_id, quantidade)                 │
│  WHERE id = ?                                                   │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ├─── NOT FOUND ──► Return 404
                      │
                      ▼ FOUND
┌─────────────────────────────────────────────────────────────────┐
│          REVERT STOCK (revertSaleStock)                          │
│  For each item:                                                  │
│    - Get current stock quantity                                 │
│    - Calculate new quantity (current + returned)                │
│    - UPDATE produtos_estoques SET quantidade = new              │
│    - Log reversion                                              │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ├─── FAILURE ──► Return Error (500)
                      │                  "Failed to revert stock"
                      │
                      ▼ SUCCESS
┌─────────────────────────────────────────────────────────────────┐
│                  DELETE VENDAS_ITENS                             │
│  DELETE FROM vendas_itens WHERE venda_id = ?                    │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DELETE VENDA                                  │
│  DELETE FROM vendas WHERE id = ?                                │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
                 Return 200 OK
           "Venda excluída e estoque revertido"
```

## 4. Stock Adjustment Function (adjustProductStock)

```
┌─────────────────────────────────────────────────────────────────┐
│         adjustProductStock(produto_id, estoque_id, change)       │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│              FETCH CURRENT STOCK                                 │
│  SELECT quantidade FROM produtos_estoques                        │
│  WHERE produto_id = ? AND estoque_id = ?                        │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ├─── NOT FOUND ──► Return Error
                      │                  "Stock not configured"
                      ▼ FOUND
┌─────────────────────────────────────────────────────────────────┐
│              CALCULATE NEW QUANTITY                              │
│  newQuantity = currentQuantity + change                          │
│  (change is negative for sales, positive for reversions)         │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
               newQuantity < 0?
                      │
                      ├─── YES ──► Return Error
                      │            "Insufficient stock"
                      │
                      ▼ NO
┌─────────────────────────────────────────────────────────────────┐
│                UPDATE STOCK                                      │
│  UPDATE produtos_estoques                                        │
│  SET quantidade = ?, updated_at = NOW()                          │
│  WHERE produto_id = ? AND estoque_id = ?                        │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ├─── FAILURE ──► Return Error
                      │                  "Failed to update"
                      │
                      ▼ SUCCESS
┌─────────────────────────────────────────────────────────────────┐
│              LOG ADJUSTMENT (dev only)                           │
│  console.log("Stock adjusted: old → new")                       │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
         Return { success: true, oldQuantity, newQuantity }
```

## 5. Stock Delta Calculation (calculateStockDelta)

```
Input: oldItems = [
  { produto_id: 1, quantidade: 5 },
  { produto_id: 2, quantidade: 3 }
]

newItems = [
  { produto_id: 1, quantidade: 7 },
  { produto_id: 3, quantidade: 2 }
]

┌─────────────────────────────────────────────────────────────────┐
│                    INITIALIZE DELTA MAP                          │
│                  delta = new Map()                              │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│           ADD BACK OLD ITEMS (they were subtracted)             │
│  For each oldItem:                                              │
│    delta[produto_id] += quantidade                              │
│                                                                 │
│  Result:                                                        │
│    delta[1] = +5  (return 5 units of product 1)                │
│    delta[2] = +3  (return 3 units of product 2)                │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│           SUBTRACT NEW ITEMS (need to be removed)               │
│  For each newItem:                                              │
│    delta[produto_id] -= quantidade                              │
│                                                                 │
│  Result:                                                        │
│    delta[1] = +5 - 7 = -2  (need 2 more of product 1)          │
│    delta[2] = +3 - 0 =  3  (return 3 of product 2)             │
│    delta[3] =  0 - 2 = -2  (need 2 of product 3)               │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│              FILTER OUT ZERO CHANGES                             │
│  Return only non-zero deltas                                    │
│                                                                 │
│  Output: [                                                      │
│    { produto_id: 1, quantityChange: -2 },                       │
│    { produto_id: 2, quantityChange: +3 },                       │
│    { produto_id: 3, quantityChange: -2 }                        │
│  ]                                                              │
└─────────────────────────────────────────────────────────────────┘
```

## Error Handling Hierarchy

```
┌───────────────────────────────────────┐
│      StockOperationResult             │
│  {                                    │
│    success: boolean                   │
│    errors: string[]                   │
│    adjustments: [{                    │
│      produto_id                       │
│      produto_nome                     │
│      quantidade_anterior              │
│      quantidade_nova                  │
│      erro?                            │
│    }]                                 │
│  }                                    │
└──────────────┬────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│    Possible Error Scenarios:             │
│                                          │
│  1. Stock not configured                 │
│     → Product doesn't exist in location  │
│                                          │
│  2. Insufficient stock                   │
│     → newQuantity would be negative      │
│                                          │
│  3. Database error                       │
│     → Supabase query failed             │
│                                          │
│  4. Validation error                     │
│     → Invalid parameters                 │
└──────────────────────────────────────────┘
```

## Database Tables Interaction

```
┌─────────────────────────────────────────────────────────────────┐
│                         VENDAS                                   │
│  ┌──────┬─────────────┬────────────┬────────────┬──────────┐   │
│  │  id  │ numero_venda│ cliente_id │ estoque_id │  status  │   │
│  └──────┴─────────────┴────────────┴────────────┴──────────┘   │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              │ 1:N
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      VENDAS_ITENS                                │
│  ┌──────┬──────────┬────────────┬────────────┬───────────────┐ │
│  │  id  │ venda_id │ produto_id │ quantidade │ preco_unitario│ │
│  └──────┴──────────┴────────────┴────────────┴───────────────┘ │
└───────────────────────┬──────────────────────────────────────────┘
                        │
                        │ References
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                   PRODUTOS_ESTOQUES                              │
│  ┌──────┬────────────┬────────────┬────────────┬─────────────┐ │
│  │  id  │ produto_id │ estoque_id │ quantidade │ updated_at  │ │
│  └──────┴────────────┴────────────┴────────────┴─────────────┘ │
│                                                                  │
│  UNIQUE (produto_id, estoque_id)  ← Prevents duplicates        │
└─────────────────────────────────────────────────────────────────┘
            │                            │
            │ References                 │ References
            ▼                            ▼
┌──────────────────┐          ┌──────────────────┐
│    PRODUTOS      │          │    ESTOQUES      │
│  ┌──────┬──────┐│          │  ┌──────┬──────┐ │
│  │  id  │ nome ││          │  │  id  │ nome │ │
│  └──────┴──────┘│          │  └──────┴──────┘ │
└──────────────────┘          └──────────────────┘
```
