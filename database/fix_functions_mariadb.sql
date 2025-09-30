-- 🔧 CORRIGIR FUNÇÕES EXISTENTES NO MARIADB
-- Execute este script para recriar as funções corretamente

-- 1. Remover funções existentes (se existirem)
DROP FUNCTION IF EXISTS calcular_preco_medio_ponderado;
DROP PROCEDURE IF EXISTS atualizar_estoque_preco_medio;
DROP TRIGGER IF EXISTS trigger_movimentacao_preco_medio;

-- 2. Recriar função para calcular preço médio ponderado
DELIMITER $$

CREATE FUNCTION calcular_preco_medio_ponderado(
    produto_id_param INT,
    nova_quantidade INT,
    novo_preco DECIMAL(10,2)
) RETURNS DECIMAL(10,2)
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE estoque_atual INT DEFAULT 0;
    DECLARE preco_atual DECIMAL(10,2) DEFAULT 0;
    DECLARE estoque_total INT DEFAULT 0;
    DECLARE valor_total DECIMAL(10,2) DEFAULT 0;
    DECLARE preco_medio DECIMAL(10,2) DEFAULT 0;
    
    -- Buscar estoque e preço atual do produto
    SELECT estoque, preco_custo 
    INTO estoque_atual, preco_atual
    FROM produtos 
    WHERE id = produto_id_param;
    
    -- Calcular estoque total
    SET estoque_total = estoque_atual + nova_quantidade;
    
    -- Calcular valor total
    SET valor_total = (estoque_atual * preco_atual) + (nova_quantidade * novo_preco);
    
    -- Calcular preço médio ponderado
    IF estoque_total > 0 THEN
        SET preco_medio = ROUND(valor_total / estoque_total, 2);
    ELSE
        SET preco_medio = novo_preco;
    END IF;
    
    RETURN preco_medio;
END$$

-- 3. Recriar stored procedure para atualizar estoque e preço médio
CREATE PROCEDURE atualizar_estoque_preco_medio(
    IN produto_id_param INT,
    IN quantidade INT,
    IN preco_unitario DECIMAL(10,2),
    IN tipo_movimentacao VARCHAR(20)
)
BEGIN
    DECLARE preco_medio_calculado DECIMAL(10,2) DEFAULT 0;
    
    IF tipo_movimentacao = 'entrada' THEN
        -- Para entrada: calcular preço médio ponderado
        SET preco_medio_calculado = calcular_preco_medio_ponderado(produto_id_param, quantidade, preco_unitario);
        
        UPDATE produtos 
        SET 
            estoque = estoque + quantidade,
            preco_custo = preco_medio_calculado,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = produto_id_param;
        
    ELSEIF tipo_movimentacao = 'saida' THEN
        -- Para saída: apenas reduzir estoque (mantém preço médio)
        UPDATE produtos 
        SET 
            estoque = estoque - quantidade,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = produto_id_param;
        
    ELSEIF tipo_movimentacao = 'ajuste' THEN
        -- Para ajuste: pode ser entrada ou saída dependendo do sinal da quantidade
        IF quantidade > 0 THEN
            -- Ajuste positivo: tratar como entrada
            SET preco_medio_calculado = calcular_preco_medio_ponderado(produto_id_param, quantidade, preco_unitario);
            
            UPDATE produtos 
            SET 
                estoque = estoque + quantidade,
                preco_custo = preco_medio_calculado,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = produto_id_param;
        ELSE
            -- Ajuste negativo: tratar como saída
            UPDATE produtos 
            SET 
                estoque = estoque + quantidade, -- quantidade já é negativa
                updated_at = CURRENT_TIMESTAMP
            WHERE id = produto_id_param;
        END IF;
    END IF;
END$$

DELIMITER ;

-- 4. Recriar trigger para atualizar automaticamente o preço médio
DELIMITER $$

CREATE TRIGGER trigger_movimentacao_preco_medio
    AFTER UPDATE ON movimentacoes_estoque
    FOR EACH ROW
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE item_produto_id INT;
    DECLARE item_quantidade INT;
    DECLARE item_preco_unitario DECIMAL(10,2);
    
    -- Cursor para percorrer os itens da movimentação
    DECLARE cur CURSOR FOR 
        SELECT produto_id, quantidade, preco_unitario 
        FROM movimentacoes_itens 
        WHERE movimentacao_id = NEW.id;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    -- Chamar função de atualização quando uma movimentação é confirmada
    IF NEW.status = 'confirmado' AND OLD.status != 'confirmado' THEN
        -- Atualizar estoque e preço médio para cada item
        OPEN cur;
        
        read_loop: LOOP
            FETCH cur INTO item_produto_id, item_quantidade, item_preco_unitario;
            IF done THEN
                LEAVE read_loop;
            END IF;
            
            CALL atualizar_estoque_preco_medio(
                item_produto_id, 
                item_quantidade, 
                item_preco_unitario, 
                NEW.tipo
            );
        END LOOP;
        
        CLOSE cur;
    END IF;
END$$

DELIMITER ;

-- 5. Verificar se as funções foram criadas corretamente
SELECT 'Funções criadas com sucesso!' as status;

-- 6. Teste básico (opcional - descomente para testar)
/*
-- Teste da função (substitua 1 por um ID de produto válido)
SELECT calcular_preco_medio_ponderado(1, 10, 15.00) as teste_funcao;

-- Verificar se as funções existem
SHOW FUNCTION STATUS WHERE Name = 'calcular_preco_medio_ponderado';
SHOW PROCEDURE STATUS WHERE Name = 'atualizar_estoque_preco_medio';
SHOW TRIGGERS WHERE `Table` = 'movimentacoes_estoque';
*/
