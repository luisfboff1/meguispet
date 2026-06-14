# Banco de dados — Migrations & Backup (MeguisPet / Supabase)

Sistema de migrations com **histórico** (tabela `public.schema_migrations`),
**journal em JSON** (`migrations/_journal.json`) e **backup** local via `pg_dump`.
Mesma lógica do projeto `financeiro`, adaptada ao Supabase (driver `pg`, sem
Drizzle).

Conexão: lê `SUPABASE_DB_URL` do ambiente — sempre rode via **Doppler**
(`pnpm db:*`). Nenhum script contém senha; nunca hardcode credenciais aqui.

## Como funciona

- `migrations/*.sql` — uma migration por arquivo, ordenadas por nome (`031_...`).
- `migrations/_journal.json` — a sequência/histórico (idx, tag, when). É o que o
  runner lê para saber a ordem. **Imutável**: só anexa, nunca reordena.
- `public.schema_migrations` — registra o que já foi aplicado (tag + hash sha256
  + applied_at). O runner roda só o que não está aqui.

## Adotar o sistema (uma vez, banco já existente)

O banco de produção já tem as 58 migrations históricas aplicadas à mão. Marque-as
como aplicadas **sem reexecutar**:

```powershell
pnpm db:baseline
pnpm db:status   # deve mostrar Pendentes: 0
```

## Criar uma nova migration

```powershell
# 1. Crie o arquivo (numere depois do último, ex: 031_)
#    database/migrations/031_descricao_curta.sql
# 2. Atualize o journal
pnpm db:journal
# 3. (Antes de mudança grande/destrutiva) faça backup
pnpm db:backup -- 2026_06_14_antes_031
# 4. Confira o que está pendente
pnpm db:status
# 5. Aplique
pnpm db:migrate
# 6. Confirme
pnpm db:status   # Pendentes: 0
```

Migration que **não** pode rodar em transação (ex: `CREATE INDEX CONCURRENTLY`):
comece o arquivo com `-- migrate:no-transaction` na primeira linha.

## Scripts

| Script | Faz |
|---|---|
| `pnpm db:journal` | Regenera/atualiza `migrations/_journal.json` a partir dos `.sql`. |
| `pnpm db:status` | Mostra journal x aplicadas, pendências e hashes divergentes. |
| `pnpm db:migrate` | Aplica migrations pendentes (transação por arquivo). |
| `pnpm db:baseline` | Marca o journal como aplicado **sem executar** (adoção inicial). |
| `pnpm db:backup` | `pg_dump` do Supabase via Doppler → `database/backups/<label>/`. |
| `pnpm db:backup:local` | Backup usando env já carregada no terminal (sem Doppler). |

## Backup — o que é gerado

`database/backups/<label>/` (ignorado pelo git) contém:

- `meguispet_full_<label>.sql` — estrutura + dados
- `meguispet_structure_<label>.sql` — só DDL
- `meguispet_data_<label>.sql` — só dados
- `backup.log`, `backup.meta`, `SHA256SUMS.txt`

Para incluir o schema `auth` (usuários/senhas hasheadas):
`BACKUP_SCHEMAS=public,auth pnpm db:backup`. Esses dumps são sensíveis — mantenha
fora do git e protegidos.

## Regras

- Nunca edite uma migration já aplicada — crie uma nova para corrigir.
- Nunca delete arquivos de migration: são o histórico do banco.
- Não use migration para inserir dados reais de produção.
- Nenhum segredo neste diretório. Credenciais sempre via Doppler/env.
