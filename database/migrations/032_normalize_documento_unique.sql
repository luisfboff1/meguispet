-- =====================================================
-- MIGRATION 032: Normalize documento + scope uniqueness to active rows
-- =====================================================
-- Purpose: The CPF/CNPJ unique index (migration 017) compares the raw
-- documento string, so "31239918000111" and "31.239.918/0001-11" (same
-- CNPJ, different formatting) are treated as distinct values and both pass
-- the constraint, producing duplicate clients. lib/validations/cliente.schema.ts
-- now strips formatting before saving new/edited clients (digits-only), but
-- existing rows still hold whatever formatting was typed at the time.
--
-- This migration:
--  1. Drops the existing unique index (it would block the normalization
--     UPDATE below the moment two differently-formatted rows collide).
--  2. Deactivates older duplicates among ACTIVE rows once normalized,
--     keeping the most recently updated row of each group active (mirrors
--     what was done manually for a pair of duplicate clients found in prod).
--  3. Normalizes documento (digits only) for every row.
--  4. Recreates the unique index, now scoped to ativo = true, so a
--     soft-deleted client never blocks reuse of its CPF/CNPJ by a new one.

DROP INDEX IF EXISTS idx_clientes_fornecedores_documento_unique;

-- Deactivate older duplicates (by normalized documento) among active rows,
-- keeping the most recently updated one of each group.
WITH normalized AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY regexp_replace(documento, '\D', '', 'g')
      ORDER BY updated_at DESC, created_at DESC, id DESC
    ) AS rn
  FROM clientes_fornecedores
  WHERE ativo = true
    AND documento IS NOT NULL
    AND regexp_replace(documento, '\D', '', 'g') != ''
)
UPDATE clientes_fornecedores c
SET ativo = false, updated_at = now()
FROM normalized n
WHERE c.id = n.id AND n.rn > 1;

-- Normalize documento to digits-only for every row (active or not).
UPDATE clientes_fornecedores
SET documento = regexp_replace(documento, '\D', '', 'g')
WHERE documento IS NOT NULL AND documento != '';

-- Empty-string documentos become NULL for consistency post-normalization.
UPDATE clientes_fornecedores
SET documento = NULL
WHERE documento = '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_fornecedores_documento_unique
ON clientes_fornecedores(documento)
WHERE documento IS NOT NULL AND documento != '' AND ativo = true;

COMMENT ON INDEX idx_clientes_fornecedores_documento_unique IS 'Ensures CPF/CNPJ uniqueness among active clients (documento normalized to digits-only) - Migration 032';
