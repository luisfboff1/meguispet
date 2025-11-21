# Migration 017: Add sem_impostos Field

## Description
Adds the `sem_impostos` boolean field to the `vendas` table to support sales without tax calculations.

## Purpose
When a sale is marked as "sem impostos" (without taxes), the system will:
1. Not calculate any taxes (IPI, ICMS, ST)
2. Automatically add "PEDIDO SEM IMPOSTOS" to the observations
3. Store the flag in the database for record-keeping

## How to Apply

### Via Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `017_add_sem_impostos_field.sql`
4. Execute the SQL script

### Via Supabase CLI
```bash
# If you have Supabase CLI configured
supabase migration up
```

### Manual Execution
```sql
-- Execute this SQL on your Supabase database
ALTER TABLE vendas
ADD COLUMN IF NOT EXISTS sem_impostos BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN vendas.sem_impostos IS 'Indica se a venda é sem impostos. Quando TRUE, os impostos (IPI, ICMS, ST) não são calculados e a observação automática "PEDIDO SEM IMPOSTOS" é adicionada.';
```

## Verification
After applying the migration, verify it was successful:
```sql
-- Check if the column exists
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'vendas' AND column_name = 'sem_impostos';
```

Expected result:
- column_name: sem_impostos
- data_type: boolean
- column_default: false
- is_nullable: YES

## Rollback (if needed)
```sql
ALTER TABLE vendas DROP COLUMN IF EXISTS sem_impostos;
```

## Impact
- **Breaking Changes**: None. Field is optional with a default value.
- **Performance**: Minimal. Simple boolean column with default value.
- **Compatibility**: Fully backward compatible. Existing records will have `sem_impostos = false`.
