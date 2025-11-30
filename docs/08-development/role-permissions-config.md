# 🔐 Sistema de Configuração de Permissões por Role

## 📋 Resumo

Sistema completo para configurar as permissões padrão de cada tipo de usuário (role) diretamente pela interface web.

## ✅ Implementado

### 1. Interface de Configuração
- **Localização**: Página "Usuários" → Aba "Configurações de Permissões"
- **Funcionalidades**:
  - Seleção visual de roles (admin, gerente, vendedor, financeiro, estoque, operador, visualizador)
  - Checkboxes agrupados por categoria
  - Contador de permissões ativas
  - Botões: Salvar, Reverter, Resetar Padrão

### 2. Endpoints API

```typescript
// Listar todas as configurações
GET /api/role-permissions

// Buscar configuração de um role específico
GET /api/role-permissions/vendedor

// Salvar/atualizar configuração
POST /api/role-permissions
Body: { role: "vendedor", permissions: {...} }
```

### 3. Banco de Dados

```sql
-- Tabela de configurações
role_permissions_config (
  role TEXT PRIMARY KEY,
  permissions JSONB NOT NULL,
  updated_at TIMESTAMPTZ,
  updated_by INTEGER
)
```

## 🚀 Como Usar

### Passo 1: Executar Migration

```bash
# Conectar ao Supabase e executar
psql -h seu-host -U seu-usuario -d sua-database -f database/migrations/20251130_create_role_permissions_config.sql
```

### Passo 2: Acessar Interface

1. Login como admin
2. Ir em **Usuários**
3. Clicar na aba **"Configurações de Permissões"**
4. Selecionar o role que deseja configurar

### Passo 3: Configurar Permissões

1. **Escolher o Role**: Clicar na aba do tipo de usuário (ex: "Vendedor")
2. **Marcar Permissões**: Usar os checkboxes para ativar/desativar
3. **Salvar**: Clicar em "Salvar Alterações"

## 📊 Categorias de Permissões

### Módulos Principais
- Dashboard, Vendas, Clientes, Produtos, Estoque, Financeiro, Relatórios, Configurações, Usuários

### Ações de Vendas
- Criar, Editar, Deletar, Ver Todas

### Ações de Clientes
- Criar, Editar, Deletar, Ver Todos

### Ações de Produtos
- Criar, Editar, Deletar, Ajustar Estoque

### Ações Financeiras
- Visualizar, Criar Transação, Editar Transação

### Ações de Relatórios
- Gerar, Exportar

### Configurações
- Sistema, Usuários

## 🔄 Fluxo de Aplicação de Permissões

```
1. Verificar se existe configuração em role_permissions_config
   ↓ SIM → Usar essa configuração
   ↓ NÃO ↓
2. Usar preset padrão do TypeScript (PERMISSIONS_PRESETS)
   ↓
3. Se usuário tiver permissoes_custom → Sobrescrever tudo
   ↓
4. Aplicar permissões finais ao usuário
```

## 🎯 Exemplo Prático

### Cenário: Dar mais permissões aos vendedores

**Antes**: Vendedores não podiam ver relatórios
**Depois**: 
1. Ir em Usuários → Configurações de Permissões
2. Selecionar aba "Vendedor"
3. Marcar: ✅ Relatórios, ✅ Gerar Relatórios
4. Salvar

**Resultado**: Todos os vendedores agora podem ver e gerar relatórios

## ⚠️ Importante

- ✅ **Apenas administradores** podem acessar esta funcionalidade
- ✅ Configurações afetam **todos os usuários** com aquele role
- ✅ Usuários com **permissões customizadas individuais** não são afetados
- ✅ Alterações são aplicadas **imediatamente** (após relogin ou refresh)

## 🔍 Troubleshooting

### Permissões não estão sendo aplicadas?
1. Verificar se a migration foi executada
2. Verificar RLS policies no Supabase
3. Verificar se o usuário tem `permissoes_custom` que sobrescreve

### Erro ao salvar?
1. Confirmar que é admin (`tipo_usuario = 'admin'`)
2. Verificar logs do console (F12)
3. Verificar endpoint `/api/role-permissions`

## 📝 Notas Técnicas

- **Componente**: `RolePermissionsConfig.tsx`
- **State Management**: useState local (sem Zustand necessário)
- **Validação**: Backend valida role e admin
- **Cache**: Sem cache, sempre busca do banco
- **Performance**: Leve (~27 permissões por role)

## 🎨 UI/UX

- Layout responsivo (grid adapta para mobile)
- Visual feedback: badge com contador de permissões
- Estados: loading, saving, hasChanges
- Toast notifications para sucesso/erro
- Botão "Reverter" só aparece se há mudanças não salvas

---

**Criado em**: 30/11/2025  
**Status**: ✅ Completo e testado
