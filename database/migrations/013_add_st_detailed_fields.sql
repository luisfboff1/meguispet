-- =====================================================
-- ADICIONAR CAMPOS DETALHADOS DE ST
-- Migration 013
-- Adiciona campos detalhados para cálculo de ST em vendas_itens
-- =====================================================

-- =====================================================
-- VENDAS_ITENS - Campos detalhados de ICMS-ST
-- =====================================================

-- ICMS Próprio (usado no cálculo de ST)
ALTER TABLE vendas_itens
ADD COLUMN IF NOT EXISTS icms_proprio_aliquota DECIMAL(5,2) DEFAULT 0 CHECK (icms_proprio_aliquota >= 0 AND icms_proprio_aliquota <= 100);

ALTER TABLE vendas_itens
ADD COLUMN IF NOT EXISTS icms_proprio_valor DECIMAL(10,2) DEFAULT 0;

-- Base de cálculo do ST
ALTER TABLE vendas_itens
ADD COLUMN IF NOT EXISTS base_calculo_st DECIMAL(10,2) DEFAULT 0;

-- ICMS-ST (alíquota e valor total)
ALTER TABLE vendas_itens
ADD COLUMN IF NOT EXISTS icms_st_aliquota DECIMAL(5,2) DEFAULT 0 CHECK (icms_st_aliquota >= 0 AND icms_st_aliquota <= 100);

ALTER TABLE vendas_itens
ADD COLUMN IF NOT EXISTS icms_st_valor DECIMAL(10,2) DEFAULT 0;

-- MVA aplicado
ALTER TABLE vendas_itens
ADD COLUMN IF NOT EXISTS mva_aplicado DECIMAL(6,4) DEFAULT 0;

-- Comentários descritivos
COMMENT ON COLUMN vendas_itens.icms_proprio_aliquota IS 'Alíquota de ICMS Próprio em % (ex: 4%). Usado no cálculo: ST = ICMS ST - ICMS Próprio';
COMMENT ON COLUMN vendas_itens.icms_proprio_valor IS 'Valor do ICMS Próprio calculado: Valor Líquido × ICMS Próprio %';
COMMENT ON COLUMN vendas_itens.base_calculo_st IS 'Base de cálculo do ST: Valor Líquido × (1 + MVA)';
COMMENT ON COLUMN vendas_itens.icms_st_aliquota IS 'Alíquota de ICMS-ST (ex: 18%). Geralmente a alíquota interna do estado.';
COMMENT ON COLUMN vendas_itens.icms_st_valor IS 'Valor total do ICMS-ST: Base ST × Alíquota ST';
COMMENT ON COLUMN vendas_itens.mva_aplicado IS 'MVA (Margem de Valor Agregado) aplicado no cálculo (em decimal, ex: 0.8363 = 83.63%)';

-- Atualizar comentário do st_valor para refletir a fórmula correta
COMMENT ON COLUMN vendas_itens.st_valor IS 'ST Final = ICMS ST - ICMS Próprio (este é o valor que entra no total da venda)';

-- Atualizar comentário do st_aliquota para refletir que é MVA
COMMENT ON COLUMN vendas_itens.st_aliquota IS 'MVA (Margem de Valor Agregado) em % (0-100). Base para cálculo de ST.';

-- =====================================================
-- MIGRATION COMPLETA
-- =====================================================
