# Guia de Debug - Logs de Permissões

**Data**: 2025-12-13
**Objetivo**: Identificar onde as permissões customizadas estão falhando

---

## 🔍 Logs Adicionados

Adicionei 4 pontos de logging para rastrear o fluxo completo das permissões:

### 1. `getUserProfile` (Database Query)
**Arquivo**: `lib/supabase-auth.ts`
**Quando**: Ao buscar usuário do banco de dados
**Log**: `🔍 [getUserProfile] Data from DB`

```javascript
{
  userId: 123,
  email: "vendedor@test.com",
  tipo_usuario: "vendedor",
  permissoes: { vendas_criar: true, vendas_deletar: false },
  permissoes_custom: { vendas_deletar: true }  // ← IMPORTANTE!
}
```

---

### 2. `supabase-middleware` (Request Processing)
**Arquivo**: `lib/supabase-middleware.ts`
**Quando**: Ao processar requisição API
**Log**: `🔍 [middleware] User permissions`

```javascript
{
  userId: 123,
  email: "vendedor@test.com",
  tipo_usuario: "vendedor",
  base: { vendas_criar: true, vendas_deletar: false },
  custom: { vendas_deletar: true },
  merged: { vendas_criar: true, vendas_deletar: true },  // ← MERGE
  vendas_deletar: true  // ← Deve ser TRUE se marcado!
}
```

---

### 3. `fetchUserAccessProfile` (Permission Loading)
**Arquivo**: `lib/user-access.ts`
**Quando**: Ao buscar perfil de acesso (usado em vendas)
**Log**: `🔍 [user-access] Permissions merge`

```javascript
{
  userId: 123,
  email: "vendedor@test.com",
  tipo_usuario: "vendedor",
  basePermissions: { vendas_criar: true, vendas_deletar: false },
  customPermissions: { vendas_deletar: true },
  mergedPermissions: { vendas_criar: true, vendas_deletar: true },
  vendas_deletar: true  // ← Deve ser TRUE!
}
```

---

### 4. `usePermissions` (Frontend Check)
**Arquivo**: `hooks/usePermissions.ts`
**Quando**: Ao verificar permissão no componente React
**Log**: `🔍 [usePermissions] Checking vendas_deletar`

```javascript
{
  permission: "vendas_deletar",
  hasIt: true,  // ← Deve ser TRUE para mostrar botão!
  allPermissions: { vendas_criar: true, vendas_deletar: true },
  user: {
    id: 123,
    email: "vendedor@test.com",
    tipo_usuario: "vendedor"
  }
}
```

---

## 📋 Como Usar os Logs

### Passo 1: Abrir Console do Navegador

1. Abrir DevTools (F12)
2. Ir na aba "Console"
3. Limpar console (Ctrl+L ou botão 🚫)

---

### Passo 2: Fazer Login como Vendedor

```
Login → Carregar dashboard → Ir para página de vendas
```

Você deve ver logs nesta ordem:

```
🔍 [getUserProfile] Data from DB
🔍 [middleware] User permissions
🔍 [user-access] Permissions merge  (se acessar vendas)
🔍 [usePermissions] Checking vendas_deletar
```

---

### Passo 3: Interpretar os Logs

#### ✅ CENÁRIO CORRETO (Permissão funcionando)

```javascript
// 1. Database retorna permissão custom
🔍 [getUserProfile] Data from DB: {
  permissoes_custom: { vendas_deletar: true }  // ✅ Banco tem!
}

// 2. Middleware faz merge correto
🔍 [middleware] User permissions: {
  custom: { vendas_deletar: true },
  merged: { vendas_deletar: true }  // ✅ Merge OK!
}

// 3. user-access faz merge correto
🔍 [user-access] Permissions merge: {
  customPermissions: { vendas_deletar: true },
  vendas_deletar: true  // ✅ Merge OK!
}

// 4. Frontend verifica e retorna true
🔍 [usePermissions] Checking vendas_deletar: {
  hasIt: true  // ✅ Botão vai aparecer!
}
```

#### ❌ CENÁRIO 1: Permissão não está no banco

```javascript
🔍 [getUserProfile] Data from DB: {
  permissoes_custom: null  // ❌ Banco NÃO tem!
}

// Problema: Admin não salvou permissão customizada
// Solução: Ir em Usuários → Editar → Marcar "Pode excluir vendas" → Salvar
```

#### ❌ CENÁRIO 2: Merge não está funcionando

```javascript
🔍 [getUserProfile] Data from DB: {
  permissoes_custom: { vendas_deletar: true }  // ✅ Banco tem!
}

🔍 [middleware] User permissions: {
  custom: { vendas_deletar: true },
  merged: { vendas_deletar: false }  // ❌ Merge FALHOU!
}

// Problema: Bug no código de merge
// Solução: Verificar se código está atualizado (commit mais recente)
```

#### ❌ CENÁRIO 3: Frontend está usando cache

```javascript
🔍 [middleware] User permissions: {
  merged: { vendas_deletar: true }  // ✅ Backend OK!
}

🔍 [usePermissions] Checking vendas_deletar: {
  hasIt: false,  // ❌ Frontend com cache antigo!
  allPermissions: { vendas_deletar: false }
}

// Problema: LocalStorage com dados antigos
// Solução: Fazer logout e login novamente
```

#### ❌ CENÁRIO 4: permissoes_custom não está sendo lido do banco

```javascript
🔍 [getUserProfile] Data from DB: {
  permissoes: { ... },
  permissoes_custom: undefined  // ❌ Campo não veio do SELECT!
}

// Problema: SELECT não inclui permissoes_custom
// Solução: Verificar se código de getUserProfile está atualizado
```

---

## 🧪 Teste Passo a Passo

### Setup Inicial

1. **Criar/Verificar vendedor no banco**:
   ```sql
   SELECT id, email, tipo_usuario, permissoes, permissoes_custom
   FROM usuarios
   WHERE email = 'vendedor@test.com';
   ```

2. **Marcar permissão customizada via Admin**:
   - Login como admin
   - Ir em Usuários
   - Editar vendedor
   - Marcar checkbox "Pode excluir vendas"
   - Salvar

3. **Verificar no banco que salvou**:
   ```sql
   SELECT permissoes_custom
   FROM usuarios
   WHERE email = 'vendedor@test.com';
   -- Deve retornar: {"vendas_deletar": true}
   ```

---

### Teste 1: Verificar Backend

**Login como vendedor → Abrir console → Verificar logs**

Logs esperados:
```
✅ [getUserProfile] permissoes_custom: { vendas_deletar: true }
✅ [middleware] merged: { vendas_deletar: true }
```

Se aparecer **null** ou **undefined**, o problema é:
- ❌ Banco não tem a permissão
- ❌ SELECT não está retornando o campo

---

### Teste 2: Verificar Merge

**Verificar logs de merge**

Logs esperados:
```
✅ [middleware] custom: { vendas_deletar: true }
✅ [middleware] merged: { vendas_deletar: true }
```

Se `merged.vendas_deletar` for **false**:
- ❌ Merge não está funcionando
- ❌ Código desatualizado

---

### Teste 3: Verificar Frontend

**Ir para página de vendas → Verificar log de permissão**

Log esperado:
```
✅ [usePermissions] hasIt: true
```

Se for **false**:
- ❌ Cache antigo (fazer logout/login)
- ❌ Store não foi atualizada

---

## 🚨 Problemas Comuns

### Problema 1: permissoes_custom = null no banco

**Log**:
```javascript
🔍 [getUserProfile] permissoes_custom: null
```

**Causa**: Admin não salvou ou salvou em campo errado

**Verificação**:
```sql
SELECT id, email, permissoes, permissoes_custom
FROM usuarios
WHERE email = 'vendedor@test.com';
```

**Solução**:
- Interface: Admin → Usuários → Editar → Marcar checkbox → Salvar
- SQL direto:
  ```sql
  UPDATE usuarios
  SET permissoes_custom = '{"vendas_deletar": true}'::jsonb
  WHERE email = 'vendedor@test.com';
  ```

---

### Problema 2: permissoes_custom = undefined (campo não vem)

**Log**:
```javascript
🔍 [getUserProfile] permissoes_custom: undefined
```

**Causa**: SELECT não inclui campo `permissoes_custom`

**Verificação**: Verificar código de `getUserProfile`:
```typescript
// Deve ter:
.select("id, nome, email, tipo_usuario, permissoes, permissoes_custom, ...")
```

**Solução**: Atualizar código com último commit

---

### Problema 3: Merge retorna false

**Log**:
```javascript
🔍 [middleware] custom: { vendas_deletar: true }
🔍 [middleware] merged: { vendas_deletar: false }  // ❌
```

**Causa**: Ordem do merge está errada

**Verificação**: Código deve ser:
```typescript
const merged = {
  ...(base || {}),
  ...(custom || {})  // ← Custom sobrescreve!
}
```

**Solução**: Atualizar código

---

### Problema 4: Frontend com cache antigo

**Log**:
```javascript
🔍 [middleware] merged: { vendas_deletar: true }  // ✅ Backend OK
🔍 [usePermissions] hasIt: false  // ❌ Frontend com cache
```

**Causa**: LocalStorage com dados antigos

**Verificação**:
```javascript
// No console:
JSON.parse(localStorage.getItem('user'))
// Ver se tem vendas_deletar: false
```

**Solução**:
1. Fazer logout
2. Fazer login
3. OU limpar localStorage:
   ```javascript
   localStorage.clear()
   location.reload()
   ```

---

## 📊 Checklist de Debug

Siga esta ordem para diagnosticar:

- [ ] **1. Banco de dados**
  ```sql
  SELECT permissoes_custom FROM usuarios WHERE email = '...';
  ```
  - ✅ Retorna `{"vendas_deletar": true}` → OK
  - ❌ Retorna `null` → Admin precisa marcar permissão

- [ ] **2. getUserProfile**
  ```
  Log: 🔍 [getUserProfile] permissoes_custom
  ```
  - ✅ Mostra `{ vendas_deletar: true }` → OK
  - ❌ Mostra `undefined` → SELECT não inclui campo
  - ❌ Mostra `null` → Banco não tem

- [ ] **3. Middleware merge**
  ```
  Log: 🔍 [middleware] merged
  ```
  - ✅ Mostra `{ vendas_deletar: true }` → OK
  - ❌ Mostra `{ vendas_deletar: false }` → Merge falhou

- [ ] **4. user-access merge**
  ```
  Log: 🔍 [user-access] vendas_deletar
  ```
  - ✅ Mostra `true` → OK
  - ❌ Mostra `false` → Merge falhou

- [ ] **5. Frontend check**
  ```
  Log: 🔍 [usePermissions] hasIt
  ```
  - ✅ Mostra `true` → Botão deve aparecer!
  - ❌ Mostra `false` → Cache antigo (logout/login)

---

## 🎯 Próximos Passos

### Se TODOS os logs estão corretos mas botão NÃO aparece:

1. **Verificar renderização do componente**:
   ```tsx
   // pages/vendas.tsx linha ~627
   {hasPermission('vendas_deletar') && (
     <Button>Deletar</Button>
   )}
   ```

2. **Verificar se React está re-renderizando**:
   ```javascript
   // No console:
   import { usePermissions } from '@/hooks/usePermissions'
   const { hasPermission } = usePermissions()
   hasPermission('vendas_deletar')  // Deve retornar true
   ```

3. **Forçar re-render**:
   - Navegar para outra página
   - Voltar para vendas
   - Ou fazer hard refresh (Ctrl+Shift+R)

---

## 🗑️ Remover Logs Depois

**Quando tudo funcionar**, remover os logs de debug:

```bash
# Remover todos os console.log de debug
grep -r "🔍" lib/ hooks/ -l | xargs sed -i '/🔍 DEBUG/,+10d'
```

Ou remover manualmente procurando por `🔍` nos arquivos:
- `lib/supabase-auth.ts`
- `lib/supabase-middleware.ts`
- `lib/user-access.ts`
- `hooks/usePermissions.ts`

---

**Última atualização**: 2025-12-13
**Status**: 🔍 DEBUG ATIVO
**Próximo passo**: Analisar logs do console
