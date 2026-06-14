// Gera/atualiza database/migrations/_journal.json a partir dos arquivos .sql.
//
// Preserva a ordem ja registrada e apenas ANEXA arquivos novos no fim (ordem
// natural por nome). Nao reordena nem remove entradas existentes — o journal e
// o historico imutavel da sequencia de migrations.
//
// Uso: pnpm db:journal
// Rode sempre depois de criar um novo arquivo .sql, antes de pnpm db:migrate.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, "migrations");
const JOURNAL_PATH = path.join(MIGRATIONS_DIR, "_journal.json");

const sqlFiles = fs
  .readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort((a, b) => a.localeCompare(b, "en", { numeric: true }));

let journal = { version: "1", dialect: "postgresql", driver: "supabase-pg", entries: [] };
if (fs.existsSync(JOURNAL_PATH)) {
  journal = JSON.parse(fs.readFileSync(JOURNAL_PATH, "utf8"));
}

const knownTags = new Set(journal.entries.map((e) => e.tag));
let nextIdx = journal.entries.reduce((max, e) => Math.max(max, e.idx + 1), 0);

let added = 0;
for (const file of sqlFiles) {
  const tag = file.replace(/\.sql$/, "");
  if (knownTags.has(tag)) continue;
  const stat = fs.statSync(path.join(MIGRATIONS_DIR, file));
  journal.entries.push({ idx: nextIdx++, tag, when: stat.mtimeMs });
  knownTags.add(tag);
  added++;
}

fs.writeFileSync(JOURNAL_PATH, JSON.stringify(journal, null, 2) + "\n", "utf8");
console.log(
  `Journal atualizado: ${journal.entries.length} entrada(s)` +
    (added ? ` (+${added} nova(s)).` : " (nenhuma nova)."),
);
