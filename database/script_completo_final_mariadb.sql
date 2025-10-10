-- =====================================================
-- SCRIPT COMPLETO FINAL - MARIADB/MySQL
-- Execute este script para criar todo o sistema
-- =====================================================

-- 1. CRIAR TABELAS PRINCIPAIS
-- =====================================================

-- Tabela de produtos (se não existir)
CREATE TABLE IF NOT EXISTS produtos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    preco DECIMAL(10,2) DEFAULT 0,
    preco_venda DECIMAL(10,2) DEFAULT 0,
    preco_custo DECIMAL(10,2) DEFAULT 0,
    estoque INT DEFAULT 0,
    estoque_minimo INT DEFAULT 0,
    categoria VARCHAR(100),
    codigo_barras VARCHAR(50),
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

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

-- Tabela de histórico de preços
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
    FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE
);

-- 2. ATUALIZAR TABELA PRODUTOS
-- =====================================================

-- Adicionar colunas se não existirem
ALTER TABLE produtos 
ADD COLUMN IF NOT EXISTS preco_venda DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS preco_custo DECIMAL(10,2) DEFAULT 0;

-- Migrar dados existentes
UPDATE produtos 
SET preco_venda = preco 
WHERE (preco_venda = 0 OR preco_venda IS NULL) 
AND EXISTS (SELECT 1 FROM information_schema.COLUMNS 
           WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME = 'produtos' 
           AND COLUMN_NAME = 'preco');

UPDATE produtos 
SET preco_custo = preco * 0.7
WHERE (preco_custo = 0 OR preco_custo IS NULL) 
AND EXISTS (SELECT 1 FROM information_schema.COLUMNS 
           WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME = 'produtos' 
           AND COLUMN_NAME = 'preco');

-- 3. CRIAR ÍNDICES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_fornecedores_ativo ON fornecedores(ativo);
CREATE INDEX IF NOT EXISTS idx_fornecedores_cnpj ON fornecedores(cnpj);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_tipo ON movimentacoes_estoque(tipo);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_status ON movimentacoes_estoque(status);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_data ON movimentacoes_estoque(data_movimentacao);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_fornecedor ON movimentacoes_estoque(fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_itens_produto ON movimentacoes_itens(produto_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_itens_movimentacao ON movimentacoes_itens(movimentacao_id);
CREATE INDEX IF NOT EXISTS idx_historico_precos_produto ON historico_precos(produto_id);
CREATE INDEX IF NOT EXISTS idx_historico_precos_created_at ON historico_precos(created_at);

-- 4. CRIAR FUNÇÕES E PROCEDURES
-- =====================================================

-- Função para calcular preço médio ponderado
DROP FUNCTION IF EXISTS calcular_preco_medio_ponderado;
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
    SELECT estoque, preco_custo INTO estoque_atual, preco_atual
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
DELIMITER ;

-- Procedure para atualizar estoque e preço médio
DROP PROCEDURE IF EXISTS atualizar_estoque_preco_medio;
DELIMITER $$
CREATE PROCEDURE atualizar_estoque_preco_medio(
    IN produto_id_param INT,
    IN quantidade_param INT,
    IN preco_param DECIMAL(10,2),
    IN tipo_movimentacao VARCHAR(20)
)
BEGIN
    DECLARE estoque_atual INT DEFAULT 0;
    DECLARE preco_atual DECIMAL(10,2) DEFAULT 0;
    DECLARE novo_estoque INT DEFAULT 0;
    DECLARE novo_preco DECIMAL(10,2) DEFAULT 0;
    
    -- Buscar estoque e preço atual
    SELECT estoque, preco_custo INTO estoque_atual, preco_atual
    FROM produtos 
    WHERE id = produto_id_param;
    
    -- Calcular novo estoque baseado no tipo de movimentação
    IF tipo_movimentacao = 'entrada' THEN
        SET novo_estoque = estoque_atual + quantidade_param;
        SET novo_preco = calcular_preco_medio_ponderado(produto_id_param, quantidade_param, preco_param);
    ELSEIF tipo_movimentacao = 'saida' THEN
        SET novo_estoque = estoque_atual - quantidade_param;
        SET novo_preco = preco_atual; -- Mantém o preço atual para saídas
    ELSEIF tipo_movimentacao = 'ajuste' THEN
        SET novo_estoque = quantidade_param; -- Para ajustes, a quantidade é o novo estoque
        SET novo_preco = preco_atual;
    END IF;
    
    -- Atualizar produto
    UPDATE produtos 
    SET estoque = novo_estoque,
        preco_custo = novo_preco,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = produto_id_param;
END$$
DELIMITER ;

-- 5. CRIAR TRIGGERS
-- =====================================================

-- Trigger para histórico de preços
DROP TRIGGER IF EXISTS trigger_historico_preco_venda;
DELIMITER $$
CREATE TRIGGER trigger_historico_preco_venda
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

-- Trigger para preço de custo
DROP TRIGGER IF EXISTS trigger_historico_preco_custo;
DELIMITER $$
CREATE TRIGGER trigger_historico_preco_custo
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

-- 6. CRIAR VIEWS
-- =====================================================

-- View para estoque com valores
CREATE OR REPLACE VIEW estoque_com_valores AS
SELECT 
    p.*,
    (p.estoque * p.preco_venda) as valor_total_venda,
    (p.estoque * p.preco_custo) as valor_total_custo,
    (p.preco_venda - p.preco_custo) as margem_lucro,
    CASE 
        WHEN p.preco_custo > 0 THEN 
            ROUND(((p.preco_venda - p.preco_custo) / p.preco_custo) * 100, 2)
        ELSE 0 
    END as margem_percentual,
    CASE 
        WHEN p.estoque = 0 THEN 'Sem Estoque'
        WHEN p.estoque <= p.estoque_minimo THEN 'Estoque Baixo'
        ELSE 'Em Estoque'
    END as status_estoque
FROM produtos p
WHERE p.ativo = true;

-- 7. INSERIR DADOS DE EXEMPLO
-- =====================================================

-- Inserir fornecedores de exemplo
INSERT IGNORE INTO fornecedores (nome, nome_fantasia, cnpj, email, telefone, cidade, estado) VALUES
('Fornecedor Exemplo 1', 'Fornecedor 1 Ltda', '12.345.678/0001-90', 'contato@fornecedor1.com', '(11) 99999-9999', 'São Paulo', 'SP'),
('Fornecedor Exemplo 2', 'Fornecedor 2 S/A', '98.765.432/0001-10', 'vendas@fornecedor2.com', '(11) 88888-8888', 'Rio de Janeiro', 'RJ');

-- Inserir produtos de exemplo se não existirem
INSERT IGNORE INTO produtos (nome, descricao, preco_venda, preco_custo, estoque, estoque_minimo, categoria) VALUES
('Produto Exemplo 1', 'Descrição do produto exemplo 1', 25.90, 18.13, 50, 10, 'Categoria A'),
('Produto Exemplo 2', 'Descrição do produto exemplo 2', 15.50, 10.85, 30, 5, 'Categoria B'),
('Produto Exemplo 3', 'Descrição do produto exemplo 3', 35.00, 24.50, 20, 8, 'Categoria A');

-- 8. COMENTÁRIOS FINAIS
-- =====================================================

-- Adicionar comentários nas tabelas
ALTER TABLE fornecedores COMMENT = 'Tabela de fornecedores para movimentações de estoque';
ALTER TABLE movimentacoes_estoque COMMENT = 'Tabela principal de movimentações de estoque (entrada, saída, ajuste)';
ALTER TABLE movimentacoes_itens COMMENT = 'Itens das movimentações de estoque';
ALTER TABLE historico_precos COMMENT = 'Histórico de alterações de preços dos produtos';

-- Mensagem de sucesso
SELECT 'Script executado com sucesso! Todas as tabelas, funções, procedures, triggers e views foram criados.' as resultado;
