# Migration 009: Add origem_venda and uf_destino columns

## Problem
The sales report preview API endpoint (`POST /api/relatorios/vendas/preview`) was failing with error:
```
column vendas.origem_venda does not exist
```

This happened because the TypeScript code and seed data referenced these columns, but they were never added to the database schema.

## Solution
Add the missing columns `origem_venda` and `uf_destino` to the `vendas` table.

## How to Apply

### Method 1: Using Supabase CLI (Recommended)

```bash
# Navigate to project root
cd /path/to/meguispet

# Ensure you're linked to the correct Supabase project
supabase link --project-ref jhodhxvvhohygijqcxbo

# Apply all pending migrations
supabase db push

# Verify the migration was applied
supabase db diff
```

### Method 2: Manual SQL Execution

If you prefer to apply the migration manually:

1. Open Supabase Dashboard SQL Editor
2. Copy the contents of `009_add_vendas_origem_uf_columns.sql`
3. Run the SQL
4. Verify the columns exist:
   ```sql
   SELECT column_name, data_type, is_nullable
   FROM information_schema.columns
   WHERE table_name = 'vendas'
   AND column_name IN ('origem_venda', 'uf_destino');
   ```

## What This Migration Does

1. **Adds `origem_venda` column**
   - Type: `VARCHAR(50)`
   - Purpose: Track the origin of each sale (loja_fisica, mercado_livre, shopee, etc.)
   - Nullable: Yes (optional field)
   - Index: Yes (for report filtering)

2. **Adds `uf_destino` column**
   - Type: `VARCHAR(2)`
   - Purpose: Store the destination state (UF) for geographic analysis
   - Nullable: Yes (optional field)
   - Index: Yes (for report filtering)

3. **Updates existing records**
   - Sets `origem_venda = 'loja_fisica'` for all existing sales (safe default)
   - Sets `uf_destino` from the client's `estado` field (when available)

## Verification

After applying the migration, verify it worked:

```sql
-- Check if columns exist
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'vendas'
AND column_name IN ('origem_venda', 'uf_destino');

-- Check if indexes were created
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'vendas'
AND indexname IN ('idx_vendas_origem', 'idx_vendas_uf_destino');

-- Check data was updated
SELECT 
  origem_venda,
  uf_destino,
  COUNT(*) as quantidade
FROM vendas
GROUP BY origem_venda, uf_destino
ORDER BY quantidade DESC;
```

## Impact

- **Breaking Changes**: None (columns are nullable)
- **Performance**: Minimal impact (small indexes on optional columns)
- **Data Loss Risk**: None (only adds columns, doesn't remove or modify existing data)
- **Downtime Required**: No (migration runs instantly on small datasets)

## Rollback

If you need to rollback this migration:

```sql
-- Remove indexes
DROP INDEX IF EXISTS idx_vendas_origem;
DROP INDEX IF EXISTS idx_vendas_uf_destino;

-- Remove columns
ALTER TABLE vendas DROP COLUMN IF EXISTS origem_venda;
ALTER TABLE vendas DROP COLUMN IF EXISTS uf_destino;
```

## Related Files

- Migration: `database/migrations/009_add_vendas_origem_uf_columns.sql`
- API Endpoint: `pages/api/relatorios/vendas/preview.ts`
- Type Definition: `types/index.ts` (interface Venda)
- Seed Data: `database/migrations/seed_mock_data.sql`

## After Applying

Once the migration is applied, the sales report preview endpoint should work correctly without the 500 error.

You can test it by:
1. Opening the sales reports page in the application
2. Selecting a date range
3. Clicking "Preview" or "Gerar Relatório"
4. The endpoint should return successfully with sales data
