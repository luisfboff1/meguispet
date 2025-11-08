-- =====================================================
-- PERFORMANCE OPTIMIZATION INDEXES FOR MEGUISPET
-- Additional composite indexes for frequently queried columns
-- =====================================================

-- Vendas composite indexes for dashboard queries
CREATE INDEX IF NOT EXISTS idx_vendas_status_data ON vendas(status, data_venda DESC);
CREATE INDEX IF NOT EXISTS idx_vendas_status_valor ON vendas(status, valor_final) WHERE status = 'pago';

-- Vendas_itens composite index for top products query
CREATE INDEX IF NOT EXISTS idx_vendas_itens_produto_created ON vendas_itens(produto_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vendas_itens_created_at ON vendas_itens(created_at DESC);

-- Produtos composite index for low stock queries
CREATE INDEX IF NOT EXISTS idx_produtos_ativo_estoque ON produtos(ativo, estoque, estoque_minimo) WHERE ativo = true;

-- Clientes/Fornecedores composite index
CREATE INDEX IF NOT EXISTS idx_clientes_fornecedores_tipo_ativo ON clientes_fornecedores(tipo, ativo);

-- Transacoes composite indexes for financial queries
CREATE INDEX IF NOT EXISTS idx_transacoes_tipo_data ON transacoes(tipo, data_transacao DESC);
CREATE INDEX IF NOT EXISTS idx_transacoes_status_data ON transacoes(status, data_transacao DESC);

-- Movimentacoes composite indexes
CREATE INDEX IF NOT EXISTS idx_movimentacoes_tipo_status_data ON movimentacoes_estoque(tipo, status, data_movimentacao DESC);

-- Additional performance index for vendas data range queries
CREATE INDEX IF NOT EXISTS idx_vendas_data_status ON vendas(data_venda DESC, status) WHERE status != 'cancelado';

-- Produtos search optimization
CREATE INDEX IF NOT EXISTS idx_produtos_nome_ativo ON produtos(nome, ativo) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_produtos_categoria_ativo ON produtos(categoria, ativo) WHERE ativo = true;
