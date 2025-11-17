-- =====================================================
-- ATUALIZAR PRODUTOS EXISTENTES COM ICMS PRÓPRIO
-- =====================================================
-- Este script atualiza todos os produtos existentes para
-- ter icms_proprio = 4% (padrão)
-- =====================================================

-- Atualizar produtos que ainda não têm icms_proprio definido
UPDATE produtos
SET icms_proprio = 4.00
WHERE icms_proprio IS NULL OR icms_proprio = 0;

-- Verificar resultado
SELECT
  COUNT(*) AS total_produtos,
  COUNT(CASE WHEN icms_proprio > 0 THEN 1 END) AS com_icms_proprio,
  COUNT(CASE WHEN icms_proprio IS NULL OR icms_proprio = 0 THEN 1 END) AS sem_icms_proprio
FROM produtos;
