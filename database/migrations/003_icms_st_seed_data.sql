-- ============================================================================
-- MIGRATION 003: ICMS-ST Seed Data
-- ============================================================================
-- Description: Populates tabela_mva with Brazilian states tax data for NCM 2309
-- Author: System
-- Date: 2025-01-07
-- Note: Data based on official tax tables for pet food (NCM 2309)
-- ============================================================================

-- ============================================================================
-- SEED: tabela_mva (MVA Table for All Brazilian States)
-- ============================================================================
-- NCM 2309: Ração tipo "pet" para animais domésticos
-- ============================================================================

INSERT INTO tabela_mva (uf, ncm, descricao, aliquota_interna, aliquota_fundo, aliquota_efetiva, mva, sujeito_st)
VALUES
  -- Acre
  ('AC', '2309', 'Ração tipo "pet" para animais domésticos', 0.19, NULL, NULL, 0.7304, true),

  -- Alagoas
  ('AL', '2309', 'Ração tipo "pet" para animais domésticos', 0.19, 0.01, 0.20, 0.752, true),

  -- Amazonas
  ('AM', '2309', 'Ração tipo "pet" para animais domésticos', 0.20, NULL, NULL, 0.752, true),

  -- Amapá
  ('AP', '2309', 'Ração tipo "pet" para animais domésticos', 0.18, NULL, NULL, 0.7093, true),

  -- Bahia (não sujeito a ST)
  ('BA', '2309', 'Não sujeito a ST nesta UF', NULL, NULL, NULL, NULL, false),

  -- Ceará
  ('CE', '2309', 'Rações tipo "pet" para animais domésticos', 0.20, 0.02, 0.22, 1.043, true),

  -- Distrito Federal
  ('DF', '2309', 'Ração tipo "pet" para animais domésticos', 0.20, NULL, NULL, 0.752, true),

  -- Espírito Santo
  ('ES', '2309', 'Ração tipo "pet" para animais domésticos', 0.17, NULL, NULL, 0.6887, true),

  -- Goiás (não sujeito a ST)
  ('GO', '2309', 'Não sujeito a ST nesta UF', NULL, NULL, NULL, NULL, false),

  -- Maranhão
  ('MA', '2309', 'Ração tipo "pet" para animais domésticos', 0.23, 0.02, 0.25, 0.8688, true),

  -- Minas Gerais
  ('MG', '2309', 'Ração tipo "pet" para animais domésticos', 0.18, NULL, NULL, 0.7093, true),

  -- Mato Grosso do Sul
  ('MS', '2309', 'Ração tipo "pet" para animais domésticos', 0.17, NULL, NULL, 0.6887, true),

  -- Mato Grosso
  ('MT', '2309', 'Ração tipo "pet" para animais domésticos', 0.17, NULL, NULL, 0.5328, true),

  -- Pará
  ('PA', '2309', 'Rações tipo "pet" para animais domésticos', 0.19, NULL, NULL, 0.7304, true),

  -- Paraíba
  ('PB', '2309', 'Ração tipo "pet" para animais domésticos', 0.20, NULL, NULL, 0.752, true),

  -- Pernambuco
  ('PE', '2309', 'Ração tipo "pet" para animais domésticos', 0.205, NULL, NULL, 0.763, true),

  -- Piauí
  ('PI', '2309', 'Ração tipo "pet" para animais domésticos', 0.225, NULL, NULL, 0.8085, true),

  -- Paraná
  ('PR', '2309', 'Rações tipo "pet" para animais domésticos', 0.195, NULL, NULL, 0.7411, true),

  -- Rio de Janeiro
  ('RJ', '2309', 'Ração tipo "pet" para animais domésticos', 0.20, 0.02, 0.22, 0.7969, true),

  -- Rio Grande do Norte (não sujeito a ST)
  ('RN', '2309', 'Não sujeito a ST nesta UF', NULL, NULL, NULL, NULL, false),

  -- Rondônia (não sujeito a ST)
  ('RO', '2309', 'Não sujeito a ST nesta UF', NULL, NULL, NULL, NULL, false),

  -- Roraima
  ('RR', '2309', 'Rações tipo Pet para animais domésticos', 0.20, NULL, NULL, 0.752, true),

  -- Rio Grande do Sul
  ('RS', '2309', 'Rações tipo "pet" para animais domésticos', 0.17, NULL, NULL, 0.9926, true),

  -- Santa Catarina (não sujeito a ST)
  ('SC', '2309', 'Não sujeito a ST nesta UF', NULL, NULL, NULL, NULL, false),

  -- Sergipe
  ('SE', '2309', 'Rações tipo "pet" para animais domésticos', 0.19, 0.02, 0.21, 0.7742, true),

  -- São Paulo
  ('SP', '2309', 'Ração tipo "pet" para animais domésticos', 0.18, NULL, NULL, 0.8363, true),

  -- Tocantins
  ('TO', '2309', 'Ração tipo "pet" para animais domésticos', 0.20, NULL, NULL, 0.752, true)

ON CONFLICT (uf, ncm) DO UPDATE SET
  descricao = EXCLUDED.descricao,
  aliquota_interna = EXCLUDED.aliquota_interna,
  aliquota_fundo = EXCLUDED.aliquota_fundo,
  aliquota_efetiva = EXCLUDED.aliquota_efetiva,
  mva = EXCLUDED.mva,
  sujeito_st = EXCLUDED.sujeito_st,
  updated_at = NOW();

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Query to verify inserted data
-- SELECT uf, ncm, descricao, mva, sujeito_st FROM tabela_mva ORDER BY uf;

-- Summary query
-- SELECT
--   COUNT(*) as total_records,
--   COUNT(*) FILTER (WHERE sujeito_st = true) as sujeito_st_count,
--   COUNT(*) FILTER (WHERE sujeito_st = false) as nao_sujeito_count
-- FROM tabela_mva;
