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
  CategoriaFinanceira,
  CategoriaFinanceiraForm,
  TransacaoRecorrente,
  TransacaoRecorrenteForm,
  VendaParcela,
  VendaParcelaInput,
  ApiResponse,
  PaginatedResponse,
  DashboardMetric,
  DashboardTopProduct,
  DashboardVendasDia,
  FormaPagamentoRegistro,
  CondicaoPagamento,
  CondicaoPagamentoForm,
  Estoque
} from '@/types'

// 🔌 CONFIGURAÇÃO DA API
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || '/api').replace(/\/$/, '')

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Increased to 30 seconds for slow connections
  headers: {
    'Content-Type': 'application/json',
  },
})

if (process.env.NODE_ENV === 'development') {
  api.interceptors.request.use(config => {
    const payloadPreview = typeof config.data === 'string' ? config.data : JSON.stringify(config.data)
    return config
  })

  api.interceptors.response.use(
    response => {
      return response
    },
    error => {
      if (error.response) {
      } else {
      }
      return Promise.reject(error)
    }
  )
}

// 🔐 INTERCEPTOR PARA AUTENTICAÇÃO SUPABASE
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  try {
    if (typeof window !== 'undefined') {
      // Get Supabase session from localStorage
      const supabaseSession = localStorage.getItem('sb-' + process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0] + '-auth-token')
      
      if (supabaseSession) {
        try {
          const session = JSON.parse(supabaseSession)
          if (session?.access_token) {
            config.headers.Authorization = `Bearer ${session.access_token}`
          }
        } catch (parseError) {
        }
      }
      
      // Fallback: check for direct token storage (backwards compatibility)
      const token = localStorage.getItem('token')
      if (token && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
  } catch (error) {
    // Ignorar erros de localStorage em SSR
  }
  return config
})

// 📊 DASHBOARD
export const dashboardService = {
  async getMetrics(): Promise<ApiResponse<DashboardMetric[]>> {
    const response = await api.get('/dashboard/metrics')
    return response.data
  },

  async getRecentSales(): Promise<ApiResponse> {
    const response = await api.get('/dashboard/recent-sales')
    return response.data
  },

  async getTopProducts(): Promise<ApiResponse<DashboardTopProduct[]>> {
    const response = await api.get('/dashboard/top-products')
    return response.data
  },

  async getVendasPeriodo(days: number = 7): Promise<ApiResponse<DashboardVendasDia[]>> {
    const response = await api.get(`/dashboard/vendas-7-dias?days=${days}`)
    return response.data
  },

  // Backwards compatibility
  async getVendas7Dias(): Promise<ApiResponse<DashboardVendasDia[]>> {
    return this.getVendasPeriodo(7)
  }
}

// 👥 CLIENTES
export const clientesService = {
  async getAll(page = 1, limit = 10, includeInactive = false): Promise<PaginatedResponse<Cliente>> {
    const response = await api.get(`/clientes?page=${page}&limit=${limit}&includeInactive=${includeInactive}`)
    return response.data
  },

  async getById(id: number): Promise<ApiResponse<Cliente>> {
    const response = await api.get(`/clientes?id=${id}`)
    return response.data
  },

  async create(cliente: ClienteFormPayload): Promise<ApiResponse<Cliente>> {
    const response = await api.post('/clientes', cliente)
    return response.data
  },

  async update(id: number, cliente: Partial<Cliente> | ClienteFormPayload): Promise<ApiResponse<Cliente>> {
    const response = await api.put(`/clientes?id=${id}`, { ...cliente, id })
    return response.data
  },

  async delete(id: number): Promise<ApiResponse> {
    const response = await api.delete(`/clientes?id=${id}`)
    return response.data
  },

  async reactivate(id: number): Promise<ApiResponse<Cliente>> {
    const response = await api.put(`/clientes?id=${id}`, { id, ativo: true })
    return response.data
  }
}

// 📦 PRODUTOS
export const produtosService = {
  async getAll(page = 1, limit = 10): Promise<PaginatedResponse<Produto>> {
    const response = await api.get(`/produtos?page=${page}&limit=${limit}`)
    return response.data
  },

  async getById(id: number): Promise<ApiResponse<Produto>> {
    // Try Node-style REST first (/produtos/:id), fall back to query-style for legacy PHP endpoints
    try {
      const response = await api.get(`/produtos/${id}`)
      return response.data
    } catch (err) {
      const response = await api.get(`/produtos?id=${id}`)
      return response.data
    }
  },

  async create(produto: ProdutoFormPayload): Promise<ApiResponse<Produto>> {
    const response = await api.post('/produtos', produto)
    return response.data
  },

  async update(id: number, produto: Partial<Produto> | ProdutoFormPayload): Promise<ApiResponse<Produto>> {
    const response = await api.put(`/produtos?id=${id}`, { ...produto, id })
    return response.data
  },

  async delete(id: number): Promise<ApiResponse> {
    const response = await api.delete(`/produtos?id=${id}`)
    return response.data
  },

  async updateStock(id: number, quantidade: number): Promise<ApiResponse> {
    const response = await api.patch(`/produtos?id=${id}`, { estoque: quantidade })
    return response.data
  },

  async getEstoqueRelatorio(
    page = 1,
    limit = 50,
    filters?: Record<string, string | number | boolean | undefined>
  ): Promise<ApiResponse> {
    let url = `/estoque-relatorio?page=${page}&limit=${limit}`
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key]) url += `&${key}=${filters[key]}`
      })
    }
    const response = await api.get(url)
    return response.data
  }
}

// Histórico de preços
export const historicoPrecosService = {
  async getByProdutoId(produtoId: number, limit = 20): Promise<ApiResponse> {
    // Node-style endpoint (no .php). The project no longer depends on PHP endpoints.
    const response = await api.get(`/historico-precos?produto_id=${produtoId}&limit=${limit}`)
    return response.data
  }
}

// 🛒 VENDAS
export const vendasService = {
  async getAll(page = 1, limit = 10): Promise<PaginatedResponse<Venda>> {
    const response = await api.get(`/vendas?page=${page}&limit=${limit}`)
    return response.data
  },

  async getById(id: number): Promise<ApiResponse<Venda>> {
    const response = await api.get(`/vendas/${id}`)
    return response.data
  },

  async create(venda: VendaFormPayload): Promise<ApiResponse<Venda>> {
    const response = await api.post('/vendas', venda)
    return response.data
  },

  async update(id: number, venda: Partial<Venda> | VendaFormPayload): Promise<ApiResponse<Venda>> {
    const response = await api.put(`/vendas?id=${id}`, { ...venda, id })
    return response.data
  },

  async delete(id: number): Promise<ApiResponse> {
    const response = await api.delete(`/vendas?id=${id}`)
    return response.data
  },

  async updateStatus(id: number, status: string): Promise<ApiResponse> {
    const response = await api.patch(`/vendas/${id}`, { status })
    return response.data
  }
}

// 🏬 ESTOQUES
export const estoquesService = {
  async getAll(activeOnly = false): Promise<ApiResponse<Estoque[]>> {
    const response = await api.get(`/estoques${activeOnly ? '?active=1' : ''}`)
    return response.data
  },

  async create(payload: { nome: string; descricao?: string; ativo?: number }): Promise<ApiResponse> {
    const response = await api.post('/estoques', payload)
    return response.data
  },

  async update(id: number, payload: { nome?: string; descricao?: string; ativo?: number }): Promise<ApiResponse> {
    const response = await api.put('/estoques', { id, ...payload })
    return response.data
  },

  async delete(id: number): Promise<ApiResponse> {
    const response = await api.delete(`/estoques?id=${id}`)
    return response.data
  }
}

// 💳 FORMAS DE PAGAMENTO
export const formasPagamentoService = {
  async getAll(activeOnly = false): Promise<ApiResponse<FormaPagamentoRegistro[]>> {
    const response = await api.get(`/formas_pagamento${activeOnly ? '?active=1' : ''}`)
    return response.data
  },

  async create(payload: { nome: string; ativo?: number; ordem?: number }): Promise<ApiResponse> {
    const response = await api.post('/formas_pagamento', payload)
    return response.data
  },

  async update(id: number, payload: { nome?: string; ativo?: number; ordem?: number }): Promise<ApiResponse> {
    const response = await api.put('/formas_pagamento', { id, ...payload })
    return response.data
  },

  async delete(id: number): Promise<ApiResponse> {
    const response = await api.delete(`/formas_pagamento?id=${id}`)
    return response.data
  }
}

// 💳 CONDIÇÕES DE PAGAMENTO
export const condicoesPagamentoService = {
  async getAll(activeOnly = false): Promise<ApiResponse<CondicaoPagamento[]>> {
    const response = await api.get(`/condicoes_pagamento${activeOnly ? '?active=1' : ''}`)
    return response.data
  },

  async getById(id: number): Promise<ApiResponse<CondicaoPagamento>> {
    const response = await api.get(`/condicoes_pagamento?id=${id}`)
    return response.data
  },

  async create(payload: CondicaoPagamentoForm): Promise<ApiResponse<CondicaoPagamento>> {
    const response = await api.post('/condicoes_pagamento', payload)
    return response.data
  },

  async update(id: number, payload: Partial<CondicaoPagamentoForm>): Promise<ApiResponse<CondicaoPagamento>> {
    const response = await api.put('/condicoes_pagamento', { id, ...payload })
    return response.data
  },

  async delete(id: number): Promise<ApiResponse> {
    const response = await api.delete(`/condicoes_pagamento?id=${id}`)
    return response.data
  }
}

// 👨‍💼 VENDEDORES
export const vendedoresService = {
  async getAll(page = 1, limit = 10): Promise<PaginatedResponse<Vendedor>> {
    const response = await api.get(`/vendedores?page=${page}&limit=${limit}`)
    return response.data
  },

  async getById(id: number): Promise<ApiResponse<Vendedor>> {
    const response = await api.get(`/vendedores?id=${id}`)
    return response.data
  },

  async create(vendedor: Omit<Vendedor, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Vendedor>> {
    const response = await api.post('/vendedores', vendedor)
    return response.data
  },

  async update(id: number, vendedor: Partial<Vendedor>): Promise<ApiResponse<Vendedor>> {
    const response = await api.put(`/vendedores?id=${id}`, vendedor)
    return response.data
  },

  async delete(id: number): Promise<ApiResponse> {
    const response = await api.delete(`/vendedores?id=${id}`)
    return response.data
  }
}

// 👥 USUÁRIOS
export const usuariosService = {
  async getAll(page = 1, limit = 10): Promise<PaginatedResponse<Usuario>> {
    const response = await api.get(`/usuarios?page=${page}&limit=${limit}`)
    return response.data
  },

  async getById(id: number): Promise<ApiResponse<Usuario>> {
    const response = await api.get(`/usuarios?id=${id}`)
    return response.data
  },

  async create(usuario: Omit<Usuario, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Usuario>> {
    const response = await api.post('/usuarios', usuario)
    return response.data
  },

  async update(id: number, usuario: Partial<Usuario>): Promise<ApiResponse<Usuario>> {
    const response = await api.put(`/usuarios?id=${id}`, usuario)
    return response.data
  },

  async delete(id: number): Promise<ApiResponse> {
    const response = await api.delete(`/usuarios?id=${id}`)
    return response.data
  },

  async updatePassword(userId: number, newPassword: string): Promise<ApiResponse> {
    const response = await api.put('/usuarios/update-password', {
      user_id: userId,
      new_password: newPassword,
    })
    return response.data
  }
}

// 🔐 AUTENTICAÇÃO
export const authService = {
  async login(email: string, password: string): Promise<ApiResponse<{ token: string; user: Usuario; refresh_token?: string; expires_at?: number }>> {
    const response = await api.post('/auth', { email, password })
    return response.data
  },

  async logout(): Promise<void> {
    try {
      // Call the logout endpoint to sign out from Supabase
      await api.post('/auth/logout')
      
      if (typeof window !== 'undefined') {
        // Remove legacy token
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        localStorage.removeItem('meguispet-auth-store')
        
        // Remove Supabase session
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        if (supabaseUrl) {
          const projectRef = supabaseUrl.split('//')[1]?.split('.')[0]
          if (projectRef) {
            localStorage.removeItem(`sb-${projectRef}-auth-token`)
          }
        }
      }
      
      if (typeof document !== 'undefined') {
        const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : ''
        document.cookie = `token=; Max-Age=0; Path=/; SameSite=Lax${secure}`
      }
    } catch (error) {
      // Continue with local cleanup even if server logout fails
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        localStorage.removeItem('meguispet-auth-store')
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        if (supabaseUrl) {
          const projectRef = supabaseUrl.split('//')[1]?.split('.')[0]
          if (projectRef) {
            localStorage.removeItem(`sb-${projectRef}-auth-token`)
          }
        }
      }
    }
  },

  async getProfile(): Promise<ApiResponse<Usuario>> {
    const response = await api.get('/auth/profile')
    return response.data
  },

  async signup(email: string, password: string, nome: string, role = 'user'): Promise<ApiResponse<{ user: Usuario; auth_user_id: string }>> {
    const response = await api.post('/auth/signup', { email, password, nome, role })
    return response.data
  }
}

// 🚚 FORNECEDORES
export const fornecedoresService = {
  async getAll(page = 1, limit = 10): Promise<PaginatedResponse<Fornecedor>> {
    const response = await api.get(`/fornecedores?page=${page}&limit=${limit}`)
    return response.data
  },

  async getById(id: number): Promise<ApiResponse<Fornecedor>> {
    const response = await api.get(`/fornecedores/${id}`)
    return response.data
  },

  async create(fornecedor: Omit<Fornecedor, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Fornecedor>> {
    const response = await api.post('/fornecedores', fornecedor)
    return response.data
  },

  async update(id: number, fornecedor: Partial<Fornecedor>): Promise<ApiResponse<Fornecedor>> {
    const response = await api.put(`/fornecedores/${id}`, fornecedor)
    return response.data
  },

  async delete(id: number): Promise<ApiResponse> {
    const response = await api.delete(`/fornecedores/${id}`)
    return response.data
  }
}

// 📦 MOVIMENTAÇÕES DE ESTOQUE
export const movimentacoesService = {
  async getAll(page = 1, limit = 10, tipo?: string, status?: string): Promise<PaginatedResponse<MovimentacaoEstoque>> {
    let url = `/movimentacoes?page=${page}&limit=${limit}`
    if (tipo) url += `&tipo=${tipo}`
    if (status) url += `&status=${status}`
    
    const response = await api.get(url)
    return response.data
  },

  async getById(id: number): Promise<ApiResponse<MovimentacaoEstoque>> {
    const response = await api.get(`/movimentacoes/${id}`)
    return response.data
  },

  async create(movimentacao: MovimentacaoFormPayload): Promise<ApiResponse<MovimentacaoEstoque>> {
    const response = await api.post('/movimentacoes', movimentacao)
    return response.data
  },

  async updateStatus(id: number, status: string): Promise<ApiResponse> {
    const response = await api.put(`/movimentacoes/${id}/status`, { id, status })
    return response.data
  }
}

// 💰 TRANSAÇÕES FINANCEIRAS
export const transacoesService = {
  async getAll(page = 1, limit = 10, tipo?: string, dataInicio?: string, dataFim?: string): Promise<PaginatedResponse<TransacaoFinanceira>> {
    let url = `/transacoes?page=${page}&limit=${limit}`
    if (tipo) url += `&tipo=${tipo}`
    if (dataInicio) url += `&data_inicio=${dataInicio}`
    if (dataFim) url += `&data_fim=${dataFim}`
    
    const response = await api.get(url)
    return response.data
  },

  async getById(id: number): Promise<ApiResponse<TransacaoFinanceira>> {
    const response = await api.get(`/transacoes/${id}`)
    return response.data
  },

  async create(transacao: any): Promise<ApiResponse<TransacaoFinanceira>> {
    const response = await api.post('/transacoes', transacao)
    return response.data
  },

  async update(id: number, transacao: any): Promise<ApiResponse<TransacaoFinanceira>> {
    const response = await api.put(`/transacoes/${id}`, { ...transacao, id })
    return response.data
  },

  async delete(id: number): Promise<ApiResponse> {
    const response = await api.delete(`/transacoes/${id}`)
    return response.data
  },

  async getMetricas(): Promise<ApiResponse<FinanceiroMetrics>> {
    const response = await api.get('/transacoes/metricas')
    return response.data
  }
}

// 📊 CATEGORIAS FINANCEIRAS
export const categoriasFinanceirasService = {
  async getAll(tipo?: string): Promise<ApiResponse<CategoriaFinanceira[]>> {
    let url = '/categorias-financeiras'
    if (tipo) url += `?tipo=${tipo}`
    
    const response = await api.get(url)
    return response.data
  },

  async getById(id: number): Promise<ApiResponse<CategoriaFinanceira>> {
    const response = await api.get(`/categorias-financeiras/${id}`)
    return response.data
  },

  async create(categoria: CategoriaFinanceiraForm): Promise<ApiResponse<CategoriaFinanceira>> {
    const response = await api.post('/categorias-financeiras', categoria)
    return response.data
  },

  async update(id: number, categoria: Partial<CategoriaFinanceiraForm>): Promise<ApiResponse<CategoriaFinanceira>> {
    const response = await api.put(`/categorias-financeiras/${id}`, { ...categoria, id })
    return response.data
  },

  async delete(id: number): Promise<ApiResponse> {
    const response = await api.delete(`/categorias-financeiras/${id}`)
    return response.data
  }
}

// 🔄 TRANSAÇÕES RECORRENTES
export const transacoesRecorrentesService = {
  async getAll(): Promise<ApiResponse<TransacaoRecorrente[]>> {
    const response = await api.get('/transacoes-recorrentes')
    return response.data
  },

  async getById(id: number): Promise<ApiResponse<TransacaoRecorrente>> {
    const response = await api.get(`/transacoes-recorrentes/${id}`)
    return response.data
  },

  async create(transacao: TransacaoRecorrenteForm): Promise<ApiResponse<TransacaoRecorrente>> {
    const response = await api.post('/transacoes-recorrentes', transacao)
    return response.data
  },

  async update(id: number, transacao: Partial<TransacaoRecorrenteForm>): Promise<ApiResponse<TransacaoRecorrente>> {
    const response = await api.put(`/transacoes-recorrentes/${id}`, { ...transacao, id })
    return response.data
  },

  async delete(id: number): Promise<ApiResponse> {
    const response = await api.delete(`/transacoes-recorrentes/${id}`)
    return response.data
  },

  async gerarTransacoes(): Promise<ApiResponse> {
    const response = await api.post('/transacoes-recorrentes/gerar')
    return response.data
  }
}

// 💰 PARCELAS DE VENDAS
export const vendaParcelasService = {
  async getByVendaId(vendaId: number): Promise<ApiResponse<VendaParcela[]>> {
    const response = await api.get(`/venda-parcelas/${vendaId}`)
    return response.data
  },

  async getById(id: number): Promise<ApiResponse<VendaParcela>> {
    const response = await api.get(`/venda-parcelas/parcela/${id}`)
    return response.data
  },

  async create(parcelas: VendaParcelaInput[], vendaId: number): Promise<ApiResponse<VendaParcela[]>> {
    const response = await api.post('/venda-parcelas', { vendaId, parcelas })
    return response.data
  },

  async update(id: number, parcela: Partial<VendaParcela>): Promise<ApiResponse<VendaParcela>> {
    const response = await api.put(`/venda-parcelas/${id}`, { ...parcela, id })
    return response.data
  },

  async updateDataVencimento(id: number, data_vencimento: string): Promise<ApiResponse<VendaParcela>> {
    const response = await api.patch(`/venda-parcelas/${id}/data-vencimento`, { data_vencimento })
    return response.data
  },

  async marcarComoPaga(id: number, data_pagamento: string): Promise<ApiResponse<VendaParcela>> {
    const response = await api.patch(`/venda-parcelas/${id}/pagar`, { data_pagamento })
    return response.data
  },

  async delete(id: number): Promise<ApiResponse> {
    const response = await api.delete(`/venda-parcelas/${id}`)
    return response.data
  }
}

export default api
