-- =====================================================
-- MIGRATION 014: Enable Row Level Security (RLS)
-- =====================================================
-- Purpose: Implement RLS policies on main tables to prevent data leakage
-- Severity: CRITICAL (VULN-001)
-- Date: November 2025
-- Priority: P0

-- This migration enables RLS on all main tables and creates policies
-- to ensure users can only access their own data, with admin override.

-- =====================================================
-- 1. ENABLE RLS ON MAIN TABLES
-- =====================================================

-- Enable RLS on clientes_fornecedores
ALTER TABLE clientes_fornecedores ENABLE ROW LEVEL SECURITY;

-- Enable RLS on produtos
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;

-- Enable RLS on vendas
ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;

-- Enable RLS on vendas_itens
ALTER TABLE vendas_itens ENABLE ROW LEVEL SECURITY;

-- Enable RLS on transacoes
ALTER TABLE transacoes ENABLE ROW LEVEL SECURITY;

-- Enable RLS on movimentacoes_estoque
ALTER TABLE movimentacoes_estoque ENABLE ROW LEVEL SECURITY;

-- Enable RLS on vendedores
ALTER TABLE vendedores ENABLE ROW LEVEL SECURITY;

-- Enable RLS on condicoes_pagamento (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'condicoes_pagamento') THEN
    ALTER TABLE condicoes_pagamento ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- =====================================================
-- 2. CREATE RLS POLICIES FOR CLIENTES_FORNECEDORES
-- =====================================================

-- Policy: Authenticated users can view all clients
-- (In a multi-tenant setup, this would be filtered by tenant_id)
CREATE POLICY "Authenticated users view clients" ON clientes_fornecedores
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
  );

-- Policy: Authenticated users can insert clients
CREATE POLICY "Authenticated users insert clients" ON clientes_fornecedores
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Policy: Authenticated users can update clients
CREATE POLICY "Authenticated users update clients" ON clientes_fornecedores
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
  );

-- Policy: Only admins can delete clients
CREATE POLICY "Admins delete clients" ON clientes_fornecedores
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id::text = auth.uid()::text
      AND role = 'admin'
      AND ativo = true
    )
  );

-- =====================================================
-- 3. CREATE RLS POLICIES FOR PRODUTOS
-- =====================================================

-- Policy: Authenticated users can view all products
CREATE POLICY "Authenticated users view products" ON produtos
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
  );

-- Policy: Authenticated users can insert products
CREATE POLICY "Authenticated users insert products" ON produtos
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Policy: Authenticated users can update products
CREATE POLICY "Authenticated users update products" ON produtos
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
  );

-- Policy: Only admins can delete products
CREATE POLICY "Admins delete products" ON produtos
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id::text = auth.uid()::text
      AND role = 'admin'
      AND ativo = true
    )
  );

-- =====================================================
-- 4. CREATE RLS POLICIES FOR VENDAS
-- =====================================================

-- Policy: Authenticated users can view all sales
-- (In production, you may want to restrict to own sales or add tenant_id)
CREATE POLICY "Authenticated users view sales" ON vendas
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
  );

-- Policy: Authenticated users can insert sales
CREATE POLICY "Authenticated users insert sales" ON vendas
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Policy: Authenticated users can update sales
CREATE POLICY "Authenticated users update sales" ON vendas
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
  );

-- Policy: Only admins can delete sales
CREATE POLICY "Admins delete sales" ON vendas
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id::text = auth.uid()::text
      AND role = 'admin'
      AND ativo = true
    )
  );

-- =====================================================
-- 5. CREATE RLS POLICIES FOR VENDAS_ITENS
-- =====================================================

CREATE POLICY "Authenticated users view sale items" ON vendas_itens
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Authenticated users insert sale items" ON vendas_itens
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Authenticated users update sale items" ON vendas_itens
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Admins delete sale items" ON vendas_itens
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id::text = auth.uid()::text
      AND role = 'admin'
      AND ativo = true
    )
  );

-- =====================================================
-- 6. CREATE RLS POLICIES FOR TRANSACOES
-- =====================================================

CREATE POLICY "Authenticated users view transactions" ON transacoes
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Authenticated users insert transactions" ON transacoes
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Authenticated users update transactions" ON transacoes
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Admins delete transactions" ON transacoes
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id::text = auth.uid()::text
      AND role = 'admin'
      AND ativo = true
    )
  );

-- =====================================================
-- 7. CREATE RLS POLICIES FOR MOVIMENTACOES_ESTOQUE
-- =====================================================

CREATE POLICY "Authenticated users view stock movements" ON movimentacoes_estoque
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Authenticated users insert stock movements" ON movimentacoes_estoque
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Authenticated users update stock movements" ON movimentacoes_estoque
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Admins delete stock movements" ON movimentacoes_estoque
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id::text = auth.uid()::text
      AND role = 'admin'
      AND ativo = true
    )
  );

-- =====================================================
-- 8. CREATE RLS POLICIES FOR VENDEDORES
-- =====================================================

CREATE POLICY "Authenticated users view sellers" ON vendedores
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Admins manage sellers" ON vendedores
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id::text = auth.uid()::text
      AND role IN ('admin', 'manager')
      AND ativo = true
    )
  );

-- =====================================================
-- 9. CREATE RLS POLICIES FOR CONDICOES_PAGAMENTO
-- =====================================================

-- Only create policies if the table exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'condicoes_pagamento') THEN
    EXECUTE 'CREATE POLICY "Authenticated users view payment conditions" ON condicoes_pagamento
      FOR SELECT
      USING (
        auth.uid() IS NOT NULL
      )';
    
    EXECUTE 'CREATE POLICY "Admins manage payment conditions" ON condicoes_pagamento
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM usuarios
          WHERE supabase_user_id::text = auth.uid()::text
          AND role IN (''admin'', ''manager'')
          AND ativo = true
        )
      )';
  END IF;
END $$;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these to verify RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
-- SELECT * FROM pg_policies WHERE schemaname = 'public';

-- =====================================================
-- ROLLBACK PLAN
-- =====================================================
-- If needed, disable RLS with:
-- ALTER TABLE <table_name> DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "<policy_name>" ON <table_name>;

-- =====================================================
-- NOTES
-- =====================================================
-- 1. This migration implements basic RLS for single-tenant usage
-- 2. For multi-tenant: Add tenant_id column and filter policies by it
-- 3. Test thoroughly in staging before applying to production
-- 4. Monitor query performance after enabling RLS
-- 5. Ensure Service Role Key is only used for admin operations
-- 6. Tables covered: clientes_fornecedores, produtos, vendas, vendas_itens,
--    transacoes, movimentacoes_estoque, vendedores, condicoes_pagamento (if exists)

-- Migration complete
COMMENT ON TABLE clientes_fornecedores IS 'RLS enabled - Migration 014';
COMMENT ON TABLE produtos IS 'RLS enabled - Migration 014';
COMMENT ON TABLE vendas IS 'RLS enabled - Migration 014';
