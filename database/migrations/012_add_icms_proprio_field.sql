-- =====================================================
-- ADICIONAR CAMPO ICMS PRÓPRIO
-- Migration 010
-- Adiciona campo icms_proprio na tabela produtos
-- =====================================================

-- ICMS Próprio: Alíquota de ICMS que a empresa deve recolher
-- Usado no cálculo de ST: ST = (Base ST × Alíquota ST) - (Valor Líquido × ICMS Próprio)
ALTER TABLE produtos
ADD COLUMN IF NOT EXISTS icms_proprio DECIMAL(5,2) DEFAULT 4.00 CHECK (icms_proprio >= 0 AND icms_proprio <= 100);

-- Comentário descritivo
COMMENT ON COLUMN produtos.icms_proprio IS 'Alíquota de ICMS Próprio em % (0-100). Usado no cálculo de ST. Padrão: 4%';

-- Atualizar produtos existentes para ter 4% como padrão
UPDATE produtos
SET icms_proprio = 4.00
WHERE icms_proprio IS NULL;
