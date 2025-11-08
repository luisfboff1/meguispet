// 🏷️ TIPOS TYPESCRIPT - MEGUISPET SYSTEM
// Tipos globais para todo o sistema

export interface Usuario {
  id: number
  nome: string
  email: string
  password_hash: string
  role: 'admin' | 'convidado'
  permissoes: Record<string, unknown>
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface Cliente {
  id: number
  nome: string
  tipo: 'cliente' | 'fornecedor' | 'ambos'
  email?: string
  telefone?: string
  endereco?: string
  cidade?: string
  estado?: string
  cep?: string
  bairro?: string
  documento?: string // CPF/CNPJ
  observacoes?: string
  vendedor_id?: number | null
  vendedor?: Vendedor | null
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface Produto {
  id: number
  nome: string
  descricao?: string
  preco_venda: number // Preço de venda ao cliente
  estoque_id?: number | null
  preco_custo: number // Preço médio ponderado de custo
  estoque: number
  estoque_total?: number
  estoque_minimo: number
  categoria?: string
  codigo_barras?: string
  ativo: boolean
  forma_pagamento_id?: number | null
  created_at: string
  updated_at: string
  estoques?: ProdutoEstoqueDetalhe[]
}

export interface ProdutoEstoqueDetalhe {
  estoque_id: number
  estoque?: {
    id: number
    nome: string
  }
  estoque_nome?: string  // Legacy field for backwards compatibility
  quantidade: number
}

export interface ProdutoEstoqueInput {
  estoque_id: number
  quantidade: number
}

export interface Estoque {
  id: number
  nome: string
  descricao?: string | null
  ativo: boolean
  created_at?: string
  updated_at?: string
}

export interface Vendedor {
  id: number
  estoque?: {
    id: number
    nome: string
  } | null
  forma_pagamento_detalhe?: FormaPagamentoRegistro | null
  nome: string
  email?: string
  telefone?: string
  cpf?: string
  comissao: number
  ativo: boolean
  created_at: string
  updated_at: string
  total_vendas?: number
  total_faturamento?: number
}

export interface Venda {
  id: number
  numero_venda: string
  cliente_id?: number
  vendedor_id?: number
  data_venda: string
  valor_total: number
  desconto: number
  valor_final: number
  status: 'pendente' | 'pago' | 'cancelado'
  forma_pagamento: FormaPagamento
  forma_pagamento_id?: number | null
  forma_pagamento_detalhe?: FormaPagamentoRegistro | null
  estoque_id?: number | null
  estoque?: Estoque | null
  origem_venda: 'loja_fisica' | 'mercado_livre' | 'shopee' | 'magazine_luiza' | 'americanas' | 'outros'
  observacoes?: string
  prazo_pagamento?: string | number
  imposto_percentual?: number
  created_at: string
  updated_at: string
  cliente?: Cliente
  vendedor?: Vendedor
  itens?: ItemVenda[]
}

export interface ItemVenda {
  id: number
  venda_id: number
  produto_id: number
  quantidade: number
  preco_unitario: number
  subtotal: number
  produto?: Produto

  // Campos de impostos ICMS-ST
  base_calculo_st?: number
  icms_proprio?: number
  icms_st_total?: number
  icms_st_recolher?: number
  mva_aplicado?: number
  aliquota_icms?: number
}

export interface Fornecedor {
  id: number
  nome: string
  nome_fantasia?: string
  cnpj?: string
  inscricao_estadual?: string
  email?: string
  telefone?: string
  endereco?: string
  cidade?: string
  estado?: string
  cep?: string
  observacoes?: string
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface MovimentacaoEstoque {
  id: number
  tipo: 'entrada' | 'saida' | 'ajuste'
  fornecedor_id?: number
  cliente_id?: number
  vendedor_id?: number
  numero_pedido?: string
  data_movimentacao: string
  valor_total: number
  condicao_pagamento: 'avista' | '30dias' | '60dias' | '90dias' | 'emprestimo' | 'cobranca'
  status: 'pendente' | 'confirmado' | 'cancelado'
  observacoes?: string
  created_at: string
  updated_at: string
  fornecedor?: Fornecedor
  cliente?: Cliente
  vendedor?: Vendedor
  itens?: ItemMovimentacao[]
}

export interface ItemMovimentacao {
  id: number
  movimentacao_id: number
  produto_id: number
  quantidade: number
  preco_unitario: number
  subtotal: number
  produto?: Produto
}

export interface TransacaoFinanceira {
  id: number
  tipo: 'receita' | 'despesa'
  valor: number
  descricao: string
  categoria: string
  data_transacao: string
  observacoes?: string
  created_at: string
  updated_at: string
}

// Tipos para formulários
export interface LoginForm {
  email: string
  password: string
}

export type PessoaTipo = 'cliente' | 'fornecedor' | 'ambos'

export interface PessoaFormInput {
  nome: string
  documento?: string
  email?: string
  telefone?: string
  endereco?: string
  cidade?: string
  estado?: string
  cep?: string
  bairro?: string
  observacoes?: string
  tipo: PessoaTipo
  nome_fantasia?: string
  inscricao_estadual?: string
  ativo?: boolean
}

export type ClienteForm = PessoaFormInput

export interface ProdutoForm {
  nome: string
  descricao?: string
  preco_venda: number
  preco_custo?: number
  estoque: number
  estoque_minimo: number
  categoria?: string
  codigo_barras?: string
  ativo: boolean
  estoques?: ProdutoEstoqueInput[]
}

export type EstoqueOperacaoTipo = 'entrada' | 'saida' | 'ajuste' | 'transferencia'

export interface EstoqueOperacaoItem {
  produto_id: number
  quantidade: number
  preco_unitario?: number
  valor_total?: number
  produto_nome?: string
}

export interface EstoqueOperacaoParticipante {
  cliente_id?: number | null
  fornecedor_id?: number | null
  vendedor_id?: number | null
}

export interface EstoqueOperacaoInput {
  tipo: EstoqueOperacaoTipo
  origem_estoque_id?: number | null
  destino_estoque_id?: number | null
  itens: EstoqueOperacaoItem[]
  participante?: EstoqueOperacaoParticipante
  observacoes?: string
  status?: 'rascunho' | 'pendente' | 'confirmado'
}

export type FormaPagamento = string

export interface FormaPagamentoRegistro {
  id: number
  nome: string
  ativo: boolean
  ordem: number
  created_at?: string
  updated_at?: string
}

export type OrigemVenda =
  | 'loja_fisica'
  | 'mercado_livre'
  | 'shopee'
  | 'magazine_luiza'
  | 'americanas'
  | 'outros'

export interface VendaItemInput {
  produto_id: number
  quantidade: number
  preco_unitario: number
  subtotal: number

  // Campos opcionais de impostos ICMS-ST
  base_calculo_st?: number
  icms_proprio?: number
  icms_st_total?: number
  icms_st_recolher?: number
  mva_aplicado?: number
  aliquota_icms?: number
}

export interface VendaForm {
  numero_venda: string
  cliente_id: number | null
  vendedor_id: number | null
  forma_pagamento_id: number
  estoque_id: number
  itens: VendaItemInput[]
  desconto?: number
  prazo_pagamento?: string | number
  imposto_percentual?: number
  forma_pagamento: FormaPagamento
  origem_venda: OrigemVenda
  observacoes?: string
}

export interface FornecedorForm {
  nome: string
  nome_fantasia?: string
  cnpj?: string
  inscricao_estadual?: string
  email?: string
  telefone?: string
  endereco?: string
  cidade?: string
  estado?: string
  cep?: string
  observacoes?: string
  ativo: boolean
  tipo?: 'fornecedor' | 'ambos'
}

export interface MovimentacaoProdutoItem {
  produto_id: number
  quantidade: number
  preco_unitario: number
  valor_total: number
  produto_nome?: string
}

export interface MovimentacaoForm {
  tipo_movimentacao: 'entrada' | 'saida'
  fornecedor_id?: number
  cliente_id?: number
  vendedor_id?: number
  observacoes?: string
  produtos: MovimentacaoProdutoItem[]
}

export interface TransacaoForm {
  tipo: 'receita' | 'despesa'
  valor: number
  descricao: string
  categoria: string
  data_transacao: string
  observacoes?: string
}

export interface VendedorForm {
  nome: string
  email?: string
  telefone?: string
  cpf?: string
  comissao: number
  ativo?: boolean
}

// Tipos para API
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

// Tipos para contextos
export interface AuthContextType {
  user: Usuario | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  loading: boolean
}

export interface GlobalDataContextType {
  clientes: Cliente[]
  produtos: Produto[]
  vendedores: Vendedor[]
  loading: boolean
  refetch: () => Promise<void>
}

// Tipos para componentes
export interface TableColumn<T = Record<string, unknown>> {
  key: keyof T
  label: string
  render?: (value: T[keyof T], item: T) => React.ReactNode
  sortable?: boolean
}

export interface FilterOption {
  key: string
  label: string
  type: 'text' | 'select' | 'date' | 'number'
  options?: { value: string; label: string }[]
}

// Tipos para dashboard
export interface DashboardMetric {
  title: string
  value: string | number
  change: string
  changeType: 'positive' | 'negative'
  icon: string
}

export interface DashboardTopProduct {
  nome: string
  vendas: number
  receita: number
}

export interface DashboardVendasDia {
  data: string
  vendas: number
  receita: number
}

// Tipos para financeiro
export interface FinanceiroMetricMonthly {
  mes: string
  receitas: number
  despesas: number
}

export interface FinanceiroMetricMonthly {
  mes: string
  receitas: number
  despesas: number
}

export interface FinanceiroMetrics {
  receita: number
  despesas: number
  lucro: number
  margem: number
  grafico_mensal: FinanceiroMetricMonthly[]
}

// ============================================================================
// TIPOS PARA SISTEMA DE ICMS-ST
// ============================================================================

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

export interface VendaImpostoForm {
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

// ============================================================================
// TIPOS PARA SISTEMA DE FEEDBACK/SUPORTE
// ============================================================================

export type FeedbackTipo = 'bug' | 'melhoria' | 'funcionalidade' | 'outro'
export type FeedbackPrioridade = 'baixa' | 'media' | 'alta' | 'critica'
export type FeedbackStatus = 'backlog' | 'em_andamento' | 'em_teste' | 'concluido' | 'cancelado'

export interface FeedbackTicket {
  id: string // UUID
  titulo: string
  descricao: string
  tipo: FeedbackTipo
  prioridade: FeedbackPrioridade
  status: FeedbackStatus
  usuario_id: number
  created_at: string
  updated_at: string
  updated_by?: number | null
  usuario?: Usuario
  anexos?: FeedbackAnexo[]
  comentarios?: FeedbackComentario[]
}

export interface FeedbackAnexo {
  id: string // UUID
  ticket_id: string // UUID
  nome_arquivo: string
  tipo_arquivo: string
  tamanho_bytes: number
  conteudo_base64?: string | null
  url?: string | null
  created_at: string
}

export interface FeedbackComentario {
  id: string // UUID
  ticket_id: string // UUID
  usuario_id: number
  comentario: string
  created_at: string
  usuario?: Usuario
}

export interface FeedbackTicketForm {
  titulo: string
  descricao: string
  tipo: FeedbackTipo
  prioridade: FeedbackPrioridade
  anexos?: File[]
  imagens_coladas?: string[] // Base64 images from paste
}

export interface FeedbackTicketUpdate {
  titulo?: string
  descricao?: string
  tipo?: FeedbackTipo
  prioridade?: FeedbackPrioridade
  status?: FeedbackStatus
}

export interface FeedbackComentarioForm {
  ticket_id: string
  comentario: string
}
