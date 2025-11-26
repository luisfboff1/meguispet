-- =====================================================
-- Migration 017: Add UNIQUE constraint to documento field
-- Description: Prevent duplicate CPF/CNPJ in clientes_fornecedores
-- Date: 2025-11-26
-- =====================================================

-- Step 1: Remove duplicate documents (keep only the most recent one)
-- This will delete older duplicate records
DO $$
DECLARE
  deleted_count INT;
BEGIN
  WITH duplicates AS (
    SELECT
      id,
      documento,
      ROW_NUMBER() OVER (PARTITION BY documento ORDER BY created_at DESC) AS rn
    FROM clientes_fornecedores
    WHERE documento IS NOT NULL AND documento != ''
  )
  DELETE FROM clientes_fornecedores
  WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
  );

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '% duplicate records removed', deleted_count;
END $$;

-- Step 2: Add UNIQUE constraint on documento field (when not null/empty)
-- This creates a partial unique index that only applies to non-null, non-empty values
CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_fornecedores_documento_unique
ON clientes_fornecedores(documento)
WHERE documento IS NOT NULL AND documento != '';

-- Drop the old non-unique index if it exists
DROP INDEX IF EXISTS idx_clientes_fornecedores_documento;

-- Add comment
COMMENT ON INDEX idx_clientes_fornecedores_documento_unique IS 'Ensures CPF/CNPJ uniqueness (excluding null and empty values)';

-- Verify the constraint was added
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE indexname = 'idx_clientes_fornecedores_documento_unique'
    ) THEN
        RAISE NOTICE '✓ UNIQUE constraint on documento successfully added';
    ELSE
        RAISE EXCEPTION '✗ Failed to add UNIQUE constraint on documento';
    END IF;
END $$;
