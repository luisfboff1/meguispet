-- =====================================================
-- MIGRATION 020: Fix role_permissions_config RLS
-- =====================================================
-- Purpose: Allow all authenticated users to read role_permissions_config
-- Issue: Current policy only allows admins to read, blocking vendedores from fetching dynamic permissions
-- Date: 2025-12-14
-- =====================================================

BEGIN;

-- =====================================================
-- 1. DROP OLD RESTRICTIVE POLICY
-- =====================================================

DROP POLICY IF EXISTS "Admins can read role configs" ON role_permissions_config;

-- =====================================================
-- 2. CREATE NEW POLICY - ALL AUTHENTICATED USERS CAN READ
-- =====================================================

CREATE POLICY "Authenticated users can read role configs"
  ON role_permissions_config
  FOR SELECT
  USING (
    -- Any authenticated user can read their own role's permissions
    auth.uid() IS NOT NULL
  );

-- =====================================================
-- 3. KEEP WRITE POLICY (ADMINS ONLY)
-- =====================================================
-- Policy "Admins can manage role configs" already exists and is correct
-- (Only admins can INSERT/UPDATE/DELETE)

-- =====================================================
-- 4. VERIFICATION
-- =====================================================

-- List all RLS policies for role_permissions_config table
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'role_permissions_config'
ORDER BY policyname;

-- =====================================================
-- 5. REPORT COMPLETION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '✅ Migração 020 Concluída';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Alterações realizadas:';
  RAISE NOTICE '  - ✅ Removida policy restritiva (apenas admins)';
  RAISE NOTICE '  - ✅ Criada policy "Authenticated users can read role configs"';
  RAISE NOTICE '  - ✅ Todos os usuários autenticados podem ler role_permissions_config';
  RAISE NOTICE '  - ✅ Apenas admins podem modificar (policy existente mantida)';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANTE:';
  RAISE NOTICE '  - Vendedores agora podem buscar permissões dinâmicas';
  RAISE NOTICE '  - Teste login como vendedor e verifique console logs';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '';
END $$;

COMMIT;

-- =====================================================
-- ROLLBACK (if needed)
-- =====================================================
-- BEGIN;
--
-- -- Restore old restrictive policy
-- DROP POLICY IF EXISTS "Authenticated users can read role configs" ON role_permissions_config;
--
-- CREATE POLICY "Admins can read role configs"
--   ON role_permissions_config
--   FOR SELECT
--   USING (
--     EXISTS (
--       SELECT 1 FROM usuarios
--       WHERE usuarios.supabase_user_id = auth.uid()
--       AND usuarios.tipo_usuario = 'admin'
--     )
--   );
--
-- COMMIT;
-- =====================================================
