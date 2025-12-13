-- =====================================================
-- MIGRATION 022: HOTFIX - Fix Circular Dependency in usuarios RLS
-- =====================================================
-- CRITICAL: The SELECT policy on usuarios has circular dependency
-- Issue: Policy queries usuarios table to check if user is admin,
--        but to query usuarios it needs to pass RLS first!
-- Result: Infinite loop, blocks all logins
-- Date: 2025-12-13
-- =====================================================

BEGIN;

-- =====================================================
-- 1. DROP BROKEN POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users read own record" ON usuarios;
DROP POLICY IF EXISTS "Admins insert users" ON usuarios;
DROP POLICY IF EXISTS "Users update own record or admin updates all" ON usuarios;
DROP POLICY IF EXISTS "Admins delete users" ON usuarios;

RAISE NOTICE '🔥 Dropped broken RLS policies with circular dependency';

-- =====================================================
-- 2. CREATE FIXED POLICIES (NO CIRCULAR DEPENDENCY)
-- =====================================================

-- SELECT: Users can read their own record
-- NO SUBQUERY to avoid circular dependency
CREATE POLICY "Users read own record" ON usuarios
  FOR SELECT
  USING (
    supabase_user_id::text = auth.uid()::text
  );

RAISE NOTICE '✅ Created simple SELECT policy without circular dependency';

-- INSERT: Only via service role (application handles permission check)
-- This policy will NEVER match (intentionally)
-- All inserts must use service role client
CREATE POLICY "Service role only insert" ON usuarios
  FOR INSERT
  WITH CHECK (false);  -- Always deny (service role bypasses RLS)

RAISE NOTICE '✅ Created INSERT policy (service role only)';

-- UPDATE: Users can update their own record
-- Service role bypasses this for admin operations
CREATE POLICY "Users update own record" ON usuarios
  FOR UPDATE
  USING (
    supabase_user_id::text = auth.uid()::text
  );

RAISE NOTICE '✅ Created UPDATE policy (own record only)';

-- DELETE: Deny all (service role bypasses RLS for admin deletes)
CREATE POLICY "Deny all deletes" ON usuarios
  FOR DELETE
  USING (false);  -- Always deny (service role bypasses RLS)

RAISE NOTICE '✅ Created DELETE policy (service role only)';

-- =====================================================
-- 3. VERIFICATION
-- =====================================================

-- List all RLS policies for usuarios
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'usuarios'
ORDER BY policyname;

-- =====================================================
-- 4. REPORT COMPLETION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '🔥 HOTFIX 022 Concluída - Circular Dependency Fixed';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '';
  RAISE NOTICE '🐛 Bug Fixed:';
  RAISE NOTICE '  - Removed circular dependency in SELECT policy';
  RAISE NOTICE '  - Login should work now!';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 New Policy Rules:';
  RAISE NOTICE '  - SELECT: Users read own record only';
  RAISE NOTICE '  - INSERT: Service role only (app checks permissions)';
  RAISE NOTICE '  - UPDATE: Users update own record';
  RAISE NOTICE '  - DELETE: Service role only';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT:';
  RAISE NOTICE '  - Admin operations MUST use service role client';
  RAISE NOTICE '  - Application layer handles permission checks';
  RAISE NOTICE '  - This is SAFER than circular RLS policies';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Next Steps:';
  RAISE NOTICE '  1. Clear browser cookies';
  RAISE NOTICE '  2. Try login again';
  RAISE NOTICE '  3. Should work now!';
  RAISE NOTICE '';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '';
END $$;

COMMIT;

-- =====================================================
-- EXPLANATION
-- =====================================================
--
-- WHY THE OLD POLICY FAILED:
--
-- Old policy had this:
-- USING (
--   supabase_user_id = auth.uid()
--   OR EXISTS (
--     SELECT 1 FROM usuarios u          <-- PROBLEM!
--     WHERE u.supabase_user_id = auth.uid()
--     AND u.tipo_usuario = 'admin'
--   )
-- )
--
-- The EXISTS subquery tries to SELECT from usuarios table,
-- but to SELECT from usuarios, it needs to pass RLS first,
-- which requires executing the same policy again = INFINITE LOOP!
--
-- NEW APPROACH:
-- - Simple RLS: Users can only read own record
-- - Admin operations use service role client (bypasses RLS)
-- - Application layer checks permissions BEFORE using service role
-- - This is SAFER and avoids circular dependencies
-- =====================================================
