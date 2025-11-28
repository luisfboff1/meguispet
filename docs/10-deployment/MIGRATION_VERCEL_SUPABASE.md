# MeguisPet Migration: Hostinger/PHP/MariaDB → Vercel/Next.js/Supabase

This document outlines the migration from a traditional PHP/MariaDB stack hosted on Hostinger to a modern serverless architecture using Vercel and Supabase PostgreSQL.

## Migration Overview

### What Changed

**Before (Hostinger/PHP/MariaDB):**
- Static frontend exported with `next build` → `out/` folder
- PHP API endpoints in `api/*.php`
- MariaDB database with MySQL syntax
- Manual FTP deployment via GitHub Actions
- Monolithic server-side rendering

**After (Vercel/Supabase):**
- Server-side rendering with Next.js API Routes
- TypeScript API endpoints in `pages/api/*.ts`
- Supabase PostgreSQL with modern PostgreSQL syntax
- Automated Vercel deployment from GitHub
- Serverless architecture with edge functions

## Implementation Summary

### FASE 1 - Setup & Infrastructure

#### Dependencies Installed
```bash
pnpm add @supabase/supabase-js jsonwebtoken
pnpm add -D @types/jsonwebtoken @types/bcryptjs
```

#### Core Library Files Created
1. **lib/supabase.ts** - Supabase client singleton
   - Configures connection with environment variables
   - Reuses single client instance for performance

2. **lib/jwt-utils.ts** - JWT authentication utilities
   - `signJWT()` - Creates JWT tokens (24h expiry)
   - `verifyJWT()` - Validates JWT tokens
   - `extractTokenFromHeader()` - Parses Authorization header

3. **lib/api-middleware.ts** - Authentication middleware
   - `withAuth()` - HOC for protecting API routes
   - Injects authenticated user into request object
   - Returns 401 for invalid/missing tokens

#### Database Schema Migration
Created **database/supabase_schema.sql** converting MariaDB to PostgreSQL:
- `AUTO_INCREMENT` → `BIGSERIAL`
- `BOOLEAN` → `boolean`
- `DECIMAL` → `NUMERIC`
- `TIMESTAMP` → `TIMESTAMPTZ`
- `ENUM` types converted to `CHECK` constraints
- MariaDB functions/procedures → PostgreSQL PL/pgSQL
- Added proper indexes for query optimization
- Implemented RLS-ready structure

### FASE 2 - API Routes Implementation

Created 18 TypeScript API route files replacing PHP endpoints:

#### Core Authentication
- **pages/api/auth.ts**
  - POST `/api/auth` - Login with email/password
  - GET `/api/auth` - Get user profile from token
  - Uses bcrypt for password hashing
  - Returns JWT token on successful login

#### Entity CRUD Operations
All endpoints follow RESTful patterns with pagination:

- **pages/api/clientes.ts** - Customer management
- **pages/api/produtos.ts** - Product catalog with multi-warehouse stock
- **pages/api/vendas.ts** - Sales transactions
- **pages/api/fornecedores.ts** - Supplier management
- **pages/api/vendedores.ts** - Sales representatives
- **pages/api/usuarios.ts** - User account management

#### Stock & Financial Operations
- **pages/api/estoques.ts** - Warehouse management
- **pages/api/movimentacoes.ts** - Stock movements (entrada/saida/ajuste)
- **pages/api/formas_pagamento.ts** - Payment methods registry
- **pages/api/transacoes.ts** - Financial transactions
- **pages/api/historico-precos.ts** - Price change history
- **pages/api/estoque-relatorio.ts** - Stock reports with calculated values

#### Dashboard Endpoints
- **pages/api/dashboard/metrics.ts** - KPIs (sales, revenue, stock alerts)
- **pages/api/dashboard/recent-sales.ts** - Latest 5 sales
- **pages/api/dashboard/top-products.ts** - Top selling products
- **pages/api/dashboard/vendas-7-dias.ts** - 7-day sales chart data

#### System Endpoints
- **pages/api/health.ts** - Health check for monitoring

### FASE 3 - Frontend Integration

#### Updated Service Layer
- **services/api.ts** - Removed `.php` extensions from all endpoints
  - Changed `/clientes.php` → `/clientes`
  - Changed `/dashboard/metrics.php` → `/dashboard/metrics`
  - Kept all service function signatures unchanged
  - Zero frontend code changes required

#### Configuration Updates

**next.config.js:**
- Removed `output: 'export'` (enables API routes)
- Removed `distDir: 'out'` (use default `.next`)
- Removed `trailingSlash: true`
- Removed dev proxy rewrites (no longer needed)
- Kept `images.unoptimized: true` for flexibility

**package.json:**
- Updated build script: `node scripts/build.js` → `next build`
- Updated preview script: `serve -s dist` → `next start`
- Updated clean scripts to remove `out/` and `dist/` references
- Added Supabase and JWT dependencies

**.gitignore:**
- Added `.vercel/` to ignore Vercel deployment artifacts

### FASE 4 - Cleanup

Moved old files to `antigos/` folder:
- `antigos/api/` - All PHP endpoints (*.php files)
- `antigos/*.sql` - All MariaDB schema files
- Kept only `database/supabase_schema.sql` for PostgreSQL

## Environment Variables Required

### Supabase Configuration
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Authentication
```env
JWT_SECRET=your-secret-key-min-32-chars
```

### Optional (for development)
```env
NEXT_PUBLIC_API_URL=/api
```

## Deployment Instructions

### 1. Setup Supabase Project

1. Create account at [supabase.com](https://supabase.com)
2. Create new project (choose region closest to users)
3. Run `database/supabase_schema.sql` in SQL Editor
4. Copy project URL and anon key to environment variables

### 2. Deploy to Vercel

#### Option A: Automatic (Recommended)
1. Push code to GitHub repository
2. Visit [vercel.com](https://vercel.com) and import repository
3. Add environment variables in project settings
4. Deploy automatically on every push

#### Option B: Manual via CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy (production)
vercel --prod

# Add environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add JWT_SECRET
```

### 3. Migrate Data (if applicable)

If you have existing MariaDB data:
```bash
# Export from MariaDB
mysqldump -u user -p database > backup.sql

# Convert to PostgreSQL format (manual adjustments needed)
# Import to Supabase using SQL Editor or pgAdmin
```

## API Response Format

All endpoints follow consistent response structure:

### Success Response
```json
{
  "success": true,
  "data": { /* entity or array */ },
  "message": "Operation completed successfully"
}
```

### Paginated Response
```json
{
  "success": true,
  "data": [/* entities */],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 150,
    "pages": 15
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "User-friendly error message",
  "error": "Technical error details"
}
```

## Authentication Flow

1. **Login**: POST `/api/auth` with `{ email, password }`
2. **Receive Token**: `{ success: true, data: { token, user } }`
3. **Store Token**: Frontend saves to `localStorage`
4. **Protected Requests**: Send `Authorization: Bearer <token>` header
5. **Token Validation**: Middleware checks JWT on every protected route

## Inline Quality Checks Performed

### Functional Programming
- Only `const` declarations used (no `let` or `var`)
- Pure functions with minimal side effects
- Descriptive naming (no comments needed)
- Function composition for complex logic
- No shared mutable state

### Security
- Input validation on all POST/PUT endpoints
- SQL injection prevention via Supabase query builder
- Password hashing with bcrypt (10 rounds)
- JWT tokens with 24h expiration
- Authorization middleware on protected routes

### Error Handling (Pragmatic Level)
- Try-catch blocks for all async operations
- Proper HTTP status codes (200, 201, 400, 401, 404, 500)
- User-friendly error messages
- Technical errors logged to console

### Type Safety
- TypeScript strict mode enabled
- All API handlers properly typed with NextApiRequest/NextApiResponse
- Authenticated requests use custom AuthenticatedRequest type
- Return types match existing ApiResponse<T> pattern

## Testing Checklist

Before going live:

- [ ] Run Supabase schema migration successfully
- [ ] Verify all environment variables are set in Vercel
- [ ] Test authentication flow (login, get profile, logout)
- [ ] Test each CRUD endpoint (create, read, update, delete)
- [ ] Verify dashboard metrics load correctly
- [ ] Check pagination works on list endpoints
- [ ] Confirm stock movements update quantities
- [ ] Test form submissions from frontend
- [ ] Verify JWT token expiration handling
- [ ] Check health endpoint returns 200
- [ ] Test error scenarios (invalid data, auth failures)

## Performance Considerations

- Supabase queries use indexes for fast lookups
- API Routes are automatically edge-optimized by Vercel
- JWT validation is stateless (no database lookup per request)
- Pagination limits large result sets
- Connection pooling handled by Supabase
- Static assets cached at edge locations

## Known Limitations

1. **Supabase Anon Key**: Currently using anon key in client-side code. For production, consider implementing Row Level Security (RLS) policies.

2. **File Uploads**: Not implemented in this migration. Consider adding Supabase Storage if needed.

3. **Email Notifications**: SMTP configuration removed. Use Supabase Auth or third-party service (SendGrid, Resend) if needed.

4. **Cron Jobs**: No scheduled tasks implemented. Use Vercel Cron Jobs or Supabase Functions for scheduled operations.

## Rollback Plan

If issues arise:

1. **Frontend**: Old code preserved in Git history
2. **Backend**: Old PHP files in `antigos/api/`
3. **Database**: Old SQL files in `antigos/*.sql`
4. **Deployment**: Can revert Vercel deployment to previous build

## Support & Resources

- [Next.js API Routes Documentation](https://nextjs.org/docs/pages/building-your-application/routing/api-routes)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Vercel Deployment Guide](https://vercel.com/docs/deployments/overview)
- [JWT.io Token Debugger](https://jwt.io/)

## Migration Completion Summary

✅ 18 API routes implemented
✅ 3 utility libraries created
✅ 1 PostgreSQL schema migrated
✅ 1 authentication middleware implemented
✅ 4 dashboard endpoints created
✅ Configuration files updated
✅ Old files archived to antigos/
✅ Zero breaking changes to frontend code

**Migration Status: COMPLETE**

The application is now ready for deployment to Vercel with Supabase PostgreSQL backend.
