# Arquitetura do Agente de IA com SQL

Este documento descreve a arquitetura completa do agente de IA baseado em SQL integrado a uma aplicação Next.js. O objetivo é servir de referência e template para implementações similares em outros projetos.

---

## Visão Geral

O agente é um assistente de IA conversacional que responde perguntas em linguagem natural consultando diretamente o banco de dados via SQL. O usuário escreve uma pergunta ("Qual foi o faturamento do mês?"), o agente raciocina sobre ela, gera e executa consultas SQL, e devolve a resposta formatada — que pode incluir texto, tabelas e gráficos interativos.

```
Usuário → Pergunta em linguagem natural
       ↓
  API Route (SSE streaming)
       ↓
  LangChain ReAct Agent
       ↓
  LLM (OpenAI / Anthropic)  ←→  SQL Tools (query, info, list)
       ↓
  Banco de dados PostgreSQL
       ↓
  Resposta estruturada (Markdown + JSON para gráficos)
       ↓
  Renderização no Frontend (Recharts / tabelas)
```

---

## 1. Stack de Tecnologias

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js + React + TypeScript |
| Estado | Zustand |
| Animações | Framer Motion |
| Renderização de gráficos | **Recharts** |
| Renderização de Markdown | `react-markdown` + `remark-gfm` |
| Export de dados | `xlsx` (SheetJS) |
| Backend do agente | Next.js API Routes (Node.js) |
| Framework do agente | **LangChain** (`@langchain/langgraph`, `@langchain/classic`) |
| Provedores de LLM | OpenAI, Anthropic |
| Banco de dados | PostgreSQL (via Supabase) |
| ORM/Conector SQL | TypeORM + `SqlDatabase` do LangChain |
| Autenticação | Supabase Auth |
| Streaming | Server-Sent Events (SSE) |

---

## 2. Banco de Dados e Conexão com o Agente

### 2.1. Conexão

A conexão com o banco é feita via **TypeORM** + o utilitário `SqlDatabase` do LangChain, que expõe três ferramentas nativas ao agente:

```typescript
import { DataSource } from "typeorm";
import { SqlDatabase } from "@langchain/classic/sql_db";
import { QuerySqlTool, InfoSqlTool, ListTablesSqlTool } from "@langchain/classic/tools/sql";

const dataSource = new DataSource({
  type: "postgres",
  url: process.env.DB_URL,
  ssl: { rejectUnauthorized: false },
});

const db = await SqlDatabase.fromDataSourceParams({
  appDataSource: dataSource,
  includesTables: [...TABELAS_PERMITIDAS],  // whitelist explícita
});

const tools = [
  new QuerySqlTool(db),       // executa SELECT
  new InfoSqlTool(db),        // inspeciona schema de tabelas específicas
  new ListTablesSqlTool(db),  // lista tabelas disponíveis
];
```

- A conexão é **cacheada** entre requests para evitar overhead de reconexão.
- A lista `includesTables` é uma **whitelist explícita** de tabelas — o agente nunca enxerga tabelas sensíveis (usuários, permissões, configurações).
- Apenas **queries SELECT** são permitidas — INSERT, UPDATE, DELETE, DROP são bloqueados pelo design do `QuerySqlTool`.

### 2.2. Schema como Contexto

Para que o LLM gere SQL correto sem "adivinhar" nomes de colunas, o sistema prompt inclui uma descrição em linguagem natural de cada tabela:

```typescript
// lib/agent-schema.ts
export const TABLE_DESCRIPTIONS: Record<string, string> = {
  vendas: 'Vendas realizadas. Campos: id, cliente_id, valor_final, status...',
  clientes: 'Clientes e fornecedores. Campo tipo diferencia: "cliente" ou "fornecedor"...',
  // ...
}

export function generateSchemaDescription(): string {
  return Object.entries(TABLE_DESCRIPTIONS)
    .map(([table, desc]) => `- **${table}**: ${desc}`)
    .join('\n')
}
```

Essa descrição é injetada no system prompt, junto com regras de negócio críticas (ex: sempre excluir registros cancelados em métricas de agregação).

---

## 3. Arquitetura do Agente (ReAct Loop)

O agente usa o padrão **ReAct** (Reason + Act) do LangChain/LangGraph:

```
1. LLM recebe a pergunta + histórico + system prompt
2. LLM raciocina (pode ou não stremar o pensamento)
3. LLM decide chamar uma tool (SQL query, info de schema, etc.)
4. Tool executa e devolve resultado
5. LLM analisa o resultado e decide: responder ou chamar mais tools
6. Ciclo repete até o LLM produzir a resposta final
```

```typescript
import { createReactAgent } from "@langchain/langgraph/prebuilt";

const agent = createReactAgent({
  llm,           // instância do ChatOpenAI ou ChatAnthropic
  tools,         // [QuerySqlTool, InfoSqlTool, ListTablesSqlTool]
  messageModifier: systemPrompt,
});

// Streaming com visibilidade detalhada dos eventos
const eventStream = agent.streamEvents(
  { messages },      // histórico + mensagem atual
  { version: "v2", recursionLimit: 25 }
);
```

### 3.1. Multi-Provedor

O sistema suporta OpenAI e Anthropic via factory:

```typescript
// lib/agent-provider-factory.ts
export function createLLM(config: ProviderConfig): BaseChatModel {
  switch (config.provider) {
    case 'openai':
      return new ChatOpenAI({ modelName: config.model, ... })
    case 'anthropic':
      return new ChatAnthropic({ modelName: config.model, ... })
  }
}
```

A configuração (provider, modelo, temperature, max_tokens) é salva por usuário no banco e pode ser alterada pela interface sem redeploy.

---

## 4. Streaming via Server-Sent Events (SSE)

A comunicação entre API e frontend é feita por **SSE** — uma stream unidirecional que permite enviar eventos em tempo real sem WebSocket.

### 4.1. Tipos de Eventos SSE

```typescript
// Eventos emitidos pela API durante o processamento
sendSSE(res, { type: "thinking",         content: "Analisando sua pergunta..." })
sendSSE(res, { type: "reasoning_token",  content: "<token>", step: 1 })
sendSSE(res, { type: "reasoning_complete", step: 1, has_tools: true })
sendSSE(res, { type: "tool_start",       tool_name: "query-sql", sql: "SELECT..." })
sendSSE(res, { type: "tool_end",         tool_name: "query-sql", rows_returned: 42 })
sendSSE(res, { type: "token",            content: "<token da resposta>" })
sendSSE(res, { type: "done",             message_id: "...", usage: {...} })
sendSSE(res, { type: "error",            message: "..." })
```

### 4.2. Mapeamento de Eventos para Estado

```typescript
// No frontend, cada evento atualiza o estado React
switch (event.type) {
  case 'thinking':
    setThinkingStatus(event.content)          // texto do status visual
    break
  case 'reasoning_token':
    setStreamingReasoning(prev => prev + event.content)  // caixa de raciocínio
    break
  case 'token':
    setStreamingMessage(prev => prev + event.content)    // bolha de resposta
    break
  case 'tool_end':
    setStreamingSqlQueries(prev => [...prev, event])     // painel SQL
    break
  case 'done':
    setIsStreaming(false)                     // encerra o estado de carregamento
    break
}
```

---

## 5. Sistema de Multi-Conversas e Histórico

### 5.1. Modelo de Dados

```
agent_conversations
  id (UUID)
  usuario_id (FK)
  titulo (string)
  is_pinned (boolean)
  is_active (boolean)
  total_input_tokens (int)
  total_output_tokens (int)
  last_message_at (timestamp)

agent_messages
  id (UUID)
  conversation_id (FK)
  role ('user' | 'assistant')
  content (text)
  tool_calls (JSONB)
  sql_queries (JSONB)
  input_tokens (int)
  output_tokens (int)
  model_used (string)
  thinking_time_ms (int)
  timing_breakdown (JSONB)
  created_at (timestamp)
```

### 5.2. Gerenciamento no Frontend

```
ConversationTabs
  ├── Lista de conversas (paginada, 50 itens)
  ├── Criar nova conversa (manual ou automático no primeiro envio)
  ├── Renomear, fixar (pin), deletar conversa
  └── Seleção de conversa ativa → carrega messages
```

- Ao selecionar uma conversa, as mensagens são carregadas via `GET /api/agente/messages/:conversationId`
- Ao enviar uma mensagem sem conversa ativa, uma nova é criada automaticamente com o início do texto como título

### 5.3. Histórico Injetado no Agente

Para manter contexto entre turnos, as últimas mensagens da conversa são enviadas ao LLM:

```typescript
// Busca as N mensagens mais recentes (DESC) e inverte para ordem cronológica
const { data: historyDesc } = await supabase
  .from("agent_messages")
  .select("role, content")
  .eq("conversation_id", conversationId)
  .order("created_at", { ascending: false })
  .limit(10)   // limitar economiza tokens

const history = [...historyDesc].reverse()

// Deduplica mensagens consecutivas idênticas (artefatos de retry)
// Converte para tipos LangChain
const messages = history.map(msg =>
  msg.role === 'user' ? new HumanMessage(msg.content) : new AIMessage(msg.content)
)
messages.push(new HumanMessage(currentUserMessage))
```

---

## 6. Raciocínio em Tempo Real (Thinking Display)

O componente `ChatThinking` exibe o raciocínio do agente enquanto ele processa — mostrando tanto o status textual quanto os tokens de pensamento à medida que são gerados.

```
[Avatar Bot]  Megui
              ● ● ●  "Elaborando consulta SQL..."
              ┌──────────────────────────────────────┐
              │ Preciso verificar o schema da tabela │
              │ vendas antes de escrever a query...  │
              │ vou usar o InfoSqlTool para confirmar│
              │ os campos disponíveis...▌            │
              └──────────────────────────────────────┘
```

```typescript
// components/agente/ChatThinking.tsx
export function ChatThinking({ status, reasoning }: ChatThinkingProps) {
  return (
    <div>
      {/* Dots animados (Framer Motion) + texto de status */}
      <AnimatedDots />
      <span>{status}</span>

      {/* Caixa de raciocínio - auto-scroll à medida que tokens chegam */}
      {reasoning && (
        <div ref={reasoningRef} className="max-h-40 overflow-y-auto">
          <p>{reasoning}<BlinkingCursor /></p>
        </div>
      )}
    </div>
  )
}
```

O raciocínio visível vem dos eventos `reasoning_token` — que incluem tanto os tokens de "thinking" do LLM quanto os argumentos sendo construídos para os tool calls (ex: o SQL sendo digitado em tempo real).

---

## 7. Painel de Queries SQL

Cada mensagem do assistente exibe opcionalmente um painel colapsável mostrando as queries SQL executadas:

```
▼ Tabelas: vendas, vendas_itens, clientes_fornecedores
  ──────────────────────────────────────────────────────
  Buscando faturamento por mês excluindo cancelados

  SELECT DATE_TRUNC('month', v.data_venda) as mes,
         SUM(v.valor_final) as faturamento
  FROM vendas v
  WHERE v.status != 'cancelado'
  GROUP BY mes ORDER BY mes DESC

  ⏱ 47ms  📋 12 linhas
```

```typescript
// components/agente/SqlQueryPanel.tsx
// Salvo em agent_messages.sql_queries (JSONB array):
interface AgentSqlQuery {
  sql: string
  explanation: string
  rows_returned: number
  execution_time_ms: number
}
```

---

## 8. Formatação de Respostas e Renderização

### 8.1. Markdown com Tabelas

Respostas textuais são renderizadas com `react-markdown` + `remark-gfm` (que adiciona suporte a tabelas GFM):

```tsx
<ReactMarkdown remarkPlugins={[remarkGfm]}>
  {message.content}
</ReactMarkdown>
```

O system prompt instrui o agente a usar formatação Markdown:
- `**negrito**` para valores importantes
- Tabelas `| col | col |` para dados tabulares simples
- Listas para múltiplos itens
- Blocos de código para SQL quando relevante

### 8.2. Gráficos Interativos (ChartSpec)

Para dados que se beneficiam de visualização, o agente devolve um bloco JSON especial no formato `ChartSpec` embutido no Markdown:

````markdown
Aqui está a evolução do faturamento mensal:

```chart
{
  "type": "bar",
  "title": "Faturamento Mensal",
  "xAxis": "mes",
  "yAxis": "faturamento",
  "data": [
    { "mes": "Jan/2025", "faturamento": 45230 },
    { "mes": "Fev/2025", "faturamento": 52180 }
  ]
}
```
````

O parser do `ChatMessage` detecta blocos de código com linguagem `chart` e renderiza o `ChartRenderer` no lugar:

```typescript
// Dentro do ReactMarkdown: custom code renderer
components={{
  code({ node, inline, className, children }) {
    const lang = className?.replace('language-', '')
    if (lang === 'chart') {
      const spec = JSON.parse(String(children))
      return <ChartRenderer spec={spec} />
    }
    return <code>{children}</code>
  }
}}
```

### 8.3. Interface ChartSpec

```typescript
export interface ChartSpec {
  type: 'bar' | 'line' | 'pie' | 'area'
  title: string
  data: Array<Record<string, string | number>>
  xAxis?: string
  yAxis?: string | string[]          // suporta múltiplas métricas
  filters?: Record<string, ChartFilter>   // filtros interativos dinâmicos
  datasets?: Record<string, Record<string, data[]>>  // dados por filtro
  colors?: string[]
  allowExport?: boolean              // botão de download XLSX
  allowFullscreen?: boolean          // modo tela cheia
}
```

### 8.4. Tipos de Gráfico (Recharts)

O `ChartRenderer` usa **Recharts** e suporta:

| Tipo | Componente Recharts |
|---|---|
| `bar` | `BarChart` + `Bar` |
| `line` | `LineChart` + `Line` |
| `area` | `AreaChart` + `Area` |
| `pie` | `PieChart` + `Pie` + `Cell` |

Todos os gráficos são responsivos via `ResponsiveContainer` e suportam:
- `Tooltip` e `Legend` automáticos
- Múltiplas séries (múltiplos `yAxis`)
- Filtros interativos (`Select`) que trocam o dataset exibido
- Export para XLSX via SheetJS
- Modo fullscreen

### 8.5. Prompt para Gerar Gráficos

A instrução no system prompt que ensina o agente a gerar gráficos corretamente:

```
## Formato de Gráficos

Quando o resultado for melhor visualizado graficamente, use:

\`\`\`chart
{
  "type": "bar|line|pie|area",
  "title": "Título do Gráfico",
  "xAxis": "nome_do_campo_eixo_x",
  "yAxis": "nome_do_campo_eixo_y",
  "data": [
    { "campo_x": "valor", "campo_y": 123 }
  ]
}
\`\`\`

IMPORTANTE:
- Os nomes dos campos em data DEVEM corresponder exatamente a xAxis e yAxis
- Valores numéricos devem ser números (não strings)
- Use type "pie" apenas para proporções (máximo 8 fatias)
- Para séries temporais, use "line" ou "area"
- Para comparações, use "bar"
```

---

## 9. Contagem de Tokens e Contexto

O `TokenCounter` exibe o uso acumulado de tokens da conversa para transparência de custos:

```typescript
// Salvo na conversa e atualizado após cada resposta
interface AgentConversation {
  total_input_tokens: number
  total_output_tokens: number
}

// Resetável criando uma nova conversa
```

Os tokens de cada mensagem são extraídos do `usage_metadata` do evento `on_chat_model_end` do LangGraph.

---

## 10. Configuração do Agente

Cada usuário (ou o sistema globalmente) pode configurar:

```typescript
interface AgentConfig {
  provider: 'openai' | 'anthropic'
  model: string                   // ex: 'gpt-4o', 'claude-3-5-sonnet-latest'
  api_key_encrypted: string       // AES-256-GCM, nunca exposta ao frontend
  temperature: number             // 0.0 – 1.0
  max_tokens: number
  top_p: number
  system_prompt?: string          // prompt customizado (opcional)
  recursion_limit: number         // máx de ciclos ReAct (padrão: 25)
}
```

- A API key é armazenada **criptografada** (AES-256-GCM) no banco
- Fallback automático: se o usuário não tiver config, usa a config global do sistema
- Permite alternar entre OpenAI e Anthropic sem redeploy

---

## 11. Segurança

| Aspecto | Implementação |
|---|---|
| Autenticação | Middleware Supabase Auth em todas as rotas `/api/agente/*` |
| Controle de acesso | `PermissionGate` no frontend + verificação de `usuario_id` nas queries |
| Isolamento de dados | Cada consulta ao histórico filtra por `conversation.usuario_id` |
| API key | Criptografada com AES-256-GCM, nunca retornada ao frontend |
| SQL injection | Impossível — o agente só aciona o `QuerySqlTool`, que usa a conexão TypeORM |
| Injeção de prompt | O system prompt é fixo no backend; o usuário só controla o campo `message` |
| Rate limiting | In-memory: 30 requisições/minuto por usuário |
| Tabelas sensíveis | Whitelist `includesTables` garante que usuários/permissões jamais são acessados |

---

## 12. Fluxo Completo de uma Mensagem

```
1. Usuário digita e envia mensagem
2. Frontend chama POST /api/agente/chat com { conversationId, message }
3. API verifica autenticação + autorização (conversa pertence ao usuário)
4. API busca configuração do agente (config do usuário, ou fallback global)
5. API descriptografa a API key
6. API cria instância do LLM (OpenAI/Anthropic)
7. API busca histórico da conversa (últimas 10 mensagens, deduplicadas)
8. API cria o ReAct Agent (LangChain) com tools SQL
9. API inicia SSE response: Content-Type: text/event-stream
10. Agent itera através do loop ReAct:
    a. LLM raciocina → tokens de reasoning_token emitidos via SSE
    b. LLM decide chamar SQL tool → thinking + reasoning_token do SQL
    c. Tool executa query → rows retornam ao LLM
    d. LLM analisa resultado → pode fazer mais queries ou responder
    e. LLM gera resposta final → tokens emitidos via SSE (type: "token")
11. API salva mensagens (user + assistant) no banco com metadados
12. API emite evento { type: "done", message_id, usage }
13. Frontend fecha a stream e renderiza a mensagem final
14. Frontend detecta blocos ```chart``` e renderiza ChartRenderer (Recharts)
```

---

## 13. Estrutura de Arquivos

```
pages/
  agente.tsx                  # Página principal (Tabs: Chat | Config)
  api/agente/
    chat.ts                   # API SSE principal do agente
    conversations.ts          # CRUD de conversas
    messages.ts               # Listagem de mensagens
    config.ts                 # Leitura/escrita de AgentConfig
    chart-data.ts             # Execução de queries para gráficos dinâmicos

components/agente/
  ChatInterface.tsx           # Orquestrador: conversas + mensagens + estado
  ChatMessage.tsx             # Renderiza uma mensagem (Markdown + Chart + SQL)
  ChatThinking.tsx            # Indicador de raciocínio em tempo real
  ChatInput.tsx               # Área de input + botão enviar
  ChartRenderer.tsx           # Gráficos interativos via Recharts
  SqlQueryPanel.tsx           # Painel colapsável de queries SQL
  ConversationTabs.tsx        # Sidebar/tabs de conversas
  TokenCounter.tsx            # Exibição de uso de tokens
  AgentConfigPanel.tsx        # Formulário de configuração do agente

lib/
  agent-default-prompt.ts     # System prompt padrão + builder
  agent-schema.ts             # Descrições das tabelas para o prompt
  agent-provider-factory.ts   # Factory: OpenAI / Anthropic
  agent-crypto.ts             # Encrypt/decrypt de API keys (AES-256-GCM)

services/
  agenteService.ts            # Client HTTP: chamadas às API routes do agente
```
