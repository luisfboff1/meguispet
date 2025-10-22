-- Migration: add produtos.estoque column and populate from produtos_estoques
-- Safe steps: create backup table, add column if missing, populate totals
-- Run on a maintenance window in production. Test on staging first.

-- 1) Quick snapshot backup (table copy)
CREATE TABLE IF NOT EXISTS produtos_backup_2025_10_21 AS SELECT * FROM produtos;

-- 2) Add coluna estoque (idempotente on MariaDB 10.3+)
ALTER TABLE produtos
  ADD COLUMN IF NOT EXISTS estoque INT NOT NULL DEFAULT 0;

-- 3) Populate from pivot produtos_estoques
UPDATE produtos p
LEFT JOIN (
  SELECT produto_id, COALESCE(SUM(quantidade),0) AS soma_qt
  FROM produtos_estoques
  GROUP BY produto_id
) pe ON pe.produto_id = p.id
SET p.estoque = COALESCE(pe.soma_qt, 0);

-- 4) Optional: verify
-- SELECT p.id, p.nome, p.estoque, COALESCE(pe.soma_qt,0) AS esperado
-- FROM produtos p
-- LEFT JOIN (
--   SELECT produto_id, SUM(quantidade) AS soma_qt FROM produtos_estoques GROUP BY produto_id
-- ) pe ON pe.produto_id = p.id
-- WHERE p.estoque != COALESCE(pe.soma_qt,0)

-- Rollback (manual):
-- If you need to rollback, you can restore from the backup table (careful, this will overwrite current data):
-- RENAME TABLE produtos TO produtos_before_restore_2025_10_21;
-- RENAME TABLE produtos_backup_2025_10_21 TO produtos;
