# Fix: Receita Bruta Zerada no Relatório Financeiro

**Data:** 06/01/2025
**Tipo:** Bug Fix
**Severidade:** Alta
**Status:** ✅ Resolvido

## Problema Identificado

O relatório financeiro estava mostrando **Receita Bruta (vendas) = R$ 0,00**, mesmo quando o relatório de vendas mostrava valores corretos (ex: R$ 171.138,70).

### Sintomas
- DRE (Demonstração do Resultado do Exercício) com receita bruta zerada
- Lucro bruto e líquido incorretos
- Margem de lucro zerada
- Custo dos produtos zerado

### Causa Raiz

A query de vendas no relatório financeiro tentava acessar colunas que **não existem** na tabela `vendas`:

```typescript
// ❌ INCORRETO - coluna custo_total não existe
.select('valor_final, custo_total')
```

**Erro retornado:**
```
{
  code: '42703',
  message: 'column vendas.custo_total does not exist'
}
```

Além disso, havia dois problemas adicionais:

1. **Filtro de data incorreto**: Usava `.lte(endDate)` em vez de `.lt(endDateAdjusted)`, perdendo vendas do último dia
2. **Falta de tratamento de erro**: A query falhava silenciosamente, não lançando exceção visível

## Solução Implementada

### 1. Query Corrigida

Arquivo: `pages/api/relatorios/financeiro/preview.ts`

**Antes:**
```typescript
const { data: vendas } = await supabase
  .from('vendas')
  .select('valor_final, custo_total')  // ❌ custo_total não existe
  .gte('data_venda', startDate)
  .lte('data_venda', endDate)  // ❌ perde último dia
```

**Depois:**
```typescript
const { data: vendas, error: vendasError } = await supabase
  .from('vendas')
  .select(`
    valor_final,
    total_ipi,
    total_st,
    total_produtos_liquido,
    itens:vendas_itens(
      quantidade,
      produto:produtos(preco_custo)
    )
  `)
  .gte('data_venda', startDate)
  .lt('data_venda', endDateAdjusted)  // ✅ inclui todo o último dia

if (vendasError) {
  console.error('Erro ao buscar vendas:', vendasError)
  throw vendasError
}
```

### 2. Cálculo de Faturamento Corrigido

Agora usa o **mesmo cálculo** do relatório de vendas:

```typescript
// IMPORTANTE: Faturamento SEM impostos (impostos são pagos pelo cliente)
const faturamentoVendas = (vendas || []).reduce((sum, v) => {
  // Prioriza total_produtos_liquido, senão calcula valor_final - impostos
  const faturamentoVenda = v.total_produtos_liquido ||
    (v.valor_final - (v.total_ipi || 0) - (v.total_st || 0))
  return sum + faturamentoVenda
}, 0)
```

### 3. Cálculo de Custo Corrigido

O custo total é **calculado** a partir dos itens de cada venda:

```typescript
// Custo total dos produtos vendidos (calcular a partir dos itens)
let custoProdutos = 0
;(vendas || []).forEach(venda => {
  if (venda.itens) {
    venda.itens.forEach((item: any) => {
      const produto = Array.isArray(item.produto) ? item.produto[0] : item.produto
      const precoCusto = produto?.preco_custo || 0
      custoProdutos += precoCusto * item.quantidade
    })
  }
})
```

### 4. Ajuste de Data

Adiciona 1 dia à data final para incluir todo o último dia do período:

```typescript
const endDatePlusOne = new Date(endDate)
endDatePlusOne.setDate(endDatePlusOne.getDate() + 1)
const endDateAdjusted = endDatePlusOne.toISOString().split('T')[0]
```

## Validação

### Antes da Correção
- Receita Bruta: **R$ 0,00** ❌
- Custo dos Produtos: **R$ 0,00** ❌
- Lucro Líquido: **Negativo** (só deduções) ❌

### Depois da Correção
- Receita Bruta: **R$ 171.138,70** ✅
- Custo dos Produtos: **Calculado corretamente** ✅
- Lucro Líquido: **Correto** ✅
- **Valores batem** com relatório de vendas ✅

## Arquivos Modificados

1. `pages/api/relatorios/financeiro/preview.ts` (linhas 28-92)
   - Ajuste de data (endDateAdjusted)
   - Query corrigida com joins
   - Cálculo de faturamento sem impostos
   - Cálculo de custo a partir dos itens
   - Tratamento de erros

## Lições Aprendidas

### 1. Estrutura de Dados
- A coluna `custo_total` **não existe** na tabela `vendas`
- O custo deve ser **calculado** a partir de `vendas_itens` → `produtos.preco_custo`
- Sempre verificar schema antes de assumir colunas

### 2. Filtros de Data
- `.lte('2024-12-31')` pega até **00:00:00** do dia 31 (perde o dia inteiro)
- `.lt('2025-01-01')` pega até **23:59:59** do dia 31 (correto)
- Sempre adicionar +1 dia e usar `.lt()` para períodos

### 3. Tratamento de Erros
- Sempre capturar `error` em queries Supabase
- Sem tratamento, erros falham silenciosamente
- Adicionar `console.error()` e `throw` para debugging

### 4. Consistência entre Relatórios
- Relatório financeiro e de vendas devem usar **mesma lógica de cálculo**
- Faturamento sem impostos (IPI e ST são do cliente)
- Reutilizar código quando possível

## Referências

- [Relatório de Vendas - Preview](../../pages/api/relatorios/vendas/preview.ts) (linhas 134-156)
- [Schema da Tabela Vendas](../../database/schema.sql)
- [Documentação Supabase - Relacionamentos](https://supabase.com/docs/guides/database/joins-and-nesting)

## Impacto

- ✅ Relatório financeiro agora funcional
- ✅ DRE com valores corretos
- ✅ Validação vendas vs receitas operacional
- ✅ Margem de lucro calculada corretamente
- ✅ Consistência entre relatórios de vendas e financeiro

---

**Testado em:** 06/01/2025
**Versão:** 2.0.0
**Build:** Next.js 16.0.7
**TypeScript:** ✅ Sem erros de compilação
