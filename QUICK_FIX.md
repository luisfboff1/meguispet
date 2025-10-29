# Quick Fix: User Creation Error

## ⚠️ Are you seeing this error?

```json
{
    "success": false,
    "message": "Erro ao criar perfil do usuário",
    "error": "null value in column \"password_hash\" of relation \"usuarios\" violates not-null constraint"
}
```

## ✅ Quick Fix (2 minutes)

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the sidebar
3. Click "New Query"

### Step 2: Run This SQL Command
Copy and paste this command:

```sql
ALTER TABLE usuarios ALTER COLUMN password_hash DROP NOT NULL;
```

### Step 3: Click "Run"
That's it! The error should be fixed.

### Step 4: Verify (Optional)
Run this to confirm it worked:

```sql
SELECT column_name, is_nullable, data_type
FROM information_schema.columns
WHERE table_name = 'usuarios' AND column_name = 'password_hash';
```

You should see `is_nullable = 'YES'`

## 🧪 Test It
Try creating a user again:

```bash
POST /api/auth/signup
{
  "email": "test@example.com",
  "password": "password123",
  "nome": "Test User"
}
```

Should now return success! ✅

## ❓ Why Did This Happen?

**Short Answer:** Your app now uses Supabase Auth to store passwords. The `password_hash` column in your `usuarios` table is no longer needed, but the database still required it to have a value.

**What We Did:** Made the column optional (nullable) so the app can create users without providing a password_hash (since Supabase Auth handles passwords now).

## 📚 Want More Details?

- **Visual Explanation**: See `VISUAL_GUIDE.md`
- **Technical Details**: See `FIX_SUMMARY.md`
- **Migration Guide**: See `database/MIGRATION_PASSWORD_HASH.md`
- **Auth Documentation**: See `AUTH_MIGRATION_GUIDE.md`

## 🔒 Is This Secure?

**Yes!** This actually makes your app MORE secure:
- ✅ Passwords are stored only in Supabase Auth (encrypted, secure)
- ✅ No duplicate password storage
- ✅ Follows security best practices
- ✅ Single source of truth for authentication

## 🐛 Still Having Issues?

Check `AUTH_MIGRATION_GUIDE.md` troubleshooting section for:
- "supabase_user_id column does not exist"
- "Users can't log in after migration"
- "Token expired errors"
- "White screen after login"

## 📋 What Changed in Your Database?

**Before:**
```sql
password_hash VARCHAR(255) NOT NULL  -- Required
```

**After:**
```sql
password_hash VARCHAR(255) NULL      -- Optional
```

That's it! One column constraint changed. Everything else stays the same.

## 💾 Backup Recommendation

If you want to be extra careful, backup your database before running the migration:

1. Go to Supabase Dashboard
2. Database → Backups
3. Create a manual backup
4. Then run the SQL command above

(But really, this change is very safe and reversible!)

## 🔄 Need to Rollback?

If you need to undo this change for some reason:

```sql
-- Only run if you want to revert (not recommended)
ALTER TABLE usuarios ALTER COLUMN password_hash SET NOT NULL;
```

But this will only work if all records have a password_hash value.

## ✨ You're Done!

The fix is applied. Your users can now sign up successfully! 🎉

---

**Created:** 2025-10-29  
**Issue Fixed:** User profile creation error with NOT NULL constraint  
**Migration File:** `database/migration_password_hash_nullable.sql`
