-- =====================================================
-- MIGRAÇÃO DE DADOS PARA SISTEMA DE IMPOSTOS
-- Migration 007 (OPCIONAL)
-- Atualiza vendas existentes com valores de impostos
-- =====================================================

-- =====================================================
-- IMPORTANTE: Esta migration é OPCIONAL
-- =====================================================
-- Execute apenas se desejar migrar vendas antigas para o novo formato.
-- Vendas novas usarão automaticamente o novo sistema de impostos.
-- Vendas antigas continuarão funcionando normalmente sem esta migration.
-- =====================================================

-- =====================================================
-- 1. PRODUTOS - Definir alíquotas padrão
-- =====================================================

-- Definir alíquotas padrão de 0% para todos os produtos existentes
UPDATE produtos
SET
    ipi = COALESCE(ipi, 0),
    icms = COALESCE(icms, 0),
    st = COALESCE(st, 0)
WHERE ipi IS NULL OR icms IS NULL OR st IS NULL;

-- =====================================================
-- 2. VENDAS_ITENS - Calcular valores de impostos retroativos
-- =====================================================

-- Atualizar itens de vendas existentes com valores calculados
-- Nota: Como as vendas antigas não têm desconto proporcional,
-- consideramos desconto = 0 para simplificar
UPDATE vendas_itens vi
SET
    -- Valores brutos e líquidos (sem desconto proporcional para vendas antigas)
    subtotal_bruto = vi.subtotal,
    desconto_proporcional = 0,
    subtotal_liquido = vi.subtotal,

    -- IPI (busca alíquota do produto, padrão 0%)
    ipi_aliquota = COALESCE(p.ipi, 0),
    ipi_valor = ROUND(vi.subtotal * COALESCE(p.ipi, 0) / 100, 2),

    -- ICMS (busca alíquota do produto, padrão 0%)
    icms_aliquota = COALESCE(p.icms, 0),
    icms_valor = ROUND(vi.subtotal * COALESCE(p.icms, 0) / 100, 2),

    -- ST (busca alíquota do produto, padrão 0%)
    st_aliquota = COALESCE(p.st, 0),
    st_valor = ROUND(vi.subtotal * COALESCE(p.st, 0) / 100, 2),

    -- Total do item = subtotal_liquido + ipi + st (sem ICMS)
    total_item = vi.subtotal +
                 ROUND(vi.subtotal * COALESCE(p.ipi, 0) / 100, 2) +
                 ROUND(vi.subtotal * COALESCE(p.st, 0) / 100, 2)
FROM produtos p
WHERE vi.produto_id = p.id
  AND (vi.subtotal_bruto IS NULL OR vi.total_item IS NULL);

-- =====================================================
-- 3. VENDAS - Calcular totalizadores retroativos
-- =====================================================

-- Atualizar vendas existentes com totalizadores
UPDATE vendas v
SET
    -- Total bruto (soma de subtotais dos itens)
    total_produtos_bruto = (
        SELECT COALESCE(SUM(vi.subtotal_bruto), 0)
        FROM vendas_itens vi
        WHERE vi.venda_id = v.id
    ),

    -- Desconto total (usar valor existente ou 0)
    desconto_total = COALESCE(v.desconto, 0),

    -- Total líquido (bruto - desconto)
    total_produtos_liquido = (
        SELECT COALESCE(SUM(vi.subtotal_liquido), 0)
        FROM vendas_itens vi
        WHERE vi.venda_id = v.id
    ),

    -- Total IPI
    total_ipi = (
        SELECT COALESCE(SUM(vi.ipi_valor), 0)
        FROM vendas_itens vi
        WHERE vi.venda_id = v.id
    ),

    -- Total ICMS (informativo)
    total_icms = (
        SELECT COALESCE(SUM(vi.icms_valor), 0)
        FROM vendas_itens vi
        WHERE vi.venda_id = v.id
    ),

    -- Total ST
    total_st = (
        SELECT COALESCE(SUM(vi.st_valor), 0)
        FROM vendas_itens vi
        WHERE vi.venda_id = v.id
    )
WHERE v.total_produtos_bruto IS NULL OR v.total_ipi IS NULL;

-- Atualizar valor_final se necessário (total_liquido + IPI + ST, sem ICMS)
UPDATE vendas v
SET valor_final = v.total_produtos_liquido + v.total_ipi + v.total_st
WHERE v.total_produtos_liquido > 0
  AND v.valor_final != (v.total_produtos_liquido + v.total_ipi + v.total_st);

-- =====================================================
-- 4. VALIDAÇÕES PÓS-MIGRAÇÃO
-- =====================================================

-- Verificar produtos com alíquotas inválidas (fora do range 0-100)
DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO invalid_count
    FROM produtos
    WHERE ipi < 0 OR ipi > 100
       OR icms < 0 OR icms > 100
       OR st < 0 OR st > 100;

    IF invalid_count > 0 THEN
        RAISE NOTICE 'ATENÇÃO: % produtos têm alíquotas inválidas (fora de 0-100)', invalid_count;
    ELSE
        RAISE NOTICE 'Validação OK: Todas alíquotas estão no range válido (0-100)';
    END IF;
END $$;

-- Verificar itens com cálculos inconsistentes
DO $$
DECLARE
    inconsistent_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO inconsistent_count
    FROM venda_itens
    WHERE ABS(total_item - (subtotal_liquido + ipi_valor + st_valor)) > 0.01;

    IF inconsistent_count > 0 THEN
        RAISE NOTICE 'ATENÇÃO: % itens têm totais inconsistentes', inconsistent_count;
    ELSE
        RAISE NOTICE 'Validação OK: Todos os totais dos itens estão corretos';
    END IF;
END $$;

-- Verificar vendas com totalizadores inconsistentes
DO $$
DECLARE
    inconsistent_sales INTEGER;
BEGIN
    SELECT COUNT(*) INTO inconsistent_sales
    FROM vendas v
    WHERE EXISTS (
        SELECT 1
        FROM venda_itens vi
        WHERE vi.venda_id = v.id
    )
    AND ABS(v.total_produtos_bruto - (
        SELECT COALESCE(SUM(vi.subtotal_bruto), 0)
        FROM venda_itens vi
        WHERE vi.venda_id = v.id
    )) > 0.01;

    IF inconsistent_sales > 0 THEN
        RAISE NOTICE 'ATENÇÃO: % vendas têm totalizadores inconsistentes', inconsistent_sales;
    ELSE
        RAISE NOTICE 'Validação OK: Todos os totalizadores estão corretos';
    END IF;
END $$;

-- =====================================================
-- RELATÓRIO DE MIGRAÇÃO
-- =====================================================

DO $$
DECLARE
    total_produtos INTEGER;
    produtos_com_impostos INTEGER;
    total_vendas INTEGER;
    vendas_migradas INTEGER;
    total_itens INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_produtos FROM produtos;
    SELECT COUNT(*) INTO produtos_com_impostos FROM produtos WHERE ipi > 0 OR icms > 0 OR st > 0;
    SELECT COUNT(*) INTO total_vendas FROM vendas;
    SELECT COUNT(*) INTO vendas_migradas FROM vendas WHERE total_produtos_bruto > 0;
    SELECT COUNT(*) INTO total_itens FROM venda_itens;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'RELATÓRIO DE MIGRAÇÃO DE IMPOSTOS';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Produtos cadastrados: %', total_produtos;
    RAISE NOTICE 'Produtos com impostos: % (%.1f%%)',
        produtos_com_impostos,
        CASE WHEN total_produtos > 0 THEN (produtos_com_impostos::DECIMAL / total_produtos * 100) ELSE 0 END;
    RAISE NOTICE 'Vendas cadastradas: %', total_vendas;
    RAISE NOTICE 'Vendas migradas: % (%.1f%%)',
        vendas_migradas,
        CASE WHEN total_vendas > 0 THEN (vendas_migradas::DECIMAL / total_vendas * 100) ELSE 0 END;
    RAISE NOTICE 'Itens de vendas: %', total_itens;
    RAISE NOTICE '========================================';
END $$;

-- =====================================================
-- MIGRATION COMPLETA
-- =====================================================
