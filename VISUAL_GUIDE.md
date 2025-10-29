# Visual Guide: User Creation Error Fix

## The Problem (BEFORE Fix)

```
┌─────────────────────────────────────────────────────────────┐
│  User submits signup form                                   │
│  POST /api/auth/signup                                      │
│  {                                                          │
│    email: "user@example.com",                              │
│    password: "mypassword123",   ← Password IS provided     │
│    nome: "User Name"                                       │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  Step 1: Create user in Supabase Auth                       │
│  ✅ SUCCESS                                                 │
│                                                             │
│  Supabase Auth (auth.users table):                         │
│  {                                                          │
│    id: "uuid-123",                                         │
│    email: "user@example.com",                              │
│    encrypted_password: "hashed_password_here"  ← Password  │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  Step 2: Create user profile in usuarios table              │
│  ❌ FAILS                                                   │
│                                                             │
│  INSERT INTO usuarios (                                     │
│    email: "user@example.com",                              │
│    nome: "User Name",                                      │
│    role: "user",                                           │
│    supabase_user_id: "uuid-123",                          │
│    // password_hash: NOT PROVIDED ← Issue here!           │
│  )                                                          │
│                                                             │
│  ERROR: null value in column "password_hash"               │
│         violates not-null constraint                        │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  Response to User                                           │
│  {                                                          │
│    success: false,                                         │
│    message: "Erro ao criar perfil do usuário",            │
│    error: "null value in column 'password_hash'..."       │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
```

## Why password_hash Wasn't Provided

The signup endpoint (`pages/api/auth/signup.ts`) creates the user profile like this:

```typescript
// Lines 68-77 in signup.ts
const usuarioData = {
  email,
  nome,
  role,
  permissoes,
  ativo: true,
  supabase_user_id: authData.user.id,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  // NO password_hash here! ← This is CORRECT behavior
};
```

**Why is this correct?** Because passwords should ONLY be stored in Supabase Auth, not in the application's custom table. The `usuarios` table only stores application-specific metadata.

## Database Schema Issue

```sql
-- BEFORE (Problematic)
CREATE TABLE usuarios (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,  ← NOT NULL constraint is the problem
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    supabase_user_id UUID NULL,
    ...
);
```

The schema required `password_hash` but the application doesn't provide it (and shouldn't!).

## The Solution (AFTER Fix)

```
┌─────────────────────────────────────────────────────────────┐
│  User submits signup form                                   │
│  POST /api/auth/signup                                      │
│  {                                                          │
│    email: "user@example.com",                              │
│    password: "mypassword123",                              │
│    nome: "User Name"                                       │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  Step 1: Create user in Supabase Auth                       │
│  ✅ SUCCESS                                                 │
│                                                             │
│  Supabase Auth (auth.users table):                         │
│  {                                                          │
│    id: "uuid-123",                                         │
│    email: "user@example.com",                              │
│    encrypted_password: "hashed_password_here"              │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  Step 2: Create user profile in usuarios table              │
│  ✅ SUCCESS (after fix)                                     │
│                                                             │
│  INSERT INTO usuarios (                                     │
│    email: "user@example.com",                              │
│    nome: "User Name",                                      │
│    role: "user",                                           │
│    supabase_user_id: "uuid-123",                          │
│    password_hash: NULL  ← Now allowed!                     │
│  )                                                          │
│                                                             │
│  ✓ No error - NULL is acceptable                           │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  Response to User                                           │
│  {                                                          │
│    success: true,                                          │
│    message: "Usuário criado com sucesso",                 │
│    data: { user: {...}, auth_user_id: "uuid-123" }       │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
```

## Updated Database Schema

```sql
-- AFTER (Fixed)
CREATE TABLE usuarios (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NULL,  ← Now nullable
    -- Legacy column - passwords managed by Supabase Auth
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    supabase_user_id UUID NULL,  ← Links to Supabase Auth
    ...
);
```

## Migration Command

```sql
-- Run this in Supabase SQL Editor
ALTER TABLE usuarios ALTER COLUMN password_hash DROP NOT NULL;
```

## Data Flow After Fix

```
User Password Flow:
─────────────────────

1. User enters password in signup form
   ↓
2. Password sent to /api/auth/signup
   ↓
3. Supabase Auth stores encrypted password
   in auth.users table (secure!)
   ↓
4. usuarios table stores metadata only
   (NO password, just user info + link to auth)
   ↓
5. Login uses Supabase Auth to verify password
   ↓
6. App fetches user metadata from usuarios table
```

## Key Takeaways

1. **Password IS being stored** - just in Supabase Auth, not in usuarios table
2. **This is more secure** - Supabase handles password encryption, storage, and verification
3. **The fix is simple** - make password_hash nullable since it's not used
4. **Backward compatible** - old users with password_hash values are unaffected
5. **Follows best practices** - single source of truth for passwords (Supabase Auth)

## Where Passwords Are Stored

```
┌──────────────────────────────────────────────────────────┐
│ Supabase Auth (auth.users)                               │
│ ────────────────────────────────                        │
│ ✓ Encrypted password storage                            │
│ ✓ Password reset handling                               │
│ ✓ Token management                                      │
│ ✓ Session management                                    │
│ ✓ Email confirmation                                    │
│ ✓ MFA support                                           │
└──────────────────────────────────────────────────────────┘
                        │
                        │ supabase_user_id
                        ↓
┌──────────────────────────────────────────────────────────┐
│ Custom App Table (usuarios)                              │
│ ────────────────────────────                            │
│ ✓ User metadata (name, role, permissions)               │
│ ✓ App-specific settings                                 │
│ ✓ Business logic data                                   │
│ ✗ NO passwords (legacy password_hash is NULL)           │
└──────────────────────────────────────────────────────────┘
```

This separation of concerns is intentional and follows security best practices!
