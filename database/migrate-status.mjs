// Mostra o estado das migrations: o que esta no journal local, o que esta
// aplicado no Supabase, e qualquer pendencia ou desalinhamento (hash divergente,
// linha orfa).
//
// Uso:
//   doppler run -- node database/migrate-status.mjs
// Ou: pnpm db:status

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, "migrations");
const JOURNAL_PATH = path.join(MIGRATIONS_DIR, "_journal.json");

const url = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
if (!url) {
  console.error(
    "FALTA SUPABASE_DB_URL — rode via 'doppler run -- node database/migrate-status.mjs'",
  );
  process.exit(1);
}

function sha256(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

const journal = JSON.parse(fs.readFileSync(JOURNAL_PATH, "utf8"));
const expected = journal.entries.map((e) => {
  const content = fs.readFileSync(path.join(MIGRATIONS_DIR, `${e.tag}.sql`), "utf8");
  return { idx: e.idx, tag: e.tag, hash: sha256(content) };
});

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  await client.connect();

  let applied = [];
  try {
    const { rows } = await client.query(
      "SELECT id, tag, hash, applied_at FROM public.schema_migrations ORDER BY id",
    );
    applied = rows;
  } catch {
    console.error(
      "Tabela public.schema_migrations ainda nao existe — rode 'pnpm db:baseline' (banco existente) ou 'pnpm db:migrate'.",
    );
    process.exit(1);
  }

  const appliedByTag = new Map(applied.map((r) => [r.tag, r]));

  console.log("─── Migrations no journal local ─────────────────────────────");
  for (const m of expected) {
    const row = appliedByTag.get(m.tag);
    let status = "✗ PENDENTE";
    if (row) status = row.hash === m.hash ? "✓ aplicada" : "⚠ HASH DIVERGE";
    console.log(`  ${status.padEnd(16)} ${m.tag}`);
  }

  console.log("\n─── Linhas em public.schema_migrations ──────────────────────");
  const expectedTags = new Set(expected.map((m) => m.tag));
  for (const r of applied) {
    const orphan = expectedTags.has(r.tag) ? "" : "  ⚠ ORFA (sem .sql no journal)";
    console.log(`  id=${r.id}  ${r.tag}${orphan}`);
  }

  const pending = expected.filter((m) => !appliedByTag.has(m.tag));
  console.log("\n─── Resumo ──────────────────────────────────────────────────");
  console.log(`  Journal:   ${expected.length}`);
  console.log(`  Aplicadas: ${applied.length}`);
  console.log(`  Pendentes: ${pending.length}`);
  if (pending.length > 0) {
    console.log("\n  Para aplicar: pnpm db:migrate");
    process.exitCode = 2;
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end().catch(() => {});
  });
