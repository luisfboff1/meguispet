# RLS Security Audit & Fixes

**Data**: 2025-12-13
**Migração**: `020_enable_rls_security_hardening.sql`

## Resumo Executivo

O Supabase Database Linter identificou **11 problemas críticos de segurança** no banco de dados. Todos foram corrigidos pela migração 020.

## Problemas Identificados

### 1. RLS Disabled in Public (9 tabelas - CRÍTICO 🔴)

**Risco**: Tabelas expostas via PostgREST API sem Row Level Security permitem que qualquer usuário autenticado possa potencialmente ler/modificar dados sem restrições.

**Tabelas afetadas**:
- `formas_pagamento`
- `fornecedores`
- `movimentacoes_itens`
- `historico_precos`
- `categorias_financeiras`
- `transacoes_recorrentes`
- `relatorios_templates`
- `venda_parcelas`
- `usuarios` ⚠️ **MUITO CRÍTICO**

### 2. Security Definer Views (2 views - ALERTA 🟡)

**Risco**: Views com `SECURITY DEFINER` executam com as permissões do criador da view, não do usuário que consulta. Isso pode contornar políticas RLS e criar vulnerabilidades de escalação de privilégios.

**Views afetadas**:
- `estoque_com_valores`
- `vendedores_com_usuario`

## Soluções Implementadas

### 1. RLS Habilitado em Todas as Tabelas

```sql
ALTER TABLE formas_pagamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE fornecedores ENABLE ROW LEVEL SECURITY;
-- ... (9 tabelas no total)
```

### 2. Políticas RLS Criadas (36 políticas)

Cada tabela recebeu 4 políticas RLS (SELECT, INSERT, UPDATE, DELETE) com permissões baseadas em `tipo_usuario`:

#### Formas de Pagamento
- **SELECT**: Todos usuários autenticados
- **INSERT/UPDATE**: `admin`, `gerente`
- **DELETE**: `admin` apenas

#### Fornecedores
- **SELECT**: Todos usuários autenticados
- **INSERT/UPDATE**: `admin`, `gerente`, `estoque`
- **DELETE**: `admin` apenas

#### Movimentações de Estoque (Itens)
- **SELECT**: Todos usuários autenticados
- **INSERT/UPDATE**: `admin`, `gerente`, `estoque`
- **DELETE**: `admin` apenas

#### Histórico de Preços
- **SELECT**: Todos usuários autenticados
- **INSERT**: `admin`, `gerente`, `estoque` (sistema)
- **DELETE**: `admin` apenas

#### Categorias Financeiras
- **SELECT**: Todos usuários autenticados
- **INSERT/UPDATE**: `admin`, `gerente`, `financeiro`
- **DELETE**: `admin` apenas

#### Transações Recorrentes
- **SELECT**: Todos usuários autenticados
- **INSERT/UPDATE**: `admin`, `gerente`, `financeiro`
- **DELETE**: `admin` apenas

#### Templates de Relatórios
- **SELECT**: Todos usuários autenticados
- **INSERT/UPDATE**: `admin`, `gerente`
- **DELETE**: `admin` apenas

#### Parcelas de Venda
- **SELECT**: Todos usuários autenticados
- **INSERT**: `admin`, `gerente`, `vendedor`, `financeiro`
- **UPDATE**: `admin`, `gerente`, `financeiro`
- **DELETE**: `admin`, `gerente`

#### Usuários (CRÍTICO)
- **SELECT**: Próprio registro OU `admin`/`gerente`
- **INSERT**: `admin` apenas
- **UPDATE**: Próprio registro OU `admin`
- **DELETE**: `admin` apenas

### 3. Views Corrigidas

As views foram recriadas **sem** `SECURITY DEFINER`:

```sql
-- Antes (INSEGURO)
CREATE VIEW estoque_com_valores WITH (SECURITY_DEFINER=true) AS ...

-- Depois (SEGURO)
CREATE VIEW estoque_com_valores AS ...
```

Agora as views respeitam as políticas RLS das tabelas base (`produtos`, `vendedores`, `usuarios`).

## Matriz de Permissões

| Tabela                    | SELECT | INSERT | UPDATE | DELETE |
|---------------------------|--------|--------|--------|--------|
| formas_pagamento          | Todos  | A,G    | A,G    | A      |
| fornecedores              | Todos  | A,G,E  | A,G,E  | A      |
| movimentacoes_itens       | Todos  | A,G,E  | A,G,E  | A      |
| historico_precos          | Todos  | A,G,E  | -      | A      |
| categorias_financeiras    | Todos  | A,G,F  | A,G,F  | A      |
| transacoes_recorrentes    | Todos  | A,G,F  | A,G,F  | A      |
| relatorios_templates      | Todos  | A,G    | A,G    | A      |
| venda_parcelas            | Todos  | A,G,V,F| A,G,F  | A,G    |
| usuarios                  | Self+AG| A      | Self+A | A      |

**Legenda**:
- A = admin
- G = gerente
- E = estoque
- F = financeiro
- V = vendedor
- Self = próprio registro
- AG = admin ou gerente

## Como Aplicar a Migração

### 1. Via Supabase SQL Editor

1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Cole o conteúdo de `database/migrations/020_enable_rls_security_hardening.sql`
4. Execute

### 2. Via CLI (psql)

```bash
psql -h <supabase-host> -U postgres -d postgres < database/migrations/020_enable_rls_security_hardening.sql
```

## Verificação Pós-Migração

### 1. Executar Database Linter

No Supabase Dashboard:
1. Vá em **Database → Database Linter**
2. Execute a análise
3. **Resultado esperado**: 0 erros de segurança

### 2. Verificar RLS Habilitado

```sql
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

Todas as tabelas devem ter `rls_enabled = true`.

### 3. Verificar Políticas

```sql
SELECT
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
```

### 4. Teste de Permissões

Faça login com diferentes tipos de usuário e teste:

- ✅ **Admin**: Deve ter acesso total
- ✅ **Gerente**: Deve ter acesso gerencial
- ✅ **Vendedor**: Deve acessar vendas mas não deletar
- ✅ **Estoque**: Deve acessar produtos/fornecedores
- ✅ **Financeiro**: Deve acessar transações
- ❌ **Usuário comum**: Deve ver apenas próprio registro em `usuarios`

## Impacto na Aplicação

### ✅ Sem Breaking Changes

As políticas RLS foram desenhadas para manter a funcionalidade atual:
- Leitura liberada para usuários autenticados
- Escrita restrita por role
- Exclusão apenas para admin

### ⚠️ Mudanças de Comportamento

1. **Usuários**: Agora só podem ver próprio registro (exceto admin/gerente)
2. **Views**: Agora respeitam RLS das tabelas base
3. **API**: Chamadas via PostgREST agora são filtradas por RLS

### 🔄 Ações Necessárias

1. **Todos usuários devem fazer logout/login** após migração
2. **Testar todas funcionalidades** principais
3. **Verificar relatórios** que usam as views corrigidas

## Segurança em Camadas (Defense in Depth)

Este projeto agora tem 3 camadas de segurança:

1. **Edge Middleware** (`middleware.ts`): Autenticação JWT
2. **RLS Policies** (este fix): Autorização granular no banco
3. **API Service Layer** (`services/`): Validação de negócio

## Referências

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [OWASP Access Control](https://owasp.org/www-project-top-ten/2017/A5_2017-Broken_Access_Control)

## Histórico de Alterações

| Data       | Versão | Descrição                                      |
|------------|--------|------------------------------------------------|
| 2025-12-13 | 1.0    | Migração inicial - RLS habilitado em 9 tabelas |
| 2025-12-13 | 1.0    | Views corrigidas (SECURITY DEFINER removido)   |
