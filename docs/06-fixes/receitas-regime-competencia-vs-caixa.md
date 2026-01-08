# Fix: Receitas - Regime de Competência vs Caixa

**Data:** 07/01/2025
**Tipo:** Bug Fix Crítico
**Severidade:** Alta
**Status:** ✅ Resolvido

## Problema Identificado

O relatório financeiro estava mostrando **receitas no regime de caixa** (parcelas recebidas) quando deveria mostrar **vendas no regime de competência** (vendas realizadas).

### Sintomas
- "Receita Total" mostrava R$ 125.736,63 (parcelas recebidas)
- Deveria mostrar R$ 171.138,70 (vendas realizadas)
- Tabela "Receitas do Período" mostrava transações de parcelas
- Deveria mostrar vendas do período

### Exemplo do Problema

```
Cenário: Venda de R$ 1.000 em 3 parcelas de R$ 333,33

Sistema ANTES (Regime de Caixa):
- Se recebeu 1 parcela: Receita = R$ 333,33 ❌
- Mostra: "Receita Venda 20251202-4045 - Parcela 1/1"

Sistema CORRETO (Regime de Competência):
- Venda realizada: Receita = R$ 1.000,00 ✅
- Mostra: "Venda 20251202 - Cliente XPTO"
```

## Causa Raiz

O código buscava **transações de receita** (parcelas recebidas) em vez de **vendas**:

```typescript
// ❌ ERRADO - Regime de Caixa (parcelas)
const receitas = transacoes.filter(t => t.tipo === 'receita')
const receitaTotal = receitas.reduce((sum, t) => sum + t.valor, 0)
```

Isso causava:
1. Receita total incorreta (parcelas ≠ vendas)
2. Vendas parceladas subcontadas
3. DRE com valores errados
4. Gráficos e distribuições incorretos

## Conceitos Contábeis

### Regime de Caixa
- Registra quando o **dinheiro entra/sai**
- Exemplo: 3 parcelas de R$ 333,33 nos dias 10, 20 e 30
- Total no mês: R$ 999,99

### Regime de Competência (Correto para DRE)
- Registra quando a **venda/despesa ocorre**
- Exemplo: Venda de R$ 1.000 no dia 5
- Total no mês: R$ 1.000,00 (independente de quando recebe)

**Para DRE, usa-se SEMPRE regime de competência!**

## Solução Implementada

### 1. Receita Total no Resumo

**Arquivo:** `pages/api/relatorios/financeiro/preview.ts` (linha 240)

**Antes:**
```typescript
receitaTotal: parseFloat(receitaTotal.toFixed(2)), // Parcelas recebidas ❌
```

**Depois:**
```typescript
receitaTotal: parseFloat(faturamentoVendas.toFixed(2)), // Vendas realizadas ✅
```

### 2. Receitas Detalhadas (Tabela)

**Arquivo:** `pages/api/relatorios/financeiro/preview.ts` (linhas 184-219)

**Antes:**
```typescript
// ❌ Mostrava transações de receita (parcelas)
const receitasDetalhadas = receitas.map(t => ({
  id: t.id,
  data: t.data_transacao,
  descricao: t.descricao, // "Receita Venda 20251202-4045 - Parcela 1/1"
  categoria: t.categoria,
  valor: t.valor
}))
```

**Depois:**
```typescript
// ✅ Busca e mostra vendas do período
const { data: vendasDetalhadas } = await supabase
  .from('vendas')
  .select(`
    id,
    numero_venda,
    data_venda,
    valor_final,
    total_produtos_liquido,
    total_ipi,
    total_st,
    cliente:clientes_fornecedores(nome)
  `)
  .gte('data_venda', startDate)
  .lt('data_venda', endDateAdjusted)

const receitasDetalhadas = (vendasDetalhadas || []).map(v => {
  const cliente = Array.isArray(v.cliente) ? v.cliente[0] : v.cliente
  const faturamento = v.total_produtos_liquido ||
    (v.valor_final - (v.total_ipi || 0) - (v.total_st || 0))

  return {
    id: v.id,
    data: v.data_venda,
    descricao: `Venda ${v.numero_venda || v.id} - ${cliente?.nome || 'Cliente não informado'}`,
    categoria: 'Vendas',
    valor: parseFloat(faturamento.toFixed(2)),
    tipo: 'receita'
  }
})
```

### 3. Receitas por Mês

**Arquivo:** `pages/api/relatorios/financeiro/preview.ts` (linhas 127-143)

**Antes:**
```typescript
// ❌ Usava transações de receita (parcelas)
transacoesFiltradas.forEach(t => {
  if (t.tipo === 'receita') {
    receitasPorMesMap[mesKey].receita += t.valor
  }
})
```

**Depois:**
```typescript
// ✅ Usa vendas do período
;(vendas || []).forEach(v => {
  const data = new Date(v.data_venda)
  const mesKey = /* ... */

  const faturamento = v.total_produtos_liquido ||
    (v.valor_final - (v.total_ipi || 0) - (v.total_st || 0))

  receitasPorMesMap[mesKey].receita += faturamento
})
```

### 4. Receitas por Categoria

**Arquivo:** `pages/api/relatorios/financeiro/preview.ts` (linhas 164-175)

**Antes:**
```typescript
// ❌ Múltiplas categorias de transações de receita
receitas.forEach(t => {
  const categoria = t.categoria_detalhe?.nome
  receitasPorCategoriaMap[categoria] += t.valor
})
// Resultado: "Venda Parcela 1/3", "Venda Parcela 2/3", etc.
```

**Depois:**
```typescript
// ✅ Uma única categoria: Vendas
const receitasPorCategoriaMap: Record<string, number> = {
  'Vendas': faturamentoVendas
}
// Resultado: 100% "Vendas"
```

## Validação

### Antes da Correção
```
Receita Total: R$ 125.736,63  ❌ (só 19 parcelas recebidas)
Tabela: 19 transações de parcelas
Categoria: Várias categorias de "Receita Venda"
```

### Depois da Correção
```
Receita Total: R$ 171.138,70  ✅ (todas as vendas do período)
Tabela: Todas as vendas realizadas
Categoria: "Vendas" (100%)
```

### Comparação com Relatório de Vendas
```
Relatório de Vendas: R$ 171.138,70
Relatório Financeiro: R$ 171.138,70
Diferença: R$ 0,00  ✅ BATE!
```

## Impacto nos Cálculos

### DRE (Demonstração do Resultado do Exercício)

**Antes:**
```
Receita Bruta: R$ 125.736,63  ❌ (parcelas)
(-) Deduções: R$ 34.606,16
= Receita Líquida: R$ 91.130,47
(-) Custo Produtos: R$ 85.000,00
= Lucro Bruto: R$ 6.130,47  ❌ INCORRETO
```

**Depois:**
```
Receita Bruta: R$ 171.138,70  ✅ (vendas)
(-) Deduções: R$ 34.606,16
= Receita Líquida: R$ 136.532,54
(-) Custo Produtos: R$ 85.000,00
= Lucro Bruto: R$ 51.532,54  ✅ CORRETO
```

### Margem de Lucro

**Antes:**
```
Margem: 6.130 / 125.736 = 4,87%  ❌
```

**Depois:**
```
Margem: 51.532 / 171.138 = 30,11%  ✅
```

## Validação com Card de Comparação

O relatório já possui um card de validação que agora faz mais sentido:

```
Validação: Vendas vs Receitas
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Faturamento de Vendas:     R$ 171.138,70
Receitas de Transações:    R$ 125.736,63
Diferença:                 R$ 45.402,07 (receitas maiores)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Interpretação:
- Vendas parceladas ainda não totalmente recebidas
- Diferença = Parcelas a receber
```

## Arquivos Modificados

1. **`pages/api/relatorios/financeiro/preview.ts`**
   - Linha 71: Adicionado `data_venda` na query de vendas
   - Linhas 132-143: Receitas por mês usando vendas
   - Linhas 165-175: Receitas por categoria = "Vendas"
   - Linhas 185-219: Receitas detalhadas = vendas do período
   - Linha 240: Receita total = faturamento de vendas

## Conceito Contábil Aplicado

### Regime de Competência (Accrual Basis)
- **Receita**: Reconhecida quando a **venda ocorre** (não quando recebe)
- **Despesa**: Reconhecida quando a **compra ocorre** (não quando paga)
- **Usado para**: DRE, balanço patrimonial, análise de rentabilidade

### Regime de Caixa (Cash Basis)
- **Receita**: Reconhecida quando **recebe dinheiro**
- **Despesa**: Reconhecida quando **paga dinheiro**
- **Usado para**: Fluxo de caixa, conciliação bancária

**No relatório financeiro (DRE), usa-se regime de competência!**

## Diferença Visual na Interface

### Tabela "Receitas do Período"

**Antes:**
```
Data       | Descrição                                    | Categoria | Valor
-----------|----------------------------------------------|-----------|------------
09/12/2025 | Receita Venda 20251202-4045 - Parcela 1/1  | Vendas    | R$ 333,33
11/12/2025 | Receita Venda 20251211-0317                 | Vendas    | R$ 500,00
Total: 19 transações                                       R$ 125.736,63
```

**Depois:**
```
Data       | Descrição                    | Categoria | Valor
-----------|------------------------------|-----------|------------
09/12/2025 | Venda 20251202 - João Silva  | Vendas    | R$ 1.234,56
11/12/2025 | Venda 20251211 - Maria Costa | Vendas    | R$ 2.345,67
Total: Todas as vendas                                     R$ 171.138,70
```

## Melhorias Futuras

### 1. Relatório de Fluxo de Caixa Separado
Criar relatório dedicado ao regime de caixa:
- Entradas (parcelas recebidas)
- Saídas (contas pagas)
- Saldo

### 2. Reconciliação
Relatório mostrando:
- Vendas a prazo (a receber)
- Vendas recebidas
- Compras a prazo (a pagar)
- Compras pagas

### 3. Configuração de Regime
Permitir escolher entre regimes (avançado):
```typescript
regimeContabil: 'competencia' | 'caixa'
```

## Referências

- [Regime de Competência vs Caixa - CFC](https://cfc.org.br/tecnica/normas-brasileiras-de-contabilidade/)
- [DRE - Estrutura Contábil](https://www.contabilizei.com.br/contabilidade-online/dre/)
- [Princípios Contábeis](https://www.portaldecontabilidade.com.br/tematicas/principioscontabeis.htm)

---

**Testado em:** 07/01/2025
**Versão:** 2.0.0
**Build:** Next.js 16.0.7
**TypeScript:** ✅ Compilação limpa
**Validação:** ✅ Valores batem com relatório de vendas
**Impacto:** 🎯 DRE agora reflete corretamente o regime de competência
