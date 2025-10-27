# Auth System Migration and Setup Guide

## Overview

This guide explains how to set up and migrate to the new Supabase-based authentication system.

## Prerequisites

1. Supabase project created
2. Environment variables configured:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

## Migration Steps

### 1. Run Database Migration

Apply the Supabase Auth migration to add necessary columns and triggers:

```bash
# Option A: Via Supabase SQL Editor
# Copy contents of database/migration_supabase_auth.sql
# Paste in Supabase Dashboard > SQL Editor > New Query
# Run the query

# Option B: Via Supabase CLI
supabase db push
```

This migration will:
- Add `supabase_user_id` column to usuarios table
- Set up Row Level Security (RLS) policies
- Create trigger to auto-sync new auth users with usuarios table
- Add updated_at trigger

### 2. Migrate Existing Users (if any)

If you have existing users in the `usuarios` table, you need to create corresponding Supabase Auth users:

#### Option A: Use the Signup API Endpoint

For each existing user, call:
```bash
POST /api/auth/signup
{
  "email": "user@example.com",
  "password": "temporary-password",
  "nome": "User Name",
  "role": "user"
}
```

#### Option B: Bulk Import via Supabase Dashboard

1. Export users from usuarios table
2. Go to Supabase Dashboard > Authentication > Users
3. Use "Add User" for each user manually, or
4. Use Supabase CLI for bulk import

### 3. Verify Migration

Run these queries in Supabase SQL Editor:

```sql
-- Check total users
SELECT COUNT(*) as total_users FROM usuarios;

-- Check users linked to Supabase Auth
SELECT COUNT(*) as users_with_supabase_id 
FROM usuarios 
WHERE supabase_user_id IS NOT NULL;

-- Verify all users have been migrated
SELECT email, nome, role, supabase_user_id 
FROM usuarios 
WHERE ativo = true;
```

## Features Implemented

### 1. Token Expiration Handling
- Middleware automatically refreshes expired tokens
- Client-side auth state listener detects token refresh
- Proper error handling for 401 errors

### 2. Logout Flow
- Clears Supabase session via signOut()
- Removes all local storage and cookies
- Redirects to login page

### 3. Dashboard Performance
- 5-minute cache for dashboard data
- Prevents unnecessary API calls on navigation
- Force refresh after mutations

### 4. User Creation
- New `/api/auth/signup` endpoint
- Creates user in both Supabase Auth and usuarios table
- Automatic rollback if profile creation fails
- Validation for email and password

## Troubleshooting

### Issue: "supabase_user_id column does not exist"

**Solution**: Run the migration script from `database/migration_supabase_auth.sql`

### Issue: "Users can't log in after migration"

**Possible causes**:
1. User not created in Supabase Auth
2. User created in Auth but not in usuarios table
3. Email mismatch between auth.users and usuarios

**Solution**: 
```sql
-- Check if user exists in both tables
SELECT u.email, u.nome, u.supabase_user_id, a.email as auth_email
FROM usuarios u
LEFT JOIN auth.users a ON u.supabase_user_id = a.id
WHERE u.email = 'user@example.com';
```

### Issue: "Token expired" errors

**Solution**: The new system handles this automatically via:
1. Middleware token refresh (getSession before getUser)
2. Client-side auth state listener
3. Proper 401 error handling

### Issue: "White screen after login"

**Possible causes**:
1. Token not being stored properly
2. Profile fetch failing

**Solution**: Check browser console for errors and verify:
```javascript
// In browser console
localStorage.getItem('sb-[project-ref]-auth-token')
```

## Testing the System

### Test Login Flow
1. Navigate to `/login`
2. Enter valid credentials
3. Should redirect to `/dashboard`
4. Check localStorage for Supabase session

### Test Token Refresh
1. Login successfully
2. Wait 55 minutes (or manually expire token)
3. Navigate to any page
4. Token should refresh automatically

### Test Logout
1. Click logout button
2. Should clear all storage
3. Should redirect to `/login`
4. Should not be able to access protected routes

### Test User Creation
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "password123",
    "nome": "New User",
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
      "nome": "New User",
      "email": "newuser@example.com",
      "role": "user",
      "permissoes": null,
      "ativo": true
    },
    "auth_user_id": "uuid-here"
  }
}
```

## Security Considerations

1. **Row Level Security (RLS)**: Enabled on usuarios table
2. **Service Role Key**: Only used server-side for admin operations
3. **Auto Token Refresh**: Prevents expired token issues
4. **Secure Cookies**: Set with HttpOnly and Secure flags in production
5. **Email Confirmation**: Can be enabled in Supabase Dashboard > Authentication > Email

## Next Steps

After migration:
1. Enable email confirmation in Supabase if needed
2. Set up password reset flow
3. Configure SMTP settings in Supabase for email notifications
4. Remove password_hash column from usuarios table (optional, after migration)

```sql
-- Only run after verifying all users migrated successfully
ALTER TABLE usuarios DROP COLUMN IF EXISTS password_hash;
```
