-- =====================================================
-- SISTEMA DE PARCELAS DE VENDAS
-- Migration 010: Installment Payment System
-- =====================================================

-- Criar tabela de parcelas de vendas
CREATE TABLE IF NOT EXISTS venda_parcelas (
    id BIGSERIAL PRIMARY KEY,
    venda_id BIGINT NOT NULL,
    numero_parcela INT NOT NULL, -- 1, 2, 3, etc
    valor_parcela NUMERIC(10,2) NOT NULL,
    data_vencimento DATE NOT NULL,
    data_pagamento DATE NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'atrasado', 'cancelado')),
    transacao_id BIGINT NULL, -- Link para a transação financeira
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_venda_parcelas_venda FOREIGN KEY (venda_id) REFERENCES vendas(id) ON DELETE CASCADE,
    CONSTRAINT fk_venda_parcelas_transacao FOREIGN KEY (transacao_id) REFERENCES transacoes(id) ON DELETE SET NULL,
    CONSTRAINT uk_venda_parcela UNIQUE (venda_id, numero_parcela)
);

-- Adicionar campo na tabela de transações para vincular com parcelas
ALTER TABLE transacoes ADD COLUMN IF NOT EXISTS venda_parcela_id BIGINT NULL;
ALTER TABLE transacoes ADD CONSTRAINT fk_transacoes_parcela 
    FOREIGN KEY (venda_parcela_id) REFERENCES venda_parcelas(id) ON DELETE SET NULL;

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_venda_parcelas_venda_id ON venda_parcelas(venda_id);
CREATE INDEX IF NOT EXISTS idx_venda_parcelas_status ON venda_parcelas(status);
CREATE INDEX IF NOT EXISTS idx_venda_parcelas_data_vencimento ON venda_parcelas(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_transacoes_venda_parcela_id ON transacoes(venda_parcela_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_venda_parcelas_updated_at
    BEFORE UPDATE ON venda_parcelas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Função para atualizar status de parcelas atrasadas
CREATE OR REPLACE FUNCTION atualizar_status_parcelas_atrasadas()
RETURNS void AS $$
BEGIN
    UPDATE venda_parcelas
    SET status = 'atrasado'
    WHERE status = 'pendente'
    AND data_vencimento < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Comentários nas colunas para documentação
COMMENT ON TABLE venda_parcelas IS 'Armazena as parcelas de pagamento das vendas';
COMMENT ON COLUMN venda_parcelas.numero_parcela IS 'Número sequencial da parcela (1, 2, 3, ...)';
COMMENT ON COLUMN venda_parcelas.valor_parcela IS 'Valor individual da parcela';
COMMENT ON COLUMN venda_parcelas.data_vencimento IS 'Data de vencimento da parcela';
COMMENT ON COLUMN venda_parcelas.data_pagamento IS 'Data efetiva do pagamento (quando realizado)';
COMMENT ON COLUMN venda_parcelas.status IS 'Status da parcela: pendente, pago, atrasado, cancelado';
COMMENT ON COLUMN venda_parcelas.transacao_id IS 'ID da transação financeira vinculada';
