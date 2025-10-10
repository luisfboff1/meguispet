-- Adicionar dados históricos para os últimos 6 meses
-- Execute este script para popular o gráfico

-- Agosto 2025
INSERT INTO transacoes (tipo, valor, descricao, categoria, data_transacao, observacoes) VALUES
('receita', 2200.00, 'Venda de ração premium', 'Vendas', '2025-08-15', 'Cliente: João Silva'),
('despesa', 400.00, 'Compra de estoque', 'Compras', '2025-08-20', 'Fornecedor: Pet Supply'),
('receita', 1800.00, 'Venda de medicamentos', 'Vendas', '2025-08-25', 'Cliente: Maria Santos');

-- Julho 2025
INSERT INTO transacoes (tipo, valor, descricao, categoria, data_transacao, observacoes) VALUES
('receita', 3100.00, 'Venda de acessórios', 'Vendas', '2025-07-10', 'Cliente: Carlos Oliveira'),
('despesa', 600.00, 'Marketing', 'Marketing', '2025-07-15', 'Google Ads'),
('receita', 2500.00, 'Venda de brinquedos', 'Vendas', '2025-07-20', 'Cliente: Ana Costa');

-- Junho 2025
INSERT INTO transacoes (tipo, valor, descricao, categoria, data_transacao, observacoes) VALUES
('receita', 1900.00, 'Venda de ração especial', 'Vendas', '2025-06-12', 'Cliente: Pedro Lima'),
('despesa', 800.00, 'Salário funcionário', 'Folha', '2025-06-25', 'Funcionário: José'),
('receita', 3200.00, 'Venda de medicamentos', 'Vendas', '2025-06-28', 'Cliente: Roberto Silva');

-- Maio 2025
INSERT INTO transacoes (tipo, valor, descricao, categoria, data_transacao, observacoes) VALUES
('receita', 2400.00, 'Venda de acessórios', 'Vendas', '2025-05-08', 'Cliente: Lucia Ferreira'),
('despesa', 350.00, 'Energia elétrica', 'Utilidades', '2025-05-20', 'Conta do mês'),
('receita', 1600.00, 'Venda de brinquedos', 'Vendas', '2025-05-25', 'Cliente: Fernanda Costa');

-- Abril 2025
INSERT INTO transacoes (tipo, valor, descricao, categoria, data_transacao, observacoes) VALUES
('receita', 2800.00, 'Venda de ração premium', 'Vendas', '2025-04-14', 'Cliente: João Silva'),
('despesa', 500.00, 'Internet', 'Utilidades', '2025-04-18', 'Conta do mês'),
('receita', 2100.00, 'Venda de medicamentos', 'Vendas', '2025-04-22', 'Cliente: Maria Santos');

-- Verificar os dados inseridos
SELECT 
    DATE_FORMAT(data_transacao, '%Y-%m') as mes,
    COUNT(*) as total_transacoes,
    SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END) as receitas,
    SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END) as despesas
FROM transacoes 
WHERE data_transacao >= '2025-04-01'
GROUP BY DATE_FORMAT(data_transacao, '%Y-%m')
ORDER BY mes ASC;
