-- =====================================================
-- FINANCIAL CATEGORIES AND RECURRING TRANSACTIONS
-- Migration 005
-- =====================================================

-- Categorias Financeiras (Financial Categories)
CREATE TABLE IF NOT EXISTS categorias_financeiras (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('receita', 'despesa', 'ambos')),
    cor VARCHAR(7) DEFAULT '#6B7280', -- Hex color code for UI
    icone VARCHAR(50), -- Icon name for UI
    descricao TEXT,
    ativo BOOLEAN NOT NULL DEFAULT true,
    ordem INT DEFAULT 0, -- Display order
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Transações Recorrentes (Recurring Transactions)
CREATE TABLE IF NOT EXISTS transacoes_recorrentes (
    id BIGSERIAL PRIMARY KEY,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('receita', 'despesa')),
    categoria_id BIGINT,
    descricao TEXT NOT NULL,
    valor NUMERIC(10,2) NOT NULL,
    frequencia VARCHAR(20) NOT NULL CHECK (frequencia IN ('diaria', 'semanal', 'quinzenal', 'mensal', 'bimestral', 'trimestral', 'semestral', 'anual')),
    dia_vencimento INT, -- Day of month (1-31) or day of week (1-7) for weekly
    data_inicio DATE NOT NULL,
    data_fim DATE, -- NULL = indefinite
    proxima_geracao DATE NOT NULL, -- Next date to generate transaction
    observacoes TEXT,
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_transacoes_recorrentes_categoria FOREIGN KEY (categoria_id) REFERENCES categorias_financeiras(id) ON DELETE SET NULL
);

-- Add categoria_id to existing transacoes table
ALTER TABLE transacoes ADD COLUMN IF NOT EXISTS categoria_id BIGINT;
ALTER TABLE transacoes ADD COLUMN IF NOT EXISTS transacao_recorrente_id BIGINT;

-- Add foreign keys
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_transacoes_categoria'
    ) THEN
        ALTER TABLE transacoes 
        ADD CONSTRAINT fk_transacoes_categoria 
        FOREIGN KEY (categoria_id) 
        REFERENCES categorias_financeiras(id) 
        ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_transacoes_recorrente'
    ) THEN
        ALTER TABLE transacoes 
        ADD CONSTRAINT fk_transacoes_recorrente 
        FOREIGN KEY (transacao_recorrente_id) 
        REFERENCES transacoes_recorrentes(id) 
        ON DELETE SET NULL;
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transacoes_categoria_id ON transacoes(categoria_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_recorrente_id ON transacoes(transacao_recorrente_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_recorrentes_proxima_geracao ON transacoes_recorrentes(proxima_geracao);
CREATE INDEX IF NOT EXISTS idx_transacoes_recorrentes_ativo ON transacoes_recorrentes(ativo);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_categorias_financeiras_updated_at 
    BEFORE UPDATE ON categorias_financeiras 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transacoes_recorrentes_updated_at 
    BEFORE UPDATE ON transacoes_recorrentes 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Seed default categories
INSERT INTO categorias_financeiras (nome, tipo, cor, icone, ordem) VALUES
    ('Vendas', 'receita', '#10B981', 'DollarSign', 1),
    ('Serviços', 'receita', '#059669', 'Briefcase', 2),
    ('Outros Recebimentos', 'receita', '#34D399', 'TrendingUp', 3),
    ('Compras de Mercadorias', 'despesa', '#EF4444', 'ShoppingCart', 4),
    ('Folha de Pagamento', 'despesa', '#DC2626', 'Users', 5),
    ('Aluguel', 'despesa', '#F87171', 'Home', 6),
    ('Utilidades', 'despesa', '#FB923C', 'Zap', 7),
    ('Marketing', 'despesa', '#F59E0B', 'TrendingUp', 8),
    ('Manutenção', 'despesa', '#FBBF24', 'Tool', 9),
    ('Transporte', 'despesa', '#FCD34D', 'Truck', 10),
    ('Impostos e Taxas', 'despesa', '#EAB308', 'FileText', 11),
    ('Outros', 'ambos', '#6B7280', 'MoreHorizontal', 99)
ON CONFLICT (nome) DO NOTHING;

-- Migrate existing categories from text to categoria_id
DO $$
DECLARE
    categoria_record RECORD;
BEGIN
    FOR categoria_record IN 
        SELECT DISTINCT categoria FROM transacoes WHERE categoria IS NOT NULL
    LOOP
        -- Try to match existing category or create new one
        INSERT INTO categorias_financeiras (nome, tipo, ordem)
        VALUES (categoria_record.categoria, 'ambos', 50)
        ON CONFLICT (nome) DO NOTHING;
        
        -- Update transactions to use categoria_id
        UPDATE transacoes t
        SET categoria_id = cf.id
        FROM categorias_financeiras cf
        WHERE t.categoria = cf.nome 
        AND t.categoria = categoria_record.categoria
        AND t.categoria_id IS NULL;
    END LOOP;
END $$;

COMMENT ON TABLE categorias_financeiras IS 'Financial categories for income and expenses';
COMMENT ON TABLE transacoes_recorrentes IS 'Recurring financial transactions that auto-generate';
COMMENT ON COLUMN transacoes.categoria_id IS 'References categorias_financeiras.id - replaces text-based categoria';
COMMENT ON COLUMN transacoes.transacao_recorrente_id IS 'Link to recurring transaction that generated this entry';
