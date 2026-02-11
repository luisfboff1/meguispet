# Arquitetura Tecnica - Agente Megui

## Visao geral da arquitetura

```mermaid
graph TB
    subgraph Frontend ["Frontend (React 19)"]
        UI[Chat Interface]
        Config[Config Panel]
        Tabs[Conversation Tabs]
    end

    subgraph API ["Next.js API Routes"]
        ChatAPI["/api/agente/chat<br/>(SSE Streaming)"]
        ConvAPI["/api/agente/conversations<br/>(CRUD)"]
        ConfigAPI["/api/agente/config<br/>(GET/PUT)"]
        SchemaAPI["/api/agente/schema<br/>(GET cached)"]
    end

    subgraph LangChain ["LangChain.js"]
        Agent[SQL Agent]
        Toolkit[SqlToolkit]
        Tools[Tools: query_sql_db<br/>info_sql_db<br/>list_sql_tables]
        LLM[ChatOpenAI / ChatAnthropic]
    end

    subgraph Database ["Supabase PostgreSQL"]
        AgentTables["agent_configs<br/>agent_conversations<br/>agent_messages"]
        BusinessTables["vendas, produtos,<br/>clientes, estoque,<br/>financeiro, etc."]
    end

    subgraph Security ["Seguranca"]
        Auth[withSupabaseAuth<br/>JWT Verification]
        RLS[Row Level Security]
        Crypto[AES-256-GCM<br/>API Key Encryption]
        ReadOnly[SQL Read-Only<br/>Validation]
    end

    UI -->|"fetch + SSE"| ChatAPI
    Config -->|"Supabase Browser Client"| AgentTables
    Tabs -->|"Supabase Browser Client"| AgentTables

    ChatAPI --> Auth
    ConvAPI --> Auth
    ConfigAPI --> Auth

    Auth --> Agent
    Agent --> LLM
    Agent --> Toolkit
    Toolkit --> Tools
    Tools -->|"SELECT only"| BusinessTables
    ReadOnly -.->|"valida"| Tools

    ChatAPI -->|"salva mensagens"| AgentTables
    ConfigAPI --> Crypto
    Crypto -->|"encrypt/decrypt"| AgentTables
    RLS -.->|"protege"| AgentTables
```

## Fluxo de uma pergunta

```mermaid
sequenceDiagram
    participant U as Usuario
    participant FE as Frontend
    participant API as API Route
    participant MW as withSupabaseAuth
    participant LC as LangChain Agent
    participant LLM as OpenAI/Anthropic
    participant DB as PostgreSQL

    U->>FE: "Qual foi minha maior venda esse mes?"
    FE->>API: POST /api/agente/chat (SSE)
    API->>MW: Verificar JWT
    MW-->>API: req.user + req.supabaseClient

    API->>API: Buscar agent_config do usuario
    API->>API: Decriptar API key
    API->>LC: Criar agent com config do usuario

    LC->>LLM: Analisar pergunta
    LLM-->>LC: Preciso consultar tabela 'vendas'

    Note over FE: SSE: "Consultando banco de dados..."

    LC->>DB: SELECT * FROM information_schema (get_schema)
    DB-->>LC: Schema da tabela vendas
    LC->>LLM: Gerar SQL com base no schema
    LLM-->>LC: SELECT v.numero_venda, v.valor_final...

    Note over FE: SSE: mostra SQL no painel expandivel

    LC->>DB: Executar query SELECT (read-only)
    DB-->>LC: Resultado: [{numero_venda: "V-0847", valor_final: 5430.00}]

    LC->>LLM: Formatar resposta em linguagem natural
    LLM-->>LC: "Sua maior venda foi..."

    Note over FE: SSE: streaming de tokens da resposta

    LC-->>API: Stream de tokens
    API-->>FE: SSE events com tokens
    FE-->>U: Resposta formatada com SQL expandivel

    API->>DB: Salvar mensagens em agent_messages
    API->>DB: Atualizar token count em agent_conversations
```

## Componentes do sistema

### 1. LangChain SQL Agent

O core do sistema usa o `createSqlAgent` do LangChain.js que orquestra:

- **SqlDatabase**: Conecta ao PostgreSQL via TypeORM com driver `pg`
- **SqlToolkit**: Fornece 3 ferramentas automaticas:
  - `query_sql_db` - Executa queries SELECT
  - `info_sql_db` - Retorna schema de tabelas especificas
  - `list_sql_tables` - Lista tabelas disponiveis
- **LLM**: Modelo configurado pelo usuario (GPT-4o, Claude, etc)
- **System Prompt**: Instrucoes customizaveis sobre contexto do negocio

O agent segue um loop ReAct (Reason + Act):
1. Analisa a pergunta do usuario
2. Decide quais tools usar
3. Executa tools (consulta schema, executa SQL)
4. Valida resultado
5. Se erro, corrige e re-executa
6. Gera resposta final em linguagem natural

### 2. Streaming (SSE)

```
API Route                          Frontend
    |                                  |
    |-- headers SSE ------------------>|
    |                                  |
    |-- data: {type: "thinking"}  ---->| Mostra "pensando..."
    |-- data: {type: "tool_call"} ---->| Mostra SQL no painel
    |-- data: {type: "token"}     ---->| Append token na mensagem
    |-- data: {type: "token"}     ---->| Append token
    |-- data: {type: "token"}     ---->| Append token
    |-- data: {type: "usage"}     ---->| Atualiza contador tokens
    |-- data: [DONE]              ---->| Finaliza mensagem
```

Tipos de eventos SSE:
- `thinking` - Agent esta processando/raciocinando
- `tool_call` - Agent chamou uma tool (SQL query, schema lookup)
- `tool_result` - Resultado de uma tool call
- `token` - Token de texto da resposta final
- `usage` - Contagem de tokens (input/output)
- `error` - Erro durante processamento
- `done` - Stream finalizado

### 3. Provider Factory

```typescript
// lib/agent-provider-factory.ts
function createLLM(config: AgentConfig): BaseChatModel {
  switch (config.provider) {
    case 'openai':
      return new ChatOpenAI({
        modelName: config.model,      // gpt-4o, gpt-4.5, etc
        openAIApiKey: decryptedKey,
        temperature: config.temperature,
        maxTokens: config.max_tokens,
        streaming: true,
      })
    case 'anthropic':
      return new ChatAnthropic({
        modelName: config.model,      // claude-sonnet-4-5, etc
        anthropicApiKey: decryptedKey,
        temperature: config.temperature,
        maxTokens: config.max_tokens,
        streaming: true,
      })
  }
}
```

### 4. Tabelas consultaveis

O agent tem acesso read-only as seguintes tabelas do MeguisPet:

| Tabela | Descricao | Dados principais |
|--------|-----------|------------------|
| `vendas` | Vendas realizadas | numero, data, valor, cliente, vendedor |
| `vendas_itens` | Itens das vendas | produto, qtd, preco, descontos, impostos |
| `clientes_fornecedores` | Clientes e fornecedores | nome, documento, email, telefone, endereco |
| `produtos` | Catalogo de produtos | nome, SKU, preco, categoria |
| `estoques` | Depositos/lojas | nome, localizacao |
| `produtos_estoques` | Estoque por deposito | quantidade, minimo, maximo |
| `vendedores` | Equipe de vendas | nome, comissao |
| `transacoes` | Financeiro | tipo (receita/despesa), valor, categoria |
| `categorias_financeiras` | Categorias financeiras | nome, tipo |
| `formas_pagamento` | Formas de pagamento | nome, taxa |
| `venda_parcelas` | Parcelas | valor, vencimento, status |
| `movimentacoes_estoque` | Movimentacoes | tipo (entrada/saida), qtd |
| `bling_vendas` | Vendas Bling ERP | dados sincronizados |
| `bling_nfe` | NFe Bling | notas fiscais sincronizadas |

### 5. Conexao com Supabase

```mermaid
graph LR
    subgraph "Conexoes Supabase"
        A[Agent SQL] -->|"TypeORM + pg<br/>SUPABASE_DB_URL<br/>read-only"| PG[(PostgreSQL)]
        B[CRUD conversas] -->|"Supabase Browser Client<br/>getSupabaseBrowser()<br/>com RLS"| PG
        C[API Routes auth] -->|"Supabase Server Auth<br/>getSupabaseServerAuth()<br/>com RLS"| PG
    end
```

- **SQL Agent**: Usa TypeORM + pg com connection string direta (`SUPABASE_DB_URL`). Conexao read-only para seguranca.
- **CRUD de conversas/config**: Usa `getSupabaseBrowser()` no frontend (com RLS automatico).
- **API Routes**: Usa `withSupabaseAuth` + `req.supabaseClient` para operacoes server-side autenticadas.

## Dependencias do sistema

```mermaid
graph LR
    subgraph "Pacotes novos"
        LC[langchain]
        LCC[@langchain/core]
        LCO[@langchain/openai]
        LCA[@langchain/anthropic]
        LCOM[@langchain/community]
        TO[typeorm]
        PG[pg]
    end

    subgraph "Ja instalados"
        ZOD[zod 4.1.12]
        REACT[react 19]
        NEXT[next 16]
        RADIX[radix-ui]
        SUPABASE[@supabase/supabase-js]
        FM[framer-motion]
        JSPDF[jspdf]
        XLSX[xlsx]
    end

    LC --> LCC
    LC --> ZOD
    LCOM --> TO
    TO --> PG
    LCO --> LCC
    LCA --> LCC
```
