-- =====================================================
-- MIGRATION 021: Force Remove SECURITY DEFINER from Views
-- =====================================================
-- Purpose: Explicitly recreate views without SECURITY DEFINER
-- Issue: CREATE OR REPLACE can preserve security attributes
-- Date: 2025-12-13
-- =====================================================

BEGIN;

-- =====================================================
-- 1. FORCE DROP AND RECREATE estoque_com_valores
-- =====================================================

-- Drop with CASCADE to remove dependencies
DROP VIEW IF EXISTS estoque_com_valores CASCADE;

-- Recreate WITHOUT SECURITY DEFINER (explicit)
CREATE VIEW estoque_com_valores
WITH (security_invoker=true)  -- Explicitly use SECURITY INVOKER (opposite of DEFINER)
AS
SELECT
  id,
  nome,
  descricao,
  preco,
  preco_venda,
  preco_custo,
  estoque,
  estoque_minimo,
  categoria,
  codigo_barras,
  ativo,
  created_at,
  updated_at,
  (estoque::numeric * preco_venda) AS valor_total_venda,
  (estoque::numeric * preco_custo) AS valor_total_custo,
  (preco_venda - preco_custo) AS margem_lucro,
  CASE
    WHEN preco_custo > 0 THEN ROUND(((preco_venda - preco_custo) / preco_custo) * 100, 2)
    ELSE 0
  END AS margem_percentual,
  CASE
    WHEN estoque <= estoque_minimo THEN 'Crítico'
    WHEN estoque <= (estoque_minimo * 1.5) THEN 'Baixo'
    ELSE 'Normal'
  END AS status_estoque
FROM produtos
WHERE ativo = true;

RAISE NOTICE '✅ View estoque_com_valores recreated with SECURITY INVOKER';

-- =====================================================
-- 2. FORCE DROP AND RECREATE vendedores_com_usuario
-- =====================================================

-- Drop with CASCADE to remove dependencies
DROP VIEW IF EXISTS vendedores_com_usuario CASCADE;

-- Recreate WITHOUT SECURITY DEFINER (explicit)
CREATE VIEW vendedores_com_usuario
WITH (security_invoker=true)  -- Explicitly use SECURITY INVOKER
AS
SELECT
  v.id AS vendedor_id,
  v.nome AS vendedor_nome,
  v.email AS vendedor_email,
  v.telefone AS vendedor_telefone,
  v.comissao,
  v.ativo AS vendedor_ativo,
  v.usuario_id,
  u.id AS usuario_id_fk,
  u.nome AS usuario_nome,
  u.email AS usuario_email,
  u.tipo_usuario,
  u.ativo AS usuario_ativo,
  CASE
    WHEN v.usuario_id IS NOT NULL THEN 'Com Usuário'
    ELSE 'Sem Usuário'
  END AS status_vinculo
FROM vendedores v
LEFT JOIN usuarios u ON u.id = v.usuario_id;

RAISE NOTICE '✅ View vendedores_com_usuario recreated with SECURITY INVOKER';

-- =====================================================
-- 3. GRANT SELECT PERMISSIONS
-- =====================================================

-- Grant SELECT to authenticated users (RLS on base tables will control access)
GRANT SELECT ON estoque_com_valores TO authenticated;
GRANT SELECT ON vendedores_com_usuario TO authenticated;

RAISE NOTICE '✅ SELECT permissions granted to authenticated role';

-- =====================================================
-- 4. VERIFICATION
-- =====================================================

-- Verify views exist and check security properties
SELECT
  schemaname,
  viewname,
  viewowner,
  definition
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN ('estoque_com_valores', 'vendedores_com_usuario')
ORDER BY viewname;

-- =====================================================
-- 5. REPORT COMPLETION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '✅ Migração 021 Concluída - Force Remove SECURITY DEFINER';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Security Attributes Updated:';
  RAISE NOTICE '  - ✅ estoque_com_valores: SECURITY INVOKER (safe)';
  RAISE NOTICE '  - ✅ vendedores_com_usuario: SECURITY INVOKER (safe)';
  RAISE NOTICE '';
  RAISE NOTICE '📋 What Changed:';
  RAISE NOTICE '  - Views now run with QUERYING user permissions (not creator)';
  RAISE NOTICE '  - RLS policies on base tables (produtos, vendedores, usuarios)';
  RAISE NOTICE '    will properly control access';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT:';
  RAISE NOTICE '  - Run Supabase Database Linter again';
  RAISE NOTICE '  - SECURITY DEFINER errors should be GONE';
  RAISE NOTICE '  - Views will respect RLS policies';
  RAISE NOTICE '';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '';
END $$;

COMMIT;

-- =====================================================
-- NOTES
-- =====================================================
--
-- SECURITY INVOKER vs SECURITY DEFINER:
--
-- SECURITY INVOKER (default, safe):
--   - View runs with permissions of the USER who queries it
--   - RLS policies on base tables are enforced
--   - Follows principle of least privilege
--
-- SECURITY DEFINER (dangerous):
--   - View runs with permissions of the view CREATOR
--   - Can bypass RLS policies
--   - Security risk if not carefully managed
--
-- This migration explicitly sets security_invoker=true to ensure
-- views use the safe mode.
-- =====================================================
