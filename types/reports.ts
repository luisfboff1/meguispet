// 📊 TIPOS TYPESCRIPT - SISTEMA DE RELATÓRIOS
// Tipos específicos para o sistema de relatórios customizáveis

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

// Tipos específicos para cada relatório

// 📈 Relatório de Vendas
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
    precoCusto?: number
    precoVenda?: number
    margemLucro?: number
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

// 📦 Relatório de Produtos
export interface ProdutosReportData {
  resumo: {
    totalProdutos: number
    produtosAtivos: number
    produtosBaixoEstoque: number
    faturamentoTotal: number
    margemMedia: number
  }
  produtosMaisVendidos: Array<{
    produtoId: number
    produtoNome: string
    quantidadeVendida: number
    faturamento: number
    margem: number
  }>
  produtosMenosVendidos: Array<{
    produtoId: number
    produtoNome: string
    quantidadeVendida: number
    faturamento: number
  }>
  produtosBaixoEstoque: Array<{
    produtoId: number
    produtoNome: string
    estoqueAtual: number
    estoqueMinimo: number
  }>
  produtosPorCategoria: Array<{
    categoria: string
    quantidade: number
    faturamento: number
  }>
}

// 👥 Relatório de Clientes
export interface ClientesReportData {
  resumo: {
    totalClientes: number
    clientesAtivos: number
    novosClientes: number
    ticketMedio: number
    faturamentoTotal: number
  }
  novosClientesPorMes: Array<{
    mes: string
    quantidade: number
  }>
  topClientes: Array<{
    clienteId: number
    clienteNome: string
    totalCompras: number
    ticketMedio: number
    ultimaCompra: string
  }>
  clientesPorEstado: Array<{
    estado: string
    quantidade: number
    faturamento: number
  }>
  clientesDetalhados: Array<{
    id: number
    nome: string
    tipo: string
    totalCompras: number
    ticketMedio: number
    ultimaCompra: string
    status: string
  }>
}

// 💰 Relatório Financeiro
export interface FinanceiroReportData {
  resumo: {
    receitaTotal: number
    despesaTotal: number
    lucroBruto: number
    lucroLiquido: number
    margemLucro: number
    impostoTotal: number
  }
  receitasPorMes: Array<{
    mes: string
    receita: number
    despesa: number
    lucro: number
  }>
  receitasPorCategoria: Array<{
    categoria: string
    valor: number
    percentual: number
  }>
  despesasPorCategoria: Array<{
    categoria: string
    valor: number
    percentual: number
  }>
  dre: {
    receitaBruta: number
    deducoes: number
    receitaLiquida: number
    custoProdutos: number
    lucroBruto: number
    despesasOperacionais: number
    lucroOperacional: number
    impostos: number
    lucroLiquido: number
  }
}

// Tipos de props para componentes

export interface ReportCardProps {
  tipo: ReportType
  titulo: string
  descricao: string
  icon: React.ReactNode
  onClick: () => void
}

export interface PeriodSelectorProps {
  value: ReportPeriod
  onChange: (period: ReportPeriod) => void
  presets?: Array<{
    label: string
    period: ReportPeriod
  }>
}

export interface FilterPanelProps {
  tipo: ReportType
  filters: Partial<ReportFilters>
  onChange: (filters: Partial<ReportFilters>) => void
  onClear: () => void
}

export interface MetricsSelectorProps {
  tipo: ReportType
  metrics: ReportMetrics
  onChange: (metrics: ReportMetrics) => void
}

export interface FormatSelectorProps {
  value: ReportFormat
  onChange: (format: ReportFormat) => void
}

export interface ReportViewerProps {
  tipo: ReportType
  data: VendasReportData | ProdutosReportData | ClientesReportData | FinanceiroReportData
  configuracao: ReportConfiguration
  onExport: (format: ReportFormat) => void
}
