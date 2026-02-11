# Agente Megui - Assistente IA do MeguisPet

## O que e

O Agente Megui e uma assistente de inteligencia artificial integrada ao sistema MeguisPet que permite aos usuarios fazerem perguntas em linguagem natural sobre os dados do negocio. A Megui consulta o banco de dados PostgreSQL do Supabase e retorna respostas claras e formatadas, sem que o usuario precise conhecer SQL ou a estrutura do banco.

## Como funciona

1. O usuario digita uma pergunta em portugues (ex: "Qual foi minha maior venda esse mes?")
2. A Megui interpreta a pergunta usando um modelo de linguagem (OpenAI GPT-4o ou Anthropic Claude)
3. O LangChain SQL Agent gera automaticamente as queries SQL necessarias
4. As queries sao executadas de forma read-only no banco de dados
5. Os resultados sao transformados em uma resposta em linguagem natural
6. O usuario ve a resposta formatada, com opcao de expandir os detalhes tecnicos (SQL, tabelas consultadas, tempo de execucao)

## Exemplos de perguntas

- "Quantas vendas tivemos esse mes?"
- "Qual o produto mais vendido nos ultimos 3 meses?"
- "Qual vendedor mais vendeu em todos os tempos?"
- "Quais clientes nao compram ha mais de 3 meses?"
- "Qual foi o faturamento total de janeiro?"
- "Quais produtos estao com estoque abaixo de 10 unidades?"
- "Compare as vendas desse mes com o mes passado"

## Stack tecnologico

| Componente | Tecnologia |
|------------|------------|
| Framework de agente | LangChain.js com SQL Agent Toolkit |
| Conexao ao banco | TypeORM + pg (PostgreSQL driver) |
| Provedores LLM | OpenAI (@langchain/openai) + Anthropic (@langchain/anthropic) |
| Streaming | Server-Sent Events (SSE) via Next.js API Routes |
| Frontend | React 19 + Radix UI + Framer Motion |
| Armazenamento | Supabase PostgreSQL com RLS |
| Encriptacao | AES-256-GCM para API keys |

## Funcionalidades principais

- **Chat em linguagem natural**: Interface estilo ChatGPT com streaming de tokens
- **Multiplas conversas**: Abas para gerenciar diferentes threads de conversa
- **Historico por usuario**: Cada usuario tem seu proprio historico isolado
- **Configuracao personalizavel**: Escolha de modelo, temperatura, prompt customizado
- **Transparencia**: Mostra SQL executado, tabelas consultadas e tempo de resposta
- **Contagem de tokens**: Indicador de uso de tokens e janela de contexto
- **Skills extensiveis**: Arquitetura preparada para adicionar capacidades futuras (gerar PDF, exportar Excel, etc)
- **Seguranca**: Queries read-only, API keys encriptadas, RLS por usuario

## Documentacao detalhada

| Documento | Conteudo |
|-----------|----------|
| [ARQUITETURA.md](./ARQUITETURA.md) | Arquitetura tecnica com diagramas de fluxo |
| [DATABASE.md](./DATABASE.md) | Schema das tabelas no Supabase |
| [API.md](./API.md) | Documentacao das API routes |
| [UI_UX.md](./UI_UX.md) | Design da interface e wireframes |
| [SKILLS.md](./SKILLS.md) | Sistema de skills extensivel |
| [CONFIGURACAO.md](./CONFIGURACAO.md) | Guia de configuracoes do agente |
| [SEGURANCA.md](./SEGURANCA.md) | Modelo de seguranca |

## Estrutura de arquivos

```
pages/agente.tsx                          # Pagina principal
pages/api/agente/                         # API routes
  chat.ts                                 # Streaming chat (SSE)
  config.ts                               # Configuracao do usuario
  conversations.ts                        # CRUD conversas
  conversations/[id].ts                   # Conversa individual
  conversations/[id]/messages.ts          # Mensagens
  schema.ts                               # Metadados do banco

components/agente/                        # Componentes React
  ChatInterface.tsx                       # Orquestrador principal
  ChatMessage.tsx                         # Bolha de mensagem
  ChatInput.tsx                           # Input com attach/send
  ChatThinking.tsx                        # Indicador de pensamento
  SqlQueryPanel.tsx                       # Painel SQL expandivel
  TokenCounter.tsx                        # Contador de tokens
  ContextWindowIndicator.tsx              # Indicador de contexto
  ConversationTabs.tsx                    # Abas de conversas
  AgentConfigPanel.tsx                    # Painel de configuracao
  ModelSelector.tsx                       # Seletor de modelo
  SystemPromptEditor.tsx                  # Editor de prompt
  SkillsConfig.tsx                        # Config de skills
  McpServerConfig.tsx                     # Config de MCP

services/agenteService.ts                 # Service layer
lib/agent-*.ts                            # Utilitarios do agente
database/migrations/026_agent_megui_system.sql  # Migration
```
