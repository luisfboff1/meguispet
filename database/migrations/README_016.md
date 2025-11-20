# Migration 016: RLS Policies for Saved Reports

## Overview
This migration adds Row Level Security (RLS) policies for the `relatorios_salvos` table, which was missing RLS after migrations 014 and 015.

## Purpose
Ensure that users can only access their own saved reports, implementing proper data isolation and security.

## Tables Affected
- `relatorios_salvos` (saved reports)

## Changes Made

### 1. Enable RLS
```sql
ALTER TABLE relatorios_salvos ENABLE ROW LEVEL SECURITY;
```

### 2. RLS Policies Created

#### SELECT Policy - "Users view own saved reports"
Users can only view their own saved reports. The policy matches the authenticated user's Supabase UID to the usuarios table, then checks that the report's usuario_id matches.

#### INSERT Policy - "Users insert own saved reports"
Users can only create reports assigned to their own user ID.

#### UPDATE Policy - "Users update own saved reports"
Users can only update their own saved reports.

#### DELETE Policy - "Users delete own saved reports"
Users can only delete their own saved reports.

## Security Considerations
- All policies use `auth.uid()` to identify the authenticated user
- Policies map Supabase auth to app users via the `usuarios` table
- Users must be active (`ativo = true`) to access reports
- No special admin privileges on this table (reports are strictly per-user)

## Testing

### Verify RLS is Enabled
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'relatorios_salvos';
```

Expected result: `rowsecurity = true`

### List Policies
```sql
SELECT * FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'relatorios_salvos';
```

Expected result: 4 policies (SELECT, INSERT, UPDATE, DELETE)

### Test Access
As an authenticated user:
```sql
-- Should only return reports for the authenticated user
SELECT * FROM relatorios_salvos;

-- Try to access another user's report (should fail)
SELECT * FROM relatorios_salvos WHERE usuario_id != <your_user_id>;
```

## Rollback Plan
If needed, disable RLS:
```sql
ALTER TABLE relatorios_salvos DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own saved reports" ON relatorios_salvos;
DROP POLICY IF EXISTS "Users insert own saved reports" ON relatorios_salvos;
DROP POLICY IF EXISTS "Users update own saved reports" ON relatorios_salvos;
DROP POLICY IF EXISTS "Users delete own saved reports" ON relatorios_salvos;
```

## Related Changes
This migration is part of the fix for report generation issues after RLS implementation. See also:
- API route updates to use authenticated Supabase client
- Migrations 014 and 015 for main table RLS

## Performance Impact
- Minimal: Policies use indexed columns (usuario_id)
- The join to `usuarios` table for user validation is fast due to Supabase auth caching

## Deployment
1. Apply this migration to the database
2. Ensure API routes use authenticated Supabase client (already done)
3. Test report generation and saved reports functionality

## Notes
- Reports are strictly per-user; there's no shared report functionality
- Admins do not get special access to other users' reports
- The `usuarios` table must have proper Supabase UID mappings
