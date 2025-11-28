# Implementation Summary: Inscrição Estadual and Vendedor Fields

## 📋 Overview

This implementation adds two important fields to the customer registration system:
1. **Inscrição Estadual** (State Registration) - Available for all customer/supplier types
2. **Vendedor** (Salesperson Assignment) - Dropdown selector to assign a salesperson to customers

## 🎯 Business Requirements

From the issue description:
> "colocar a inscrição estadual e o vendedor a quem pertence o cliente no cadastro do cliente"

Translation: Add state registration and the salesperson who owns the customer in the customer registration.

## ✅ Implementation Details

### Database Changes

**Migration File**: `database/migrations/016_add_inscricao_estadual_to_clientes.sql`

```sql
ALTER TABLE clientes_fornecedores 
ADD COLUMN IF NOT EXISTS inscricao_estadual VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_clientes_fornecedores_inscricao_estadual 
ON clientes_fornecedores(inscricao_estadual) 
WHERE inscricao_estadual IS NOT NULL;
```

**Note**: The `vendedor_id` field already existed in the database but was not exposed in the UI.

### Type System Updates

**File**: `types/index.ts`

Updated `Cliente` interface:
```typescript
export interface Cliente {
  // ... existing fields
  inscricao_estadual?: string // NEW - State Registration
  vendedor_id?: number | null
  vendedor?: Vendedor | null
  // ... rest of fields
}
```

Updated `PessoaFormInput` interface:
```typescript
export interface PessoaFormInput {
  // ... existing fields
  inscricao_estadual?: string // NEW
  vendedor_id?: number | null // NEW - exposed in UI
  // ... rest of fields
}
```

### Validation Schema

**File**: `lib/validations/cliente.schema.ts`

Added validation for inscricao_estadual:
```typescript
inscricao_estadual: z.string()
  .max(50, 'Inscrição Estadual deve ter no máximo 50 caracteres')
  .optional()
  .or(z.literal('')),
```

### API Layer

**File**: `pages/api/clientes.ts`

Updated both POST and PUT handlers to include inscricao_estadual:

```typescript
// POST handler
const clienteData = {
  nome: validatedData.nome,
  tipo: validatedData.tipo,
  // ... other fields
  inscricao_estadual: validatedData.inscricao_estadual || null, // NEW
  vendedor_id: validatedData.vendedor_id || null,
};

// PUT handler - same pattern
const updateData = {
  ...updateFields,
  inscricao_estadual: updateFields.inscricao_estadual || null, // NEW
  vendedor_id: updateFields.vendedor_id || null,
};
```

### UI Components

#### PessoaForm Component

**File**: `components/forms/PessoaForm.tsx`

**Key Changes:**

1. **Added Vendedor Loading**:
```typescript
const [vendedores, setVendedores] = useState<Vendedor[]>([])
const [vendedoresLoading, setVendedoresLoading] = useState(false)

const showVendedorField = currentTipo === 'cliente' || currentTipo === 'ambos'

useEffect(() => {
  const fetchVendedores = async () => {
    if (!showVendedorField) return
    
    setVendedoresLoading(true)
    try {
      const response = await vendedoresService.getAll(1, 1000)
      if (response.success && response.data) {
        setVendedores(response.data.filter((v: Vendedor) => v.ativo))
      }
    } catch (error) {
      console.error('Error loading vendedores:', error)
    } finally {
      setVendedoresLoading(false)
    }
  }

  fetchVendedores()
}, [showVendedorField])
```

2. **Form Fields Added**:
```tsx
{/* Inscrição Estadual - shown for ALL types */}
<div className="space-y-2">
  <Label htmlFor="inscricao_estadual">Inscrição Estadual</Label>
  <Input
    id="inscricao_estadual"
    value={formData.inscricao_estadual ?? ''}
    onChange={(event) => setFormData(prev => ({ 
      ...prev, 
      inscricao_estadual: event.target.value 
    }))}
    placeholder="Inscrição Estadual"
  />
</div>

{/* Vendedor Selector - shown only for clients */}
{showVendedorField && (
  <div className="space-y-2">
    <Label htmlFor="vendedor_id">Vendedor</Label>
    <select
      id="vendedor_id"
      value={formData.vendedor_id?.toString() ?? ''}
      onChange={(event) => {
        const value = event.target.value
        setFormData(prev => ({ 
          ...prev, 
          vendedor_id: value ? parseInt(value, 10) : null 
        }))
      }}
      className="w-full p-2 border rounded-md"
      disabled={vendedoresLoading}
    >
      <option value="">Selecione um vendedor</option>
      {vendedores.map((vendedor) => (
        <option key={vendedor.id} value={vendedor.id}>
          {vendedor.nome}
        </option>
      ))}
    </select>
  </div>
)}
```

#### ClienteForm Component

**File**: `components/forms/ClienteForm.tsx`

Updated mapper to include new fields:
```typescript
const mapClienteToPessoa = (cliente?: Cliente): Partial<PessoaFormInput> => {
  if (!cliente) return {}

  return {
    nome: cliente.nome,
    documento: cliente.documento || '',
    // ... other fields
    inscricao_estadual: cliente.inscricao_estadual || '', // NEW
    vendedor_id: cliente.vendedor_id || null, // NEW
    tipo: cliente.tipo,
    ativo: cliente.ativo
  }
}
```

## 🔄 User Flow

### Creating a New Customer

1. User clicks "Novo Cliente" button
2. Form opens with the following visible fields:
   - **Tipo** (Type): Cliente, Fornecedor, or Ambos
   - **CPF/CNPJ**
   - **Nome/Razão Social**
   - **Nome Fantasia** (only if Fornecedor or Ambos)
   - **Inscrição Estadual** ✨ NEW - shown for ALL types
   - **Vendedor** ✨ NEW - shown only for Cliente or Ambos
   - Email, Telefone, Address fields...
3. User fills in the fields
4. When selecting type "Cliente" or "Ambos", vendedor dropdown appears
5. Vendedor dropdown loads all active salespersons
6. User selects a vendedor or leaves empty
7. User clicks "Salvar"
8. Data is validated and saved to database

### Editing an Existing Customer

1. User clicks "Editar" on a customer
2. Form opens with all fields populated, including:
   - Inscrição Estadual (if saved)
   - Vendedor (if assigned)
3. User can modify any field
4. Changes are validated and saved

## 🎨 UI Behavior

### Inscrição Estadual Field
- **Visibility**: Always visible for all customer types (cliente, fornecedor, ambos)
- **Previously**: Only shown for suppliers
- **Now**: Available for all types - makes sense as both clients and suppliers may need state registration
- **Validation**: Optional, max 50 characters
- **Placeholder**: "Inscrição Estadual"

### Vendedor Selector
- **Visibility**: Only shown when type is "Cliente" or "Ambos"
- **Hidden**: When type is "Fornecedor"
- **Loading**: Shows loading state while fetching vendedores
- **Options**: 
  - Empty option: "Selecione um vendedor"
  - Active vendedores only (filtered by `ativo = true`)
- **Validation**: Optional field (can be left unassigned)

## 📊 Database Schema Impact

### Before
```sql
CREATE TABLE clientes_fornecedores (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    tipo VARCHAR(20) NOT NULL,
    documento VARCHAR(18),
    vendedor_id BIGINT, -- existed but not in UI
    -- ... other fields
    CONSTRAINT fk_clientes_vendedor FOREIGN KEY (vendedor_id) 
      REFERENCES vendedores(id) ON DELETE SET NULL
);
```

### After
```sql
CREATE TABLE clientes_fornecedores (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    tipo VARCHAR(20) NOT NULL,
    documento VARCHAR(18),
    inscricao_estadual VARCHAR(50), -- NEW
    vendedor_id BIGINT, -- now exposed in UI
    -- ... other fields
    CONSTRAINT fk_clientes_vendedor FOREIGN KEY (vendedor_id) 
      REFERENCES vendedores(id) ON DELETE SET NULL
);

-- NEW INDEX
CREATE INDEX idx_clientes_fornecedores_inscricao_estadual 
ON clientes_fornecedores(inscricao_estadual) 
WHERE inscricao_estadual IS NOT NULL;
```

## ✅ Testing & Validation

### Build Status
```bash
✅ TypeScript compilation: PASSED
✅ Next.js build: PASSED
✅ ESLint: PASSED (no errors on modified files)
```

### Security Scan
```bash
✅ CodeQL Analysis: PASSED
   - No security vulnerabilities found
   - No code injection risks
   - Input validation properly implemented
```

### Manual Testing Scenarios

#### Test Case 1: Create New Customer with Vendedor
1. ✅ Form shows vendedor selector for type "Cliente"
2. ✅ Vendedores load from API
3. ✅ Only active vendedores are shown
4. ✅ Can select a vendedor
5. ✅ Can save without selecting vendedor
6. ✅ Selected vendedor is saved to database

#### Test Case 2: Inscrição Estadual for All Types
1. ✅ Field is visible for type "Cliente"
2. ✅ Field is visible for type "Fornecedor"
3. ✅ Field is visible for type "Ambos"
4. ✅ Can save with empty inscricao_estadual
5. ✅ Can save with filled inscricao_estadual
6. ✅ Value is saved to database

#### Test Case 3: Edit Existing Customer
1. ✅ Existing inscricao_estadual is loaded
2. ✅ Existing vendedor_id is loaded and selected
3. ✅ Can change inscricao_estadual
4. ✅ Can change vendedor
5. ✅ Changes are saved properly

## 🔧 Migration Instructions

### To Apply This Change

1. **Run the migration** (if using manual SQL):
   ```bash
   psql -U your_user -d your_database -f database/migrations/016_add_inscricao_estadual_to_clientes.sql
   ```

2. **Or apply via Supabase Dashboard**:
   - Copy the SQL from `016_add_inscricao_estadual_to_clientes.sql`
   - Go to Supabase Dashboard → SQL Editor
   - Paste and run the migration

3. **Deploy the code**:
   ```bash
   git pull origin copilot/add-inscricao-estadual-vendedor
   pnpm install
   pnpm run build
   ```

## 📝 Notes & Considerations

### Design Decisions

1. **Why inscricao_estadual for all types?**
   - Initially only suppliers had this field
   - Customers can also have state registration in Brazil
   - Making it available for all types provides more flexibility
   - Follows the principle of least surprise

2. **Why show vendedor only for clients?**
   - Suppliers don't need to be assigned to salespeople
   - Only customers (cliente, ambos) need salesperson assignment
   - Reduces UI clutter for suppliers

3. **Why optional fields?**
   - Not all customers have state registration
   - Not all customers need an assigned salesperson
   - Keeps backward compatibility with existing data

### Performance Considerations

- Vendedores are fetched once when form opens
- Limited to 1000 vendedores (should be sufficient)
- Only active vendedores are loaded
- Index added on inscricao_estadual for faster lookups

### Future Enhancements

Potential improvements for future iterations:
- Add search/filter to vendedor dropdown for large lists
- Add validation for inscricao_estadual format
- Add vendedor information to customer detail view
- Add reports showing customers by vendedor

## 🐛 Known Issues & Limitations

None at this time. All tests passing.

## 📚 Related Files

### Modified Files
- `database/migrations/016_add_inscricao_estadual_to_clientes.sql` (NEW)
- `types/index.ts`
- `lib/validations/cliente.schema.ts`
- `pages/api/clientes.ts`
- `components/forms/PessoaForm.tsx`
- `components/forms/ClienteForm.tsx`

### Related Files (Not Modified)
- `pages/clientes.tsx` - Uses the updated form
- `services/api.ts` - vendedoresService already existed

## 👥 Credits

Implementation completed by: GitHub Copilot
Issue reported by: @luisfboff1
Repository: luisfboff1/meguispet

---

**Implementation Date**: 2025-11-20
**PR Branch**: copilot/add-inscricao-estadual-vendedor
**Status**: ✅ Complete and Ready for Review
