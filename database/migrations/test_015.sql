-- =====================================================
-- TEST SCRIPT FOR MIGRATION 015
-- =====================================================
-- Run this script AFTER applying Migration 015 to verify
-- that RLS policies and stock functions are working correctly
-- =====================================================

-- =====================================================
-- 1. VERIFY RLS IS ENABLED
-- =====================================================
SELECT 
  tablename, 
  rowsecurity,
  CASE WHEN rowsecurity THEN '✅ Enabled' ELSE '❌ Disabled' END as status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('estoques', 'produtos_estoques', 'estoques_historico')
ORDER BY tablename;

-- Expected: All three tables should show "✅ Enabled"

-- =====================================================
-- 2. VERIFY POLICIES EXIST
-- =====================================================
SELECT 
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'SELECT' THEN '🔍 View'
    WHEN cmd = 'INSERT' THEN '➕ Insert'
    WHEN cmd = 'UPDATE' THEN '✏️ Update'
    WHEN cmd = 'DELETE' THEN '🗑️ Delete'
    WHEN cmd = 'ALL' THEN '🔓 All Operations'
  END as operation
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('estoques', 'produtos_estoques', 'estoques_historico')
ORDER BY tablename, policyname;

-- Expected: Should show multiple policies for each table
-- - estoques: 4 policies (SELECT, INSERT, UPDATE, DELETE)
-- - produtos_estoques: 4 policies (SELECT, INSERT, UPDATE, DELETE)
-- - estoques_historico: 4 policies (SELECT, INSERT, immutable UPDATE, DELETE)

-- =====================================================
-- 3. VERIFY FUNCTIONS HAVE SECURITY DEFINER
-- =====================================================
SELECT 
  p.proname as function_name,
  CASE 
    WHEN p.prosecdef THEN '✅ SECURITY DEFINER'
    ELSE '❌ SECURITY INVOKER'
  END as security_mode,
  pg_get_function_identity_arguments(p.oid) as arguments
FROM pg_proc p
WHERE p.proname IN (
  'get_stock_with_lock',
  'adjust_stock_with_lock',
  'adjust_bulk_stock_with_lock',
  'get_stock_history'
)
ORDER BY p.proname;

-- Expected: All four functions should show "✅ SECURITY DEFINER"

-- =====================================================
-- 4. TEST STOCK ACCESS (Get first available product)
-- =====================================================
-- This will test if authenticated users can access stock data

DO $$
DECLARE
  test_produto_id BIGINT;
  test_estoque_id BIGINT;
  test_result RECORD;
BEGIN
  -- Get first product that has stock
  SELECT pe.produto_id, pe.estoque_id 
  INTO test_produto_id, test_estoque_id
  FROM produtos_estoques pe
  WHERE pe.quantidade > 0
  LIMIT 1;

  IF test_produto_id IS NULL THEN
    RAISE NOTICE '⚠️ No products with stock found. Please add stock to test.';
  ELSE
    -- Test the function
    SELECT * INTO test_result
    FROM get_stock_with_lock(test_produto_id, test_estoque_id);
    
    IF test_result IS NULL THEN
      RAISE NOTICE '❌ FAIL: get_stock_with_lock returned NULL';
    ELSE
      RAISE NOTICE '✅ SUCCESS: get_stock_with_lock returned stock data';
      RAISE NOTICE '   Product: % (ID: %)', test_result.produto_nome, test_produto_id;
      RAISE NOTICE '   Stock: % units', test_result.quantidade;
    END IF;
  END IF;
END $$;

-- =====================================================
-- 5. VERIFY HISTORY TABLE IS IMMUTABLE
-- =====================================================
-- Test that stock history cannot be updated

DO $$
DECLARE
  test_history_id BIGINT;
BEGIN
  -- Get first history record
  SELECT id INTO test_history_id
  FROM estoques_historico
  LIMIT 1;
  
  IF test_history_id IS NULL THEN
    RAISE NOTICE '⚠️ No history records found. This is expected for new installations.';
  ELSE
    -- Try to update (should fail)
    BEGIN
      UPDATE estoques_historico 
      SET quantidade_mudanca = 999 
      WHERE id = test_history_id;
      
      RAISE NOTICE '❌ FAIL: History table should be immutable!';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '✅ SUCCESS: History table is properly immutable';
      RAISE NOTICE '   Error (expected): %', SQLERRM;
    END;
  END IF;
END $$;

-- =====================================================
-- 6. COUNT TOTAL POLICIES
-- =====================================================
SELECT 
  'Total RLS Policies' as metric,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) >= 12 THEN '✅ Complete'
    ELSE '⚠️ Missing policies'
  END as status
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('estoques', 'produtos_estoques', 'estoques_historico');

-- Expected: At least 12 policies total (4 per table)

-- =====================================================
-- 7. SUMMARY
-- =====================================================
-- This will show a summary of the migration status

SELECT 
  '====================' as separator,
  'MIGRATION 015 STATUS' as title,
  '====================' as separator2
UNION ALL
SELECT 
  '',
  'All tests completed. Review output above.',
  ''
UNION ALL
SELECT 
  '',
  'If all checks show ✅, migration was successful!',
  '';

-- =====================================================
-- NOTES
-- =====================================================
-- If any test fails, review the migration file and ensure
-- it was applied completely. You can rerun the migration
-- as it's designed to be idempotent (safe to run multiple times).
--
-- Common issues:
-- 1. Functions not showing SECURITY DEFINER
--    → Rerun the function creation part of the migration
-- 2. Policies missing
--    → Check for policy name conflicts or syntax errors
-- 3. get_stock_with_lock returns NULL
--    → Verify produtos_estoques table has data
--    → Check that both produto_id and estoque_id exist
