-- =====================================================
-- SUPABASE/POSTGRESQL SCHEMA FOR MEGUISPET
-- Converted from MariaDB/MySQL
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. CORE TABLES
-- =====================================================

-- Usuarios table
CREATE TABLE IF NOT EXISTS usuarios (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NULL, -- Legacy column - passwords now managed by Supabase Auth
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    permissoes TEXT,
    ativo BOOLEAN NOT NULL DEFAULT true,
    supabase_user_id UUID NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Vendedores table
CREATE TABLE IF NOT EXISTS vendedores (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    telefone VARCHAR(20),
    comissao NUMERIC(5,2) DEFAULT 0,
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Clientes e Fornecedores unified table
CREATE TABLE IF NOT EXISTS clientes_fornecedores (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('cliente', 'fornecedor', 'ambos')),
    email VARCHAR(255),
    telefone VARCHAR(20),
    endereco TEXT,
    cidade VARCHAR(100),
    estado VARCHAR(2),
    cep VARCHAR(10),
    documento VARCHAR(18),
    observacoes TEXT,
    vendedor_id BIGINT,
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_clientes_vendedor FOREIGN KEY (vendedor_id) REFERENCES vendedores(id) ON DELETE SET NULL
);

-- Fornecedores table (separate for movimentacoes)
CREATE TABLE IF NOT EXISTS fornecedores (
    id BIGSERIAL PRIMARY KEY,
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
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Produtos table
CREATE TABLE IF NOT EXISTS produtos (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    preco NUMERIC(10,2) DEFAULT 0,
    preco_venda NUMERIC(10,2) DEFAULT 0,
    preco_custo NUMERIC(10,2) DEFAULT 0,
    estoque INT DEFAULT 0,
    estoque_minimo INT DEFAULT 0,
    categoria VARCHAR(100),
    codigo_barras VARCHAR(50),
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Estoques table (multi-warehouse support)
CREATE TABLE IF NOT EXISTS estoques (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    descricao VARCHAR(255),
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Produtos_estoques pivot table
CREATE TABLE IF NOT EXISTS produtos_estoques (
    id BIGSERIAL PRIMARY KEY,
    produto_id BIGINT NOT NULL,
    estoque_id BIGINT NOT NULL,
    quantidade INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_produto_estoque UNIQUE (produto_id, estoque_id),
    CONSTRAINT fk_produto_estoque_produto FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE,
    CONSTRAINT fk_produto_estoque_estoque FOREIGN KEY (estoque_id) REFERENCES estoques(id) ON DELETE CASCADE
);

-- Formas de pagamento table
CREATE TABLE IF NOT EXISTS formas_pagamento (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    ativo BOOLEAN NOT NULL DEFAULT true,
    ordem INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Vendas table
CREATE TABLE IF NOT EXISTS vendas (
    id BIGSERIAL PRIMARY KEY,
    numero_venda VARCHAR(50) NOT NULL UNIQUE,
    cliente_id BIGINT,
    vendedor_id BIGINT,
    estoque_id BIGINT,
    forma_pagamento_id BIGINT,
    data_venda TIMESTAMPTZ NOT NULL,
    valor_total NUMERIC(10,2) DEFAULT 0,
    valor_final NUMERIC(10,2) DEFAULT 0,
    desconto NUMERIC(10,2) DEFAULT 0,
    prazo_pagamento VARCHAR(64),
    imposto_percentual NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'cancelado')),
    forma_pagamento VARCHAR(50),
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_vendas_cliente FOREIGN KEY (cliente_id) REFERENCES clientes_fornecedores(id) ON DELETE SET NULL,
    CONSTRAINT fk_vendas_vendedor FOREIGN KEY (vendedor_id) REFERENCES vendedores(id) ON DELETE SET NULL,
    CONSTRAINT fk_vendas_estoque FOREIGN KEY (estoque_id) REFERENCES estoques(id) ON DELETE SET NULL,
    CONSTRAINT fk_vendas_forma_pagamento FOREIGN KEY (forma_pagamento_id) REFERENCES formas_pagamento(id) ON DELETE SET NULL
);

-- Vendas_itens table
CREATE TABLE IF NOT EXISTS vendas_itens (
    id BIGSERIAL PRIMARY KEY,
    venda_id BIGINT NOT NULL,
    produto_id BIGINT NOT NULL,
    quantidade INT NOT NULL,
    preco_unitario NUMERIC(10,2) NOT NULL,
    subtotal NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_vendas_itens_venda FOREIGN KEY (venda_id) REFERENCES vendas(id) ON DELETE CASCADE,
    CONSTRAINT fk_vendas_itens_produto FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE RESTRICT
);

-- Movimentacoes_estoque table
CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
    id BIGSERIAL PRIMARY KEY,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada', 'saida', 'ajuste')),
    fornecedor_id BIGINT,
    numero_pedido VARCHAR(100),
    data_movimentacao DATE NOT NULL,
    valor_total NUMERIC(10,2) DEFAULT 0,
    condicao_pagamento VARCHAR(20) DEFAULT 'avista' CHECK (condicao_pagamento IN ('avista', '30dias', '60dias', '90dias', 'emprestimo', 'cobranca')),
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'confirmado', 'cancelado')),
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_movimentacoes_fornecedor FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id) ON DELETE SET NULL
);

-- Movimentacoes_itens table
CREATE TABLE IF NOT EXISTS movimentacoes_itens (
    id BIGSERIAL PRIMARY KEY,
    movimentacao_id BIGINT NOT NULL,
    produto_id BIGINT NOT NULL,
    quantidade INT NOT NULL CHECK (quantidade > 0),
    preco_unitario NUMERIC(10,2) NOT NULL CHECK (preco_unitario >= 0),
    subtotal NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_movimentacoes_itens_movimentacao FOREIGN KEY (movimentacao_id) REFERENCES movimentacoes_estoque(id) ON DELETE CASCADE,
    CONSTRAINT fk_movimentacoes_itens_produto FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE RESTRICT
);

-- Historico_precos table
CREATE TABLE IF NOT EXISTS historico_precos (
    id BIGSERIAL PRIMARY KEY,
    produto_id BIGINT NOT NULL,
    preco_venda_anterior NUMERIC(10,2),
    preco_venda_novo NUMERIC(10,2),
    preco_custo_anterior NUMERIC(10,2),
    preco_custo_novo NUMERIC(10,2),
    tipo_alteracao VARCHAR(20) NOT NULL CHECK (tipo_alteracao IN ('manual', 'automatico', 'movimentacao')),
    observacao TEXT,
    usuario_id BIGINT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_historico_precos_produto FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE
);

-- Transacoes table (financial transactions)
CREATE TABLE IF NOT EXISTS transacoes (
    id BIGSERIAL PRIMARY KEY,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('receita', 'despesa')),
    categoria VARCHAR(100),
    descricao TEXT,
    valor NUMERIC(10,2) NOT NULL,
    data_transacao DATE NOT NULL,
    forma_pagamento VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'cancelado')),
    venda_id BIGINT,
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_transacoes_venda FOREIGN KEY (venda_id) REFERENCES vendas(id) ON DELETE SET NULL
);

-- =====================================================
-- 2. INDEXES
-- =====================================================

-- Usuarios indexes
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_ativo ON usuarios(ativo);
CREATE INDEX IF NOT EXISTS idx_usuarios_supabase_id ON usuarios(supabase_user_id);

-- Vendedores indexes
CREATE INDEX IF NOT EXISTS idx_vendedores_ativo ON vendedores(ativo);

-- Clientes/Fornecedores indexes
CREATE INDEX IF NOT EXISTS idx_clientes_fornecedores_tipo ON clientes_fornecedores(tipo);
CREATE INDEX IF NOT EXISTS idx_clientes_fornecedores_ativo ON clientes_fornecedores(ativo);
CREATE INDEX IF NOT EXISTS idx_clientes_fornecedores_documento ON clientes_fornecedores(documento);

-- Fornecedores indexes
CREATE INDEX IF NOT EXISTS idx_fornecedores_ativo ON fornecedores(ativo);
CREATE INDEX IF NOT EXISTS idx_fornecedores_cnpj ON fornecedores(cnpj);

-- Produtos indexes
CREATE INDEX IF NOT EXISTS idx_produtos_ativo ON produtos(ativo);
CREATE INDEX IF NOT EXISTS idx_produtos_categoria ON produtos(categoria);
CREATE INDEX IF NOT EXISTS idx_produtos_codigo_barras ON produtos(codigo_barras);

-- Vendas indexes
CREATE INDEX IF NOT EXISTS idx_vendas_cliente_id ON vendas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_vendas_vendedor_id ON vendas(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_vendas_data_venda ON vendas(data_venda);
CREATE INDEX IF NOT EXISTS idx_vendas_status ON vendas(status);

-- Movimentacoes indexes
CREATE INDEX IF NOT EXISTS idx_movimentacoes_tipo ON movimentacoes_estoque(tipo);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_status ON movimentacoes_estoque(status);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_data ON movimentacoes_estoque(data_movimentacao);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_fornecedor ON movimentacoes_estoque(fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_itens_produto ON movimentacoes_itens(produto_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_itens_movimentacao ON movimentacoes_itens(movimentacao_id);

-- Historico_precos indexes
CREATE INDEX IF NOT EXISTS idx_historico_precos_produto ON historico_precos(produto_id);
CREATE INDEX IF NOT EXISTS idx_historico_precos_created_at ON historico_precos(created_at);

-- =====================================================
-- 3. FUNCTIONS
-- =====================================================

-- Function to calculate weighted average price
CREATE OR REPLACE FUNCTION calcular_preco_medio_ponderado(
    produto_id_param BIGINT,
    nova_quantidade INT,
    novo_preco NUMERIC(10,2)
) RETURNS NUMERIC(10,2) AS $$
DECLARE
    estoque_atual INT := 0;
    preco_atual NUMERIC(10,2) := 0;
    estoque_total INT := 0;
    valor_total NUMERIC(10,2) := 0;
    preco_medio NUMERIC(10,2) := 0;
BEGIN
    SELECT estoque, preco_custo INTO estoque_atual, preco_atual
    FROM produtos
    WHERE id = produto_id_param;

    estoque_total := estoque_atual + nova_quantidade;
    valor_total := (estoque_atual * preco_atual) + (nova_quantidade * novo_preco);

    IF estoque_total > 0 THEN
        preco_medio := ROUND(valor_total / estoque_total, 2);
    ELSE
        preco_medio := novo_preco;
    END IF;

    RETURN preco_medio;
END;
$$ LANGUAGE plpgsql;

-- Function to update stock and weighted average price
CREATE OR REPLACE FUNCTION atualizar_estoque_preco_medio(
    produto_id_param BIGINT,
    quantidade_param INT,
    preco_param NUMERIC(10,2),
    tipo_movimentacao VARCHAR
) RETURNS VOID AS $$
DECLARE
    estoque_atual INT := 0;
    preco_atual NUMERIC(10,2) := 0;
    novo_estoque INT := 0;
    novo_preco NUMERIC(10,2) := 0;
BEGIN
    SELECT estoque, preco_custo INTO estoque_atual, preco_atual
    FROM produtos
    WHERE id = produto_id_param;

    IF tipo_movimentacao = 'entrada' THEN
        novo_estoque := estoque_atual + quantidade_param;
        novo_preco := calcular_preco_medio_ponderado(produto_id_param, quantidade_param, preco_param);
    ELSIF tipo_movimentacao = 'saida' THEN
        novo_estoque := estoque_atual - quantidade_param;
        novo_preco := preco_atual;
    ELSIF tipo_movimentacao = 'ajuste' THEN
        novo_estoque := quantidade_param;
        novo_preco := preco_atual;
    END IF;

    UPDATE produtos
    SET estoque = novo_estoque,
        preco_custo = novo_preco,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = produto_id_param;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. TRIGGERS
-- =====================================================

-- Updated_at triggers for all tables
CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendedores_updated_at BEFORE UPDATE ON vendedores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clientes_fornecedores_updated_at BEFORE UPDATE ON clientes_fornecedores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fornecedores_updated_at BEFORE UPDATE ON fornecedores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_produtos_updated_at BEFORE UPDATE ON produtos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_estoques_updated_at BEFORE UPDATE ON estoques FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_produtos_estoques_updated_at BEFORE UPDATE ON produtos_estoques FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_formas_pagamento_updated_at BEFORE UPDATE ON formas_pagamento FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendas_updated_at BEFORE UPDATE ON vendas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_movimentacoes_estoque_updated_at BEFORE UPDATE ON movimentacoes_estoque FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transacoes_updated_at BEFORE UPDATE ON transacoes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for price history tracking
CREATE OR REPLACE FUNCTION trigger_historico_preco()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.preco_venda IS DISTINCT FROM NEW.preco_venda THEN
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

    IF OLD.preco_custo IS DISTINCT FROM NEW.preco_custo AND OLD.preco_custo > 0 THEN
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

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_historico_preco_produtos AFTER UPDATE ON produtos FOR EACH ROW EXECUTE FUNCTION trigger_historico_preco();

-- =====================================================
-- 5. VIEWS
-- =====================================================

-- View for stock with calculated values
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

-- =====================================================
-- 6. INITIAL DATA
-- =====================================================

-- Insert default admin user (password: admin123 - hash generated with bcrypt)
INSERT INTO usuarios (nome, email, password_hash, role, ativo)
VALUES ('Admin', 'admin@meguispet.com', '$2a$10$YourHashedPasswordHere', 'admin', true)
ON CONFLICT (email) DO NOTHING;

-- Insert default payment methods
INSERT INTO formas_pagamento (nome, ordem) VALUES
    ('Dinheiro', 1),
    ('Cartão', 2),
    ('PIX', 3),
    ('Transferência', 4),
    ('Boleto', 5)
ON CONFLICT (nome) DO NOTHING;

-- Insert default warehouses
INSERT INTO estoques (nome, descricao) VALUES
    ('São Paulo', 'Centro de distribuição - SP'),
    ('Rio Grande do Sul', 'Centro de distribuição - RS')
ON CONFLICT (nome) DO NOTHING;

-- =====================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- =====================================================
-- Note: Enable RLS in Supabase dashboard for production
-- Policies should be configured based on your auth requirements

-- Example RLS policies (commented out - configure as needed):
-- ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can view their own data" ON usuarios FOR SELECT USING (auth.uid() = id::text);

-- =====================================================
-- END OF SCHEMA
-- =====================================================
