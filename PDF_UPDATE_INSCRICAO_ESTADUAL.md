# Update: Inscrição Estadual in PDF Sales Order

## Summary
Added the `inscricao_estadual` (State Registration) field to the PDF sales order generation, as requested in PR comment feedback.

## User Request (Translated from Portuguese)
> "And when I generate a sale, in the PDF order of the sale along with the CNPJ, name and such, the state registration (inscrição estadual) needs to appear"

## Implementation

### File Modified
- `lib/pdf-generator.ts` - Added inscricao_estadual display in customer information section

### Code Change
```typescript
// Inscrição Estadual - exibir se disponível
if (venda.cliente?.inscricao_estadual) {
  doc.setFont('helvetica', 'bold')
  doc.text('INSCRIÇÃO ESTADUAL:', margin, yPos)
  doc.setFont('helvetica', 'normal')
  doc.text(venda.cliente.inscricao_estadual, margin + 45, yPos)
  yPos += 6
}
```

### PDF Layout

The field appears in the customer information section of the PDF:

```
=================================================================
                    PDF PEDIDO DE VENDA
=================================================================

[LOGO]  Meguispet Produtos Pets LTDA
        60.826.400/0001-82
-----------------------------------------------------------------

INFORMAÇÕES DO CLIENTE:

NOME: [Nome do Cliente]
CNPJ: [12.345.678/0001-99]
INSCRIÇÃO ESTADUAL: [123.456.789.123]  ← ✨ NEW FIELD
ENDEREÇO: [Rua Example, 123]
BAIRRO: [Centro]            CIDADE: [São Paulo]

-----------------------------------------------------------------
```

### Behavior
- **Conditional Display**: The field only appears if the customer has `inscricao_estadual` filled in their registration
- **Position**: Appears immediately after the CNPJ field
- **Format**: "INSCRIÇÃO ESTADUAL: [value]"
- **Spacing**: Properly adds 6mm vertical spacing after the field

## Integration with Previous Changes

This update completes the full implementation of the `inscricao_estadual` field:

1. ✅ Database migration - Added column to `clientes_fornecedores` table
2. ✅ TypeScript types - Added to Cliente interface
3. ✅ Validation - Added Zod schema validation
4. ✅ API handlers - POST/PUT save the field
5. ✅ UI Form - Field visible and editable
6. ✅ **PDF Generation - Field now displayed in sales orders** (NEW)

## Testing

### Build Status
```bash
✅ TypeScript compilation: PASSED
✅ Next.js build: PASSED  
✅ No linting errors
```

### Test Scenarios

#### Scenario 1: Customer WITH Inscrição Estadual
- **Input**: Customer has inscricao_estadual = "123.456.789.123"
- **Expected**: Field appears in PDF after CNPJ
- **Result**: ✅ Field is displayed with correct formatting

#### Scenario 2: Customer WITHOUT Inscrição Estadual
- **Input**: Customer has inscricao_estadual = null or empty
- **Expected**: Field does NOT appear in PDF
- **Result**: ✅ Field is conditionally hidden

## Technical Details

### Location in Code
- **File**: `lib/pdf-generator.ts`
- **Function**: `generateOrderPDF()`
- **Line**: ~134-143 (after CNPJ field display)

### Font Settings
- **Label**: Bold Helvetica, 10pt
- **Value**: Normal Helvetica, 10pt
- **Alignment**: Left-aligned with other customer fields

### Spacing
- **Horizontal**: 
  - Label at left margin (15mm)
  - Value at margin + 45mm (to align with other field values)
- **Vertical**: 6mm spacing before next field

## Commit Information

**Commit Hash**: 1509df1
**Message**: "Add inscricao_estadual to PDF sales order"
**Files Changed**: 1 (lib/pdf-generator.ts)
**Lines Added**: 9

## Related Documentation

See main implementation document: `IMPLEMENTATION_INSCRICAO_VENDEDOR.md`

## Future Considerations

Potential enhancements:
- Add inscricao_estadual to other report types (if applicable)
- Add formatting validation for inscricao_estadual (state-specific formats)
- Consider adding field to email templates if sales orders are emailed

---

**Update Date**: 2025-11-20
**Branch**: copilot/add-inscricao-estadual-vendedor
**Status**: ✅ Complete and Tested
