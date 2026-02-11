# Guia de Configuracao - Agente Megui

## Visao geral

Cada usuario do MeguisPet pode configurar o Agente Megui de acordo com suas preferencias. Todas as configuracoes sao armazenadas na tabela `agent_configs` no Supabase e podem ser alteradas a qualquer momento na aba "Configuracao" da pagina do Agente.

A configuracao e **por usuario** - cada usuario tem sua propria API key, modelo preferido, temperatura e prompt personalizado.

## Provedores LLM suportados

### OpenAI

| Modelo | ID | Context Window | Melhor para |
|--------|----|----------------|-------------|
| GPT-4o | `gpt-4o` | 128k tokens | Uso geral, melhor custo-beneficio |
| GPT-4o mini | `gpt-4o-mini` | 128k tokens | Respostas rapidas, menor custo |
| GPT-4.5 Preview | `gpt-4.5-preview` | 128k tokens | Maximo desempenho |

**Pacote:** `@langchain/openai`

**API Key:** Obtida em [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

**Formato da key:** `sk-proj-...` ou `sk-...`

### Anthropic

| Modelo | ID | Context Window | Melhor para |
|--------|----|----------------|-------------|
| Claude Sonnet 4.5 | `claude-sonnet-4-5-20250929` | 200k tokens | Melhor custo-beneficio |
| Claude Opus 4 | `claude-opus-4-20250514` | 200k tokens | Maximo desempenho |
| Claude Haiku 4.5 | `claude-haiku-4-5-20251001` | 200k tokens | Rapido e economico |

**Pacote:** `@langchain/anthropic`

**API Key:** Obtida em [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)

**Formato da key:** `sk-ant-...`

## Parametros do modelo

### Temperatura

**Range:** 0.0 a 2.0
**Default:** 0.3
**Recomendacao para SQL Agent:** 0.0 a 0.5

| Valor | Comportamento |
|-------|---------------|
| 0.0 | Deterministico - sempre a mesma resposta |
| 0.3 | Baixa variacao - ideal para consultas SQL (default) |
| 0.7 | Balanceado - bom para analises |
| 1.0 | Criativo - mais variacao nas respostas |
| 1.5+ | Muito criativo - nao recomendado para SQL |

**Dica:** Para consultas de dados, temperaturas baixas (0.0-0.5) geram queries SQL mais confiaveis. Para analises e insights, temperaturas moderadas (0.5-0.8) podem gerar observacoes mais interessantes.

### Max Tokens

**Range:** 256 a 16384
**Default:** 4096

Controla o tamanho maximo da resposta do agente. Valores maiores permitem respostas mais detalhadas mas consomem mais tokens (e portanto mais credito da API key).

| Valor | Uso |
|-------|-----|
| 1024 | Respostas curtas e diretas |
| 4096 | Padrao - suficiente para maioria das consultas |
| 8192 | Analises detalhadas com muitos dados |
| 16384 | Relatorios completos |

### Top P (Nucleus Sampling)

**Range:** 0.0 a 1.0
**Default:** 1.0

Controla a diversidade das respostas. Na pratica, para SQL Agents, manter em 1.0 (padrao) e suficiente. Ajuste a temperatura em vez de top_p.

## System Prompt

### Prompt padrao

O prompt padrao da Megui (armazenado em `lib/agent-default-prompt.ts`) e:

```
Voce e a Megui, assistente de IA especializada no sistema de gestao MeguisPet.
Voce ajuda os usuarios a entender seus dados de negocio consultando o banco de dados.

Regras:
1. Sempre use SQL PostgreSQL valido
2. Apenas queries SELECT sao permitidas
3. Limite resultados a no maximo 500 linhas
4. Formate valores monetarios em BRL (R$)
5. Datas devem ser apresentadas no formato brasileiro (DD/MM/YYYY)
6. Responda sempre em portugues brasileiro
7. Explique os resultados de forma clara e objetiva para leigos
8. Quando relevante, sugira perguntas de acompanhamento
9. Se nao tiver certeza sobre uma coluna ou tabela, use a tool info_sql_db primeiro
10. Nunca invente dados - sempre consulte o banco

Contexto do negocio:
- MeguisPet e um pet shop com sistema de gestao
- Vendas sao registradas na tabela 'vendas' com itens em 'vendas_itens'
- Clientes e fornecedores estao na tabela 'clientes_fornecedores'
  (campo 'tipo' diferencia: 'cliente', 'fornecedor', 'ambos')
- Produtos estao na tabela 'produtos' com precos e categorias
- Financeiro usa 'transacoes' (tipo: 'receita' ou 'despesa')
- Vendedores sao registrados em 'vendedores'
- Estoque e multi-deposito via 'estoques' e 'produtos_estoques'

Formatacao:
- Use **negrito** para valores importantes
- Use listas quando houver multiplos itens
- Arredonde valores monetarios para 2 casas decimais
- Use separador de milhares brasileiro (1.234,56)
```

### Personalizacao

O usuario pode editar o prompt na aba de Configuracao. Casos de uso:

- **Adicionar contexto**: "Nossa loja principal e o estoque 'Matriz'. Quando eu perguntar sobre estoque, considere apenas esse deposito."
- **Mudar formato**: "Sempre responda em formato de bullet points."
- **Focar em area**: "Foque suas analises em vendas e financeiro."
- **Persona**: "Seja mais direto e objetivo nas respostas."

**Botao "Restaurar Padrao"**: Volta ao prompt original (seta `system_prompt` para NULL no banco, que faz o backend usar o padrao).

## Skills

Skills controlam quais ferramentas o agente pode usar. Ver [SKILLS.md](./SKILLS.md) para detalhes completos.

### Skills disponiveis (Fase 1)

| Skill | ID | Default | Descricao |
|-------|----|---------|-----------|
| Consulta SQL | `sql_query` | Habilitada | Executa queries SELECT no banco |
| Explorador de Schema | `schema_explorer` | Habilitada | Explora estrutura das tabelas |
| Analise de Dados | `data_analysis` | Habilitada | Formata e analisa resultados |

### Skills futuras

| Skill | ID | Descricao |
|-------|----|-----------|
| Gerar PDF | `generate_pdf` | Cria relatorios em PDF |
| Gerar Excel | `generate_excel` | Exporta dados em XLSX |
| Criar Venda | `create_sale` | Cria rascunhos de venda |
| Enviar Email | `send_email` | Envia relatorios por email |
| Gerar Grafico | `generate_chart` | Renderiza graficos |

## Servidores MCP

### O que e MCP

MCP (Model Context Protocol) e um protocolo que permite conectar ferramentas externas ao agente. Cada servidor MCP expoe um conjunto de tools que o agente pode usar.

### Configuracao

Na secao "Servidores MCP" da aba de Configuracao:

| Campo | Descricao |
|-------|-----------|
| Nome | Nome descritivo do servidor |
| URL | Endpoint do servidor MCP (ex: `http://localhost:3001/mcp`) |
| Ativo | Toggle para habilitar/desabilitar |
| Descricao | Descricao opcional do que o servidor faz |

### Armazenamento

Servidores MCP sao armazenados no campo `mcp_servers` (JSONB) da tabela `agent_configs`:

```json
[
  {
    "name": "Ferramentas Extras",
    "url": "http://localhost:3001/mcp",
    "enabled": true,
    "description": "Servidor local com ferramentas customizadas"
  }
]
```

## Fluxo de configuracao (primeira vez)

1. Usuario acessa a pagina do Agente Megui pela primeira vez
2. Ve mensagem de boas-vindas pedindo para configurar API key
3. Clica em "Ir para Configuracao"
4. Seleciona provedor (OpenAI ou Anthropic)
5. O dropdown de modelos atualiza automaticamente com modelos do provedor
6. Cola a API key e clica "Salvar"
7. API key e encriptada (AES-256-GCM) e salva no Supabase
8. Demais parametros podem ser ajustados (temperatura, prompt, skills)
9. Volta para aba Chat e comeca a usar

## Variaveis de ambiente necessarias

| Variavel | Onde configurar | Descricao |
|----------|-----------------|-----------|
| `SUPABASE_DB_URL` | Doppler | Connection string PostgreSQL do Supabase |
| `AGENT_ENCRYPTION_KEY` | Doppler | Chave AES-256 para encriptar API keys (32 bytes hex) |

**Nota:** As API keys dos provedores LLM (OpenAI, Anthropic) sao configuradas por cada usuario na interface, nao como variaveis de ambiente do servidor.
