# Plano Completo de Implementação - Sistema de ICMS-ST - MeguisPet

## 🎯 Objetivo

Implementar um sistema completo de cálculo e gerenciamento de impostos (ICMS-ST) para produtos, com:
- Cálculo automático de impostos por produto e estado
- Gerenciamento de tabelas de MVA por UF
- Visualização de impostos nas vendas
- Pré-visualização customizável antes da geração de PDF
- Exibição opcional de informações fiscais nos pedidos

---

## 📋 Índice

1. [Exemplo de Cálculo ICMS-ST](#exemplo-de-cálculo)
2. [Arquitetura da Solução](#arquitetura)
3. [Fase 1: Banco de Dados (Supabase)](#fase-1-banco-de-dados)
4. [Fase 2: TypeScript Types](#fase-2-typescript-types)
5. [Fase 3: Services API](#fase-3-services-api)
6. [Fase 4: Utilitários de Cálculo](#fase-4-utilitários-de-cálculo)
7. [Fase 5: Componentes de UI](#fase-5-componentes-ui)
8. [Fase 6: Forms](#fase-6-forms)
9. [Fase 7: Integração com Vendas](#fase-7-integração-vendas)
10. [Fase 8: Modal de Pré-visualização](#fase-8-modal-preview)
11. [Fase 9: Geração de PDF](#fase-9-pdf)
12. [Fase 10: Testes e Validação](#fase-10-testes)

---

## 🧮 Exemplo de Cálculo ICMS-ST {#exemplo-de-cálculo}

### Dados de Entrada:
| Descrição | Valor |
|-----------|-------|
| Valor da mercadoria | R$ 1.000,00 |
| Frete + Despesas | R$ 100,00 |
| MVA | 40% (0,40) |
| Alíquota ICMS | 18% (0,18) |

### Cálculos:

1. **Base de Cálculo ST:**
   ```
   Base ST = (Valor mercadoria + Frete + Despesas) × (1 + MVA)
   Base ST = (1.000 + 100) × 1,40 = R$ 1.540,00
   ```

2. **ICMS Próprio:**
   ```
   ICMS Próprio = (Valor mercadoria + Frete + Despesas) × Alíquota ICMS
   ICMS Próprio = 1.100 × 0,18 = R$ 198,00
   ```

3. **ICMS-ST Total:**
   ```
   ICMS-ST Total = Base ST × Alíquota ICMS
   ICMS-ST Total = 1.540 × 0,18 = R$ 277,20
   ```

4. **ICMS-ST a Recolher:**
   ```
   ICMS-ST = ICMS-ST Total - ICMS Próprio
   ICMS-ST = 277,20 - 198,00 = R$ 79,20
   ```

**➡️ Valor a Recolher: R$ 79,20**

---

## 🏗️ Arquitetura da Solução {#arquitetura}

```
┌─────────────────────────────────────────────────────────────┐
│                    CAMADA DE APRESENTAÇÃO                    │
├─────────────────────────────────────────────────────────────┤
│  • Formulário de Produto (com dados fiscais)                │
│  • Tela de Vendas (com visualização de impostos)            │
│  • Modal de Pré-visualização (antes do PDF)                 │
│  • Gerador de PDF (com impostos opcionais)                  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    CAMADA DE NEGÓCIO                         │
├─────────────────────────────────────────────────────────────┤
│  • impostosService (CRUD de impostos por produto)           │
│  • tabelaMvaService (CRUD de tabela MVA por UF/NCM)         │
│  • calcularImpostos() (lógica de cálculo)                   │
│  • gerarPDFComImpostos() (PDF com opções fiscais)           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    CAMADA DE DADOS (Supabase)                │
├─────────────────────────────────────────────────────────────┤
│  • impostos_produto (config fiscal por produto)             │
│  • tabela_mva (MVA/alíquotas por UF e NCM)                  │
│  • vendas_impostos (impostos calculados por venda)          │
│  • vendas_itens (itens com impostos individuais)            │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Fase 1: Banco de Dados (Supabase) {#fase-1-banco-de-dados}

### 1.1 Criar Tabela `tabela_mva`
Armazena MVA e alíquotas por estado e NCM.

```sql
-- Tabela: tabela_mva
CREATE TABLE tabela_mva (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uf VARCHAR(2) NOT NULL,
  ncm VARCHAR(8) NOT NULL,
  descricao TEXT,
  aliquota_interna DECIMAL(5,4), -- Ex: 0.18 (18%)
  aliquota_fundo DECIMAL(5,4),   -- Ex: 0.02 (2%)
  aliquota_efetiva DECIMAL(5,4), -- Ex: 0.20 (20%)
  mva DECIMAL(6,4),              -- Ex: 0.7304 (73,04%)
  sujeito_st BOOLEAN DEFAULT true,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_uf_ncm UNIQUE (uf, ncm)
);

-- Índices para performance
CREATE INDEX idx_tabela_mva_uf ON tabela_mva(uf);
CREATE INDEX idx_tabela_mva_ncm ON tabela_mva(ncm);
CREATE INDEX idx_tabela_mva_ativo ON tabela_mva(ativo);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tabela_mva_updated_at
  BEFORE UPDATE ON tabela_mva
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 1.2 Criar Tabela `impostos_produto`
Configuração fiscal por produto.

```sql
-- Tabela: impostos_produto
CREATE TABLE impostos_produto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  ncm VARCHAR(8),
  cest VARCHAR(7),
  origem_mercadoria INTEGER DEFAULT 0, -- 0=Nacional, 1=Estrangeira
  uf_destino VARCHAR(2) DEFAULT 'SP', -- UF padrão para cálculo

  -- Relacionamento com tabela MVA
  tabela_mva_id UUID REFERENCES tabela_mva(id),

  -- Override manual (opcional - se não quiser usar tabela_mva)
  mva_manual DECIMAL(6,4),
  aliquota_icms_manual DECIMAL(5,4),

  -- Valores adicionais
  frete_padrao DECIMAL(10,2) DEFAULT 0,
  outras_despesas DECIMAL(10,2) DEFAULT 0,

  -- Controle
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_produto_impostos UNIQUE (produto_id)
);

-- Índices
CREATE INDEX idx_impostos_produto_produto_id ON impostos_produto(produto_id);
CREATE INDEX idx_impostos_produto_ncm ON impostos_produto(ncm);
CREATE INDEX idx_impostos_produto_uf_destino ON impostos_produto(uf_destino);

-- Trigger updated_at
CREATE TRIGGER update_impostos_produto_updated_at
  BEFORE UPDATE ON impostos_produto
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 1.3 Criar Tabela `vendas_impostos`
Armazena impostos calculados por venda (total consolidado).

```sql
-- Tabela: vendas_impostos
CREATE TABLE vendas_impostos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_id INTEGER NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,

  -- Valores totais da venda
  valor_produtos DECIMAL(10,2) NOT NULL,
  valor_frete DECIMAL(10,2) DEFAULT 0,
  outras_despesas DECIMAL(10,2) DEFAULT 0,

  -- Totalizadores de impostos
  total_base_calculo_st DECIMAL(10,2) DEFAULT 0,
  total_icms_proprio DECIMAL(10,2) DEFAULT 0,
  total_icms_st DECIMAL(10,2) DEFAULT 0,
  total_icms_recolher DECIMAL(10,2) DEFAULT 0,

  -- Opções de exibição no PDF
  exibir_no_pdf BOOLEAN DEFAULT true,
  exibir_detalhamento BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_venda_impostos UNIQUE (venda_id)
);

-- Índice
CREATE INDEX idx_vendas_impostos_venda_id ON vendas_impostos(venda_id);

-- Trigger updated_at
CREATE TRIGGER update_vendas_impostos_updated_at
  BEFORE UPDATE ON vendas_impostos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 1.4 Adicionar Colunas em `vendas_itens`
Adicionar campos de impostos por item da venda.

```sql
-- Adicionar colunas em vendas_itens
ALTER TABLE vendas_itens
  ADD COLUMN base_calculo_st DECIMAL(10,2),
  ADD COLUMN icms_proprio DECIMAL(10,2),
  ADD COLUMN icms_st_total DECIMAL(10,2),
  ADD COLUMN icms_st_recolher DECIMAL(10,2),
  ADD COLUMN mva_aplicado DECIMAL(6,4),
  ADD COLUMN aliquota_icms DECIMAL(5,4);

-- Índice para consultas
CREATE INDEX idx_vendas_itens_venda_id ON vendas_itens(venda_id);
```

### 1.5 Popular Tabela MVA (Script de Seed)
```sql
-- Seed: Popular tabela_mva com dados da planilha
INSERT INTO tabela_mva (uf, ncm, descricao, aliquota_interna, aliquota_fundo, aliquota_efetiva, mva, sujeito_st)
VALUES
  ('AC', '2309', 'Ração tipo "pet" para animais domésticos', 0.19, NULL, NULL, 0.7304, true),
  ('AL', '2309', 'Ração tipo "pet" para animais domésticos', 0.19, 0.01, 0.20, 0.752, true),
  ('AM', '2309', 'Ração tipo "pet" para animais domésticos', 0.20, NULL, NULL, 0.752, true),
  ('AP', '2309', 'Ração tipo "pet" para animais domésticos', 0.18, NULL, NULL, 0.7093, true),
  ('BA', '2309', 'Não sujeito a ST nesta UF', NULL, NULL, NULL, NULL, false),
  ('CE', '2309', 'Rações tipo "pet" para animais domésticos', 0.20, 0.02, 0.22, 1.043, true),
  ('DF', '2309', 'Ração tipo "pet" para animais domésticos', 0.20, NULL, NULL, 0.752, true),
  ('ES', '2309', 'Ração tipo "pet" para animais domésticos', 0.17, NULL, NULL, 0.6887, true),
  ('GO', '2309', 'Não sujeito a ST nesta UF', NULL, NULL, NULL, NULL, false),
  ('MA', '2309', 'Ração tipo "pet" para animais domésticos', 0.23, 0.02, 0.25, 0.8688, true),
  ('MG', '2309', 'Ração tipo "pet" para animais domésticos', 0.18, NULL, NULL, 0.7093, true),
  ('MS', '2309', 'Ração tipo', 0.17, NULL, NULL, 0.6887, true),
  ('MT', '2309', 'Ração tipo "pet" para animais domésticos', 0.17, NULL, NULL, 0.5328, true),
  ('PA', '2309', 'Rações tipo "pet" para animais domésticos', 0.19, NULL, NULL, 0.7304, true),
  ('PB', '2309', 'Ração tipo "pet" para animais domésticos', 0.20, NULL, NULL, 0.752, true),
  ('PE', '2309', 'Ração tipo "pet" para animais domésticos', 0.205, NULL, NULL, 0.763, true),
  ('PI', '2309', 'Ração tipo "pet" para animais domésticos', 0.225, NULL, NULL, 0.8085, true),
  ('PR', '2309', 'Rações tipo "pet" para animais domésticos', 0.195, NULL, NULL, 0.7411, true),
  ('RJ', '2309', 'Ração tipo "pet" para animais domésticos', 0.20, 0.02, 0.22, 0.7969, true),
  ('RN', '2309', 'Não sujeito a ST nesta UF', NULL, NULL, NULL, NULL, false),
  ('RO', '2309', 'Não sujeito a ST nesta UF', NULL, NULL, NULL, NULL, false),
  ('RR', '2309', 'Rações tipo Pet para animais domésticos', 0.20, NULL, NULL, 0.752, true),
  ('RS', '2309', 'Rações tipo "pet" para animais domésticos', 0.17, NULL, NULL, 0.9926, true),
  ('SC', '2309', 'Não sujeito a ST nesta UF', NULL, NULL, NULL, NULL, false),
  ('SE', '2309', 'Rações tipo "pet" para animais domésticos', 0.19, 0.02, 0.21, 0.7742, true),
  ('SP', '2309', 'Ração tipo "pet" para animais domésticos', 0.18, NULL, NULL, 0.8363, true),
  ('TO', '2309', 'Ração tipo "pet" para animais domésticos', 0.20, NULL, NULL, 0.752, true);
```

### 1.6 Row Level Security (RLS)
```sql
-- Habilitar RLS
ALTER TABLE tabela_mva ENABLE ROW LEVEL SECURITY;
ALTER TABLE impostos_produto ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendas_impostos ENABLE ROW LEVEL SECURITY;

-- Policies: Permitir leitura para autenticados
CREATE POLICY "Allow read tabela_mva" ON tabela_mva
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all impostos_produto" ON impostos_produto
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all vendas_impostos" ON vendas_impostos
  FOR ALL USING (auth.role() = 'authenticated');
```

---

## 🏷️ Fase 2: TypeScript Types {#fase-2-typescript-types}

### 2.1 Arquivo: `types/index.ts`
Adicionar as seguintes interfaces:

```typescript
// ====== TIPOS PARA SISTEMA DE ICMS-ST ======

export interface TabelaMva {
  id: string // UUID
  uf: string // 'SP', 'RJ', etc
  ncm: string // '2309'
  descricao: string | null
  aliquota_interna: number | null // 0.18 (18%)
  aliquota_fundo: number | null // 0.02 (2%)
  aliquota_efetiva: number | null // 0.20 (20%)
  mva: number | null // 0.7304 (73,04%)
  sujeito_st: boolean
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface TabelaMvaForm {
  uf: string
  ncm: string
  descricao?: string
  aliquota_interna?: number
  aliquota_fundo?: number
  aliquota_efetiva?: number
  mva?: number
  sujeito_st: boolean
  ativo: boolean
}

export interface ImpostoProduto {
  id: string // UUID
  produto_id: number
  ncm: string | null
  cest: string | null
  origem_mercadoria: number // 0=Nacional, 1=Estrangeira
  uf_destino: string // 'SP'
  tabela_mva_id: string | null // UUID
  mva_manual: number | null
  aliquota_icms_manual: number | null
  frete_padrao: number
  outras_despesas: number
  ativo: boolean
  created_at: string
  updated_at: string

  // Relações
  tabela_mva?: TabelaMva | null
  produto?: Produto
}

export interface ImpostoProdutoForm {
  produto_id: number
  ncm?: string
  cest?: string
  origem_mercadoria: number
  uf_destino: string
  tabela_mva_id?: string | null
  mva_manual?: number | null
  aliquota_icms_manual?: number | null
  frete_padrao: number
  outras_despesas: number
  ativo: boolean
}

export interface VendaImposto {
  id: string // UUID
  venda_id: number
  valor_produtos: number
  valor_frete: number
  outras_despesas: number
  total_base_calculo_st: number
  total_icms_proprio: number
  total_icms_st: number
  total_icms_recolher: number
  exibir_no_pdf: boolean
  exibir_detalhamento: boolean
  created_at: string
  updated_at: string
}

export interface CalculoImpostoInput {
  valor_mercadoria: number
  frete: number
  outras_despesas: number
  mva: number // Ex: 0.40 (40%)
  aliquota_icms: number // Ex: 0.18 (18%)
}

export interface CalculoImpostoResult {
  base_calculo_st: number
  icms_proprio: number
  icms_st_total: number
  icms_st_recolher: number
  mva_aplicado: number
  aliquota_icms: number
}

// Estender VendaItem com campos de impostos
export interface VendaItem {
  id: number
  venda_id: number
  produto_id: number
  quantidade: number
  preco_unitario: number
  subtotal: number
  desconto: number
  total: number

  // Novos campos de impostos
  base_calculo_st?: number
  icms_proprio?: number
  icms_st_total?: number
  icms_st_recolher?: number
  mva_aplicado?: number
  aliquota_icms?: number

  produto?: Produto
}
```

---

## 🔌 Fase 3: Services API {#fase-3-services-api}

### 3.1 Arquivo: `services/tabelaMvaService.ts`

```typescript
import { supabase } from '@/lib/supabase'
import type { TabelaMva, TabelaMvaForm, ApiResponse, PaginatedResponse } from '@/types'

export const tabelaMvaService = {
  /**
   * Listar todas as tabelas MVA com paginação
   */
  async getAll(page = 1, limit = 50): Promise<PaginatedResponse<TabelaMva>> {
    const offset = (page - 1) * limit

    const { data, error, count } = await supabase
      .from('tabela_mva')
      .select('*', { count: 'exact' })
      .eq('ativo', true)
      .order('uf', { ascending: true })
      .order('ncm', { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) throw error

    return {
      success: true,
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    }
  },

  /**
   * Buscar MVA por UF e NCM
   */
  async getByUfNcm(uf: string, ncm: string): Promise<ApiResponse<TabelaMva | null>> {
    const { data, error } = await supabase
      .from('tabela_mva')
      .select('*')
      .eq('uf', uf.toUpperCase())
      .eq('ncm', ncm)
      .eq('ativo', true)
      .single()

    if (error && error.code !== 'PGRST116') throw error // PGRST116 = not found

    return {
      success: true,
      data: data || null
    }
  },

  /**
   * Buscar por ID
   */
  async getById(id: string): Promise<ApiResponse<TabelaMva>> {
    const { data, error } = await supabase
      .from('tabela_mva')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error

    return {
      success: true,
      data
    }
  },

  /**
   * Criar nova entrada
   */
  async create(formData: TabelaMvaForm): Promise<ApiResponse<TabelaMva>> {
    const { data, error } = await supabase
      .from('tabela_mva')
      .insert(formData)
      .select()
      .single()

    if (error) throw error

    return {
      success: true,
      data,
      message: 'Tabela MVA criada com sucesso'
    }
  },

  /**
   * Atualizar entrada existente
   */
  async update(id: string, formData: Partial<TabelaMvaForm>): Promise<ApiResponse<TabelaMva>> {
    const { data, error } = await supabase
      .from('tabela_mva')
      .update(formData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return {
      success: true,
      data,
      message: 'Tabela MVA atualizada com sucesso'
    }
  },

  /**
   * Deletar (soft delete - marcar como inativo)
   */
  async delete(id: string): Promise<ApiResponse<void>> {
    const { error } = await supabase
      .from('tabela_mva')
      .update({ ativo: false })
      .eq('id', id)

    if (error) throw error

    return {
      success: true,
      message: 'Tabela MVA removida com sucesso'
    }
  }
}
```

### 3.2 Arquivo: `services/impostosService.ts`

```typescript
import { supabase } from '@/lib/supabase'
import type { ImpostoProduto, ImpostoProdutoForm, ApiResponse } from '@/types'

export const impostosService = {
  /**
   * Buscar impostos de um produto
   */
  async getByProdutoId(produtoId: number): Promise<ApiResponse<ImpostoProduto | null>> {
    const { data, error } = await supabase
      .from('impostos_produto')
      .select(`
        *,
        tabela_mva:tabela_mva_id(*),
        produto:produto_id(id, nome)
      `)
      .eq('produto_id', produtoId)
      .eq('ativo', true)
      .single()

    if (error && error.code !== 'PGRST116') throw error

    return {
      success: true,
      data: data || null
    }
  },

  /**
   * Criar configuração de impostos para produto
   */
  async create(formData: ImpostoProdutoForm): Promise<ApiResponse<ImpostoProduto>> {
    const { data, error } = await supabase
      .from('impostos_produto')
      .insert(formData)
      .select(`
        *,
        tabela_mva:tabela_mva_id(*),
        produto:produto_id(id, nome)
      `)
      .single()

    if (error) throw error

    return {
      success: true,
      data,
      message: 'Configuração fiscal criada com sucesso'
    }
  },

  /**
   * Atualizar configuração de impostos
   */
  async update(id: string, formData: Partial<ImpostoProdutoForm>): Promise<ApiResponse<ImpostoProduto>> {
    const { data, error } = await supabase
      .from('impostos_produto')
      .update(formData)
      .eq('id', id)
      .select(`
        *,
        tabela_mva:tabela_mva_id(*),
        produto:produto_id(id, nome)
      `)
      .single()

    if (error) throw error

    return {
      success: true,
      data,
      message: 'Configuração fiscal atualizada com sucesso'
    }
  },

  /**
   * Criar ou atualizar (upsert) por produto_id
   */
  async upsert(produtoId: number, formData: Omit<ImpostoProdutoForm, 'produto_id'>): Promise<ApiResponse<ImpostoProduto>> {
    const { data, error } = await supabase
      .from('impostos_produto')
      .upsert(
        { ...formData, produto_id: produtoId },
        { onConflict: 'produto_id' }
      )
      .select(`
        *,
        tabela_mva:tabela_mva_id(*),
        produto:produto_id(id, nome)
      `)
      .single()

    if (error) throw error

    return {
      success: true,
      data,
      message: 'Configuração fiscal salva com sucesso'
    }
  },

  /**
   * Deletar configuração
   */
  async delete(id: string): Promise<ApiResponse<void>> {
    const { error } = await supabase
      .from('impostos_produto')
      .update({ ativo: false })
      .eq('id', id)

    if (error) throw error

    return {
      success: true,
      message: 'Configuração fiscal removida'
    }
  }
}
```

---

## 🧮 Fase 4: Utilitários de Cálculo {#fase-4-utilitários-de-cálculo}

### 4.1 Arquivo: `lib/impostos-calculator.ts`

```typescript
import type { CalculoImpostoInput, CalculoImpostoResult } from '@/types'

/**
 * Calcula ICMS-ST completo
 */
export function calcularImpostos(input: CalculoImpostoInput): CalculoImpostoResult {
  const { valor_mercadoria, frete, outras_despesas, mva, aliquota_icms } = input

  // Base de valor
  const base_valor = valor_mercadoria + frete + outras_despesas

  // 1. Base de Cálculo ST
  const base_calculo_st = base_valor * (1 + mva)

  // 2. ICMS Próprio
  const icms_proprio = base_valor * aliquota_icms

  // 3. ICMS-ST Total
  const icms_st_total = base_calculo_st * aliquota_icms

  // 4. ICMS-ST a Recolher
  const icms_st_recolher = icms_st_total - icms_proprio

  return {
    base_calculo_st: Number(base_calculo_st.toFixed(2)),
    icms_proprio: Number(icms_proprio.toFixed(2)),
    icms_st_total: Number(icms_st_total.toFixed(2)),
    icms_st_recolher: Number(icms_st_recolher.toFixed(2)),
    mva_aplicado: mva,
    aliquota_icms
  }
}

/**
 * Formata MVA como percentual
 */
export function formatarMva(mva: number): string {
  return `${(mva * 100).toFixed(2)}%`
}

/**
 * Formata alíquota como percentual
 */
export function formatarAliquota(aliquota: number): string {
  return `${(aliquota * 100).toFixed(2)}%`
}

/**
 * Valida se produto está sujeito a ST
 */
export function isSujeitoST(uf: string, ncm: string, tabelaMva: any): boolean {
  return tabelaMva?.sujeito_st === true
}
```

---

## 🎨 Fase 5: Componentes de UI {#fase-5-componentes-ui}

### 5.1 Arquivo: `components/impostos/ImpostosProdutoCard.tsx`
Card para exibir resumo de impostos de um produto.

```typescript
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { ImpostoProduto } from '@/types'
import { formatarMva, formatarAliquota } from '@/lib/impostos-calculator'

interface Props {
  imposto: ImpostoProduto | null
}

export function ImpostosProdutoCard({ imposto }: Props) {
  if (!imposto) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            Nenhuma configuração fiscal cadastrada
          </p>
        </CardContent>
      </Card>
    )
  }

  const mva = imposto.mva_manual ?? imposto.tabela_mva?.mva
  const aliquota = imposto.aliquota_icms_manual ?? imposto.tabela_mva?.aliquota_interna
  const sujeitoST = imposto.tabela_mva?.sujeito_st ?? false

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          Informações Fiscais
          {sujeitoST ? (
            <Badge variant="default">Sujeito a ST</Badge>
          ) : (
            <Badge variant="secondary">Não sujeito a ST</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">NCM</p>
            <p className="font-medium">{imposto.ncm || '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">UF Destino</p>
            <p className="font-medium">{imposto.uf_destino}</p>
          </div>
          <div>
            <p className="text-muted-foreground">MVA</p>
            <p className="font-medium">{mva ? formatarMva(mva) : '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Alíquota ICMS</p>
            <p className="font-medium">{aliquota ? formatarAliquota(aliquota) : '-'}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

### 5.2 Arquivo: `components/impostos/CalculoImpostosDisplay.tsx`
Componente para exibir resultado de cálculo de impostos.

```typescript
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import type { CalculoImpostoResult } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { formatarMva, formatarAliquota } from '@/lib/impostos-calculator'

interface Props {
  calculo: CalculoImpostoResult
  titulo?: string
}

export function CalculoImpostosDisplay({ calculo, titulo = 'Cálculo de Impostos' }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground">MVA Aplicado</p>
            <p className="font-medium">{formatarMva(calculo.mva_aplicado)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Alíquota ICMS</p>
            <p className="font-medium">{formatarAliquota(calculo.aliquota_icms)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Base de Cálculo ST</p>
            <p className="font-medium">{formatCurrency(calculo.base_calculo_st)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">ICMS Próprio</p>
            <p className="font-medium">{formatCurrency(calculo.icms_proprio)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">ICMS-ST Total</p>
            <p className="font-medium">{formatCurrency(calculo.icms_st_total)}</p>
          </div>
          <div>
            <p className="text-muted-foreground font-semibold">ICMS-ST a Recolher</p>
            <p className="font-bold text-primary">{formatCurrency(calculo.icms_st_recolher)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

---

## 📝 Fase 6: Forms {#fase-6-forms}

### 6.1 Arquivo: `components/forms/ImpostoProdutoForm.tsx`
Formulário para cadastrar/editar configuração fiscal do produto.

```typescript
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import type { ImpostoProdutoForm, TabelaMva } from '@/types'
import { tabelaMvaService } from '@/services/tabelaMvaService'
import { ESTADOS_BRASIL } from '@/lib/constants'

interface Props {
  produtoId: number
  initialData?: ImpostoProdutoForm
  onSubmit: (data: ImpostoProdutoForm) => Promise<void>
  onCancel: () => void
}

export function ImpostoProdutoForm({ produtoId, initialData, onSubmit, onCancel }: Props) {
  const [formData, setFormData] = useState<ImpostoProdutoForm>(
    initialData || {
      produto_id: produtoId,
      ncm: '',
      cest: '',
      origem_mercadoria: 0,
      uf_destino: 'SP',
      tabela_mva_id: null,
      mva_manual: null,
      aliquota_icms_manual: null,
      frete_padrao: 0,
      outras_despesas: 0,
      ativo: true
    }
  )

  const [tabelasMva, setTabelasMva] = useState<TabelaMva[]>([])
  const [loading, setLoading] = useState(false)

  // Buscar tabelas MVA quando NCM e UF mudarem
  useEffect(() => {
    if (formData.ncm && formData.uf_destino) {
      buscarTabelaMva()
    }
  }, [formData.ncm, formData.uf_destino])

  const buscarTabelaMva = async () => {
    try {
      const response = await tabelaMvaService.getByUfNcm(formData.uf_destino, formData.ncm)
      if (response.data) {
        setTabelasMva([response.data])
        setFormData(prev => ({ ...prev, tabela_mva_id: response.data!.id }))
      }
    } catch (error) {
      console.error('Erro ao buscar tabela MVA:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSubmit(formData)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* NCM */}
        <div>
          <Label htmlFor="ncm">NCM</Label>
          <Input
            id="ncm"
            value={formData.ncm || ''}
            onChange={(e) => setFormData({ ...formData, ncm: e.target.value })}
            placeholder="2309"
            maxLength={8}
          />
        </div>

        {/* CEST */}
        <div>
          <Label htmlFor="cest">CEST (opcional)</Label>
          <Input
            id="cest"
            value={formData.cest || ''}
            onChange={(e) => setFormData({ ...formData, cest: e.target.value })}
            placeholder="0100100"
            maxLength={7}
          />
        </div>

        {/* UF Destino */}
        <div>
          <Label htmlFor="uf_destino">UF Destino</Label>
          <Select
            value={formData.uf_destino}
            onValueChange={(value) => setFormData({ ...formData, uf_destino: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ESTADOS_BRASIL.map(uf => (
                <SelectItem key={uf} value={uf}>{uf}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Origem Mercadoria */}
        <div>
          <Label htmlFor="origem">Origem</Label>
          <Select
            value={String(formData.origem_mercadoria)}
            onValueChange={(value) => setFormData({ ...formData, origem_mercadoria: Number(value) })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Nacional</SelectItem>
              <SelectItem value="1">Estrangeira - Importação direta</SelectItem>
              <SelectItem value="2">Estrangeira - Adquirida no mercado interno</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* MVA Manual (override) */}
        <div>
          <Label htmlFor="mva_manual">MVA Manual (opcional)</Label>
          <Input
            id="mva_manual"
            type="number"
            step="0.0001"
            value={formData.mva_manual || ''}
            onChange={(e) => setFormData({ ...formData, mva_manual: e.target.value ? Number(e.target.value) : null })}
            placeholder="0.40 (40%)"
          />
        </div>

        {/* Alíquota Manual (override) */}
        <div>
          <Label htmlFor="aliquota_manual">Alíquota ICMS Manual (opcional)</Label>
          <Input
            id="aliquota_manual"
            type="number"
            step="0.0001"
            value={formData.aliquota_icms_manual || ''}
            onChange={(e) => setFormData({ ...formData, aliquota_icms_manual: e.target.value ? Number(e.target.value) : null })}
            placeholder="0.18 (18%)"
          />
        </div>

        {/* Frete Padrão */}
        <div>
          <Label htmlFor="frete">Frete Padrão</Label>
          <Input
            id="frete"
            type="number"
            step="0.01"
            value={formData.frete_padrao}
            onChange={(e) => setFormData({ ...formData, frete_padrao: Number(e.target.value) })}
          />
        </div>

        {/* Outras Despesas */}
        <div>
          <Label htmlFor="despesas">Outras Despesas</Label>
          <Input
            id="despesas"
            type="number"
            step="0.01"
            value={formData.outras_despesas}
            onChange={(e) => setFormData({ ...formData, outras_despesas: Number(e.target.value) })}
          />
        </div>
      </div>

      {/* Ativo */}
      <div className="flex items-center gap-2">
        <Switch
          checked={formData.ativo}
          onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
        />
        <Label>Ativo</Label>
      </div>

      {/* Ações */}
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </form>
  )
}
```

---

## 🛒 Fase 7: Integração com Vendas {#fase-7-integração-vendas}

### 7.1 Atualizar `services/vendasService.ts`
Adicionar cálculo de impostos ao criar venda.

```typescript
// Adicionar ao vendasService existente

/**
 * Calcular impostos para itens da venda
 */
async calcularImpostosVenda(vendaId: number, itens: VendaItem[]): Promise<void> {
  const impostosCalculados = []

  for (const item of itens) {
    // Buscar config fiscal do produto
    const { data: imposto } = await impostosService.getByProdutoId(item.produto_id)

    if (!imposto) continue

    const mva = imposto.mva_manual ?? imposto.tabela_mva?.mva ?? 0
    const aliquota = imposto.aliquota_icms_manual ?? imposto.tabela_mva?.aliquota_interna ?? 0

    // Calcular impostos do item
    const resultado = calcularImpostos({
      valor_mercadoria: item.subtotal,
      frete: imposto.frete_padrao,
      outras_despesas: imposto.outras_despesas,
      mva,
      aliquota_icms: aliquota
    })

    // Atualizar item com impostos
    await supabase
      .from('vendas_itens')
      .update({
        base_calculo_st: resultado.base_calculo_st,
        icms_proprio: resultado.icms_proprio,
        icms_st_total: resultado.icms_st_total,
        icms_st_recolher: resultado.icms_st_recolher,
        mva_aplicado: resultado.mva_aplicado,
        aliquota_icms: resultado.aliquota_icms
      })
      .eq('id', item.id)

    impostosCalculados.push(resultado)
  }

  // Calcular totais
  const totais = impostosCalculados.reduce((acc, calc) => ({
    total_base_calculo_st: acc.total_base_calculo_st + calc.base_calculo_st,
    total_icms_proprio: acc.total_icms_proprio + calc.icms_proprio,
    total_icms_st: acc.total_icms_st + calc.icms_st_total,
    total_icms_recolher: acc.total_icms_recolher + calc.icms_st_recolher
  }), {
    total_base_calculo_st: 0,
    total_icms_proprio: 0,
    total_icms_st: 0,
    total_icms_recolher: 0
  })

  // Salvar totais em vendas_impostos
  await supabase
    .from('vendas_impostos')
    .upsert({
      venda_id: vendaId,
      valor_produtos: itens.reduce((sum, item) => sum + item.subtotal, 0),
      valor_frete: 0,
      outras_despesas: 0,
      ...totais
    }, { onConflict: 'venda_id' })
}
```

---

## 👁️ Fase 8: Modal de Pré-visualização {#fase-8-modal-preview}

### 8.1 Arquivo: `components/modals/VendaPreviewModal.tsx`
Modal para visualizar e customizar informações antes de gerar PDF.

```typescript
import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Venda, VendaImposto } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { CalculoImpostosDisplay } from '@/components/impostos/CalculoImpostosDisplay'

interface Props {
  venda: Venda
  imposto: VendaImposto | null
  open: boolean
  onClose: () => void
  onConfirmPDF: (options: PDFOptions) => void
}

interface PDFOptions {
  exibirImpostos: boolean
  exibirDetalhamento: boolean
  observacoes: string
}

export function VendaPreviewModal({ venda, imposto, open, onClose, onConfirmPDF }: Props) {
  const [options, setOptions] = useState<PDFOptions>({
    exibirImpostos: imposto?.exibir_no_pdf ?? true,
    exibirDetalhamento: imposto?.exibir_detalhamento ?? false,
    observacoes: ''
  })

  const handleConfirm = () => {
    onConfirmPDF(options)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pré-visualização do Pedido #{venda.numero_venda}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações da Venda */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Cliente</p>
              <p className="font-medium">{venda.cliente?.nome}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total da Venda</p>
              <p className="font-medium text-lg">{formatCurrency(venda.total)}</p>
            </div>
          </div>

          {/* Impostos (se existirem) */}
          {imposto && (
            <CalculoImpostosDisplay
              calculo={{
                base_calculo_st: imposto.total_base_calculo_st,
                icms_proprio: imposto.total_icms_proprio,
                icms_st_total: imposto.total_icms_st,
                icms_st_recolher: imposto.total_icms_recolher,
                mva_aplicado: 0,
                aliquota_icms: 0
              }}
              titulo="Impostos Totais"
            />
          )}

          {/* Opções de Exibição */}
          <div className="space-y-3 border-t pt-4">
            <h3 className="font-medium">Opções de Exibição no PDF</h3>

            <div className="flex items-center justify-between">
              <Label htmlFor="exibir-impostos">Exibir informações fiscais</Label>
              <Switch
                id="exibir-impostos"
                checked={options.exibirImpostos}
                onCheckedChange={(checked) => setOptions({ ...options, exibirImpostos: checked })}
              />
            </div>

            {options.exibirImpostos && (
              <div className="flex items-center justify-between pl-4">
                <Label htmlFor="exibir-detalhamento">Exibir detalhamento completo</Label>
                <Switch
                  id="exibir-detalhamento"
                  checked={options.exibirDetalhamento}
                  onCheckedChange={(checked) => setOptions({ ...options, exibirDetalhamento: checked })}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações adicionais</Label>
              <Textarea
                id="observacoes"
                value={options.observacoes}
                onChange={(e) => setOptions({ ...options, observacoes: e.target.value })}
                placeholder="Digite observações que aparecerão no PDF..."
                rows={3}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm}>
            Gerar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

### 8.2 Adicionar ao `store/modal.ts`
```typescript
// Adicionar ao ModalData union type
| { id: 'venda-preview'; venda: Venda; imposto: VendaImposto | null }
```

---

## 📄 Fase 9: Geração de PDF {#fase-9-pdf}

### 9.1 Atualizar `lib/pdf-generator.ts`
Adicionar impostos ao PDF de pedido.

```typescript
// Adicionar ao gerarPDFPedido existente

export async function gerarPDFPedido(
  venda: Venda,
  options: {
    exibirImpostos: boolean
    exibirDetalhamento: boolean
    observacoes?: string
  }
) {
  const doc = new jsPDF()

  // ... código existente de cabeçalho, cliente, itens ...

  // SEÇÃO DE IMPOSTOS (se exibirImpostos = true)
  if (options.exibirImpostos && venda.impostos) {
    const impostos = venda.impostos
    let y = 150 // Ajustar posição conforme layout

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Informações Fiscais', 14, y)
    y += 8

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')

    if (options.exibirDetalhamento) {
      // Exibir detalhamento completo
      doc.text(`Base de Cálculo ST: ${formatCurrency(impostos.total_base_calculo_st)}`, 14, y)
      y += 6
      doc.text(`ICMS Próprio: ${formatCurrency(impostos.total_icms_proprio)}`, 14, y)
      y += 6
      doc.text(`ICMS-ST Total: ${formatCurrency(impostos.total_icms_st)}`, 14, y)
      y += 6
    }

    // Sempre exibir valor a recolher
    doc.setFont('helvetica', 'bold')
    doc.text(`ICMS-ST a Recolher: ${formatCurrency(impostos.total_icms_recolher)}`, 14, y)
    y += 10
  }

  // Observações
  if (options.observacoes) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'italic')
    doc.text('Observações:', 14, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    const linhas = doc.splitTextToSize(options.observacoes, 180)
    doc.text(linhas, 14, y)
  }

  doc.save(`pedido-${venda.numero_venda}.pdf`)
}
```

---

## ✅ Fase 10: Testes e Validação {#fase-10-testes}

### 10.1 Checklist de Validação

**Banco de Dados:**
- [ ] Tabelas criadas no Supabase
- [ ] Seed de tabela_mva executado com sucesso
- [ ] RLS policies configuradas
- [ ] Relacionamentos funcionando (FK constraints)

**Services:**
- [ ] tabelaMvaService.getByUfNcm() retorna MVA correto
- [ ] impostosService.getByProdutoId() retorna config fiscal
- [ ] Upsert de impostos_produto funciona

**Cálculos:**
- [ ] calcularImpostos() gera valores corretos (validar com exemplo do topo)
- [ ] Valores arredondados em 2 casas decimais
- [ ] MVA e alíquotas aplicados corretamente

**Formulários:**
- [ ] ImpostoProdutoForm salva dados
- [ ] Auto-complete de tabela MVA ao digitar NCM + UF
- [ ] Validação de campos obrigatórios

**Vendas:**
- [ ] Ao criar venda, impostos são calculados automaticamente
- [ ] vendas_itens recebe campos de impostos
- [ ] vendas_impostos totaliza corretamente

**Modal Preview:**
- [ ] Modal abre antes de gerar PDF
- [ ] Switches de exibição funcionam
- [ ] Observações são salvas

**PDF:**
- [ ] PDF gerado com impostos quando exibirImpostos=true
- [ ] Detalhamento aparece quando exibirDetalhamento=true
- [ ] Observações aparecem no final

---

## 📌 Dependências do Projeto

### Bibliotecas necessárias (já instaladas):
- ✅ `@supabase/supabase-js` - Client Supabase
- ✅ `jspdf` - Geração de PDF
- ✅ `jspdf-autotable` - Tabelas no PDF
- ✅ `zustand` - State management

### Constantes a criar:

**Arquivo: `lib/constants.ts`**
```typescript
export const ESTADOS_BRASIL = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
]
```

---

## 🚀 Ordem de Implementação Recomendada

### Sprint 1: Fundação (2-3 dias)
1. ✅ Criar tabelas no Supabase
2. ✅ Executar seed de tabela_mva
3. ✅ Criar types TypeScript
4. ✅ Criar services (tabelaMvaService, impostosService)
5. ✅ Criar lib/impostos-calculator.ts

### Sprint 2: UI Básica (2-3 dias)
6. ✅ Criar componentes de exibição (ImpostosProdutoCard, CalculoImpostosDisplay)
7. ✅ Criar ImpostoProdutoForm
8. ✅ Integrar form com cadastro de produto

### Sprint 3: Vendas (2-3 dias)
9. ✅ Atualizar vendasService com cálculo de impostos
10. ✅ Testar cálculo automático ao criar venda
11. ✅ Validar cálculos com planilha de referência

### Sprint 4: Preview e PDF (2-3 dias)
12. ✅ Criar VendaPreviewModal
13. ✅ Integrar modal ao fluxo de vendas
14. ✅ Atualizar geração de PDF com impostos
15. ✅ Testes finais

**Tempo estimado total: 8-12 dias de desenvolvimento**

---

## 📞 Suporte e Referências

### Documentação Fiscal:
- SEFAZ SP: https://portal.fazenda.sp.gov.br/
- Tabela NCM: https://portalunico.siscomex.gov.br/

### Arquivos de Referência:
- `aliquotas_racao_pet.xlsx` - Tabela de MVA por estado
- Legislação estadual de ICMS-ST

---

**IMPORTANTE:** Este plano segue a arquitetura do projeto MeguisPet (Next.js 15, Supabase, TypeScript, Zustand). Todos os componentes usam os padrões já estabelecidos no projeto.

**Próximo passo:** Revisar este plano e dar aprovação para iniciar implementação. 🚀
