# UI/UX Design - Agente Megui

## Visao geral

A interface do Agente Megui segue os padroes visuais do MeguisPet (Shadcn/ui, Radix UI, Tailwind CSS 4) e oferece uma experiencia de chat profissional com foco em transparencia (mostrando o que o agente esta fazendo) e customizacao.

## Layout principal

A pagina usa o componente `Tabs` do Radix UI (mesmo padrao da pagina Bling) com 2 abas:

### Aba 1: Chat

```
+------------------------------------------------------------------+
| Header                                                            |
| ┌──────────────────────────────────────────────────────────────┐  |
| │ 🤖 Megui - Assistente IA               [Tokens: 2.1k/128k] │  |
| │                                         [Context ▓▓░░ 15%]  │  |
| └──────────────────────────────────────────────────────────────┘  |
|                                                                   |
| Conversation Tabs                                                 |
| ┌──────────────────────────────────────────────────────────────┐  |
| │ [📌 Vendas] [Clientes inativos] [Estoque] [+ Nova conversa] │  |
| └──────────────────────────────────────────────────────────────┘  |
|                                                                   |
| Messages Area (scroll)                                            |
| ┌──────────────────────────────────────────────────────────────┐  |
| │                                                              │  |
| │  ┌─────────────────────────────────────────────────────┐     │  |
| │  │ 🤖 Megui                                    09:00   │     │  |
| │  │ Ola! Sou a Megui, sua assistente de dados            │     │  |
| │  │ do MeguisPet. Posso ajudar com perguntas             │     │  |
| │  │ sobre vendas, clientes, produtos e mais.             │     │  |
| │  └─────────────────────────────────────────────────────┘     │  |
| │                                                              │  |
| │           ┌────────────────────────────────────────────┐     │  |
| │           │ Qual foi minha maior venda esse mes?  👤   │     │  |
| │           │                                      09:01 │     │  |
| │           └────────────────────────────────────────────┘     │  |
| │                                                              │  |
| │  ┌─────────────────────────────────────────────────────┐     │  |
| │  │ 🤖 Megui                                    09:01   │     │  |
| │  │                                                      │     │  |
| │  │ ▼ Consultando banco de dados...                      │     │  |
| │  │ ┌─────────────────────────────────────────────┐      │     │  |
| │  │ │ 📊 Tabelas: vendas, clientes_fornecedores   │      │     │  |
| │  │ │ 🔍 SQL:                                     │      │     │  |
| │  │ │   SELECT v.numero_venda, v.valor_final,     │      │     │  |
| │  │ │     cf.nome AS cliente                      │      │     │  |
| │  │ │   FROM vendas v                             │      │     │  |
| │  │ │   LEFT JOIN clientes_fornecedores cf        │      │     │  |
| │  │ │     ON cf.id = v.cliente_id                 │      │     │  |
| │  │ │   WHERE v.data_venda >= '2026-02-01'        │      │     │  |
| │  │ │   ORDER BY v.valor_final DESC LIMIT 1       │      │     │  |
| │  │ │ ⏱️ 42ms | 1 linha retornada                │      │     │  |
| │  │ └─────────────────────────────────────────────┘      │     │  |
| │  │                                                      │     │  |
| │  │ Sua maior venda este mes foi a **#V-2024-0847**      │     │  |
| │  │ no valor de **R$ 5.430,00**, realizada em             │     │  |
| │  │ **08/02/2026** para o cliente "Pet Shop Amigos".      │     │  |
| │  │                                                      │     │  |
| │  │ 💡 Quer saber mais detalhes sobre esta venda?        │     │  |
| │  │                              [87 tokens | gpt-4o]    │     │  |
| │  └─────────────────────────────────────────────────────┘     │  |
| │                                                              │  |
| └──────────────────────────────────────────────────────────────┘  |
|                                                                   |
| Input Area                                                        |
| ┌──────────────────────────────────────────────────────────────┐  |
| │ [📎] Digite sua pergunta...                        [▶ Send] │  |
| └──────────────────────────────────────────────────────────────┘  |
+------------------------------------------------------------------+
```

### Aba 2: Configuracao

```
+------------------------------------------------------------------+
| [Chat] [⚙️ Configuracao]                                         |
+------------------------------------------------------------------+
|                                                                   |
| Card: Modelo                                                      |
| ┌──────────────────────────────────────────────────────────────┐  |
| │ Provedor                    Modelo                           │  |
| │ ┌──────────────────┐       ┌──────────────────────────┐      │  |
| │ │ OpenAI         ▼ │       │ gpt-4o                ▼  │      │  |
| │ └──────────────────┘       └──────────────────────────┘      │  |
| │                                                              │  |
| │ API Key                                                      │  |
| │ ┌──────────────────────────────────────────────┐ ┌────────┐  │  |
| │ │ sk-...abc ●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●● │ │ Salvar │  │  |
| │ └──────────────────────────────────────────────┘ └────────┘  │  |
| │ ✅ API key configurada                                       │  |
| └──────────────────────────────────────────────────────────────┘  |
|                                                                   |
| Card: Parametros do Modelo                                        |
| ┌──────────────────────────────────────────────────────────────┐  |
| │ Temperatura                                                  │  |
| │ ●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  0.3          │  |
| │ Mais preciso ◄──────────────────────────► Mais criativo      │  |
| │                                                              │  |
| │ Max Tokens                   Top P                           │  |
| │ ┌────────────┐              ┌────────────┐                   │  |
| │ │ 4096       │              │ 1.0        │                   │  |
| │ └────────────┘              └────────────┘                   │  |
| └──────────────────────────────────────────────────────────────┘  |
|                                                                   |
| Card: System Prompt                                               |
| ┌──────────────────────────────────────────────────────────────┐  |
| │ Instrucoes personalizadas para o agente                      │  |
| │ ┌──────────────────────────────────────────────────────────┐ │  |
| │ │ Voce e a Megui, assistente de IA especializada no        │ │  |
| │ │ sistema de gestao MeguisPet. Voce ajuda os usuarios      │ │  |
| │ │ a entender seus dados de negocio consultando o banco     │ │  |
| │ │ de dados...                                              │ │  |
| │ └──────────────────────────────────────────────────────────┘ │  |
| │                                        [Restaurar Padrao]    │  |
| └──────────────────────────────────────────────────────────────┘  |
|                                                                   |
| Card: Skills                                                      |
| ┌──────────────────────────────────────────────────────────────┐  |
| │ ☑ Consulta SQL        Consulta o banco de dados              │  |
| │ ☑ Explorador Schema   Explora estrutura das tabelas          │  |
| │ ☑ Analise de Dados    Formata e analisa resultados           │  |
| │ ☐ Gerar PDF           Cria relatorios em PDF (em breve)      │  |
| │ ☐ Gerar Excel         Exporta dados em XLSX (em breve)       │  |
| └──────────────────────────────────────────────────────────────┘  |
|                                                                   |
| Card: Servidores MCP                                              |
| ┌──────────────────────────────────────────────────────────────┐  |
| │ Nome            URL                          ☑ Ativo         │  |
| │ ────────────────────────────────────────────────────────     │  |
| │ (nenhum servidor configurado)                                │  |
| │                                                              │  |
| │ [+ Adicionar servidor MCP]                                   │  |
| └──────────────────────────────────────────────────────────────┘  |
|                                                                   |
|                                              [Salvar Alteracoes]  |
+------------------------------------------------------------------+
```

## Componentes

### 1. ChatInterface.tsx (Orquestrador)

O componente principal que coordena todos os subcomponentes do chat.

**Responsabilidades:**
- Gerencia estado do chat (mensagens, loading, streaming)
- Faz fetch SSE para `/api/agente/chat`
- Parseia eventos SSE e atualiza UI em tempo real
- Scroll automatico para ultima mensagem
- Gerencia estado de "parar" streaming

**Props:** Nenhuma (usa estado local)

**Estado:**
```typescript
messages: AgentMessage[]          // Mensagens da conversa ativa
isStreaming: boolean               // Se esta recebendo tokens
currentResponse: string           // Resposta sendo construida
currentToolCalls: AgentToolCall[]  // Tools chamadas na resposta atual
activeConversationId: string      // UUID da conversa ativa
conversations: AgentConversation[] // Lista de conversas
```

### 2. ChatMessage.tsx (Mensagem individual)

Renderiza uma bolha de mensagem diferenciada por role.

**Visual por role:**
- **user**: Alinhado a direita, fundo com cor accent (amber/orange)
- **assistant**: Alinhado a esquerda, fundo card (branco/dark)
- **tool**: Dentro da mensagem do assistant, painel expandivel

**Props:**
```typescript
{
  message: AgentMessage
  isStreaming?: boolean    // Se esta sendo escrita em tempo real
}
```

**Features:**
- Markdown rendering no conteudo (negrito, listas, codigo)
- Timestamp no canto
- Contagem de tokens (para assistant)
- Modelo usado (badge no canto, ex: "gpt-4o")

### 3. ChatInput.tsx (Entrada de texto)

Textarea com auto-resize, botao de anexo e envio.

**Props:**
```typescript
{
  onSend: (message: string, attachments?: File[]) => void
  isStreaming: boolean
  onStop: () => void
}
```

**Comportamento:**
- `Enter` = envia mensagem
- `Shift+Enter` = nova linha
- Auto-resize ate 6 linhas
- Botao muda de "Enviar" para "Parar" durante streaming
- Botao de anexo abre file picker
- Desabilitado durante streaming (exceto botao parar)

### 4. ChatThinking.tsx (Indicador de pensamento)

Animacao que aparece enquanto o agent esta processando.

**Estados visuais:**
- "Analisando sua pergunta..." (thinking)
- "Consultando banco de dados..." (tool_call)
- "Gerando resposta..." (token streaming)

**Animacao:** 3 dots pulsando (Framer Motion) com texto do estado atual

### 5. SqlQueryPanel.tsx (Painel SQL expandivel)

Painel colapsavel dentro da mensagem do assistant que mostra detalhes tecnicos.

**Visual:**
```
▼ Consultando banco de dados...
┌─────────────────────────────────────────────┐
│ 📊 Tabelas: vendas, clientes_fornecedores   │
│ 🔍 SQL:                                     │
│   SELECT v.numero_venda, v.valor_final      │
│   FROM vendas v ...                          │
│ ⏱️ 42ms | 1 linha retornada                 │
└─────────────────────────────────────────────┘
```

**Props:**
```typescript
{
  toolCalls: AgentToolCall[]
  sqlQueries: AgentSqlQuery[]
  defaultExpanded?: boolean
}
```

**Features:**
- Toggle expand/collapse com animacao
- SQL com syntax highlighting basico (code block)
- Icones para tabelas, tempo, linhas
- Multiplas queries em sequencia (quando agent faz varias consultas)

### 6. TokenCounter.tsx (Contador de tokens)

Badge pequeno mostrando uso de tokens da conversa.

**Visual:** `[Tokens: 2.1k / 128k]`

**Props:**
```typescript
{
  inputTokens: number
  outputTokens: number
  maxTokens: number  // Janela de contexto do modelo
}
```

### 7. ContextWindowIndicator.tsx (Indicador de contexto)

Barra de progresso horizontal mostrando % de uso da janela de contexto.

**Visual:** `[Context ▓▓▓░░░░░░░ 32%]`

**Cores:**
- Verde (0-60%): Bastante espaco
- Amarelo (60-80%): Atencao
- Vermelho (80-100%): Proximo do limite

**Acao ao chegar em 80%:** Exibe botao "Resumir conversa" que dispara um request para o agent gerar um sumario e iniciar nova janela de contexto.

### 8. ConversationTabs.tsx (Abas de conversas)

Barra horizontal de abas para alternar entre conversas.

**Visual:**
```
[📌 Vendas do mes] [Analise clientes] [+ Nova conversa]
```

**Props:**
```typescript
{
  conversations: AgentConversation[]
  activeId: string
  onSelect: (id: string) => void
  onCreate: () => void
  onDelete: (id: string) => void
  onRename: (id: string, titulo: string) => void
  onPin: (id: string) => void
}
```

**Features:**
- Scroll horizontal quando muitas abas (usa ScrollableContainer existente)
- Conversas fixadas aparecem primeiro com icone 📌
- Click direito (ou menu ...) abre opcoes: Renomear, Fixar, Deletar
- Botao "+ Nova conversa" no final
- Preview do titulo (truncado se longo)

### 9. AgentConfigPanel.tsx (Configuracao)

Painel completo de configuracao com cards organizados por secao.

**Subcomponentes:**
- `ModelSelector.tsx` - Dropdowns de Provider e Model
- `SystemPromptEditor.tsx` - Textarea com botao restaurar padrao
- `SkillsConfig.tsx` - Lista de skills com Switch toggle
- `McpServerConfig.tsx` - Tabela de servidores MCP com add/remove

**Salvar:** Botao "Salvar Alteracoes" no final que chama PUT `/api/agente/config`

## Interacoes e estados

### Estado vazio (primeira vez)
```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│                   🤖 Bem-vindo a Megui!                      │
│                                                              │
│   Sou sua assistente de IA para consultas de dados           │
│   do MeguisPet.                                              │
│                                                              │
│   ⚠️ Configure sua API key na aba Configuracao               │
│   para comecar a usar.                                       │
│                                                              │
│   Exemplos de perguntas:                                     │
│   • "Qual foi minha maior venda esse mes?"                   │
│   • "Quais produtos estao com estoque baixo?"                │
│   • "Qual vendedor mais vendeu essa semana?"                 │
│                                                              │
│                    [Ir para Configuracao]                     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Estado de erro
```
┌──────────────────────────────────────────────────────────────┐
│  ❌ Erro ao processar sua pergunta                           │
│                                                              │
│  A API retornou um erro. Verifique se sua API key            │
│  esta correta na aba Configuracao.                           │
│                                                              │
│  [Tentar novamente]                                          │
└──────────────────────────────────────────────────────────────┘
```

### Estado de streaming (enquanto agent pensa)
```
┌──────────────────────────────────────────────────────────────┐
│  🤖 Megui                                                    │
│                                                              │
│  ● ● ● Consultando banco de dados...                        │
│                                                              │
│  ▼ query_sql_db                                              │
│  ┌─────────────────────────────────────────┐                 │
│  │ SELECT v.numero_venda, v.valor_final    │                 │
│  │ FROM vendas v ...                        │                 │
│  └─────────────────────────────────────────┘                 │
│                                                              │
│                                         [■ Parar]           │
└──────────────────────────────────────────────────────────────┘
```

## Responsividade

### Desktop (>= 1024px)
- Layout completo conforme wireframes acima
- Abas de conversas em linha horizontal
- SQL panel expandido por padrao

### Tablet (768px - 1023px)
- Layout identico mas com margens menores
- SQL panel colapsado por padrao
- Input area usa largura total

### Mobile (< 768px)
- Abas de conversas em scroll horizontal compacto
- Mensagens ocupam largura total
- SQL panel colapsado
- Input area fixa no bottom
- Config panel em layout vertical (cards empilhados)

## Componentes reutilizados do projeto

| Componente | Uso no Agente |
|------------|---------------|
| `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` | Abas Chat/Config |
| `Card`, `CardHeader`, `CardTitle`, `CardContent` | Cards de config, mensagens |
| `Button` (variantes) | Enviar, Parar, Salvar, Restaurar |
| `Input` | API key, max tokens |
| `Textarea` | System prompt, chat input |
| `Select` | Provider, modelo |
| `Switch` | Skills toggle |
| `Badge` | Modelo usado, token count |
| `ScrollableContainer` | Abas de conversas em scroll |
| `useToast()` | Notificacoes (config salva, erros) |
| Framer Motion | Animacao de mensagens, thinking dots |

## Icones (lucide-react)

| Icone | Uso |
|-------|-----|
| `Bot` | Sidebar menu, avatar da Megui |
| `Send` | Botao enviar mensagem |
| `Square` | Botao parar streaming |
| `Paperclip` | Botao anexar arquivo |
| `Settings` | Aba configuracao |
| `Sparkles` | Destaque IA |
| `Database` | Indicador de consulta SQL |
| `Clock` | Tempo de execucao |
| `ChevronDown` / `ChevronUp` | Expand/collapse SQL panel |
| `Plus` | Nova conversa |
| `Pin` | Fixar conversa |
| `Trash2` | Deletar conversa |
| `Pencil` | Renomear conversa |
| `Copy` | Copiar SQL/resposta |
| `AlertCircle` | Erro |
| `Loader2` | Loading spinner |
