# Feature: Filtro de Vendedor nos Relatórios

**Data:** 07/01/2025
**Tipo:** Feature
**Status:** ✅ Implementado

## Visão Geral

Adicionado filtro de vendedor no relatório de vendas, permitindo que o gestor gere relatórios individualizados por vendedor. Isso facilita o envio de relatórios específicos para cada vendedor mostrando apenas suas próprias vendas.

## Motivação

O gestor precisa poder:
1. **Gerar relatório individual** por vendedor
2. **Enviar relatório específico** para cada vendedor
3. **Analisar performance individual** sem ver outros vendedores
4. **Manter privacidade** dos dados entre vendedores

## Implementação

### 1. Frontend - Seletor de Vendedor

**Arquivo:** `components/reports/FilterPanel.tsx`

Adicionado campo de seleção de vendedor nos filtros do relatório de vendas:

```typescript
<div className="space-y-2">
  <label htmlFor="vendedor" className="text-sm font-medium">
    Vendedor
  </label>
  <select
    id="vendedor"
    value={filters.vendedorIds?.[0] || ''}
    onChange={(e) => {
      const value = e.target.value
      onChange({
        ...filters,
        vendedorIds: value ? [parseInt(value)] : undefined,
      })
    }}
  >
    <option value="">Todos os Vendedores</option>
    {vendedores.map(vendedor => (
      <option key={vendedor.id} value={vendedor.id}>
        {vendedor.nome}
      </option>
    ))}
  </select>
</div>
```

**Funcionalidades:**
- ✅ Busca automática de vendedores ao abrir filtros
- ✅ Select com opção "Todos os Vendedores" (padrão)
- ✅ Lista todos os vendedores cadastrados
- ✅ Indicador de carregamento enquanto busca vendedores
- ✅ Integrado ao sistema de filtros existente

### 2. Backend - Filtro Já Suportado

O backend **já suportava** filtro por vendedor:

**Arquivo:** `pages/api/relatorios/vendas/preview.ts` (linhas 79-81)

```typescript
if (config.filtros.vendedorIds && config.filtros.vendedorIds.length > 0) {
  query = query.in('vendedor_id', config.filtros.vendedorIds)
}
```

A query de vendas já filtra por `vendedor_id` quando o filtro é fornecido.

## Como Usar

### Passo a Passo

1. **Acessar Relatório de Vendas**
   - Menu → Relatórios → Relatório de Vendas

2. **Selecionar Período**
   - Escolher intervalo de datas

3. **Aplicar Filtro de Vendedor** (Step 2: Filtros)
   - **Opção 1:** Deixar "Todos os Vendedores" para relatório geral
   - **Opção 2:** Selecionar vendedor específico para relatório individual

4. **Gerar Relatório**
   - Visualizar no navegador ou exportar (PDF/Excel/CSV)

### Casos de Uso

#### 1. Relatório Geral (Gestor)
```
Filtro: "Todos os Vendedores"
Resultado: Mostra todas as vendas + seção "Vendas por Vendedor" com todos
```

#### 2. Relatório Individual (Vendedor)
```
Filtro: "João Silva"
Resultado: Mostra APENAS vendas de João Silva
```

#### 3. Análise de Performance
```
Filtro: "Maria Santos"
Período: Último mês
Resultado: Performance completa de Maria no período
```

## Comportamento do Relatório

### Com Filtro de Vendedor Aplicado

Quando um vendedor específico é selecionado:

1. **Resumo**: Totais apenas das vendas daquele vendedor
2. **Vendas Detalhadas**: Apenas vendas do vendedor
3. **Produtos**: Apenas produtos vendidos por aquele vendedor
4. **Gráficos**: Dados apenas daquele vendedor
5. **Seção "Vendas por Vendedor"**: Mostra apenas o vendedor selecionado

### Sem Filtro (Todos os Vendedores)

Comportamento padrão atual mantido:

1. **Resumo**: Totais de todos os vendedores
2. **Vendas Detalhadas**: Todas as vendas
3. **Produtos**: Todos os produtos vendidos
4. **Seção "Vendas por Vendedor"**: Lista todos os vendedores

## Exportação

Os filtros são aplicados em **todos os formatos**:

- ✅ **Web** (visualização no navegador)
- ✅ **PDF** (documento imprimível)
- ✅ **Excel** (planilha com múltiplas abas)
- ✅ **CSV** (arquivo de texto separado por vírgulas)

### Exemplo de Uso: Envio Individual

```
1. Selecionar vendedor: "Carlos Oliveira"
2. Selecionar período: "Dezembro 2024"
3. Exportar PDF
4. Enviar por email para carlos@meguispet.com
→ Carlos recebe apenas suas vendas de dezembro
```

## Vantagens

### Para o Gestor
- ✅ Gera relatórios individualizados rapidamente
- ✅ Envia para vendedores sem expor dados de outros
- ✅ Analisa performance individual facilmente
- ✅ Mantém privacidade entre equipes

### Para o Vendedor
- ✅ Recebe apenas seus dados
- ✅ Foca em sua própria performance
- ✅ Não vê informações de outros vendedores
- ✅ Relatório limpo e direto

### Para o Sistema
- ✅ Não precisa criar novo tipo de relatório
- ✅ Reutiliza código existente
- ✅ Filtro aplicado no banco de dados (performance)
- ✅ Consistência em todos os formatos

## Arquivos Modificados

1. **`components/reports/FilterPanel.tsx`**
   - Adicionado import de `vendedoresService`
   - Adicionado estado para lista de vendedores
   - Adicionado `useEffect` para buscar vendedores
   - Adicionado campo select no `renderVendasFilters()`

## Compatibilidade

- ✅ **Backend**: Filtro já estava implementado
- ✅ **Frontend**: Novo campo adicionado
- ✅ **TypeScript**: Sem erros de compilação
- ✅ **Exports**: Todos os formatos suportam filtro
- ✅ **API**: Endpoint de vendedores já existente

## Próximas Melhorias (Futuro)

### Multi-seleção de Vendedores
Permitir selecionar múltiplos vendedores:
```typescript
// Exemplo futuro
vendedorIds: [1, 3, 5] // João, Maria e Carlos
```

### Agrupamento por Vendedor
Opção de agrupar vendas por vendedor mesmo com filtro:
```typescript
agruparPorVendedor: boolean
```

### Comparativo de Vendedores
Relatório comparando 2+ vendedores lado a lado:
```typescript
compararVendedores: [1, 2] // Comparar João vs Maria
```

## Referências

- [Documentação de Relatórios](../04-features/relatorios.md)
- [API de Vendedores](../09-api/vendedores.md)
- [Tipos de Filtros](../../types/reports.ts)

---

**Testado em:** 07/01/2025
**Versão:** 2.0.0
**Build:** Next.js 16.0.7
**TypeScript:** ✅ Compilação limpa
