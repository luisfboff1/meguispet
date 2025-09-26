import axios from 'axios'
import type { 
  Usuario, 
  Cliente, 
  Produto, 
  Vendedor, 
  Venda, 
  ApiResponse, 
  PaginatedResponse 
} from '@/types'

// 🔌 CONFIGURAÇÃO DA API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://sistemameguis.com.br/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 🔐 INTERCEPTOR PARA AUTENTICAÇÃO
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

// 📊 DASHBOARD
export const dashboardService = {
  async getMetrics(): Promise<ApiResponse> {
    const response = await api.get('/dashboard/metrics.php')
    return response.data
  },

  async getRecentSales(): Promise<ApiResponse> {
    const response = await api.get('/dashboard/recent-sales.php')
    return response.data
  },

  async getTopProducts(): Promise<ApiResponse> {
    const response = await api.get('/dashboard/top-products.php')
    return response.data
  },

  async getVendas7Dias(): Promise<ApiResponse> {
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

  async create(cliente: Omit<Cliente, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Cliente>> {
    const response = await api.post('/clientes.php', cliente)
    return response.data
  },

  async update(id: number, cliente: Partial<Cliente>): Promise<ApiResponse<Cliente>> {
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
    const response = await api.get(`/produtos.php?id=${id}`)
    return response.data
  },

  async create(produto: Omit<Produto, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Produto>> {
    const response = await api.post('/produtos.php', produto)
    return response.data
  },

  async update(id: number, produto: Partial<Produto>): Promise<ApiResponse<Produto>> {
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

  async create(venda: Omit<Venda, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Venda>> {
    const response = await api.post('/vendas.php', venda)
    return response.data
  },

  async update(id: number, venda: Partial<Venda>): Promise<ApiResponse<Venda>> {
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
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token')
    }
  },

  async getProfile(): Promise<ApiResponse<Usuario>> {
    const response = await api.get('/auth/profile.php')
    return response.data
  }
}

export default api
