# 🔐 Sistema de Permissões Multi-Role

## 📋 Visão Geral

O MeguisPet implementa um sistema avançado de permissões que permite:

1. **Múltiplos Roles por Usuário**: Um usuário pode ter vários papéis simultaneamente (ex: vendedor + financeiro)
2. **Permissões Customizáveis**: Admin pode customizar permissões individuais que sobrescrevem os roles
3. **Vinculação Opcional com Vendedor**: Nem todo vendedor precisa ter usuário
4. **Cálculo Automático**: As permissões são calculadas automaticamente no banco de dados

## 🏗️ Arquitetura

### 1. Estrutura de Dados

```typescript
interface Usuario {
  // Role primário (obrigatório)
  tipo_usuario: UserRole  // 'admin' | 'gerente' | 'vendedor' | 'financeiro' | 'estoque' | 'operador' | 'visualizador'

  // Roles adicionais (opcional)
  roles?: UserRole[]  // Ex: ['vendedor', 'financeiro']

  // Permissões customizadas pelo admin (opcional)
  permissoes_custom?: Partial<Permissoes>  // Sobrescreve os roles

  // Permissões finais calculadas (merge automático)
  permissoes: Permissoes  // Calculado por trigger no banco

  // Vinculação opcional com vendedor
  vendedor_id?: number | null
}
```

### 2. Fluxo de Cálculo de Permissões

```
┌─────────────────────────────────────────────────────────────┐
│                    CÁLCULO DE PERMISSÕES                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. Permissões do Role Primário (tipo_usuario)               │
│    Ex: vendedor → {vendas_criar: true, financeiro: false}   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. + Permissões dos Roles Adicionais (roles[])              │
│    Ex: financeiro → {financeiro: true}                       │
│    Merge: OR lógico (se qualquer permite, concede)          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. + Permissões Customizadas (permissoes_custom)            │
│    Ex: admin bloqueia vendas_deletar: false                 │
│    Merge: Sobrescreve tudo                                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Resultado Final (permissoes)                             │
│    Salvo automaticamente pelo trigger                       │
└─────────────────────────────────────────────────────────────┘
```

### 3. Exemplo Prático

**Usuário: João (Vendedor + Financeiro)**

```sql
-- Dados
tipo_usuario: 'vendedor'
roles: ['financeiro']
permissoes_custom: { vendas_deletar: true }

-- Cálculo Automático:
1. Role vendedor:
   - vendas_criar: true
   - vendas_editar: true
   - vendas_deletar: false ❌
   - financeiro: false ❌

2. + Role financeiro:
   - financeiro: true ✅ (adiciona)
   - vendas_visualizar_todas: true ✅ (adiciona)

3. + Custom:
   - vendas_deletar: true ✅ (sobrescreve o false do vendedor)

-- Resultado Final (permissoes):
{
  vendas_criar: true,           // do vendedor
  vendas_editar: true,          // do vendedor
  vendas_deletar: true,         // CUSTOMIZADO (era false)
  vendas_visualizar_todas: true, // do financeiro
  financeiro: true,             // do financeiro
  ...
}
```

## 🚀 Como Usar

### 1. No Frontend - Hook usePermissions

```typescript
import { usePermissions } from '@/hooks/usePermissions'

function MyComponent() {
  const {
    // Verificar permissões específicas
    hasPermission,
    canViewAllSales,

    // Verificar roles
    isVendedor,
    isFinanceiro,
    hasRole,
    allRoles,

    // Dados do usuário
    vendedorId,
  } = usePermissions()

  // Exemplo 1: Verificar permissão
  if (hasPermission('vendas_criar')) {
    return <CreateSaleButton />
  }

  // Exemplo 2: Verificar múltiplos roles
  if (isVendedor && isFinanceiro) {
    // Usuário é vendedor E financeiro
  }

  // Exemplo 3: Verificar role específico
  if (hasRole('gerente')) {
    // Usuário tem role de gerente (primário ou adicional)
  }

  // Exemplo 4: Filtrar dados por vendedor
  if (!canViewAllSales && vendedorId) {
    // Usuário só vê suas vendas
    fetchVendasByVendedor(vendedorId)
  }
}
```

### 2. No Frontend - PermissionGate Component

```typescript
import { PermissionGate } from '@/components/auth/PermissionGate'

// Proteger página inteira
<PermissionGate permission="financeiro" redirect="/dashboard">
  <FinanceiroPage />
</PermissionGate>

// Proteger seção inline
<PermissionGate permission="vendas_deletar" inline>
  <DeleteButton />
</PermissionGate>

// Com fallback customizado
<PermissionGate
  permission="vendas_criar"
  fallback={<p>Você não pode criar vendas</p>}
>
  <CreateSaleForm />
</PermissionGate>
```

### 3. No Backend - API Route

```typescript
// pages/api/vendas/my.ts
export default async function handler(req, res) {
  // 1. Buscar usuário autenticado
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('id, tipo_usuario, vendedor_id, permissoes')
    .eq('supabase_user_id', user.id)
    .single()

  // 2. Construir query baseada em permissões
  let query = supabase.from('vendas').select('*')

  // 3. Filtrar por vendedor se necessário
  if (!usuario.permissoes.vendas_visualizar_todas && usuario.vendedor_id) {
    query = query.eq('vendedor_id', usuario.vendedor_id)
  }

  const { data: vendas } = await query
  return res.json({ success: true, data: vendas })
}
```

### 4. Admin UI - Gerenciar Permissões

```typescript
import { UsuarioPermissoesForm } from '@/components/forms/UsuarioPermissoesForm'

function UsuarioEditPage() {
  const handleSubmit = async (data) => {
    await api.put(`/usuarios/${id}`, {
      tipo_usuario: data.tipo_usuario,      // Role primário
      roles: data.roles,                     // Roles adicionais
      permissoes_custom: data.permissoes_custom, // Customizações
      vendedor_id: data.vendedor_id,        // Vínculo opcional
    })
  }

  return (
    <UsuarioPermissoesForm
      usuario={usuario}
      vendedores={vendedores}
      onSubmit={handleSubmit}
      onCancel={() => router.back()}
    />
  )
}
```

### 5. Admin UI - Vincular Vendedores

```typescript
import { VendedorUsuarioLinkManager } from '@/components/admin/VendedorUsuarioLinkManager'

function VendedoresConfigPage() {
  return (
    <VendedorUsuarioLinkManager
      vendedores={vendedores}
      usuarios={usuarios}
      onLink={async (vendedorId, usuarioId) => {
        // Vincular vendedor a usuário
        await api.patch(`/vendedores/${vendedorId}`, { usuario_id: usuarioId })
        await api.patch(`/usuarios/${usuarioId}`, { vendedor_id: vendedorId })
      }}
      onUnlink={async (vendedorId) => {
        // Desvincular
        await api.patch(`/vendedores/${vendedorId}`, { usuario_id: null })
      }}
      onCreateUser={async (vendedorId) => {
        // Criar usuário automaticamente para o vendedor
        const vendedor = vendedores.find(v => v.id === vendedorId)
        await api.post('/usuarios', {
          nome: vendedor.nome,
          email: vendedor.email,
          tipo_usuario: 'vendedor',
          vendedor_id: vendedorId,
        })
      }}
    />
  )
}
```

## 📊 Casos de Uso

### Caso 1: Vendedor Puro
```typescript
// Usuário: Maria
tipo_usuario: 'vendedor'
roles: []
vendedor_id: 5

// Resultado:
- Vê apenas suas vendas (vendedor_id = 5)
- Vê apenas seus clientes
- Pode criar/editar vendas
- NÃO pode acessar financeiro
- NÃO pode deletar vendas
```

### Caso 2: Vendedor + Financeiro
```typescript
// Usuário: João
tipo_usuario: 'vendedor'
roles: ['financeiro']
vendedor_id: 3

// Resultado:
- Vê TODAS as vendas (financeiro permite)
- Vê TODOS os clientes (financeiro permite)
- Pode criar/editar vendas (vendedor permite)
- Pode acessar financeiro (financeiro permite)
- Pode criar transações (financeiro permite)
- Ainda vinculado ao vendedor_id 3 para comissões
```

### Caso 3: Gerente com Permissões Customizadas
```typescript
// Usuário: Carlos
tipo_usuario: 'gerente'
roles: []
permissoes_custom: { vendas_deletar: false }

// Resultado:
- Vê todas as vendas (gerente permite)
- Pode criar/editar vendas (gerente permite)
- NÃO pode deletar vendas (CUSTOMIZADO pelo admin)
- Acessa financeiro e relatórios (gerente permite)
```

### Caso 4: Admin Total
```typescript
// Usuário: Admin
tipo_usuario: 'admin'
roles: []

// Resultado:
- Todas as permissões: true
- Acesso total ao sistema
```

## 🔄 Migração de Dados

### Executar as Migrações

```bash
# 1. Adicionar campos de multi-role e custom permissions
psql -U postgres -d meguispet -f database/migrations/20250129_add_user_roles.sql

# 2. Adicionar vinculação bidirecional vendedor ↔ usuario
psql -U postgres -d meguispet -f database/migrations/20250129_add_vendedor_usuario_id.sql
```

### Resultado Esperado

```
✅ Campos adicionados:
   - usuarios.roles (JSONB array)
   - usuarios.permissoes_custom (JSONB)
   - vendedores.usuario_id (INTEGER nullable)

✅ Triggers criados:
   - apply_default_permissions (recalcula permissoes automaticamente)
   - sync_vendedor_usuario (sincroniza vínculos bidirecionais)

✅ Funções criadas:
   - merge_all_permissions() (mescla roles + custom)
   - get_vendedor_permissions()
   - get_financeiro_permissions()
   - get_gerente_permissions()

✅ Views criadas:
   - vendedores_com_usuario (mostra status de vinculação)

✅ Índices criados:
   - idx_usuarios_roles (GIN index para busca em array)
   - uq_vendedor_usuario_id (unique com NULL permitido)
```

## 🎯 Benefícios

1. **Flexibilidade**: Usuários podem ter múltiplos papéis conforme necessário
2. **Granularidade**: Admin pode ajustar permissões individualmente
3. **Performance**: Cálculo de permissões feito no banco (trigger)
4. **Manutenibilidade**: Mudanças em roles são automáticas
5. **Auditoria**: Histórico de mudanças preservado
6. **Escalabilidade**: Fácil adicionar novos roles e permissões

## ⚠️ Considerações Importantes

1. **Permissões são calculadas automaticamente**: Não é necessário calcular no frontend
2. **Trigger roda em INSERT e UPDATE**: Mudanças em tipo_usuario, roles ou permissoes_custom recalculam automaticamente
3. **Vinculação vendedor é opcional**: Nem todo vendedor precisa de usuário
4. **OR lógico para roles**: Se qualquer role permite, a permissão é concedida
5. **Custom sobrescreve tudo**: Permissões customizadas têm prioridade máxima

## 🔍 Debugging

### Verificar Permissões de um Usuário

```sql
SELECT
  id,
  nome,
  tipo_usuario,
  roles,
  permissoes_custom,
  permissoes
FROM usuarios
WHERE id = 1;
```

### Ver Vendedores sem Usuário

```sql
SELECT * FROM vendedores_com_usuario
WHERE status_vinculo = 'Sem Usuário';
```

### Testar Merge de Permissões

```sql
SELECT merge_all_permissions(
  'vendedor',                           -- tipo_usuario
  '["financeiro"]'::jsonb,             -- roles adicionais
  '{"vendas_deletar": true}'::jsonb    -- permissoes_custom
);
```

## 📚 Próximos Passos

Após executar as migrações:

1. [ ] Atualizar página de usuários para usar `UsuarioPermissoesForm`
2. [ ] Criar página admin para `VendedorUsuarioLinkManager`
3. [ ] Atualizar todas as páginas para usar `usePermissions` hook
4. [ ] Adicionar `PermissionGate` nas páginas que precisam proteção
5. [ ] Testar todos os casos de uso listados acima
6. [ ] Atualizar documentação da API

## 🐛 Troubleshooting

### Problema: Permissões não atualizando

**Solução**: O trigger só roda em INSERT/UPDATE. Force um update:
```sql
UPDATE usuarios SET updated_at = NOW() WHERE id = 1;
```

### Problema: Vinculação vendedor não funcionando

**Solução**: Verificar se o trigger de sincronização está ativo:
```sql
SELECT * FROM pg_trigger WHERE tgname = 'trigger_sync_vendedor_usuario';
```

### Problema: Usuário com múltiplos roles não tem todas as permissões

**Solução**: Verificar se a função merge_all_permissions está usando OR lógico corretamente.
