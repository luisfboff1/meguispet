-- ============================================================================
-- Migration 025 (FIX): Corrigir RLS das Tabelas de Mapeamento Bling
-- Data: 2026-02-12
-- Descrição: Remove e recria as políticas RLS corretamente
-- ============================================================================

-- ============================================================================
-- REMOVER POLÍTICAS ANTIGAS (se existirem)
-- ============================================================================

-- Remover políticas de bling_produtos_mapeamento
DROP POLICY IF EXISTS bling_mapeamento_read ON bling_produtos_mapeamento;
DROP POLICY IF EXISTS bling_mapeamento_write ON bling_produtos_mapeamento;
DROP POLICY IF EXISTS bling_mapeamento_insert ON bling_produtos_mapeamento;
DROP POLICY IF EXISTS bling_mapeamento_update ON bling_produtos_mapeamento;
DROP POLICY IF EXISTS bling_mapeamento_delete ON bling_produtos_mapeamento;

-- Remover políticas de bling_produtos_mapeamento_itens
DROP POLICY IF EXISTS bling_mapeamento_itens_read ON bling_produtos_mapeamento_itens;
DROP POLICY IF EXISTS bling_mapeamento_itens_write ON bling_produtos_mapeamento_itens;
DROP POLICY IF EXISTS bling_mapeamento_itens_insert ON bling_produtos_mapeamento_itens;
DROP POLICY IF EXISTS bling_mapeamento_itens_update ON bling_produtos_mapeamento_itens;
DROP POLICY IF EXISTS bling_mapeamento_itens_delete ON bling_produtos_mapeamento_itens;

-- ============================================================================
-- RECRIAR POLÍTICAS CORRETAS
-- ============================================================================

-- Garantir que RLS está habilitado
ALTER TABLE bling_produtos_mapeamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE bling_produtos_mapeamento_itens ENABLE ROW LEVEL SECURITY;

-- Políticas para bling_produtos_mapeamento
-- Leitura: qualquer usuário autenticado
CREATE POLICY bling_mapeamento_read ON bling_produtos_mapeamento
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Escrita: apenas admin e gerente
CREATE POLICY bling_mapeamento_insert ON bling_produtos_mapeamento
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id = auth.uid()
      AND tipo_usuario IN ('admin', 'gerente')
    )
  );

CREATE POLICY bling_mapeamento_update ON bling_produtos_mapeamento
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id = auth.uid()
      AND tipo_usuario IN ('admin', 'gerente')
    )
  );

CREATE POLICY bling_mapeamento_delete ON bling_produtos_mapeamento
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id = auth.uid()
      AND tipo_usuario IN ('admin', 'gerente')
    )
  );

-- Políticas para bling_produtos_mapeamento_itens
-- Leitura: qualquer usuário autenticado
CREATE POLICY bling_mapeamento_itens_read ON bling_produtos_mapeamento_itens
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Escrita: apenas admin e gerente
CREATE POLICY bling_mapeamento_itens_insert ON bling_produtos_mapeamento_itens
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id = auth.uid()
      AND tipo_usuario IN ('admin', 'gerente')
    )
  );

CREATE POLICY bling_mapeamento_itens_update ON bling_produtos_mapeamento_itens
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id = auth.uid()
      AND tipo_usuario IN ('admin', 'gerente')
    )
  );

CREATE POLICY bling_mapeamento_itens_delete ON bling_produtos_mapeamento_itens
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id = auth.uid()
      AND tipo_usuario IN ('admin', 'gerente')
    )
  );

-- ============================================================================
-- VERIFICAÇÃO
-- ============================================================================

-- Listar políticas criadas
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('bling_produtos_mapeamento', 'bling_produtos_mapeamento_itens')
ORDER BY tablename, policyname;
