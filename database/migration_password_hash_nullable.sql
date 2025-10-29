-- =====================================================
-- MIGRATION: Make password_hash nullable
-- Purpose: Fix user profile creation error when using Supabase Auth
-- Date: 2025-10-29
-- =====================================================
--
-- CONTEXT:
-- The application now uses Supabase Auth for password management.
-- Passwords are stored in auth.users table, not in the usuarios table.
-- The password_hash column in usuarios is legacy and should be nullable.
--
-- This migration makes the password_hash column nullable to fix the error:
-- "null value in column 'password_hash' violates not-null constraint"
--
-- IMPORTANT:
-- Run this migration in your Supabase project via SQL Editor or CLI
-- =====================================================

BEGIN;

-- Make password_hash nullable
ALTER TABLE usuarios 
ALTER COLUMN password_hash DROP NOT NULL;

-- Add comment explaining the column is legacy
COMMENT ON COLUMN usuarios.password_hash IS 'Legacy column - passwords now managed by Supabase Auth. This column is kept for backward compatibility but should not be used for new users.';

COMMIT;

-- =====================================================
-- VERIFICATION
-- =====================================================
-- After running this migration, verify the column is nullable:
-- 
-- SELECT column_name, is_nullable, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'usuarios' AND column_name = 'password_hash';
--
-- Expected result: is_nullable = 'YES'
-- =====================================================
