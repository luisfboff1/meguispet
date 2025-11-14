-- ============================================================================
-- MIGRATION 009: Add origem_venda and uf_destino columns to vendas table
-- ============================================================================
-- Descrição: Adiciona colunas necessárias para o sistema de relatórios de vendas
-- Data: 2025-11-14
-- Autor: Claude Code
-- Issue: POST /api/relatorios/vendas/preview 500 - column vendas.origem_venda does not exist
-- ============================================================================

-- =====================================================
-- 1. ADICIONAR COLUNA origem_venda
-- =====================================================
-- Coluna para rastrear a origem da venda (loja física, marketplace, etc.)
ALTER TABLE vendas 
ADD COLUMN IF NOT EXISTS origem_venda VARCHAR(50);

-- Comentário descritivo
COMMENT ON COLUMN vendas.origem_venda IS 'Origem da venda: loja_fisica, mercado_livre, online, etc.';

-- Índice para filtros de relatórios
CREATE INDEX IF NOT EXISTS idx_vendas_origem ON vendas(origem_venda) 
WHERE origem_venda IS NOT NULL;

-- =====================================================
-- 2. ADICIONAR COLUNA uf_destino
-- =====================================================
-- Coluna para armazenar o estado de destino da venda (análise geográfica)
ALTER TABLE vendas 
ADD COLUMN IF NOT EXISTS uf_destino VARCHAR(2);

-- Comentário descritivo
COMMENT ON COLUMN vendas.uf_destino IS 'UF de destino da venda (sigla do estado: SP, RJ, MG, etc.)';

-- Índice para filtros de relatórios
CREATE INDEX IF NOT EXISTS idx_vendas_uf_destino ON vendas(uf_destino) 
WHERE uf_destino IS NOT NULL;

-- =====================================================
-- 3. ATUALIZAR DADOS EXISTENTES (OPCIONAL)
-- =====================================================
-- Define valores padrão para vendas existentes sem origem
UPDATE vendas 
SET origem_venda = 'loja_fisica' 
WHERE origem_venda IS NULL;

-- Define UF baseado no estado do cliente para vendas existentes
UPDATE vendas v
SET uf_destino = c.estado
FROM clientes_fornecedores c
WHERE v.cliente_id = c.id 
  AND v.uf_destino IS NULL 
  AND c.estado IS NOT NULL;

-- ============================================================================
-- FIM DA MIGRATION 009
-- ============================================================================
