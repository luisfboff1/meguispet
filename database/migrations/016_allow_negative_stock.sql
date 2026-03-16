-- Migration 016: Allow negative stock
-- Removes the negative stock prevention from adjust_stock_with_lock
-- This allows sales to go through even when stock is zero/insufficient
-- Stock can now go negative, and manual adjustments can correct it later

-- Recreate adjust_stock_with_lock WITHOUT the negative stock check
DROP FUNCTION IF EXISTS adjust_stock_with_lock(BIGINT, BIGINT, INT, VARCHAR, BIGINT, BIGINT, TEXT);
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
)
SECURITY DEFINER
SET search_path = public
AS $$
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
  FOR UPDATE NOWAIT;

  -- Check if record exists
  IF NOT v_record_exists OR v_quantidade_anterior IS NULL THEN
    RETURN QUERY SELECT
      FALSE,
      'Stock record not found for product ' || p_produto_id || ' in stock location ' || p_estoque_id,
      NULL::INT,
      NULL::INT;
    RETURN;
  END IF;

  -- Calculate new quantity (negative stock is now allowed)
  v_quantidade_nova := v_quantidade_anterior + p_quantidade_mudanca;

  -- Update stock (allows negative values for future adjustment)
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
    RETURN QUERY SELECT
      FALSE,
      'Stock is currently locked by another operation. Please retry.',
      NULL::INT,
      NULL::INT;
  WHEN OTHERS THEN
    RETURN QUERY SELECT
      FALSE,
      'Database error: ' || SQLERRM,
      NULL::INT,
      NULL::INT;
END;
$$ LANGUAGE plpgsql;

-- Add AJUSTE_MANUAL to the allowed tipo_operacao values in estoques_historico
ALTER TABLE estoques_historico DROP CONSTRAINT IF EXISTS chk_tipo_operacao;
ALTER TABLE estoques_historico ADD CONSTRAINT chk_tipo_operacao
  CHECK (tipo_operacao IN ('VENDA', 'COMPRA', 'AJUSTE', 'AJUSTE_MANUAL', 'ESTORNO', 'TRANSFERENCIA', 'DEVOLUCAO'));

-- ============================================================================
-- Remove duplicate-causing triggers on produtos_estoques
-- ============================================================================
-- These triggers auto-insert into estoques_historico whenever produtos_estoques
-- is updated. Now that ALL stock changes go through adjust_stock_with_lock
-- (which already inserts into estoques_historico), these triggers cause
-- DUPLICATE entries in the history timeline.
-- 
-- trigger_produtos_estoques_change_history → calls trigger_record_stock_change()
--   Creates a duplicate "AJUSTE" + "Ajuste manual de estoque" entry
-- trigger_produtos_estoques_initial_history → calls trigger_record_initial_stock()
--   Creates a duplicate entry on INSERT

DROP TRIGGER IF EXISTS trigger_produtos_estoques_change_history ON produtos_estoques;
DROP TRIGGER IF EXISTS trigger_produtos_estoques_initial_history ON produtos_estoques;
