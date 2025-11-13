-- =====================================================
-- SISTEMA DE IMPOSTOS (IPI, ICMS, ST)
-- Migration 006
-- Adiciona campos de impostos para produtos e vendas
-- =====================================================

-- =====================================================
-- 1. PRODUTOS - Adicionar alíquotas de impostos
-- =====================================================

-- IPI: Imposto sobre Produtos Industrializados
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS ipi DECIMAL(5,2) DEFAULT 0 CHECK (ipi >= 0 AND ipi <= 100);

-- ICMS: Imposto sobre Circulação de Mercadorias (informativo, não entra no total)
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS icms DECIMAL(5,2) DEFAULT 0 CHECK (icms >= 0 AND icms <= 100);

-- ST: Substituição Tributária
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS st DECIMAL(5,2) DEFAULT 0 CHECK (st >= 0 AND st <= 100);

-- Comentários descritivos
COMMENT ON COLUMN produtos.ipi IS 'Alíquota de IPI em % (0-100). Aplicado ao subtotal líquido.';
COMMENT ON COLUMN produtos.icms IS 'Alíquota de ICMS em % (0-100). Informativo apenas, NÃO incluído no total da venda.';
COMMENT ON COLUMN produtos.st IS 'Alíquota de ST em % (0-100). Aplicado ao subtotal líquido.';

-- =====================================================
-- 2. VENDAS_ITENS - Adicionar campos calculados de impostos
-- =====================================================

-- Valores brutos e líquidos
ALTER TABLE vendas_itens ADD COLUMN IF NOT EXISTS subtotal_bruto DECIMAL(10,2) DEFAULT 0;
ALTER TABLE vendas_itens ADD COLUMN IF NOT EXISTS desconto_proporcional DECIMAL(10,2) DEFAULT 0;
ALTER TABLE vendas_itens ADD COLUMN IF NOT EXISTS subtotal_liquido DECIMAL(10,2) DEFAULT 0;

-- IPI
ALTER TABLE vendas_itens ADD COLUMN IF NOT EXISTS ipi_aliquota DECIMAL(5,2) DEFAULT 0;
ALTER TABLE vendas_itens ADD COLUMN IF NOT EXISTS ipi_valor DECIMAL(10,2) DEFAULT 0;

-- ICMS (informativo)
ALTER TABLE vendas_itens ADD COLUMN IF NOT EXISTS icms_aliquota DECIMAL(5,2) DEFAULT 0;
ALTER TABLE vendas_itens ADD COLUMN IF NOT EXISTS icms_valor DECIMAL(10,2) DEFAULT 0;

-- ST
ALTER TABLE vendas_itens ADD COLUMN IF NOT EXISTS st_aliquota DECIMAL(5,2) DEFAULT 0;
ALTER TABLE vendas_itens ADD COLUMN IF NOT EXISTS st_valor DECIMAL(10,2) DEFAULT 0;

-- Total do item (com impostos, exceto ICMS)
ALTER TABLE vendas_itens ADD COLUMN IF NOT EXISTS total_item DECIMAL(10,2) DEFAULT 0;

-- Comentários descritivos
COMMENT ON COLUMN vendas_itens.subtotal_bruto IS 'Preço unitário × quantidade (antes do desconto)';
COMMENT ON COLUMN vendas_itens.desconto_proporcional IS 'Desconto total da venda distribuído proporcionalmente';
COMMENT ON COLUMN vendas_itens.subtotal_liquido IS 'Subtotal bruto - desconto proporcional';
COMMENT ON COLUMN vendas_itens.ipi_aliquota IS 'Alíquota de IPI aplicada (%)';
COMMENT ON COLUMN vendas_itens.ipi_valor IS 'Valor de IPI calculado (subtotal_liquido × ipi_aliquota)';
COMMENT ON COLUMN vendas_itens.icms_aliquota IS 'Alíquota de ICMS (%). Informativo, não entra no total.';
COMMENT ON COLUMN vendas_itens.icms_valor IS 'Valor de ICMS calculado. Informativo, não entra no total.';
COMMENT ON COLUMN vendas_itens.st_aliquota IS 'Alíquota de ST aplicada (%)';
COMMENT ON COLUMN vendas_itens.st_valor IS 'Valor de ST calculado (subtotal_liquido × st_aliquota)';
COMMENT ON COLUMN vendas_itens.total_item IS 'Total do item: subtotal_liquido + ipi_valor + st_valor (ICMS NÃO incluído)';

-- =====================================================
-- 3. VENDAS - Adicionar totalizadores de impostos
-- =====================================================

-- Totais de produtos
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS total_produtos_bruto DECIMAL(10,2) DEFAULT 0;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS desconto_total DECIMAL(10,2) DEFAULT 0;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS total_produtos_liquido DECIMAL(10,2) DEFAULT 0;

-- Totais de impostos
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS total_ipi DECIMAL(10,2) DEFAULT 0;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS total_icms DECIMAL(10,2) DEFAULT 0;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS total_st DECIMAL(10,2) DEFAULT 0;

-- Comentários descritivos
COMMENT ON COLUMN vendas.total_produtos_bruto IS 'Soma de todos subtotais brutos dos itens';
COMMENT ON COLUMN vendas.desconto_total IS 'Desconto total da venda (distribuído proporcionalmente)';
COMMENT ON COLUMN vendas.total_produtos_liquido IS 'Total bruto - desconto total';
COMMENT ON COLUMN vendas.total_ipi IS 'Soma de todos valores de IPI dos itens';
COMMENT ON COLUMN vendas.total_icms IS 'Soma de todos valores de ICMS (informativo, NÃO incluído em valor_final)';
COMMENT ON COLUMN vendas.total_st IS 'Soma de todos valores de ST dos itens';
COMMENT ON COLUMN vendas.valor_final IS 'Total geral da venda: total_produtos_liquido + total_ipi + total_st (ICMS NÃO incluído)';

-- =====================================================
-- 4. ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para filtrar produtos por impostos
CREATE INDEX IF NOT EXISTS idx_produtos_ipi ON produtos(ipi) WHERE ipi > 0;
CREATE INDEX IF NOT EXISTS idx_produtos_icms ON produtos(icms) WHERE icms > 0;
CREATE INDEX IF NOT EXISTS idx_produtos_st ON produtos(st) WHERE st > 0;

-- Índices para análises de vendas com impostos
CREATE INDEX IF NOT EXISTS idx_vendas_total_ipi ON vendas(total_ipi) WHERE total_ipi > 0;
CREATE INDEX IF NOT EXISTS idx_vendas_total_icms ON vendas(total_icms) WHERE total_icms > 0;
CREATE INDEX IF NOT EXISTS idx_vendas_total_st ON vendas(total_st) WHERE total_st > 0;

-- =====================================================
-- MIGRATION COMPLETA
-- =====================================================
