-- =====================================================================
-- Migration 029: Sincronizar vínculos vendedor ↔ usuário existentes
-- Data: 2026-02-24
-- Motivo: Vendedores que tiveram conta vinculada antes do fix de
--         link-usuario.ts (que não setava usuarios.vendedor_id por
--         falha silenciosa de RLS) ficaram com vendedor_id = NULL,
--         fazendo o sistema retornar lista de vendas vazia.
-- =====================================================================

-- -----------------------------------------------------------------------
-- PREVIEW: Execute este SELECT antes para ver quais usuários serão afetados
-- -----------------------------------------------------------------------
-- SELECT
--   u.id          AS usuario_id,
--   u.nome,
--   u.email       AS usuario_email,
--   u.vendedor_id AS vendedor_id_atual,
--   v.id          AS vendedor_id_correto,
--   v.email       AS vendedor_email,
--   CASE
--     WHEN v.usuario_id = u.id THEN 'CASO A - usuario_id já vinculado'
--     WHEN v.email = u.email   THEN 'CASO B - match por email'
--     ELSE 'sem match'
--   END AS tipo_fix
-- FROM usuarios u
-- LEFT JOIN vendedores v
--   ON v.usuario_id = u.id OR (v.email = u.email AND v.usuario_id IS NULL)
-- WHERE u.tipo_usuario = 'vendedor'
--   AND u.vendedor_id IS NULL
--   AND u.ativo = true
-- ORDER BY u.nome;


-- -----------------------------------------------------------------------
-- STEP 1: Caso A — vendedores.usuario_id já aponta para usuarios.id
-- (admin executou link mas usuarios.vendedor_id não foi salvo por bug de RLS)
-- -----------------------------------------------------------------------
UPDATE usuarios u
SET
  vendedor_id = v.id,
  updated_at  = NOW()
FROM vendedores v
WHERE v.usuario_id = u.id
  AND u.vendedor_id IS NULL
  AND u.tipo_usuario = 'vendedor';


-- -----------------------------------------------------------------------
-- STEP 2: Caso B — vendedores.usuario_id ainda é NULL, mas o email bate
-- (vendedor existia, conta foi criada com mesmo email mas nunca vinculada
--  manualmente, ou o link falhou completamente)
-- -----------------------------------------------------------------------

-- 2a. Seta vendedores.usuario_id a partir de usuarios.id (pelo email)
-- Ignora se esse usuario_id já está vinculado a outro vendedor (constraint uq_vendedor_usuario_id)
UPDATE vendedores v
SET
  usuario_id  = u.id,
  updated_at  = NOW()
FROM usuarios u
WHERE u.email = v.email
  AND v.usuario_id IS NULL
  AND u.tipo_usuario = 'vendedor'
  AND u.ativo = true
  AND NOT EXISTS (
    SELECT 1 FROM vendedores v2
    WHERE v2.usuario_id = u.id
  );

-- 2b. Agora seta usuarios.vendedor_id (o row acima já criou a ligação)
UPDATE usuarios u
SET
  vendedor_id = v.id,
  updated_at  = NOW()
FROM vendedores v
WHERE v.usuario_id = u.id
  AND u.vendedor_id IS NULL
  AND u.tipo_usuario = 'vendedor';


-- -----------------------------------------------------------------------
-- VERIFICAÇÃO: Execute após para confirmar que todos foram corrigidos
-- -----------------------------------------------------------------------
-- SELECT
--   u.id, u.nome, u.email,
--   u.vendedor_id,
--   v.id   AS vendedor_tabela_id,
--   v.usuario_id
-- FROM usuarios u
-- LEFT JOIN vendedores v ON v.id = u.vendedor_id
-- WHERE u.tipo_usuario = 'vendedor'
--   AND u.ativo = true
-- ORDER BY u.nome;

-- Esperado: todos os vendedores com vendedor_id preenchido e
--           vendedores.usuario_id = usuarios.id.


-- -----------------------------------------------------------------------
-- ROLLBACK (desfazer se necessário):
-- -----------------------------------------------------------------------
-- ATENÇÃO: Só execute se tiver certeza que nenhum dado foi corrompido.
-- Este rollback anula o Step 2 (Caso B). Caso A não tem rollback seguro
-- pois os dados já eram corretos, só faltava o campo preenchido.
--
-- UPDATE usuarios SET vendedor_id = NULL, updated_at = NOW()
-- WHERE tipo_usuario = 'vendedor';
--
-- UPDATE vendedores SET usuario_id = NULL, updated_at = NOW()
-- WHERE usuario_id IN (
--   SELECT id FROM usuarios WHERE tipo_usuario = 'vendedor'
-- );
