# 🚀 Stock Management V2 - Quick Start Guide

## What's New?

Your stock management system has been upgraded with **4 critical improvements**:

1. ✅ **Row-Level Locking** - Eliminates race conditions
2. ✅ **Audit Trail** - Complete history of all stock changes
3. ✅ **Retry Logic** - Automatic recovery from transient failures
4. ✅ **Transactions** - All-or-nothing guarantees

## 📦 What You Need to Do

### Step 1: Apply Database Migration (5 minutes)

**Via Supabase Dashboard:**
1. Open Supabase Dashboard → SQL Editor
2. Copy and paste contents of: `database/migrations/001_stock_improvements.sql`
3. Click "Run"
4. Wait for "Success" message

**Verify it worked:**
```sql
SELECT COUNT(*) FROM estoques_historico;
-- Should return 0 (table exists but empty)

SELECT proname FROM pg_proc WHERE proname = 'adjust_stock_with_lock';
-- Should return 'adjust_stock_with_lock'
```

### Step 2: Test the Implementation (30 minutes)

Follow the testing guide step-by-step:
- Open: `TESTING_GUIDE.md`
- Run: Tests 1, 2, 3, 4 (essential scenarios)
- Verify: All tests pass

### Step 3: Deploy (10 minutes)

**Development:**
```bash
pnpm dev
# Everything should work as before + new features
```

**Production:**
```bash
pnpm build
pnpm start
```

## 🎯 What Changed?

### For Users
**Nothing visible changed!** Everything works exactly as before, but better:
- No more overselling (stock can't go negative)
- Reliable under high traffic
- Complete audit trail for compliance

### For Developers

**Before:**
```typescript
// Old way (still works but limited)
await applySaleStock(items, stockId);
```

**After:**
```typescript
// New way (recommended)
await applySaleStock(
  items,
  stockId,
  saleId,    // ← Links to sale for audit
  userId     // ← Tracks who made change
);
```

**Benefits:**
- Automatic retry on failures
- Complete history tracking
- Transaction safety
- Better error messages

## 📚 Documentation

| File | What's Inside | Read If... |
|------|---------------|-----------|
| **STOCK_V2_README.md** ← YOU ARE HERE | Quick start guide | You want to get started quickly |
| **IMPLEMENTATION_SUMMARY_V2.md** | Executive summary | You want an overview |
| **STOCK_IMPROVEMENTS_V2.md** | Technical deep-dive | You want to understand how it works |
| **TESTING_GUIDE.md** | Step-by-step tests | You want to validate it works |
| **database/migrations/001_stock_improvements.sql** | SQL schema & functions | You're applying the migration |

## 🔍 Quick Verification

After migration, test with one sale:

```bash
# Create a test sale
curl -X POST http://localhost:3000/api/vendas \
  -H "Content-Type: application/json" \
  -d '{
    "numero_venda": "TEST-001",
    "estoque_id": 1,
    "itens": [{"produto_id": 1, "quantidade": 2, "preco_unitario": 50.00}],
    "valor_total": 100.00,
    "valor_final": 100.00
  }'
```

**Check history was created:**
```sql
SELECT * FROM estoques_historico ORDER BY created_at DESC LIMIT 5;
-- Should show your test sale with tipo_operacao = 'VENDA'
```

If this works, you're good to go! 🎉

## ⚠️ Important Notes

### Backward Compatible
All existing code continues to work. No breaking changes.

### When to Use V2 Features
Use the enhanced functions (with saleId/userId) for:
- **New code** - Always use full signature
- **Critical operations** - Sales, purchases, transfers
- **Audit requirements** - Compliance, reporting

Keep using simple functions for:
- **Non-critical adjustments** - Manual inventory corrections
- **Quick operations** - When audit trail not needed

### What's Automatic Now
- ✅ Retry on lock conflicts (no code changes needed)
- ✅ History tracking (happens automatically)
- ✅ Transaction rollback (built-in)
- ✅ Race condition prevention (database handles it)

## 🚨 If Something Goes Wrong

### Migration Fails
- Check PostgreSQL version (needs 12+)
- Verify you have CREATE permissions
- Look for syntax errors in output

### Tests Fail
- Ensure migration completed successfully
- Check database connection
- Verify test data exists

### Application Errors
- Check console for detailed error messages
- Review logs for retry attempts
- Verify database functions exist

## 📊 What to Monitor

After deploying to production, watch for:

1. **Retry Rate**
   - Normal: <5% of operations retry
   - Investigate if: >10% retry rate

2. **Lock Timeouts**
   - Normal: Very rare (<0.1%)
   - Investigate if: Frequent (>1%)

3. **History Table Growth**
   - Normal: ~150-200 bytes per entry
   - Plan for: Archival after 2 years

4. **Operation Latency**
   - Normal: 50-100ms per sale
   - Investigate if: >500ms average

## ✅ Success Criteria

You know it's working when:
- [x] Migration applied without errors
- [x] Test sale creates history entry
- [x] Concurrent sales don't cause negative stock
- [x] Deleting sale reverts stock correctly
- [x] Console logs show operation details (in dev mode)

## 🎓 Key Concepts (Simple Explanation)

### Row-Level Locking
**What**: Database "locks" a product row while updating it
**Why**: Prevents two sales from selling the same stock simultaneously
**Analogy**: Like a checkout counter - one customer at a time

### Exponential Backoff
**What**: If operation fails, wait a bit then try again (wait longer each time)
**Why**: Gives time for locks to release or network to recover
**Analogy**: Like knocking on a locked door - knock, wait, knock again louder

### Audit Trail
**What**: Every stock change is recorded with who/what/when/why
**Why**: Compliance, debugging, reporting
**Analogy**: Like a detailed diary of everything that happened

### Atomic Transactions
**What**: Multiple operations succeed together or fail together
**Why**: Prevents partial updates that cause inconsistencies
**Analogy**: Like a package deal - you get everything or nothing

## 🤝 Next Steps

1. **Today**: Apply migration and run basic tests
2. **This Week**: Deploy to staging, run full test suite
3. **Next Week**: Deploy to production, monitor metrics
4. **This Month**: Create dashboard, set up alerts, train team

## 💬 Questions?

- **Technical details**: Read `STOCK_IMPROVEMENTS_V2.md`
- **How to test**: Read `TESTING_GUIDE.md`
- **Quick overview**: Read `IMPLEMENTATION_SUMMARY_V2.md`
- **Code reference**: Check `lib/stock-manager.ts`

---

**Status**: ✅ Ready for Testing
**Risk**: Low (backward compatible)
**Time to Deploy**: ~45 minutes
**Team**: Development

Good luck! 🚀
