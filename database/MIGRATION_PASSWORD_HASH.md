# Database Migration: Make password_hash Nullable

## Problem

When creating a new user via the signup endpoint (`/api/auth/signup`), the following error occurs:

```json
{
    "success": false,
    "message": "Erro ao criar perfil do usuário",
    "error": "null value in column \"password_hash\" of relation \"usuarios\" violates not-null constraint"
}
```

This happens even when a password is provided during signup.

## Root Cause

The application uses **Supabase Auth** for authentication. When a user signs up:

1. Password is stored in Supabase's `auth.users` table (managed by Supabase)
2. User profile is created in the custom `usuarios` table (managed by the application)

The `usuarios` table has a `password_hash` column with a NOT NULL constraint from the legacy authentication system. The signup endpoint does NOT include `password_hash` when creating the profile because passwords are now managed by Supabase Auth.

## Solution

Make the `password_hash` column nullable since it's a legacy field no longer used for authentication.

### Steps to Fix

#### 1. Run the Migration Script

In your Supabase project:

**Via Supabase Dashboard:**
1. Go to SQL Editor
2. Create a new query
3. Copy the contents of `migration_password_hash_nullable.sql`
4. Execute the query

**Via Supabase CLI:**
```bash
supabase db push
```

#### 2. Verify the Migration

Run this query to verify the column is now nullable:

```sql
SELECT column_name, is_nullable, data_type
FROM information_schema.columns
WHERE table_name = 'usuarios' AND column_name = 'password_hash';
```

Expected result: `is_nullable = 'YES'`

#### 3. Test User Creation

Test the signup endpoint:

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "nome": "Test User",
    "role": "user"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Usuário criado com sucesso",
  "data": {
    "user": {
      "id": 1,
      "nome": "Test User",
      "email": "test@example.com",
      "role": "user",
      "permissoes": null,
      "ativo": true
    },
    "auth_user_id": "uuid-here"
  }
}
```

## Technical Details

### Changes Made

1. **Database Schema** (`database/supabase_schema.sql`):
   - Changed `password_hash VARCHAR(255) NOT NULL` to `password_hash VARCHAR(255) NULL`
   - Added comment explaining it's a legacy column

2. **TypeScript Types** (`types/index.ts`):
   - Changed `password_hash: string` to `password_hash?: string`
   - Added comment explaining it's optional and legacy

3. **Migration Script** (`database/migration_password_hash_nullable.sql`):
   - Contains the ALTER TABLE command to update existing databases
   - Includes verification queries

4. **Documentation** (`AUTH_MIGRATION_GUIDE.md`):
   - Added troubleshooting section for this specific error
   - Updated next steps to include running this migration

### Backward Compatibility

The migration is **backward compatible**:
- Existing users with `password_hash` values are not affected
- New users created via Supabase Auth will have `password_hash = NULL`
- The column can be safely dropped in the future if desired

### Why Not Remove the Column Entirely?

The column is kept (as nullable) for:
1. **Backward compatibility** - Existing data may reference it
2. **Migration safety** - Can be removed later after verifying system stability
3. **Audit trail** - May contain historical data for legacy users

If you want to remove it completely, see the "Next Steps" section in `AUTH_MIGRATION_GUIDE.md`.

## Related Files

- `pages/api/auth/signup.ts` - The signup endpoint that creates user profiles
- `database/supabase_schema.sql` - Base database schema (updated)
- `database/migration_supabase_auth.sql` - Original Supabase Auth migration
- `AUTH_MIGRATION_GUIDE.md` - Complete migration and setup guide
- `types/index.ts` - TypeScript type definitions (updated)
