import { env } from '@/config/env'

// Tipos base para respostas da API
interface ApiResponse<T = any> {
    success: boolean
    data?: T
    error?: string
}

// Função auxiliar para fazer requisições
async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    try {
        const token = localStorage.getItem('token')
        const headers = {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...(options?.headers || {})
        }

        const response = await fetch(`${env.API_URL}/${endpoint}`, {
            ...options,
            headers
        })

        const data = await response.json()
        return data
    } catch (error) {
        return {
            success: false,
            error: 'Erro ao conectar com o servidor'
        }
    }
}

// API de autenticação
export const authApi = {
    async login(email: string, password: string) {
        return fetchApi('auth.php', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        })
    },

    async resetPassword(email: string) {
        return fetchApi('password_reset.php', {
            method: 'POST',
            body: JSON.stringify({ email })
        })
    }
}

// API de produtos
export const produtosApi = {
    async listar() {
        return fetchApi('produtos.php')
    },

    async criar(produto: any) {
        return fetchApi('produtos.php', {
            method: 'POST',
            body: JSON.stringify(produto)
        })
    },

    async atualizar(id: number, produto: any) {
        return fetchApi('produtos.php', {
            method: 'PUT',
            body: JSON.stringify({ id, ...produto })
        })
    },

    async deletar(id: number) {
        return fetchApi('produtos.php', {
            method: 'DELETE',
            body: JSON.stringify({ id })
        })
    }
}

// API de vendas
export const vendasApi = {
    async listar() {
        return fetchApi('vendas.php')
    },

    async criar(venda: any) {
        return fetchApi('vendas.php', {
            method: 'POST',
            body: JSON.stringify(venda)
        })
    }
}

// API de clientes
export const clientesApi = {
    async listar() {
        return fetchApi('clientes.php')
    },

    async criar(cliente: any) {
        return fetchApi('clientes.php', {
            method: 'POST',
            body: JSON.stringify(cliente)
        })
    },

    async atualizar(id: number, cliente: any) {
        return fetchApi('clientes.php', {
            method: 'PUT',
            body: JSON.stringify({ id, ...cliente })
        })
    },

    async deletar(id: number) {
        return fetchApi('clientes.php', {
            method: 'DELETE',
            body: JSON.stringify({ id })
        })
    }
}

// API de vendedores
export const vendedoresApi = {
    async listar() {
        return fetchApi('vendedores.php')
    },

    async criar(vendedor: any) {
        return fetchApi('vendedores.php', {
            method: 'POST',
            body: JSON.stringify(vendedor)
        })
    },

    async atualizar(id: number, vendedor: any) {
        return fetchApi('vendedores.php', {
            method: 'PUT',
            body: JSON.stringify({ id, ...vendedor })
        })
    },

    async deletar(id: number) {
        return fetchApi('vendedores.php', {
            method: 'DELETE',
            body: JSON.stringify({ id })
        })
    }
}
