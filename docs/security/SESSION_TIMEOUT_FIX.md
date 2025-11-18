# Correção: Timeout de Sessão e Expiração de Tokens

**Problema:** Tokens nunca expiram e usuário pode ficar dias sem logar novamente
**Severidade:** 🟠 ALTA (VULN-009)
**Prioridade:** P2 (Implementar após Fase 1)

---

## Problema Atual

### 1. Max-Age de Cookie = 7 dias
```typescript
// hooks/useAuth.ts:14
const maxAge = 60 * 60 * 24 * 7 // 7 dias - MUITO LONGO!
```

### 2. Auto-refresh Infinito
Tokens são renovados automaticamente sem verificar se usuário está ativo.

### 3. Sem Idle Timeout
Usuário pode ficar semanas sem interagir e sessão permanece válida.

---

## Solução Completa

### Passo 1: Criar Hook de Idle Detection

```typescript
// hooks/useIdleTimer.ts
import { useEffect, useRef, useState, useCallback } from 'react';

interface UseIdleTimerOptions {
  timeout: number; // Tempo em ms para considerar usuário idle
  onIdle: () => void; // Callback quando usuário ficar idle
  onActive?: () => void; // Callback quando usuário voltar a ficar ativo
}

export const useIdleTimer = ({ timeout, onIdle, onActive }: UseIdleTimerOptions) => {
  const [isIdle, setIsIdle] = useState(false);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const resetTimer = useCallback(() => {
    // Clear existing timeout
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
    }

    // Update last activity time
    lastActivityRef.current = Date.now();

    // If user was idle, mark as active again
    if (isIdle) {
      setIsIdle(false);
      onActive?.();
    }

    // Set new timeout
    timeoutIdRef.current = setTimeout(() => {
      setIsIdle(true);
      onIdle();
    }, timeout);
  }, [timeout, onIdle, onActive, isIdle]);

  useEffect(() => {
    // Events that indicate user activity
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ];

    // Reset timer on any activity
    const handleActivity = () => {
      resetTimer();
    };

    // Add event listeners
    events.forEach((event) => {
      document.addEventListener(event, handleActivity);
    });

    // Start timer
    resetTimer();

    // Cleanup
    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
    };
  }, [resetTimer]);

  // Store last activity in localStorage for cross-tab sync
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const interval = setInterval(() => {
      localStorage.setItem('lastActivity', lastActivityRef.current.toString());
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  // Listen for activity in other tabs
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'lastActivity' && e.newValue) {
        const otherTabActivity = parseInt(e.newValue, 10);
        const timeSinceActivity = Date.now() - otherTabActivity;

        // If other tab had activity recently, reset our timer
        if (timeSinceActivity < 5000) {
          resetTimer();
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [resetTimer]);

  return {
    isIdle,
    lastActivity: lastActivityRef.current,
    resetTimer,
  };
};
```

### Passo 2: Atualizar useAuth com Idle Timeout

```typescript
// hooks/useAuth.ts - ADICIONAR no final do hook

import { useIdleTimer } from './useIdleTimer';

export function useAuth() {
  // ... código existente ...

  // ✅ NOVO: Idle timeout (30 minutos)
  const IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutos em ms

  const handleIdle = useCallback(async () => {
    console.warn('[AUTH] Usuário inativo por 30 minutos, fazendo logout...');

    // Fazer logout automático
    await handleLogout();

    // Redirecionar para login com mensagem
    router.push('/login?reason=idle');
  }, [handleLogout, router]);

  const handleActive = useCallback(() => {
    console.log('[AUTH] Usuário voltou a estar ativo');
  }, []);

  // Só ativar idle timer se usuário estiver autenticado
  useIdleTimer({
    timeout: IDLE_TIMEOUT,
    onIdle: handleIdle,
    onActive: handleActive,
  });

  // ✅ NOVO: Verificar expiração de token no mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isAuthenticated) return;

    const checkTokenExpiration = async () => {
      const supabase = getSupabaseBrowser();
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        console.warn('[AUTH] Token expirado ou inválido, fazendo logout...');
        await handleLogout();
        return;
      }

      // Verificar se token está prestes a expirar (< 5 minutos)
      const expiresAt = session.expires_at || 0;
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = expiresAt - now;

      if (timeUntilExpiry < 300) { // < 5 minutos
        console.log('[AUTH] Token expirando em breve, renovando...');
        // Refresh será automático via onAuthStateChange
      }
    };

    // Verificar a cada 1 minuto
    const interval = setInterval(checkTokenExpiration, 60 * 1000);
    checkTokenExpiration(); // Verificar imediatamente

    return () => clearInterval(interval);
  }, [isAuthenticated, handleLogout]);

  return {
    user,
    token,
    loading,
    isAuthenticated,
    status,
    login,
    logout: handleLogout,
    checkAuth
  };
}
```

### Passo 3: Reduzir Max-Age do Cookie

```typescript
// hooks/useAuth.ts:12-16 - ATUALIZAR
const setTokenCookie = (value: string) => {
  if (typeof document === 'undefined') return
  const maxAge = 60 * 60 // ✅ 1 hora (antes era 7 dias)
  document.cookie = `token=${value}; Max-Age=${maxAge}; ${COOKIE_BASE}${getCookieSuffix()}`
}
```

### Passo 4: Configurar Supabase JWT Expiration

No dashboard do Supabase:

1. Acesse **Settings → Auth**
2. Configure:
   ```
   JWT Expiry: 3600 (1 hora)
   Refresh Token Expiry: 604800 (7 dias)
   ```

### Passo 5: Adicionar Modal de Aviso de Expiração

```typescript
// components/modals/SessionExpiringModal.tsx
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useIdleTimer } from '@/hooks/useIdleTimer';

export const SessionExpiringModal = () => {
  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const { logout } = useAuth();

  const IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutos
  const WARNING_TIME = 5 * 60 * 1000; // Avisar 5 minutos antes

  const { isIdle, lastActivity } = useIdleTimer({
    timeout: IDLE_TIMEOUT,
    onIdle: () => logout(),
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkWarning = () => {
      const timeSinceActivity = Date.now() - lastActivity;
      const timeUntilLogout = IDLE_TIMEOUT - timeSinceActivity;

      if (timeUntilLogout <= WARNING_TIME && timeUntilLogout > 0) {
        setShowWarning(true);
        setTimeLeft(Math.floor(timeUntilLogout / 1000)); // em segundos
      } else {
        setShowWarning(false);
      }
    };

    const interval = setInterval(checkWarning, 1000);
    return () => clearInterval(interval);
  }, [lastActivity]);

  if (!showWarning) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md">
        <h2 className="text-xl font-bold mb-4">
          ⏰ Sessão Expirando
        </h2>
        <p className="mb-4">
          Sua sessão está prestes a expirar por inatividade.
        </p>
        <p className="text-2xl font-mono text-center mb-6">
          {minutes}:{seconds.toString().padStart(2, '0')}
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setShowWarning(false);
              // Resetar timer fazendo alguma ação
              window.dispatchEvent(new Event('mousedown'));
            }}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Continuar Conectado
          </button>
          <button
            onClick={logout}
            className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
          >
            Fazer Logout
          </button>
        </div>
      </div>
    </div>
  );
};
```

### Passo 6: Adicionar Modal no _app.tsx

```typescript
// pages/_app.tsx - ADICIONAR
import { SessionExpiringModal } from '@/components/modals/SessionExpiringModal';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      {/* ... outros componentes ... */}
      <SessionExpiringModal /> {/* ✅ NOVO */}
      <Component {...pageProps} />
    </>
  );
}
```

### Passo 7: Adicionar Mensagem na Página de Login

```typescript
// pages/login.tsx - ATUALIZAR
import { useRouter } from 'next/router';

export default function LoginPage() {
  const router = useRouter();
  const { reason } = router.query;

  return (
    <div>
      {reason === 'idle' && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          ⏰ Sua sessão expirou por inatividade. Por favor, faça login novamente.
        </div>
      )}
      {reason === 'expired' && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          🔒 Sua sessão expirou. Por favor, faça login novamente.
        </div>
      )}
      {/* ... resto do formulário de login ... */}
    </div>
  );
}
```

---

## Configurações Recomendadas

### Configuração Padrão (Recomendado)
```typescript
const SESSION_CONFIG = {
  JWT_EXPIRY: 60 * 60,           // 1 hora
  REFRESH_TOKEN_EXPIRY: 7 * 24 * 60 * 60, // 7 dias
  IDLE_TIMEOUT: 30 * 60 * 1000,  // 30 minutos
  WARNING_TIME: 5 * 60 * 1000,   // Avisar 5 min antes
  COOKIE_MAX_AGE: 60 * 60,       // 1 hora
};
```

### Configuração Alta Segurança
```typescript
const SESSION_CONFIG = {
  JWT_EXPIRY: 15 * 60,           // 15 minutos
  REFRESH_TOKEN_EXPIRY: 24 * 60 * 60, // 24 horas
  IDLE_TIMEOUT: 10 * 60 * 1000,  // 10 minutos
  WARNING_TIME: 2 * 60 * 1000,   // Avisar 2 min antes
  COOKIE_MAX_AGE: 15 * 60,       // 15 minutos
};
```

### Configuração Baixa Segurança (Não Recomendado)
```typescript
const SESSION_CONFIG = {
  JWT_EXPIRY: 4 * 60 * 60,       // 4 horas
  REFRESH_TOKEN_EXPIRY: 30 * 24 * 60 * 60, // 30 dias
  IDLE_TIMEOUT: 2 * 60 * 60 * 1000, // 2 horas
  WARNING_TIME: 10 * 60 * 1000,  // Avisar 10 min antes
  COOKIE_MAX_AGE: 4 * 60 * 60,   // 4 horas
};
```

---

## Testes

### Teste 1: Idle Timeout
1. Fazer login
2. Deixar navegador sem interação por 25 minutos
3. Verificar que modal de aviso aparece
4. Verificar que logout automático ocorre aos 30 minutos

### Teste 2: Token Expiration
1. Fazer login
2. Esperar 55 minutos (quase expiração)
3. Fazer alguma ação (navegar)
4. Verificar que token foi renovado automaticamente

### Teste 3: Cross-Tab Sync
1. Abrir 2 abas do sistema
2. Interagir apenas com aba 1
3. Verificar que aba 2 não faz logout (sincronização)

### Teste 4: Logout Manual
1. Fazer login
2. Clicar em Logout
3. Verificar que todas as abas fazem logout

---

## Métricas de Sucesso

- ✅ Usuário idle por 30 min = logout automático
- ✅ Token expira em 1 hora (configurável)
- ✅ Modal de aviso 5 min antes do logout
- ✅ Sincronização entre múltiplas abas
- ✅ Cookie expira em 1 hora (não mais 7 dias)

---

## Rollback Plan

Se houver problemas:

1. Reverter alterações em `hooks/useAuth.ts`
2. Aumentar `IDLE_TIMEOUT` para 2 horas temporariamente
3. Desabilitar modal de aviso
4. Monitorar logs de logout

---

## Cronograma de Implementação

- **Dia 1:** Criar `useIdleTimer.ts` e testar isoladamente
- **Dia 2:** Integrar com `useAuth.ts` e testar
- **Dia 3:** Criar `SessionExpiringModal.tsx` e integrar
- **Dia 4:** Testes em staging
- **Dia 5:** Deploy em produção com monitoring

**Tempo total estimado:** 5 dias

---

## Compliance

Esta implementação atende:
- ✅ LGPD Art. 46 (segurança de dados)
- ✅ ISO 27001 (controle de acesso)
- ✅ OWASP Session Management Best Practices
- ✅ PCI DSS 8.1.8 (timeout de sessão)

---

**Status:** 🔴 Não Implementado
**Prioridade:** P2 (Fase 3)
**Assignee:** [Nome do Dev]
**Due Date:** [Data]
