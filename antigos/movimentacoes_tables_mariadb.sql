-- 📦 TABELAS PARA SISTEMA DE MOVIMENTAÇÕES DE ESTOQUE
-- Execute este script no seu banco MariaDB/MySQL

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

-- Inserir alguns fornecedores de exemplo (opcional)
INSERT IGNORE INTO fornecedores (nome, nome_fantasia, cnpj, email, telefone, cidade, estado) VALUES
('Fornecedor Exemplo 1', 'Fornecedor 1 Ltda', '12.345.678/0001-90', 'contato@fornecedor1.com', '(11) 99999-9999', 'São Paulo', 'SP'),
('Fornecedor Exemplo 2', 'Fornecedor 2 S/A', '98.765.432/0001-10', 'vendas@fornecedor2.com', '(11) 88888-8888', 'Rio de Janeiro', 'RJ');

-- Comentários para documentação
ALTER TABLE fornecedores COMMENT = 'Tabela de fornecedores para movimentações de estoque';
ALTER TABLE movimentacoes_estoque COMMENT = 'Tabela principal de movimentações de estoque (entrada, saída, ajuste)';
ALTER TABLE movimentacoes_itens COMMENT = 'Itens das movimentações de estoque';

-- Adicionar comentários nas colunas
ALTER TABLE movimentacoes_estoque 
MODIFY COLUMN tipo ENUM('entrada', 'saida', 'ajuste') NOT NULL COMMENT 'Tipo da movimentação: entrada, saida, ajuste',
MODIFY COLUMN condicao_pagamento ENUM('avista', '30dias', '60dias', '90dias', 'emprestimo', 'cobranca') DEFAULT 'avista' COMMENT 'Condição de pagamento: avista, 30dias, 60dias, 90dias, emprestimo, cobranca',
MODIFY COLUMN status ENUM('pendente', 'confirmado', 'cancelado') DEFAULT 'pendente' COMMENT 'Status da movimentação: pendente, confirmado, cancelado';
