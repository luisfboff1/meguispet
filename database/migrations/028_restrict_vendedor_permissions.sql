-- =====================================================================
-- Migration 028: Restringir permissões de vendedores existentes
-- Data: 2026-02-23
-- Motivo: Preset do role 'vendedor' foi atualizado para remover acesso
--         às páginas de Produtos & Estoque e Relatórios.
--         Esta migration aplica a mesma restrição nos usuários já criados.
-- =====================================================================

-- -----------------------------------------------------------------------
-- PREVIEW: Antes de executar, veja quais usuários serão afetados
-- -----------------------------------------------------------------------
-- SELECT id, nome, email,
--        permissoes->>'produtos'   AS produtos_atual,
--        permissoes->>'relatorios' AS relatorios_atual
-- FROM usuarios
-- WHERE tipo_usuario = 'vendedor'
--   AND ativo = true
-- ORDER BY nome;


-- -----------------------------------------------------------------------
-- STEP 1: Atualizar permissões dos vendedores existentes
-- Remove acesso a: produtos, relatorios (e sub-permissões relacionadas)
-- NÃO toca em: vendas, clientes, dashboard (permanecem como estão)
-- -----------------------------------------------------------------------
UPDATE usuarios
SET
  permissoes = permissoes || '{
    "produtos":                false,
    "produtos_criar":          false,
    "produtos_editar":         false,
    "produtos_deletar":        false,
    "produtos_ajustar_estoque": false,
    "estoque":                 false,
    "relatorios":              false,
    "relatorios_gerar":        false,
    "relatorios_exportar":     false
  }'::jsonb,
  updated_at = NOW()
WHERE tipo_usuario = 'vendedor'
  AND ativo = true;


-- -----------------------------------------------------------------------
-- STEP 2: Atualizar o role_permissions_config (se existir entrada para vendedor)
-- Garante que novos usuários criados via "Configurações de Permissões"
-- também recebam as permissões restritas.
-- -----------------------------------------------------------------------
UPDATE role_permissions_config
SET
  permissions = permissions || '{
    "produtos":                false,
    "produtos_criar":          false,
    "produtos_editar":         false,
    "produtos_deletar":        false,
    "produtos_ajustar_estoque": false,
    "estoque":                 false,
    "relatorios":              false,
    "relatorios_gerar":        false,
    "relatorios_exportar":     false
  }'::jsonb,
  updated_at = NOW()
WHERE role = 'vendedor';


-- -----------------------------------------------------------------------
-- VERIFICAÇÃO: Execute após o UPDATE para confirmar
-- -----------------------------------------------------------------------
-- SELECT id, nome, email,
--        permissoes->>'produtos'   AS produtos,
--        permissoes->>'estoque'    AS estoque,
--        permissoes->>'relatorios' AS relatorios,
--        permissoes->>'vendas'     AS vendas,
--        permissoes->>'clientes'   AS clientes
-- FROM usuarios
-- WHERE tipo_usuario = 'vendedor'
--   AND ativo = true
-- ORDER BY nome;


-- -----------------------------------------------------------------------
-- ROLLBACK (desfazer — caso precise reverter):
-- -----------------------------------------------------------------------
-- UPDATE usuarios
-- SET
--   permissoes = permissoes || '{
--     "produtos":   true,
--     "relatorios": true
--   }'::jsonb,
--   updated_at = NOW()
-- WHERE tipo_usuario = 'vendedor'
--   AND ativo = true;
--
-- UPDATE role_permissions_config
-- SET
--   permissions = permissions || '{
--     "produtos":   true,
--     "relatorios": true
--   }'::jsonb,
--   updated_at = NOW()
-- WHERE role = 'vendedor';
