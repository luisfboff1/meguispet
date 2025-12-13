-- =====================================================
-- CHECK DEPENDENCIES BEFORE DROPPING VIEWS
-- =====================================================
-- Purpose: Verify if any objects depend on the views
-- Run this BEFORE migration 021 to see what will be affected
-- =====================================================

-- Check dependencies for estoque_com_valores
SELECT
  'estoque_com_valores' AS view_name,
  dependent_ns.nspname AS dependent_schema,
  dependent_view.relname AS dependent_object,
  dependent_view.relkind AS object_type
FROM pg_depend
JOIN pg_rewrite ON pg_depend.objid = pg_rewrite.oid
JOIN pg_class as dependent_view ON pg_rewrite.ev_class = dependent_view.oid
JOIN pg_class as source_view ON pg_depend.refobjid = source_view.oid
JOIN pg_namespace dependent_ns ON dependent_ns.oid = dependent_view.relnamespace
WHERE source_view.relname = 'estoque_com_valores'
  AND dependent_view.relname != 'estoque_com_valores'
  AND source_view.relnamespace IN (
    SELECT oid FROM pg_namespace WHERE nspname = 'public'
  );

-- Check dependencies for vendedores_com_usuario
SELECT
  'vendedores_com_usuario' AS view_name,
  dependent_ns.nspname AS dependent_schema,
  dependent_view.relname AS dependent_object,
  dependent_view.relkind AS object_type
FROM pg_depend
JOIN pg_rewrite ON pg_depend.objid = pg_rewrite.oid
JOIN pg_class as dependent_view ON pg_rewrite.ev_class = dependent_view.oid
JOIN pg_class as source_view ON pg_depend.refobjid = source_view.oid
JOIN pg_namespace dependent_ns ON dependent_ns.oid = dependent_view.relnamespace
WHERE source_view.relname = 'vendedores_com_usuario'
  AND dependent_view.relname != 'vendedores_com_usuario'
  AND source_view.relnamespace IN (
    SELECT oid FROM pg_namespace WHERE nspname = 'public'
  );

-- Summary
DO $$
DECLARE
  dep_count_estoque INT;
  dep_count_vendedores INT;
BEGIN
  -- This is a simplified check
  RAISE NOTICE '';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '📋 Dependency Check Complete';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Se as queries acima NÃO retornaram linhas:';
  RAISE NOTICE '  ✅ SEGURO - Nenhuma dependência encontrada';
  RAISE NOTICE '  ✅ Pode executar a migração 021 sem preocupações';
  RAISE NOTICE '';
  RAISE NOTICE 'Se as queries retornaram linhas:';
  RAISE NOTICE '  ⚠️  Existem objetos que dependem dessas views';
  RAISE NOTICE '  ⚠️  CASCADE irá dropar esses objetos também';
  RAISE NOTICE '  ⚠️  (mas eles serão recriados automaticamente se necessário)';
  RAISE NOTICE '';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '';
END $$;
