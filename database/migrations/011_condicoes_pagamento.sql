-- =====================================================
-- SISTEMA DE CONDIÇÕES DE PAGAMENTO
-- Migration 011: Payment Terms System
-- =====================================================
-- Descrição: Adiciona tabela para gerenciar condições de pagamento
-- que definem prazos de parcelamento (ex: 15, 30, 45 dias)

-- Criar tabela de condições de pagamento
CREATE TABLE IF NOT EXISTS condicoes_pagamento (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE, -- Nome da condição (ex: "15/30/45 dias")
    descricao TEXT, -- Descrição opcional da condição
    dias_parcelas JSONB NOT NULL, -- Array de dias [15, 30, 45] ou [30, 60, 90]
    ativo BOOLEAN NOT NULL DEFAULT true,
    ordem INT DEFAULT 0, -- Ordem de exibição
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Adicionar campo condicao_pagamento_id na tabela vendas (opcional)
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS condicao_pagamento_id BIGINT NULL;
ALTER TABLE vendas ADD CONSTRAINT fk_vendas_condicao_pagamento 
    FOREIGN KEY (condicao_pagamento_id) REFERENCES condicoes_pagamento(id) ON DELETE SET NULL;

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_condicoes_pagamento_ativo ON condicoes_pagamento(ativo);
CREATE INDEX IF NOT EXISTS idx_condicoes_pagamento_ordem ON condicoes_pagamento(ordem);
CREATE INDEX IF NOT EXISTS idx_vendas_condicao_pagamento_id ON vendas(condicao_pagamento_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_condicoes_pagamento_updated_at
    BEFORE UPDATE ON condicoes_pagamento
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comentários nas colunas para documentação
COMMENT ON TABLE condicoes_pagamento IS 'Armazena condições de pagamento pré-definidas (ex: 15/30/45 dias)';
COMMENT ON COLUMN condicoes_pagamento.nome IS 'Nome da condição de pagamento';
COMMENT ON COLUMN condicoes_pagamento.descricao IS 'Descrição opcional da condição';
COMMENT ON COLUMN condicoes_pagamento.dias_parcelas IS 'Array JSON com os dias de cada parcela [15, 30, 45]';
COMMENT ON COLUMN condicoes_pagamento.ativo IS 'Se a condição está ativa para uso';
COMMENT ON COLUMN condicoes_pagamento.ordem IS 'Ordem de exibição na lista';

-- Inserir condições de pagamento padrão
INSERT INTO condicoes_pagamento (nome, descricao, dias_parcelas, ativo, ordem) VALUES
    ('À Vista', 'Pagamento à vista', '[0]', true, 1),
    ('15 Dias', 'Pagamento em 15 dias', '[15]', true, 2),
    ('30 Dias', 'Pagamento em 30 dias', '[30]', true, 3),
    ('15/30 Dias', 'Parcelado em 15 e 30 dias', '[15, 30]', true, 4),
    ('30/60 Dias', 'Parcelado em 30 e 60 dias', '[30, 60]', true, 5),
    ('30/60/90 Dias', 'Parcelado em 30, 60 e 90 dias', '[30, 60, 90]', true, 6),
    ('15/30/45 Dias', 'Parcelado em 15, 30 e 45 dias', '[15, 30, 45]', true, 7),
    ('Personalizado', 'Condição de pagamento personalizada', '[]', true, 99)
ON CONFLICT (nome) DO NOTHING;

-- Log da migração
DO $$
BEGIN
    RAISE NOTICE 'Migração 011: Tabela condicoes_pagamento criada com sucesso';
END $$;
