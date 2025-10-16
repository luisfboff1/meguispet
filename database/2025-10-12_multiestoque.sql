-- ==============================================
-- Migração: Suporte a multiestoque e formas de pagamento dinâmicas
-- Data: 2025-10-12
-- ==============================================

START TRANSACTION;

-- 1. Tabela de estoques
CREATE TABLE IF NOT EXISTS estoques (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    descricao VARCHAR(255),
    ativo TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT IGNORE INTO estoques (nome, descricao)
VALUES ('São Paulo', 'Centro de distribuição - SP'), ('Rio Grande do Sul', 'Centro de distribuição - RS');

-- 2. Tabela pivô produto x estoque
CREATE TABLE IF NOT EXISTS produtos_estoques (
    id INT AUTO_INCREMENT PRIMARY KEY,
    produto_id INT NOT NULL,
    estoque_id INT NOT NULL,
    quantidade INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_produto_estoque (produto_id, estoque_id),
    CONSTRAINT fk_produto_estoque_produto FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE,
    CONSTRAINT fk_produto_estoque_estoque FOREIGN KEY (estoque_id) REFERENCES estoques(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 2a. Migrar estoque atual (se coluna estoque existir em produtos)
SET @estoque_padrao_id = (SELECT id FROM estoques WHERE nome = 'São Paulo' LIMIT 1);
SET @coluna_estoque_existe = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'produtos'
      AND COLUMN_NAME = 'estoque'
);

SET @migrar_estoque_sql = IF(
    @coluna_estoque_existe > 0,
    'INSERT INTO produtos_estoques (produto_id, estoque_id, quantidade)
        SELECT p.id, @estoque_padrao_id, p.estoque
        FROM produtos p
        ON DUPLICATE KEY UPDATE quantidade = VALUES(quantidade);',
    'SELECT 1;'
);

PREPARE stmt_migrar_estoque FROM @migrar_estoque_sql;
EXECUTE stmt_migrar_estoque;
DEALLOCATE PREPARE stmt_migrar_estoque;

-- 3. Tabela de formas de pagamento dinâmicas
CREATE TABLE IF NOT EXISTS formas_pagamento (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    ativo TINYINT(1) NOT NULL DEFAULT 1,
    ordem INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT IGNORE INTO formas_pagamento (nome, ordem)
VALUES ('Dinheiro', 1), ('Cartão', 2), ('PIX', 3), ('Transferência', 4), ('Boleto', 5);

-- 4. Ajustes na tabela de clientes
ALTER TABLE clientes_fornecedores
    ADD COLUMN IF NOT EXISTS vendedor_id INT NULL;

SET @fk_clientes_vendedor_existe = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = 'clientes_fornecedores'
      AND CONSTRAINT_NAME = 'fk_clientes_vendedor'
);

SET @sql_add_fk_clientes_vendedor = IF(
    @fk_clientes_vendedor_existe = 0,
    'ALTER TABLE clientes_fornecedores
        ADD CONSTRAINT fk_clientes_vendedor FOREIGN KEY (vendedor_id) REFERENCES vendedores(id) ON DELETE SET NULL;',
    'SELECT 1;'
);

PREPARE stmt_add_fk_clientes_vendedor FROM @sql_add_fk_clientes_vendedor;
EXECUTE stmt_add_fk_clientes_vendedor;
DEALLOCATE PREPARE stmt_add_fk_clientes_vendedor;

-- 5. Ajustes na tabela de vendas
ALTER TABLE vendas
    ADD COLUMN IF NOT EXISTS estoque_id INT NULL,
    ADD COLUMN IF NOT EXISTS forma_pagamento_id INT NULL;

SET @fk_vendas_estoque_existe = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = 'vendas'
      AND CONSTRAINT_NAME = 'fk_vendas_estoque'
);

SET @sql_add_fk_vendas_estoque = IF(
    @fk_vendas_estoque_existe = 0,
    'ALTER TABLE vendas
        ADD CONSTRAINT fk_vendas_estoque FOREIGN KEY (estoque_id) REFERENCES estoques(id) ON DELETE SET NULL;',
    'SELECT 1;'
);

PREPARE stmt_add_fk_vendas_estoque FROM @sql_add_fk_vendas_estoque;
EXECUTE stmt_add_fk_vendas_estoque;
DEALLOCATE PREPARE stmt_add_fk_vendas_estoque;

SET @fk_vendas_forma_pagamento_existe = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = 'vendas'
      AND CONSTRAINT_NAME = 'fk_vendas_forma_pagamento'
);

SET @sql_add_fk_vendas_forma_pagamento = IF(
    @fk_vendas_forma_pagamento_existe = 0,
    'ALTER TABLE vendas
        ADD CONSTRAINT fk_vendas_forma_pagamento FOREIGN KEY (forma_pagamento_id) REFERENCES formas_pagamento(id) ON DELETE SET NULL;',
    'SELECT 1;'
);

PREPARE stmt_add_fk_vendas_forma_pagamento FROM @sql_add_fk_vendas_forma_pagamento;
EXECUTE stmt_add_fk_vendas_forma_pagamento;
DEALLOCATE PREPARE stmt_add_fk_vendas_forma_pagamento;

-- 5a. Migrar dados existentes de forma_pagamento para tabela de referência
UPDATE vendas v
LEFT JOIN formas_pagamento fp ON LOWER(fp.nome) = LOWER(v.forma_pagamento)
SET v.forma_pagamento_id = fp.id
WHERE v.forma_pagamento_id IS NULL AND v.forma_pagamento IS NOT NULL;

-- 5b. Atribuir estoque padrão às vendas existentes
UPDATE vendas v
SET v.estoque_id = @estoque_padrao_id
WHERE v.estoque_id IS NULL;

COMMIT;
