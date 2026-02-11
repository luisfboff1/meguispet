import { getSupabaseBrowser } from '@/lib/supabase'
import type {
  AgentConfig,
  AgentConfigForm,
  AgentConversation,
  AgentConversationForm,
  AgentMessage,
  ApiResponse,
  PaginatedResponse,
} from '@/types'

function getClient() {
  return getSupabaseBrowser()
}

export const agenteService = {
  // ============================================================
  // CONFIGURACAO
  // ============================================================

  async getConfig(): Promise<ApiResponse<AgentConfig>> {
    try {
      const supabase = getClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { success: false, error: 'Nao autenticado' }

      const res = await fetch('/api/agente/config', {
        credentials: 'include',
      })
      return await res.json()
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar configuracao',
      }
    }
  },

  async saveConfig(config: AgentConfigForm): Promise<ApiResponse<AgentConfig>> {
    try {
      const res = await fetch('/api/agente/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(config),
      })
      return await res.json()
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao salvar configuracao',
      }
    }
  },

  // ============================================================
  // CONVERSAS
  // ============================================================

  async getConversations(
    page = 1,
    limit = 20
  ): Promise<PaginatedResponse<AgentConversation>> {
    try {
      const res = await fetch(
        `/api/agente/conversations?page=${page}&limit=${limit}`,
        { credentials: 'include' }
      )
      return await res.json()
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar conversas',
        pagination: { page, limit, total: 0, pages: 0 },
      }
    }
  },

  async createConversation(
    form?: AgentConversationForm
  ): Promise<ApiResponse<AgentConversation>> {
    try {
      const res = await fetch('/api/agente/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form || {}),
      })
      return await res.json()
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao criar conversa',
      }
    }
  },

  async updateConversation(
    id: string,
    data: Partial<Pick<AgentConversation, 'titulo' | 'is_pinned'>>
  ): Promise<ApiResponse<AgentConversation>> {
    try {
      const res = await fetch(`/api/agente/conversations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      })
      return await res.json()
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao atualizar conversa',
      }
    }
  },

  async deleteConversation(id: string): Promise<ApiResponse> {
    try {
      const res = await fetch(`/api/agente/conversations/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      return await res.json()
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao deletar conversa',
      }
    }
  },

  // ============================================================
  // MENSAGENS
  // ============================================================

  async getMessages(
    conversationId: string,
    page = 1,
    limit = 50
  ): Promise<PaginatedResponse<AgentMessage>> {
    try {
      const res = await fetch(
        `/api/agente/conversations/${conversationId}/messages?page=${page}&limit=${limit}`,
        { credentials: 'include' }
      )
      return await res.json()
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar mensagens',
        pagination: { page, limit, total: 0, pages: 0 },
      }
    }
  },

  // ============================================================
  // CHAT (SSE Streaming)
  // ============================================================

  async sendMessage(
    conversationId: string,
    message: string,
    onEvent: (event: Record<string, unknown>) => void,
    onDone: () => void,
    onError: (error: string) => void,
    signal?: AbortSignal
  ): Promise<void> {
    try {
      const res = await fetch('/api/agente/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ conversationId, message }),
        signal,
      })

      if (!res.ok) {
        const errorData = await res.json()
        onError(errorData.message || 'Erro ao enviar mensagem')
        return
      }

      if (!res.body) {
        onError('Resposta sem corpo')
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data: ')) continue

          const data = trimmed.slice(6)

          if (data === '[DONE]') {
            onDone()
            return
          }

          try {
            const parsed = JSON.parse(data)
            onEvent(parsed)
          } catch {
            // Skip non-JSON lines
          }
        }
      }

      onDone()
    } catch (error) {
      if (signal?.aborted) return
      onError(error instanceof Error ? error.message : 'Erro de conexao')
    }
  },
}
