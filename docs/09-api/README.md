# 🔌 API e Autenticação

Documentação das APIs, autenticação e integrações do MeguisPet.

---

## 📋 Documentação

### 🔐 Autenticação
- **[Supabase Auth](./SUPABASE_AUTH.md)** - Sistema de autenticação atual com Supabase
- **[Auth Migration Guide](./AUTH_MIGRATION_GUIDE.md)** - Guia de migração do sistema de autenticação

### 👥 Usuários e Tokens
- **[Implementação Usuários e Token](./IMPLEMENTATION_USUARIOS_TOKEN.md)** - Criação de usuários e expiração de token
- **[Summary](./SUMMARY.md)** - Resumo da implementação

### ⚠️ Legacy (Deprecated)
- **[Sistema JWT](./SISTEMA_JWT_AUTENTICACAO.md)** - Sistema JWT antigo (deprecated)
- **[Secrets Setup](./SECRETS_SETUP.md)** - Configuração de secrets antiga (deprecated)

---

## 🎯 Sistema Atual

### Autenticação (Supabase)

#### Features
- ✅ Login com email/senha
- ✅ Registro de novos usuários
- ✅ Sessões gerenciadas pelo Supabase
- ✅ Tokens JWT automáticos
- ✅ Refresh tokens
- ✅ Expiração configurável (10 horas)

#### Middleware Edge
- ✅ Proteção de rotas no Edge Runtime
- ✅ Validação automática de sessão
- ✅ Redirect para login se não autenticado
- ✅ Performance otimizada (edge)

---

## 🚀 Como Usar

### Autenticar Usuário
```typescript
import { supabase } from '@/lib/supabase';

// Login
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'usuario@email.com',
  password: 'senha123'
});

// Obter sessão atual
const { data: { session } } = await supabase.auth.getSession();

// Logout
await supabase.auth.signOut();
```

### Proteger Página (Client-side)
```typescript
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function ProtectedPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) return <div>Carregando...</div>;
  if (!user) return null;

  return <div>Conteúdo protegido</div>;
}
```

### Proteger API Route
```typescript
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const supabase = createServerSupabaseClient({ req, res });
  
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  // Lógica da API aqui
  res.json({ message: 'Sucesso', user: session.user });
}
```

---

## 🔒 Segurança

### Boas Práticas Implementadas
- ✅ Tokens JWT com expiração
- ✅ Refresh tokens automáticos
- ✅ HTTPS obrigatório (Vercel)
- ✅ Variáveis de ambiente seguras
- ✅ Row Level Security (RLS) no Supabase
- ✅ Validação server-side

### Configurações de Segurança
```typescript
// supabase/config.toml
[auth]
site_url = "https://gestao.meguispet.com"
additional_redirect_urls = ["http://localhost:3000"]
jwt_expiry = 36000  # 10 horas
enable_signup = true
```

---

## 📊 Fluxo de Autenticação

```
1. Usuário faz login
   ↓
2. Supabase valida credenciais
   ↓
3. Supabase gera JWT + Refresh Token
   ↓
4. Cliente armazena tokens (cookie httpOnly)
   ↓
5. Middleware valida token em cada requisição
   ↓
6. Token expira após 10 horas
   ↓
7. Cliente usa refresh token para renovar
```

---

## 🗄️ Estrutura de Usuários

### Tabela: `usuarios`
```sql
- id (PK, UUID)
- email (unique)
- nome
- tipo (admin, vendedor, etc)
- ativo
- created_at
- updated_at
```

### Sincronização com Supabase Auth
- Trigger automático cria usuário na tabela `usuarios`
- Mantém consistência entre auth.users e public.usuarios

---

## 🔗 Links Relacionados

- [Setup](../01-setup/) - Configuração de variáveis de ambiente
- [Deployment](../07-deployment/) - Deploy e configurações de produção
- [Development](../06-development/) - Guias de desenvolvimento

---

[⬅️ Voltar para Documentação](../README.md)
