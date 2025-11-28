# Manual Testing Guide: Sem Impostos Feature

## Overview
This document provides step-by-step instructions to manually test the "Sem Impostos" (No Taxes) feature for sales/orders.

## Prerequisites
1. Database migration `017_add_sem_impostos_field.sql` must be applied
2. Application must be running (`npm run dev` or `pnpm dev`)
3. User must be logged in with permission to create/edit sales

## Test Cases

### Test Case 1: Create a New Sale WITHOUT Taxes

**Steps:**
1. Navigate to the Sales page (`/vendas`)
2. Click "Nova Venda" (New Sale) button
3. Fill in the basic information:
   - Select a client
   - Select a stock location
   - Select a vendor (optional)
   - Select payment method
4. Add at least one product with IPI, ICMS, or ST configured
5. **Check the "Venda Sem Impostos" checkbox**
6. Observe the observations field

**Expected Results:**
- ✅ The message "PEDIDO SEM IMPOSTOS" should automatically appear in the observations field
- ✅ In the items table:
  - IPI Valor should be 0.00
  - ST Valor should be 0.00
  - Total Item should equal Subtotal Líquido (no tax additions)
- ✅ In the totals summary:
  - Total IPI should be R$ 0.00
  - Total ST should be R$ 0.00
  - Total Geral should equal Total Produtos Líquido

### Test Case 2: Create a New Sale WITH Taxes (Control Test)

**Steps:**
1. Navigate to the Sales page (`/vendas`)
2. Click "Nova Venda" (New Sale) button
3. Fill in the basic information (same as Test Case 1)
4. Add the same product(s) as Test Case 1
5. **Leave the "Venda Sem Impostos" checkbox UNCHECKED**
6. Observe the calculations

**Expected Results:**
- ✅ The message "PEDIDO SEM IMPOSTOS" should NOT appear in observations
- ✅ In the items table:
  - IPI Valor should be > 0.00 (if product has IPI)
  - ST Valor should be > 0.00 (if product has ST/MVA)
  - Total Item should be > Subtotal Líquido
- ✅ In the totals summary:
  - Total IPI should show the calculated IPI
  - Total ST should show the calculated ST
  - Total Geral should be greater than Total Produtos Líquido

### Test Case 3: Toggle the Checkbox

**Steps:**
1. Start creating a new sale
2. Add products with taxes
3. **Check** the "Venda Sem Impostos" checkbox
4. Observe the changes
5. **Uncheck** the "Venda Sem Impostos" checkbox
6. Observe the changes again

**Expected Results:**
- ✅ When CHECKED:
  - Message "PEDIDO SEM IMPOSTOS" is added to observations
  - All tax values become 0.00
  - Totals recalculate without taxes
- ✅ When UNCHECKED:
  - Message "PEDIDO SEM IMPOSTOS" is removed from observations
  - Tax values are recalculated based on product settings
  - Totals include taxes again

### Test Case 4: Edit Existing Sale

**Steps:**
1. Create and save a sale WITH the "Sem Impostos" option checked
2. Close the form
3. Edit the same sale
4. Verify the checkbox state and observations

**Expected Results:**
- ✅ The "Venda Sem Impostos" checkbox should be CHECKED
- ✅ The observations should contain "PEDIDO SEM IMPOSTOS"
- ✅ All tax values should be 0.00

### Test Case 5: Mixed Sale (With Discount)

**Steps:**
1. Create a new sale
2. Add multiple products (e.g., Produto A: R$ 100 x 2, Produto B: R$ 50 x 1)
3. Apply a discount of R$ 10.00
4. **Check** the "Venda Sem Impostos" checkbox
5. Observe the calculations

**Expected Results:**
- ✅ Discount should be distributed proportionally across items
- ✅ No taxes should be calculated even with discount
- ✅ Total should equal (Total Products - Discount) with no tax additions

### Test Case 6: Database Verification

**Steps:**
1. Create and save a sale with "Sem Impostos" checked
2. Note the sale ID
3. Query the database:
```sql
SELECT 
  numero_venda,
  sem_impostos,
  observacoes,
  total_ipi,
  total_st,
  total_produtos_liquido,
  valor_final
FROM vendas
WHERE id = [SALE_ID];
```

**Expected Results:**
- ✅ `sem_impostos` should be `true`
- ✅ `observacoes` should contain "PEDIDO SEM IMPOSTOS"
- ✅ `total_ipi` should be 0.00
- ✅ `total_st` should be 0.00
- ✅ `valor_final` should equal `total_produtos_liquido`

## Common Issues and Troubleshooting

### Issue 1: Checkbox doesn't appear
**Solution:** Ensure the VendaForm component changes are deployed and the page is refreshed.

### Issue 2: Taxes still being calculated
**Solution:** 
- Check browser console for JavaScript errors
- Verify the `sem_impostos` parameter is being passed to calculation functions
- Check if the migration was applied to the database

### Issue 3: Message doesn't auto-populate
**Solution:**
- Clear browser cache
- Check if the onChange handler for the checkbox is working
- Verify the observations field is not read-only

### Issue 4: Can't save the sale
**Solution:**
- Check browser console and network tab for API errors
- Verify the API endpoint accepts the `sem_impostos` field
- Check database permissions

## Regression Tests

After implementing this feature, verify these existing features still work:

1. ✅ Normal sales with taxes can still be created
2. ✅ Editing existing sales (created before this feature) works correctly
3. ✅ Sales reports show correct totals for both tax and no-tax sales
4. ✅ PDF generation includes the "PEDIDO SEM IMPOSTOS" message when applicable
5. ✅ Stock is properly deducted for both tax and no-tax sales
6. ✅ Payment terms and installments work correctly with no-tax sales

## Success Criteria

The feature is considered successfully implemented when:

- ✅ All 6 test cases pass
- ✅ No regression in existing functionality
- ✅ Database migration is applied without errors
- ✅ Code changes are committed and deployed
- ✅ Documentation is updated

## Notes

- The "Sem Impostos" option is designed for special cases like donations, internal transfers, or specific tax-exempt scenarios
- The feature does NOT affect stock management - products are still deducted from inventory
- Sales with `sem_impostos = true` should be clearly marked in reports for accounting purposes
