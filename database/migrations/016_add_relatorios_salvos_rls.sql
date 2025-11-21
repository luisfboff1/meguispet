-- =====================================================
-- MIGRATION 016: Add RLS Policies for relatorios_salvos
-- =====================================================
-- Purpose: Add RLS policies for saved reports table
-- Fixes: Missing RLS on relatorios_salvos after migrations 014-015
-- Date: November 2025
-- Priority: P1 - Important Fix

-- This migration adds RLS policies for the relatorios_salvos table
-- to ensure users can only access their own saved reports.

-- =====================================================
-- 1. ENABLE RLS ON RELATORIOS_SALVOS
-- =====================================================

-- Enable RLS on relatorios_salvos (saved reports)
ALTER TABLE relatorios_salvos ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. CREATE RLS POLICIES FOR RELATORIOS_SALVOS
-- =====================================================

-- Policy: Users can view only their own saved reports
CREATE POLICY "Users view own saved reports" ON relatorios_salvos
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND usuario_id = (
      SELECT id FROM usuarios 
      WHERE supabase_user_id::text = auth.uid()::text 
      AND ativo = true
    )
  );

-- Policy: Users can insert their own saved reports
CREATE POLICY "Users insert own saved reports" ON relatorios_salvos
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND usuario_id = (
      SELECT id FROM usuarios 
      WHERE supabase_user_id::text = auth.uid()::text 
      AND ativo = true
    )
  );

-- Policy: Users can update only their own saved reports
CREATE POLICY "Users update own saved reports" ON relatorios_salvos
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND usuario_id = (
      SELECT id FROM usuarios 
      WHERE supabase_user_id::text = auth.uid()::text 
      AND ativo = true
    )
  );

-- Policy: Users can delete only their own saved reports
CREATE POLICY "Users delete own saved reports" ON relatorios_salvos
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND usuario_id = (
      SELECT id FROM usuarios 
      WHERE supabase_user_id::text = auth.uid()::text 
      AND ativo = true
    )
  );

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these to verify RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'relatorios_salvos';
-- SELECT * FROM pg_policies WHERE schemaname = 'public' AND tablename = 'relatorios_salvos';

-- =====================================================
-- ROLLBACK PLAN
-- =====================================================
-- If needed, disable RLS with:
-- ALTER TABLE relatorios_salvos DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "Users view own saved reports" ON relatorios_salvos;
-- DROP POLICY IF EXISTS "Users insert own saved reports" ON relatorios_salvos;
-- DROP POLICY IF EXISTS "Users update own saved reports" ON relatorios_salvos;
-- DROP POLICY IF EXISTS "Users delete own saved reports" ON relatorios_salvos;

-- =====================================================
-- NOTES
-- =====================================================
-- 1. This ensures users can only access their own saved reports
-- 2. Admins don't get special privileges on this table (reports are per-user)
-- 3. The policies use the usuarios table to map Supabase auth to app users
-- 4. All CRUD operations are restricted to the report owner

-- Migration complete
COMMENT ON TABLE relatorios_salvos IS 'RLS enabled - Migration 016 - User-scoped access only';
