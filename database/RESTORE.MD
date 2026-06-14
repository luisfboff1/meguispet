# 🔄 Guia de Restore do Banco de Dados - MeguisPet

Este guia explica como restaurar backups do banco de dados PostgreSQL (Supabase) do sistema MeguisPet.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Pré-requisitos](#pré-requisitos)
- [Tipos de Restore](#tipos-de-restore)
- [Restore Automatizado](#restore-automatizado)
- [Restore Manual](#restore-manual)
- [Cenários Comuns](#cenários-comuns)
- [Troubleshooting](#troubleshooting)
- [Segurança](#segurança)

---

## 🎯 Visão Geral

O sistema de backup do MeguisPet gera 6 arquivos por execução:

### Schema `public` (Dados do ERP)
- **`meguispet_full_*.sql`** - Backup completo (estrutura + dados)
- **`meguispet_structure_*.sql`** - Apenas estrutura (tabelas, índices, constraints)
- **`meguispet_data_*.sql`** - Apenas dados (INSERT statements)

### Schema `auth` (Autenticação Supabase)
- **`auth_full_*.sql`** - Backup completo do schema auth
- **`auth_structure_*.sql`** - Apenas estrutura do schema auth
- **`auth_data_*.sql`** - Apenas dados do schema auth (usuários, senhas, sessões)

---

## ✅ Pré-requisitos

### 1. PostgreSQL Client Tools
- **Versão recomendada**: PostgreSQL 18 (compatível com Supabase 17.6)
- **Caminho no Windows**: `C:\Program Files\PostgreSQL\18\bin`
- **Ferramentas necessárias**: `psql`, `pg_restore`, `pg_dump`

### 2. Credenciais do Supabase
```bash
DB_HOST=aws-1-sa-east-1.pooler.supabase.com
DB_PORT=6543
DB_NAME=postgres
DB_USER=postgres.jsitmcqabchjidoezycj
PGPASSWORD=<DEFINA_VIA_AMBIENTE>
```

### 3. Backup Válido
- Localize o diretório de backup (ex: `backup\2025_01_29_143022\`)
- Verifique se os arquivos `.sql` existem e não estão corrompidos
- Confirme o timestamp do backup que deseja restaurar

---

## 🔀 Tipos de Restore

### 1. **Restore Completo (Full)**
Restaura estrutura + dados em um banco limpo.

**Quando usar:**
- Restauração completa após desastre
- Migração para novo ambiente
- Criação de ambiente de desenvolvimento

**Arquivos usados:**
- `meguispet_full_*.sql`
- `auth_full_*.sql`

---

### 2. **Restore Apenas Estrutura (Structure)**
Recria tabelas, índices, constraints, sem dados.

**Quando usar:**
- Criar ambiente de testes vazio
- Sincronizar estrutura entre ambientes
- Corrigir estrutura corrompida mantendo dados

**Arquivos usados:**
- `meguispet_structure_*.sql`
- `auth_structure_*.sql`

---

### 3. **Restore Apenas Dados (Data)**
Insere dados em estrutura existente.

**Quando usar:**
- Restaurar dados deletados acidentalmente
- Popular ambiente de desenvolvimento
- Sincronizar dados entre ambientes

**⚠️ ATENÇÃO:** Requer estrutura idêntica já existente!

**Arquivos usados:**
- `meguispet_data_*.sql`
- `auth_data_*.sql`

---

## 🤖 Restore Automatizado

### Opção 1: Script `restore.bat` (Recomendado)

```batch
cd database
.\restore.bat
```

O script irá:
1. Listar todos os backups disponíveis
2. Solicitar qual backup restaurar (timestamp)
3. Perguntar qual tipo de restore (completo/estrutura/dados)
4. Confirmar antes de executar
5. Executar o restore com validações

### Opção 2: Restore Completo Rápido

```batch
cd database
.\restore.bat 2025_01_29_143022 full
```

Parâmetros:
- `2025_01_29_143022` - Timestamp do backup
- `full` - Tipo de restore (full | structure | data)

---

## 🛠️ Restore Manual

### Passo 1: Preparar o Ambiente

```batch
@REM Adicionar PostgreSQL ao PATH
set PATH=C:\Program Files\PostgreSQL\18\bin;%PATH%

@REM Configurar credenciais
set DB_HOST=aws-1-sa-east-1.pooler.supabase.com
set DB_PORT=6543
set DB_NAME=postgres
set DB_USER=postgres.jsitmcqabchjidoezycj
set PGPASSWORD=<DEFINA_VIA_AMBIENTE>

@REM Definir timestamp do backup
set TIMESTAMP=2025_01_29_143022
set BACKUP_DIR=backup\%TIMESTAMP%
```

---

### Passo 2: Escolher o Tipo de Restore

#### A) Restore Completo (Full)

**⚠️ CUIDADO: Isso irá DROPAR e RECRIAR schemas existentes!**

```batch
@REM Restore schema public
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f "%BACKUP_DIR%\meguispet_full_%TIMESTAMP%.sql"

@REM Restore schema auth
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f "%BACKUP_DIR%\auth_full_%TIMESTAMP%.sql"
```

---

#### B) Restore Apenas Estrutura

**⚠️ Útil para criar ambiente vazio ou recriar estrutura**

```batch
@REM Restore estrutura do schema public
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f "%BACKUP_DIR%\meguispet_structure_%TIMESTAMP%.sql"

@REM Restore estrutura do schema auth
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f "%BACKUP_DIR%\auth_structure_%TIMESTAMP%.sql"
```

---

#### C) Restore Apenas Dados

**⚠️ REQUISITO: Estrutura idêntica já deve existir!**

```batch
@REM Restore dados do schema public
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f "%BACKUP_DIR%\meguispet_data_%TIMESTAMP%.sql"

@REM Restore dados do schema auth
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f "%BACKUP_DIR%\auth_data_%TIMESTAMP%.sql"
```

---

## 🎬 Cenários Comuns

### Cenário 1: Restauração Completa de Desastre

**Situação:** Banco de dados corrompido ou perdido completamente.

**Solução:**
```batch
cd database
.\restore.bat

@REM Siga as instruções:
@REM 1. Escolha o backup mais recente
@REM 2. Selecione "full" (restauração completa)
@REM 3. Confirme a operação
```

**Tempo estimado:** 5-15 minutos (depende do tamanho do banco)

---

### Cenário 2: Recuperar Dados Deletados Acidentalmente

**Situação:** Dados foram deletados por engano, mas estrutura está intacta.

**Opção A - Restore seletivo (Recomendado):**
```sql
-- Conectar ao banco
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME%

-- Restaurar apenas a tabela afetada do backup
\i backup\2025_01_29_143022\meguispet_data_2025_01_29_143022.sql

-- ⚠️ Isso pode causar conflitos de chaves primárias!
-- Considere fazer backup antes de tentar
```

**Opção B - Restore em banco temporário:**
1. Crie um banco temporário
2. Restaure o backup completo lá
3. Copie apenas os dados necessários
4. Delete o banco temporário

---

### Cenário 3: Sincronizar Ambiente de Desenvolvimento

**Situação:** Precisa de uma cópia dos dados de produção para desenvolvimento.

**Solução:**
```batch
@REM 1. Faça backup de produção
cd database
.\backup-complete.bat

@REM 2. Configure credenciais de DEV
set DB_HOST=seu-projeto-dev.supabase.co
set DB_USER=postgres.dev_user
set PGPASSWORD=dev_password

@REM 3. Restaure o backup
.\restore.bat 2025_01_29_143022 full
```

**⚠️ IMPORTANTE:**
- Sanitize dados sensíveis antes de usar em DEV
- Não exponha senhas reais de usuários
- Considere mascarar CPF/CNPJ, emails, telefones

---

### Cenário 4: Rollback de Migration Falha

**Situação:** Uma migration corrompeu o schema.

**Solução:**
```batch
@REM 1. Restaure apenas a estrutura do backup anterior
.\restore.bat 2025_01_29_120000 structure

@REM 2. Verifique se a estrutura foi restaurada
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "\dt public.*"

@REM 3. Se necessário, restaure também os dados
.\restore.bat 2025_01_29_120000 data
```

---

## 🔧 Troubleshooting

### Erro: "psql: command not found"

**Causa:** PostgreSQL não está no PATH.

**Solução:**
```batch
set PATH=C:\Program Files\PostgreSQL\18\bin;%PATH%
```

Ou adicione permanentemente nas Variáveis de Ambiente do Windows.

---

### Erro: "FATAL: password authentication failed"

**Causa:** Senha incorreta ou expirada.

**Solução:**
1. Verifique a senha no Supabase Dashboard
2. Atualize a variável `PGPASSWORD` no script
3. Se estiver usando `.pgpass`, verifique o formato

---

### Erro: "relation already exists"

**Causa:** Tentando restaurar estrutura em banco que já possui as tabelas.

**Solução:**

**Opção A - Limpar antes (CUIDADO!):**
```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

**Opção B - Restaurar apenas dados:**
```batch
.\restore.bat 2025_01_29_143022 data
```

---

### Erro: "permission denied for schema auth"

**Causa:** Schema `auth` é gerenciado pelo Supabase e requer permissões especiais.

**Solução:**
1. Use a **Service Role Key** (não a anon key)
2. Conecte com o usuário `postgres` (não usuários comuns)
3. Se necessário, peça suporte ao Supabase para restore do schema auth

**⚠️ ATENÇÃO:** Restaurar schema `auth` pode quebrar integrações do Supabase!

---

### Erro: "invalid byte sequence for encoding UTF8"

**Causa:** Problemas de encoding entre sistemas.

**Solução:**
```batch
@REM Force UTF-8 encoding
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% --set=CLIENT_ENCODING=UTF8 -f backup.sql
```

---

## 🔒 Segurança

### ⚠️ AVISOS IMPORTANTES

1. **Senha no Script:**
   - O arquivo `restore.bat` contém a senha do banco em texto plano
   - **NUNCA** commite este arquivo no Git
   - Mantenha em local seguro
   - Considere usar `.pgpass` ou variáveis de ambiente

2. **Dados Sensíveis:**
   - `auth_data_*.sql` contém senhas hasheadas de usuários
   - `meguispet_data_*.sql` pode conter CPF, CNPJ, emails, telefones
   - Armazene backups em local criptografado
   - Limite acesso apenas a pessoal autorizado

3. **Schema Auth:**
   - Restaurar `schema auth` pode invalidar todas as sessões ativas
   - Usuários podem precisar fazer logout/login novamente
   - Tokens de autenticação podem ser invalidados

4. **Produção vs Desenvolvimento:**
   - Nunca restaure dados de produção diretamente em produção sem testar antes
   - Sempre teste restores em ambiente de staging primeiro
   - Mantenha backups separados por ambiente

---

## 📝 Boas Práticas

### 1. Antes de Restaurar
- [ ] Faça um backup do estado atual antes de restaurar
- [ ] Verifique se o backup a ser restaurado não está corrompido
- [ ] Confirme que está restaurando no ambiente correto
- [ ] Notifique a equipe (se for produção)

### 2. Durante o Restore
- [ ] Monitore logs de erro
- [ ] Verifique o progresso
- [ ] Tenha um plano de rollback

### 3. Após o Restore
- [ ] Verifique contagem de registros nas tabelas principais
- [ ] Teste login de usuários
- [ ] Verifique integridade referencial
- [ ] Execute queries de validação
- [ ] Monitore logs da aplicação

---

## 📞 Suporte

- **Supabase Dashboard:** https://supabase.com/dashboard
- **Documentação PostgreSQL:** https://www.postgresql.org/docs/
- **Supabase Docs - Backups:** https://supabase.com/docs/guides/platform/backups

---

## 📜 Histórico de Alterações

| Data | Versão | Descrição |
|------|--------|-----------|
| 2025-01-29 | 1.0.0 | Criação do guia de restore completo |

---

**✅ Lembre-se:** Um restore bem-sucedido começa com um backup confiável. Sempre teste seus backups periodicamente!
