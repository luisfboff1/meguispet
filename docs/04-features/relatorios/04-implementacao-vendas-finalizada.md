# Relatório de Vendas - Implementação Completa e Funcional ✅

**Data de Finalização:** 2025-11-14  
**Status:** 100% Funcional e Testado  
**Commits:** a24da2a, df3cb4a, b42ba7c

---

## 📋 Resumo

Este documento descreve a implementação completa e funcional do **Relatório de Vendas**, incluindo todas as correções e melhorias implementadas. Use este guia como referência para implementar os próximos relatórios (Produtos, Clientes, Financeiro).

---

## 🎯 Funcionalidades Implementadas

### 1. Filtros Funcionais
- ✅ Status da venda (pago, pendente, cancelado)
- ✅ Origem da venda (loja_fisica, mercado_livre, online)
- ✅ UF de destino (SP, RJ, MG, etc.)
- ✅ Vendedor (por ID)
- ✅ Cliente (por ID)
- ✅ Período (data inicial e final)

### 2. Métricas Selecionáveis
- ✅ Total de Vendas
- ✅ Faturamento Total
- ✅ Ticket Médio
- ✅ Total de Impostos (IPI + ST)
- ✅ Custo Total
- ✅ Margem de Lucro

### 3. Gráficos Selecionáveis
- ✅ Gráfico Temporal (vendas ao longo do tempo)
- ✅ Gráfico por Vendedor
- ✅ Gráfico por Produto (Top 10)

### 4. Tabela Top 10 Produtos
- ✅ Ranking (#)
- ✅ Nome do Produto
- ✅ Quantidade Vendida
- ✅ Preço de Custo
- ✅ Preço de Venda (médio, após descontos)
- ✅ Faturamento Total
- ✅ Margem de Lucro % (com cores)

### 5. Exportação
- ✅ PDF
- ✅ Excel
- ✅ CSV

---

## 🏗️ Arquitetura da Solução

### Estrutura de Arquivos

```
pages/api/relatorios/vendas/
├── preview.ts          # Busca e processa dados
├── generate.ts         # Gera e salva relatório
└── export.ts           # Exporta em PDF/Excel/CSV

components/reports/
├── ReportConfigWizard.tsx    # Wizard de 4 passos
├── FilterPanel.tsx           # Painel de filtros
├── MetricsSelector.tsx       # Seleção de métricas
├── VendasReportViewer.tsx    # Visualização do relatório
└── PeriodSelector.tsx        # Seleção de período

types/
└── reports.ts          # Tipos TypeScript

services/
└── reportsService.ts   # Cliente HTTP para APIs
```

---

## 🔧 Implementação Detalhada

### 1. API de Preview (`pages/api/relatorios/vendas/preview.ts`)

#### Fluxo de Dados

```typescript
1. Recebe configuração (filtros, período)
2. Busca vendas do Supabase com JOIN de:
   - clientes_fornecedores
   - vendedores
   - formas_pagamento
   - vendas_itens > produtos
3. Aplica filtros na query principal
4. Processa dados em memória
5. Retorna dados estruturados
```

#### Filtros Implementados

```typescript
// Aplicar filtros ANTES de buscar dados
let query = supabase.from('vendas').select(...)

// Status
if (config.filtros.status && config.filtros.status.length > 0) {
  query = query.in('status', config.filtros.status)
}

// Origem (IMPORTANTE: usar valores do banco!)
if (config.filtros.origem && config.filtros.origem.length > 0) {
  query = query.in('origem_venda', config.filtros.origem)
}

// UF Destino
if (config.filtros.ufDestino && config.filtros.ufDestino.length > 0) {
  query = query.in('uf_destino', config.filtros.ufDestino)
}

// Vendedor
if (config.filtros.vendedorIds && config.filtros.vendedorIds.length > 0) {
  query = query.in('vendedor_id', config.filtros.vendedorIds)
}

// Cliente
if (config.filtros.clienteIds && config.filtros.clienteIds.length > 0) {
  query = query.in('cliente_id', config.filtros.clienteIds)
}
```

#### ⚠️ IMPORTANTE: Valores dos Filtros

Os valores enviados pela UI **DEVEM** corresponder aos valores no banco de dados:

```typescript
// ❌ ERRADO (não funciona)
origem: ['loja', 'marketplace', 'online']

// ✅ CORRETO (funciona)
origem: ['loja_fisica', 'mercado_livre', 'online']
```

**Sempre verifique o schema do banco antes de implementar filtros!**

Verificar no arquivo: `database/migrations/009_add_vendas_origem_uf_columns.sql`

#### Cálculo de Faturamento com Fallback

```typescript
// Ordem de prioridade para calcular faturamento de cada item
let faturamentoItem = 0

if (item.total_item !== null && item.total_item !== undefined && item.total_item !== 0) {
  faturamentoItem = item.total_item
} else if (item.subtotal_liquido !== null && item.subtotal_liquido !== undefined && item.subtotal_liquido !== 0) {
  faturamentoItem = item.subtotal_liquido
} else if (item.subtotal_bruto !== null && item.subtotal_bruto !== undefined && item.subtotal_bruto !== 0) {
  faturamentoItem = item.subtotal_bruto
} else if (item.subtotal !== null && item.subtotal !== undefined && item.subtotal !== 0) {
  faturamentoItem = item.subtotal  // Campo legado
} else if (item.preco_unitario !== null && item.preco_unitario !== undefined && item.preco_unitario !== 0) {
  faturamentoItem = item.preco_unitario * item.quantidade
}
```

**Checklist para cálculo de valores:**
- ✅ Verificar null
- ✅ Verificar undefined  
- ✅ Verificar se é 0 (IMPORTANTE!)
- ✅ Ter fallback para campos legados
- ✅ Último recurso: preco_unitario * quantidade

#### Cálculo de Top 10 Produtos com Custo e Margem

```typescript
const vendasPorProdutoMap = new Map<number, { 
  nome: string
  quantidade: number
  faturamento: number
  custoTotal: number
  precoCustoMedio: number
}>()

vendas?.forEach(venda => {
  venda.itens?.forEach(item => {
    const produto = Array.isArray(item.produto) ? item.produto[0] : item.produto
    if (!produto) return
    
    // Calcular faturamento do item (usar função de fallback)
    let faturamentoItem = calcularFaturamento(item)
    
    // Calcular custo
    const precoCusto = produto.preco_custo || 0
    const custoItem = precoCusto * item.quantidade
    
    // Acumular no Map
    const existing = vendasPorProdutoMap.get(produto.id)
    vendasPorProdutoMap.set(produto.id, {
      nome: produto.nome,
      quantidade: (existing?.quantidade || 0) + item.quantidade,
      faturamento: (existing?.faturamento || 0) + faturamentoItem,
      custoTotal: (existing?.custoTotal || 0) + custoItem,
      precoCustoMedio: precoCusto
    })
  })
})

// Transformar e calcular margem
const vendasPorProduto = Array.from(vendasPorProdutoMap.entries())
  .map(([produtoId, valores]) => ({
    produtoId,
    produtoNome: valores.nome,
    quantidade: valores.quantidade,
    faturamento: valores.faturamento,
    precoCusto: valores.precoCustoMedio,
    precoVenda: valores.quantidade > 0 ? valores.faturamento / valores.quantidade : 0,
    margemLucro: valores.faturamento > 0 
      ? ((valores.faturamento - valores.custoTotal) / valores.faturamento) * 100 
      : 0
  }))
  .sort((a, b) => b.quantidade - a.quantidade)
  .slice(0, 10)
```

---

### 2. Componente de Visualização (`VendasReportViewer.tsx`)

#### Exibição Condicional de Métricas

```typescript
// ❌ ERRADO - mostra por padrão se não for false
{(metricas.incluirTotalVendas !== false) && (
  <Card>...</Card>
)}

// ✅ CORRETO - só mostra se explicitamente true
{(metricas.incluirTotalVendas === true) && (
  <Card>...</Card>
)}
```

**Regra:** Use `=== true` para que métricas só apareçam quando selecionadas.

#### Tabela de Top Produtos com Todas as Colunas

```typescript
<table>
  <thead>
    <tr>
      <th>#</th>
      <th>Produto</th>
      <th>Quantidade</th>
      <th>Preço Custo</th>      // Novo!
      <th>Preço Venda</th>      // Novo!
      <th>Faturamento</th>
      <th>Lucro %</th>          // Novo!
    </tr>
  </thead>
  <tbody>
    {vendasPorProduto.map((produto, index) => (
      <tr key={produto.produtoId}>
        <td>{index + 1}</td>
        <td>{produto.produtoNome}</td>
        <td>{produto.quantidade}</td>
        <td>{formatCurrency(produto.precoCusto || 0)}</td>
        <td>{formatCurrency(produto.precoVenda || 0)}</td>
        <td>{formatCurrency(produto.faturamento)}</td>
        <td>
          <span className={`font-medium ${
            (produto.margemLucro || 0) > 20 
              ? 'text-green-600'    // Lucro bom
              : (produto.margemLucro || 0) > 10 
                ? 'text-yellow-600' // Lucro razoável
                : 'text-red-600'    // Lucro ruim
          }`}>
            {(produto.margemLucro || 0).toFixed(1)}%
          </span>
        </td>
      </tr>
    ))}
  </tbody>
</table>
```

---

### 3. Painel de Filtros (`FilterPanel.tsx`)

#### Valores DEVEM Coincidir com o Banco

```typescript
// Filtro de Origem
<select
  value={filters.origem?.[0] || ''}
  onChange={(e) => {
    const value = e.target.value
    onChange({
      ...filters,
      origem: value ? [value] : undefined
    })
  }}
>
  <option value="">Todas</option>
  <option value="loja_fisica">Loja Física</option>      // Exatamente como no banco!
  <option value="mercado_livre">Mercado Livre</option>  // Exatamente como no banco!
  <option value="online">Online</option>                // Exatamente como no banco!
</select>
```

**Processo para criar novos filtros:**
1. Verificar schema do banco (`database/migrations/*.sql`)
2. Identificar valores EXATOS das colunas
3. Usar esses valores no `<option value="...">`
4. Testar no banco com query SQL antes de implementar

---

### 4. TypeScript Types (`types/reports.ts`)

#### Estrutura de Dados do Relatório

```typescript
export interface VendasReportData {
  resumo: {
    totalVendas: number
    faturamentoTotal: number
    ticketMedio: number
    totalImpostos: number
    custoTotal: number
    margemLucro: number
  }
  vendasPorDia: Array<{
    data: string
    quantidade: number
    faturamento: number
  }>
  vendasPorVendedor: Array<{
    vendedorId: number
    vendedorNome: string
    quantidade: number
    faturamento: number
  }>
  vendasPorProduto: Array<{
    produtoId: number
    produtoNome: string
    quantidade: number
    faturamento: number
    precoCusto?: number      // Novo!
    precoVenda?: number      // Novo!
    margemLucro?: number     // Novo!
  }>
  vendasDetalhadas: Array<{
    id: number
    data: string
    cliente: string
    vendedor: string
    produtos: number
    subtotal: number
    valorLiquido: number
    ipi: number
    icms: number
    st: number
    impostos: number
    total: number
    status: string
  }>
}
```

---

## 📊 Fluxo Completo do Relatório

```
1. Usuário acessa /relatorios/vendas
   ↓
2. ReportConfigWizard renderiza wizard com 4 passos:
   - Passo 1: Período (PeriodSelector)
   - Passo 2: Filtros (FilterPanel)
   - Passo 3: Métricas (MetricsSelector)
   - Passo 4: Formato (web/pdf/excel/csv)
   ↓
3. Ao clicar "Gerar Relatório":
   - Monta ReportConfiguration com filtros, métricas e período
   - Chama reportsService.vendas.getData(config)
   ↓
4. reportsService chama:
   - POST /api/relatorios/vendas/preview
   ↓
5. API preview.ts:
   - Busca vendas do Supabase com filtros aplicados
   - Processa dados (agrupamentos, cálculos)
   - Retorna VendasReportData
   ↓
6. VendasReportViewer renderiza:
   - Métricas selecionadas (cards)
   - Gráficos selecionados (recharts)
   - Tabela de Top 10 Produtos
   - Tabela de Vendas Detalhadas
   ↓
7. Usuário pode exportar em PDF/Excel/CSV
```

---

## ✅ Checklist de Implementação

Use este checklist ao implementar novos relatórios:

### Backend (API)
- [ ] Criar `pages/api/relatorios/{tipo}/preview.ts`
- [ ] Implementar filtros na query principal do Supabase
- [ ] **VERIFICAR** valores dos filtros no schema do banco
- [ ] Implementar cálculo de faturamento com fallback (null, undefined, 0)
- [ ] Calcular métricas agregadas (resumo)
- [ ] Agrupar dados conforme necessário (por dia, vendedor, produto, etc.)
- [ ] Incluir dados de custo para cálculo de margem
- [ ] Limitar registros detalhados (ex: primeiros 100)
- [ ] Testar com query SQL no banco antes de implementar

### Frontend (UI)
- [ ] Criar `components/reports/{Tipo}ReportViewer.tsx`
- [ ] Usar `=== true` para exibição condicional de métricas
- [ ] Implementar tabelas com todas as colunas necessárias
- [ ] Adicionar formatação de moeda (`formatCurrency`)
- [ ] Adicionar cores para indicadores (vermelho/amarelo/verde)
- [ ] Implementar gráficos com recharts
- [ ] Adicionar botões de exportação

### Filtros
- [ ] Adicionar filtros específicos no `FilterPanel.tsx`
- [ ] **VERIFICAR** valores no banco antes de criar opções
- [ ] Usar valores EXATOS do schema do banco nos `<option>`
- [ ] Testar filtros com dados reais

### Types
- [ ] Definir `{Tipo}ReportData` em `types/reports.ts`
- [ ] Incluir campos opcionais com `?` quando aplicável
- [ ] Documentar estrutura de dados no código

### Testes
- [ ] Testar com período vazio (sem dados)
- [ ] Testar com dados zerados (quantidade > 0, faturamento = 0)
- [ ] Testar filtros individualmente
- [ ] Testar combinação de filtros
- [ ] Testar seleção de métricas
- [ ] Testar exportação PDF/Excel/CSV

---

## 🐛 Problemas Comuns e Soluções

### 1. Filtros Não Funcionam

**Sintoma:** Seleciono filtro mas todos os dados aparecem

**Causa:** Valores da UI não correspondem ao banco

**Solução:**
```sql
-- Verificar valores reais no banco
SELECT DISTINCT origem_venda FROM vendas;
SELECT DISTINCT status FROM vendas;
```

Usar valores EXATOS no `<option value="...">`

### 2. Produtos com Faturamento Zero

**Sintoma:** Quantidade > 0 mas Faturamento = R$ 0,00

**Causa:** Não verificar se valor é `0` no fallback

**Solução:**
```typescript
// Adicionar verificação de 0
if (item.subtotal_liquido !== null && 
    item.subtotal_liquido !== undefined && 
    item.subtotal_liquido !== 0) {  // ← IMPORTANTE!
  faturamento = item.subtotal_liquido
}
```

### 3. Métricas Aparecem Mesmo Sem Selecionar

**Sintoma:** Todas as métricas aparecem por padrão

**Causa:** Usar `!== false` em vez de `=== true`

**Solução:**
```typescript
// ❌ Errado
{(metricas.incluirTotalVendas !== false) && <Card>...</Card>}

// ✅ Correto
{(metricas.incluirTotalVendas === true) && <Card>...</Card>}
```

### 4. Margem de Lucro Incorreta

**Sintoma:** Margem negativa ou maior que 100%

**Causa:** Não considerar quantidade no cálculo de custo

**Solução:**
```typescript
// Calcular custo TOTAL (preço × quantidade)
const custoTotal = precoCusto * quantidade

// Margem = (faturamento - custo) / faturamento
const margem = faturamento > 0 
  ? ((faturamento - custoTotal) / faturamento) * 100 
  : 0
```

---

## 🚀 Próximos Relatórios

Use esta implementação como base para:

1. **Relatório de Produtos**
   - Filtros: status, categoria, estoque
   - Métricas: mais vendidos, menos vendidos, rotatividade
   - Tabela: produtos com estoque, custo, preço venda

2. **Relatório de Clientes**
   - Filtros: tipo (PF/PJ), status, estado
   - Métricas: novos clientes, ativos, top clientes
   - Tabela: clientes com total de compras, ticket médio

3. **Relatório Financeiro**
   - Filtros: tipo de transação, categoria
   - Métricas: receitas, despesas, lucro, DRE
   - Gráficos: evolução mensal, distribuição

---

## 📚 Referências

- Migrations de banco: `database/migrations/009_add_vendas_origem_uf_columns.sql`
- Schema de vendas: `database/migrations/supabase_schema.sql`
- Tipos do sistema: `types/reports.ts`
- Documentação Supabase: https://supabase.com/docs
- Recharts: https://recharts.org/

---

## 📝 Notas Finais

- **Sempre verificar schema do banco antes de implementar filtros**
- **Sempre testar cálculos com dados reais no banco**
- **Sempre usar fallback para campos que podem ser null/0**
- **Sempre verificar se métricas usam `=== true`**
- **Sempre incluir análise de custo e margem quando relevante**

Este documento deve ser atualizado conforme novos padrões forem estabelecidos.

---

**Última atualização:** 2025-11-14  
**Autor:** GitHub Copilot  
**Commits relacionados:** a24da2a, df3cb4a, b42ba7c
