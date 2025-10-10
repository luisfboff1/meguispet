import axios, { type InternalAxiosRequestConfig } from 'axios'
import type {
  Usuario,
  Cliente,
  ClienteForm as ClienteFormPayload,
  Produto,
  ProdutoForm as ProdutoFormPayload,
  Vendedor,
  Venda,
  VendaForm as VendaFormPayload,
  Fornecedor,
  MovimentacaoEstoque,
  MovimentacaoForm as MovimentacaoFormPayload,
  FinanceiroMetrics,
  TransacaoFinanceira,
  ApiResponse,
  PaginatedResponse,
  DashboardMetric,
  DashboardTopProduct,
  DashboardVendasDia
} from '@/types'

// 🔌 CONFIGURAÇÃO DA API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://gestao.meguispet.com/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 🔐 INTERCEPTOR PARA AUTENTICAÇÃO
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const token = localStorage.getItem('token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
  } catch (error) {
    // Ignorar erros de localStorage em SSR
    console.warn('Erro ao acessar localStorage:', error)
  }
  return config
})

// 📊 DASHBOARD
export const dashboardService = {
  async getMetrics(): Promise<ApiResponse<DashboardMetric[]>> {
    const response = await api.get('/dashboard/metrics.php')
    return response.data
  },

  async getRecentSales(): Promise<ApiResponse> {
    const response = await api.get('/dashboard/recent-sales.php')
    return response.data
  },

  async getTopProducts(): Promise<ApiResponse<DashboardTopProduct[]>> {
    const response = await api.get('/dashboard/top-products.php')
    return response.data
  },

  async getVendas7Dias(): Promise<ApiResponse<DashboardVendasDia[]>> {
    const response = await api.get('/dashboard/vendas-7-dias.php')
    return response.data
  }
}

// 👥 CLIENTES
export const clientesService = {
  async getAll(page = 1, limit = 10): Promise<PaginatedResponse<Cliente>> {
    const response = await api.get(`/clientes.php?page=${page}&limit=${limit}`)
    return response.data
  },

  async getById(id: number): Promise<ApiResponse<Cliente>> {
    const response = await api.get(`/clientes.php?id=${id}`)
    return response.data
  },

  async create(cliente: ClienteFormPayload): Promise<ApiResponse<Cliente>> {
    const response = await api.post('/clientes.php', cliente)
    return response.data
  },

  async update(id: number, cliente: Partial<Cliente> | ClienteFormPayload): Promise<ApiResponse<Cliente>> {
    const response = await api.put(`/clientes.php?id=${id}`, cliente)
    return response.data
  },

  async delete(id: number): Promise<ApiResponse> {
    const response = await api.delete(`/clientes.php?id=${id}`)
    return response.data
  }
}

// 📦 PRODUTOS
export const produtosService = {
  async getAll(page = 1, limit = 10): Promise<PaginatedResponse<Produto>> {
    const response = await api.get(`/produtos.php?page=${page}&limit=${limit}`)
    return response.data
  },

  async getById(id: number): Promise<ApiResponse<Produto>> {
    const response = await api.get(`/produtos.php/${id}`)
    return response.data
  },

  async create(produto: ProdutoFormPayload): Promise<ApiResponse<Produto>> {
    const response = await api.post('/produtos.php', produto)
    return response.data
  },

  async update(id: number, produto: Partial<Produto> | ProdutoFormPayload): Promise<ApiResponse<Produto>> {
    const response = await api.put(`/produtos.php?id=${id}`, produto)
    return response.data
  },

  async delete(id: number): Promise<ApiResponse> {
    const response = await api.delete(`/produtos.php?id=${id}`)
    return response.data
  },

  async updateStock(id: number, quantidade: number): Promise<ApiResponse> {
    const response = await api.patch(`/produtos.php?id=${id}`, { estoque: quantidade })
    return response.data
  },

  async getEstoqueRelatorio(
    page = 1,
    limit = 50,
    filters?: Record<string, string | number | boolean | undefined>
  ): Promise<ApiResponse> {
    let url = `/estoque-relatorio.php?page=${page}&limit=${limit}`
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key]) url += `&${key}=${filters[key]}`
      })
    }
    const response = await api.get(url)
    return response.data
  }
}

// 🛒 VENDAS
export const vendasService = {
  async getAll(page = 1, limit = 10): Promise<PaginatedResponse<Venda>> {
    const response = await api.get(`/vendas.php?page=${page}&limit=${limit}`)
    return response.data
  },

  async getById(id: number): Promise<ApiResponse<Venda>> {
    const response = await api.get(`/vendas.php?id=${id}`)
    return response.data
  },

  async create(venda: VendaFormPayload): Promise<ApiResponse<Venda>> {
    const response = await api.post('/vendas.php', venda)
    return response.data
  },

  async update(id: number, venda: Partial<Venda> | VendaFormPayload): Promise<ApiResponse<Venda>> {
    const response = await api.put(`/vendas.php?id=${id}`, venda)
    return response.data
  },

  async delete(id: number): Promise<ApiResponse> {
    const response = await api.delete(`/vendas.php?id=${id}`)
    return response.data
  }
}

// 👨‍💼 VENDEDORES
export const vendedoresService = {
  async getAll(page = 1, limit = 10): Promise<PaginatedResponse<Vendedor>> {
    const response = await api.get(`/vendedores.php?page=${page}&limit=${limit}`)
    return response.data
  },

  async getById(id: number): Promise<ApiResponse<Vendedor>> {
    const response = await api.get(`/vendedores.php?id=${id}`)
    return response.data
  },

  async create(vendedor: Omit<Vendedor, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Vendedor>> {
    const response = await api.post('/vendedores.php', vendedor)
    return response.data
  },

  async update(id: number, vendedor: Partial<Vendedor>): Promise<ApiResponse<Vendedor>> {
    const response = await api.put(`/vendedores.php?id=${id}`, vendedor)
    return response.data
  },

  async delete(id: number): Promise<ApiResponse> {
    const response = await api.delete(`/vendedores.php?id=${id}`)
    return response.data
  }
}

// 👥 USUÁRIOS
export const usuariosService = {
  async getAll(page = 1, limit = 10): Promise<PaginatedResponse<Usuario>> {
    const response = await api.get(`/usuarios.php?page=${page}&limit=${limit}`)
    return response.data
  },

  async getById(id: number): Promise<ApiResponse<Usuario>> {
    const response = await api.get(`/usuarios.php?id=${id}`)
    return response.data
  },

  async create(usuario: Omit<Usuario, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Usuario>> {
    const response = await api.post('/usuarios.php', usuario)
    return response.data
  },

  async update(id: number, usuario: Partial<Usuario>): Promise<ApiResponse<Usuario>> {
    const response = await api.put(`/usuarios.php?id=${id}`, usuario)
    return response.data
  },

  async delete(id: number): Promise<ApiResponse> {
    const response = await api.delete(`/usuarios.php?id=${id}`)
    return response.data
  }
}

// 🔐 AUTENTICAÇÃO
export const authService = {
  async login(email: string, password: string): Promise<ApiResponse<{ token: string; user: Usuario }>> {
    const response = await api.post('/auth.php', { email, password })
    return response.data
  },

  async logout(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem('token')
      }
    } catch (error) {
      console.warn('Erro ao acessar localStorage:', error)
    }
  },

  async getProfile(): Promise<ApiResponse<Usuario>> {
    const response = await api.get('/auth/profile.php')
    return response.data
  }
}

// 🚚 FORNECEDORES
export const fornecedoresService = {
  async getAll(page = 1, limit = 10): Promise<PaginatedResponse<Fornecedor>> {
    const response = await api.get(`/fornecedores.php?page=${page}&limit=${limit}`)
    return response.data
  },

  async getById(id: number): Promise<ApiResponse<Fornecedor>> {
    const response = await api.get(`/fornecedores.php/${id}`)
    return response.data
  },

  async create(fornecedor: Omit<Fornecedor, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Fornecedor>> {
    const response = await api.post('/fornecedores.php', fornecedor)
    return response.data
  },

  async update(id: number, fornecedor: Partial<Fornecedor>): Promise<ApiResponse<Fornecedor>> {
    const response = await api.put(`/fornecedores.php/${id}`, fornecedor)
    return response.data
  },

  async delete(id: number): Promise<ApiResponse> {
    const response = await api.delete(`/fornecedores.php/${id}`)
    return response.data
  }
}

// 📦 MOVIMENTAÇÕES DE ESTOQUE
export const movimentacoesService = {
  async getAll(page = 1, limit = 10, tipo?: string, status?: string): Promise<PaginatedResponse<MovimentacaoEstoque>> {
    let url = `/movimentacoes.php?page=${page}&limit=${limit}`
    if (tipo) url += `&tipo=${tipo}`
    if (status) url += `&status=${status}`
    
    const response = await api.get(url)
    return response.data
  },

  async getById(id: number): Promise<ApiResponse<MovimentacaoEstoque>> {
    const response = await api.get(`/movimentacoes.php/${id}`)
    return response.data
  },

  async create(movimentacao: MovimentacaoFormPayload): Promise<ApiResponse<MovimentacaoEstoque>> {
    const response = await api.post('/movimentacoes.php', movimentacao)
    return response.data
  },

  async updateStatus(id: number, status: string): Promise<ApiResponse> {
    const response = await api.put(`/movimentacoes.php/${id}/status`, { id, status })
    return response.data
  }
}

// 💰 TRANSAÇÕES FINANCEIRAS
export const transacoesService = {
  async getAll(page = 1, limit = 10, tipo?: string, dataInicio?: string, dataFim?: string): Promise<PaginatedResponse<TransacaoFinanceira>> {
    let url = `/transacoes.php?page=${page}&limit=${limit}`
    if (tipo) url += `&tipo=${tipo}`
    if (dataInicio) url += `&data_inicio=${dataInicio}`
    if (dataFim) url += `&data_fim=${dataFim}`
    
    const response = await api.get(url)
    return response.data
  },

  async getById(id: number): Promise<ApiResponse<TransacaoFinanceira>> {
    const response = await api.get(`/transacoes.php/${id}`)
    return response.data
  },

  async create(transacao: Omit<TransacaoFinanceira, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<TransacaoFinanceira>> {
    const response = await api.post('/transacoes.php', transacao)
    return response.data
  },

  async update(id: number, transacao: Partial<TransacaoFinanceira>): Promise<ApiResponse<TransacaoFinanceira>> {
    const response = await api.put(`/transacoes.php/${id}`, transacao)
    return response.data
  },

  async delete(id: number): Promise<ApiResponse> {
    const response = await api.delete(`/transacoes.php/${id}`)
    return response.data
  },

  async getMetricas(): Promise<ApiResponse<FinanceiroMetrics>> {
    const response = await api.get('/transacoes.php?metricas=1')
    return response.data
  }
}

export default api
