# Agent Instructions — MeguisPet

Guia para agentes (Claude Code / SDK) que trabalham neste repo.

> ⚠️ **Este repositório é PÚBLICO.** Nunca escreva segredos (senhas, connection
> strings, service role keys, tokens) em nenhum arquivo. Credenciais ficam só no
> Doppler. Se encontrar um segredo commitado, remova do working tree e avise para
> **rotacionar** a credencial (o histórico do git continua expondo-a).

## Servidor de dev

Não inicie o servidor de dev (`pnpm dev`, `next dev`). O usuário roda manualmente.
Para validar, use `pnpm build` (ou `pnpm lint`) salvo se o usuário pedir outra coisa.

## Banco de dados / Migrations

Projeto usa **Supabase** (Postgres) com um fluxo de migrations journaled, próprio
(driver `pg`, sem Drizzle). Detalhes em [`database/README.md`](database/README.md).

Fluxo ao alterar o schema:

1. Crie `database/migrations/NNN_descricao.sql` (numere depois do último arquivo).
2. `pnpm db:journal` — registra o arquivo em `database/migrations/_journal.json`.
3. `pnpm db:status` — veja o que está pendente.
4. Antes de mudança grande/destrutiva: `pnpm db:backup -- <label>`.
5. `pnpm db:migrate` — aplica as pendentes (transação por arquivo).
6. `pnpm db:status` — confirme `Pendentes: 0`.

Regras:

- Adoção inicial num banco já existente: `pnpm db:baseline` (marca o journal como
  aplicado **sem** reexecutar).
- Nunca edite uma migration já aplicada — crie uma nova para corrigir.
- Nunca delete arquivos de migration nem reordene o `_journal.json`: são histórico.
- Migration que não roda em transação: primeira linha `-- migrate:no-transaction`.
- Conexão sempre via Doppler (`SUPABASE_DB_URL`); nunca hardcode credenciais.

## Documentação

Docs ficam em `docs/` (índice em [`docs/README.md`](docs/README.md)). Não deixe
`.md` soltos no root além de `README.md`, `CLAUDE.md` e `AGENTS.md`.
