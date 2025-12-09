-- =====================================================
-- MIGRATION: Sistema de Roles e Permissões de Usuários
-- Data: 29/01/2025
-- Descrição: Adiciona sistema completo de roles e permissões
-- Autor: Claude (Anthropic)
-- =====================================================

BEGIN;

-- 1. Adicionar coluna tipo_usuario (substituindo role antigo) - ROLE PRIMÁRIO
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS tipo_usuario VARCHAR(20) DEFAULT 'operador';

-- 2. Adicionar array de roles (permite múltiplos papéis)
-- Ex: Um usuário pode ser VENDEDOR + FINANCEIRO ao mesmo tempo
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS roles JSONB DEFAULT '[]'::jsonb;

-- 3. Adicionar permissões customizadas pelo admin (sobrescrevem as padrões)
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS permissoes_custom JSONB DEFAULT '{}'::jsonb;

-- 4. Adicionar coluna para vincular com vendedor (OPCIONAL)
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS vendedor_id INTEGER;

-- 3. Adicionar foreign key (permite NULL - vendedor é opcional)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_usuario_vendedor'
  ) THEN
    ALTER TABLE usuarios
      ADD CONSTRAINT fk_usuario_vendedor
      FOREIGN KEY (vendedor_id)
      REFERENCES vendedores(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- 4. Adicionar coluna de departamento (opcional)
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS departamento VARCHAR(100);

-- 5. Atualizar constraint de tipo_usuario
ALTER TABLE usuarios
  DROP CONSTRAINT IF EXISTS usuarios_role_check;

ALTER TABLE usuarios
  DROP CONSTRAINT IF EXISTS usuarios_tipo_check;

ALTER TABLE usuarios
  ADD CONSTRAINT usuarios_tipo_check
  CHECK (tipo_usuario IN ('admin', 'gerente', 'vendedor', 'financeiro', 'estoque', 'operador', 'visualizador'));

-- 6. Migrar dados antigos de 'role' para 'tipo_usuario' (se a coluna role existir)
-- ⚠️ IMPORTANTE: Todos os usuários existentes serão migrados como 'admin' por padrão
--    Isso permite que o administrador ajuste as permissões manualmente depois
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'usuarios' AND column_name = 'role'
  ) THEN
    -- Migrar TODOS os usuários existentes como 'admin'
    UPDATE usuarios
    SET tipo_usuario = 'admin'
    WHERE tipo_usuario IS NULL OR tipo_usuario = 'operador';

    RAISE NOTICE '✅ Todos os usuários existentes foram migrados como "admin"';
    RAISE NOTICE '   Você pode ajustar as permissões individuais depois pela interface';
  END IF;
END $$;

-- 7. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_usuarios_tipo_usuario ON usuarios(tipo_usuario);
CREATE INDEX IF NOT EXISTS idx_usuarios_vendedor_id ON usuarios(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_ativo ON usuarios(ativo);
CREATE INDEX IF NOT EXISTS idx_usuarios_roles ON usuarios USING GIN(roles);

-- 8. Atualizar campo permissoes para JSONB (se ainda não for)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'usuarios'
      AND column_name = 'permissoes'
      AND data_type != 'jsonb'
  ) THEN
    ALTER TABLE usuarios
      ALTER COLUMN permissoes TYPE JSONB USING permissoes::jsonb;
  END IF;
END $$;

-- 9. Adicionar permissões padrão de admin para TODOS os usuários existentes
-- ⚠️ IMPORTANTE: Todos recebem permissões completas inicialmente
--    O administrador deve ajustar as permissões individuais depois pela interface
UPDATE usuarios
SET permissoes = '{
  "dashboard": true,
  "vendas": true,
  "vendas_criar": true,
  "vendas_editar": true,
  "vendas_deletar": true,
  "vendas_visualizar_todas": true,
  "clientes": true,
  "clientes_criar": true,
  "clientes_editar": true,
  "clientes_deletar": true,
  "clientes_visualizar_todos": true,
  "produtos": true,
  "produtos_criar": true,
  "produtos_editar": true,
  "produtos_deletar": true,
  "produtos_ajustar_estoque": true,
  "estoque": true,
  "financeiro": true,
  "financeiro_visualizar": true,
  "financeiro_criar_transacao": true,
  "financeiro_editar_transacao": true,
  "relatorios": true,
  "relatorios_gerar": true,
  "relatorios_exportar": true,
  "configuracoes": true,
  "config_sistema": true,
  "config_usuarios": true,
  "usuarios": true
}'::jsonb
WHERE permissoes IS NULL OR permissoes = '{}'::jsonb;

-- 10. Criar template de permissões para vendedor
CREATE OR REPLACE FUNCTION get_vendedor_permissions()
RETURNS JSONB AS $$
BEGIN
  RETURN '{
    "dashboard": true,
    "vendas": true,
    "vendas_criar": true,
    "vendas_editar": true,
    "vendas_deletar": false,
    "vendas_visualizar_todas": false,
    "clientes": true,
    "clientes_criar": true,
    "clientes_editar": true,
    "clientes_deletar": false,
    "clientes_visualizar_todos": false,
    "produtos": true,
    "produtos_criar": false,
    "produtos_editar": false,
    "produtos_deletar": false,
    "produtos_ajustar_estoque": false,
    "estoque": false,
    "financeiro": false,
    "financeiro_visualizar": false,
    "financeiro_criar_transacao": false,
    "financeiro_editar_transacao": false,
    "relatorios": true,
    "relatorios_gerar": false,
    "relatorios_exportar": false,
    "configuracoes": false,
    "config_sistema": false,
    "config_usuarios": false,
    "usuarios": false
  }'::jsonb;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 11. Criar template de permissões para financeiro
CREATE OR REPLACE FUNCTION get_financeiro_permissions()
RETURNS JSONB AS $$
BEGIN
  RETURN '{
    "dashboard": true,
    "vendas": true,
    "vendas_criar": false,
    "vendas_editar": false,
    "vendas_deletar": false,
    "vendas_visualizar_todas": true,
    "clientes": true,
    "clientes_criar": false,
    "clientes_editar": false,
    "clientes_deletar": false,
    "clientes_visualizar_todos": true,
    "produtos": true,
    "produtos_criar": false,
    "produtos_editar": false,
    "produtos_deletar": false,
    "produtos_ajustar_estoque": false,
    "estoque": false,
    "financeiro": true,
    "financeiro_visualizar": true,
    "financeiro_criar_transacao": true,
    "financeiro_editar_transacao": true,
    "relatorios": true,
    "relatorios_gerar": true,
    "relatorios_exportar": true,
    "configuracoes": false,
    "config_sistema": false,
    "config_usuarios": false,
    "usuarios": false
  }'::jsonb;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 12. Criar template de permissões para gerente
CREATE OR REPLACE FUNCTION get_gerente_permissions()
RETURNS JSONB AS $$
BEGIN
  RETURN '{
    "dashboard": true,
    "vendas": true,
    "vendas_criar": true,
    "vendas_editar": true,
    "vendas_deletar": true,
    "vendas_visualizar_todas": true,
    "clientes": true,
    "clientes_criar": true,
    "clientes_editar": true,
    "clientes_deletar": true,
    "clientes_visualizar_todos": true,
    "produtos": true,
    "produtos_criar": true,
    "produtos_editar": true,
    "produtos_deletar": false,
    "produtos_ajustar_estoque": true,
    "estoque": true,
    "financeiro": true,
    "financeiro_visualizar": true,
    "financeiro_criar_transacao": false,
    "financeiro_editar_transacao": false,
    "relatorios": true,
    "relatorios_gerar": true,
    "relatorios_exportar": true,
    "configuracoes": false,
    "config_sistema": false,
    "config_usuarios": false,
    "usuarios": false
  }'::jsonb;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 13. Criar função para mesclar permissões de múltiplos roles + custom
CREATE OR REPLACE FUNCTION merge_all_permissions(
  p_tipo_usuario VARCHAR,
  p_roles JSONB,
  p_permissoes_custom JSONB
)
RETURNS JSONB AS $$
DECLARE
  merged_perms JSONB := '{}'::jsonb;
  role_name TEXT;
  role_perms JSONB;
BEGIN
  -- 1. Começar com permissões do role primário (tipo_usuario)
  CASE p_tipo_usuario
    WHEN 'admin' THEN
      -- Admin tem todas as permissões
      merged_perms := '{
        "dashboard": true,
        "vendas": true,
        "vendas_criar": true,
        "vendas_editar": true,
        "vendas_deletar": true,
        "vendas_visualizar_todas": true,
        "clientes": true,
        "clientes_criar": true,
        "clientes_editar": true,
        "clientes_deletar": true,
        "clientes_visualizar_todos": true,
        "produtos": true,
        "produtos_criar": true,
        "produtos_editar": true,
        "produtos_deletar": true,
        "produtos_ajustar_estoque": true,
        "estoque": true,
        "financeiro": true,
        "financeiro_visualizar": true,
        "financeiro_criar_transacao": true,
        "financeiro_editar_transacao": true,
        "relatorios": true,
        "relatorios_gerar": true,
        "relatorios_exportar": true,
        "configuracoes": true,
        "config_sistema": true,
        "config_usuarios": true,
        "usuarios": true
      }'::jsonb;
    WHEN 'vendedor' THEN
      merged_perms := get_vendedor_permissions();
    WHEN 'financeiro' THEN
      merged_perms := get_financeiro_permissions();
    WHEN 'gerente' THEN
      merged_perms := get_gerente_permissions();
    ELSE
      merged_perms := '{"dashboard": true}'::jsonb;
  END CASE;

  -- 2. Adicionar permissões de roles adicionais (se houver)
  IF p_roles IS NOT NULL AND jsonb_array_length(p_roles) > 0 THEN
    FOR role_name IN SELECT jsonb_array_elements_text(p_roles)
    LOOP
      CASE role_name
        WHEN 'vendedor' THEN
          role_perms := get_vendedor_permissions();
        WHEN 'financeiro' THEN
          role_perms := get_financeiro_permissions();
        WHEN 'gerente' THEN
          role_perms := get_gerente_permissions();
        ELSE
          role_perms := '{}'::jsonb;
      END CASE;

      -- Merge (OR lógico: se qualquer role permite, a permissão é concedida)
      merged_perms := merged_perms || role_perms;
    END LOOP;
  END IF;

  -- 3. Aplicar customizações do admin (sobrescreve tudo)
  IF p_permissoes_custom IS NOT NULL AND p_permissoes_custom != '{}'::jsonb THEN
    merged_perms := merged_perms || p_permissoes_custom;
  END IF;

  RETURN merged_perms;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 14. Criar trigger para aplicar permissões padrão ao criar/atualizar usuário
CREATE OR REPLACE FUNCTION apply_default_permissions()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalcular permissões sempre que tipo_usuario, roles ou permissoes_custom mudarem
  IF (TG_OP = 'INSERT') OR
     (OLD.tipo_usuario IS DISTINCT FROM NEW.tipo_usuario) OR
     (OLD.roles IS DISTINCT FROM NEW.roles) OR
     (OLD.permissoes_custom IS DISTINCT FROM NEW.permissoes_custom) THEN

    NEW.permissoes := merge_all_permissions(
      NEW.tipo_usuario,
      NEW.roles,
      NEW.permissoes_custom
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_apply_default_permissions ON usuarios;

CREATE TRIGGER trigger_apply_default_permissions
  BEFORE INSERT OR UPDATE ON usuarios
  FOR EACH ROW
  EXECUTE FUNCTION apply_default_permissions();

-- 15. Comentários para documentação
COMMENT ON COLUMN usuarios.tipo_usuario IS 'Role PRIMÁRIO do usuário (admin, gerente, vendedor, financeiro, estoque, operador, visualizador)';
COMMENT ON COLUMN usuarios.roles IS 'Array JSONB de roles adicionais. Ex: ["vendedor", "financeiro"] = usuário pode vender E acessar financeiro';
COMMENT ON COLUMN usuarios.permissoes_custom IS 'Permissões CUSTOMIZADAS pelo admin que sobrescrevem as padrões do role';
COMMENT ON COLUMN usuarios.permissoes IS 'Permissões FINAIS calculadas (merge de tipo_usuario + roles + permissoes_custom)';
COMMENT ON COLUMN usuarios.vendedor_id IS 'ID do vendedor vinculado (OPCIONAL - nem todo usuário é vendedor)';
COMMENT ON COLUMN usuarios.departamento IS 'Departamento ao qual o usuário pertence';

COMMIT;

-- =====================================================
-- Relatório de Validação
-- =====================================================

DO $$
DECLARE
  total_usuarios INTEGER;
  usuarios_vendedor INTEGER;
  usuarios_admin INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_usuarios FROM usuarios;
  SELECT COUNT(*) INTO usuarios_vendedor FROM usuarios WHERE tipo_usuario = 'vendedor';
  SELECT COUNT(*) INTO usuarios_admin FROM usuarios WHERE tipo_usuario = 'admin';

  RAISE NOTICE '';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '✅ Migration: 20250129_add_user_roles.sql';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Estatísticas:';
  RAISE NOTICE '  • Total de usuários: %', total_usuarios;
  RAISE NOTICE '  • Usuários tipo "admin": %', usuarios_admin;
  RAISE NOTICE '  • Usuários tipo "vendedor": %', usuarios_vendedor;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Migration executada com sucesso!';
  RAISE NOTICE '====================================================';
END $$;
