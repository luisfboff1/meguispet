-- =====================================================
-- FIX: Corrigir permissões de usuários admin
-- Data: 30/11/2025
-- Descrição: Garantir que todos os admins tenham permissões completas
-- =====================================================

BEGIN;

-- 1. Atualizar TODOS os usuários com tipo_usuario = 'admin' para terem permissões completas
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
WHERE tipo_usuario = 'admin';

-- 2. Verificar e reportar quantos usuários foram atualizados
DO $$
DECLARE
  total_admins INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_admins FROM usuarios WHERE tipo_usuario = 'admin';

  RAISE NOTICE '';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '✅ Permissões de Admin Corrigidas';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Total de administradores: %', total_admins;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Todos os admins agora têm permissões completas!';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '';
END $$;

-- 3. Listar usuários admin para confirmação
SELECT
  id,
  nome,
  email,
  tipo_usuario,
  CASE
    WHEN permissoes IS NOT NULL AND permissoes != '{}'::jsonb THEN '✓ Permissões OK'
    ELSE '✗ Sem permissões'
  END as status_permissoes,
  CASE
    WHEN ativo THEN '✓ Ativo'
    ELSE '✗ Inativo'
  END as status
FROM usuarios
WHERE tipo_usuario = 'admin'
ORDER BY nome;

COMMIT;

-- =====================================================
-- Instruções de Uso:
-- =====================================================
-- Execute este script com:
-- psql -U postgres -d meguispet -f database/migrations/fix_admin_permissions.sql
--
-- Depois faça logout e login novamente para atualizar o token JWT
-- =====================================================
