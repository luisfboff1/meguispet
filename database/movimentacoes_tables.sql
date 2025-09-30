-- 📦 TABELAS PARA SISTEMA DE MOVIMENTAÇÕES DE ESTOQUE
-- Execute este script no seu banco PostgreSQL

-- Tabela de fornecedores
CREATE TABLE IF NOT EXISTS fornecedores (
    id SERIAL PRIMARY KEY,
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de movimentações de estoque
CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada', 'saida', 'ajuste')),
    fornecedor_id INTEGER REFERENCES fornecedores(id),
    numero_pedido VARCHAR(100),
    data_movimentacao DATE NOT NULL,
    valor_total DECIMAL(10,2) DEFAULT 0,
    condicao_pagamento VARCHAR(20) DEFAULT 'avista' CHECK (condicao_pagamento IN ('avista', '30dias', '60dias', '90dias', 'emprestimo', 'cobranca')),
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'confirmado', 'cancelado')),
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de itens das movimentações
CREATE TABLE IF NOT EXISTS movimentacoes_itens (
    id SERIAL PRIMARY KEY,
    movimentacao_id INTEGER NOT NULL REFERENCES movimentacoes_estoque(id) ON DELETE CASCADE,
    produto_id INTEGER NOT NULL REFERENCES produtos(id),
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    preco_unitario DECIMAL(10,2) NOT NULL CHECK (preco_unitario >= 0),
    subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_fornecedores_updated_at BEFORE UPDATE ON fornecedores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_movimentacoes_updated_at BEFORE UPDATE ON movimentacoes_estoque
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Inserir alguns fornecedores de exemplo (opcional)
INSERT INTO fornecedores (nome, nome_fantasia, cnpj, email, telefone, cidade, estado) VALUES
('Fornecedor Exemplo 1', 'Fornecedor 1 Ltda', '12.345.678/0001-90', 'contato@fornecedor1.com', '(11) 99999-9999', 'São Paulo', 'SP'),
('Fornecedor Exemplo 2', 'Fornecedor 2 S/A', '98.765.432/0001-10', 'vendas@fornecedor2.com', '(11) 88888-8888', 'Rio de Janeiro', 'RJ')
ON CONFLICT DO NOTHING;

-- Comentários para documentação
COMMENT ON TABLE fornecedores IS 'Tabela de fornecedores para movimentações de estoque';
COMMENT ON TABLE movimentacoes_estoque IS 'Tabela principal de movimentações de estoque (entrada, saída, ajuste)';
COMMENT ON TABLE movimentacoes_itens IS 'Itens das movimentações de estoque';

COMMENT ON COLUMN movimentacoes_estoque.tipo IS 'Tipo da movimentação: entrada, saida, ajuste';
COMMENT ON COLUMN movimentacoes_estoque.condicao_pagamento IS 'Condição de pagamento: avista, 30dias, 60dias, 90dias, emprestimo, cobranca';
COMMENT ON COLUMN movimentacoes_estoque.status IS 'Status da movimentação: pendente, confirmado, cancelado';
