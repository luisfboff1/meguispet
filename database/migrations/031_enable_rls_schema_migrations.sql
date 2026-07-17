-- =====================================================
-- MIGRATION 031: Enable RLS on public.schema_migrations
-- =====================================================
-- Purpose: Supabase Advisor flagged public.schema_migrations as exposed to
-- PostgREST without RLS enabled. This table only tracks which .sql files in
-- database/migrations/ have been applied (tag + hash + timestamp) — it is
-- read/written exclusively by database/migrate.mjs and
-- database/migrate-status.mjs via a direct Postgres connection
-- (SUPABASE_DB_URL), which bypasses RLS regardless. No API route or frontend
-- service queries this table through supabase-js/PostgREST.
--
-- No policies are added on purpose: nobody should read/write this table via
-- the anon/authenticated PostgREST roles. Enabling RLS with zero policies
-- blocks all PostgREST access while leaving the service_role and the direct
-- migration-tool connection (both bypassrls) unaffected.

ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.schema_migrations IS 'RLS enabled (no policies - PostgREST access is not needed) - Migration 031';
