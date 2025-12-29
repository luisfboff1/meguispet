-- ============================================================================
-- AUTOMATIC STOCK HISTORY TRIGGERS
-- ============================================================================
-- This migration creates triggers to automatically record stock history for:
-- 1. New products with initial stock
-- 2. Stock adjustments via produtos_estoques
-- 3. Sales (vendas_itens)
-- 4. Stock movements (movimentacoes_estoque)
-- ============================================================================

-- ============================================================================
-- 1. TRIGGER: Record initial stock when product is created
-- ============================================================================

-- Function to create initial stock history when inserting into produtos_estoques
CREATE OR REPLACE FUNCTION trigger_record_initial_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create history if this is truly new stock (INSERT only)
  IF TG_OP = 'INSERT' AND NEW.quantidade > 0 THEN
    INSERT INTO estoques_historico (
      produto_id,
      estoque_id,
      quantidade_anterior,
      quantidade_nova,
      quantidade_mudanca,
      tipo_operacao,
      operacao_id,
      motivo
    ) VALUES (
      NEW.produto_id,
      NEW.estoque_id,
      0, -- Anterior era zero (novo produto)
      NEW.quantidade,
      NEW.quantidade, -- Mudança = quantidade inicial
      'AJUSTE',
      NULL,
      'Estoque inicial cadastrado'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists (for re-running migration)
DROP TRIGGER IF EXISTS trigger_produtos_estoques_initial_history ON produtos_estoques;

-- Create trigger on INSERT to produtos_estoques
CREATE TRIGGER trigger_produtos_estoques_initial_history
  AFTER INSERT ON produtos_estoques
  FOR EACH ROW
  EXECUTE FUNCTION trigger_record_initial_stock();

COMMENT ON FUNCTION trigger_record_initial_stock IS
  'Automatically creates stock history record when new stock is created with initial quantity';

-- ============================================================================
-- 2. TRIGGER: Record stock changes on UPDATE to produtos_estoques
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_record_stock_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only record if quantity actually changed
  IF OLD.quantidade IS DISTINCT FROM NEW.quantidade THEN
    -- Check if this change was already recorded by adjust_stock_with_lock
    -- We do this by checking if there's a recent record (within last 2 seconds)
    -- with matching values to avoid duplicates
    IF NOT EXISTS (
      SELECT 1 FROM estoques_historico
      WHERE produto_id = NEW.produto_id
        AND estoque_id = NEW.estoque_id
        AND quantidade_anterior = OLD.quantidade
        AND quantidade_nova = NEW.quantidade
        AND created_at > NOW() - INTERVAL '2 seconds'
    ) THEN
      INSERT INTO estoques_historico (
        produto_id,
        estoque_id,
        quantidade_anterior,
        quantidade_nova,
        quantidade_mudanca,
        tipo_operacao,
        operacao_id,
        motivo
      ) VALUES (
        NEW.produto_id,
        NEW.estoque_id,
        OLD.quantidade,
        NEW.quantidade,
        NEW.quantidade - OLD.quantidade,
        'AJUSTE',
        NULL,
        'Ajuste manual de estoque'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_produtos_estoques_change_history ON produtos_estoques;

-- Create trigger on UPDATE to produtos_estoques
CREATE TRIGGER trigger_produtos_estoques_change_history
  AFTER UPDATE ON produtos_estoques
  FOR EACH ROW
  EXECUTE FUNCTION trigger_record_stock_change();

COMMENT ON FUNCTION trigger_record_stock_change IS
  'Automatically creates stock history record when stock quantity is updated manually';

-- ============================================================================
-- 3. ENSURE vendas and movimentacoes use adjust_stock_with_lock
-- ============================================================================
-- This is handled in the application code (API endpoints)
-- The APIs should ALWAYS call adjust_stock_with_lock() instead of direct UPDATE
-- to ensure history is recorded with proper tipo_operacao and operacao_id

-- ============================================================================
-- 4. HELPER: Function to get current stock history status
-- ============================================================================

CREATE OR REPLACE FUNCTION get_stock_history_status(p_produto_id BIGINT)
RETURNS TABLE(
  has_history BOOLEAN,
  first_record_date TIMESTAMPTZ,
  total_records BIGINT,
  estoque_inicial INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) > 0 as has_history,
    MIN(created_at) as first_record_date,
    COUNT(*) as total_records,
    CASE
      WHEN COUNT(*) > 0 THEN
        (SELECT quantidade_anterior FROM estoques_historico
         WHERE produto_id = p_produto_id
         ORDER BY created_at ASC LIMIT 1)
      ELSE 0
    END as estoque_inicial
  FROM estoques_historico
  WHERE produto_id = p_produto_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_stock_history_status IS
  'Returns history status for a product: if it has history, when it started, total records, and initial stock';

-- ============================================================================
-- 5. BACKFILL: Create history for existing products without history
-- ============================================================================

-- This query creates initial history for products that don't have any
-- IMPORTANT: Review the results before running!

-- First, check which products are missing history:
-- SELECT
--   p.id,
--   p.nome,
--   pe.estoque_id,
--   pe.quantidade,
--   e.nome as estoque_nome
-- FROM produtos p
-- LEFT JOIN produtos_estoques pe ON pe.produto_id = p.id
-- LEFT JOIN estoques e ON e.id = pe.estoque_id
-- WHERE NOT EXISTS (
--   SELECT 1 FROM estoques_historico eh
--   WHERE eh.produto_id = p.id AND eh.estoque_id = pe.estoque_id
-- )
-- AND pe.quantidade > 0
-- ORDER BY p.id;

-- To backfill history for products without any records:
-- INSERT INTO estoques_historico (
--   produto_id,
--   estoque_id,
--   quantidade_anterior,
--   quantidade_nova,
--   quantidade_mudanca,
--   tipo_operacao,
--   operacao_id,
--   motivo,
--   created_at
-- )
-- SELECT
--   p.id as produto_id,
--   pe.estoque_id,
--   0 as quantidade_anterior,
--   pe.quantidade as quantidade_nova,
--   pe.quantidade as quantidade_mudanca,
--   'AJUSTE' as tipo_operacao,
--   NULL as operacao_id,
--   'Estoque inicial retroativo (backfill)' as motivo,
--   COALESCE(p.created_at, NOW()) as created_at
-- FROM produtos p
-- LEFT JOIN produtos_estoques pe ON pe.produto_id = p.id
-- WHERE NOT EXISTS (
--   SELECT 1 FROM estoques_historico eh
--   WHERE eh.produto_id = p.id AND eh.estoque_id = pe.estoque_id
-- )
-- AND pe.quantidade > 0;

-- ============================================================================
-- 6. GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION trigger_record_initial_stock TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_record_stock_change TO authenticated;
GRANT EXECUTE ON FUNCTION get_stock_history_status TO authenticated;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
