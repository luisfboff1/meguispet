-- 🚀 SCRIPT COMPLETO PARA MARIADB/MYSQL
-- Execute este script completo para configurar todo o sistema

-- =====================================================
-- PARTE 1: TABELAS DE MOVIMENTAÇÕES
-- =====================================================

-- Tabela de fornecedores
CREATE TABLE IF NOT EXISTS fornecedores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    nome_fantasia VARCHAR(255),
    cnpj VARCHAR(18),
    inscricao_estadual VARCHAR(50),
    email VARCHAR(255),
    telefone VARCHAR(20),
    endereco TEXT,
    cidade VARCHAR(100),
    estado VARCHAR(2),
    cep VARCHAR(10),
    observacoes TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabela de movimentações de estoque
CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tipo ENUM('entrada', 'saida', 'ajuste') NOT NULL,
    fornecedor_id INT,
    numero_pedido VARCHAR(100),
    data_movimentacao DATE NOT NULL,
    valor_total DECIMAL(10,2) DEFAULT 0,
    condicao_pagamento ENUM('avista', '30dias', '60dias', '90dias', 'emprestimo', 'cobranca') DEFAULT 'avista',
    status ENUM('pendente', 'confirmado', 'cancelado') DEFAULT 'pendente',
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id) ON DELETE SET NULL
);

-- Tabela de itens das movimentações
CREATE TABLE IF NOT EXISTS movimentacoes_itens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    movimentacao_id INT NOT NULL,
    produto_id INT NOT NULL,
    quantidade INT NOT NULL CHECK (quantidade > 0),
    preco_unitario DECIMAL(10,2) NOT NULL CHECK (preco_unitario >= 0),
    subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (movimentacao_id) REFERENCES movimentacoes_estoque(id) ON DELETE CASCADE,
    FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE RESTRICT
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_fornecedores_ativo ON fornecedores(ativo);
CREATE INDEX IF NOT EXISTS idx_fornecedores_cnpj ON fornecedores(cnpj);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_tipo ON movimentacoes_estoque(tipo);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_status ON movimentacoes_estoque(status);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_data ON movimentacoes_estoque(data_movimentacao);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_fornecedor ON movimentacoes_estoque(fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_itens_produto ON movimentacoes_itens(produto_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_itens_movimentacao ON movimentacoes_itens(movimentacao_id);

-- =====================================================
-- PARTE 2: ATUALIZAR TABELA PRODUTOS
-- =====================================================

-- Adicionar novas colunas na tabela produtos
ALTER TABLE produtos 
ADD COLUMN IF NOT EXISTS preco_venda DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS preco_custo DECIMAL(10,2) DEFAULT 0;

-- Migrar dados existentes (se a coluna 'preco' existir)
UPDATE produtos 
SET preco_venda = preco 
WHERE (preco_venda = 0 OR preco_venda IS NULL) 
AND EXISTS (SELECT 1 FROM information_schema.COLUMNS 
           WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME = 'produtos' 
           AND COLUMN_NAME = 'preco');

UPDATE produtos 
SET preco_custo = ROUND(preco_venda * 0.7, 2)
WHERE (preco_custo = 0 OR preco_custo IS NULL)
AND EXISTS (SELECT 1 FROM information_schema.COLUMNS 
           WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME = 'produtos' 
           AND COLUMN_NAME = 'preco');

-- Adicionar constraints para garantir valores válidos (se não existirem)
SET @constraint_exists = (
    SELECT COUNT(*) 
    FROM information_schema.TABLE_CONSTRAINTS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'produtos' 
    AND CONSTRAINT_NAME = 'check_preco_venda_positive'
);

SET @sql = IF(@constraint_exists = 0, 
    'ALTER TABLE produtos ADD CONSTRAINT check_preco_venda_positive CHECK (preco_venda >= 0)', 
    'SELECT "Constraint check_preco_venda_positive already exists" as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @constraint_exists = (
    SELECT COUNT(*) 
    FROM information_schema.TABLE_CONSTRAINTS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'produtos' 
    AND CONSTRAINT_NAME = 'check_preco_custo_positive'
);

SET @sql = IF(@constraint_exists = 0, 
    'ALTER TABLE produtos ADD CONSTRAINT check_preco_custo_positive CHECK (preco_custo >= 0)', 
    'SELECT "Constraint check_preco_custo_positive already exists" as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- PARTE 3: FUNÇÕES E PROCEDURES
-- =====================================================

-- Remover funções existentes (se existirem)
DROP FUNCTION IF EXISTS calcular_preco_medio_ponderado;
DROP PROCEDURE IF EXISTS atualizar_estoque_preco_medio;
DROP TRIGGER IF EXISTS trigger_movimentacao_preco_medio;

-- Criar função para calcular preço médio ponderado
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

-- Criar stored procedure para atualizar estoque e preço médio
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

-- =====================================================
-- PARTE 4: TRIGGER
-- =====================================================

-- Criar trigger para atualizar automaticamente o preço médio
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

-- =====================================================
-- PARTE 5: VIEW PARA RELATÓRIOS
-- =====================================================

-- Criar view para relatórios de estoque com valores totais
CREATE OR REPLACE VIEW estoque_com_valores AS
SELECT 
    p.id,
    p.nome,
    p.descricao,
    p.categoria,
    p.codigo_barras,
    p.estoque,
    p.estoque_minimo,
    p.preco_venda,
    p.preco_custo,
    -- Valores totais
    ROUND(p.estoque * p.preco_custo, 2) as valor_total_custo,
    ROUND(p.estoque * p.preco_venda, 2) as valor_total_venda,
    ROUND((p.estoque * p.preco_venda) - (p.estoque * p.preco_custo), 2) as margem_lucro,
    -- Margem percentual
    CASE 
        WHEN p.preco_custo > 0 THEN 
            ROUND(((p.preco_venda - p.preco_custo) / p.preco_custo) * 100, 2)
        ELSE 0 
    END as margem_percentual,
    -- Status do estoque
    CASE 
        WHEN p.estoque = 0 THEN 'sem_estoque'
        WHEN p.estoque <= p.estoque_minimo THEN 'estoque_baixo'
        ELSE 'estoque_ok'
    END as status_estoque,
    p.ativo,
    p.created_at,
    p.updated_at
FROM produtos p
WHERE p.ativo = true;

-- =====================================================
-- PARTE 6: DADOS DE EXEMPLO
-- =====================================================

-- Inserir alguns fornecedores de exemplo
INSERT IGNORE INTO fornecedores (nome, nome_fantasia, cnpj, email, telefone, cidade, estado) VALUES
('Fornecedor Exemplo 1', 'Fornecedor 1 Ltda', '12.345.678/0001-90', 'contato@fornecedor1.com', '(11) 99999-9999', 'São Paulo', 'SP'),
('Fornecedor Exemplo 2', 'Fornecedor 2 S/A', '98.765.432/0001-10', 'vendas@fornecedor2.com', '(11) 88888-8888', 'Rio de Janeiro', 'RJ');

-- =====================================================
-- PARTE 7: VERIFICAÇÃO FINAL
-- =====================================================

-- Verificar se tudo foi criado corretamente
SELECT '✅ Script executado com sucesso!' as status;
SELECT 'Tabelas criadas: fornecedores, movimentacoes_estoque, movimentacoes_itens' as tabelas;
SELECT 'Funções criadas: calcular_preco_medio_ponderado' as funcoes;
SELECT 'Procedures criadas: atualizar_estoque_preco_medio' as procedures;
SELECT 'Triggers criados: trigger_movimentacao_preco_medio' as triggers;
SELECT 'Views criadas: estoque_com_valores' as views;

-- Mostrar estrutura das tabelas principais
DESCRIBE produtos;
DESCRIBE fornecedores;
DESCRIBE movimentacoes_estoque;
DESCRIBE movimentacoes_itens;

-- Verificar se as funções existem
SHOW FUNCTION STATUS WHERE Name = 'calcular_preco_medio_ponderado';
SHOW PROCEDURE STATUS WHERE Name = 'atualizar_estoque_preco_medio';
SHOW TRIGGERS WHERE `Table` = 'movimentacoes_estoque';
