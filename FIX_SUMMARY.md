# Fix Summary: User Profile Creation Error

## Issue
**Error Report:** "Erro ao criar perfil do usuário"
**Error Details:** `null value in column "password_hash" of relation "usuarios" violates not-null constraint`
**User Statement:** "SENDO QUE FOI PREENCHIDO A SENHA" (Even though password was filled in)

## Root Cause

The issue occurs during user signup when trying to create a user profile in the `usuarios` table. The password WAS provided, but here's what happens:

1. **User provides password** during signup via `/api/auth/signup` endpoint
2. **Password is correctly stored** in Supabase's `auth.users` table (Supabase Auth manages this)
3. **User profile is created** in the custom `usuarios` table WITHOUT the `password_hash` field (see lines 68-77 in `signup.ts`)
4. **Database constraint violation** occurs because `password_hash` was defined as NOT NULL in the schema

The confusion is understandable - the password IS being stored, but in a different table (`auth.users`) managed by Supabase Auth, not in the application's `usuarios` table.

## Architecture Context

The application uses a dual-table authentication system:

```
┌─────────────────────────┐
│   Supabase Auth         │
│   (auth.users table)    │
│                         │
│   • email               │
│   • password (hashed)   │  ← Password stored here by Supabase
│   • id (UUID)           │
│   • metadata            │
└─────────────────────────┘
           │
           │ supabase_user_id
           │
           ▼
┌─────────────────────────┐
│   Custom Table          │
│   (usuarios table)      │
│                         │
│   • id                  │
│   • email               │
│   • nome                │
│   • role                │
│   • permissoes          │
│   • supabase_user_id    │  ← Links to Supabase Auth
│   • password_hash       │  ← LEGACY - was NOT NULL (now nullable)
│   • ativo               │
└─────────────────────────┘
```

## The Fix

Made `password_hash` nullable in the `usuarios` table since it's a legacy column no longer used for authentication.

### Changes Made

1. **Database Schema** (`database/supabase_schema.sql`)
   ```sql
   -- BEFORE
   password_hash VARCHAR(255) NOT NULL,
   
   -- AFTER
   password_hash VARCHAR(255) NULL, -- Legacy column - passwords now managed by Supabase Auth
   ```

2. **Migration Script** (`database/migration_password_hash_nullable.sql`)
   ```sql
   ALTER TABLE usuarios ALTER COLUMN password_hash DROP NOT NULL;
   ```

3. **TypeScript Types** (`types/index.ts`)
   ```typescript
   // BEFORE
   password_hash: string
   
   // AFTER
   password_hash?: string // Optional - legacy field, passwords now managed by Supabase Auth
   ```

4. **Documentation Updates**
   - Added troubleshooting section in `AUTH_MIGRATION_GUIDE.md`
   - Created detailed guide in `database/MIGRATION_PASSWORD_HASH.md`

## How Users Can Apply This Fix

### For Existing Databases

Run the migration script in Supabase SQL Editor:

```sql
-- From database/migration_password_hash_nullable.sql
ALTER TABLE usuarios ALTER COLUMN password_hash DROP NOT NULL;
```

### For New Installations

Use the updated `database/supabase_schema.sql` which already has `password_hash` as nullable.

## Why This Approach

### Why Not Remove the Column?
- **Backward Compatibility**: Existing records may have `password_hash` values from before migration
- **Safe Migration**: Allows gradual transition without data loss
- **Audit Trail**: Preserves historical data

### Why Make It Nullable Instead of Providing a Default?
- **Clarity**: NULL explicitly indicates "password managed elsewhere"
- **Database Design**: More semantically correct - no password hash exists for Supabase Auth users
- **Less Confusion**: Empty string or placeholder would be misleading

### Why Not Update signup.ts to Include password_hash?
- **Security**: Passwords should only be stored in Supabase Auth (secure, encrypted, best practices)
- **Single Source of Truth**: Avoids duplicate password storage
- **Architecture**: Signup endpoint correctly follows Supabase Auth patterns

## Verification

### Build & Lint Status
- ✅ TypeScript compilation: No errors
- ✅ ESLint: No warnings or errors
- ✅ Next.js build: Successful
- ✅ All API routes: Compile correctly

### Backward Compatibility
- ✅ Existing users with `password_hash` values: Unaffected
- ✅ New users created via Supabase Auth: Work correctly with `password_hash = NULL`
- ✅ No breaking changes to existing code

## Testing the Fix

After applying the migration, test user creation:

```bash
curl -X POST http://your-domain/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "nome": "Test User",
    "role": "user"
  }'
```

**Expected Success Response:**
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

## Related Files

- `pages/api/auth/signup.ts` - User signup endpoint
- `database/supabase_schema.sql` - Base schema (updated)
- `database/migration_password_hash_nullable.sql` - Migration script (new)
- `database/MIGRATION_PASSWORD_HASH.md` - Detailed migration guide (new)
- `AUTH_MIGRATION_GUIDE.md` - Auth migration guide (updated with troubleshooting)
- `types/index.ts` - TypeScript types (updated)

## Future Considerations

After verifying the system is stable for several weeks/months, consider:

1. **Remove the column entirely** (optional):
   ```sql
   ALTER TABLE usuarios DROP COLUMN IF EXISTS password_hash;
   ```

2. **Update the trigger** in `migration_supabase_auth.sql` to ensure auto-sync works correctly

3. **Enable email confirmation** in Supabase if not already enabled

4. **Implement password reset flow** using Supabase Auth APIs

## Additional Notes

This fix aligns with the AUTH_MIGRATION_GUIDE.md which states:
> "Remove password_hash column from usuarios table (optional, after migration)"

The migration guide already anticipated this issue and provided guidance for removing the column. Our fix makes it nullable as an intermediate step, which is safer and maintains backward compatibility.
