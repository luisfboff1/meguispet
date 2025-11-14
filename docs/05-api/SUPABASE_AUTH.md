# 🔐 Sistema de Autenticação Supabase - MeguisPet

## 📋 Visão Geral

O MeguisPet utiliza **Supabase Auth** para autenticação segura, eliminando a necessidade de gerenciar JWT tokens manualmente e secrets hardcoded.

## 🏗️ Arquitetura

### Estrutura de Arquivos

```
lib/
├── supabase.ts              # Cliente Supabase (browser e server)
├── supabase-auth.ts         # Helpers de autenticação server-side
└── supabase-middleware.ts   # Middleware para proteção de rotas

pages/api/
├── auth.ts                  # Login e perfil do usuário
└── [outros].ts              # Rotas protegidas com withSupabaseAuth

hooks/
└── useAuth.ts               # Hook React para autenticação

store/
└── auth.ts                  # State management (Zustand)

database/
└── usuarios (table)         # Metadados de usuário (role, permissoes)
```

## 🔄 Fluxo de Autenticação

### 1. **Login**

```typescript
// Frontend: hooks/useAuth.ts
const login = async (email: string, password: string) => {
  const response = await authService.login(email, password)
  // Retorna: { token, refresh_token, expires_at, user }
}

// Backend: pages/api/auth.ts
const supabase = getSupabaseBrowser()
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
})
```

**Resposta do Login:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGc...",           // Access token (1h)
    "refresh_token": "v1.xxx...",    // Refresh token (7d)
    "expires_at": 1735000000,        // Timestamp de expiração
    "user": {
      "id": 1,                       // ID da tabela usuarios
      "nome": "João Silva",
      "email": "joao@example.com",
      "role": "admin",
      "permissoes": null,
      "ativo": true
    }
  }
}
```

### 2. **Validação de Token (API Routes)**

```typescript
// Middleware: lib/supabase-middleware.ts
export const withSupabaseAuth = (handler) => {
  return async (req, res) => {
    // 1. Extrai token do header Authorization
    const supabaseUser = await verifySupabaseUser(req)
    
    // 2. Valida com Supabase Auth
    if (!supabaseUser) {
      return res.status(401).json({ message: 'Token inválido' })
    }
    
    // 3. Busca metadados na tabela usuarios
    const userProfile = await getUserProfile(supabaseUser.email)
    
    // 4. Anexa dados ao request
    req.user = { ...userProfile, supabaseUser }
    
    return handler(req, res)
  }
}

// Uso em API routes
export default withSupabaseAuth(async (req, res) => {
  // req.user está disponível com: id, email, role, permissoes
  const userId = req.user.id
  // ...
})
```

### 3. **Refresh Automático de Token**

O Supabase Auth gerencia automaticamente o refresh de tokens:

- **Access Token**: Expira em 1 hora
- **Refresh Token**: Expira em 7 dias
- **Auto Refresh**: Cliente Supabase renova automaticamente

```typescript
// Frontend: lib/supabase.ts
export const getSupabaseBrowser = () => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,  // ✅ Refresh automático
      detectSessionInUrl: true,
    },
  })
}
```

## 🗄️ Estrutura de Dados

### Tabela `usuarios` (App Metadata)

```sql
CREATE TABLE usuarios (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    permissoes TEXT,
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

**Nota**: A senha não é mais armazenada nesta tabela. Supabase Auth gerencia senhas em `auth.users`.

### Sincronização com Supabase Auth

- **Criação de Usuário**: Use `supabase.auth.signUp()` que cria automaticamente em `auth.users`
- **Metadados**: Crie registro correspondente na tabela `usuarios` com mesmo email
- **Login**: Supabase valida em `auth.users`, aplicação busca metadados em `usuarios`

## 🔐 Segurança

### Eliminação de Vulnerabilidades

✅ **Sem Secrets Hardcoded**
- Removido fallback `'meguispet_jwt_secret_2025_super_secure_key_luisfboff_production'`
- JWT_SECRET não é mais usado ou necessário

✅ **Tokens de Curta Duração**
- Access token: 1 hora (antes era 24h)
- Refresh automático transparente para o usuário

✅ **Refresh Tokens**
- Supabase gerencia refresh tokens automaticamente
- Renovação sem interromper sessão do usuário

✅ **Revogação de Sessão**
- `supabase.auth.signOut()` revoga tokens no servidor
- Sessões podem ser revogadas via Supabase Dashboard

✅ **Pronto para MFA**
- Supabase Auth suporta MFA/2FA nativo
- Pode ser ativado no Supabase Dashboard

### Variáveis de Ambiente Necessárias

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[seu-projeto].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...  # Chave pública
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...     # Chave privada (apenas backend)
```

**⚠️ Importante:**
- `ANON_KEY`: Segura para usar no frontend (RLS protege dados)
- `SERVICE_ROLE_KEY`: Apenas para operações admin no backend (nunca exponha ao frontend)

## 🧪 Testando Autenticação

### 1. Login via API

```bash
curl -X POST http://localhost:3000/api/auth \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "senha123"}'
```

### 2. Acessar Rota Protegida

```bash
curl http://localhost:3000/api/produtos \
  -H "Authorization: Bearer eyJhbGc..."
```

### 3. Obter Perfil

```bash
curl http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer eyJhbGc..."
```

## 🚀 Próximos Passos

### Implementar RLS (Row Level Security)

```sql
-- Exemplo: Proteger tabela usuarios
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver apenas seu próprio registro
CREATE POLICY "Users can view own record"
  ON usuarios
  FOR SELECT
  USING (auth.email() = email);

-- Política: Admins podem ver todos
CREATE POLICY "Admins can view all"
  ON usuarios
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE email = auth.email()
      AND role = 'admin'
    )
  );
```

### Implementar MFA (Multi-Factor Authentication)

1. Ativar no Supabase Dashboard: Authentication > Settings > MFA
2. No frontend, use `supabase.auth.mfa.enroll()` e `verify()`
3. Documentação: https://supabase.com/docs/guides/auth/auth-mfa

### Migrar Criação de Usuários

**Antes (❌ Deprecated):**
```typescript
// Criava usuário apenas na tabela usuarios
await supabase.from('usuarios').insert({ nome, email, password_hash, role })
```

**Depois (✅ Correto):**
```typescript
// 1. Criar usuário no Supabase Auth
const { data: authData, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: `${window.location.origin}/auth/callback`,
  }
})

// 2. Criar metadados na tabela usuarios
if (authData.user) {
  await supabase.from('usuarios').insert({
    email: authData.user.email,
    nome,
    role: 'user',
    ativo: true
  })
}
```

## 📚 Referências

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

---

**Autor**: Migração de segurança - Outubro 2025  
**Status**: ✅ Implementado e em produção
