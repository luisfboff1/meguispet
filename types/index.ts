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
  estoque_nome: string
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
}

export interface VendaForm {
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
  id: number
  nome: string
  preco: number
  preco_venda: number
  estoque: number
  vendas: number
  receita: number
  total_vendas: number
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

export interface FinanceiroMetrics {
  receita: number
  despesas: number
  lucro: number
  margem: number
  grafico_mensal: FinanceiroMetricMonthly[]
}
