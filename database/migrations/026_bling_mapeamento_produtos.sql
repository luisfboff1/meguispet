-- Migration: Mapeamento de Produtos Bling → Produtos Locais
-- Data: 2026-02-11
-- Descrição: Sistema para vincular produtos do Bling com produtos locais do sistema

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
  CONSTRAINT unique_bling_produto_id UNIQUE(bling_produto_id),
  CONSTRAINT unique_codigo UNIQUE(codigo)
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
CREATE INDEX IF NOT EXISTS idx_bling_mapeamento_ativo ON bling_produtos_mapeamento(ativo);
CREATE INDEX IF NOT EXISTS idx_bling_mapeamento_itens_map ON bling_produtos_mapeamento_itens(mapeamento_id);
CREATE INDEX IF NOT EXISTS idx_bling_mapeamento_itens_produto ON bling_produtos_mapeamento_itens(produto_local_id);

-- RLS (Row Level Security)
ALTER TABLE bling_produtos_mapeamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE bling_produtos_mapeamento_itens ENABLE ROW LEVEL SECURITY;

-- Policy de leitura: todos usuários autenticados podem ler
DROP POLICY IF EXISTS bling_mapeamento_read ON bling_produtos_mapeamento;
CREATE POLICY bling_mapeamento_read ON bling_produtos_mapeamento
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Policy de escrita: apenas admin e gerente podem modificar
DROP POLICY IF EXISTS bling_mapeamento_write ON bling_produtos_mapeamento;
CREATE POLICY bling_mapeamento_write ON bling_produtos_mapeamento
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id = auth.uid()
      AND tipo_usuario IN ('admin', 'gerente')
    )
  );

-- Policy de leitura para itens: todos usuários autenticados podem ler
DROP POLICY IF EXISTS bling_mapeamento_itens_read ON bling_produtos_mapeamento_itens;
CREATE POLICY bling_mapeamento_itens_read ON bling_produtos_mapeamento_itens
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Policy de escrita para itens: apenas admin e gerente podem modificar
DROP POLICY IF EXISTS bling_mapeamento_itens_write ON bling_produtos_mapeamento_itens;
CREATE POLICY bling_mapeamento_itens_write ON bling_produtos_mapeamento_itens
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE supabase_user_id = auth.uid()
      AND tipo_usuario IN ('admin', 'gerente')
    )
  );

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_bling_mapeamento_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_bling_mapeamento_updated_at ON bling_produtos_mapeamento;
CREATE TRIGGER trigger_update_bling_mapeamento_updated_at
  BEFORE UPDATE ON bling_produtos_mapeamento
  FOR EACH ROW
  EXECUTE FUNCTION update_bling_mapeamento_updated_at();

-- Comentários nas tabelas
COMMENT ON TABLE bling_produtos_mapeamento IS 'Mapeamento de produtos do Bling para produtos locais do sistema';
COMMENT ON TABLE bling_produtos_mapeamento_itens IS 'Itens do mapeamento: um produto Bling pode corresponder a múltiplos produtos locais';
COMMENT ON COLUMN bling_produtos_mapeamento.bling_produto_id IS 'ID do produto no sistema Bling';
COMMENT ON COLUMN bling_produtos_mapeamento.codigo IS 'Código/SKU do produto no Bling';
COMMENT ON COLUMN bling_produtos_mapeamento_itens.quantidade IS 'Quantidade do produto local que corresponde ao produto Bling (ex: 1 kit = 10 sachês)';
