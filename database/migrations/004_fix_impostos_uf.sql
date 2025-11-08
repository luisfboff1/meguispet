-- ============================================================================
-- MIGRATION 004: Fix ICMS-ST Architecture - Remove UF from Product Config
-- ============================================================================
-- Problem: UF was tied to product, but same product can be sold to different states
-- Solution: Remove UF and tabela_mva_id from product config, add UF to sales
-- ============================================================================

-- 1. Drop foreign key constraint for tabela_mva_id
ALTER TABLE impostos_produto DROP CONSTRAINT IF EXISTS impostos_produto_tabela_mva_id_fkey;

-- 2. Remove UF and tabela_mva_id columns from impostos_produto
ALTER TABLE impostos_produto DROP COLUMN IF EXISTS uf_destino;
ALTER TABLE impostos_produto DROP COLUMN IF EXISTS tabela_mva_id;

-- 3. Drop related index
DROP INDEX IF EXISTS idx_impostos_produto_uf_destino;
DROP INDEX IF EXISTS idx_impostos_produto_tabela_mva_id;

-- 4. Add UF destino to vendas table (where it belongs)
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS uf_destino VARCHAR(2) DEFAULT 'SP';

-- 5. Create index for vendas.uf_destino
CREATE INDEX IF NOT EXISTS idx_vendas_uf_destino ON vendas(uf_destino);

-- 6. Add comments
COMMENT ON COLUMN impostos_produto.ncm IS 'NCM do produto - usado para buscar MVA dinamicamente na venda';
COMMENT ON COLUMN vendas.uf_destino IS 'UF de destino da venda - usado para buscar MVA correto (NCM + UF)';

-- ============================================================================
-- NOTES:
-- ============================================================================
-- Now the flow is:
-- 1. Product registration: Set NCM, CEST, origem_mercadoria (static info)
-- 2. Sale creation: Select UF destino → System looks up tabela_mva using (NCM + UF)
-- 3. Calculation: Uses tabela_mva found OR manual values if configured
-- ============================================================================
