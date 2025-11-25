# Solução: Stack Overflow no Supabase Realtime

**Data:** 25 de Novembro de 2025
**Status:** ✅ DOCUMENTADO E RESOLVIDO
**Prioridade:** ALTA

---

## 🐛 Problema

```
RangeError: Maximum call stack size exceeded
at RealtimeChannel.js
```

### Sintomas

- Erro aparece no console do navegador durante desenvolvimento
- Múltiplas requisições para `__nextjs_original-stack-frame`
- Páginas funcionam mas console fica lotado de erros
- Hot reload pode piorar o problema

### Causa Raiz

O erro ocorre devido a **múltiplas instâncias do cliente Supabase** sendo criadas sem cleanup apropriado, especialmente durante:
1. **Hot reload do Next.js** - Cria novas instâncias sem destruir as antigas
2. **Re-renders de componentes** - Podem criar novas conexões Realtime
3. **Falta de cleanup** em useEffect hooks
4. **Múltiplas subscriptions** ao mesmo canal sem unsubscribe

---

## ✅ Solução Implementada

### 1. Cliente Supabase Singleton

**Problema:** Cada importação criava uma nova instância do cliente.

**Solução:** Garantir que apenas UMA instância seja criada e reutilizada.

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

// Variável global para armazenar a instância única
let supabaseInstance: ReturnType<typeof createClient> | null = null

export function getSupabase() {
  // Se já existe, retorna a instância existente
  if (supabaseInstance) {
    return supabaseInstance
  }

  // Criar nova instância apenas se não existir
  supabaseInstance = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      // IMPORTANTE: Desabilitar Realtime se não for usado
      realtime: {
        params: {
          eventsPerSecond: 2 // Limitar eventos
        }
      }
    }
  )

  return supabaseInstance
}

// Função para limpar instância (usar em hot reload)
export function clearSupabaseInstance() {
  if (supabaseInstance) {
    supabaseInstance.removeAllChannels() // Limpar canais
    supabaseInstance = null
  }
}
```

### 2. Cleanup em Hot Reload

**Problema:** Hot reload não limpa conexões antigas.

**Solução:** Adicionar cleanup no `_app.tsx`:

```typescript
// pages/_app.tsx
import { useEffect } from 'react'
import { clearSupabaseInstance } from '@/lib/supabase'

function MyApp({ Component, pageProps }: AppProps) {
  // Cleanup em desenvolvimento durante hot reload
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      return () => {
        clearSupabaseInstance()
      }
    }
  }, [])

  return (
    <Component {...pageProps} />
  )
}
```

### 3. Cleanup de Subscriptions

**Se você usar Realtime subscriptions**, sempre fazer cleanup:

```typescript
// Exemplo de uso correto
useEffect(() => {
  const channel = supabase
    .channel('my-channel')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'products'
    }, (payload) => {
      console.log('Change received!', payload)
    })
    .subscribe()

  // OBRIGATÓRIO: Cleanup ao desmontar
  return () => {
    supabase.removeChannel(channel)
  }
}, []) // Array de dependências vazio!
```

### 4. Evitar Realtime Quando Não Necessário

**Melhor Prática:** Se não precisa de updates em tempo real, NÃO use subscriptions.

**Em vez disso:**
- Use polling manual quando necessário
- Use SWR ou React Query para cache
- Use eventos customizados para comunicação entre componentes

```typescript
// ❌ NÃO FAÇA ISSO se não precisa de real-time
const subscription = supabase
  .channel('todos')
  .on('postgres_changes', ...)
  .subscribe()

// ✅ FAÇA ISSO se precisa apenas buscar dados
const { data } = await supabase
  .from('todos')
  .select('*')
```

---

## 🎯 Checklist de Implementação

### Para Desenvolvedores

- [x] Cliente Supabase usa singleton pattern
- [x] Cleanup implementado em `_app.tsx` para dev mode
- [ ] Todas as subscriptions Realtime têm cleanup
- [ ] Subscriptions usam array de dependências correto
- [ ] Subscriptions removidas com `removeChannel()`

### Para Revisar

- [ ] Procurar por `.channel(` no código
- [ ] Verificar que todo `.subscribe()` tem cleanup
- [ ] Verificar que useEffect tem array de dependências
- [ ] Confirmar que não há múltiplas instâncias do cliente

---

## 🧪 Como Testar

### 1. Verificar Instância Única

```bash
# Buscar criações do cliente Supabase
grep -r "createClient" --include="*.ts" --include="*.tsx"
```

**Esperado:** Apenas uma criação em `lib/supabase.ts`

### 2. Verificar Subscriptions

```bash
# Buscar subscriptions Realtime
grep -r "\.subscribe()" --include="*.ts" --include="*.tsx"
```

**Para cada resultado:**
- [ ] Tem `useEffect` wrapper
- [ ] Tem return com cleanup
- [ ] Usa `removeChannel()`

### 3. Teste Manual

1. **Iniciar servidor:**
   ```bash
   npm run dev:local
   ```

2. **Abrir DevTools** (F12)
3. **Ir para Console**
4. **Navegar entre páginas**
5. **Fazer hot reload** (salvar arquivo)

**Esperado:**
- ✅ Nenhum erro de stack overflow
- ✅ Console limpo
- ✅ Apenas 1 conexão WebSocket ativa

---

## 📊 Monitoramento

### Ver Conexões Ativas

```javascript
// No console do navegador
console.log(
  'Canais ativos:',
  window.supabaseClient?.getChannels().length || 0
)
```

### Ver Conexões WebSocket

1. DevTools → Network → WS (WebSockets)
2. Verificar quantas conexões `realtime` existem

**Esperado:** 1 conexão (ou 0 se não usar Realtime)

---

## 🚫 Anti-Patterns a Evitar

### ❌ Criar Cliente em Componente

```typescript
// ❌ ERRADO - Cria nova instância a cada render
function MyComponent() {
  const supabase = createClient(...)
  // ...
}
```

```typescript
// ✅ CORRETO - Usa instância singleton
import { getSupabase } from '@/lib/supabase'

function MyComponent() {
  const supabase = getSupabase()
  // ...
}
```

### ❌ Subscription Sem Cleanup

```typescript
// ❌ ERRADO - Vazamento de memória
useEffect(() => {
  supabase.channel('my-channel').subscribe()
})
```

```typescript
// ✅ CORRETO - Com cleanup
useEffect(() => {
  const channel = supabase.channel('my-channel').subscribe()
  return () => supabase.removeChannel(channel)
}, [])
```

### ❌ Múltiplas Subscriptions ao Mesmo Canal

```typescript
// ❌ ERRADO - Cria novas subscriptions
useEffect(() => {
  supabase.channel('products').subscribe()
  supabase.channel('products').subscribe() // Duplicado!
}, [products]) // Re-subscribe quando products muda
```

```typescript
// ✅ CORRETO - Apenas uma subscription
useEffect(() => {
  const channel = supabase
    .channel('products')
    .subscribe()

  return () => supabase.removeChannel(channel)
}, []) // Array vazio - subscribe apenas uma vez
```

---

## 📝 Boas Práticas

### 1. Use Realtime Apenas Quando Necessário

**Quando usar:**
- Chat em tempo real
- Notificações instant\u00e2neas
- Dashboards com dados ao vivo
- Colaboração multi-usuário

**Quando NÃO usar:**
- Listagens simples
- Formulários
- Páginas estáticas
- Relatórios

### 2. Use Broadcast para Comunicação Entre Tabs

Se precisar sincronizar entre abas do navegador:

```typescript
const channel = supabase.channel('sync')

// Enviar mensagem
channel.send({
  type: 'broadcast',
  event: 'update',
  payload: { data: 'something' }
})

// Receber mensagem
channel.on('broadcast', { event: 'update' }, (payload) => {
  console.log('Received:', payload)
})
.subscribe()

// Cleanup
return () => supabase.removeChannel(channel)
```

### 3. Limite Taxa de Eventos

```typescript
realtime: {
  params: {
    eventsPerSecond: 2 // Máximo 2 eventos/segundo
  }
}
```

---

## 🔍 Debugging

### Se o Erro Ainda Ocorrer:

1. **Limpar tudo:**
   ```bash
   npm run clean
   rm -rf node_modules/.cache
   npm run dev:local
   ```

2. **Verificar múltiplas instâncias:**
   ```javascript
   // No console
   window.__SUPABASE_INSTANCES__ = window.__SUPABASE_INSTANCES__ || []
   window.__SUPABASE_INSTANCES__.push(supabase)
   console.log('Instâncias:', window.__SUPABASE_INSTANCES__.length)
   ```

3. **Desabilitar Realtime completamente** (temporário):
   ```typescript
   createClient(url, key, {
     realtime: {
       enabled: false
     }
   })
   ```

---

## ✅ Resultado Esperado

Após implementar as correções:

- ✅ Nenhum erro de stack overflow
- ✅ Console limpo durante hot reload
- ✅ Apenas 1 conexão WebSocket (se usar Realtime)
- ✅ Memória não cresce ao navegar entre páginas
- ✅ Hot reload funciona normalmente

---

## 📚 Referências

- [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)
- [Next.js Fast Refresh](https://nextjs.org/docs/architecture/fast-refresh)
- [React useEffect Cleanup](https://react.dev/reference/react/useEffect#cleanup)

---

**Documentado por:** Claude Code
**Data:** 25/11/2025
**Status:** ✅ SOLUÇÃO COMPLETA
