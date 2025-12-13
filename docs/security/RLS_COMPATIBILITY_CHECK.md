# RLS Compatibility Check

**Data**: 2025-12-13
**Status**: ✅ Todas correções aplicadas

## Resumo

Análise de impacto das políticas RLS na aplicação existente, identificando pontos que poderiam quebrar e aplicando correções.

## ✅ Fluxos que NÃO quebram

### 1. Login Flow (`pages/api/auth.ts`)
```typescript
// Line 71: Authenticated client with user's JWT
const supabase = getSupabaseServerAuth(req, res);

// Line 86: Query own user profile
const userProfile = await getUserProfile(email, supabase);
```

**RLS Policy**: "Users read own record"
**Status**: ✅ Funciona - usuário consulta próprio registro

### 2. Proxy/Middleware (`proxy.ts`)
```typescript
// Line 154-158: Query user by supabase_user_id
const { data: usuario } = await supabase
  .from("usuarios")
  .select("id, tipo_usuario, permissoes, vendedor_id")
  .eq("supabase_user_id", user.id)
  .single();
```

**RLS Policy**: "Users read own record"
**Status**: ✅ Funciona - usuário autenticado consulta próprio registro

### 3. User Signup (`pages/api/auth/signup.ts`)
```typescript
// Line 48: Service role bypasses RLS
const supabaseAdmin = getSupabaseServiceRole();

// Line 84: Insert with service role
const { data: profileData } = await supabaseAdmin
  .from('usuarios')
  .insert(usuarioData)
```

**RLS Policy**: Bypassed (service role)
**Status**: ✅ Funciona - service role bypassa RLS

### 4. Operações em outras tabelas (`categorias-financeiras.ts` e similares)
```typescript
// Usa withSupabaseAuth middleware
export default withSupabaseAuth(handler);

// Authenticated client disponível em req.supabaseClient
const supabase = req.supabaseClient;
```

**RLS Policies**: Baseadas em `tipo_usuario` do usuário autenticado
**Status**: ✅ Funciona - RLS valida permissões corretamente

## 🔴 Fluxo CORRIGIDO

### Vendedor User Creation (`pages/api/vendedores/[id]/create-usuario.ts`)

**Problema Original**:
```typescript
// ❌ ERRADO: Anon key client tentando usar admin API
const supabase = createServerClient(
  NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY,  // ← Problema!
  { ... }
);

// ❌ Falha: admin API requer service role key
await supabase.auth.admin.createUser({ ... });

// ❌ Falha: RLS bloqueia INSERT sem service role
await supabase.from('usuarios').insert({ ... });
```

**Correção Aplicada** (commit atual):
```typescript
// ✅ CORRETO: Check permissions first with authenticated client
const supabase = createServerClient(...);  // Anon key + user JWT
const { data: currentUser } = await supabase
  .from('usuarios')
  .select('tipo_usuario')
  .eq('supabase_user_id', user.id)
  .single();

if (currentUser.tipo_usuario !== 'admin') {
  return res.status(403).json({ error: 'Sem permissão' });
}

// ✅ Then use service role for admin operations
const supabaseAdmin = getSupabaseServiceRole();
await supabaseAdmin.auth.admin.createUser({ ... });  // ✅ Funciona
await supabaseAdmin.from('usuarios').insert({ ... });  // ✅ Bypassa RLS
```

**Padrão de Segurança**:
1. **Validar permissões** com cliente autenticado (RLS check)
2. **Executar operação** com service role (bypassa RLS)
3. **Defense in depth**: 2 camadas de validação

## 📋 Checklist de Compatibilidade

| Funcionalidade | Endpoint | Status | Observações |
|----------------|----------|--------|-------------|
| **Login** | `/api/auth` POST | ✅ OK | RLS permite ler próprio registro |
| **Get Profile** | `/api/auth` GET | ✅ OK | RLS permite ler próprio registro |
| **Signup** | `/api/auth/signup` POST | ✅ OK | Service role bypassa RLS |
| **Criar usuário p/ vendedor** | `/api/vendedores/[id]/create-usuario` POST | ✅ CORRIGIDO | Agora usa service role após check |
| **Middleware auth check** | `proxy.ts` | ✅ OK | RLS permite ler próprio registro |
| **Categorias financeiras** | `/api/categorias-financeiras` | ✅ OK | RLS baseado em tipo_usuario |
| **Formas pagamento** | `/api/formas_pagamento` | ✅ OK | RLS baseado em tipo_usuario |
| **Vendas** | `/api/vendas` | ✅ OK | RLS já existente |
| **Produtos** | `/api/produtos` | ✅ OK | RLS já existente |

## 🎯 Padrões de Uso Corretos

### Padrão 1: Operações do próprio usuário
```typescript
// Use authenticated client (respects RLS)
const supabase = getSupabaseServerAuth(req, res);
const { data } = await supabase
  .from('usuarios')
  .select('*')
  .eq('supabase_user_id', user.id)
  .single();
```
**Quando usar**: Usuário lendo/editando próprio perfil

### Padrão 2: Operações administrativas
```typescript
// 1. Validate permissions with authenticated client
const supabase = getSupabaseServerAuth(req, res);
const { data: currentUser } = await supabase
  .from('usuarios')
  .select('tipo_usuario')
  .eq('supabase_user_id', user.id)
  .single();

if (!['admin', 'gerente'].includes(currentUser.tipo_usuario)) {
  return res.status(403).json({ error: 'Sem permissão' });
}

// 2. Perform admin operation with service role
const supabaseAdmin = getSupabaseServiceRole();
await supabaseAdmin.from('usuarios').insert({ ... });
```
**Quando usar**: Admin criando/modificando outros usuários

### Padrão 3: Operações com RLS automático
```typescript
// Use middleware-injected client (RLS automatic)
export default withSupabaseAuth(async (req, res) => {
  const supabase = req.supabaseClient;

  // RLS automatically filters based on user's tipo_usuario
  await supabase.from('categorias_financeiras').insert({ ... });
});
```
**Quando usar**: CRUD normal respeitando permissões do usuário

## ⚠️ Anti-Padrões (NÃO fazer)

### ❌ Anti-Padrão 1: Admin API com anon key
```typescript
// ERRADO: Admin API requer service role key
const supabase = createServerClient(URL, ANON_KEY, { ... });
await supabase.auth.admin.createUser({ ... });  // ❌ FALHA
```

### ❌ Anti-Padrão 2: Service role sem validação
```typescript
// ERRADO: Bypassa RLS sem checar permissões primeiro
const supabaseAdmin = getSupabaseServiceRole();
await supabaseAdmin.from('usuarios').delete().eq('id', userId);  // ❌ PERIGOSO
```

### ❌ Anti-Padrão 3: Usar service role desnecessariamente
```typescript
// ERRADO: Deveria usar cliente autenticado com RLS
const supabaseAdmin = getSupabaseServiceRole();
const { data } = await supabaseAdmin.from('vendas').select('*');  // ❌ Bypassa RLS desnecessariamente
```

## 🔍 Como Testar

### 1. Teste de Login
```bash
curl -X POST http://localhost:3000/api/auth \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"123456"}'
```
**Esperado**: ✅ Login bem-sucedido com token

### 2. Teste de Criar Usuário (como admin)
```bash
# 1. Faça login como admin e pegue o token
TOKEN="seu_token_aqui"

# 2. Crie usuário para vendedor
curl -X POST http://localhost:3000/api/vendedores/1/create-usuario \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"vendedor@test.com","senha":"123456"}'
```
**Esperado**: ✅ Usuário criado com sucesso

### 3. Teste de Criar Categoria (como financeiro)
```bash
TOKEN="token_usuario_financeiro"

curl -X POST http://localhost:3000/api/categorias-financeiras \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nome":"Nova Categoria","tipo":"receita"}'
```
**Esperado**: ✅ Categoria criada

### 4. Teste de Permissão Negada (como vendedor tentando criar categoria)
```bash
TOKEN="token_usuario_vendedor"

curl -X POST http://localhost:3000/api/categorias-financeiras \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nome":"Nova Categoria","tipo":"receita"}'
```
**Esperado**: ❌ 403 Forbidden ou erro RLS

## 📊 Matriz de Impacto

| Operação | Antes RLS | Depois RLS | Mudança Necessária |
|----------|-----------|------------|-------------------|
| Login | ✅ Funciona | ✅ Funciona | Nenhuma |
| Logout | ✅ Funciona | ✅ Funciona | Nenhuma |
| Get Profile | ✅ Funciona | ✅ Funciona | Nenhuma |
| Signup | ✅ Funciona | ✅ Funciona | Nenhuma |
| Criar usuário (vendedor) | ✅ Funciona | ❌ Quebrava | ✅ CORRIGIDO |
| CRUD categorias | ✅ Funciona | ✅ Funciona | Nenhuma |
| CRUD formas pagamento | ✅ Funciona | ✅ Funciona | Nenhuma |
| CRUD vendas | ✅ Funciona | ✅ Funciona | Nenhuma |

## 🎓 Lições Aprendidas

1. **Service Role ≠ Authenticated Client**: Não misturar anon key client com admin API
2. **Defense in Depth**: Validar permissões ANTES de usar service role
3. **RLS é uma feature, não bug**: Força boa arquitetura de segurança
4. **Teste com diferentes roles**: Admin, gerente, vendedor, financeiro, estoque

## 📚 Referências

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Admin API](https://supabase.com/docs/reference/javascript/auth-admin-createuser)
- [Service Role vs Anon Key](https://supabase.com/docs/guides/api/api-keys)
