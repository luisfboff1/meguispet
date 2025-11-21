-- =====================================================
-- ADICIONAR CAMPO SEM_IMPOSTOS
-- Migration 017
-- Adiciona campo para indicar vendas sem impostos
-- =====================================================

-- =====================================================
-- VENDAS - Campo sem_impostos
-- =====================================================

-- Adicionar campo booleano para marcar vendas sem impostos
ALTER TABLE vendas
ADD COLUMN IF NOT EXISTS sem_impostos BOOLEAN DEFAULT FALSE;

-- Comentário descritivo
COMMENT ON COLUMN vendas.sem_impostos IS 'Indica se a venda é sem impostos. Quando TRUE, os impostos (IPI, ICMS, ST) não são calculados e a observação automática "PEDIDO SEM IMPOSTOS" é adicionada.';

-- =====================================================
-- MIGRATION COMPLETA
-- =====================================================
