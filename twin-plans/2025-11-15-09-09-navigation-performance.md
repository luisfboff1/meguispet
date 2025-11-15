# Twin Development Plan
Generated: 2025-11-15 08:31:23
Task: Resolver problema de navegação lenta entre páginas (URL muda mas página não atualiza, demora principalmente em mobile)
Quality Level: pragmatic

## Análise Técnica

### Estado Atual
O sistema usa Next.js Pages Router com autenticação Supabase. A navegação está extremamente lenta devido a múltiplas verificações de autenticação e re-renders bloqueantes.

### Problema Identificado
**Sintoma**: URL muda mas conteúdo da página demora para atualizar, especialmente em mobile.

**Causa Raiz** (6 problemas identificados):

1. **MainLayout.tsx** bloqueia renderização com múltiplos `useEffect`:
   - Linha 51-53: hydration check
   - Linha 55-59: verificação de auth com redirect
   - Linha 61-70: listener de eventos de rota
   - Linhas 78-84: renderiza "Carregando..." bloqueando transições

2. **useAuth.ts** executa operações pesadas em todo re-render:
   - `checkAuth()` (linha 86-135) faz chamada Supabase + API backend
   - `synchronizeLocalStorage()` (linha 48-50) roda em todo re-render
   - Múltiplos listeners (linhas 137-183) causando verificações duplicadas

3. **middleware.ts** faz 2 chamadas Supabase em TODA navegação:
   - `getSession()` + `getUser()` (linhas 51-59)
   - Adiciona ~200-500ms de latência por navegação

4. **Dupla verificação**: middleware verifica auth → MainLayout verifica novamente (linha 56-59)

5. **Navegação não otimizada**: usa `window.location.href` (dashboard.tsx:259) ao invés de Next.js `<Link>`

6. **Loading state bloqueante**: MainLayout renderiza loading (linha 78-84) em vez de transição suave

### Impacto no Usuário
- **Desktop**: 500-800ms de delay por navegação
- **Mobile**: 1-2 segundos (pior com latência de rede)
- **UX ruim**: sensação de app travado

## Plano de Implementação

### Objetivo
Reduzir latência de navegação de ~1-2s para <200ms, com transições suaves e sem bloqueios.

### Arquivos a Modificar

1. **components/layout/main-layout.tsx** - Otimizar re-renders e remover verificações bloqueantes
2. **hooks/useAuth.ts** - Remover operações pesadas síncronas, otimizar listeners
3. **middleware.ts** - Otimizar para usar apenas 1 chamada Supabase
4. **pages/_app.tsx** - Adicionar transição de página com `router.events`
5. **components/layout/sidebar.tsx** - Verificar e otimizar re-renders
6. **pages/dashboard.tsx** (e outras páginas) - Substituir `window.location.href` por Next.js `<Link>`

### Mudanças Específicas

#### 1. MainLayout.tsx
```typescript
// ❌ ANTES: Múltiplos useEffects bloqueantes
useEffect(() => {
  if (!isNoLayoutPage && hydrated && !loading && !isAuthenticated) {
    router.replace('/login')  // ← BLOQUEIA
  }
}, [hydrated, isAuthenticated, isNoLayoutPage, loading, router])

// ✅ DEPOIS: Confiar no middleware, remover verificação duplicada
// Middleware já protege as rotas - não precisa verificar no cliente
```

```typescript
// ❌ ANTES: Loading bloqueante
if (!hydrated || loading) {
  return <div>Carregando...</div>  // ← BLOQUEIA TRANSIÇÃO
}

// ✅ DEPOIS: Transição suave
if (!hydrated) {
  return <div>Carregando...</div>  // Só no primeiro mount
}
// Remover check de 'loading' - deixar página renderizar
```

#### 2. useAuth.ts
```typescript
// ❌ ANTES: Sincronização em todo re-render
useEffect(() => {
  synchronizeLocalStorage()  // ← RODA SEMPRE
}, [synchronizeLocalStorage])

// ✅ DEPOIS: Sincronizar só quando token/user mudam
useEffect(() => {
  synchronizeLocalStorage()
}, [token, user])  // Dependências diretas
```

```typescript
// ❌ ANTES: checkAuth() chamado no mount de toda página
useEffect(() => {
  if (status === 'idle') {
    checkAuth()  // ← API call pesada
  }
}, [status, checkAuth])

// ✅ DEPOIS: Confiar no middleware + session storage
// Só verificar se não houver session válida no storage
```

#### 3. middleware.ts
```typescript
// ✅ OTIMIZAR: Usar apenas getUser() (já faz refresh interno)
// Remover getSession() separado - duplicado e desnecessário

const {
  data: { user },
  error
} = await supabase.auth.getUser()

// getUser() já faz refresh da session internamente
// Economiza 1 round-trip ao Supabase
```

#### 4. _app.tsx
```typescript
// ✅ ADICIONAR: Transição de página suave
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import NProgress from 'nprogress'  // ou loader customizado

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter()

  useEffect(() => {
    const handleStart = () => NProgress.start()
    const handleComplete = () => NProgress.done()

    router.events.on('routeChangeStart', handleStart)
    router.events.on('routeChangeComplete', handleComplete)
    router.events.on('routeChangeError', handleComplete)

    return () => {
      router.events.off('routeChangeStart', handleStart)
      router.events.off('routeChangeComplete', handleComplete)
      router.events.off('routeChangeError', handleComplete)
    }
  }, [router])

  // ... resto do código
}
```

#### 5. Navegação otimizada
```typescript
// ❌ ANTES (dashboard.tsx:259)
window.location.href = '/relatorios'  // ← Full page reload

// ✅ DEPOIS
import Link from 'next/link'
<Link href="/relatorios">
  <Button>Ver Relatórios</Button>
</Link>

// OU usando router.push
router.push('/relatorios')  // Client-side navigation
```

### Ordem de Implementação

1. **middleware.ts** - Reduzir chamadas Supabase (maior impacto)
2. **useAuth.ts** - Otimizar sincronização e remover checks desnecessários
3. **main-layout.tsx** - Remover loading bloqueante e verificação duplicada
4. **_app.tsx** - Adicionar loader de transição (NProgress ou similar)
5. **pages/*.tsx** - Substituir `window.location.href` por `router.push` ou `<Link>`
6. **Teste completo** - Testar navegação em todas as páginas principais

### Riscos Técnicos

1. **Segurança**: Ao remover verificação de auth no MainLayout, garantir que middleware está protegendo TODAS as rotas
   - **Mitigação**: Verificar `middleware.ts` config.matcher cobre todas as rotas protegidas

2. **Flash de conteúdo não autenticado**: Se remover loading state, página pode renderizar antes de auth check
   - **Mitigação**: Manter hydration check mínimo, confiar em middleware + session storage

3. **Quebra de fluxo de login**: Se otimizar demais, pode quebrar redirect após login
   - **Mitigação**: Testar fluxo completo: login → dashboard → navegação → logout → login

## Próximo Passo
Para implementar este plano, digite: **ok**, **continue**, ou **approve**
Para cancelar, digite: **cancel** ou inicie uma nova tarefa
