# 🔄 Refatoração: Middleware e Autenticação Simplificados

**Data**: 30/11/2025

## 📋 Resumo

Removemos toda a lógica de fallback e backward compatibility, simplificando o código para usar apenas as colunas corretas da migração mais recente.

---

## ✅ Arquivos Modificados

### 1. `middleware.ts` - Middleware Principal
**Mudanças:**
- ✅ Usa apenas `tipo_usuario` (não mais fallback para `role`)
- ✅ Redirecionamento melhorado para `/login` com mensagens claras
- ✅ JWT expiration handling do Supabase
- ✅ Headers limpos: `X-User-Id`, `X-User-Role`, `X-Vendedor-Id`
- ❌ Removido: verificação `maybeSingle()` e lógica de backward compatibility
- ❌ Removido: fallback `usuario.tipo_usuario || usuario.role`

**Query simplificada:**
```typescript
const { data: usuario } = await supabase
  .from('usuarios')
  .select('id, tipo_usuario, permissoes, vendedor_id')
  .eq('supabase_user_id', user.id)
  .single()  // ✅ Agora usa single() - espera que usuário sempre exista
```

**Redirecionamento:**
```typescript
// Antes
url.searchParams.set('reason', 'session_expired')

// Depois
url.searchParams.set('message', 'Sua sessão expirou. Faça login novamente.')
```

---

### 2. `lib/supabase-middleware.ts` - API Middleware
**Mudanças:**
- ✅ Interface `AuthenticatedRequest.user` atualizada:
  ```typescript
  user: {
    id: number
    email: string
    tipo_usuario: string       // ✅ era 'role'
    permissoes: Record<string, boolean> | null  // ✅ era string
    vendedor_id: number | null // ✅ novo campo
    supabaseUser: User
  }
  ```
- ✅ `withRole()` usa `req.user.tipo_usuario` (não `req.user.role`)
- ✅ Mensagens de erro mais claras

---

### 3. `lib/supabase-auth.ts` - Auth Utilities
**Mudanças:**
- ✅ Interface `AppUserProfile` atualizada:
  ```typescript
  interface AppUserProfile {
    id: number
    email: string
    nome: string
    tipo_usuario: string       // ✅ era 'role'
    permissoes: Record<string, boolean> | null  // ✅ era string
    vendedor_id: number | null // ✅ novo campo
    ativo: boolean
    supabase_user_id: string | null
  }
  ```
- ✅ `getUserProfile()` busca campos corretos:
  ```sql
  SELECT id, nome, email, tipo_usuario, permissoes, vendedor_id, ativo, supabase_user_id
  ```

---

### 4. `pages/api/vendas/my.ts` - API de Vendas
**Mudanças:**
- ✅ Usa apenas `tipo_usuario` (não `role`)
- ✅ Lógica simplificada:
  ```typescript
  // Vendedor: apenas suas vendas
  if (usuario.tipo_usuario === 'vendedor' && usuario.vendedor_id) {
    query = query.eq('vendedor_id', usuario.vendedor_id)
  }
  // Admin, Gerente, Financeiro: todas as vendas (sem filtro)
  ```
- ❌ Removido: múltiplos `if/else` desnecessários
- ❌ Removido: fallback para retornar `[]` vazio

---

### 5. `pages/login.tsx` - Página de Login
**Mudanças:**
- ✅ Suporta mensagens dinâmicas via query params:
  ```typescript
  const message = router.query.message  // Avisos amarelos
  const error = router.query.error      // Erros vermelhos
  ```
- ✅ Exibição de alertas melhorada:
  ```tsx
  {message && (
    <div className="bg-yellow-50 border border-yellow-200">
      ⚠️ {message}
    </div>
  )}
  ```
- ❌ Removido: lógica antiga `reason === 'session_expired'`

---

## 🔐 Fluxo de Expiração de Sessão

```
┌──────────────────────────────────────────────────────┐
│ 1. JWT expira (configurado no Supabase Dashboard)   │
└────────────────────┬─────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────┐
│ 2. Middleware.ts detecta erro em getUser()          │
│    → user = null ou error !== null                   │
└────────────────────┬─────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────┐
│ 3. Redirect para /login com mensagem:               │
│    ?message=Sua sessão expirou. Faça login...       │
└────────────────────┬─────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────┐
│ 4. Login page exibe alerta amarelo                  │
│    ⚠️ Sua sessão expirou. Faça login novamente.    │
└──────────────────────────────────────────────────────┘
```

---

## 🎯 Query Params de Redirecionamento

| Query Param | Cor | Uso |
|-------------|-----|-----|
| `?message=texto` | 🟡 Amarelo | Avisos (sessão expirada, logout) |
| `?error=texto` | 🔴 Vermelho | Erros (permissão negada, erro de sistema) |

**Exemplos:**
```typescript
// Sessão expirada
/login?message=Sua sessão expirou. Faça login novamente.

// Permissão negada
/login?error=Acesso negado. Apenas administradores.

// Redirecionamento após logout
/login?message=Você saiu do sistema com sucesso.
```

---

## 🧪 Como Testar

### 1. Testar Expiração de Sessão
```bash
# 1. Configurar JWT expiry curto no Supabase:
# Dashboard → Auth → JWT Expiry → 60 segundos

# 2. Fazer login
# 3. Esperar 61 segundos
# 4. Tentar acessar qualquer página
# 5. Deve redirecionar para /login com mensagem amarela
```

### 2. Testar Permissão Negada
```bash
# 1. Login como vendedor
# 2. Tentar acessar /usuarios
# 3. Deve redirecionar para /dashboard com erro
```

### 3. Testar API de Vendas
```bash
# Como vendedor (deve ver só suas vendas)
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/vendas/my

# Como admin (deve ver todas as vendas)
curl -H "Authorization: Bearer ADMIN_TOKEN" \
  http://localhost:3000/api/vendas/my
```

---

## ⚠️ Breaking Changes

❌ **Campos removidos** (não use mais):
- `usuario.role` → use `usuario.tipo_usuario`
- `req.user.role` → use `req.user.tipo_usuario`
- Query param `?reason=...` → use `?message=...` ou `?error=...`

✅ **Campos novos** (use sempre):
- `usuario.tipo_usuario` - String com o tipo de usuário
- `usuario.vendedor_id` - ID do vendedor vinculado (se aplicável)
- `req.user.vendedor_id` - Disponível no middleware de API

---

## 📚 Referências

- **JWT Expiry**: Supabase Dashboard → Settings → Auth → JWT Expiry
- **RLS Policies**: Aplicadas automaticamente via `getSupabaseServerAuth()`
- **Tipos de Usuário**: `admin`, `gerente`, `vendedor`, `financeiro`, `estoque`, `operador`, `visualizador`

---

**Status**: ✅ Completo e testado  
**Migração necessária**: ❌ Não (usa estrutura existente)
