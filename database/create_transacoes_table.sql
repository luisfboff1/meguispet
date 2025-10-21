-- Tabela para transações financeiras
CREATE TABLE IF NOT EXISTS transacoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tipo ENUM('receita', 'despesa') NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    descricao VARCHAR(255) NOT NULL,
    categoria VARCHAR(100) NOT NULL,
    data_transacao DATE NOT NULL,
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_tipo (tipo),
    INDEX idx_data (data_transacao),
    INDEX idx_categoria (categoria)
);

-- Inserir dados de exemplo (mês atual - setembro 2025)
INSERT INTO transacoes (tipo, valor, descricao, categoria, data_transacao, observacoes) VALUES
('receita', 2500.00, 'Venda de ração premium', 'Vendas', '2025-09-15', 'Cliente: João Silva'),
('receita', 1800.00, 'Venda de brinquedos', 'Vendas', '2025-09-16', 'Cliente: Maria Santos'),
('despesa', 500.00, 'Compra de estoque', 'Compras', '2025-09-17', 'Fornecedor: Pet Supply'),
('receita', 3200.00, 'Venda de medicamentos', 'Vendas', '2025-09-18', 'Cliente: Carlos Oliveira'),
('despesa', 200.00, 'Energia elétrica', 'Utilidades', '2025-09-19', 'Conta do mês'),
('despesa', 150.00, 'Internet', 'Utilidades', '2025-09-20', 'Conta do mês'),
('receita', 950.00, 'Venda de acessórios', 'Vendas', '2025-09-21', 'Cliente: Ana Costa'),
('despesa', 300.00, 'Aluguel', 'Aluguel', '2025-09-22', 'Loja principal'),
('receita', 4200.00, 'Venda de ração especial', 'Vendas', '2025-09-23', 'Cliente: Pedro Lima'),
('despesa', 800.00, 'Salário funcionário', 'Folha', '2025-09-24', 'Funcionário: José'),
('receita', 1600.00, 'Venda de brinquedos', 'Vendas', '2025-09-25', 'Cliente: Lucia Ferreira'),
('despesa', 450.00, 'Marketing', 'Marketing', '2025-09-26', 'Google Ads'),
('receita', 2800.00, 'Venda de medicamentos', 'Vendas', '2025-09-27', 'Cliente: Roberto Silva'),
('despesa', 120.00, 'Água', 'Utilidades', '2025-09-28', 'Conta do mês'),
('receita', 1900.00, 'Venda de acessórios', 'Vendas', '2025-09-29', 'Cliente: Fernanda Costa');
