-- =====================================================
-- MIGRATION: Vincular Vendedores a Usuários (OPCIONAL)
-- Data: 29/01/2025
-- Descrição: Adiciona relação OPCIONAL entre vendedores e usuarios
--            Nem todo vendedor precisa ter usuário no sistema!
-- Autor: Claude (Anthropic)
-- =====================================================

BEGIN;

-- 1. Adicionar coluna usuario_id na tabela vendedores (OPCIONAL - permite NULL)
ALTER TABLE vendedores
  ADD COLUMN IF NOT EXISTS usuario_id INTEGER;

-- 2. Adicionar constraint de foreign key (permite NULL)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_vendedor_usuario'
  ) THEN
    ALTER TABLE vendedores
      ADD CONSTRAINT fk_vendedor_usuario
      FOREIGN KEY (usuario_id)
      REFERENCES usuarios(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Adicionar constraint de unique APENAS para usuarios vinculados
--    (permite múltiplos NULL, mas cada usuario só pode ter um vendedor)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'uq_vendedor_usuario_id'
  ) THEN
    CREATE UNIQUE INDEX uq_vendedor_usuario_id
    ON vendedores(usuario_id)
    WHERE usuario_id IS NOT NULL;
  END IF;
END $$;

-- 4. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_vendedores_usuario_id ON vendedores(usuario_id);

-- 5. Tentar vincular vendedores existentes aos usuários baseado no email
--    (assumindo que vendedores e usuários compartilham o mesmo email)
UPDATE vendedores v
SET usuario_id = u.id
FROM usuarios u
WHERE v.email IS NOT NULL
  AND v.email = u.email
  AND v.usuario_id IS NULL
  AND u.tipo_usuario = 'vendedor'
  AND NOT EXISTS (
    -- Garantir que não vincula se já existe outro vendedor com esse usuario
    SELECT 1 FROM vendedores v2
    WHERE v2.usuario_id = u.id AND v2.id != v.id
  );

-- 6. Tentar vincular vendedores aos usuários baseado no nome
--    (caso o email não bata, tentar por nome exato)
UPDATE vendedores v
SET usuario_id = u.id
FROM usuarios u
WHERE v.usuario_id IS NULL
  AND v.nome = u.nome
  AND u.tipo_usuario = 'vendedor'
  AND u.vendedor_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM vendedores v2
    WHERE v2.usuario_id = u.id AND v2.id != v.id
  );

-- 7. Atualizar usuarios.vendedor_id baseado no vínculo criado
UPDATE usuarios u
SET vendedor_id = v.id
FROM vendedores v
WHERE v.usuario_id = u.id
  AND u.vendedor_id IS NULL
  AND u.tipo_usuario = 'vendedor';

-- 8. Função para sincronizar dados entre usuario e vendedor (quando vinculados)
CREATE OR REPLACE FUNCTION sync_user_vendedor_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando usuário é atualizado, sincronizar com vendedor (se vinculado)
  IF NEW.tipo_usuario = 'vendedor' AND NEW.vendedor_id IS NOT NULL THEN
    UPDATE vendedores
    SET
      nome = NEW.nome,
      email = NEW.email,
      ativo = NEW.ativo,
      updated_at = NOW()
    WHERE id = NEW.vendedor_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_user_vendedor ON usuarios;

CREATE TRIGGER trigger_sync_user_vendedor
  AFTER UPDATE ON usuarios
  FOR EACH ROW
  WHEN (NEW.tipo_usuario = 'vendedor' AND NEW.vendedor_id IS NOT NULL)
  EXECUTE FUNCTION sync_user_vendedor_data();

-- 9. Comentários para documentação
COMMENT ON COLUMN vendedores.usuario_id IS 'ID do usuário vinculado (OPCIONAL - nem todo vendedor precisa ter usuário)';

-- 10. View helper para facilitar queries de vendedores com usuários
CREATE OR REPLACE VIEW vendedores_com_usuario AS
SELECT
  v.id as vendedor_id,
  v.nome as vendedor_nome,
  v.email as vendedor_email,
  v.telefone as vendedor_telefone,
  v.comissao,
  v.ativo as vendedor_ativo,
  v.usuario_id,
  u.id as usuario_id_fk,
  u.nome as usuario_nome,
  u.email as usuario_email,
  u.tipo_usuario,
  u.ativo as usuario_ativo,
  CASE
    WHEN v.usuario_id IS NOT NULL THEN 'Com Usuário'
    ELSE 'Sem Usuário'
  END as status_vinculo
FROM vendedores v
LEFT JOIN usuarios u ON u.id = v.usuario_id;

COMMENT ON VIEW vendedores_com_usuario IS 'View que mostra vendedores e seus usuários vinculados (se houver)';

COMMIT;

-- =====================================================
-- Relatório de Migração
-- =====================================================

DO $$
DECLARE
  total_vendedores INTEGER;
  vendedores_vinculados INTEGER;
  vendedores_sem_vinculo INTEGER;
  percentual_vinculados NUMERIC;
BEGIN
  SELECT COUNT(*) INTO total_vendedores FROM vendedores;
  SELECT COUNT(*) INTO vendedores_vinculados FROM vendedores WHERE usuario_id IS NOT NULL;
  SELECT COUNT(*) INTO vendedores_sem_vinculo FROM vendedores WHERE usuario_id IS NULL;

  IF total_vendedores > 0 THEN
    percentual_vinculados := (vendedores_vinculados::NUMERIC / total_vendedores::NUMERIC) * 100;
  ELSE
    percentual_vinculados := 0;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '✅ Migration: 20250129_add_vendedor_usuario_id.sql';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Estatísticas de Vínculo:';
  RAISE NOTICE '  • Total de vendedores: %', total_vendedores;
  RAISE NOTICE '  • Vendedores COM usuário: % (% %%)', vendedores_vinculados, ROUND(percentual_vinculados, 1);
  RAISE NOTICE '  • Vendedores SEM usuário: % (% %%)', vendedores_sem_vinculo, ROUND(100 - percentual_vinculados, 1);
  RAISE NOTICE '';

  IF vendedores_sem_vinculo > 0 THEN
    RAISE NOTICE '📝 Vendedores sem vínculo (está OK - é opcional!):';
    RAISE NOTICE '   Esses vendedores não têm login no sistema.';
    RAISE NOTICE '   Se precisar criar usuário para algum deles,';
    RAISE NOTICE '   crie manualmente e vincule depois.';
    RAISE NOTICE '';
  END IF;

  RAISE NOTICE '✅ Migration executada com sucesso!';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '';
END $$;

-- Listar vendedores para referência
SELECT
  id,
  nome,
  email,
  CASE
    WHEN usuario_id IS NOT NULL THEN '✓ Vinculado'
    ELSE '○ Sem usuário (OK)'
  END as status
FROM vendedores
ORDER BY
  CASE WHEN usuario_id IS NOT NULL THEN 0 ELSE 1 END,
  nome;
