# Plano de Implementação - Sistema de Relatórios

## 📋 Visão Geral

Sistema completo de relatórios customizáveis para o MeguisPet, permitindo análises detalhadas de vendas, produtos, clientes e finanças com filtros avançados, visualizações e exportação.

---

## 🎯 Objetivos

### Funcionalidades Principais
1. **Relatórios Customizáveis**: Usuário escolhe período, métricas e formato
2. **Filtros Avançados**: Data, vendedor, produto, cliente, categoria, etc.
3. **Múltiplos Formatos**: Visualização web, PDF, Excel
4. **Agendamento**: Relatórios automáticos periódicos (futuro)
5. **Histórico**: Salvar e acessar relatórios anteriores

### UX/UI Goals
- Interface intuitiva com configuração visual
- Pré-visualização antes de gerar
- Download rápido e confiável
- Mobile-friendly

---

## 📊 Tipos de Relatórios

### 1. Relatório de Vendas

#### **Métricas Principais**
- Total de vendas (quantidade)
- Faturamento total (R$)
- Ticket médio
- Vendas por dia/semana/mês
- Vendas por vendedor
- Vendas por forma de pagamento
- Vendas por origem (loja física, marketplace, etc.)
- Impostos (IPI, ICMS, ST)
- Custos e margem de lucro

#### **Filtros Disponíveis**
- **Período**: Data inicial e final
- **Vendedor**: Todos, específico ou múltiplos
- **Produto**: Todos, específico, categoria
- **Cliente**: Todos, específico, tipo (PF/PJ)
- **Forma de Pagamento**: Todas ou específicas
- **Status**: Todas, pagas, pendentes, canceladas
- **Origem**: Todas ou específicas
- **UF Destino**: Todas ou específicas

#### **Visualizações**
- Tabela detalhada de vendas
- Gráfico de vendas ao longo do tempo
- Gráfico de vendas por vendedor (pizza/barras)
- Gráfico de vendas por produto (top 10)
- Resumo de impostos e margens

#### **Exportação**
- PDF: Layout profissional com gráficos
- Excel: Planilha com dados brutos + pivot tables
- CSV: Dados brutos para análise externa

---

### 2. Relatório de Produtos

#### **Métricas Principais**
- Produtos mais vendidos
- Produtos menos vendidos
- Produtos com baixo estoque
- Faturamento por produto
- Margem de lucro por produto
- Rotatividade de estoque
- Produtos sem vendas no período

#### **Filtros Disponíveis**
- **Período**: Data inicial e final
- **Categoria**: Todas ou específicas
- **Estoque**: Todos, abaixo do mínimo, zerado
- **Status**: Ativos, inativos, todos
- **Ordenação**: Vendas, faturamento, margem, estoque

#### **Visualizações**
- Tabela de produtos com métricas
- Gráfico de produtos mais vendidos (barras)
- Gráfico de distribuição por categoria (pizza)
- Análise ABC de produtos
- Alertas de estoque baixo

#### **Exportação**
- PDF: Relatório visual com gráficos
- Excel: Dados com fórmulas de análise
- CSV: Dados brutos

---

### 3. Relatório de Clientes

#### **Métricas Principais**
- Total de clientes
- Novos clientes no período
- Clientes ativos vs inativos
- Ticket médio por cliente
- Clientes top compradores
- Clientes sem compras no período
- Análise de recência (últimas compras)

#### **Filtros Disponíveis**
- **Período**: Data inicial e final
- **Tipo**: PF, PJ, todos
- **Status**: Ativos, inativos, todos
- **Cidade/Estado**: Filtro geográfico
- **Faixa de Compras**: Por valor total
- **Vendedor**: Filtrar por vendedor responsável

#### **Visualizações**
- Tabela de clientes com histórico
- Gráfico de novos clientes ao longo do tempo
- Gráfico de distribuição geográfica
- Análise RFM (Recência, Frequência, Monetário)
- Top 10 clientes

#### **Exportação**
- PDF: Relatório com insights
- Excel: Lista completa com métricas
- CSV: Dados para mailing/CRM

---

### 4. Relatório Financeiro

#### **Métricas Principais**
- Receitas totais
- Despesas totais (custos + operacionais)
- Lucro bruto
- Lucro líquido
- Margem de lucro (%)
- Impostos (IPI, ST, ICMS)
- Receitas por categoria
- Despesas por categoria
- Fluxo de caixa

#### **Filtros Disponíveis**
- **Período**: Data inicial e final
- **Tipo de Transação**: Receitas, despesas, todas
- **Categoria**: Filtrar por categoria financeira
- **Forma de Pagamento**: Filtrar por meio de pagamento
- **Status**: Pagas, pendentes, todas
- **Comparação**: Comparar com período anterior

#### **Visualizações**
- Gráfico de receitas vs despesas
- Gráfico de evolução ao longo do tempo
- Pizza de distribuição por categoria
- Indicadores de margem e lucratividade
- DRE (Demonstrativo de Resultados)

#### **Exportação**
- PDF: DRE formatado profissionalmente
- Excel: Planilha financeira com fórmulas
- CSV: Dados para contabilidade

---

## 🎨 Estrutura de Telas

### Tela 1: Dashboard de Relatórios (`/relatorios`)

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ Header: "Relatórios"                     [Export All] │
├─────────────────────────────────────────────────┤
│ Filtros Globais                                 │
│ [Data Início] [Data Fim] [Aplicar]              │
├─────────────────────────────────────────────────┤
│ ┌────────────┐  ┌────────────┐                 │
│ │  Vendas    │  │  Produtos  │                 │
│ │  [Icon]    │  │  [Icon]    │                 │
│ │  [Config]  │  │  [Config]  │                 │
│ └────────────┘  └────────────┘                 │
│ ┌────────────┐  ┌────────────┐                 │
│ │  Clientes  │  │ Financeiro │                 │
│ │  [Icon]    │  │  [Icon]    │                 │
│ │  [Config]  │  │  [Config]  │                 │
│ └────────────┘  └────────────┘                 │
├─────────────────────────────────────────────────┤
│ Quick Stats (4 cards)                           │
│ [Total Vendas] [Faturamento] [Produtos] [Clientes]│
├─────────────────────────────────────────────────┤
│ Relatórios Recentes (DataTable)                 │
│ Nome | Período | Data | Status | [Ações]        │
└─────────────────────────────────────────────────┘
```

**Componentes:**
- `ReportCard`: Card de cada tipo de relatório
- `QuickStatsGrid`: Cards de métricas resumidas
- `RecentReportsTable`: Histórico de relatórios

---

### Tela 2: Configuração de Relatório (`/relatorios/[tipo]/config`)

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ Header: "Configurar Relatório de [Tipo]"  [X]   │
├─────────────────────────────────────────────────┤
│ Passo 1: Período                      [1/4]     │
│ ┌─────────────────────────────────────────────┐ │
│ │ [Data Início] [Data Fim]                    │ │
│ │ Presets: [Hoje] [7 dias] [30 dias] [Mês]   │ │
│ └─────────────────────────────────────────────┘ │
│                                    [Próximo >]  │
├─────────────────────────────────────────────────┤
│ Passo 2: Filtros                      [2/4]     │
│ ┌─────────────────────────────────────────────┐ │
│ │ Vendedor: [Dropdown Multi-select]           │ │
│ │ Produto: [Dropdown Multi-select]            │ │
│ │ Status: [Checkbox Group]                    │ │
│ │ ... (filtros específicos do relatório)      │ │
│ └─────────────────────────────────────────────┘ │
│                          [< Voltar] [Próximo >] │
├─────────────────────────────────────────────────┤
│ Passo 3: Métricas e Colunas          [3/4]     │
│ ┌─────────────────────────────────────────────┐ │
│ │ Selecione as métricas:                      │ │
│ │ ☑ Total Vendas                              │ │
│ │ ☑ Faturamento                               │ │
│ │ ☐ Margem de Lucro                           │ │
│ │ ☐ Impostos                                  │ │
│ │ ... (checkboxes)                            │ │
│ │                                             │ │
│ │ Gráficos:                                   │ │
│ │ ☑ Vendas ao longo do tempo                  │ │
│ │ ☐ Top produtos                              │ │
│ └─────────────────────────────────────────────┘ │
│                          [< Voltar] [Próximo >] │
├─────────────────────────────────────────────────┤
│ Passo 4: Formato e Exportação        [4/4]     │
│ ┌─────────────────────────────────────────────┐ │
│ │ Formato:                                    │ │
│ │ ○ Visualizar no navegador                   │ │
│ │ ○ PDF                                       │ │
│ │ ○ Excel (.xlsx)                             │ │
│ │ ○ CSV                                       │ │
│ │                                             │ │
│ │ Opções:                                     │ │
│ │ ☐ Salvar configuração como template        │ │
│ │ ☐ Agendar envio automático (futuro)        │ │
│ └─────────────────────────────────────────────┘ │
│                          [< Voltar] [Gerar]     │
└─────────────────────────────────────────────────┘
```

**Componentes:**
- `ReportConfigStepper`: Wizard multi-step
- `PeriodSelector`: Calendário + presets
- `FiltersPanel`: Filtros dinâmicos por tipo
- `MetricsSelector`: Checkboxes de métricas
- `FormatSelector`: Radio buttons de formato

---

### Tela 3: Visualização de Relatório (`/relatorios/view/[id]`)

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ Header: "Relatório de Vendas - Dez 2024"       │
│ [PDF] [Excel] [CSV] [Compartilhar] [Imprimir]  │
├─────────────────────────────────────────────────┤
│ Sumário Executivo                               │
│ ┌─────────────┬─────────────┬─────────────┐    │
│ │ Total Vendas│ Faturamento │ Ticket Médio│    │
│ │    150      │  R$ 45.000  │   R$ 300    │    │
│ └─────────────┴─────────────┴─────────────┘    │
├─────────────────────────────────────────────────┤
│ Gráficos                                        │
│ ┌───────────────────────────────────────────┐  │
│ │ [Gráfico de Vendas ao Longo do Tempo]    │  │
│ └───────────────────────────────────────────┘  │
│ ┌───────────────────────────────────────────┐  │
│ │ [Gráfico de Top Produtos]                 │  │
│ └───────────────────────────────────────────┘  │
├─────────────────────────────────────────────────┤
│ Dados Detalhados (DataTable)                   │
│ Data | Produto | Qtd | Valor | Vendedor | ...  │
│ [Tabela ordenável e filtrável]                 │
└─────────────────────────────────────────────────┘
```

**Componentes:**
- `ReportHeader`: Título + ações
- `ExecutiveSummary`: Cards de métricas principais
- `ReportCharts`: Gráficos customizáveis
- `ReportDataTable`: Dados detalhados

---

## 🔧 Arquitetura Técnica

### Frontend Components

```
components/
├── reports/
│   ├── ReportCard.tsx              # Card de tipo de relatório
│   ├── ReportConfigWizard.tsx      # Wizard de configuração
│   ├── PeriodSelector.tsx          # Seletor de período
│   ├── FilterPanel.tsx             # Painel de filtros
│   ├── MetricsSelector.tsx         # Seletor de métricas
│   ├── FormatSelector.tsx          # Seletor de formato
│   ├── ReportPreview.tsx           # Pré-visualização
│   ├── ReportViewer.tsx            # Visualizador completo
│   ├── ExecutiveSummary.tsx        # Sumário executivo
│   ├── ReportCharts.tsx            # Container de gráficos
│   └── ExportButtons.tsx           # Botões de exportação
```

### Backend API Endpoints

```
pages/api/
├── relatorios/
│   ├── vendas/
│   │   ├── generate.ts             # POST - Gera relatório
│   │   ├── preview.ts              # POST - Preview dos dados
│   │   └── export.ts               # POST - Exporta em formato
│   ├── produtos/
│   │   ├── generate.ts
│   │   ├── preview.ts
│   │   └── export.ts
│   ├── clientes/
│   │   ├── generate.ts
│   │   ├── preview.ts
│   │   └── export.ts
│   ├── financeiro/
│   │   ├── generate.ts
│   │   ├── preview.ts
│   │   └── export.ts
│   ├── saved/
│   │   ├── index.ts                # GET - Lista salvos
│   │   ├── [id].ts                 # GET - Busca por ID
│   │   └── delete.ts               # DELETE - Remove
│   └── templates/
│       ├── index.ts                # GET - Lista templates
│       ├── save.ts                 # POST - Salva template
│       └── [id].ts                 # GET/DELETE - Template
```

### Database Schema

```sql
-- Tabela de relatórios salvos
CREATE TABLE relatorios_salvos (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER REFERENCES usuarios(id),
  tipo VARCHAR(50) NOT NULL, -- 'vendas', 'produtos', 'clientes', 'financeiro'
  nome VARCHAR(255) NOT NULL,
  configuracao JSONB NOT NULL, -- Filtros, métricas, etc.
  periodo_inicio DATE NOT NULL,
  periodo_fim DATE NOT NULL,
  dados JSONB, -- Dados calculados (cache)
  formato VARCHAR(20), -- 'pdf', 'excel', 'csv', 'web'
  arquivo_url TEXT, -- URL do arquivo gerado (se PDF/Excel)
  status VARCHAR(20) DEFAULT 'disponivel', -- 'processando', 'disponivel', 'erro'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de templates de relatórios
CREATE TABLE relatorios_templates (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER REFERENCES usuarios(id),
  tipo VARCHAR(50) NOT NULL,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  configuracao JSONB NOT NULL,
  publico BOOLEAN DEFAULT FALSE, -- Template público ou privado
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_relatorios_usuario ON relatorios_salvos(usuario_id);
CREATE INDEX idx_relatorios_tipo ON relatorios_salvos(tipo);
CREATE INDEX idx_relatorios_data ON relatorios_salvos(periodo_inicio, periodo_fim);
CREATE INDEX idx_templates_usuario ON relatorios_templates(usuario_id);
```

### Types

```typescript
// types/reports.ts

export type ReportType = 'vendas' | 'produtos' | 'clientes' | 'financeiro'

export type ReportFormat = 'web' | 'pdf' | 'excel' | 'csv'

export type ReportStatus = 'processando' | 'disponivel' | 'erro'

export interface ReportPeriod {
  startDate: string // YYYY-MM-DD
  endDate: string   // YYYY-MM-DD
}

export interface ReportFilters {
  // Filtros comuns
  periodo: ReportPeriod

  // Filtros de vendas
  vendedorIds?: number[]
  produtoIds?: number[]
  clienteIds?: number[]
  formaPagamentoIds?: number[]
  status?: ('pendente' | 'pago' | 'cancelado')[]
  origem?: string[]
  ufDestino?: string[]

  // Filtros de produtos
  categorias?: string[]
  estoqueStatus?: 'todos' | 'baixo' | 'zerado'
  produtoStatus?: 'ativo' | 'inativo' | 'todos'

  // Filtros de clientes
  tipoCliente?: 'pf' | 'pj' | 'todos'
  clienteStatus?: 'ativo' | 'inativo' | 'todos'
  cidade?: string[]
  estado?: string[]

  // Filtros financeiros
  tipoTransacao?: 'receita' | 'despesa' | 'todas'
  categoriaIds?: number[]
}

export interface ReportMetrics {
  // Métricas de vendas
  incluirTotalVendas?: boolean
  incluirFaturamento?: boolean
  incluirTicketMedio?: boolean
  incluirImpostos?: boolean
  incluirMargemLucro?: boolean
  incluirCustos?: boolean

  // Métricas de produtos
  incluirProdutosMaisVendidos?: boolean
  incluirProdutosMenosVendidos?: boolean
  incluirRotatividade?: boolean
  incluirEstoqueBaixo?: boolean

  // Métricas de clientes
  incluirNovosClientes?: boolean
  incluirClientesAtivos?: boolean
  incluirTopClientes?: boolean
  incluirAnaliseRFM?: boolean

  // Métricas financeiras
  incluirReceitas?: boolean
  incluirDespesas?: boolean
  incluirLucro?: boolean
  incluirDRE?: boolean
}

export interface ReportCharts {
  incluirGraficoTemporal?: boolean
  incluirGraficoVendedor?: boolean
  incluirGraficoProduto?: boolean
  incluirGraficoCategoria?: boolean
  incluirGraficoComparativo?: boolean
}

export interface ReportConfiguration {
  tipo: ReportType
  filtros: ReportFilters
  metricas: ReportMetrics
  graficos: ReportCharts
  ordenacao?: {
    campo: string
    direcao: 'asc' | 'desc'
  }
  limite?: number
}

export interface SavedReport {
  id: number
  usuarioId: number
  tipo: ReportType
  nome: string
  configuracao: ReportConfiguration
  periodoInicio: string
  periodoFim: string
  dados?: unknown // Dados calculados
  formato?: ReportFormat
  arquivoUrl?: string
  status: ReportStatus
  createdAt: string
  updatedAt: string
}

export interface ReportTemplate {
  id: number
  usuarioId: number
  tipo: ReportType
  nome: string
  descricao?: string
  configuracao: ReportConfiguration
  publico: boolean
  createdAt: string
  updatedAt: string
}

// Response types
export interface ReportPreviewData {
  resumo: {
    [key: string]: number | string
  }
  dados: unknown[]
  totalRegistros: number
}

export interface ReportGenerateResponse {
  success: boolean
  reportId?: number
  arquivoUrl?: string
  preview?: ReportPreviewData
  message?: string
}
```

---

## 📦 Bibliotecas Necessárias

### Para Geração de PDF
```bash
pnpm add jspdf jspdf-autotable
pnpm add @types/jspdf @types/jspdf-autotable --save-dev
```

### Para Geração de Excel
```bash
pnpm add xlsx
pnpm add @types/xlsx --save-dev
```

### Para Gráficos (já instalado)
```bash
# Recharts já está instalado
# pnpm add recharts
```

### Para Date Picker
```bash
pnpm add react-day-picker date-fns
```

---

## 🚀 Plano de Implementação

### Fase 1: Estrutura Base (Semana 1)
**Objetivo:** Criar estrutura de componentes e tipos

- [ ] Criar types em `types/reports.ts`
- [ ] Criar schema de banco de dados
- [ ] Criar componentes base:
  - [ ] `ReportCard`
  - [ ] `PeriodSelector`
  - [ ] `FilterPanel`
  - [ ] `MetricsSelector`
- [ ] Atualizar página `/relatorios` com nova estrutura
- [ ] Criar serviço base `services/reportsService.ts`

**Entregável:** Estrutura de componentes funcionando com dados mock

---

### Fase 2: Relatório de Vendas (Semana 2-3)
**Objetivo:** Implementar relatório de vendas completo

**Backend:**
- [ ] Criar API `/api/relatorios/vendas/generate.ts`
  - [ ] Implementar filtros de período
  - [ ] Implementar filtros de vendedor, produto, cliente
  - [ ] Calcular métricas (total vendas, faturamento, ticket médio)
  - [ ] Calcular impostos (IPI, ST)
  - [ ] Calcular margem de lucro
- [ ] Criar API `/api/relatorios/vendas/preview.ts`
- [ ] Criar API `/api/relatorios/vendas/export.ts`
  - [ ] Implementar export PDF
  - [ ] Implementar export Excel
  - [ ] Implementar export CSV

**Frontend:**
- [ ] Criar `VendasReportConfig` component
- [ ] Criar wizard de configuração
- [ ] Implementar filtros específicos de vendas
- [ ] Criar `VendasReportViewer` component
- [ ] Implementar gráficos:
  - [ ] Vendas ao longo do tempo
  - [ ] Vendas por vendedor
  - [ ] Top produtos
- [ ] Implementar exportação

**Entregável:** Relatório de vendas funcional com todos os formatos

---

### Fase 3: Relatório de Produtos (Semana 4)
**Objetivo:** Implementar relatório de produtos

**Backend:**
- [ ] Criar API `/api/relatorios/produtos/generate.ts`
  - [ ] Produtos mais vendidos
  - [ ] Produtos com baixo estoque
  - [ ] Análise de rotatividade
  - [ ] Margem por produto
- [ ] Implementar preview e export

**Frontend:**
- [ ] Criar `ProdutosReportConfig` component
- [ ] Criar filtros de categoria e estoque
- [ ] Criar `ProdutosReportViewer` component
- [ ] Implementar gráficos:
  - [ ] Top produtos
  - [ ] Distribuição por categoria
  - [ ] Análise ABC

**Entregável:** Relatório de produtos funcional

---

### Fase 4: Relatório de Clientes (Semana 5)
**Objetivo:** Implementar relatório de clientes

**Backend:**
- [ ] Criar API `/api/relatorios/clientes/generate.ts`
  - [ ] Novos clientes no período
  - [ ] Clientes ativos vs inativos
  - [ ] Top clientes
  - [ ] Análise RFM
- [ ] Implementar preview e export

**Frontend:**
- [ ] Criar `ClientesReportConfig` component
- [ ] Criar filtros geográficos
- [ ] Criar `ClientesReportViewer` component
- [ ] Implementar gráficos:
  - [ ] Novos clientes ao longo do tempo
  - [ ] Distribuição geográfica
  - [ ] Top clientes

**Entregável:** Relatório de clientes funcional

---

### Fase 5: Relatório Financeiro (Semana 6)
**Objetivo:** Implementar relatório financeiro

**Backend:**
- [ ] Criar API `/api/relatorios/financeiro/generate.ts`
  - [ ] Receitas totais
  - [ ] Despesas totais
  - [ ] Lucro bruto e líquido
  - [ ] Margem de lucro
  - [ ] DRE simplificado
- [ ] Implementar preview e export com DRE

**Frontend:**
- [ ] Criar `FinanceiroReportConfig` component
- [ ] Criar filtros de categorias financeiras
- [ ] Criar `FinanceiroReportViewer` component
- [ ] Implementar gráficos:
  - [ ] Receitas vs Despesas
  - [ ] Evolução ao longo do tempo
  - [ ] Distribuição por categoria
- [ ] Implementar DRE visual

**Entregável:** Relatório financeiro com DRE

---

### Fase 6: Salvar e Templates (Semana 7)
**Objetivo:** Implementar salvamento de relatórios e templates

**Backend:**
- [ ] Criar API `/api/relatorios/saved`
  - [ ] Salvar relatório gerado
  - [ ] Listar relatórios salvos
  - [ ] Buscar por ID
  - [ ] Deletar
- [ ] Criar API `/api/relatorios/templates`
  - [ ] Salvar template
  - [ ] Listar templates
  - [ ] Aplicar template

**Frontend:**
- [ ] Adicionar opção "Salvar relatório"
- [ ] Adicionar opção "Salvar como template"
- [ ] Criar página de templates
- [ ] Implementar aplicação de template

**Entregável:** Sistema de salvamento completo

---

### Fase 7: Polimento e Otimização (Semana 8)
**Objetivo:** Melhorias de UX/UI e performance

- [ ] Otimizar queries de banco de dados
- [ ] Implementar cache de relatórios
- [ ] Melhorar loading states
- [ ] Adicionar skeleton loaders
- [ ] Implementar paginação em relatórios grandes
- [ ] Adicionar tooltips e ajudas contextuais
- [ ] Testes de performance
- [ ] Revisão de UX/UI

**Entregável:** Sistema otimizado e polido

---

## 🎨 Design Patterns

### 1. Wizard Pattern
Usar wizard multi-step para configuração de relatórios:
- Passo 1: Período
- Passo 2: Filtros
- Passo 3: Métricas
- Passo 4: Formato

### 2. Preview Before Generate
Sempre mostrar preview dos dados antes de gerar relatório completo

### 3. Progressive Disclosure
Mostrar filtros avançados apenas quando necessário

### 4. Responsive Design
Mobile: Mostrar wizard em full-screen modal
Desktop: Mostrar wizard em sidebar ou modal grande

### 5. Loading States
- Skeleton para preview
- Progress bar para geração de PDF/Excel
- Spinner para operações rápidas

---

## 📱 Mobile Considerations

### Filtros
- Drawer com todos os filtros
- Chips mostrando filtros ativos
- Botão "Limpar filtros"

### Visualização
- Gráficos responsivos (adaptar altura)
- Tabelas com scroll horizontal
- Cards empilhados verticalmente

### Exportação
- Download direto (sem pré-visualização em PDF)
- Compartilhamento via share API nativa

---

## ⚡ Performance

### Backend
- Implementar cache de relatórios (5 minutos)
- Usar índices de banco de dados
- Queries otimizadas com JOINs eficientes
- Paginação para grandes datasets

### Frontend
- Lazy loading de gráficos
- Virtual scrolling em tabelas grandes
- Debounce em filtros
- Memoization de cálculos

---

## 🔒 Segurança

### Autenticação
- Todos os endpoints protegidos com `withSupabaseAuth`
- Verificar permissões de usuário

### Validação
- Validar datas (início < fim)
- Limitar período máximo (ex: 2 anos)
- Sanitizar inputs de filtros

### Rate Limiting
- Limitar geração de relatórios (ex: 10 por hora)
- Cache para evitar requisições duplicadas

---

## 📊 Métricas de Sucesso

### Funcionalidade
- [ ] Todos os 4 tipos de relatórios funcionando
- [ ] Exportação em 3 formatos (PDF, Excel, CSV)
- [ ] Tempo de geração < 5 segundos para relatórios normais
- [ ] 100% de precisão nos cálculos

### UX
- [ ] Usuário consegue gerar relatório em < 1 minuto
- [ ] Interface intuitiva (não precisa de manual)
- [ ] Mobile friendly
- [ ] Feedback claro em todas as ações

### Performance
- [ ] API response < 3 segundos (95th percentile)
- [ ] PDF gerado em < 10 segundos
- [ ] Excel gerado em < 15 segundos

---

## 🔮 Futuras Melhorias

### Fase 8+
- [ ] Agendamento de relatórios automáticos
- [ ] Envio por email
- [ ] Dashboard de relatórios com widgets
- [ ] Relatórios customizados (query builder)
- [ ] Compartilhamento de relatórios (links públicos)
- [ ] Comparação entre períodos
- [ ] Previsões e tendências (ML)
- [ ] Exportação para Google Sheets
- [ ] Integração com BI tools

---

## 📚 Referências

### Inspirações de UX
- Google Analytics (filtros e visualizações)
- Looker Studio (customização)
- QuickBooks (relatórios financeiros)
- Shopify Analytics (relatórios de vendas)

### Bibliotecas e Ferramentas
- [jsPDF](https://github.com/parallax/jsPDF) - Geração de PDF
- [xlsx](https://github.com/SheetJS/sheetjs) - Geração de Excel
- [Recharts](https://recharts.org/) - Gráficos (já instalado)
- [react-day-picker](https://react-day-picker.js.org/) - Date picker

---

## ✅ Checklist de Implementação

Use este checklist para acompanhar o progresso:

### Estrutura Base
- [ ] Types criados
- [ ] Schema de banco implementado
- [ ] Componentes base criados
- [ ] Serviço base criado

### Relatório de Vendas
- [ ] API backend completa
- [ ] Frontend configuração completa
- [ ] Visualização funcional
- [ ] Exportação em todos os formatos
- [ ] Testes realizados

### Relatório de Produtos
- [ ] API backend completa
- [ ] Frontend configuração completa
- [ ] Visualização funcional
- [ ] Exportação em todos os formatos
- [ ] Testes realizados

### Relatório de Clientes
- [ ] API backend completa
- [ ] Frontend configuração completa
- [ ] Visualização funcional
- [ ] Exportação em todos os formatos
- [ ] Testes realizados

### Relatório Financeiro
- [ ] API backend completa
- [ ] Frontend configuração completa
- [ ] Visualização funcional com DRE
- [ ] Exportação em todos os formatos
- [ ] Testes realizados

### Features Adicionais
- [ ] Salvamento de relatórios
- [ ] Templates funcionando
- [ ] Cache implementado
- [ ] Mobile otimizado
- [ ] Documentação completa

---

**Data de criação:** 2025-01-13
**Versão:** 1.0
**Status:** Planejamento
