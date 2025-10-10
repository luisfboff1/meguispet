-- =====================================================
-- SCRIPT PARA HISTÓRICO DE PREÇOS - MARIADB
-- =====================================================

-- Criar tabela para histórico de preços
CREATE TABLE IF NOT EXISTS historico_precos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    produto_id INT NOT NULL,
    preco_venda_anterior DECIMAL(10,2),
    preco_venda_novo DECIMAL(10,2),
    preco_custo_anterior DECIMAL(10,2),
    preco_custo_novo DECIMAL(10,2),
    tipo_alteracao ENUM('manual', 'automatico', 'movimentacao') NOT NULL,
    observacao TEXT,
    usuario_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE,
    INDEX idx_produto_id (produto_id),
    INDEX idx_created_at (created_at),
    INDEX idx_tipo_alteracao (tipo_alteracao)
);

-- Trigger para capturar mudanças de preço de venda
DELIMITER $$
CREATE TRIGGER IF NOT EXISTS trigger_historico_preco_venda
AFTER UPDATE ON produtos
FOR EACH ROW
BEGIN
    -- Verificar se o preço de venda mudou
    IF OLD.preco_venda != NEW.preco_venda THEN
        INSERT INTO historico_precos (
            produto_id,
            preco_venda_anterior,
            preco_venda_novo,
            preco_custo_anterior,
            preco_custo_novo,
            tipo_alteracao,
            observacao
        ) VALUES (
            NEW.id,
            OLD.preco_venda,
            NEW.preco_venda,
            OLD.preco_custo,
            NEW.preco_custo,
            'manual',
            'Alteração de preço de venda'
        );
    END IF;
END$$
DELIMITER ;

-- Trigger para capturar mudanças de preço de custo (movimentações)
DELIMITER $$
CREATE TRIGGER IF NOT EXISTS trigger_historico_preco_custo
AFTER UPDATE ON produtos
FOR EACH ROW
BEGIN
    -- Verificar se o preço de custo mudou (geralmente por movimentação)
    IF OLD.preco_custo != NEW.preco_custo AND OLD.preco_custo > 0 THEN
        INSERT INTO historico_precos (
            produto_id,
            preco_venda_anterior,
            preco_venda_novo,
            preco_custo_anterior,
            preco_custo_novo,
            tipo_alteracao,
            observacao
        ) VALUES (
            NEW.id,
            OLD.preco_venda,
            NEW.preco_venda,
            OLD.preco_custo,
            NEW.preco_custo,
            'automatico',
            'Atualização automática por movimentação de estoque'
        );
    END IF;
END$$
DELIMITER ;

-- View para histórico de preços com informações do produto
CREATE OR REPLACE VIEW historico_precos_completo AS
SELECT 
    hp.id,
    hp.produto_id,
    p.nome as produto_nome,
    p.categoria,
    hp.preco_venda_anterior,
    hp.preco_venda_novo,
    hp.preco_custo_anterior,
    hp.preco_custo_novo,
    hp.tipo_alteracao,
    hp.observacao,
    hp.usuario_id,
    hp.created_at,
    -- Calcular diferenças
    (hp.preco_venda_novo - hp.preco_venda_anterior) as diferenca_preco_venda,
    (hp.preco_custo_novo - hp.preco_custo_anterior) as diferenca_preco_custo,
    -- Calcular percentuais de mudança
    CASE 
        WHEN hp.preco_venda_anterior > 0 THEN 
            ROUND(((hp.preco_venda_novo - hp.preco_venda_anterior) / hp.preco_venda_anterior) * 100, 2)
        ELSE 0 
    END as percentual_mudanca_venda,
    CASE 
        WHEN hp.preco_custo_anterior > 0 THEN 
            ROUND(((hp.preco_custo_novo - hp.preco_custo_anterior) / hp.preco_custo_anterior) * 100, 2)
        ELSE 0 
    END as percentual_mudanca_custo
FROM historico_precos hp
JOIN produtos p ON hp.produto_id = p.id
ORDER BY hp.created_at DESC;

-- Inserir alguns dados de exemplo (opcional)
INSERT INTO historico_precos (
    produto_id,
    preco_venda_anterior,
    preco_venda_novo,
    preco_custo_anterior,
    preco_custo_novo,
    tipo_alteracao,
    observacao
) VALUES 
(1, 20.00, 25.90, 14.00, 18.13, 'manual', 'Ajuste de preço devido ao aumento de custos'),
(1, 25.90, 24.90, 18.13, 17.43, 'automatico', 'Atualização por nova compra com preço menor'),
(2, 15.00, 18.50, 10.50, 12.95, 'manual', 'Reajuste de preço de venda'),
(2, 18.50, 18.50, 12.95, 13.20, 'automatico', 'Preço médio ponderado atualizado');

-- Função para obter histórico de um produto específico
DELIMITER $$
CREATE FUNCTION IF NOT EXISTS obter_historico_precos_produto(produto_id_param INT)
RETURNS JSON
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE result JSON;
    
    SELECT JSON_ARRAYAGG(
        JSON_OBJECT(
            'id', hp.id,
            'preco_venda_anterior', hp.preco_venda_anterior,
            'preco_venda_novo', hp.preco_venda_novo,
            'preco_custo_anterior', hp.preco_custo_anterior,
            'preco_custo_novo', hp.preco_custo_novo,
            'tipo_alteracao', hp.tipo_alteracao,
            'observacao', hp.observacao,
            'created_at', hp.created_at,
            'diferenca_preco_venda', hp.diferenca_preco_venda,
            'diferenca_preco_custo', hp.diferenca_preco_custo,
            'percentual_mudanca_venda', hp.percentual_mudanca_venda,
            'percentual_mudanca_custo', hp.percentual_mudanca_custo
        )
    ) INTO result
    FROM historico_precos_completo hp
    WHERE hp.produto_id = produto_id_param
    ORDER BY hp.created_at DESC;
    
    RETURN COALESCE(result, JSON_ARRAY());
END$$
DELIMITER ;
