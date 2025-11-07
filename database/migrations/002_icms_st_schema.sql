-- ============================================================================
-- MIGRATION 002: ICMS-ST System Implementation
-- ============================================================================
-- Description: Creates tables and functions for ICMS-ST tax calculation system
-- Author: System
-- Date: 2025-01-07
-- ============================================================================

-- ============================================================================
-- FUNCTION: update_updated_at_column (if not exists)
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TABLE: tabela_mva
-- ============================================================================
-- Stores MVA (Margem de Valor Agregado) and tax rates by state and NCM
-- ============================================================================
CREATE TABLE IF NOT EXISTS tabela_mva (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uf VARCHAR(2) NOT NULL,
  ncm VARCHAR(8) NOT NULL,
  descricao TEXT,
  aliquota_interna DECIMAL(5,4), -- Ex: 0.18 (18%)
  aliquota_fundo DECIMAL(5,4),   -- Ex: 0.02 (2%)
  aliquota_efetiva DECIMAL(5,4), -- Ex: 0.20 (20%)
  mva DECIMAL(6,4),              -- Ex: 0.7304 (73.04%)
  sujeito_st BOOLEAN DEFAULT true,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_uf_ncm UNIQUE (uf, ncm)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tabela_mva_uf ON tabela_mva(uf);
CREATE INDEX IF NOT EXISTS idx_tabela_mva_ncm ON tabela_mva(ncm);
CREATE INDEX IF NOT EXISTS idx_tabela_mva_ativo ON tabela_mva(ativo);
CREATE INDEX IF NOT EXISTS idx_tabela_mva_uf_ncm ON tabela_mva(uf, ncm);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_tabela_mva_updated_at ON tabela_mva;
CREATE TRIGGER update_tabela_mva_updated_at
  BEFORE UPDATE ON tabela_mva
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TABLE: impostos_produto
-- ============================================================================
-- Fiscal configuration per product
-- ============================================================================
CREATE TABLE IF NOT EXISTS impostos_produto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  ncm VARCHAR(8),
  cest VARCHAR(7),
  origem_mercadoria INTEGER DEFAULT 0, -- 0=Nacional, 1=Estrangeira
  uf_destino VARCHAR(2) DEFAULT 'SP', -- Default UF for calculation

  -- Relationship with tabela_mva
  tabela_mva_id UUID REFERENCES tabela_mva(id),

  -- Manual override (optional - if not using tabela_mva)
  mva_manual DECIMAL(6,4),
  aliquota_icms_manual DECIMAL(5,4),

  -- Additional values
  frete_padrao DECIMAL(10,2) DEFAULT 0,
  outras_despesas DECIMAL(10,2) DEFAULT 0,

  -- Control
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_produto_impostos UNIQUE (produto_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_impostos_produto_produto_id ON impostos_produto(produto_id);
CREATE INDEX IF NOT EXISTS idx_impostos_produto_ncm ON impostos_produto(ncm);
CREATE INDEX IF NOT EXISTS idx_impostos_produto_uf_destino ON impostos_produto(uf_destino);
CREATE INDEX IF NOT EXISTS idx_impostos_produto_tabela_mva_id ON impostos_produto(tabela_mva_id);

-- Trigger updated_at
DROP TRIGGER IF EXISTS update_impostos_produto_updated_at ON impostos_produto;
CREATE TRIGGER update_impostos_produto_updated_at
  BEFORE UPDATE ON impostos_produto
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TABLE: vendas_impostos
-- ============================================================================
-- Stores calculated taxes per sale (consolidated total)
-- ============================================================================
CREATE TABLE IF NOT EXISTS vendas_impostos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_id INTEGER NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,

  -- Total sale values
  valor_produtos DECIMAL(10,2) NOT NULL,
  valor_frete DECIMAL(10,2) DEFAULT 0,
  outras_despesas DECIMAL(10,2) DEFAULT 0,

  -- Tax totals
  total_base_calculo_st DECIMAL(10,2) DEFAULT 0,
  total_icms_proprio DECIMAL(10,2) DEFAULT 0,
  total_icms_st DECIMAL(10,2) DEFAULT 0,
  total_icms_recolher DECIMAL(10,2) DEFAULT 0,

  -- PDF display options
  exibir_no_pdf BOOLEAN DEFAULT true,
  exibir_detalhamento BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_venda_impostos UNIQUE (venda_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_vendas_impostos_venda_id ON vendas_impostos(venda_id);

-- Trigger updated_at
DROP TRIGGER IF EXISTS update_vendas_impostos_updated_at ON vendas_impostos;
CREATE TRIGGER update_vendas_impostos_updated_at
  BEFORE UPDATE ON vendas_impostos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ALTER TABLE: vendas_itens
-- ============================================================================
-- Add tax columns to sale items
-- ============================================================================
DO $$
BEGIN
  -- Add columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendas_itens' AND column_name='base_calculo_st') THEN
    ALTER TABLE vendas_itens ADD COLUMN base_calculo_st DECIMAL(10,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendas_itens' AND column_name='icms_proprio') THEN
    ALTER TABLE vendas_itens ADD COLUMN icms_proprio DECIMAL(10,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendas_itens' AND column_name='icms_st_total') THEN
    ALTER TABLE vendas_itens ADD COLUMN icms_st_total DECIMAL(10,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendas_itens' AND column_name='icms_st_recolher') THEN
    ALTER TABLE vendas_itens ADD COLUMN icms_st_recolher DECIMAL(10,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendas_itens' AND column_name='mva_aplicado') THEN
    ALTER TABLE vendas_itens ADD COLUMN mva_aplicado DECIMAL(6,4);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendas_itens' AND column_name='aliquota_icms') THEN
    ALTER TABLE vendas_itens ADD COLUMN aliquota_icms DECIMAL(5,4);
  END IF;
END $$;

-- Index for queries
CREATE INDEX IF NOT EXISTS idx_vendas_itens_venda_id ON vendas_itens(venda_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE tabela_mva ENABLE ROW LEVEL SECURITY;
ALTER TABLE impostos_produto ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendas_impostos ENABLE ROW LEVEL SECURITY;

-- Policies: Allow read for authenticated users
DROP POLICY IF EXISTS "Allow read tabela_mva" ON tabela_mva;
CREATE POLICY "Allow read tabela_mva" ON tabela_mva
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow insert tabela_mva" ON tabela_mva;
CREATE POLICY "Allow insert tabela_mva" ON tabela_mva
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow update tabela_mva" ON tabela_mva;
CREATE POLICY "Allow update tabela_mva" ON tabela_mva
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow delete tabela_mva" ON tabela_mva;
CREATE POLICY "Allow delete tabela_mva" ON tabela_mva
  FOR DELETE USING (auth.role() = 'authenticated');

-- Policies for impostos_produto
DROP POLICY IF EXISTS "Allow all impostos_produto" ON impostos_produto;
CREATE POLICY "Allow all impostos_produto" ON impostos_produto
  FOR ALL USING (auth.role() = 'authenticated');

-- Policies for vendas_impostos
DROP POLICY IF EXISTS "Allow all vendas_impostos" ON vendas_impostos;
CREATE POLICY "Allow all vendas_impostos" ON vendas_impostos
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE tabela_mva IS 'Tabela de MVA (Margem de Valor Agregado) e alíquotas por UF e NCM';
COMMENT ON TABLE impostos_produto IS 'Configuração fiscal por produto (NCM, CEST, MVA, etc)';
COMMENT ON TABLE vendas_impostos IS 'Impostos calculados por venda (totalizadores)';
COMMENT ON COLUMN vendas_itens.base_calculo_st IS 'Base de cálculo do ICMS-ST para o item';
COMMENT ON COLUMN vendas_itens.icms_proprio IS 'ICMS próprio do item';
COMMENT ON COLUMN vendas_itens.icms_st_total IS 'ICMS-ST total do item';
COMMENT ON COLUMN vendas_itens.icms_st_recolher IS 'ICMS-ST a recolher do item';
COMMENT ON COLUMN vendas_itens.mva_aplicado IS 'MVA aplicado no cálculo do item';
COMMENT ON COLUMN vendas_itens.aliquota_icms IS 'Alíquota de ICMS aplicada no item';
