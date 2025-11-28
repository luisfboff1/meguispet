# 🎯 Quick Start Guide - Payment Terms Feature

## What This Feature Does

This feature allows you to create **payment conditions templates** (like "15/30/45 days") that can be quickly selected when creating a sale, automatically generating the payment installments.

## Location

Payment terms are integrated into the **Sales page** (`/vendas`) as a tab.

**To access:**
1. Navigate to `/vendas`  
2. Click on the **"Condições de Pagamento"** tab

## Example Use Case

**Before this feature:**
- For each sale, you had to manually:
  1. Enable installments ✋
  2. Enter number of installments ✋
  3. Set the first installment date ✋
  4. Review generated installments ✋

**After this feature:**
- You can now:
  1. Select "15/30/45 days" from a dropdown ✨
  2. Installments are automatically created! 🎉

## Visual Guide

### 1️⃣ Create Payment Terms (Setup - Do Once)

Navigate to: `http://your-domain.com/vendas` → Click on **"Condições de Pagamento"** tab

```
┌─────────────────────────────────────────────────────┐
│  Vendas                                              │
│  Gerencie suas vendas e condições de pagamento      │
│                                          [+ Nova]    │
├─────────────────────────────────────────────────────┤
│  [Vendas]  [Condições de Pagamento] ← Click Here   │
├─────────────────────────────────────────────────────┤
│                                                       │
│  📊 Payment Terms Table (Customizable & Responsive) │
│  ┌──────────────────────────────────────────────┐  │
│  │ Nome        │ Prazos      │ Status  │ Ações  │  │
│  ├──────────────────────────────────────────────┤  │
│  │ À Vista     │ À Vista     │ ✓ Ativo │ [Edit] │  │
│  │ 15 Dias     │ 15 dias     │ ✓ Ativo │ [Edit] │  │
│  │ 30/60 Dias  │ 30/60 dias  │ ✓ Ativo │ [Edit] │  │
│  │ 15/30/45 D. │ 15/30/45 d. │ ✓ Ativo │ [Edit] │  │
│  └──────────────────────────────────────────────┘  │
│                                                       │
└─────────────────────────────────────────────────────┘
```

**Click "+ Nova Condição":**

```
┌─────────────────────────────────────────────┐
│  💳 Nova Condição de Pagamento              │
├─────────────────────────────────────────────┤
│                                             │
│  Nome da Condição *                         │
│  ┌─────────────────────────────────────┐   │
│  │ 15/30/45 dias                       │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Descrição (Opcional)                       │
│  ┌─────────────────────────────────────┐   │
│  │ Parcelado em 3x sem juros           │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Dias de Pagamento *                        │
│  ┌─────────────────────────────────────┐   │
│  │ 15, 30, 45                          │   │
│  └─────────────────────────────────────┘   │
│  ℹ️ Informe os dias separados por vírgula  │
│                                             │
│  ┌────────────────────────────────────┐    │
│  │ 📊 Pré-visualização:                │    │
│  │ 15 dias / 30 dias / 45 dias        │    │
│  │ (3 parcelas)                        │    │
│  └────────────────────────────────────┘    │
│                                             │
│  Ordem: [  0  ]    ☑ Condição ativa        │
│                                             │
│           [Cancelar]  [Salvar Condição]    │
└─────────────────────────────────────────────┘
```

### 2️⃣ Use in Sales Form

Navigate to: `http://your-domain.com/vendas` → Click "Nova Venda"

**Old way (Manual):**
```
┌─────────────────────────────────────────────┐
│  Desconto e Prazo                           │
├─────────────────────────────────────────────┤
│                                             │
│  ☐ Parcelar pagamento                       │
│                                             │
│  [ ] Você have to manually configure        │
│      everything...                          │
└─────────────────────────────────────────────┘
```

**New way (with Payment Terms):**
```
┌─────────────────────────────────────────────┐
│  Desconto e Prazo                           │
├─────────────────────────────────────────────┤
│                                             │
│  Condição de Pagamento                      │
│  ┌────────────────────────────────────┐    │
│  │ 15/30/45 dias - 3x (15, 30, 45) ▼ │    │
│  └────────────────────────────────────┘    │
│  ℹ️ Selecione uma condição pré-definida    │
│                                             │
│  Data Base para Cálculo                     │
│  ┌────────────────────────────────────┐    │
│  │ 2025-11-16            📅           │    │
│  └────────────────────────────────────┘    │
│  ℹ️ Data de referência (padrão: hoje)      │
│                                             │
└─────────────────────────────────────────────┘
```

**Result - Automatic Installments:**
```
┌──────────────────────────────────────────────────────┐
│  📋 Parcelas Geradas                                  │
├──────────────────────────────────────────────────────┤
│ Parcela │ Valor      │ Vencimento  │ Observações    │
├─────────┼────────────┼─────────────┼────────────────┤
│  1/3    │ R$ 100,00  │ 2025-12-01  │ Parcela 1/3 - 15 dias │
│  2/3    │ R$ 100,00  │ 2025-12-16  │ Parcela 2/3 - 30 dias │
│  3/3    │ R$ 100,00  │ 2025-12-31  │ Parcela 3/3 - 45 dias │
├─────────┼────────────┴─────────────┴────────────────┤
│ Total:  │ R$ 300,00                                  │
└─────────┴────────────────────────────────────────────┘
```

## 🎯 Real-World Example

**Scenario**: Pet shop wants to offer "30/60/90 days" payment option

**Steps**:

1. **Create the payment term** (do once):
   - Go to `/condicoes-pagamento`
   - Click "+ Nova Condição"
   - Name: "30/60/90 dias"
   - Days: `30, 60, 90`
   - Save

2. **Use in a sale**:
   - Customer buys products worth R$ 600,00
   - In sale form, select "30/60/90 dias"
   - System automatically creates:
     - Installment 1: R$ 200,00 due in 30 days
     - Installment 2: R$ 200,00 due in 60 days
     - Installment 3: R$ 200,00 due in 90 days

3. **Done!** ✨
   - No manual date calculations
   - No manual amount divisions
   - Consistent payment terms across all sales

## 📊 Data Flow Diagram

```
┌──────────────┐
│   User       │
│  Creates     │ (1) Create payment terms
│  Payment     │     e.g., "15/30/45 dias"
│  Term        │
└──────┬───────┘
       │
       ↓
┌──────────────────────────┐
│  condicoes_pagamento     │
│  Table                   │
│  ┌────────────────────┐  │
│  │ id: 1              │  │
│  │ nome: 15/30/45 dias│  │
│  │ dias: [15,30,45]   │  │
│  └────────────────────┘  │
└──────────┬───────────────┘
           │
           │ (2) Available in sales form
           ↓
┌──────────────────────────┐
│   Sales Form             │
│   User selects:          │
│   "15/30/45 dias"        │
└──────────┬───────────────┘
           │
           │ (3) Auto-generate installments
           ↓
┌──────────────────────────┐
│   venda_parcelas         │
│   ┌──────────────────┐   │
│   │ Parcela 1: 15d   │   │
│   │ Parcela 2: 30d   │   │
│   │ Parcela 3: 45d   │   │
│   └──────────────────┘   │
└──────────────────────────┘
```

## 🔧 Configuration Examples

### Example 1: Simple Payment Term
```
Name: "30 Dias"
Days: 30
Result: Single installment due in 30 days
```

### Example 2: Split Payment
```
Name: "15/30 Dias"
Days: 15, 30
Result: 
  - 50% due in 15 days
  - 50% due in 30 days
```

### Example 3: Three Installments
```
Name: "15/30/45 Dias"
Days: 15, 30, 45
Result:
  - 33.33% due in 15 days
  - 33.33% due in 30 days
  - 33.34% due in 45 days (adjusted for rounding)
```

### Example 4: À Vista (Cash)
```
Name: "À Vista"
Days: 0
Result: Full payment due immediately (today)
```

## 💡 Pro Tips

1. **Naming Convention**: Use clear names like "15/30/45 dias" that describe the payment schedule

2. **Default Terms**: The system comes with 8 pre-configured terms:
   - À Vista (0)
   - 15 Dias
   - 30 Dias
   - 15/30 Dias
   - 30/60 Dias
   - 30/60/90 Dias
   - 15/30/45 Dias
   - Personalizado (empty, for custom use)

3. **Inactive Terms**: Instead of deleting terms in use, set them as inactive

4. **Ordering**: Use the "ordem" field to control display order in the dropdown

5. **Base Date**: Default is today, but you can change it if the payment schedule should start from a different date

## 📝 Summary

**What you get:**
- ✅ Quick payment term selection
- ✅ Automatic installment calculation
- ✅ Consistent payment options
- ✅ Reduced manual entry errors
- ✅ Flexible configuration

**Time saved per sale:**
- Before: ~2 minutes to configure installments manually
- After: ~5 seconds to select a payment term
- **Savings**: ~115 seconds per sale! ⚡

## 🚀 Getting Started

1. Run the database migration (see IMPLEMENTATION_SUMMARY.md)
2. Access `/vendas`
3. Click on the **"Condições de Pagamento"** tab
4. Review the 8 default payment terms in the table
5. (Optional) Create custom terms for your business
6. Switch to the **"Vendas"** tab and start using them in sales! 🎉

---

**Need help?** Check the full documentation in `CONDICOES_PAGAMENTO.md`
