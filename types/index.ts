// 🏷️ TIPOS TYPESCRIPT - MEGUISPET SYSTEM
// Tipos globais para todo o sistema

import type { UserRole, Permissoes } from './permissions'

export interface Usuario {
  id: number
  nome: string
  email: string
  password_hash: string
  role: 'admin' | 'convidado'  // ⚠️ DEPRECATED - use tipo_usuario
  tipo_usuario: UserRole       // 🆕 Role PRIMÁRIO do usuário
  roles?: UserRole[]           // 🆕 NOVO - Array de roles adicionais (ex: ['vendedor', 'financeiro'])
  permissoes: Permissoes        // ✏️ Permissões FINAIS calculadas (merge de roles + custom)
  permissoes_custom?: Partial<Permissoes>  // 🆕 NOVO - Permissões customizadas pelo admin
  vendedor_id?: number | null   // 🆕 NOVO - link para vendedor (se for vendedor)
  departamento?: string | null  // 🆕 NOVO - departamento do usuário
  ativo: boolean
  supabase_user_id?: string
  created_at: string
  updated_at: string
}

// Exportar tipos de permissões
export type { UserRole, Permissoes } from './permissions'
export { PERMISSIONS_PRESETS, getDefaultPermissions, isFullAccessRole, roleRequiresVendedor, mergePermissions } from './permissions'

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
  inscricao_estadual?: string // State Registration
  observacoes?: string
  vendedor_id?: number | null
  vendedor?: Vendedor | null
  ativo: boolean
  created_at: string
  updated_at: string
  // Geolocation fields
  latitude?: number | null
  longitude?: number | null
  geocoded_at?: string | null
  geocoding_source?: 'manual' | 'api' | 'cep' | 'brasilapi' | 'nominatim'
  geocoding_precision?: 'exact' | 'street' | 'city' | 'approximate'
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
  // Impostos - NOVO
  ipi: number // Alíquota de IPI (0-100)
  icms: number // Alíquota de ICMS (0-100) - Informativo apenas
  icms_proprio: number // Alíquota de ICMS Próprio (0-100) - Usado no cálculo de ST
  st: number // MVA - Margem de Valor Agregado (0-100) - Base para cálculo de ST
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
  usuario_id?: number | null    // 🆕 NOVO - link para usuário (OPCIONAL)
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
  desconto: number // Deprecado - usar desconto_total
  valor_final: number
  status: 'pendente' | 'pago' | 'cancelado'
  forma_pagamento: FormaPagamento
  forma_pagamento_id?: number | null
  forma_pagamento_detalhe?: FormaPagamentoRegistro | null
  condicao_pagamento_id?: number | null
  condicao_pagamento?: CondicaoPagamento | null
  estoque_id?: number | null
  estoque?: Estoque | null
  origem_venda: 'loja_fisica' | 'mercado_livre' | 'shopee' | 'magazine_luiza' | 'americanas' | 'outros'
  uf_destino?: string // UF de destino da venda (para cálculo ICMS-ST)
  observacoes?: string
  prazo_pagamento?: string | number
  imposto_percentual?: number
  sem_impostos?: boolean // Indica se a venda é sem impostos (não calcula IPI, ICMS, ST) - DEPRECADO, usar sem_ipi e sem_st
  sem_ipi?: boolean // Indica se a venda é sem IPI
  sem_st?: boolean // Indica se a venda é sem ST
  // Impostos e Totais - NOVO
  total_produtos_bruto: number // Total dos produtos sem desconto
  desconto_total: number // Desconto total da venda
  total_produtos_liquido: number // Total dos produtos após desconto
  total_ipi: number // Total de IPI (incluído no total)
  total_icms: number // Total de ICMS (informativo, NÃO incluído no total)
  total_st: number // Total de ST (incluído no total)
  created_at: string
  updated_at: string
  cliente?: Cliente
  vendedor?: Vendedor
  itens?: ItemVenda[]
  parcelas?: VendaParcela[] // Parcelas de pagamento da venda
}

export interface ItemVenda {
  id: number
  venda_id: number
  produto_id: number
  quantidade: number
  preco_unitario: number
  subtotal: number // Deprecado - usar total_item
  produto?: Produto

  // Impostos e Totais - NOVO
  subtotal_bruto: number // Preço × Quantidade
  desconto_proporcional: number // Desconto proporcional do item
  subtotal_liquido: number // Subtotal após desconto
  ipi_aliquota: number // Alíquota IPI no momento da venda
  ipi_valor: number // Valor do IPI calculado
  icms_aliquota: number // Alíquota ICMS no momento da venda
  icms_valor: number // Valor do ICMS (informativo, NÃO no total)
  st_aliquota: number // MVA (Margem de Valor Agregado) no momento da venda
  st_valor: number // Valor do ST calculado (ICMS ST - ICMS Próprio)
  total_item: number // Total do item (subtotal_liquido + IPI + ST, sem ICMS)

  // Campos detalhados de ICMS-ST (para transparência fiscal)
  icms_proprio_aliquota?: number // Alíquota de ICMS Próprio (ex: 4%)
  icms_proprio_valor?: number // Valor do ICMS Próprio calculado
  base_calculo_st?: number // Base de cálculo ST = Valor Líquido × (1 + MVA)
  icms_st_aliquota?: number // Alíquota de ICMS-ST (ex: 18%)
  icms_st_valor?: number // Valor total do ICMS-ST (Base ST × Alíquota ST)
  mva_aplicado?: number // MVA aplicado no cálculo

  // Campos antigos (manter por compatibilidade)
  icms_proprio?: number // Deprecado - usar icms_proprio_valor
  icms_st_total?: number // Deprecado - usar icms_st_valor
  icms_st_recolher?: number // Deprecado - usar st_valor
  aliquota_icms?: number // Deprecado - usar icms_st_aliquota
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

export interface CategoriaFinanceira {
  id: number
  nome: string
  tipo: 'receita' | 'despesa' | 'ambos'
  cor?: string
  icone?: string
  descricao?: string
  ativo: boolean
  ordem: number
  created_at: string
  updated_at: string
}

export interface TransacaoRecorrente {
  id: number
  tipo: 'receita' | 'despesa'
  categoria_id?: number
  categoria?: CategoriaFinanceira
  descricao: string
  valor: number
  frequencia: 'diaria' | 'semanal' | 'quinzenal' | 'mensal' | 'bimestral' | 'trimestral' | 'semestral' | 'anual'
  dia_vencimento?: number
  data_inicio: string
  data_fim?: string
  proxima_geracao: string
  observacoes?: string
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface TransacaoFinanceira {
  id: number
  tipo: 'receita' | 'despesa'
  valor: number
  descricao: string
  categoria: string // Legacy text-based category
  categoria_id?: number
  categoria_detalhe?: CategoriaFinanceira
  venda_id?: number
  venda?: Venda
  venda_parcela_id?: number
  venda_parcela?: VendaParcela
  transacao_recorrente_id?: number
  transacao_recorrente?: TransacaoRecorrente
  data_transacao: string
  observacoes?: string
  created_at: string
  updated_at: string
}

export interface VendaParcela {
  id: number
  venda_id: number
  numero_parcela: number
  valor_parcela: number
  data_vencimento: string
  data_pagamento?: string | null
  status: 'pendente' | 'pago' | 'atrasado' | 'cancelado'
  transacao_id?: number | null
  transacao?: TransacaoFinanceira
  observacoes?: string
  created_at: string
  updated_at: string
  venda?: Venda
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
  vendedor_id?: number | null
  ativo?: boolean
  // Geolocation fields (auto-filled)
  latitude?: number | null
  longitude?: number | null
  geocoded_at?: string | null
  geocoding_source?: 'manual' | 'api' | 'cep' | 'brasilapi' | 'nominatim'
  geocoding_precision?: 'exact' | 'street' | 'city' | 'approximate'
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
  // Impostos
  ipi?: number // Alíquota de IPI (0-100)
  icms?: number // Alíquota de ICMS (0-100) - Informativo
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

export interface CondicaoPagamento {
  id: number
  nome: string
  descricao?: string
  dias_parcelas: number[] // Array de dias [15, 30, 45]
  ativo: boolean
  ordem: number
  created_at: string
  updated_at: string
}

export interface CondicaoPagamentoForm {
  nome: string
  descricao?: string
  dias_parcelas: number[]
  ativo?: boolean
  ordem?: number
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
  data_pagamento?: string // Data de pagamento (substitui prazo_pagamento)
  condicao_pagamento_id?: number | null // Condição de pagamento selecionada
  imposto_percentual?: number
  forma_pagamento: FormaPagamento
  origem_venda: OrigemVenda
  uf_destino?: string // UF de destino da venda (para cálculo ICMS-ST)
  observacoes?: string
  parcelas?: VendaParcelaInput[] // Parcelas de pagamento
  sem_impostos?: boolean // Indica se a venda é sem impostos (não calcula IPI, ICMS, ST) - DEPRECADO, usar sem_ipi e sem_st
  sem_ipi?: boolean // Indica se a venda é sem IPI
  sem_st?: boolean // Indica se a venda é sem ST
}

export interface VendaParcelaInput {
  numero_parcela: number
  valor_parcela: number
  data_vencimento: string
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
  categoria?: string // Legacy support
  categoria_id?: number
  venda_id?: number
  data_transacao: string
  observacoes?: string
}

export interface CategoriaFinanceiraForm {
  nome: string
  tipo: 'receita' | 'despesa' | 'ambos'
  cor?: string
  icone?: string
  descricao?: string
  ativo?: boolean
  ordem?: number
}

export interface TransacaoRecorrenteForm {
  tipo: 'receita' | 'despesa'
  categoria_id?: number
  descricao: string
  valor: number
  frequencia: 'diaria' | 'semanal' | 'quinzenal' | 'mensal' | 'bimestral' | 'trimestral' | 'semestral' | 'anual'
  dia_vencimento?: number
  data_inicio: string
  data_fim?: string
  observacoes?: string
  ativo?: boolean
}

export interface VendedorForm {
  nome: string
  email?: string
  telefone?: string
  cpf?: string
  comissao: number
  ativo?: boolean
  usuario_id?: number | null
}

// Tipos para detalhes do vendedor (modal)
export interface VendedorMetricas {
  faturamentoTotal: number
  faturamentoPeriodoAnterior: number
  variacaoFaturamento: number
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
  totalPages: number
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
  despesas?: number
  impostos?: number
}

// Tipos para financeiro
export interface FinanceiroMetricMonthly {
  mes: string
  receitas: number
  despesas: number
}

export interface FinanceiroMetricDaily {
  data: string
  receitas: number
  despesas: number // Já vem negativo da API
  fluxoCaixa: number
  saldoAcumulado: number
  temMovimentacao: boolean
  ehProjecao: boolean // true se for projeção futura
}

export interface FinanceiroMetrics {
  receita: number
  despesas: number
  lucro: number
  margem: number
  grafico_mensal: FinanceiroMetricMonthly[]
  grafico_diario: FinanceiroMetricDaily[]
}

// ============================================================================
// TIPOS PARA SISTEMA DE IMPOSTOS (IPI, ICMS, ST)
// ============================================================================

// Configuração de colunas visíveis na tabela de vendas
export interface VendaTabelaColunasVisiveis {
  produto: boolean
  quantidade: boolean
  precoUnitario: boolean
  subtotalBruto: boolean
  descontoProporcional: boolean
  subtotalLiquido: boolean
  ipiAliquota: boolean
  ipiValor: boolean
  icmsAliquota: boolean
  icmsValor: boolean
  stAliquota: boolean
  stValor: boolean
  totalItem: boolean
  acoes: boolean
}

// Default de colunas visíveis
export const COLUNAS_VISIVEIS_DEFAULT: VendaTabelaColunasVisiveis = {
  produto: true,
  quantidade: true,
  precoUnitario: true,
  subtotalBruto: true,
  descontoProporcional: true,
  subtotalLiquido: true,
  ipiAliquota: false, // Oculta por padrão
  ipiValor: true,
  icmsAliquota: false, // Oculta por padrão
  icmsValor: true,
  stAliquota: false, // Oculta por padrão
  stValor: true,
  totalItem: true,
  acoes: true
}

// Labels das colunas
export const LABELS_COLUNAS: Record<keyof VendaTabelaColunasVisiveis, string> = {
  produto: 'Produto',
  quantidade: 'Quantidade',
  precoUnitario: 'Preço Unitário',
  subtotalBruto: 'Subtotal Bruto',
  descontoProporcional: 'Desconto Prop.',
  subtotalLiquido: 'Subtotal Líquido',
  ipiAliquota: 'IPI %',
  ipiValor: 'IPI R$',
  icmsAliquota: 'ICMS %',
  icmsValor: 'ICMS R$',
  stAliquota: 'ST %',
  stValor: 'ST R$',
  totalItem: 'Total',
  acoes: 'Ações'
}

// Item calculado para vendas (usado nas funções de cálculo)
export interface ItemCalculado {
  produto_id: number
  produto_nome: string
  quantidade: number
  preco_unitario: number
  subtotal_bruto: number
  desconto_proporcional: number
  subtotal_liquido: number
  ipi_aliquota: number
  ipi_valor: number
  icms_aliquota: number
  icms_valor: number
  st_aliquota: number
  st_valor: number
  total_item: number
}

// Totais da venda (usado nas funções de cálculo)
export interface TotaisVenda {
  total_produtos_bruto: number
  desconto_total: number
  total_produtos_liquido: number
  total_ipi: number
  total_icms: number // Informativo, NÃO incluído no total
  total_st: number
  total_geral: number // Subtotal + IPI + ST (sem ICMS)
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
  mva_manual: number | null
  aliquota_icms_manual: number | null
  frete_padrao: number
  outras_despesas: number
  ativo: boolean
  created_at: string
  updated_at: string

  // Relações
  produto?: Produto
}

export interface ImpostoProdutoForm {
  produto_id: number
  ncm?: string
  cest?: string
  origem_mercadoria: number
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

// ============================================================================
// TIPOS PARA INTEGRAÇÃO BLING ERP
// ============================================================================

export interface BlingVenda {
  id: number
  bling_id: number
  numero_pedido: string
  numero_pedido_loja?: string
  data_pedido: string
  data_saida?: string
  contato_nome: string
  contato_documento?: string
  contato_email?: string
  contato_telefone?: string
  bling_contato_id?: number
  canal_venda?: string
  loja_id?: number
  loja_nome?: string
  total_produtos: number
  total_desconto: number
  total_frete: number
  total_outras_despesas?: number
  valor_total: number
  forma_pagamento?: string
  situacao_id?: number
  situacao_nome?: string
  bling_vendedor_id?: number
  vendedor_nome?: string
  observacoes?: string
  observacoes_internas?: string
  intermediador_cnpj?: string
  intermediador_usuario?: string
  taxa_comissao?: number
  custo_frete_marketplace?: number
  endereco_entrega?: Record<string, unknown>
  transporte?: Record<string, unknown>
  bling_nfe_id?: number
  venda_local_id?: number
  itens?: BlingVendaItem[]
  raw_data?: Record<string, unknown>
  synced_at: string
  updated_at?: string
}

export interface BlingVendaItem {
  id: number
  bling_venda_id?: number
  bling_produto_id?: number
  codigo_produto?: string
  descricao: string
  quantidade: number
  valor_unitario: number
  valor_desconto?: number
  valor_total: number
  produto_local_id?: number
}

export interface BlingNfe {
  id: number
  bling_id: number
  numero?: number
  serie?: number
  chave_acesso?: string
  tipo: number
  situacao: number
  situacao_nome?: string
  data_emissao?: string
  data_operacao?: string
  bling_contato_id?: number
  contato_nome?: string
  contato_documento?: string
  contato_endereco?: Record<string, unknown>
  valor_produtos?: number
  valor_frete?: number
  valor_icms?: number
  valor_ipi?: number
  valor_total: number
  xml_url?: string
  danfe_url?: string
  pdf_url?: string
  finalidade?: number
  bling_pedido_id?: number
  bling_venda_id?: number
  itens?: BlingNfeItem[]
  raw_data?: Record<string, unknown>
  synced_at: string
  updated_at?: string
}

export interface BlingNfeItem {
  id: number
  bling_nfe_id?: number
  codigo?: string
  descricao: string
  unidade?: string
  quantidade: number
  valor_unitario: number
  valor_total: number
  tipo?: string
  ncm?: string
  cfop?: string
  origem?: number
  gtin?: string
  impostos?: Record<string, unknown>
  produto_local_id?: number
}

export interface BlingStatus {
  connected: boolean
  token_valid?: boolean
  api_reachable?: boolean
  token_expires_at?: string
  last_sync_vendas?: string
  last_sync_nfe?: string
  total_vendas_sync: number
  total_nfe_sync: number
  api_error?: string
}

export interface BlingSyncResult {
  vendas_synced?: number
  nfe_synced?: number
  errors: string[]
}
