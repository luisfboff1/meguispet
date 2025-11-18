# Migration 015: Fix Stock Validation After RLS Implementation

## 🐛 Problem

After implementing Row Level Security (RLS) in Migration 014, sales creation started failing with "insufficient stock" errors even when products have available stock.

### Error Message
```
❌ Estoque insuficiente para os seguintes produtos:
  Product 5 (disponível: 0, solicitado: 1)
```

## 🔍 Root Cause

The stock validation logic uses database functions (`get_stock_with_lock`, `adjust_stock_with_lock`, etc.) that query the `produtos_estoques` table. However, Migration 014 did not include RLS policies for the stock-related tables:

- `estoques` (stock locations)
- `produtos_estoques` (product stock by location)
- `estoques_historico` (stock movement history)

Without RLS policies, authenticated users cannot access these tables, causing the stock validation to always return 0 stock.

## ✅ Solution

Migration 015 adds:

1. **RLS Policies** for all stock-related tables
2. **SECURITY DEFINER** context for stock management functions
   - Functions now run with elevated privileges to bypass RLS
   - Functions still validate user authentication via `auth.uid()`
3. **Immutable audit log** - Stock history cannot be modified after creation

## 📋 How to Apply This Migration

### Option 1: Using Supabase CLI (Recommended)

```bash
# 1. Navigate to project directory
cd /home/runner/work/meguispet/meguispet

# 2. Apply the migration
supabase db push

# 3. Verify RLS is enabled
supabase db diff
```

### Option 2: Manual Application via Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the file `database/migrations/015_add_stock_tables_rls.sql`
4. Copy the entire SQL content
5. Paste into the SQL Editor
6. Click **Run** to execute

### Option 3: Using psql (For Advanced Users)

```bash
# Get your connection string from Supabase dashboard or .env
psql "postgresql://postgres:[PASSWORD]@aws-1-sa-east-1.pooler.supabase.com:6543/postgres" -f database/migrations/015_add_stock_tables_rls.sql
```

## 🧪 Testing After Migration

### Test 1: Verify RLS is Enabled

```sql
-- Run in SQL Editor
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('estoques', 'produtos_estoques', 'estoques_historico');
```

Expected output: All three tables should have `rowsecurity = true`

### Test 2: Verify Policies Exist

```sql
-- Run in SQL Editor
SELECT schemaname, tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('estoques', 'produtos_estoques', 'estoques_historico')
ORDER BY tablename, policyname;
```

Expected output: Should list multiple policies for each table

### Test 3: Test Stock Access

```sql
-- Run in SQL Editor (as authenticated user)
-- Replace 1 with actual product_id and estoque_id from your database
SELECT * FROM get_stock_with_lock(1, 1);
```

Expected output: Should return stock quantity and product name

### Test 4: Create a Sale

Try creating a sale through the application UI:

1. Navigate to **Vendas** (Sales) page
2. Click **Nova Venda** (New Sale)
3. Add a product that has stock
4. Complete the sale

Expected result: Sale should be created successfully without "insufficient stock" error

## 🔐 Security Notes

### Function Security Model

The stock management functions use `SECURITY DEFINER` with `SET search_path = public`. This means:

- Functions run with the privileges of the function owner (postgres/superuser)
- Functions can bypass RLS policies on tables
- Functions still validate that the user is authenticated via `auth.uid()`
- Search path is explicitly set to prevent SQL injection attacks

### Why SECURITY DEFINER?

Stock operations require atomic transactions with row-level locking. If functions had to respect RLS policies, they would fail when trying to lock rows. By using `SECURITY DEFINER`, functions can:

1. Lock rows for update
2. Validate stock availability
3. Update stock quantities
4. Create audit trail in history table

All while maintaining security through authentication checks at the function level.

### RLS Policies Still Protect Direct Access

Even though functions use `SECURITY DEFINER`, direct table access (via SQL queries or API) still enforces RLS policies. Users cannot directly read or modify stock tables without authentication.

## 🎯 What Changed

### Tables with New RLS Policies
1. `estoques` - Stock locations
2. `produtos_estoques` - Product quantities by location
3. `estoques_historico` - Stock movement audit trail

### Updated Functions
1. `get_stock_with_lock` - Now uses SECURITY DEFINER
2. `adjust_stock_with_lock` - Now uses SECURITY DEFINER
3. `adjust_bulk_stock_with_lock` - Now uses SECURITY DEFINER
4. `get_stock_history` - Now uses SECURITY DEFINER

### Policy Summary

**For all stock tables:**
- ✅ Authenticated users can VIEW all records
- ✅ Authenticated users can INSERT records
- ✅ Authenticated users can UPDATE records (except history)
- ⚠️ Only admins can DELETE records

**Special rule for `estoques_historico`:**
- 🔒 NO ONE can update history records (immutable audit log)

## 📊 Rollback Plan

If you need to rollback this migration:

```sql
-- Disable RLS
ALTER TABLE estoques DISABLE ROW LEVEL SECURITY;
ALTER TABLE produtos_estoques DISABLE ROW LEVEL SECURITY;
ALTER TABLE estoques_historico DISABLE ROW LEVEL SECURITY;

-- Drop policies
DROP POLICY IF EXISTS "Authenticated users view stock locations" ON estoques;
DROP POLICY IF EXISTS "Authenticated users insert stock locations" ON estoques;
DROP POLICY IF EXISTS "Authenticated users update stock locations" ON estoques;
DROP POLICY IF EXISTS "Admins delete stock locations" ON estoques;

DROP POLICY IF EXISTS "Authenticated users view product stock" ON produtos_estoques;
DROP POLICY IF EXISTS "Authenticated users insert product stock" ON produtos_estoques;
DROP POLICY IF EXISTS "Authenticated users update product stock" ON produtos_estoques;
DROP POLICY IF EXISTS "Admins delete product stock" ON produtos_estoques;

DROP POLICY IF EXISTS "Authenticated users view stock history" ON estoques_historico;
DROP POLICY IF EXISTS "Authenticated users insert stock history" ON estoques_historico;
DROP POLICY IF EXISTS "Stock history is immutable" ON estoques_historico;
DROP POLICY IF EXISTS "Admins delete stock history" ON estoques_historico;

-- Revert functions to default security
-- (Would need to recreate functions without SECURITY DEFINER)
```

## ⚠️ Important Notes

1. **Backup First**: Always backup your database before applying migrations
2. **Test in Staging**: If you have a staging environment, test there first
3. **Monitor Performance**: Watch query performance after enabling RLS
4. **Check Logs**: Review application logs for any authentication errors

## 🆘 Troubleshooting

### Issue: Sales still fail with "insufficient stock"

**Solution:**
1. Check if migration was applied: `SELECT * FROM pg_policies WHERE tablename = 'produtos_estoques';`
2. Verify user is authenticated: Check browser cookies for `supabase-auth-token`
3. Check function security: `SELECT proname, prosecdef FROM pg_proc WHERE proname LIKE '%stock%';`
4. Test function directly: `SELECT * FROM get_stock_with_lock(product_id, stock_id);`

### Issue: "permission denied" errors

**Solution:**
1. Ensure `GRANT EXECUTE` statements were applied
2. Check if user is in the `authenticated` role
3. Verify Supabase Auth is working properly

### Issue: Functions return no data

**Solution:**
1. Check if `produtos_estoques` table has data for the product
2. Verify estoque_id exists and is active
3. Check if product has stock entry: `SELECT * FROM produtos_estoques WHERE produto_id = X AND estoque_id = Y;`

## 📞 Support

If you encounter issues after applying this migration:

1. Check the SQL execution logs in Supabase Dashboard
2. Review the application logs for detailed error messages
3. Verify all prerequisites from Migration 014 were applied
4. Contact the development team with error details

## 📚 Related Documentation

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL SECURITY DEFINER](https://www.postgresql.org/docs/current/sql-createfunction.html)
- Migration 014: Initial RLS implementation
- Migration 001: Stock management functions

---

**Migration Status:** ✅ Ready to Apply  
**Priority:** P0 - Critical Fix  
**Estimated Downtime:** None (migrations are applied without downtime)  
**Testing Required:** Yes (verify sales creation works)
