# Feature: Filtro de Compras de Mercadorias no DRE

**Data:** 07/01/2025
**Tipo:** Feature
**Status:** ✅ Implementado

## Visão Geral

Adicionado filtro no relatório financeiro para **ocultar** transações da categoria "Compras de Mercadorias" do DRE (Demonstração do Resultado do Exercício). Por padrão, essas transações são ocultadas porque representam custo de produto, não despesa operacional.

## Motivação

### Problema
Compras de mercadorias apareciam nas **Deduções** e **Despesas** do DRE, mas isso está conceitualmente errado:

- ❌ **Compras de Mercadorias** ≠ Despesa Operacional
- ✅ **Compras de Mercadorias** = Custo de Produto

### Estrutura Correta do DRE

```
Receita Bruta (vendas)
  (-) Deduções (despesas operacionais)     <- NÃO incluir compras de mercadorias
= Receita Líquida
  (-) Custo dos Produtos                   <- Compras de mercadorias vão aqui
= Lucro Bruto
= Lucro Líquido
```

### Solução
Permitir que o usuário escolha se quer incluir ou não essas transações no DRE, com **padrão OCULTAR**.

## Implementação

### 1. Tipos TypeScript

**Arquivo:** `types/reports.ts`

Adicionado campo nos filtros financeiros:

```typescript
export interface ReportFilters {
  // ... outros filtros

  // Filtros financeiros
  tipoTransacao?: 'receita' | 'despesa' | 'todas'
  categoriaIds?: number[]
  ocultarComprasMercadorias?: boolean // Oculta categoria "Compras de Mercadorias" do DRE (padrão: true)
}
```

### 2. Frontend - Checkbox no Filtro

**Arquivo:** `components/reports/FilterPanel.tsx`

Adicionado checkbox na seção de filtros financeiros:

```tsx
<div className="space-y-2">
  <label className="flex items-start gap-3 cursor-pointer">
    <input
      type="checkbox"
      checked={filters.ocultarComprasMercadorias !== false}
      onChange={(e) => {
        onChange({
          ...filters,
          ocultarComprasMercadorias: e.target.checked,
        })
      }}
    />
    <div>
      <div className="text-sm font-medium">Ocultar Compras de Mercadorias</div>
      <div className="text-xs text-muted-foreground">
        Não incluir "Compras de Mercadorias" nas despesas e deduções do DRE
      </div>
    </div>
  </label>
</div>
```

**Comportamento:**
- ✅ **Marcado (padrão)**: Oculta compras de mercadorias
- ⬜ **Desmarcado**: Mostra todas as despesas (incluindo compras)

### 3. Backend - Filtro de Transações

**Arquivo:** `pages/api/relatorios/financeiro/preview.ts` (linhas 46-62)

Aplicado filtro antes de processar os dados:

```typescript
// 2. Filtrar transações (ocultar Compras de Mercadorias por padrão)
const ocultarComprasMercadorias = config.filtros.ocultarComprasMercadorias !== false // padrão true

const transacoesFiltradas = (transacoes || []).filter(t => {
  if (!ocultarComprasMercadorias) return true // Mostrar tudo se filtro desativado

  // Ocultar se for categoria "Compras de Mercadorias"
  const categoria = t.categoria_detalhe?.nome || t.categoria || ''
  const isCompraMercadoria = categoria.toLowerCase().includes('compra') &&
                             categoria.toLowerCase().includes('mercadoria')

  return !isCompraMercadoria
})

// 3. Calcular totais (usando transações filtradas)
const receitas = transacoesFiltradas.filter(t => t.tipo === 'receita')
const despesas = transacoesFiltradas.filter(t => t.tipo === 'despesa')
```

**Lógica de Detecção:**
- Busca categoria que contenha "compra" E "mercadoria" (case-insensitive)
- Exemplos que serão filtrados:
  - "Compras de Mercadorias"
  - "Compra de Mercadoria"
  - "COMPRAS MERCADORIAS"

### 4. Aplicação do Filtro

O filtro é aplicado em **TODAS** as partes do relatório:

1. ✅ **DRE**: Receita Bruta, Deduções, Lucro
2. ✅ **Receitas por Mês**: Gráfico temporal
3. ✅ **Receitas por Categoria**: Distribuição percentual
4. ✅ **Despesas por Categoria**: Distribuição percentual
5. ✅ **Receitas Detalhadas**: Tabela de transações
6. ✅ **Despesas Detalhadas**: Tabela de transações
7. ✅ **Validação**: Comparação vendas vs receitas

### 5. Exports Automáticos

O export (`pages/api/relatorios/financeiro/export.ts`) **chama o preview**, então o filtro é automaticamente aplicado em:

- ✅ **PDF**
- ✅ **Excel**
- ✅ **CSV**

## Como Usar

### Passo a Passo

1. **Acessar Relatório Financeiro**
   - Menu → Relatórios → Relatório Financeiro

2. **Configurar Período**
   - Selecionar intervalo de datas

3. **Aplicar Filtro** (Step 2: Filtros)
   - **Checkbox marcado (padrão)**: Oculta compras de mercadorias
   - **Checkbox desmarcado**: Mostra todas as despesas

4. **Gerar Relatório**
   - O DRE será calculado conforme filtro selecionado

## Cenários de Uso

### Cenário 1: DRE Gerencial (Padrão - Recomendado)
```
Filtro: ✅ Ocultar Compras de Mercadorias (MARCADO)

DRE:
- Receita Bruta: R$ 171.138,70
- Deduções: R$ 50.000,00 (só despesas operacionais)
- Receita Líquida: R$ 121.138,70
- Custo dos Produtos: R$ 85.000,00
- Lucro Bruto: R$ 36.138,70
```

**Vantagem:** DRE correto conceitualmente.

### Cenário 2: Visão Completa (Todas Despesas)
```
Filtro: ⬜ Ocultar Compras de Mercadorias (DESMARCADO)

DRE:
- Receita Bruta: R$ 171.138,70
- Deduções: R$ 95.000,00 (todas as despesas incluindo compras)
- Receita Líquida: R$ 76.138,70
- Custo dos Produtos: R$ 85.000,00
- Lucro Bruto: -R$ 8.861,30 (incorreto)
```

**Problema:** Duplicação - compras aparecem em Deduções E Custo dos Produtos.

## Comportamento Padrão

### ✅ Padrão: Checkbox MARCADO

**Por quê?**
1. Evita duplicação de valores no DRE
2. Conceitualmente correto (compra ≠ despesa operacional)
3. Custo de produto já é calculado separadamente
4. Gera relatório financeiro mais preciso

### Quando Desmarcar?

Situações raras onde o usuário quer ver TODAS as transações:
- Auditoria completa
- Reconciliação bancária
- Análise de fluxo de caixa bruto

## Detecção de Categoria

A lógica detecta categorias que contenham **ambas** as palavras:

```typescript
const isCompraMercadoria =
  categoria.toLowerCase().includes('compra') &&
  categoria.toLowerCase().includes('mercadoria')
```

### Exemplos que Serão Filtrados

- ✅ "Compras de Mercadorias"
- ✅ "Compra de Mercadoria"
- ✅ "COMPRAS MERCADORIAS"
- ✅ "Compra Mercadoria"

### Exemplos que NÃO Serão Filtrados

- ❌ "Compras de Material" (só tem "compra")
- ❌ "Estoque de Mercadorias" (só tem "mercadoria")
- ❌ "Despesas Operacionais"
- ❌ "Salários"

## Impacto nos Cálculos

### Com Filtro Ativo (Padrão)

```typescript
// Transações totais: 100
// Compras de Mercadorias: 15
// Transações filtradas: 85

const despesaTotal = transacoesFiltradas
  .filter(t => t.tipo === 'despesa')
  .reduce((sum, t) => sum + t.valor, 0)
// Resultado: Apenas despesas operacionais
```

### Sem Filtro

```typescript
// Transações totais: 100
// Transações filtradas: 100 (todas)

const despesaTotal = transacoesFiltradas
  .filter(t => t.tipo === 'despesa')
  .reduce((sum, t) => sum + t.valor, 0)
// Resultado: Todas as despesas (incluindo compras)
```

## Arquivos Modificados

1. **`types/reports.ts`** (linha 42)
   - Adicionado campo `ocultarComprasMercadorias?: boolean`

2. **`components/reports/FilterPanel.tsx`** (linhas 305-326)
   - Adicionado checkbox no `renderFinanceiroFilters()`

3. **`pages/api/relatorios/financeiro/preview.ts`** (linhas 46-62, 130)
   - Lógica de filtro de transações
   - Aplicado em todos os cálculos

## Validação

### Antes (Sem Filtro)
- Deduções: R$ 95.000,00 (incluindo R$ 45.000,00 de compras)
- Lucro incorreto: Duplicação de custo

### Depois (Com Filtro - Padrão)
- Deduções: R$ 50.000,00 (apenas operacionais)
- Custo dos Produtos: R$ 85.000,00 (calculado dos itens de venda)
- Lucro correto: Sem duplicação ✅

## Melhorias Futuras

### 1. Categorização Mais Precisa
Permitir selecionar quais categorias excluir do DRE:
```typescript
categoriasExcluirDRE?: number[]  // IDs das categorias
```

### 2. Configuração por Tipo
Diferentes regras para diferentes tipos de despesa:
```typescript
regrasDRE: {
  custoProduto: number[]      // IDs categorias de custo
  despesaOperacional: number[] // IDs categorias operacionais
  despesaFinanceira: number[]  // IDs categorias financeiras
}
```

### 3. Templates de DRE
Diferentes estruturas de DRE pré-configuradas:
- DRE Gerencial (padrão)
- DRE Contábil
- DRE Simplificado

## Referências

- [Documentação de Relatórios](./relatorios.md)
- [Tipos de Filtros](../../types/reports.ts)
- [DRE - Estrutura Contábil](https://www.contabilizei.com.br/contabilidade-online/dre/)

---

**Testado em:** 07/01/2025
**Versão:** 2.0.0
**Build:** Next.js 16.0.7
**TypeScript:** ✅ Compilação limpa
**Comportamento:** ✅ Filtro aplicado em todos os formatos (Web, PDF, Excel, CSV)
