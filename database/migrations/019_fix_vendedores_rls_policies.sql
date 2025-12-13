-- =====================================================
-- MIGRATION 019: Fix Vendedores RLS Policies
-- =====================================================
-- Purpose: Fix RLS policies to use 'tipo_usuario' instead of legacy 'role' field
-- Issue: Admins cannot create vendedores because RLS checks legacy 'role' field
-- Date: 2025-12-12
-- =====================================================

BEGIN;

-- =====================================================
-- 1. FIX VENDEDORES RLS POLICIES
-- =====================================================

-- Drop old policy that uses legacy 'role' field
DROP POLICY IF EXISTS "Admins manage sellers" ON vendedores;

-- Create new policy using modern 'tipo_usuario' field
CREATE POLICY "Admins manage sellers" ON vendedores
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id::text = auth.uid()::text
      AND tipo_usuario IN ('admin', 'gerente', 'estoque')  -- Allow admin, gerente, estoque roles
      AND ativo = true
    )
  );

-- =====================================================
-- 2. FIX CLIENTES_FORNECEDORES RLS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Admins delete clients" ON clientes_fornecedores;

CREATE POLICY "Admins delete clients" ON clientes_fornecedores
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id::text = auth.uid()::text
      AND tipo_usuario = 'admin'
      AND ativo = true
    )
  );

-- =====================================================
-- 3. FIX PRODUTOS RLS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Admins delete products" ON produtos;

CREATE POLICY "Admins delete products" ON produtos
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id::text = auth.uid()::text
      AND tipo_usuario = 'admin'
      AND ativo = true
    )
  );

-- =====================================================
-- 4. FIX VENDAS RLS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Admins delete sales" ON vendas;

CREATE POLICY "Admins delete sales" ON vendas
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id::text = auth.uid()::text
      AND tipo_usuario IN ('admin', 'gerente')
      AND ativo = true
    )
  );

-- =====================================================
-- 5. FIX VENDAS_ITENS RLS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Admins delete sale items" ON vendas_itens;

CREATE POLICY "Admins delete sale items" ON vendas_itens
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id::text = auth.uid()::text
      AND tipo_usuario = 'admin'
      AND ativo = true
    )
  );

-- =====================================================
-- 6. FIX TRANSACOES RLS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Admins delete transactions" ON transacoes;

CREATE POLICY "Admins delete transactions" ON transacoes
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id::text = auth.uid()::text
      AND tipo_usuario IN ('admin', 'gerente', 'financeiro')
      AND ativo = true
    )
  );

-- =====================================================
-- 7. FIX MOVIMENTACOES_ESTOQUE RLS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Admins delete stock movements" ON movimentacoes_estoque;

CREATE POLICY "Admins delete stock movements" ON movimentacoes_estoque
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id::text = auth.uid()::text
      AND tipo_usuario IN ('admin', 'gerente', 'estoque')
      AND ativo = true
    )
  );

-- =====================================================
-- 8. FIX ESTOQUES RLS POLICIES (from migration 015)
-- =====================================================

DROP POLICY IF EXISTS "Admins delete stock locations" ON estoques;

CREATE POLICY "Admins delete stock locations" ON estoques
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id::text = auth.uid()::text
      AND tipo_usuario IN ('admin', 'gerente', 'estoque')
      AND ativo = true
    )
  );

-- =====================================================
-- 9. FIX PRODUTOS_ESTOQUES RLS POLICIES (from migration 015)
-- =====================================================

DROP POLICY IF EXISTS "Admins delete product stock" ON produtos_estoques;

CREATE POLICY "Admins delete product stock" ON produtos_estoques
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id::text = auth.uid()::text
      AND tipo_usuario IN ('admin', 'gerente', 'estoque')
      AND ativo = true
    )
  );

-- =====================================================
-- 10. FIX ESTOQUES_HISTORICO RLS POLICIES (from migration 015)
-- =====================================================

DROP POLICY IF EXISTS "Admins delete stock history" ON estoques_historico;

CREATE POLICY "Admins delete stock history" ON estoques_historico
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id::text = auth.uid()::text
      AND tipo_usuario = 'admin'
      AND ativo = true
    )
  );

-- =====================================================
-- 11. FIX CONDICOES_PAGAMENTO RLS POLICIES (if table exists)
-- =====================================================

DO $$
BEGIN
  -- Check if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'condicoes_pagamento') THEN

    -- Drop old policy
    EXECUTE 'DROP POLICY IF EXISTS "Admins manage payment conditions" ON condicoes_pagamento';

    -- Create new policy using tipo_usuario
    EXECUTE 'CREATE POLICY "Admins manage payment conditions" ON condicoes_pagamento
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM usuarios
          WHERE supabase_user_id::text = auth.uid()::text
          AND tipo_usuario IN (''admin'', ''gerente'')
          AND ativo = true
        )
      )';

    RAISE NOTICE '✅ Fixed condicoes_pagamento RLS policy';
  ELSE
    RAISE NOTICE 'ℹ️  Table condicoes_pagamento does not exist, skipping';
  END IF;
END $$;

-- =====================================================
-- 3. VERIFICATION
-- =====================================================

-- List all RLS policies for vendedores table
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'vendedores'
ORDER BY policyname;

-- Test: Verify that policy definition is correct
DO $$
DECLARE
  policy_definition TEXT;
BEGIN
  -- qual column in pg_policies is already text, no need for pg_get_expr
  SELECT qual INTO policy_definition
  FROM pg_policies
  WHERE tablename = 'vendedores' AND policyname = 'Admins manage sellers';

  IF policy_definition LIKE '%tipo_usuario%' THEN
    RAISE NOTICE '✅ SUCESSO: Política RLS de vendedores agora usa "tipo_usuario"';
  ELSE
    RAISE WARNING '⚠️  AVISO: Política ainda pode estar usando campo legado';
  END IF;
END $$;

-- =====================================================
-- 4. REPORT COMPLETION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '✅ Migração 019 Concluída';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Alterações realizadas:';
  RAISE NOTICE '  - ✅ vendedores: admin, gerente, estoque';
  RAISE NOTICE '  - ✅ clientes_fornecedores: admin';
  RAISE NOTICE '  - ✅ produtos: admin';
  RAISE NOTICE '  - ✅ vendas: admin, gerente';
  RAISE NOTICE '  - ✅ vendas_itens: admin';
  RAISE NOTICE '  - ✅ transacoes: admin, gerente, financeiro';
  RAISE NOTICE '  - ✅ movimentacoes_estoque: admin, gerente, estoque';
  RAISE NOTICE '  - ✅ estoques: admin, gerente, estoque';
  RAISE NOTICE '  - ✅ produtos_estoques: admin, gerente, estoque';
  RAISE NOTICE '  - ✅ estoques_historico: admin';
  RAISE NOTICE '  - ✅ condicoes_pagamento: admin, gerente';
  RAISE NOTICE '';
  RAISE NOTICE '  Todas as políticas agora usam "tipo_usuario"';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANTE:';
  RAISE NOTICE '  - Usuários admin devem fazer logout/login';
  RAISE NOTICE '  - Teste criar vendedores com perfil admin';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '';
END $$;

COMMIT;

-- =====================================================
-- ROLLBACK (if needed)
-- =====================================================
-- BEGIN;
--
-- -- Restore old policy (using role field)
-- DROP POLICY IF EXISTS "Admins manage sellers" ON vendedores;
-- CREATE POLICY "Admins manage sellers" ON vendedores
--   FOR ALL
--   USING (
--     EXISTS (
--       SELECT 1 FROM usuarios
--       WHERE supabase_user_id::text = auth.uid()::text
--       AND role IN ('admin', 'manager')
--       AND ativo = true
--     )
--   );
--
-- COMMIT;
-- =====================================================
