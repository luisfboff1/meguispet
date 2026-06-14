// Aplica migrations pendentes de database/migrations/ ao Supabase (Postgres).
//
// Le database/migrations/_journal.json (a ordem/historico), calcula o sha256 de
// cada .sql, compara com a tabela public.schema_migrations e roda so o que ainda
// nao foi aplicado. Cada migration roda dentro de uma transacao; se falhar, faz
// rollback e aborta sem registrar.
//
// Uso (sempre via Doppler para popular SUPABASE_DB_URL):
//   doppler run -- node database/migrate.mjs            # aplica pendentes
//   doppler run -- node database/migrate.mjs --baseline # marca tudo do journal
//                                                        # como aplicado SEM rodar
//                                                        # (adotar o sistema num
//                                                        #  banco que ja existe)
// Ou pelos scripts npm: pnpm db:migrate / pnpm db:baseline
//
// Para uma migration que NAO pode rodar em transacao (ex: CREATE INDEX
// CONCURRENTLY), comece o arquivo .sql com a linha:
//   -- migrate:no-transaction

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, "migrations");
const JOURNAL_PATH = path.join(MIGRATIONS_DIR, "_journal.json");

const isBaseline = process.argv.includes("--baseline");

const url = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
if (!url) {
  console.error(
    "FALTA SUPABASE_DB_URL — rode via 'doppler run -- node database/migrate.mjs'",
  );
  process.exit(1);
}

if (!fs.existsSync(JOURNAL_PATH)) {
  console.error(`Journal nao encontrado: ${JOURNAL_PATH}`);
  console.error("Gere com: pnpm db:journal");
  process.exit(1);
}

function sha256(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

const journal = JSON.parse(fs.readFileSync(JOURNAL_PATH, "utf8"));
const expected = journal.entries.map((e) => {
  const filePath = path.join(MIGRATIONS_DIR, `${e.tag}.sql`);
  if (!fs.existsSync(filePath)) {
    console.error(`Arquivo do journal nao existe: ${e.tag}.sql`);
    process.exit(1);
  }
  const content = fs.readFileSync(filePath, "utf8");
  return { idx: e.idx, tag: e.tag, content, hash: sha256(content) };
});

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

async function ensureMigrationsTable() {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      id          serial PRIMARY KEY,
      tag         text NOT NULL UNIQUE,
      hash        text NOT NULL,
      applied_at  timestamptz NOT NULL DEFAULT now()
    )
  `);
}

async function getApplied() {
  const { rows } = await client.query(
    "SELECT tag, hash FROM public.schema_migrations ORDER BY id",
  );
  return rows;
}

async function record(tag, hash) {
  await client.query(
    `INSERT INTO public.schema_migrations (tag, hash) VALUES ($1, $2)
     ON CONFLICT (tag) DO UPDATE SET hash = EXCLUDED.hash, applied_at = now()`,
    [tag, hash],
  );
}

async function main() {
  await client.connect();
  await ensureMigrationsTable();

  const applied = await getApplied();
  const appliedByTag = new Map(applied.map((r) => [r.tag, r]));

  console.log(`Journal: ${expected.length} entrada(s).`);
  console.log(`Ja aplicadas: ${applied.length}`);

  // Avisa sobre hash divergente (arquivo editado depois de aplicado).
  for (const m of expected) {
    const row = appliedByTag.get(m.tag);
    if (row && row.hash !== m.hash) {
      console.warn(
        `  ⚠ ${m.tag}: hash diverge do registrado (arquivo editado apos aplicado).`,
      );
    }
  }

  const pending = expected.filter((m) => !appliedByTag.has(m.tag));

  if (isBaseline) {
    if (pending.length === 0) {
      console.log("Baseline: nada a marcar, journal ja sincronizado.");
      return;
    }
    console.log(`Baseline: marcando ${pending.length} migration(s) como aplicada(s) SEM executar:`);
    for (const m of pending) {
      await record(m.tag, m.hash);
      console.log(`  ✓ baseline ${m.tag}`);
    }
    console.log("OK. Banco adotado pelo sistema de migrations.");
    return;
  }

  if (pending.length === 0) {
    console.log("Nada pendente. Banco sincronizado.");
    return;
  }

  console.log(`Pendentes (${pending.length}):`);
  for (const m of pending) console.log(`  • ${m.tag}`);
  console.log("");

  for (const m of pending) {
    const noTx = /^\s*--\s*migrate:no-transaction/m.test(m.content);
    process.stdout.write(`Aplicando ${m.tag}${noTx ? " (sem transacao)" : ""}... `);
    try {
      if (noTx) {
        await client.query(m.content);
        await record(m.tag, m.hash);
      } else {
        await client.query("BEGIN");
        await client.query(m.content);
        await record(m.tag, m.hash);
        await client.query("COMMIT");
      }
      console.log("OK");
    } catch (err) {
      if (!noTx) {
        try {
          await client.query("ROLLBACK");
        } catch {
          // ignore
        }
      }
      console.log("FALHOU");
      console.error(`\nErro em ${m.tag}:\n${err.message}`);
      process.exitCode = 1;
      return;
    }
  }

  const after = await getApplied();
  console.log(`\nDepois: ${after.length} migration(s) em public.schema_migrations.`);
  console.log("OK.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end().catch(() => {});
  });
