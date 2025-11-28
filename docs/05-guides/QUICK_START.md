# Quick Start Guide - Payment Installment System

## 🚀 Getting Started in 3 Steps

### Step 1: Apply Database Migration ⚙️

Run this SQL migration in your Supabase/PostgreSQL database:

```bash
# Option A: Using psql
psql -U your_user -d your_database -f database/migrations/010_venda_parcelas_system.sql

# Option B: Using Supabase Dashboard
# 1. Go to SQL Editor in Supabase Dashboard
# 2. Copy contents of database/migrations/010_venda_parcelas_system.sql
# 3. Paste and Execute
```

**What this creates:**
- New table `venda_parcelas` for storing installments
- Column `venda_parcela_id` in `transacoes` table
- Indexes for performance
- Helper functions for status updates

### Step 2: Test the Feature 🧪

1. **Navigate to Sales Page** (`/vendas`)

2. **Click "Nova Venda" (New Sale)**

3. **Fill in sale details:**
   - Select client
   - Select seller
   - Add products
   - The system will calculate totals

4. **Enable Installments:**
   - Check ✓ **"Parcelar pagamento"**
   - Enter **Number of Installments**: `3`
   - Select **First Payment Date**: `30 days from today`

5. **Review Generated Installments:**
   - System automatically generates 3 equal installments
   - Each installment is 1 month apart
   - You can edit values and dates in the table

6. **Save the Sale**

### Step 3: Verify in Financial Section 💰

1. **Navigate to Financial Page** (`/financeiro`)

2. **Look for the new transactions:**
   ```
   📦 Venda 20251114-5815 • Parcela
   Receita Venda 20251114-5815 - Parcela 1/3
   R$ 1,666.67 | 14/12/2025
   
   📦 Venda 20251114-5815 • Parcela
   Receita Venda 20251114-5815 - Parcela 2/3
   R$ 1,666.67 | 14/01/2026
   
   📦 Venda 20251114-5815 • Parcela
   Receita Venda 20251114-5815 - Parcela 3/3
   R$ 1,666.66 | 14/02/2026
   ```

3. **Test Editing:**
   - Click **Edit** button on any installment transaction
   - Change the **Date**
   - Save changes
   - Verify the date updated in the list

## ✨ Key Features to Try

### 1. Different Installment Counts
Try creating sales with:
- 1 installment (like a normal sale)
- 5 installments
- 12 installments (monthly for a year)

### 2. Manual Date Adjustment
- Generate installments
- Manually adjust dates before saving
- Example: First payment in 15 days instead of 30

### 3. Manual Value Adjustment
- Change individual installment values
- Example: First installment higher than others
- System validates total still matches sale value

### 4. Mix Regular and Installment Sales
- Create some sales without checking "Parcelar pagamento"
- Create others with installments
- Both work perfectly in the system

## 📋 Common Scenarios

### Scenario 1: Customer Pays in 3 Months
```
Sale Value: R$ 9,000.00
Installments: 3
First Payment: 30 days from today

Result:
- Parcela 1/3: R$ 3,000.00 - 14/12/2025
- Parcela 2/3: R$ 3,000.00 - 14/01/2026
- Parcela 3/3: R$ 3,000.00 - 14/02/2026
```

### Scenario 2: Customer Wants Smaller First Payment
```
Sale Value: R$ 10,000.00
Installments: 5
Manual Adjustment:

- Parcela 1/5: R$ 1,000.00 - 14/12/2025 ← Edited
- Parcela 2/5: R$ 2,250.00 - 14/01/2026 ← Auto-adjusted
- Parcela 3/5: R$ 2,250.00 - 14/02/2026 ← Auto-adjusted
- Parcela 4/5: R$ 2,250.00 - 14/03/2026 ← Auto-adjusted
- Parcela 5/5: R$ 2,250.00 - 14/04/2026 ← Auto-adjusted
```

### Scenario 3: Customer Pays Earlier
```
Original installment date: 14/01/2026
Customer pays early: 10/01/2026

Action:
1. Go to Financial page
2. Click Edit on the installment transaction
3. Change date to 10/01/2026
4. Save
```

## 🎯 Tips for Best Results

### Do's ✅
- Use clear first payment dates (e.g., same day each month)
- Review generated installments before saving
- Add notes in "Observações" for special terms
- Keep installment dates realistic

### Don'ts ❌
- Don't save without reviewing installment table
- Don't forget to apply database migration first
- Don't worry about rounding - system handles it
- Don't delete transactions linked to installments (delete the sale instead)

## 🔍 Troubleshooting

### Issue: Checkbox doesn't appear
**Solution:** Clear browser cache and reload page

### Issue: Can't save sale with installments
**Solution:** Check that total of installments matches sale value (within R$ 0.10)

### Issue: Transactions not appearing in Financial page
**Solution:** 
1. Verify database migration was applied
2. Check browser console for errors
3. Refresh financial page

### Issue: Can't edit installment dates
**Solution:** Edit the transaction date in Financial page, not the installment directly

## 📖 More Information

- **Full Documentation:** `docs/SISTEMA_PARCELAMENTO.md`
- **Implementation Details:** `docs/IMPLEMENTATION_SUMMARY.md`
- **API Documentation:** See comments in `pages/api/venda-parcelas/`

## 🆘 Need Help?

If you encounter issues:
1. Check the documentation files
2. Review console logs (F12 in browser)
3. Verify database migration was applied correctly
4. Check that all API endpoints are accessible

---

**Ready to use!** The system is production-ready and fully tested. Enjoy better cash flow management! 🎉
