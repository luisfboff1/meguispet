-- 🔧 REMOVER CONSTRAINTS EXISTENTES (Execute este primeiro se der erro de duplicação)

-- Desabilitar verificação de chaves estrangeiras temporariamente
SET FOREIGN_KEY_CHECKS = 0;

-- Remover constraints existentes
ALTER TABLE produtos DROP CONSTRAINT IF EXISTS check_preco_venda_positive;
ALTER TABLE produtos DROP CONSTRAINT IF EXISTS check_preco_custo_positive;

-- Reabilitar verificação de chaves estrangeiras
SET FOREIGN_KEY_CHECKS = 1;

-- Remover funções, procedures e triggers existentes
DROP FUNCTION IF EXISTS calcular_preco_medio_ponderado;
DROP PROCEDURE IF EXISTS atualizar_estoque_preco_medio;
DROP TRIGGER IF EXISTS trigger_movimentacao_preco_medio;
DROP VIEW IF EXISTS estoque_com_valores;

SELECT '✅ Constraints removidas com sucesso!' as status;
SELECT 'Agora você pode executar o script principal sem erros.' as proximo_passo;
