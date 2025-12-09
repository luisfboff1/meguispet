-- =====================================================
-- MIGRATION: Tabela de Configuração de Permissões por Role
-- Data: 2025-11-30
-- Descrição: Cria tabela para armazenar configurações
--            customizadas de permissões para cada tipo de usuário
-- =====================================================

-- Criar tabela role_permissions_config
CREATE TABLE IF NOT EXISTS role_permissions_config (
  role TEXT PRIMARY KEY,
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by INTEGER REFERENCES usuarios(id),
  
  -- Constraints
  CONSTRAINT valid_role CHECK (
    role IN ('admin', 'gerente', 'vendedor', 'financeiro', 'estoque', 'operador', 'visualizador')
  )
);

-- Comentários
COMMENT ON TABLE role_permissions_config IS 'Configurações customizadas de permissões por tipo de usuário (role)';
COMMENT ON COLUMN role_permissions_config.role IS 'Tipo de usuário (role)';
COMMENT ON COLUMN role_permissions_config.permissions IS 'Objeto JSON com permissões do role (sobrescreve presets do código)';
COMMENT ON COLUMN role_permissions_config.updated_at IS 'Data da última atualização';
COMMENT ON COLUMN role_permissions_config.updated_by IS 'ID do admin que fez a última atualização';

-- Índices
CREATE INDEX IF NOT EXISTS idx_role_permissions_config_updated_at 
ON role_permissions_config(updated_at DESC);

-- RLS (Row Level Security)
ALTER TABLE role_permissions_config ENABLE ROW LEVEL SECURITY;

-- Policy: Apenas admins podem ler
CREATE POLICY "Admins can read role configs"
  ON role_permissions_config
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.supabase_user_id = auth.uid()
      AND usuarios.tipo_usuario = 'admin'
    )
  );

-- Policy: Apenas admins podem inserir/atualizar
CREATE POLICY "Admins can manage role configs"
  ON role_permissions_config
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.supabase_user_id = auth.uid()
      AND usuarios.tipo_usuario = 'admin'
    )
  );

-- =====================================================
-- FUNÇÃO: Atualizar timestamp automaticamente
-- =====================================================
CREATE OR REPLACE FUNCTION update_role_permissions_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS trigger_update_role_permissions_config_timestamp ON role_permissions_config;
CREATE TRIGGER trigger_update_role_permissions_config_timestamp
  BEFORE UPDATE ON role_permissions_config
  FOR EACH ROW
  EXECUTE FUNCTION update_role_permissions_config_timestamp();

-- =====================================================
-- POPULAR COM DADOS INICIAIS (OPCIONAL)
-- =====================================================
-- Você pode inserir configurações padrão aqui se desejar
-- Por padrão, a API usará os presets do código TypeScript

-- Exemplo: Customizar permissões do vendedor
-- INSERT INTO role_permissions_config (role, permissions) 
-- VALUES ('vendedor', '{
--   "dashboard": true,
--   "vendas": true,
--   "vendas_criar": true,
--   "vendas_editar": true,
--   "vendas_visualizar_todas": false
-- }'::jsonb)
-- ON CONFLICT (role) DO NOTHING;

COMMIT;
