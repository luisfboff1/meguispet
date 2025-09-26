// 🏷️ TIPOS TYPESCRIPT - MEGUISPET SYSTEM
// Tipos globais para todo o sistema

export interface Usuario {
  id: number
  nome: string
  email: string
  tipo: 'admin' | 'vendedor' | 'usuario'
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface Cliente {
  id: number
  nome: string
  email: string
  telefone: string
  endereco?: string
  cidade?: string
  estado?: string
  cep?: string
  created_at: string
  updated_at: string
}

export interface Produto {
  id: number
  nome: string
  descricao?: string
  preco: number
  preco_custo: number
  categoria: string
  estoque: number
  estoque_minimo: number
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface Vendedor {
  id: number
  nome: string
  email: string
  telefone: string
  comissao: number
  meta_vendas?: number
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface Venda {
  id: number
  cliente_id: number
  vendedor_id: number
  total: number
  desconto?: number
  forma_pagamento: string
  status: 'pendente' | 'aprovada' | 'cancelada'
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

// Tipos para formulários
export interface LoginForm {
  email: string
  password: string
}

export interface ClienteForm {
  nome: string
  email: string
  telefone: string
  endereco?: string
  cidade?: string
  estado?: string
  cep?: string
}

export interface ProdutoForm {
  nome: string
  descricao?: string
  preco: number
  preco_custo: number
  categoria: string
  estoque: number
  estoque_minimo: number
  ativo: boolean
}

export interface VendaForm {
  cliente_id: number
  vendedor_id: number
  itens: {
    produto_id: number
    quantidade: number
    preco_unitario: number
  }[]
  desconto?: number
  forma_pagamento: string
  observacoes?: string
}

// Tipos para API
export interface ApiResponse<T = any> {
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
export interface TableColumn<T = any> {
  key: keyof T
  label: string
  render?: (value: any, item: T) => React.ReactNode
  sortable?: boolean
}

export interface FilterOption {
  key: string
  label: string
  type: 'text' | 'select' | 'date' | 'number'
  options?: { value: string; label: string }[]
}
