-- =====================================================
-- MIGRAÇÃO: Auto-confirmação de Vendas Pendentes
-- Migration 011: Auto-confirm pending sales
-- Descrição: Atualiza todas as vendas pendentes para
--            status "pago" conforme novo padrão do sistema
-- Data: 2025-12-26
-- =====================================================

-- Log inicial
DO $$
DECLARE
  vendas_pendentes INT;
BEGIN
  SELECT COUNT(*) INTO vendas_pendentes
  FROM vendas
  WHERE status = 'pendente';

  RAISE NOTICE 'Iniciando migração de % vendas pendentes para pago...', vendas_pendentes;
END $$;

-- Atualizar todas as vendas pendentes para "pago"
UPDATE vendas
SET
  status = 'pago',
  updated_at = CURRENT_TIMESTAMP
WHERE
  status = 'pendente';

-- Log final
DO $$
DECLARE
  vendas_atualizadas INT;
BEGIN
  SELECT COUNT(*) INTO vendas_atualizadas
  FROM vendas
  WHERE status = 'pago'
    AND updated_at > (CURRENT_TIMESTAMP - INTERVAL '10 seconds');

  RAISE NOTICE '✅ Migração concluída: % vendas atualizadas de "pendente" para "pago"', vendas_atualizadas;
END $$;

-- Atualizar comentário da coluna para documentação
COMMENT ON COLUMN vendas.status IS
  'Status da venda: pago (padrão desde 2025-12-26), pendente (legacy), cancelado. Nota: parcelas têm status independente.';
