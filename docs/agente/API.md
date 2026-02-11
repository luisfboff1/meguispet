# API Routes - Agente Megui

## Visao geral

Todas as rotas estao protegidas com `withSupabaseAuth` (de `lib/supabase-middleware.ts`), que verifica o JWT do Supabase e injeta `req.user` e `req.supabaseClient` no request.

Base path: `/api/agente/`

## Endpoints

### 1. POST `/api/agente/chat` - Chat com streaming

O endpoint principal do agente. Recebe uma mensagem do usuario e retorna a resposta via Server-Sent Events (SSE).

**Arquivo:** `pages/api/agente/chat.ts`

**Request:**
```typescript
POST /api/agente/chat
Content-Type: application/json

{
  "conversationId": "uuid-da-conversa",
  "message": "Qual foi minha maior venda esse mes?",
  "attachments": []  // Opcional: arquivos anexados
}
```

**Response:** `text/event-stream` (SSE)

```
data: {"type":"thinking","content":"Analisando sua pergunta..."}

data: {"type":"tool_call","tool":"list_sql_tables","args":{}}

data: {"type":"tool_result","tool":"list_sql_tables","result":"vendas, vendas_itens, ..."}

data: {"type":"tool_call","tool":"info_sql_db","args":{"tables":"vendas"}}

data: {"type":"tool_result","tool":"info_sql_db","result":"CREATE TABLE vendas (...)"}

data: {"type":"tool_call","tool":"query_sql_db","args":{"input":"SELECT ..."}}

data: {"type":"tool_result","tool":"query_sql_db","result":"[{...}]","sql":"SELECT ...","execution_time_ms":42,"rows_returned":1}

data: {"type":"token","content":"Sua"}

data: {"type":"token","content":" maior"}

data: {"type":"token","content":" venda"}

data: {"type":"token","content":" este"}

data: {"type":"token","content":" mes..."}

data: {"type":"usage","input_tokens":1250,"output_tokens":87,"model":"gpt-4o"}

data: [DONE]
```

**Tipos de eventos SSE:**

| Tipo | Descricao | Campos |
|------|-----------|--------|
| `thinking` | Agent esta processando | `content` |
| `tool_call` | Agent chamou uma ferramenta | `tool`, `args` |
| `tool_result` | Resultado de uma ferramenta | `tool`, `result`, `sql?`, `execution_time_ms?`, `rows_returned?` |
| `token` | Token de texto da resposta | `content` |
| `usage` | Contagem de tokens | `input_tokens`, `output_tokens`, `model` |
| `error` | Erro durante processamento | `message` |
| `[DONE]` | Fim do stream | - |

**Efeitos colaterais:**
- Salva mensagem do usuario em `agent_messages` (role: 'user')
- Salva resposta do assistant em `agent_messages` (role: 'assistant') com `tool_calls` e `sql_queries`
- Atualiza `total_input_tokens` e `total_output_tokens` em `agent_conversations`
- Atualiza `last_message_at` em `agent_conversations`

**Erros:**

| Status | Codigo | Descricao |
|--------|--------|-----------|
| 400 | `MISSING_CONVERSATION` | `conversationId` nao fornecido |
| 400 | `MISSING_MESSAGE` | `message` vazio |
| 400 | `NO_API_KEY` | Usuario nao configurou API key |
| 401 | `UNAUTHORIZED` | JWT invalido ou expirado |
| 404 | `CONVERSATION_NOT_FOUND` | Conversa nao existe ou nao pertence ao usuario |
| 429 | `RATE_LIMITED` | Limite de 30 requests/minuto excedido |
| 500 | `LLM_ERROR` | Erro na chamada ao provedor LLM |
| 500 | `SQL_ERROR` | Erro na execucao de SQL |

---

### 2. GET `/api/agente/conversations` - Listar conversas

**Arquivo:** `pages/api/agente/conversations.ts`

**Request:**
```
GET /api/agente/conversations?page=1&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "titulo": "Vendas do mes",
      "is_pinned": false,
      "total_input_tokens": 5420,
      "total_output_tokens": 1230,
      "last_message_at": "2026-02-11T14:30:00Z",
      "created_at": "2026-02-10T09:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "pages": 1
  }
}
```

Conversas retornadas:
- Filtradas por `usuario_id` do usuario autenticado
- Apenas `is_active = true` (soft delete)
- Ordenadas por `is_pinned DESC, last_message_at DESC`

---

### 3. POST `/api/agente/conversations` - Criar conversa

**Arquivo:** `pages/api/agente/conversations.ts`

**Request:**
```json
{
  "titulo": "Nova conversa"  // Opcional, default: "Nova conversa"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-novo",
    "titulo": "Nova conversa",
    "is_active": true,
    "is_pinned": false,
    "total_input_tokens": 0,
    "total_output_tokens": 0,
    "last_message_at": "2026-02-11T15:00:00Z",
    "created_at": "2026-02-11T15:00:00Z"
  }
}
```

---

### 4. GET `/api/agente/conversations/[id]` - Buscar conversa

**Arquivo:** `pages/api/agente/conversations/[id].ts`

**Request:**
```
GET /api/agente/conversations/uuid-da-conversa
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "titulo": "Vendas do mes",
    "is_active": true,
    "is_pinned": false,
    "total_input_tokens": 5420,
    "total_output_tokens": 1230,
    "last_message_at": "2026-02-11T14:30:00Z",
    "created_at": "2026-02-10T09:00:00Z"
  }
}
```

---

### 5. PUT `/api/agente/conversations/[id]` - Atualizar conversa

**Arquivo:** `pages/api/agente/conversations/[id].ts`

**Request:**
```json
{
  "titulo": "Analise de vendas fevereiro",
  "is_pinned": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "titulo": "Analise de vendas fevereiro",
    "is_pinned": true
  }
}
```

---

### 6. DELETE `/api/agente/conversations/[id]` - Deletar conversa (soft)

**Arquivo:** `pages/api/agente/conversations/[id].ts`

**Request:**
```
DELETE /api/agente/conversations/uuid-da-conversa
```

**Response:**
```json
{
  "success": true,
  "message": "Conversa removida com sucesso"
}
```

Efeito: Seta `is_active = false` (soft delete). Mensagens permanecem no banco mas nao sao mais listadas.

---

### 7. GET `/api/agente/conversations/[id]/messages` - Historico de mensagens

**Arquivo:** `pages/api/agente/conversations/[id]/messages.ts`

**Request:**
```
GET /api/agente/conversations/uuid/messages?page=1&limit=50
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "msg-uuid-1",
      "role": "assistant",
      "content": "Ola! Sou a Megui, sua assistente de dados do MeguisPet.",
      "tool_calls": null,
      "sql_queries": null,
      "input_tokens": 0,
      "output_tokens": 45,
      "model_used": "gpt-4o",
      "created_at": "2026-02-10T09:00:00Z"
    },
    {
      "id": "msg-uuid-2",
      "role": "user",
      "content": "Qual foi minha maior venda esse mes?",
      "tool_calls": null,
      "sql_queries": null,
      "input_tokens": 15,
      "output_tokens": 0,
      "created_at": "2026-02-10T09:01:00Z"
    },
    {
      "id": "msg-uuid-3",
      "role": "assistant",
      "content": "Sua maior venda este mes foi a #V-2024-0847...",
      "tool_calls": [
        {
          "tool_name": "query_sql_db",
          "args": {"input": "SELECT ..."},
          "result": "[{...}]"
        }
      ],
      "sql_queries": [
        {
          "sql": "SELECT v.numero_venda, v.valor_final FROM vendas v...",
          "explanation": "Buscar maior venda do mes atual",
          "rows_returned": 1,
          "execution_time_ms": 42
        }
      ],
      "input_tokens": 1250,
      "output_tokens": 87,
      "model_used": "gpt-4o",
      "created_at": "2026-02-10T09:01:05Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 3,
    "pages": 1
  }
}
```

Mensagens ordenadas por `created_at ASC` (mais antigas primeiro).

---

### 8. GET `/api/agente/config` - Buscar configuracao

**Arquivo:** `pages/api/agente/config.ts`

**Request:**
```
GET /api/agente/config
```

**Response (usuario com config):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "provider": "openai",
    "model": "gpt-4o",
    "has_api_key": true,
    "api_key_preview": "sk-...abc",
    "temperature": 0.3,
    "max_tokens": 4096,
    "top_p": 1.0,
    "system_prompt": null,
    "skills": ["sql_query", "schema_explorer", "data_analysis"],
    "mcp_servers": []
  }
}
```

**Response (usuario sem config):**
```json
{
  "success": true,
  "data": null
}
```

**Nota:** `api_key_encrypted` nunca e retornada. Em vez disso, retorna `has_api_key` (boolean) e `api_key_preview` (ultimos 3 caracteres mascarados).

---

### 9. PUT `/api/agente/config` - Salvar configuracao

**Arquivo:** `pages/api/agente/config.ts`

**Request:**
```json
{
  "provider": "openai",
  "model": "gpt-4o",
  "api_key": "sk-proj-abc123...",
  "temperature": 0.3,
  "max_tokens": 4096,
  "top_p": 1.0,
  "system_prompt": "Voce e a Megui, assistente...",
  "skills": ["sql_query", "schema_explorer", "data_analysis"],
  "mcp_servers": []
}
```

**Nota:** Se `api_key` for enviada, ela e encriptada antes de salvar. Se nao for enviada (undefined), a key existente e mantida.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "provider": "openai",
    "model": "gpt-4o",
    "has_api_key": true,
    "api_key_preview": "sk-...123",
    "temperature": 0.3,
    "max_tokens": 4096
  },
  "message": "Configuracao salva com sucesso"
}
```

Se o usuario ainda nao tem config, faz INSERT (upsert). Se ja tem, faz UPDATE.

---

### 10. GET `/api/agente/schema` - Metadados do banco

**Arquivo:** `pages/api/agente/schema.ts`

**Request:**
```
GET /api/agente/schema?table=vendas
GET /api/agente/schema  (todas as tabelas)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tables": [
      {
        "name": "vendas",
        "description": "Vendas realizadas",
        "columns": [
          {"name": "id", "type": "bigint", "nullable": false, "description": "ID unico"},
          {"name": "numero_venda", "type": "varchar", "nullable": false, "description": "Numero da venda"},
          {"name": "cliente_id", "type": "bigint", "nullable": true, "description": "FK para clientes"},
          {"name": "valor_final", "type": "numeric", "nullable": false, "description": "Valor total da venda"}
        ],
        "relationships": [
          {"column": "cliente_id", "references": "clientes_fornecedores(id)"},
          {"column": "vendedor_id", "references": "vendedores(id)"}
        ]
      }
    ]
  }
}
```

Este endpoint retorna metadados cacheados (5 min) sobre o schema do banco. Usado pelo frontend para exibir informacoes de contexto e pelo agent para entender a estrutura das tabelas.

---

## Padrao de implementacao

Todas as rotas seguem o padrao existente do projeto:

```typescript
// pages/api/agente/exemplo.ts
import type { NextApiResponse } from 'next'
import { withSupabaseAuth, AuthenticatedRequest } from '@/lib/supabase-middleware'

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const { method } = req
  const supabase = req.supabaseClient
  const userId = req.user.id

  try {
    if (method === 'GET') {
      // ... logica GET
    } else if (method === 'POST') {
      // ... logica POST
    } else {
      res.setHeader('Allow', ['GET', 'POST'])
      return res.status(405).json({ success: false, message: `Method ${method} Not Allowed` })
    }
  } catch (error) {
    console.error('[API Agente] Erro:', error)
    return res.status(500).json({ success: false, message: 'Erro interno do servidor' })
  }
}

export default withSupabaseAuth(handler)
```

Referencia: `pages/api/clientes.ts`, `pages/api/vendas/index.ts`
