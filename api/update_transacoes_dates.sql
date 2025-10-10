-- Script para atualizar as datas das transações para setembro 2025
-- Execute este script no seu banco de dados para corrigir as datas

-- Opção 1: Usar DATE_ADD duas vezes (compatível com MariaDB)
UPDATE transacoes 
SET data_transacao = DATE_ADD(DATE_ADD(data_transacao, INTERVAL 1 YEAR), INTERVAL 8 MONTH)
WHERE data_transacao < '2025-09-01';

-- Opção 2: Usar STR_TO_DATE (alternativa)
-- UPDATE transacoes 
-- SET data_transacao = STR_TO_DATE(CONCAT('2025-09-', DAY(data_transacao)), '%Y-%m-%d')
-- WHERE data_transacao < '2025-09-01';

-- Verificar se as datas foram atualizadas
SELECT 
    id,
    tipo,
    valor,
    descricao,
    data_transacao,
    DATE_FORMAT(data_transacao, '%Y-%m') as mes_ano
FROM transacoes 
ORDER BY data_transacao DESC 
LIMIT 10;
