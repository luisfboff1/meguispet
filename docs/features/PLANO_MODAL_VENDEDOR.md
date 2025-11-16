# 📊 Plano: Modal de Detalhes do Vendedor

**Feature**: Modal com histórico de vendas e métricas do vendedor
**Data**: 2024-11-15
**Status**: 📋 Planejamento

---

## 🎯 Objetivo

Criar um modal que exibe informações detalhadas do vendedor quando clicar em um vendedor na página `/vendedores`, incluindo:
- Métricas de desempenho (faturamento total, quantidade de vendas, ticket médio)
- Histórico completo de vendas
- Filtros por período
- Gráficos de desempenho

---

## 📐 Design da Interface

### Modal Layout

```
┌─────────────────────────────────────────────────────────────┐
│  ← Voltar          Detalhes do Vendedor - [Nome]        ✕  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  👤 [Nome do Vendedor]                                      │
│  📧 Email | 📱 Telefone | 🆔 CPF | 💰 Comissão: X%         │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  📊 MÉTRICAS DO VENDEDOR (Período: [Filtro])               │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│  │ Faturamento  │ │ Vendas       │ │ Ticket Médio │       │
│  │ R$ 125.450   │ │ 87 vendas    │ │ R$ 1.442     │       │
│  │ ↑ +15%       │ │ ↑ +8%        │ │ ↑ +7%        │       │
│  └──────────────┘ └──────────────┘ └──────────────┘       │
│                                                              │
│  ┌──────────────┐ ┌──────────────┐                         │
│  │ Comissão     │ │ Últ. Venda   │                         │
│  │ R$ 6.272,50  │ │ Há 2 dias    │                         │
│  └──────────────┘ └──────────────┘                         │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  📈 GRÁFICO DE VENDAS (últimos 30 dias)                    │
│  [Gráfico de barras/linha mostrando vendas diárias]        │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  🛒 HISTÓRICO DE VENDAS                                     │
│  [Filtros: Período | Status | Buscar]                      │
│                                                              │
│  ┌───────┬──────────┬─────────┬──────────┬────────┬───────┐│
│  │ Nº    │ Cliente  │ Data    │ Valor    │ Status │ Ações ││
│  ├───────┼──────────┼─────────┼──────────┼────────┼───────┤│
│  │ #1234 │ João S.  │ 15/11   │ R$ 1.500 │ ✅ Pago│ 👁    ││
│  │ #1230 │ Maria O. │ 14/11   │ R$ 2.300 │ ✅ Pago│ 👁    ││
│  │ #1225 │ Pedro M. │ 12/11   │ R$ 890   │ ⏳ Pend│ 👁    ││
│  └───────┴──────────┴─────────┴──────────┴────────┴───────┘│
│                                                              │
│  [Paginação: < 1 2 3 4 5 >]                                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗂️ Estrutura de Arquivos

### 1. Componente do Modal

**Novo arquivo**: `components/modals/VendedorDetailsModal.tsx`

```typescript
interface VendedorDetailsModalProps {
  vendedor: Vendedor
  isOpen: boolean
  onClose: () => void
}

export function VendedorDetailsModal({
  vendedor,
  isOpen,
  onClose
}: VendedorDetailsModalProps) {
  // Estado para filtros
  const [periodo, setPeriodo] = useState<'7d' | '30d' | '90d' | 'custom'>('30d')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')

  // Carregar métricas e vendas
  const { data: metricas } = useVendedorMetricas(vendedor.id, periodo)
  const { data: vendas } = useVendedorVendas(vendedor.id, { periodo, status: statusFilter })

  // Renderizar modal
}
```

---

### 2. API de Métricas do Vendedor

**Novo arquivo**: `pages/api/vendedores/[id]/metricas.ts`

```typescript
// GET /api/vendedores/:id/metricas?periodo=30d

interface VendedorMetricas {
  faturamentoTotal: number
  faturamentoPeriodoAnterior: number // Para calcular variação %
  quantidadeVendas: number
  quantidadePeriodoAnterior: number
  ticketMedio: number
  ticketMedioPeriodoAnterior: number
  comissaoTotal: number
  ultimaVenda: {
    id: number
    numero_venda: string
    data_venda: string
    valor_final: number
  } | null
  graficoVendas: Array<{
    data: string // YYYY-MM-DD
    faturamento: number
    quantidade: number
  }>
}

// Query:
SELECT
  COUNT(*) as quantidade_vendas,
  SUM(valor_final) as faturamento_total,
  AVG(valor_final) as ticket_medio
FROM vendas
WHERE vendedor_id = :vendedor_id
  AND data_venda >= :data_inicio
  AND data_venda <= :data_fim
```

---

### 3. API de Vendas do Vendedor

**Novo arquivo**: `pages/api/vendedores/[id]/vendas.ts`

```typescript
// GET /api/vendedores/:id/vendas?page=1&limit=10&periodo=30d&status=pago

interface VendedorVendasResponse {
  vendas: Array<{
    id: number
    numero_venda: string
    cliente: {
      id: number
      nome: string
    } | null
    data_venda: string
    valor_final: number
    status: string
    forma_pagamento: string
  }>
  total: number
  page: number
  limit: number
}

// Query com paginação:
SELECT
  v.id,
  v.numero_venda,
  v.data_venda,
  v.valor_final,
  v.status,
  c.id as cliente_id,
  c.nome as cliente_nome,
  fp.nome as forma_pagamento
FROM vendas v
LEFT JOIN clientes c ON v.cliente_id = c.id
LEFT JOIN formas_pagamento fp ON v.forma_pagamento_id = fp.id
WHERE v.vendedor_id = :vendedor_id
  AND v.data_venda >= :data_inicio
  AND v.data_venda <= :data_fim
ORDER BY v.data_venda DESC
LIMIT :limit OFFSET :offset
```

---

### 4. Hook Customizado

**Novo arquivo**: `hooks/useVendedorDetails.ts`

```typescript
export function useVendedorMetricas(
  vendedorId: number,
  periodo: '7d' | '30d' | '90d' | 'custom'
) {
  return useSWR(
    `/api/vendedores/${vendedorId}/metricas?periodo=${periodo}`,
    fetcher,
    { refreshInterval: 60000 } // Refresh a cada 1 min
  )
}

export function useVendedorVendas(
  vendedorId: number,
  filters: {
    periodo: string
    status?: string
    page?: number
    limit?: number
  }
) {
  const queryParams = new URLSearchParams({
    periodo: filters.periodo,
    page: String(filters.page || 1),
    limit: String(filters.limit || 10),
    ...(filters.status && { status: filters.status })
  })

  return useSWR(
    `/api/vendedores/${vendedorId}/vendas?${queryParams}`,
    fetcher
  )
}
```

---

### 5. Atualização na Página de Vendedores

**Arquivo**: `pages/vendedores.tsx`

```typescript
// Adicionar estado para o modal
const [selectedVendedor, setSelectedVendedor] = useState<Vendedor | null>(null)
const [showDetailsModal, setShowDetailsModal] = useState(false)

// Adicionar coluna de ação "Ver Detalhes"
const columns: ColumnDef<Vendedor>[] = [
  // ... colunas existentes ...
  {
    id: 'acoes',
    header: 'Ações',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSelectedVendedor(row.original)
            setShowDetailsModal(true)
          }}
          title="Ver Detalhes"
        >
          <Eye className="h-4 w-4" />
        </Button>
        {/* ... outros botões ... */}
      </div>
    )
  }
]

// Adicionar modal no JSX
return (
  <>
    {/* ... conteúdo existente ... */}

    {selectedVendedor && (
      <VendedorDetailsModal
        vendedor={selectedVendedor}
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false)
          setSelectedVendedor(null)
        }}
      />
    )}
  </>
)
```

---

## 📊 Dados e Tipos TypeScript

### Novos tipos em `types/index.ts`

```typescript
export interface VendedorMetricas {
  faturamentoTotal: number
  faturamentoPeriodoAnterior: number
  variacaoFaturamento: number // Percentual de variação
  quantidadeVendas: number
  quantidadePeriodoAnterior: number
  variacaoQuantidade: number
  ticketMedio: number
  ticketMedioPeriodoAnterior: number
  variacaoTicketMedio: number
  comissaoTotal: number
  ultimaVenda: {
    id: number
    numero_venda: string
    data_venda: string
    valor_final: number
  } | null
  graficoVendas: Array<{
    data: string // YYYY-MM-DD
    faturamento: number
    quantidade: number
  }>
}

export interface VendedorVenda {
  id: number
  numero_venda: string
  cliente: {
    id: number
    nome: string
  } | null
  data_venda: string
  valor_final: number
  status: string
  forma_pagamento: string
}

export interface VendedorVendasResponse {
  vendas: VendedorVenda[]
  total: number
  page: number
  limit: number
}
```

---

## 🎨 Componentes UI Necessários

### 1. Cards de Métricas

```typescript
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  <MetricCard
    title="Faturamento Total"
    value={formatCurrency(metricas.faturamentoTotal)}
    variation={metricas.variacaoFaturamento}
    icon={<DollarSign />}
  />
  <MetricCard
    title="Vendas Realizadas"
    value={metricas.quantidadeVendas}
    variation={metricas.variacaoQuantidade}
    icon={<ShoppingCart />}
  />
  <MetricCard
    title="Ticket Médio"
    value={formatCurrency(metricas.ticketMedio)}
    variation={metricas.variacaoTicketMedio}
    icon={<TrendingUp />}
  />
</div>
```

### 2. Gráfico de Desempenho

```typescript
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

<ResponsiveContainer width="100%" height={300}>
  <LineChart data={metricas.graficoVendas}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="data" />
    <YAxis />
    <Tooltip />
    <Line type="monotone" dataKey="faturamento" stroke="#8b5cf6" />
  </LineChart>
</ResponsiveContainer>
```

### 3. Tabela de Vendas

```typescript
<DataTable
  columns={vendasColumns}
  data={vendas}
  enablePagination
  enableSorting
  enableFiltering
/>
```

---

## 🔍 Filtros e Funcionalidades

### 1. Filtro de Período

```typescript
<Select value={periodo} onValueChange={setPeriodo}>
  <SelectOption value="7d">Últimos 7 dias</SelectOption>
  <SelectOption value="30d">Últimos 30 dias</SelectOption>
  <SelectOption value="90d">Últimos 90 dias</SelectOption>
  <SelectOption value="custom">Período customizado</SelectOption>
</Select>
```

### 2. Filtro de Status

```typescript
<Select value={statusFilter} onValueChange={setStatusFilter}>
  <SelectOption value="">Todos os status</SelectOption>
  <SelectOption value="pago">Pago</SelectOption>
  <SelectOption value="pendente">Pendente</SelectOption>
  <SelectOption value="cancelado">Cancelado</SelectOption>
</Select>
```

### 3. Busca por Número da Venda

```typescript
<Input
  placeholder="Buscar por nº da venda..."
  value={searchTerm}
  onChange={(e) => setSearchTerm(e.target.value)}
  icon={<Search />}
/>
```

### 4. Ação "Ver Venda"

Ao clicar no ícone de olho em uma venda, navegar para a página de detalhes:

```typescript
const handleVerVenda = (vendaId: number) => {
  router.push(`/vendas?id=${vendaId}`)
  onClose() // Fechar o modal
}
```

---

## 🚀 Implementação por Etapas

### ✅ Fase 1: Backend (APIs)
**Tempo estimado**: 2-3 horas

1. ✅ Criar `/api/vendedores/[id]/metricas.ts`
   - Query para calcular métricas
   - Query para período anterior (comparação)
   - Dados do gráfico (últimos 30 dias)

2. ✅ Criar `/api/vendedores/[id]/vendas.ts`
   - Query paginada
   - Filtros (período, status)
   - Join com clientes e formas de pagamento

3. ✅ Adicionar tipos TypeScript em `types/index.ts`

### ✅ Fase 2: Frontend - Modal Base
**Tempo estimado**: 2-3 horas

1. ✅ Criar `VendedorDetailsModal.tsx`
   - Estrutura do modal
   - Header com informações básicas
   - Tabs para diferentes seções (se necessário)

2. ✅ Criar hook `useVendedorDetails.ts`
   - Integração com SWR
   - Cache e revalidação

3. ✅ Atualizar `pages/vendedores.tsx`
   - Adicionar botão "Ver Detalhes"
   - Estado do modal
   - Integração

### ✅ Fase 3: Métricas e Gráficos
**Tempo estimado**: 2-3 horas

1. ✅ Criar `MetricCard` component
   - Exibir valor
   - Mostrar variação percentual (↑/↓)
   - Ícones

2. ✅ Integrar Recharts
   - Gráfico de linha para vendas diárias
   - Tooltip customizado
   - Responsivo

3. ✅ Cards de resumo
   - Faturamento
   - Quantidade de vendas
   - Ticket médio
   - Comissão
   - Última venda

### ✅ Fase 4: Tabela de Vendas
**Tempo estimado**: 2 horas

1. ✅ Definir colunas da tabela
   - Nº da venda
   - Cliente
   - Data
   - Valor
   - Status
   - Ações

2. ✅ Implementar paginação
3. ✅ Adicionar filtros
4. ✅ Integrar com DataTable existente

### ✅ Fase 5: Polish e Testes
**Tempo estimado**: 1-2 horas

1. ✅ Testes de responsividade (mobile)
2. ✅ Loading states
3. ✅ Error states
4. ✅ Animações (Framer Motion)
5. ✅ Acessibilidade (ESC para fechar, focus trap)

---

## 🎯 Melhorias Futuras (Opcional)

### 1. Exportação de Relatórios
- Exportar vendas do vendedor em Excel/PDF
- Gerar relatório de comissões

### 2. Comparação de Vendedores
- Modal para comparar 2 vendedores lado a lado
- Ranking de vendedores

### 3. Meta de Vendas
- Definir meta mensal para vendedor
- Progresso visual (barra de progresso)
- Alertas quando próximo da meta

### 4. Notificações
- Notificar vendedor quando há nova venda atribuída
- Email de resumo mensal

---

## 📊 Métricas de Sucesso

- ✅ Modal abre em menos de 500ms
- ✅ Dados carregam em menos de 1s
- ✅ Responsivo em mobile/tablet/desktop
- ✅ Acessível (keyboard navigation, screen readers)
- ✅ Sem erros no console

---

## 🧪 Casos de Teste

### 1. Vendedor com Muitas Vendas
- ✅ Paginação funciona corretamente
- ✅ Filtros funcionam
- ✅ Performance aceitável (>1000 vendas)

### 2. Vendedor Sem Vendas
- ✅ Exibir mensagem vazia
- ✅ Não quebrar o layout
- ✅ Métricas zeradas

### 3. Vendedor Inativo
- ✅ Mostrar badge "Inativo"
- ✅ Dados históricos ainda acessíveis

### 4. Filtros e Buscas
- ✅ Filtro por período funciona
- ✅ Filtro por status funciona
- ✅ Busca por nº venda funciona
- ✅ Combinação de filtros funciona

---

## 📚 Referências

- [Shadcn Dialog](https://ui.shadcn.com/docs/components/dialog)
- [Recharts Documentation](https://recharts.org/)
- [TanStack Table](https://tanstack.com/table/v8)
- [SWR Data Fetching](https://swr.vercel.app/)

---

**Última atualização**: 2024-11-15
**Próximo passo**: Implementar Fase 1 (APIs Backend)
