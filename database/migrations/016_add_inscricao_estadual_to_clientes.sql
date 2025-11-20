-- =====================================================
-- Migration 016: Add inscricao_estadual to clientes_fornecedores
-- Description: Add state registration field to customer/supplier table
-- Date: 2025-11-20
-- =====================================================

-- Add inscricao_estadual column to clientes_fornecedores table
ALTER TABLE clientes_fornecedores 
ADD COLUMN IF NOT EXISTS inscricao_estadual VARCHAR(50);

-- Add comment to explain the field
COMMENT ON COLUMN clientes_fornecedores.inscricao_estadual IS 'Inscrição Estadual (State Registration) - can be used by both clients and suppliers';

-- Create index for faster lookups if needed
CREATE INDEX IF NOT EXISTS idx_clientes_fornecedores_inscricao_estadual 
ON clientes_fornecedores(inscricao_estadual) 
WHERE inscricao_estadual IS NOT NULL;

-- Verify the column was added
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'clientes_fornecedores' 
        AND column_name = 'inscricao_estadual'
    ) THEN
        RAISE NOTICE '✓ Column inscricao_estadual successfully added to clientes_fornecedores';
    ELSE
        RAISE EXCEPTION '✗ Failed to add column inscricao_estadual to clientes_fornecedores';
    END IF;
END $$;
