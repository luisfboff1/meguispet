-- ============================================================================
-- Migration 025: Criar Tabelas de Mapeamento Produtos Bling → Produtos Locais
-- Data: 2026-02-12
-- Descrição: Schema para mapear produtos do Bling com produtos locais (N:N)
-- ============================================================================

-- Tabela principal: registra cada produto do Bling que precisa ser mapeado
CREATE TABLE IF NOT EXISTS bling_produtos_mapeamento (
  id SERIAL PRIMARY KEY,
  bling_produto_id BIGINT,           -- ID do produto no Bling (quando disponível)
  codigo VARCHAR(100),               -- Código do produto no Bling
  descricao TEXT NOT NULL,           -- Descrição do produto no Bling
  observacoes TEXT,                  -- Notas sobre o mapeamento
  ativo BOOLEAN DEFAULT true,        -- Se o mapeamento está ativo
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bling_produto_id),
  UNIQUE(codigo)
);

-- Tabela de itens: permite N produtos locais para 1 produto Bling
CREATE TABLE IF NOT EXISTS bling_produtos_mapeamento_itens (
  id SERIAL PRIMARY KEY,
  mapeamento_id INTEGER NOT NULL REFERENCES bling_produtos_mapeamento(id) ON DELETE CASCADE,
  produto_local_id BIGINT NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  quantidade DECIMAL(10,4) NOT NULL CHECK (quantidade > 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_bling_mapeamento_bling_id ON bling_produtos_mapeamento(bling_produto_id);
CREATE INDEX IF NOT EXISTS idx_bling_mapeamento_codigo ON bling_produtos_mapeamento(codigo);
CREATE INDEX IF NOT EXISTS idx_bling_mapeamento_itens_map ON bling_produtos_mapeamento_itens(mapeamento_id);
CREATE INDEX IF NOT EXISTS idx_bling_mapeamento_itens_produto ON bling_produtos_mapeamento_itens(produto_local_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Habilitar RLS
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
-- TRIGGER: Updated_at automático
-- ============================================================================

CREATE OR REPLACE FUNCTION update_bling_mapeamento_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_bling_mapeamento_updated_at
  BEFORE UPDATE ON bling_produtos_mapeamento
  FOR EACH ROW
  EXECUTE FUNCTION update_bling_mapeamento_updated_at();
