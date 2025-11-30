# 🚀 Quick Start - Dashboards Personalizados

Este guia rápido te mostra como começar a implementação do sistema de dashboards personalizados.

---

## 📋 Pré-requisitos

- [ ] Backup do banco de dados
- [ ] Acesso ao Supabase ou PostgreSQL
- [ ] Node.js e pnpm instalados
- [ ] Código em uma branch separada (`feature/dashboards-personalizados`)

---

## 🎯 Passo 1: Executar Migrations (30min)

### 1.1. Backup do banco

```bash
# Se usando Supabase
# Fazer backup pelo painel: Settings → Database → Database Backups

# Se usando PostgreSQL local
pg_dump -U postgres meguispet > backup_$(date +%Y%m%d).sql
```

### 1.2. Executar migrations

```bash
# Via Supabase SQL Editor
# 1. Abra o SQL Editor no painel do Supabase
# 2. Cole o conteúdo de database/migrations/20250129_add_user_roles.sql
# 3. Execute (Run)
# 4. Verifique os logs

# 5. Cole o conteúdo de database/migrations/20250129_add_vendedor_usuario_id.sql
# 6. Execute (Run)
# 7. Verifique relatório de vendedores sem vínculo
```

### 1.3. Validar migrations

```sql
-- Verificar colunas criadas
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'usuarios'
  AND column_name IN ('tipo_usuario', 'vendedor_id', 'permissoes');

-- Verificar vendedores vinculados
SELECT COUNT(*) as total_vinculados
FROM vendedores
WHERE usuario_id IS NOT NULL;

-- Listar vendedores sem vínculo
SELECT id, nome, email
FROM vendedores
WHERE usuario_id IS NULL;
```

---

## 🎯 Passo 2: Atualizar Types TypeScript (15min)

### 2.1. Criar `types/permissions.ts`

```bash
touch types/permissions.ts
```

```typescript
// types/permissions.ts
export type UserRole =
  | 'admin'
  | 'gerente'
  | 'vendedor'
  | 'financeiro'
  | 'estoque'
  | 'operador'
  | 'visualizador'

export interface Permissoes {
  // Módulos
  dashboard: boolean
  vendas: boolean
  clientes: boolean
  produtos: boolean
  estoque: boolean
  financeiro: boolean
  relatorios: boolean
  configuracoes: boolean
  usuarios: boolean

  // Ações de Vendas
  vendas_criar: boolean
  vendas_editar: boolean
  vendas_deletar: boolean
  vendas_visualizar_todas: boolean

  // Ações de Clientes
  clientes_criar: boolean
  clientes_editar: boolean
  clientes_deletar: boolean
  clientes_visualizar_todos: boolean

  // Ações de Produtos
  produtos_criar: boolean
  produtos_editar: boolean
  produtos_deletar: boolean
  produtos_ajustar_estoque: boolean

  // Ações Financeiras
  financeiro_visualizar: boolean
  financeiro_criar_transacao: boolean
  financeiro_editar_transacao: boolean

  // Ações de Relatórios
  relatorios_gerar: boolean
  relatorios_exportar: boolean

  // Configurações
  config_sistema: boolean
  config_usuarios: boolean
}

export const PERMISSIONS_PRESETS: Record<UserRole, Partial<Permissoes>> = {
  admin: {
    // Admin tem tudo
    dashboard: true,
    vendas: true,
    vendas_criar: true,
    vendas_editar: true,
    vendas_deletar: true,
    vendas_visualizar_todas: true,
    clientes: true,
    clientes_criar: true,
    clientes_editar: true,
    clientes_deletar: true,
    clientes_visualizar_todos: true,
    produtos: true,
    produtos_criar: true,
    produtos_editar: true,
    produtos_deletar: true,
    produtos_ajustar_estoque: true,
    estoque: true,
    financeiro: true,
    financeiro_visualizar: true,
    financeiro_criar_transacao: true,
    financeiro_editar_transacao: true,
    relatorios: true,
    relatorios_gerar: true,
    relatorios_exportar: true,
    configuracoes: true,
    config_sistema: true,
    config_usuarios: true,
    usuarios: true,
  },

  vendedor: {
    dashboard: true,
    vendas: true,
    vendas_criar: true,
    vendas_editar: true,
    vendas_deletar: false,
    vendas_visualizar_todas: false, // ⚠️ Só vê as próprias
    clientes: true,
    clientes_criar: true,
    clientes_editar: true,
    clientes_deletar: false,
    clientes_visualizar_todos: false, // ⚠️ Só vê os próprios
    produtos: true, // Pode ver produtos para fazer vendas
    produtos_criar: false,
    produtos_editar: false,
    produtos_deletar: false,
    produtos_ajustar_estoque: false,
    estoque: false,
    financeiro: false, // ⚠️ Não acessa financeiro
    relatorios: true,
    relatorios_gerar: false,
    relatorios_exportar: false,
    configuracoes: false,
    config_sistema: false,
    config_usuarios: false,
    usuarios: false,
  },

  financeiro: {
    dashboard: true,
    vendas: true,
    vendas_criar: false,
    vendas_editar: false,
    vendas_deletar: false,
    vendas_visualizar_todas: true, // ✓ Vê todas as vendas
    clientes: true,
    clientes_visualizar_todos: true,
    produtos: false,
    estoque: false,
    financeiro: true, // ✓ Acessa financeiro
    financeiro_visualizar: true,
    financeiro_criar_transacao: true,
    financeiro_editar_transacao: true,
    relatorios: true,
    relatorios_gerar: true,
    relatorios_exportar: true,
    configuracoes: false,
    usuarios: false,
  },

  // Adicione outros presets conforme necessário
  gerente: {},
  estoque: {},
  operador: {},
  visualizador: {},
}
```

### 2.2. Atualizar `types/index.ts`

```typescript
// types/index.ts
import type { UserRole, Permissoes } from './permissions'

export interface Usuario {
  id: number
  nome: string
  email: string
  password_hash: string
  role: UserRole  // ✏️ Atualizado
  tipo_usuario: UserRole  // 🆕 Novo
  permissoes: Permissoes  // ✏️ Tipado
  vendedor_id?: number | null  // 🆕 Novo
  departamento?: string  // 🆕 Novo
  ativo: boolean
  supabase_user_id?: string
  created_at: string
  updated_at: string
}

export interface Vendedor {
  id: number
  usuario_id?: number | null  // 🆕 Novo
  nome: string
  email?: string
  telefone?: string
  cpf?: string
  comissao: number
  ativo: boolean
  created_at: string
  updated_at: string
  total_vendas?: number
  total_faturamento?: number
}

// Exportar tipos de permissões
export type { UserRole, Permissoes } from './permissions'
export { PERMISSIONS_PRESETS } from './permissions'
```

---

## 🎯 Passo 3: Criar Hook de Permissões (20min)

### 3.1. Criar `hooks/usePermissions.ts`

```bash
touch hooks/usePermissions.ts
```

```typescript
// hooks/usePermissions.ts
import { useAuthStore } from '@/store/auth'
import { useMemo } from 'react'
import type { Permissoes } from '@/types'

export function usePermissions() {
  const user = useAuthStore(state => state.user)

  const permissions = useMemo<Permissoes>(() => {
    if (!user || !user.permissoes) {
      return {} as Permissoes
    }
    return user.permissoes
  }, [user])

  const hasPermission = (permission: keyof Permissoes): boolean => {
    return permissions[permission] === true
  }

  const hasAnyPermission = (perms: (keyof Permissoes)[]): boolean => {
    return perms.some(p => permissions[p] === true)
  }

  const hasAllPermissions = (perms: (keyof Permissoes)[]): boolean => {
    return perms.every(p => permissions[p] === true)
  }

  const canViewAllSales = permissions.vendas_visualizar_todas === true
  const canViewAllClients = permissions.clientes_visualizar_todos === true
  const isAdmin = user?.tipo_usuario === 'admin'
  const isVendedor = user?.tipo_usuario === 'vendedor'
  const isFinanceiro = user?.tipo_usuario === 'financeiro'

  return {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isAdmin,
    isVendedor,
    isFinanceiro,
    canViewAllSales,
    canViewAllClients,
    vendedorId: user?.vendedor_id,
  }
}
```

---

## 🎯 Passo 4: Testar Localmente (30min)

### 4.1. Criar usuário vendedor de teste

```sql
-- No SQL Editor do Supabase
INSERT INTO usuarios (nome, email, password_hash, tipo_usuario, ativo, created_at, updated_at)
VALUES (
  'João Vendedor',
  'joao@meguispet.com',
  '$2a$10$HASH_AQUI',  -- Substitua por hash real
  'vendedor',
  true,
  NOW(),
  NOW()
);

-- Verificar se vendedor foi criado automaticamente pelo trigger
SELECT u.id, u.nome, u.tipo_usuario, v.id as vendedor_id, v.nome as vendedor_nome
FROM usuarios u
LEFT JOIN vendedores v ON v.usuario_id = u.id
WHERE u.email = 'joao@meguispet.com';
```

### 4.2. Testar hook de permissões

Crie uma página de teste:

```typescript
// pages/test-permissions.tsx
import { usePermissions } from '@/hooks/usePermissions'

export default function TestPermissionsPage() {
  const {
    permissions,
    hasPermission,
    isAdmin,
    isVendedor,
    canViewAllSales,
    vendedorId,
  } = usePermissions()

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Teste de Permissões</h1>

      <div className="space-y-4">
        <div>
          <strong>É Admin:</strong> {isAdmin ? 'Sim' : 'Não'}
        </div>
        <div>
          <strong>É Vendedor:</strong> {isVendedor ? 'Sim' : 'Não'}
        </div>
        <div>
          <strong>Vendedor ID:</strong> {vendedorId || 'N/A'}
        </div>
        <div>
          <strong>Pode ver todas as vendas:</strong>{' '}
          {canViewAllSales ? 'Sim' : 'Não'}
        </div>

        <div className="mt-6">
          <h2 className="text-xl font-bold mb-2">Permissões:</h2>
          <ul className="space-y-1">
            <li>Dashboard: {hasPermission('dashboard') ? '✅' : '❌'}</li>
            <li>Vendas: {hasPermission('vendas') ? '✅' : '❌'}</li>
            <li>
              Criar Vendas: {hasPermission('vendas_criar') ? '✅' : '❌'}
            </li>
            <li>
              Ver Todas Vendas:{' '}
              {hasPermission('vendas_visualizar_todas') ? '✅' : '❌'}
            </li>
            <li>Financeiro: {hasPermission('financeiro') ? '✅' : '❌'}</li>
            <li>Configurações: {hasPermission('configuracoes') ? '✅' : '❌'}</li>
          </ul>
        </div>

        <div className="mt-6">
          <h2 className="text-xl font-bold mb-2">Todas as Permissões:</h2>
          <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto">
            {JSON.stringify(permissions, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}
```

Acesse `/test-permissions` e verifique se:
- ✅ Permissões aparecem corretamente
- ✅ `isVendedor` é true para usuário vendedor
- ✅ `vendedorId` aparece
- ✅ `canViewAllSales` é false para vendedor

---

## 🎯 Passo 5: Proteger Uma Rota (20min)

### 5.1. Proteger `/financeiro`

Edite `pages/financeiro.tsx`:

```typescript
// pages/financeiro.tsx
import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { usePermissions } from '@/hooks/usePermissions'

export default function FinanceiroPage() {
  const router = useRouter()
  const { hasPermission } = usePermissions()

  useEffect(() => {
    if (!hasPermission('financeiro')) {
      router.push('/dashboard?error=permission_denied')
    }
  }, [hasPermission, router])

  if (!hasPermission('financeiro')) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Acesso Negado</h1>
          <p className="text-gray-600 mb-4">
            Você não tem permissão para acessar esta página.
          </p>
        </div>
      </div>
    )
  }

  // ... resto do código
}
```

### 5.2. Testar proteção

1. Faça login com usuário vendedor
2. Tente acessar `/financeiro`
3. Deve redirecionar para `/dashboard` com erro

---

## 🎯 Próximos Passos

Após completar este Quick Start, você terá:
- ✅ Migrations executadas
- ✅ Types atualizados
- ✅ Hook de permissões funcionando
- ✅ Primeira rota protegida

**Continue para:**
1. Implementar Dashboard do Vendedor (ver `PLANO-DASHBOARD-PERSONALIZADO.md` - FASE 4)
2. Atualizar middleware com permissões (FASE 2)
3. Adicionar filtros nas APIs (FASE 3)

---

## 🆘 Troubleshooting

### Erro: "Column tipo_usuario does not exist"
**Solução:** Execute a migration `20250129_add_user_roles.sql`

### Erro: "Vendedor não foi criado automaticamente"
**Solução:** Verifique se o trigger foi criado corretamente:
```sql
SELECT * FROM pg_trigger WHERE tgname = 'trigger_create_vendedor_for_user';
```

### Permissões aparecem como {}
**Solução:** Execute o UPDATE para aplicar permissões padrão:
```sql
UPDATE usuarios
SET permissoes = get_vendedor_permissions()
WHERE tipo_usuario = 'vendedor' AND (permissoes IS NULL OR permissoes = '{}'::jsonb);
```

### Usuário não tem vendedor_id
**Solução:** Vincule manualmente:
```sql
UPDATE usuarios
SET vendedor_id = (SELECT id FROM vendedores WHERE email = usuarios.email LIMIT 1)
WHERE tipo_usuario = 'vendedor' AND vendedor_id IS NULL;
```

---

## 📚 Recursos Adicionais

- [Plano Completo](./PLANO-DASHBOARD-PERSONALIZADO.md)
- [Migrations SQL](../../database/migrations/)
- [Documentação Supabase Auth](https://supabase.com/docs/guides/auth)

---

**Boa sorte! 🚀**
