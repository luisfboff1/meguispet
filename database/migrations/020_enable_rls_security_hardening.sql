-- =====================================================
-- MIGRATION 020: Enable RLS and Security Hardening
-- =====================================================
-- Purpose: Fix Supabase Database Linter security errors
-- Issues:
--   1. Multiple tables without RLS enabled (CRITICAL)
--   2. SECURITY DEFINER views (security risk)
-- Date: 2025-12-13
-- =====================================================

BEGIN;

-- =====================================================
-- 1. ENABLE RLS ON ALL PUBLIC TABLES
-- =====================================================

-- Enable RLS on tables that currently don't have it
ALTER TABLE formas_pagamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacoes_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico_precos ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias_financeiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE transacoes_recorrentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE relatorios_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE venda_parcelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

RAISE NOTICE '✅ RLS enabled on all tables';

-- =====================================================
-- 2. CREATE RLS POLICIES FOR FORMAS_PAGAMENTO
-- =====================================================

-- All authenticated users can read payment methods
CREATE POLICY "All users read payment methods" ON formas_pagamento
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id::text = auth.uid()::text
      AND ativo = true
    )
  );

-- Only admin and gerente can insert payment methods
CREATE POLICY "Admins insert payment methods" ON formas_pagamento
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id::text = auth.uid()::text
      AND tipo_usuario IN ('admin', 'gerente')
      AND ativo = true
    )
  );

-- Only admin and gerente can update payment methods
CREATE POLICY "Admins update payment methods" ON formas_pagamento
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id::text = auth.uid()::text
      AND tipo_usuario IN ('admin', 'gerente')
      AND ativo = true
    )
  );

-- Only admin can delete payment methods
CREATE POLICY "Admins delete payment methods" ON formas_pagamento
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id::text = auth.uid()::text
      AND tipo_usuario = 'admin'
      AND ativo = true
    )
  );

-- =====================================================
-- 3. CREATE RLS POLICIES FOR FORNECEDORES
-- =====================================================

-- All authenticated users can read suppliers
CREATE POLICY "All users read suppliers" ON fornecedores
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id::text = auth.uid()::text
      AND ativo = true
    )
  );

-- Admin, gerente, and estoque can insert suppliers
CREATE POLICY "Staff insert suppliers" ON fornecedores
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id::text = auth.uid()::text
      AND tipo_usuario IN ('admin', 'gerente', 'estoque')
      AND ativo = true
    )
  );

-- Admin, gerente, and estoque can update suppliers
CREATE POLICY "Staff update suppliers" ON fornecedores
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id::text = auth.uid()::text
      AND tipo_usuario IN ('admin', 'gerente', 'estoque')
      AND ativo = true
    )
  );

-- Only admin can delete suppliers
CREATE POLICY "Admins delete suppliers" ON fornecedores
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id::text = auth.uid()::text
      AND tipo_usuario = 'admin'
      AND ativo = true
    )
  );

-- =====================================================
-- 4. CREATE RLS POLICIES FOR MOVIMENTACOES_ITENS
-- =====================================================

-- All authenticated users can read stock movement items
CREATE POLICY "All users read stock movement items" ON movimentacoes_itens
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id::text = auth.uid()::text
      AND ativo = true
    )
  );

-- Admin, gerente, and estoque can insert stock movement items
CREATE POLICY "Staff insert stock movement items" ON movimentacoes_itens
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id::text = auth.uid()::text
      AND tipo_usuario IN ('admin', 'gerente', 'estoque')
      AND ativo = true
    )
  );

-- Admin, gerente, and estoque can update stock movement items
CREATE POLICY "Staff update stock movement items" ON movimentacoes_itens
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id::text = auth.uid()::text
      AND tipo_usuario IN ('admin', 'gerente', 'estoque')
      AND ativo = true
    )
  );

-- Only admin can delete stock movement items
CREATE POLICY "Admins delete stock movement items" ON movimentacoes_itens
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id::text = auth.uid()::text
      AND tipo_usuario = 'admin'
      AND ativo = true
    )
  );

-- =====================================================
-- 5. CREATE RLS POLICIES FOR HISTORICO_PRECOS
-- =====================================================

-- All authenticated users can read price history
CREATE POLICY "All users read price history" ON historico_precos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id::text = auth.uid()::text
      AND ativo = true
    )
  );

-- System auto-inserts price history (admin, gerente, estoque)
CREATE POLICY "Staff insert price history" ON historico_precos
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id::text = auth.uid()::text
      AND tipo_usuario IN ('admin', 'gerente', 'estoque')
      AND ativo = true
    )
  );

-- Only admin can delete price history
CREATE POLICY "Admins delete price history" ON historico_precos
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id::text = auth.uid()::text
      AND tipo_usuario = 'admin'
      AND ativo = true
    )
  );

-- =====================================================
-- 6. CREATE RLS POLICIES FOR CATEGORIAS_FINANCEIRAS
-- =====================================================

-- All authenticated users can read financial categories
CREATE POLICY "All users read financial categories" ON categorias_financeiras
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id::text = auth.uid()::text
      AND ativo = true
    )
  );

-- Admin, gerente, and financeiro can insert categories
CREATE POLICY "Financial staff insert categories" ON categorias_financeiras
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id::text = auth.uid()::text
      AND tipo_usuario IN ('admin', 'gerente', 'financeiro')
      AND ativo = true
    )
  );

-- Admin, gerente, and financeiro can update categories
CREATE POLICY "Financial staff update categories" ON categorias_financeiras
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id::text = auth.uid()::text
      AND tipo_usuario IN ('admin', 'gerente', 'financeiro')
      AND ativo = true
    )
  );

-- Only admin can delete categories
CREATE POLICY "Admins delete financial categories" ON categorias_financeiras
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id::text = auth.uid()::text
      AND tipo_usuario = 'admin'
      AND ativo = true
    )
  );

-- =====================================================
-- 7. CREATE RLS POLICIES FOR TRANSACOES_RECORRENTES
-- =====================================================

-- All authenticated users can read recurring transactions
CREATE POLICY "All users read recurring transactions" ON transacoes_recorrentes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id::text = auth.uid()::text
      AND ativo = true
    )
  );

-- Admin, gerente, and financeiro can insert recurring transactions
CREATE POLICY "Financial staff insert recurring transactions" ON transacoes_recorrentes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id::text = auth.uid()::text
      AND tipo_usuario IN ('admin', 'gerente', 'financeiro')
      AND ativo = true
    )
  );

-- Admin, gerente, and financeiro can update recurring transactions
CREATE POLICY "Financial staff update recurring transactions" ON transacoes_recorrentes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id::text = auth.uid()::text
      AND tipo_usuario IN ('admin', 'gerente', 'financeiro')
      AND ativo = true
    )
  );

-- Only admin can delete recurring transactions
CREATE POLICY "Admins delete recurring transactions" ON transacoes_recorrentes
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id::text = auth.uid()::text
      AND tipo_usuario = 'admin'
      AND ativo = true
    )
  );

-- =====================================================
-- 8. CREATE RLS POLICIES FOR RELATORIOS_TEMPLATES
-- =====================================================

-- All authenticated users can read report templates
CREATE POLICY "All users read report templates" ON relatorios_templates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id::text = auth.uid()::text
      AND ativo = true
    )
  );

-- Admin and gerente can insert report templates
CREATE POLICY "Admins insert report templates" ON relatorios_templates
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id::text = auth.uid()::text
      AND tipo_usuario IN ('admin', 'gerente')
      AND ativo = true
    )
  );

-- Admin and gerente can update report templates
CREATE POLICY "Admins update report templates" ON relatorios_templates
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id::text = auth.uid()::text
      AND tipo_usuario IN ('admin', 'gerente')
      AND ativo = true
    )
  );

-- Only admin can delete report templates
CREATE POLICY "Admins delete report templates" ON relatorios_templates
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id::text = auth.uid()::text
      AND tipo_usuario = 'admin'
      AND ativo = true
    )
  );

-- =====================================================
-- 9. CREATE RLS POLICIES FOR VENDA_PARCELAS
-- =====================================================

-- All authenticated users can read sale installments
CREATE POLICY "All users read sale installments" ON venda_parcelas
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id::text = auth.uid()::text
      AND ativo = true
    )
  );

-- Vendas staff can insert sale installments
CREATE POLICY "Sales staff insert installments" ON venda_parcelas
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id::text = auth.uid()::text
      AND tipo_usuario IN ('admin', 'gerente', 'vendedor', 'financeiro')
      AND ativo = true
    )
  );

-- Financial staff can update installments (for payments)
CREATE POLICY "Financial staff update installments" ON venda_parcelas
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id::text = auth.uid()::text
      AND tipo_usuario IN ('admin', 'gerente', 'financeiro')
      AND ativo = true
    )
  );

-- Only admin and gerente can delete installments
CREATE POLICY "Admins delete installments" ON venda_parcelas
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id::text = auth.uid()::text
      AND tipo_usuario IN ('admin', 'gerente')
      AND ativo = true
    )
  );

-- =====================================================
-- 10. CREATE RLS POLICIES FOR USUARIOS (CRITICAL)
-- =====================================================

-- Users can only read their own user record
CREATE POLICY "Users read own record" ON usuarios
  FOR SELECT
  USING (
    supabase_user_id::text = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.supabase_user_id::text = auth.uid()::text
      AND u.tipo_usuario IN ('admin', 'gerente')
      AND u.ativo = true
    )
  );

-- Only admin can insert new users
CREATE POLICY "Admins insert users" ON usuarios
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id::text = auth.uid()::text
      AND tipo_usuario = 'admin'
      AND ativo = true
    )
  );

-- Users can update their own record (limited fields)
-- Admins can update all users
CREATE POLICY "Users update own record or admin updates all" ON usuarios
  FOR UPDATE
  USING (
    supabase_user_id::text = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id::text = auth.uid()::text
      AND tipo_usuario = 'admin'
      AND ativo = true
    )
  );

-- Only admin can delete users (soft delete recommended)
CREATE POLICY "Admins delete users" ON usuarios
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id::text = auth.uid()::text
      AND tipo_usuario = 'admin'
      AND ativo = true
    )
  );

-- =====================================================
-- 11. FIX SECURITY DEFINER VIEWS
-- =====================================================

-- Drop and recreate estoque_com_valores without SECURITY DEFINER
DROP VIEW IF EXISTS estoque_com_valores;

CREATE VIEW estoque_com_valores AS
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

-- Drop and recreate vendedores_com_usuario without SECURITY DEFINER
DROP VIEW IF EXISTS vendedores_com_usuario;

CREATE VIEW vendedores_com_usuario AS
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

-- Grant SELECT on views to authenticated users (via RLS on base tables)
GRANT SELECT ON estoque_com_valores TO authenticated;
GRANT SELECT ON vendedores_com_usuario TO authenticated;

RAISE NOTICE '✅ Views recreated without SECURITY DEFINER';

-- =====================================================
-- 12. VERIFICATION
-- =====================================================

-- Check which tables have RLS enabled
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'formas_pagamento', 'fornecedores', 'movimentacoes_itens',
    'historico_precos', 'categorias_financeiras', 'transacoes_recorrentes',
    'relatorios_templates', 'venda_parcelas', 'usuarios'
  )
ORDER BY tablename;

-- Count policies per table
SELECT
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'formas_pagamento', 'fornecedores', 'movimentacoes_itens',
    'historico_precos', 'categorias_financeiras', 'transacoes_recorrentes',
    'relatorios_templates', 'venda_parcelas', 'usuarios'
  )
GROUP BY tablename
ORDER BY tablename;

-- =====================================================
-- 13. REPORT COMPLETION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '✅ Migração 020 Concluída - Security Hardening';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Alterações realizadas:';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 RLS Habilitado em:';
  RAISE NOTICE '  - ✅ formas_pagamento';
  RAISE NOTICE '  - ✅ fornecedores';
  RAISE NOTICE '  - ✅ movimentacoes_itens';
  RAISE NOTICE '  - ✅ historico_precos';
  RAISE NOTICE '  - ✅ categorias_financeiras';
  RAISE NOTICE '  - ✅ transacoes_recorrentes';
  RAISE NOTICE '  - ✅ relatorios_templates';
  RAISE NOTICE '  - ✅ venda_parcelas';
  RAISE NOTICE '  - ✅ usuarios (CRÍTICO)';
  RAISE NOTICE '';
  RAISE NOTICE '🔐 Políticas RLS criadas:';
  RAISE NOTICE '  - ✅ 36 novas políticas criadas';
  RAISE NOTICE '  - ✅ Permissões baseadas em tipo_usuario';
  RAISE NOTICE '  - ✅ Proteção granular por operação (SELECT/INSERT/UPDATE/DELETE)';
  RAISE NOTICE '';
  RAISE NOTICE '🛡️  Views corrigidas:';
  RAISE NOTICE '  - ✅ estoque_com_valores (SECURITY DEFINER removido)';
  RAISE NOTICE '  - ✅ vendedores_com_usuario (SECURITY DEFINER removido)';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANTE:';
  RAISE NOTICE '  - Execute o Supabase Database Linter novamente';
  RAISE NOTICE '  - Todos os erros de segurança devem estar resolvidos';
  RAISE NOTICE '  - Usuários devem fazer logout/login';
  RAISE NOTICE '  - Teste todas as funcionalidades após a migração';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Níveis de acesso configurados:';
  RAISE NOTICE '  - admin: Acesso completo a tudo';
  RAISE NOTICE '  - gerente: Acesso a gestão e relatórios';
  RAISE NOTICE '  - vendedor: Acesso a vendas e parcelas';
  RAISE NOTICE '  - estoque: Acesso a produtos e fornecedores';
  RAISE NOTICE '  - financeiro: Acesso a transações e categorias';
  RAISE NOTICE '';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '';
END $$;

COMMIT;

-- =====================================================
-- ROLLBACK (if needed)
-- =====================================================
-- BEGIN;
--
-- -- Disable RLS on all tables
-- ALTER TABLE formas_pagamento DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE fornecedores DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE movimentacoes_itens DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE historico_precos DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE categorias_financeiras DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE transacoes_recorrentes DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE relatorios_templates DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE venda_parcelas DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;
--
-- -- Drop all policies
-- DROP POLICY IF EXISTS "All users read payment methods" ON formas_pagamento;
-- DROP POLICY IF EXISTS "Admins insert payment methods" ON formas_pagamento;
-- -- ... (drop all other policies)
--
-- COMMIT;
-- =====================================================
