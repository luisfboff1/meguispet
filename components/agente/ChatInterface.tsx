import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Bot, Sparkles, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { ChatThinking } from './ChatThinking'
import { ConversationTabs } from './ConversationTabs'
import { TokenCounter } from './TokenCounter'
import { agenteService } from '@/services/agenteService'
import { useToast } from '@/components/ui/use-toast'
import type {
  AgentConversation,
  AgentMessage,
  AgentConfig,
} from '@/types'

interface ChatInterfaceProps {
  config: AgentConfig | null
  onGoToConfig: () => void
}

export function ChatInterface({ config, onGoToConfig }: ChatInterfaceProps) {
  const { toast } = useToast()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // State
  const [conversations, setConversations] = useState<AgentConversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<AgentMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [thinkingStatus, setThinkingStatus] = useState('')
  const [streamingMessage, setStreamingMessage] = useState('')
  const [streamingToolCalls, setStreamingToolCalls] = useState<AgentMessage['tool_calls']>(null)
  const [streamingSqlQueries, setStreamingSqlQueries] = useState<AgentMessage['sql_queries']>(null)
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)

  // Token tracking
  const totalInputTokens = conversations.find((c) => c.id === activeConversationId)?.total_input_tokens || 0
  const totalOutputTokens = conversations.find((c) => c.id === activeConversationId)?.total_output_tokens || 0

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingMessage, scrollToBottom])

  // Load conversations on mount
  useEffect(() => {
    loadConversations()
  }, [])

  // Load messages when active conversation changes
  useEffect(() => {
    if (activeConversationId) {
      loadMessages(activeConversationId)
    } else {
      setMessages([])
    }
  }, [activeConversationId])

  async function loadConversations() {
    setLoadingConversations(true)
    const res = await agenteService.getConversations(1, 50)
    if (res.success && res.data) {
      setConversations(res.data)
      // Select first conversation or none
      if (res.data.length > 0 && !activeConversationId) {
        setActiveConversationId(res.data[0].id)
      }
    }
    setLoadingConversations(false)
  }

  async function loadMessages(conversationId: string) {
    setLoadingMessages(true)
    const res = await agenteService.getMessages(conversationId, 1, 100)
    if (res.success && res.data) {
      setMessages(res.data)
    }
    setLoadingMessages(false)
  }

  async function handleCreateConversation() {
    const res = await agenteService.createConversation({ titulo: 'Nova conversa' })
    if (res.success && res.data) {
      setConversations((prev) => [res.data!, ...prev])
      setActiveConversationId(res.data.id)
      setMessages([])
    }
  }

  async function handleDeleteConversation(id: string) {
    const res = await agenteService.deleteConversation(id)
    if (res.success) {
      setConversations((prev) => prev.filter((c) => c.id !== id))
      if (activeConversationId === id) {
        const remaining = conversations.filter((c) => c.id !== id)
        setActiveConversationId(remaining.length > 0 ? remaining[0].id : null)
      }
      toast({ title: 'Conversa removida', variant: 'default' })
    }
  }

  async function handleRenameConversation(id: string, titulo: string) {
    const res = await agenteService.updateConversation(id, { titulo })
    if (res.success) {
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, titulo } : c))
      )
    }
  }

  async function handlePinConversation(id: string) {
    const conv = conversations.find((c) => c.id === id)
    if (!conv) return
    const res = await agenteService.updateConversation(id, {
      is_pinned: !conv.is_pinned,
    })
    if (res.success) {
      setConversations((prev) =>
        prev
          .map((c) => (c.id === id ? { ...c, is_pinned: !c.is_pinned } : c))
          .sort((a, b) => {
            if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1
            return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
          })
      )
    }
  }

  async function handleSendMessage(content: string) {
    if (!activeConversationId) {
      // Auto-create conversation
      const res = await agenteService.createConversation({ titulo: content.substring(0, 50) })
      if (!res.success || !res.data) {
        toast({ title: 'Erro ao criar conversa', variant: 'destructive' })
        return
      }
      setConversations((prev) => [res.data!, ...prev])
      setActiveConversationId(res.data.id)
      sendToAgent(res.data.id, content)
    } else {
      sendToAgent(activeConversationId, content)
    }
  }

  function sendToAgent(conversationId: string, content: string) {
    // Add user message locally
    const userMsg: AgentMessage = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId,
      role: 'user',
      content,
      tool_calls: null,
      sql_queries: null,
      input_tokens: 0,
      output_tokens: 0,
      model_used: null,
      thinking_time_ms: null,
      timing_breakdown: null,
      attachments: null,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])

    // Start streaming
    setIsStreaming(true)
    setThinkingStatus('Analisando sua pergunta...')
    setStreamingMessage('')
    setStreamingToolCalls(null)
    setStreamingSqlQueries(null)

    // Track usage data from SSE to include in final message
    let streamUsageData: {
      input_tokens: number
      output_tokens: number
      thinking_time_ms: number | null
      timing_breakdown: AgentMessage['timing_breakdown']
    } = { input_tokens: 0, output_tokens: 0, thinking_time_ms: null, timing_breakdown: null }

    const abortController = new AbortController()
    abortControllerRef.current = abortController

    agenteService.sendMessage(
      conversationId,
      content,
      // onEvent
      (event) => {
        switch (event.type) {
          case 'thinking':
            setThinkingStatus(event.content as string || 'Processando...')
            break
          case 'tool_call': {
            setThinkingStatus('Consultando banco de dados...')
            const sqlText = (event.sql as string) || (event.args as Record<string, unknown>)?.input as string || ''
            setStreamingToolCalls((prev) => [
              ...(prev || []),
              {
                tool_name: event.tool as string,
                args: (event.args as Record<string, unknown>) || {},
                result: null,
              },
            ])
            // If it's a SQL query tool, track the SQL immediately
            if (sqlText && (event.tool === 'sql_db_query' || event.tool === 'query-sql')) {
              setStreamingSqlQueries((prev) => [
                ...(prev || []),
                {
                  sql: sqlText,
                  explanation: 'Consulta executada pelo agente',
                  rows_returned: 0,
                  execution_time_ms: 0,
                },
              ])
            }
            break
          }
          case 'tool_result':
            // Update last SQL query with execution time
            setStreamingSqlQueries((prev) => {
              if (!prev || prev.length === 0) return prev
              const updated = [...prev]
              const lastQuery = updated[updated.length - 1]
              if (lastQuery.execution_time_ms === 0) {
                updated[updated.length - 1] = {
                  ...lastQuery,
                  execution_time_ms: (event.execution_time_ms as number) || 0,
                }
              }
              return updated
            })
            // Update tool call result
            setStreamingToolCalls((prev) =>
              prev
                ? prev.map((tc, i) =>
                    i === prev.length - 1 ? { ...tc, result: event.result } : tc
                  )
                : null
            )
            break
          case 'token':
            setThinkingStatus('')
            setStreamingMessage((prev) => prev + (event.content || ''))
            break
          case 'usage':
            // Store usage data for inclusion in final message
            streamUsageData = {
              input_tokens: (event.input_tokens as number) || 0,
              output_tokens: (event.output_tokens as number) || 0,
              thinking_time_ms: (event.thinking_time_ms as number) || null,
              timing_breakdown: (event.timing_breakdown as AgentMessage['timing_breakdown']) || null,
            }
            // Update conversation token counts locally
            setConversations((prev) =>
              prev.map((c) =>
                c.id === conversationId
                  ? {
                      ...c,
                      total_input_tokens: (c.total_input_tokens || 0) + ((event.input_tokens as number) || 0),
                      total_output_tokens: (c.total_output_tokens || 0) + ((event.output_tokens as number) || 0),
                    }
                  : c
              )
            )
            break
          case 'error': {
            const errorMsg = (event.message as string) || 'Erro desconhecido'
            // Show error as a message in the conversation
            setStreamingMessage('')
            setThinkingStatus('')
            const errorMessage: AgentMessage = {
              id: `error-${Date.now()}`,
              conversation_id: conversationId,
              role: 'assistant',
              content: `**Erro:** ${errorMsg}`,
              tool_calls: null,
              sql_queries: null,
              input_tokens: 0,
              output_tokens: 0,
              model_used: null,
              thinking_time_ms: null,
              timing_breakdown: null,
              attachments: null,
              created_at: new Date().toISOString(),
            }
            setMessages((prev) => [...prev, errorMessage])
            setIsStreaming(false)
            toast({
              title: 'Erro',
              description: errorMsg,
              variant: 'destructive',
            })
            break
          }
        }
      },
      // onDone
      () => {
        // Build final assistant message from streaming data (no refetch = no flash)
        setIsStreaming(false)
        setThinkingStatus('')

        // Capture streaming data before clearing
        setStreamingToolCalls((prevToolCalls) => {
          setStreamingSqlQueries((prevSqlQueries) => {
            setStreamingMessage((prevContent) => {
              if (prevContent) {
                const finalMessage: AgentMessage = {
                  id: `done-${Date.now()}`,
                  conversation_id: conversationId,
                  role: 'assistant',
                  content: prevContent,
                  tool_calls: prevToolCalls && prevToolCalls.length > 0 ? prevToolCalls : null,
                  sql_queries: prevSqlQueries && prevSqlQueries.length > 0 ? prevSqlQueries : null,
                  input_tokens: streamUsageData.input_tokens,
                  output_tokens: streamUsageData.output_tokens,
                  model_used: config?.model || null,
                  thinking_time_ms: streamUsageData.thinking_time_ms,
                  timing_breakdown: streamUsageData.timing_breakdown,
                  attachments: null,
                  created_at: new Date().toISOString(),
                }
                setMessages((prev) => [...prev, finalMessage])
              }
              return ''
            })
            return null
          })
          return null
        })

        // Refresh conversations list silently (for last_message_at, tokens)
        agenteService.getConversations(1, 50).then((res) => {
          if (res.success && res.data) setConversations(res.data)
        })
      },
      // onError
      (error) => {
        setIsStreaming(false)
        setThinkingStatus('')
        setStreamingMessage('')
        // Show error as a message in the conversation
        const errorMessage: AgentMessage = {
          id: `error-${Date.now()}`,
          conversation_id: conversationId,
          role: 'assistant',
          content: `**Erro de conexao:** ${error}`,
          tool_calls: null,
          sql_queries: null,
          input_tokens: 0,
          output_tokens: 0,
          model_used: null,
          thinking_time_ms: null,
          timing_breakdown: null,
          attachments: null,
          created_at: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, errorMessage])
        toast({
          title: 'Erro de conexao',
          description: error,
          variant: 'destructive',
        })
      },
      abortController.signal
    )
  }

  function handleStop() {
    abortControllerRef.current?.abort()
    setIsStreaming(false)
    setThinkingStatus('')
  }

  // No config - show welcome
  if (!config || !config.has_api_key) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
          <Bot className="h-8 w-8 text-amber-600 dark:text-amber-400" />
        </div>
        <h2 className="mb-2 text-xl font-semibold text-slate-800 dark:text-slate-100">
          Bem-vindo a Megui!
        </h2>
        <p className="mb-4 max-w-md text-sm text-slate-500 dark:text-slate-400">
          Sou sua assistente de IA para consultas de dados do MeguisPet.
          Posso responder perguntas sobre vendas, clientes, produtos, estoque e financeiro.
        </p>
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-300">
            <AlertCircle className="h-4 w-4" />
            Configure sua API key para comecar
          </div>
          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
            Voce precisa de uma API key do OpenAI ou Anthropic.
          </p>
        </div>
        <Button onClick={onGoToConfig} className="gap-2 bg-amber-500 hover:bg-amber-600">
          <Sparkles className="h-4 w-4" />
          Ir para Configuracao
        </Button>
        <div className="mt-8 text-left">
          <p className="mb-2 text-xs font-medium text-slate-500">Exemplos de perguntas:</p>
          <ul className="space-y-1 text-xs text-slate-400">
            <li>&bull; &quot;Qual foi minha maior venda esse mes?&quot;</li>
            <li>&bull; &quot;Quais produtos estao com estoque baixo?&quot;</li>
            <li>&bull; &quot;Qual vendedor mais vendeu essa semana?&quot;</li>
            <li>&bull; &quot;Compare as vendas deste mes com o anterior&quot;</li>
          </ul>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-amber-500" />
          <span className="font-semibold text-slate-800 dark:text-slate-100">
            Megui
          </span>
        </div>
        <div className="flex items-center gap-3">
          <TokenCounter
            inputTokens={totalInputTokens}
            outputTokens={totalOutputTokens}
          />
        </div>
      </div>

      {/* Conversation tabs */}
      <ConversationTabs
        conversations={conversations}
        activeId={activeConversationId}
        onSelect={setActiveConversationId}
        onCreate={handleCreateConversation}
        onDelete={handleDeleteConversation}
        onRename={handleRenameConversation}
        onPin={handlePinConversation}
      />

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900/50">
        {loadingMessages ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          </div>
        ) : messages.length === 0 && !isStreaming ? (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <Sparkles className="mb-3 h-8 w-8 text-amber-400" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Comece fazendo uma pergunta sobre seus dados
            </p>
          </div>
        ) : (
          <div className="py-2">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}

            {/* Streaming response */}
            {isStreaming && thinkingStatus && !streamingMessage && (
              <ChatThinking status={thinkingStatus} />
            )}

            {isStreaming && streamingMessage && (
              <ChatMessage
                message={{
                  id: 'streaming',
                  conversation_id: activeConversationId || '',
                  role: 'assistant',
                  content: streamingMessage,
                  tool_calls: streamingToolCalls,
                  sql_queries: streamingSqlQueries,
                  input_tokens: 0,
                  output_tokens: 0,
                  model_used: config?.model || null,
                  thinking_time_ms: null,
                  timing_breakdown: null,
                  attachments: null,
                  created_at: new Date().toISOString(),
                }}
                isStreaming
              />
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <ChatInput
        onSend={handleSendMessage}
        isStreaming={isStreaming}
        onStop={handleStop}
        disabled={!config?.has_api_key}
      />
    </div>
  )
}
