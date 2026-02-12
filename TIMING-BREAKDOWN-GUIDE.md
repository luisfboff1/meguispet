# ⏱️ Timing Breakdown - Guia Completo

## O que foi adicionado

### 1. **Backend** - Cálculo detalhado de timing

**Arquivo**: `pages/api/agente/chat.ts`

Agora o backend calcula e salva:
- **Total time**: Tempo total da resposta
- **LLM thinking time**: Tempo que o GPT-5-nano passou "pensando"
- **Tool execution time**: Tempo consultando o banco de dados (soma de todas as queries)
- **Tools count**: Quantas queries foram executadas

**Exemplo de log**:
```
[AGENT DEBUG] Tempo total: 68737ms
  - LLM thinking: 67917ms (98.8%)
  - Tool execution: 820ms (1.2%)
[AGENT DEBUG] Tool calls feitas: 5
```

### 2. **Database** - Nova coluna `timing_breakdown`

**Migration**: `029_agent_timing_breakdown.sql`

Adiciona coluna JSONB na tabela `agent_messages`:

```sql
{
  "total_time_ms": 68737,
  "llm_thinking_ms": 67917,
  "tool_execution_ms": 820,
  "tools_count": 5
}
```

### 3. **Frontend** - Ícone (i) com tooltip

**Arquivo**: `components/agente/ChatMessage.tsx`

Adicionado ícone **Info (i)** ao lado do botão "Copiar":
- Aparece apenas em mensagens do assistente
- Mostra tooltip no hover com:
  - **Tokens**: Input e Output
  - **Tempo total**: Duração completa
  - **LLM pensando**: Quanto tempo o GPT-5 gastou "pensando" (% do total)
  - **Consultando BD**: Tempo das queries SQL (% do total)
  - **Queries executadas**: Quantidade de tool calls

**Visual do tooltip**:
```
┌─────────────────────────────┐
│ Tokens                      │
│ Input:     102,094          │
│ Output:      6,293          │
├─────────────────────────────┤
│ Tempo                68.7s  │
│ LLM pensando:    67.9s (99%)│
│ Consultando BD:  0.8s  (1%) │
│ Queries executadas: 5       │
└─────────────────────────────┘
```

## Problema identificado

Nos logs do usuário:
- **Tempo total**: 68.7 segundos ⏱️
- **Tempo de SQL**: 0.8 segundos (820ms)
- **Tempo "pensando"**: **67.9 segundos** 🤔

**98.8% do tempo** foi o GPT-5-nano "pensando", não as queries!

### Por que isso acontece?

1. **Cold start** do modelo - Primeira request após inatividade
2. **Rate limiting** da OpenAI - Throttling de velocidade
3. **Latência de rede** - Conexão lenta com a API
4. **Modelo pensando** - GPT-5-nano pode ser mais lento que GPT-4o em alguns casos

### Possíveis soluções

1. **Usar streaming mais agressivo** - Já está habilitado, mas pode otimizar
2. **Reduzir recursion_limit** - De 25 para 15 (menos iterações do agente)
3. **Prompt mais direto** - Reduzir instruções complexas
4. **Cache de prompt** - OpenAI cacheia automaticamente prompts >1024 tokens
5. **Verificar latência da API** - Pode ser problema de rede

## Como executar

### 1. Execute a migration no Supabase

```bash
# Abra o Supabase SQL Editor
# Cole TODO o conteúdo de database/EXECUTAR_NO_SUPABASE.sql
# Clique em "Run"
```

O script já inclui:
- ✅ Migration 027 (recursion_limit)
- ✅ Migration 028 (gpt-5-nano default)
- ✅ Migration 029 (timing_breakdown)

### 2. Faça deploy

```bash
git add .
git commit -m "feat: add timing breakdown with (i) tooltip showing LLM vs DB time"
git push origin master
```

### 3. Teste no frontend

1. Vá para `/agente`
2. Faça uma pergunta
3. Aguarde a resposta
4. **Passe o mouse sobre o ícone (i)** ao lado do "Copiar"
5. Veja o breakdown detalhado de timing!

## Arquivos modificados

### Backend
- `pages/api/agente/chat.ts` - Cálculo de timing breakdown
- `types/index.ts` - Interface `AgentTimingBreakdown`

### Frontend
- `components/agente/ChatMessage.tsx` - Ícone (i) com tooltip

### Database
- `database/migrations/029_agent_timing_breakdown.sql` - Nova coluna
- `database/EXECUTAR_NO_SUPABASE.sql` - Script completo atualizado

## Exemplo real

**Pergunta**: "Qual o lucro do cliente IELENPET?"

**Timing breakdown**:
```
Total: 68.7s
├─ LLM pensando:    67.9s (98.8%)  ⚠️ MUITO LENTO!
└─ Consultando BD:   0.8s  (1.2%)  ✅ Rápido

Queries executadas: 5
- SELECT id, nome FROM clientes_fornecedores... (290ms)
- SELECT v.*, cf.* FROM vendas... (70ms)
- SELECT SUM(lucro)... (67ms)
- etc.
```

## Próximos passos (otimização)

1. **Investigar latência da OpenAI API**
   - Medir tempo de network vs tempo de processamento
   - Testar em diferentes horários

2. **Prompt caching**
   - Verificar se o cache está sendo usado
   - System prompt (~10k tokens) deveria ser cachado

3. **Reduzir recursion_limit**
   - Testar com 15 em vez de 25
   - Menos iterações = mais rápido

4. **Comparar com GPT-4o**
   - Será que o GPT-4o é mais rápido?
   - Trade-off: custo vs velocidade

5. **Streaming optimization**
   - Verificar se SSE está otimizado
   - Buffer size adequado?

---

Feito! 🎉 Agora você pode ver exatamente onde o tempo está sendo gasto.
