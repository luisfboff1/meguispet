-- Migration: 024 - Bling ERP Integration
-- Data: 2026-02-10
-- Descrição: Tabelas para integração com Bling ERP (OAuth tokens, vendas, NFe, log de sync)
-- Referência: docs/bling/PLANO_INTEGRACAO.md

-- =============================================
-- 1. bling_config - Configuração e Tokens OAuth
-- =============================================
CREATE TABLE IF NOT EXISTS bling_config (
  id SERIAL PRIMARY KEY,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  bling_company_id VARCHAR(50),
  scopes TEXT[],
  is_active BOOLEAN DEFAULT true,
  last_sync_vendas TIMESTAMPTZ,
  last_sync_nfe TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 2. bling_vendas - Pedidos de Venda do Bling
-- =============================================
CREATE TABLE IF NOT EXISTS bling_vendas (
  id SERIAL PRIMARY KEY,
  bling_id BIGINT UNIQUE NOT NULL,
  numero_pedido VARCHAR(50),
  numero_pedido_loja VARCHAR(100),
  data_pedido TIMESTAMPTZ,
  data_saida TIMESTAMPTZ,

  -- Contato/Cliente
  bling_contato_id BIGINT,
  contato_nome VARCHAR(255),
  contato_documento VARCHAR(20),
  contato_email VARCHAR(255),
  contato_telefone VARCHAR(50),

  -- Origem/Canal
  canal_venda VARCHAR(100),
  loja_id BIGINT,
  loja_nome VARCHAR(255),

  -- Valores
  total_produtos DECIMAL(10,2),
  total_desconto DECIMAL(10,2),
  total_frete DECIMAL(10,2),
  total_outras_despesas DECIMAL(10,2),
  valor_total DECIMAL(10,2),

  -- Pagamento
  forma_pagamento VARCHAR(100),

  -- Status
  situacao_id INTEGER,
  situacao_nome VARCHAR(100),

  -- Vendedor
  bling_vendedor_id BIGINT,
  vendedor_nome VARCHAR(255),

  -- Dados extras (JSON)
  endereco_entrega JSONB,
  transporte JSONB,

  -- Vinculações
  bling_nfe_id BIGINT,
  venda_local_id BIGINT REFERENCES vendas(id) ON DELETE SET NULL,

  -- Sync
  raw_data JSONB,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bling_vendas_bling_id ON bling_vendas(bling_id);
CREATE INDEX IF NOT EXISTS idx_bling_vendas_data ON bling_vendas(data_pedido);
CREATE INDEX IF NOT EXISTS idx_bling_vendas_canal ON bling_vendas(canal_venda);
CREATE INDEX IF NOT EXISTS idx_bling_vendas_situacao ON bling_vendas(situacao_id);

-- =============================================
-- 3. bling_vendas_itens - Itens dos Pedidos
-- =============================================
CREATE TABLE IF NOT EXISTS bling_vendas_itens (
  id SERIAL PRIMARY KEY,
  bling_venda_id INTEGER REFERENCES bling_vendas(id) ON DELETE CASCADE,
  bling_produto_id BIGINT,
  codigo_produto VARCHAR(100),
  descricao VARCHAR(500),
  quantidade DECIMAL(10,4),
  valor_unitario DECIMAL(10,4),
  valor_desconto DECIMAL(10,2),
  valor_total DECIMAL(10,2),
  produto_local_id BIGINT REFERENCES produtos(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_bling_vitens_venda ON bling_vendas_itens(bling_venda_id);

-- =============================================
-- 4. bling_nfe - Notas Fiscais do Bling
-- =============================================
CREATE TABLE IF NOT EXISTS bling_nfe (
  id SERIAL PRIMARY KEY,
  bling_id BIGINT UNIQUE NOT NULL,
  numero INTEGER,
  serie INTEGER,
  chave_acesso VARCHAR(44),

  tipo INTEGER,
  situacao INTEGER,
  situacao_nome VARCHAR(100),

  data_emissao TIMESTAMPTZ,
  data_operacao TIMESTAMPTZ,

  bling_contato_id BIGINT,
  contato_nome VARCHAR(255),
  contato_documento VARCHAR(20),

  valor_produtos DECIMAL(10,2),
  valor_frete DECIMAL(10,2),
  valor_icms DECIMAL(10,2),
  valor_ipi DECIMAL(10,2),
  valor_total DECIMAL(10,2),

  xml_url TEXT,
  danfe_url TEXT,

  bling_pedido_id BIGINT,
  bling_venda_id INTEGER REFERENCES bling_vendas(id) ON DELETE SET NULL,

  raw_data JSONB,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bling_nfe_bling_id ON bling_nfe(bling_id);
CREATE INDEX IF NOT EXISTS idx_bling_nfe_chave ON bling_nfe(chave_acesso);
CREATE INDEX IF NOT EXISTS idx_bling_nfe_situacao ON bling_nfe(situacao);
CREATE INDEX IF NOT EXISTS idx_bling_nfe_data ON bling_nfe(data_emissao);

-- =============================================
-- 5. bling_sync_log - Log de Sincronização
-- =============================================
CREATE TABLE IF NOT EXISTS bling_sync_log (
  id SERIAL PRIMARY KEY,
  tipo VARCHAR(20) NOT NULL,
  recurso VARCHAR(50) NOT NULL,
  bling_id BIGINT,
  acao VARCHAR(20),
  status VARCHAR(20) NOT NULL,
  erro_mensagem TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bling_sync_log_tipo ON bling_sync_log(tipo, created_at);

-- =============================================
-- RLS Policies (todas as tabelas Bling)
-- =============================================
ALTER TABLE bling_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE bling_vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE bling_vendas_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE bling_nfe ENABLE ROW LEVEL SECURITY;
ALTER TABLE bling_sync_log ENABLE ROW LEVEL SECURITY;

-- Bling config: apenas admin pode gerenciar tokens
CREATE POLICY bling_config_admin ON bling_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id = auth.uid()
      AND tipo_usuario = 'admin'
    )
  );

-- Bling vendas/nfe/itens: todos os usuários autenticados podem ler
CREATE POLICY bling_vendas_read ON bling_vendas
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY bling_vendas_write ON bling_vendas
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id = auth.uid()
      AND tipo_usuario IN ('admin', 'gerente')
    )
  );

CREATE POLICY bling_vitens_read ON bling_vendas_itens
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY bling_vitens_write ON bling_vendas_itens
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id = auth.uid()
      AND tipo_usuario IN ('admin', 'gerente')
    )
  );

CREATE POLICY bling_nfe_read ON bling_nfe
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY bling_nfe_write ON bling_nfe
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id = auth.uid()
      AND tipo_usuario IN ('admin', 'gerente')
    )
  );

CREATE POLICY bling_sync_log_read ON bling_sync_log
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY bling_sync_log_write ON bling_sync_log
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id = auth.uid()
      AND tipo_usuario IN ('admin', 'gerente')
    )
  );
