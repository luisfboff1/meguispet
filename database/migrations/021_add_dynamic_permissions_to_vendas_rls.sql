-- =====================================================
-- MIGRATION 021: Add Dynamic Permissions to Vendas RLS
-- =====================================================
-- Purpose: Allow vendedores with custom vendas_deletar permission to delete sales
-- Issue: Current RLS policy only allows admin/gerente, blocking vendedores with custom permissions
-- Date: 2025-12-14
-- =====================================================

BEGIN;

-- =====================================================
-- 1. DROP OLD RESTRICTIVE POLICY
-- =====================================================

DROP POLICY IF EXISTS "Admins delete sales" ON vendas;

-- =====================================================
-- 2. CREATE NEW POLICY - CHECK DYNAMIC PERMISSIONS
-- =====================================================

CREATE POLICY "Users with delete permission can delete sales" ON vendas
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      LEFT JOIN role_permissions_config rpc ON rpc.role = u.tipo_usuario
      WHERE u.supabase_user_id::text = auth.uid()::text
      AND u.ativo = true
      AND (
        -- Admin e gerente sempre podem deletar
        u.tipo_usuario IN ('admin', 'gerente')
        OR
        -- OU: Tem permissão dinâmica de role_permissions_config
        (rpc.permissions->>'vendas_deletar')::boolean = true
        OR
        -- OU: Tem permissão customizada individual
        (u.permissoes_custom->>'vendas_deletar')::boolean = true
      )
    )
  );

-- =====================================================
-- 3. UPDATE vendas_itens RLS POLICY (CASCADE DELETE)
-- =====================================================

DROP POLICY IF EXISTS "Admins delete sale items" ON vendas_itens;

CREATE POLICY "Users with delete permission can delete sale items" ON vendas_itens
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      LEFT JOIN role_permissions_config rpc ON rpc.role = u.tipo_usuario
      WHERE u.supabase_user_id::text = auth.uid()::text
      AND u.ativo = true
      AND (
        u.tipo_usuario IN ('admin', 'gerente')
        OR
        (rpc.permissions->>'vendas_deletar')::boolean = true
        OR
        (u.permissoes_custom->>'vendas_deletar')::boolean = true
      )
    )
  );

-- =====================================================
-- 4. UPDATE venda_parcelas RLS POLICY (CASCADE DELETE)
-- =====================================================

-- Create policy if it doesn't exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'venda_parcelas') THEN

    -- Drop old policy
    EXECUTE 'DROP POLICY IF EXISTS "Admins delete parcelas" ON venda_parcelas';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete parcelas" ON venda_parcelas';

    -- Create new policy using dynamic permissions
    EXECUTE 'CREATE POLICY "Users with delete permission can delete parcelas" ON venda_parcelas
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM usuarios u
          LEFT JOIN role_permissions_config rpc ON rpc.role = u.tipo_usuario
          WHERE u.supabase_user_id::text = auth.uid()::text
          AND u.ativo = true
          AND (
            u.tipo_usuario IN (''admin'', ''gerente'')
            OR
            (rpc.permissions->>''vendas_deletar'')::boolean = true
            OR
            (u.permissoes_custom->>''vendas_deletar'')::boolean = true
          )
        )
      )';

    RAISE NOTICE '✅ Fixed venda_parcelas RLS policy';
  ELSE
    RAISE NOTICE 'ℹ️  Table venda_parcelas does not exist, skipping';
  END IF;
END $$;

-- =====================================================
-- 5. UPDATE transacoes RLS POLICY (CASCADE DELETE)
-- =====================================================

-- Only update if related to vendas
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transacoes') THEN

    -- Drop old policy
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete transactions related to vendas" ON transacoes';

    -- Create new policy for venda-related transactions
    EXECUTE 'CREATE POLICY "Users with delete permission can delete venda transactions" ON transacoes
      FOR DELETE
      USING (
        -- Only apply to venda-related transactions
        venda_id IS NOT NULL
        AND
        EXISTS (
          SELECT 1 FROM usuarios u
          LEFT JOIN role_permissions_config rpc ON rpc.role = u.tipo_usuario
          WHERE u.supabase_user_id::text = auth.uid()::text
          AND u.ativo = true
          AND (
            u.tipo_usuario IN (''admin'', ''gerente'', ''financeiro'')
            OR
            (rpc.permissions->>''vendas_deletar'')::boolean = true
            OR
            (u.permissoes_custom->>''vendas_deletar'')::boolean = true
          )
        )
      )';

    RAISE NOTICE '✅ Fixed transacoes RLS policy';
  ELSE
    RAISE NOTICE 'ℹ️  Table transacoes does not exist, skipping';
  END IF;
END $$;

-- =====================================================
-- 6. VERIFICATION
-- =====================================================

-- List all RLS policies for vendas table
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('vendas', 'vendas_itens', 'venda_parcelas', 'transacoes')
ORDER BY tablename, policyname;

-- =====================================================
-- 7. REPORT COMPLETION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '✅ Migração 021 Concluída';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Alterações realizadas:';
  RAISE NOTICE '  - ✅ vendas: Agora verifica permissões dinâmicas';
  RAISE NOTICE '  - ✅ vendas_itens: Agora verifica permissões dinâmicas';
  RAISE NOTICE '  - ✅ venda_parcelas: Agora verifica permissões dinâmicas';
  RAISE NOTICE '  - ✅ transacoes: Agora verifica permissões dinâmicas (se venda_id)';
  RAISE NOTICE '';
  RAISE NOTICE '  Usuários com vendas_deletar = true podem deletar vendas:';
  RAISE NOTICE '  - Admin/Gerente (sempre)';
  RAISE NOTICE '  - role_permissions_config[tipo_usuario].vendas_deletar = true';
  RAISE NOTICE '  - usuarios.permissoes_custom.vendas_deletar = true';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANTE:';
  RAISE NOTICE '  - Vendedores com permissão custom agora podem deletar';
  RAISE NOTICE '  - Teste login como vendedor e tente deletar venda';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '';
END $$;

COMMIT;

-- =====================================================
-- ROLLBACK (if needed)
-- =====================================================
-- BEGIN;
--
-- -- Restore old restrictive policies
-- DROP POLICY IF EXISTS "Users with delete permission can delete sales" ON vendas;
-- CREATE POLICY "Admins delete sales" ON vendas
--   FOR DELETE
--   USING (
--     EXISTS (
--       SELECT 1 FROM usuarios
--       WHERE supabase_user_id::text = auth.uid()::text
--       AND tipo_usuario IN ('admin', 'gerente')
--       AND ativo = true
--     )
--   );
--
-- COMMIT;
-- =====================================================
