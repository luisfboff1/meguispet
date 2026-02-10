-- Migration: 025 - Bling Integration Extras
-- Data: 2026-02-10
-- Descrição: Colunas adicionais para bling_vendas e bling_nfe + tabela bling_nfe_itens
-- Motivo: Campos úteis identificados na análise do OpenAPI spec do Bling

-- =============================================
-- 1. Colunas extras em bling_vendas
-- =============================================
ALTER TABLE bling_vendas ADD COLUMN IF NOT EXISTS observacoes TEXT;
ALTER TABLE bling_vendas ADD COLUMN IF NOT EXISTS observacoes_internas TEXT;
ALTER TABLE bling_vendas ADD COLUMN IF NOT EXISTS intermediador_cnpj VARCHAR(20);
ALTER TABLE bling_vendas ADD COLUMN IF NOT EXISTS intermediador_usuario VARCHAR(255);
ALTER TABLE bling_vendas ADD COLUMN IF NOT EXISTS taxa_comissao DECIMAL(10,2);
ALTER TABLE bling_vendas ADD COLUMN IF NOT EXISTS custo_frete_marketplace DECIMAL(10,2);

-- =============================================
-- 2. Colunas extras em bling_nfe
-- =============================================
ALTER TABLE bling_nfe ADD COLUMN IF NOT EXISTS finalidade INTEGER;
ALTER TABLE bling_nfe ADD COLUMN IF NOT EXISTS pdf_url TEXT;
ALTER TABLE bling_nfe ADD COLUMN IF NOT EXISTS contato_endereco JSONB;

-- =============================================
-- 3. Nova tabela: bling_nfe_itens
-- =============================================
CREATE TABLE IF NOT EXISTS bling_nfe_itens (
  id SERIAL PRIMARY KEY,
  bling_nfe_id INTEGER REFERENCES bling_nfe(id) ON DELETE CASCADE,
  codigo VARCHAR(100),
  descricao VARCHAR(500),
  unidade VARCHAR(10),
  quantidade DECIMAL(10,4),
  valor_unitario DECIMAL(10,4),
  valor_total DECIMAL(10,2),
  tipo CHAR(1),
  ncm VARCHAR(20),
  cfop VARCHAR(10),
  origem INTEGER,
  gtin VARCHAR(20),
  impostos JSONB,
  produto_local_id BIGINT REFERENCES produtos(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_bling_nfe_itens_nfe ON bling_nfe_itens(bling_nfe_id);

-- RLS
ALTER TABLE bling_nfe_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY bling_nfe_itens_read ON bling_nfe_itens
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY bling_nfe_itens_write ON bling_nfe_itens
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id = auth.uid()
      AND tipo_usuario IN ('admin', 'gerente')
    )
  );
