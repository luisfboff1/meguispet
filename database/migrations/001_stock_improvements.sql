-- ============================================================================
-- STOCK MANAGEMENT IMPROVEMENTS - Migration 001
-- ============================================================================
-- This migration adds:
-- 1. Stock history table for audit trail
-- 2. Transactional functions with row-level locking
-- 3. Automatic triggers for tracking changes
-- ============================================================================

-- ============================================================================
-- 1. STOCK HISTORY TABLE
-- ============================================================================
-- Tracks all stock movements with full audit trail
CREATE TABLE IF NOT EXISTS estoques_historico (
  id BIGSERIAL PRIMARY KEY,
  produto_id BIGINT NOT NULL,
  estoque_id BIGINT NOT NULL,
  quantidade_anterior INT NOT NULL,
  quantidade_nova INT NOT NULL,
  quantidade_mudanca INT NOT NULL, -- Can be positive (add) or negative (remove)
  tipo_operacao VARCHAR(50) NOT NULL, -- 'VENDA', 'COMPRA', 'AJUSTE', 'ESTORNO', 'TRANSFERENCIA'
  operacao_id BIGINT, -- References venda_id, compra_id, etc.
  usuario_id BIGINT, -- Who made the change
  motivo TEXT, -- Optional reason for adjustment
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CONSTRAINT fk_produto FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE,
  CONSTRAINT fk_estoque FOREIGN KEY (estoque_id) REFERENCES estoques(id) ON DELETE CASCADE,
  CONSTRAINT chk_tipo_operacao CHECK (tipo_operacao IN ('VENDA', 'COMPRA', 'AJUSTE', 'ESTORNO', 'TRANSFERENCIA', 'DEVOLUCAO'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_estoques_historico_produto ON estoques_historico(produto_id);
CREATE INDEX IF NOT EXISTS idx_estoques_historico_estoque ON estoques_historico(estoque_id);
CREATE INDEX IF NOT EXISTS idx_estoques_historico_operacao ON estoques_historico(tipo_operacao, operacao_id);
CREATE INDEX IF NOT EXISTS idx_estoques_historico_created ON estoques_historico(created_at DESC);

-- Comment for documentation
COMMENT ON TABLE estoques_historico IS 'Audit trail for all stock movements. Tracks who, what, when, and why stock changed.';

-- ============================================================================
-- 2. TRANSACTIONAL STOCK ADJUSTMENT WITH LOCKING
-- ============================================================================
-- This function provides atomic stock updates with row-level locking
-- preventing race conditions in concurrent operations

CREATE OR REPLACE FUNCTION adjust_stock_with_lock(
  p_produto_id BIGINT,
  p_estoque_id BIGINT,
  p_quantidade_mudanca INT,
  p_tipo_operacao VARCHAR(50),
  p_operacao_id BIGINT DEFAULT NULL,
  p_usuario_id BIGINT DEFAULT NULL,
  p_motivo TEXT DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  error_message TEXT,
  old_quantity INT,
  new_quantity INT
) AS $$
DECLARE
  v_quantidade_anterior INT;
  v_quantidade_nova INT;
  v_record_exists BOOLEAN;
BEGIN
  -- Lock the row for update (prevents concurrent modifications)
  SELECT quantidade, TRUE INTO v_quantidade_anterior, v_record_exists
  FROM produtos_estoques
  WHERE produto_id = p_produto_id
    AND estoque_id = p_estoque_id
  FOR UPDATE NOWAIT; -- NOWAIT prevents deadlocks by failing immediately if locked

  -- Check if record exists
  IF NOT v_record_exists OR v_quantidade_anterior IS NULL THEN
    RETURN QUERY SELECT
      FALSE,
      'Stock record not found for product ' || p_produto_id || ' in stock location ' || p_estoque_id,
      NULL::INT,
      NULL::INT;
    RETURN;
  END IF;

  -- Calculate new quantity
  v_quantidade_nova := v_quantidade_anterior + p_quantidade_mudanca;

  -- Validate: prevent negative stock
  IF v_quantidade_nova < 0 THEN
    RETURN QUERY SELECT
      FALSE,
      'Insufficient stock: current=' || v_quantidade_anterior || ', requested change=' || p_quantidade_mudanca || ', would result in=' || v_quantidade_nova,
      v_quantidade_anterior,
      NULL::INT;
    RETURN;
  END IF;

  -- Update stock
  UPDATE produtos_estoques
  SET
    quantidade = v_quantidade_nova,
    updated_at = CURRENT_TIMESTAMP
  WHERE produto_id = p_produto_id
    AND estoque_id = p_estoque_id;

  -- Insert history record
  INSERT INTO estoques_historico (
    produto_id,
    estoque_id,
    quantidade_anterior,
    quantidade_nova,
    quantidade_mudanca,
    tipo_operacao,
    operacao_id,
    usuario_id,
    motivo
  ) VALUES (
    p_produto_id,
    p_estoque_id,
    v_quantidade_anterior,
    v_quantidade_nova,
    p_quantidade_mudanca,
    p_tipo_operacao,
    p_operacao_id,
    p_usuario_id,
    p_motivo
  );

  -- Return success
  RETURN QUERY SELECT
    TRUE,
    NULL::TEXT,
    v_quantidade_anterior,
    v_quantidade_nova;

EXCEPTION
  WHEN lock_not_available THEN
    -- Another transaction is modifying this stock right now
    RETURN QUERY SELECT
      FALSE,
      'Stock is currently locked by another operation. Please retry.',
      NULL::INT,
      NULL::INT;
  WHEN OTHERS THEN
    -- Unexpected error
    RETURN QUERY SELECT
      FALSE,
      'Database error: ' || SQLERRM,
      NULL::INT,
      NULL::INT;
END;
$$ LANGUAGE plpgsql;

-- Comment for documentation
COMMENT ON FUNCTION adjust_stock_with_lock IS 'Atomically adjusts stock with row-level locking and automatic history tracking. Prevents race conditions and negative stock.';

-- ============================================================================
-- 3. BULK STOCK ADJUSTMENT (For multiple products in one transaction)
-- ============================================================================
-- Used for sales and purchases with multiple items

CREATE TYPE stock_adjustment AS (
  produto_id BIGINT,
  quantidade_mudanca INT
);

CREATE TYPE stock_adjustment_result AS (
  produto_id BIGINT,
  success BOOLEAN,
  error_message TEXT,
  old_quantity INT,
  new_quantity INT
);

CREATE OR REPLACE FUNCTION adjust_bulk_stock_with_lock(
  p_estoque_id BIGINT,
  p_adjustments stock_adjustment[],
  p_tipo_operacao VARCHAR(50),
  p_operacao_id BIGINT DEFAULT NULL,
  p_usuario_id BIGINT DEFAULT NULL,
  p_motivo TEXT DEFAULT NULL
)
RETURNS SETOF stock_adjustment_result AS $$
DECLARE
  v_adjustment stock_adjustment;
  v_result RECORD;
  v_all_success BOOLEAN := TRUE;
  v_error_count INT := 0;
BEGIN
  -- Process each adjustment
  FOR v_adjustment IN SELECT * FROM unnest(p_adjustments)
  LOOP
    -- Call single adjustment function
    SELECT * INTO v_result
    FROM adjust_stock_with_lock(
      v_adjustment.produto_id,
      p_estoque_id,
      v_adjustment.quantidade_mudanca,
      p_tipo_operacao,
      p_operacao_id,
      p_usuario_id,
      p_motivo
    );

    -- Track failures
    IF NOT v_result.success THEN
      v_all_success := FALSE;
      v_error_count := v_error_count + 1;
    END IF;

    -- Return result for this product
    RETURN NEXT (
      v_adjustment.produto_id,
      v_result.success,
      v_result.error_message,
      v_result.old_quantity,
      v_result.new_quantity
    )::stock_adjustment_result;
  END LOOP;

  -- If any adjustment failed, rollback the entire transaction
  IF NOT v_all_success THEN
    RAISE EXCEPTION 'Bulk stock adjustment failed for % product(s). Transaction rolled back.', v_error_count;
  END IF;

  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Comment for documentation
COMMENT ON FUNCTION adjust_bulk_stock_with_lock IS 'Adjusts multiple products atomically. Rolls back entire transaction if any adjustment fails.';

-- ============================================================================
-- 4. HELPER FUNCTIONS FOR COMMON OPERATIONS
-- ============================================================================

-- Get current stock with locking (for validation)
CREATE OR REPLACE FUNCTION get_stock_with_lock(
  p_produto_id BIGINT,
  p_estoque_id BIGINT
)
RETURNS TABLE(
  quantidade INT,
  produto_nome VARCHAR(255)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pe.quantidade,
    p.nome
  FROM produtos_estoques pe
  JOIN produtos p ON p.id = pe.produto_id
  WHERE pe.produto_id = p_produto_id
    AND pe.estoque_id = p_estoque_id
  FOR UPDATE NOWAIT;
END;
$$ LANGUAGE plpgsql;

-- Get stock history for a product
CREATE OR REPLACE FUNCTION get_stock_history(
  p_produto_id BIGINT,
  p_estoque_id BIGINT DEFAULT NULL,
  p_limit INT DEFAULT 50
)
RETURNS TABLE(
  id BIGINT,
  produto_nome VARCHAR(255),
  estoque_nome VARCHAR(255),
  quantidade_anterior INT,
  quantidade_nova INT,
  quantidade_mudanca INT,
  tipo_operacao VARCHAR(50),
  operacao_id BIGINT,
  motivo TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    eh.id,
    p.nome AS produto_nome,
    e.nome AS estoque_nome,
    eh.quantidade_anterior,
    eh.quantidade_nova,
    eh.quantidade_mudanca,
    eh.tipo_operacao,
    eh.operacao_id,
    eh.motivo,
    eh.created_at
  FROM estoques_historico eh
  JOIN produtos p ON p.id = eh.produto_id
  JOIN estoques e ON e.id = eh.estoque_id
  WHERE eh.produto_id = p_produto_id
    AND (p_estoque_id IS NULL OR eh.estoque_id = p_estoque_id)
  ORDER BY eh.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. GRANTS (Adjust based on your RLS policies)
-- ============================================================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION adjust_stock_with_lock TO authenticated;
GRANT EXECUTE ON FUNCTION adjust_bulk_stock_with_lock TO authenticated;
GRANT EXECUTE ON FUNCTION get_stock_with_lock TO authenticated;
GRANT EXECUTE ON FUNCTION get_stock_history TO authenticated;

-- Grant permissions on history table
GRANT SELECT ON estoques_historico TO authenticated;
GRANT INSERT ON estoques_historico TO authenticated;

-- ============================================================================
-- 6. EXAMPLE USAGE
-- ============================================================================

/*
-- Example 1: Adjust stock for a sale
SELECT * FROM adjust_stock_with_lock(
  p_produto_id := 123,
  p_estoque_id := 1,
  p_quantidade_mudanca := -5,  -- Remove 5 units
  p_tipo_operacao := 'VENDA',
  p_operacao_id := 456,  -- Sale ID
  p_usuario_id := 1,
  p_motivo := 'Venda #456'
);

-- Example 2: Bulk adjustment for sale with multiple products
SELECT * FROM adjust_bulk_stock_with_lock(
  p_estoque_id := 1,
  p_adjustments := ARRAY[
    (123, -5)::stock_adjustment,
    (124, -10)::stock_adjustment,
    (125, -2)::stock_adjustment
  ],
  p_tipo_operacao := 'VENDA',
  p_operacao_id := 456,
  p_usuario_id := 1
);

-- Example 3: Get stock history
SELECT * FROM get_stock_history(123, 1, 100);
*/

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
