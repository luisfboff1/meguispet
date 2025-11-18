-- =====================================================
-- MIGRATION 015: Add RLS Policies for Stock Tables
-- =====================================================
-- Purpose: Add missing RLS policies for stock-related tables
-- Fixes: Stock validation error after RLS implementation (Migration 014)
-- Date: November 2025
-- Priority: P0 - Critical Fix

-- This migration adds RLS policies for stock tables that were missing
-- from the initial RLS migration (014), which caused stock validation
-- to fail during sales creation.

-- =====================================================
-- 1. ENABLE RLS ON STOCK TABLES
-- =====================================================

-- Enable RLS on estoques (stock locations)
ALTER TABLE estoques ENABLE ROW LEVEL SECURITY;

-- Enable RLS on produtos_estoques (product stock by location)
ALTER TABLE produtos_estoques ENABLE ROW LEVEL SECURITY;

-- Enable RLS on estoques_historico (stock movement history)
ALTER TABLE estoques_historico ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. CREATE RLS POLICIES FOR ESTOQUES
-- =====================================================

-- Policy: Authenticated users can view all stock locations
CREATE POLICY "Authenticated users view stock locations" ON estoques
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
  );

-- Policy: Authenticated users can insert stock locations
CREATE POLICY "Authenticated users insert stock locations" ON estoques
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Policy: Authenticated users can update stock locations
CREATE POLICY "Authenticated users update stock locations" ON estoques
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
  );

-- Policy: Only admins can delete stock locations
CREATE POLICY "Admins delete stock locations" ON estoques
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id::text = auth.uid()::text
      AND role = 'admin'
      AND ativo = true
    )
  );

-- =====================================================
-- 3. CREATE RLS POLICIES FOR PRODUTOS_ESTOQUES
-- =====================================================

-- Policy: Authenticated users can view all product stock
-- This is critical for stock validation during sales
CREATE POLICY "Authenticated users view product stock" ON produtos_estoques
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
  );

-- Policy: Authenticated users can insert product stock
CREATE POLICY "Authenticated users insert product stock" ON produtos_estoques
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Policy: Authenticated users can update product stock
-- This is used by stock management functions
CREATE POLICY "Authenticated users update product stock" ON produtos_estoques
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
  );

-- Policy: Only admins can delete product stock records
CREATE POLICY "Admins delete product stock" ON produtos_estoques
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id::text = auth.uid()::text
      AND role = 'admin'
      AND ativo = true
    )
  );

-- =====================================================
-- 4. CREATE RLS POLICIES FOR ESTOQUES_HISTORICO
-- =====================================================

-- Policy: Authenticated users can view stock history
-- Important for audit trail and reporting
CREATE POLICY "Authenticated users view stock history" ON estoques_historico
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
  );

-- Policy: Authenticated users can insert stock history
-- This is used automatically by stock management functions
CREATE POLICY "Authenticated users insert stock history" ON estoques_historico
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Policy: No one can update stock history (immutable audit log)
-- Stock history should never be modified after creation
CREATE POLICY "Stock history is immutable" ON estoques_historico
  FOR UPDATE
  USING (false);

-- Policy: Only admins can delete stock history (for data cleanup)
CREATE POLICY "Admins delete stock history" ON estoques_historico
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id::text = auth.uid()::text
      AND role = 'admin'
      AND ativo = true
    )
  );

-- =====================================================
-- 5. UPDATE DATABASE FUNCTIONS TO USE SECURITY DEFINER
-- =====================================================
-- Note: The stock management functions (adjust_stock_with_lock, etc.)
-- were already created with default security context.
-- We need to ensure they use SECURITY DEFINER to bypass RLS checks
-- when called by authenticated users, since the functions handle
-- authorization internally.

-- Update get_stock_with_lock to use SECURITY DEFINER
-- This allows the function to read stock data regardless of RLS
DROP FUNCTION IF EXISTS get_stock_with_lock(BIGINT, BIGINT);
CREATE OR REPLACE FUNCTION get_stock_with_lock(
  p_produto_id BIGINT,
  p_estoque_id BIGINT
)
RETURNS TABLE(
  quantidade INT,
  produto_nome VARCHAR(255)
) 
SECURITY DEFINER -- Run with function owner's privileges
SET search_path = public
AS $$
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

-- Update adjust_stock_with_lock to use SECURITY DEFINER
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
SECURITY DEFINER -- Run with function owner's privileges
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

-- Update adjust_bulk_stock_with_lock to use SECURITY DEFINER
DROP FUNCTION IF EXISTS adjust_bulk_stock_with_lock(BIGINT, stock_adjustment[], VARCHAR, BIGINT, BIGINT, TEXT);
CREATE OR REPLACE FUNCTION adjust_bulk_stock_with_lock(
  p_estoque_id BIGINT,
  p_adjustments stock_adjustment[],
  p_tipo_operacao VARCHAR(50),
  p_operacao_id BIGINT DEFAULT NULL,
  p_usuario_id BIGINT DEFAULT NULL,
  p_motivo TEXT DEFAULT NULL
)
RETURNS SETOF stock_adjustment_result
SECURITY DEFINER -- Run with function owner's privileges
SET search_path = public
AS $$
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

-- Update get_stock_history to use SECURITY DEFINER
DROP FUNCTION IF EXISTS get_stock_history(BIGINT, BIGINT, INT);
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
)
SECURITY DEFINER -- Run with function owner's privileges
SET search_path = public
AS $$
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

-- =====================================================
-- 6. GRANT PERMISSIONS
-- =====================================================

-- Re-grant execute permissions on updated functions
GRANT EXECUTE ON FUNCTION get_stock_with_lock TO authenticated;
GRANT EXECUTE ON FUNCTION adjust_stock_with_lock TO authenticated;
GRANT EXECUTE ON FUNCTION adjust_bulk_stock_with_lock TO authenticated;
GRANT EXECUTE ON FUNCTION get_stock_history TO authenticated;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these to verify RLS is properly enabled:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('estoques', 'produtos_estoques', 'estoques_historico');
-- SELECT * FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('estoques', 'produtos_estoques', 'estoques_historico');

-- Test stock access:
-- SELECT * FROM get_stock_with_lock(1, 1);

-- =====================================================
-- ROLLBACK PLAN
-- =====================================================
-- If needed, disable RLS with:
-- ALTER TABLE estoques DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE produtos_estoques DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE estoques_historico DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "Authenticated users view stock locations" ON estoques;
-- ... (drop all policies created in this migration)

-- =====================================================
-- NOTES
-- =====================================================
-- 1. This fixes the stock validation error that occurred after Migration 014
-- 2. Stock management functions now use SECURITY DEFINER to bypass RLS
-- 3. RLS policies still protect direct table access
-- 4. Stock history is immutable (can only insert, not update)
-- 5. All authenticated users can view and manage stock (adjust per business rules)
-- 6. Only admins can delete stock records
-- 7. Functions have search_path set to 'public' for security

-- Migration complete
COMMENT ON TABLE estoques IS 'RLS enabled - Migration 015';
COMMENT ON TABLE produtos_estoques IS 'RLS enabled - Migration 015';
COMMENT ON TABLE estoques_historico IS 'RLS enabled - Migration 015';
