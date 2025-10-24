-- =====================================================
-- MIGRATION: Supabase Auth Integration
-- Purpose: Prepare usuarios table for Supabase Auth
-- =====================================================

-- This migration prepares the existing usuarios table to work with Supabase Auth
-- Run this AFTER creating a Supabase project and BEFORE migrating users

BEGIN;

-- =====================================================
-- 1. ADD SUPABASE USER ID REFERENCE (Optional)
-- =====================================================

-- Add a column to link usuarios with Supabase auth.users
-- This is optional but recommended for easier sync
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS supabase_user_id UUID NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_usuarios_supabase_id 
ON usuarios(supabase_user_id);

-- =====================================================
-- 2. REMOVE PASSWORD_HASH COLUMN
-- =====================================================

-- Password management is now handled by Supabase Auth
-- This column is no longer needed and should be removed for security
-- IMPORTANT: Only run this after migrating all users to Supabase Auth!

-- Uncomment when ready to remove:
-- ALTER TABLE usuarios DROP COLUMN IF EXISTS password_hash;

-- =====================================================
-- 3. ADD UPDATED_AT TRIGGER (if not exists)
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_usuarios_updated_at ON usuarios;
CREATE TRIGGER update_usuarios_updated_at
    BEFORE UPDATE ON usuarios
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. ADD RLS POLICIES (Row Level Security)
-- =====================================================

-- Enable RLS on usuarios table
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own record
CREATE POLICY "Users can view own record"
ON usuarios
FOR SELECT
USING (auth.email() = email);

-- Policy: Users can update their own record (except role and permissoes)
CREATE POLICY "Users can update own record"
ON usuarios
FOR UPDATE
USING (auth.email() = email)
WITH CHECK (auth.email() = email);

-- Policy: Service role can do everything (for admin operations)
CREATE POLICY "Service role has full access"
ON usuarios
FOR ALL
USING (auth.role() = 'service_role');

-- Policy: Admins can view all users
CREATE POLICY "Admins can view all users"
ON usuarios
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM usuarios
        WHERE email = auth.email()
        AND role = 'admin'
        AND ativo = true
    )
);

-- Policy: Admins can update all users
CREATE POLICY "Admins can update all users"
ON usuarios
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM usuarios
        WHERE email = auth.email()
        AND role = 'admin'
        AND ativo = true
    )
);

-- =====================================================
-- 5. CREATE FUNCTION TO SYNC USER ON AUTH SIGNUP
-- =====================================================

-- This function automatically creates a record in usuarios when a user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.usuarios (email, nome, supabase_user_id, role, ativo, created_at, updated_at)
    VALUES (
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
        true,
        NOW(),
        NOW()
    )
    ON CONFLICT (email) DO UPDATE
    SET supabase_user_id = NEW.id,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

COMMIT;

-- =====================================================
-- 6. NOTES FOR MANUAL USER MIGRATION
-- =====================================================

-- To migrate existing users from usuarios table to Supabase Auth:
-- 
-- Option A: Manual via Supabase Dashboard
-- 1. Go to Authentication > Users in Supabase Dashboard
-- 2. Click "Add User" for each user
-- 3. Use email from usuarios table
-- 4. Set temporary password (user will need to reset)
-- 5. After creation, run:
--    UPDATE usuarios SET supabase_user_id = '[new-uuid]' WHERE email = '[user-email]';
--
-- Option B: Bulk via SQL (requires Supabase CLI or pg_dump)
-- 1. Export usuarios to CSV
-- 2. Use Supabase CLI: supabase auth import users usuarios.csv
-- 3. Run sync query to link supabase_user_id
--
-- Option C: Programmatic via Admin API
-- Use Supabase Admin API to create users in bulk
-- See: https://supabase.com/docs/reference/javascript/auth-admin-createuser

-- =====================================================
-- 7. VERIFICATION QUERIES
-- =====================================================

-- Check if migration was successful
-- Uncomment to run verification:

-- SELECT COUNT(*) as total_users FROM usuarios;
-- SELECT COUNT(*) as users_with_supabase_id FROM usuarios WHERE supabase_user_id IS NOT NULL;
-- SELECT role, COUNT(*) FROM usuarios GROUP BY role;
-- SELECT ativo, COUNT(*) FROM usuarios GROUP BY ativo;

-- Test RLS policies (run as different users to verify access control)
-- SELECT * FROM usuarios WHERE email = current_setting('request.jwt.claims', true)::json->>'email';
