# 🔄 Workflow de Migrations - MeguisPet ERP

## ⚠️ REGRA DE OURO

**SEMPRE que for mudar a estrutura do banco de dados, USE MIGRATIONS!**

Nunca execute SQL direto no Supabase Dashboard para mudanças estruturais em produção.

---

## 📋 Dados do Nosso Banco de Dados

### Configurações Supabase - MeguisPet

```
# Supabase Project
Project Ref: jhodhxvvhohygijqcxbo
Project URL: https://jhodhxvvhohygijqcxbo.supabase.co
Region: South America (São Paulo) - aws-1-sa-east-1
Database: postgres
Schema Principal: public

# Database Connection
Host (Pooler): aws-1-sa-east-1.pooler.supabase.com
Port (Pooler): 6543
Port (Direct): 5432
User: postgres.jhodhxvvhohygijqcxbo

# Schemas Utilizados
- public (Dados da aplicação MeguisPet)
- auth (Supabase Auth - usuários e autenticação)

# Tabelas Principais (Schema: public)
- clientes_fornecedores (Clientes e fornecedores)
- produtos (Produtos do estoque)
- vendas (Vendas realizadas)
- usuarios (Usuários do sistema)
- transacoes (Transações financeiras)
- movimentacoes_estoque (Movimentações de estoque)
- relatorios (Relatórios gerados)
- ... outras tabelas do ERP

# Tabelas do Auth Schema
- auth.users (Usuários Supabase)
- auth.identities (Identidades de autenticação)
- auth.sessions (Sessões ativas)
- auth.refresh_tokens (Tokens de refresh)
```

---

## 🚀 Como Usar Migrations

### Pré-requisitos

```powershell
# 1. Instalar Supabase CLI (via Scoop)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# 2. Verificar instalação
supabase --version

# 3. Fazer login
supabase login

# 4. Linkar ao projeto (fazer apenas 1 vez)
supabase link --project-ref jhodhxvvhohygijqcxbo
```

---

## 📝 Workflow Padrão

### 1️⃣ Criar Nova Migration

```powershell
# Sintaxe: supabase migration new <nome_descritivo>
supabase migration new add_coluna_cnpj_clientes
```

Isso cria um arquivo em: `supabase/migrations/TIMESTAMP_add_coluna_cnpj_clientes.sql`

### 2️⃣ Editar a Migration

Abra o arquivo gerado e adicione seu SQL:

```sql
-- supabase/migrations/20251108120000_add_coluna_cnpj_clientes.sql

-- Exemplo: Adicionar coluna CNPJ para clientes
ALTER TABLE public.clientes_fornecedores 
ADD COLUMN cnpj VARCHAR(18);

-- Criar índice para busca rápida
CREATE INDEX idx_clientes_cnpj ON public.clientes_fornecedores(cnpj) WHERE cnpj IS NOT NULL;

-- Adicionar comentário
COMMENT ON COLUMN public.clientes_fornecedores.cnpj IS 'CNPJ do cliente ou fornecedor';
```

### 3️⃣ Testar Localmente (Opcional)

```powershell
# Se tiver Supabase rodando localmente
supabase start
supabase db reset  # Aplica todas as migrations do zero
```

### 4️⃣ Aplicar em Produção

```powershell
# Aplicar todas as migrations pendentes
supabase db push

# Verificar status antes de aplicar
supabase db diff
```

### 5️⃣ Commitar no Git

```powershell
git add supabase/migrations/
git commit -m "feat: add verified column to users table"
git push origin main
```

---

## 🎯 Exemplos Práticos

### Exemplo 1: Adicionar Nova Coluna

```powershell
# 1. Criar migration
supabase migration new add_data_nascimento_usuarios

# 2. Editar arquivo gerado
```

```sql
-- Adicionar coluna data_nascimento
ALTER TABLE public.usuarios 
ADD COLUMN data_nascimento DATE;

-- Comentário
COMMENT ON COLUMN public.usuarios.data_nascimento IS 'Data de nascimento do usuário';
```

```powershell
# 3. Aplicar
supabase db push
```

### Exemplo 2: Criar Nova Tabela

```powershell
# 1. Criar migration
supabase migration new create_tabela_servicos

# 2. Editar arquivo
```

```sql
-- Criar tabela de serviços oferecidos
CREATE TABLE public.servicos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    preco NUMERIC(10,2) NOT NULL,
    descricao TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_servicos_nome ON public.servicos(nome);
CREATE INDEX idx_servicos_ativo ON public.servicos(ativo);

-- Comentário
COMMENT ON TABLE public.servicos IS 'Serviços oferecidos pelo petshop';
```

```powershell
# 3. Aplicar
supabase db push
```

### Exemplo 3: Modificar Coluna Existente

```powershell
# 1. Criar migration
supabase migration new alterar_tipo_preco_produtos

# 2. Editar arquivo
```

```sql
-- Alterar tipo da coluna preco para aceitar valores maiores
ALTER TABLE public.produtos 
ALTER COLUMN preco TYPE NUMERIC(12,2);

-- Comentário
COMMENT ON COLUMN public.produtos.preco IS 'Preço do produto (até 12 dígitos)';
```

```powershell
# 3. Aplicar
supabase db push
```

### Exemplo 4: Adicionar RLS Policy para Multi-Tenant

```powershell
# 1. Criar migration
supabase migration new add_rls_policy_usuarios

# 2. Editar arquivo
```

```sql
-- Política: Admins podem ver todos os usuários
CREATE POLICY "Admins podem ver todos os usuários"
ON public.usuarios FOR SELECT
USING (role = 'admin' OR id = auth.uid());

-- Política: Usuário pode ver apenas seu próprio perfil
CREATE POLICY "Usuário pode ver próprio perfil"
ON public.usuarios FOR SELECT
USING (id = auth.uid());
```

```powershell
# 3. Aplicar
supabase db push
```

---

## 🔄 Como Fazer Rollback (Reverter)

**IMPORTANTE:** Supabase Migrations não tem rollback automático!

### Opção 1: Criar Migration de Reversão

```powershell
# Se aplicou migration que adicionou coluna 'cnpj'
supabase migration new remove_cnpj_from_clientes
```

```sql
-- Reverter a mudança
ALTER TABLE public.clientes_fornecedores DROP COLUMN cnpj;
DROP INDEX IF EXISTS idx_clientes_cnpj;
```

```powershell
supabase db push
```

### Opção 2: Restaurar Backup Completo

```powershell

# 1. Executar script de backup completo (recomendado fazer antes de migrations arriscadas)
cd database
.\backup-complete.bat

# 2. Se precisar restaurar, use o psql com as credenciais do Supabase

# Consulte .env.local para obter a connection string
psql "postgresql://postgres:[PASSWORD]@[HOST]:6543/postgres" -f meguispet_full_TIMESTAMP.sql
```

---

## 📦 Comandos Úteis

```powershell
# Listar todas as migrations
supabase migration list

# Baixar schema atual do Supabase (gera migration)
supabase db pull

# Ver diff entre local e remoto
supabase db diff

# Resetar banco local (reaplica todas migrations)
supabase db reset

# Linkar a outro projeto
supabase link --project-ref OUTRO_PROJECT_REF

# Ver status da conexão
supabase status
```

---

## ✅ Checklist de Migration

Antes de aplicar uma migration em produção:

- [ ] Migration tem nome descritivo
- [ ] SQL está correto e testado
- [ ] Índices criados para colunas pesquisadas
- [ ] RLS policies ajustadas (se necessário)
- [ ] Triggers de `updated_at` adicionados (se nova tabela)
- [ ] Comentários explicativos no código SQL
- [ ] Backup recente do banco existe
- [ ] Migration commitada no Git
- [ ] Testada localmente (se possível)

---

## ⚠️ O Que NÃO Fazer

### ❌ Nunca Faça Isso:

1. **Executar SQL direto no Dashboard para mudanças estruturais**
   ```sql
   -- ❌ NÃO fazer direto no SQL Editor do Supabase
   ALTER TABLE public.messages ADD COLUMN media_url TEXT;
   ```

2. **Editar migrations já aplicadas**
   ```powershell
   # ❌ NÃO editar arquivo que já foi aplicado
   # Se errou, crie uma NOVA migration para corrigir
   ```

3. **Deletar arquivos de migration**
   ```powershell
   # ❌ NÃO deletar migrations antigas
   # Elas são o histórico do banco
   ```

4. **Usar migrations para inserir dados de produção**
   ```sql
   -- ❌ NÃO usar migration para dados de clientes reais
   INSERT INTO public.clients (name, verify_token) VALUES ('Cliente Teste', 'abc123');
   
   -- ✅ Use seed separado para dados de desenvolvimento/teste
   -- migrations/seed_data.sql (não aplicar em produção)
   ```

5. **Modificar tabelas legadas do n8n sem coordenação**
   ```sql
   -- ❌ NÃO modificar essas tabelas sem cuidado (n8n depende delas)
   -- - clientes_whatsapp
   -- - n8n_chat_histories
   -- - documents
   ```

---

## 🎯 Quando Usar Cada Ferramenta

| Situação | Ferramenta | Comando |
|----------|-----------|---------|
| Mudar estrutura do banco | **Migration** | `supabase migration new` |
| Backup completo (public + auth) | **pg_dump** | `database\backup-complete.bat` |
| Backup apenas aplicação | **pg_dump** | `database\backup-postgres.bat` |
| Backup apenas auth | **pg_dump** | `database\backup-auth.bat` |
| Testar SQL rápido | **SQL Editor** | Dashboard Supabase |
| Dados de seed/demo | **Seed File** | `migrations/seed_data.sql` |
| Ver schema atual | **Pull** | `supabase db pull` |
| Migrar para outro banco | **Backup + Restore** | `pg_dump` + `psql` |

---

## 📚 Recursos Adicionais

- [Documentação Supabase Migrations](https://supabase.com/docs/guides/cli/managing-environments#database-migrations)
- [Documentação Supabase CLI](https://supabase.com/docs/reference/cli/introduction)
- [PostgreSQL ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html)
- [PostgreSQL RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)

---

## 🔑 Resumo

```
┌────────────────────────────────────────────────┐
│   MUDANÇA NO BANCO DE DADOS?                   │
│   ↓                                            │
│   1. supabase migration new <nome>             │
│   2. Editar arquivo .sql gerado                │
│   3. supabase db push                          │
│   4. git commit + push                         │
└────────────────────────────────────────────────┘
```

**Nunca pule esse workflow!** Suas futuras entregas e colaboradores agradecem. 🙏
