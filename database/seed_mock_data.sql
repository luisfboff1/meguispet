-- =====================================================
-- SEED MOCK DATA FOR MEGUISPET SUPABASE
-- Dados de teste para desenvolvimento e demonstração
-- =====================================================

-- Limpar dados existentes (cuidado em produção!)
-- TRUNCATE TABLE vendas_itens, vendas, movimentacoes_itens, movimentacoes_estoque,
-- produtos_estoques, historico_precos, produtos, formas_pagamento, estoques,
-- vendedores, clientes_fornecedores, fornecedores, usuarios RESTART IDENTITY CASCADE;

-- =====================================================
-- 1. USUÁRIOS (com senhas hash bcrypt para 'admin123')
-- =====================================================
INSERT INTO usuarios (nome, email, password_hash, role, permissoes, ativo) VALUES
('Administrador', 'admin@meguispet.com', '$2a$10$rG5z8qN5yX5yX5yX5yX5yOJ5yX5yX5yX5yX5yX5yX5yX5yX5yX5y', 'admin', 'all', true),
('Luis Fernando', 'luis@meguispet.com', '$2a$10$rG5z8qN5yX5yX5yX5yX5yOJ5yX5yX5yX5yX5yX5yX5yX5yX5yX5y', 'gerente', 'vendas,estoque,relatorios', true),
('Maria Silva', 'maria@meguispet.com', '$2a$10$rG5z8qN5yX5yX5yX5yX5yOJ5yX5yX5yX5yX5yX5yX5yX5yX5yX5y', 'vendedor', 'vendas', true),
('João Santos', 'joao@meguispet.com', '$2a$10$rG5z8qN5yX5yX5yX5yX5yOJ5yX5yX5yX5yX5yX5yX5yX5yX5yX5y', 'vendedor', 'vendas', true)
ON CONFLICT (email) DO NOTHING;

-- =====================================================
-- 2. VENDEDORES
-- =====================================================
INSERT INTO vendedores (nome, email, telefone, comissao, ativo) VALUES
('Maria Silva', 'maria@meguispet.com', '(11) 98765-4321', 5.00, true),
('João Santos', 'joao@meguispet.com', '(11) 97654-3210', 4.50, true),
('Ana Costa', 'ana@meguispet.com', '(11) 96543-2109', 5.50, true),
('Pedro Lima', 'pedro@meguispet.com', '(11) 95432-1098', 4.00, true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 3. FORNECEDORES
-- =====================================================
INSERT INTO fornecedores (nome, nome_fantasia, cnpj, inscricao_estadual, email, telefone, endereco, cidade, estado, cep, ativo) VALUES
('Petshop Distribuidora Ltda', 'Pet Distribuidor', '12.345.678/0001-90', '123.456.789.012', 'contato@petdistribuidor.com.br', '(11) 3333-4444', 'Rua das Flores, 123', 'São Paulo', 'SP', '01234-567', true),
('Ração Total EIRELI', 'Ração Total', '98.765.432/0001-10', '987.654.321.098', 'vendas@racaototal.com.br', '(11) 2222-3333', 'Av. Paulista, 1000', 'São Paulo', 'SP', '01310-100', true),
('Pet Care Produtos Ltda', 'Pet Care', '11.222.333/0001-44', '111.222.333.444', 'comercial@petcare.com.br', '(11) 4444-5555', 'Rua Augusta, 500', 'São Paulo', 'SP', '01305-000', true),
('Animal House Supplies', 'Animal House', '55.666.777/0001-88', '555.666.777.888', 'info@animalhouse.com.br', '(11) 5555-6666', 'Av. Brigadeiro, 2000', 'São Paulo', 'SP', '01402-001', true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 4. CLIENTES E FORNECEDORES (tabela unificada)
-- =====================================================
INSERT INTO clientes_fornecedores (nome, tipo, email, telefone, endereco, cidade, estado, cep, documento, observacoes, vendedor_id, ativo) VALUES
-- Clientes
('Carlos Eduardo Silva', 'cliente', 'carlos.silva@email.com', '(11) 98888-7777', 'Rua das Acácias, 45', 'São Paulo', 'SP', '01234-567', '123.456.789-00', 'Cliente desde 2020', 1, true),
('Fernanda Oliveira', 'cliente', 'fernanda.oli@email.com', '(11) 97777-6666', 'Av. São João, 890', 'São Paulo', 'SP', '01035-000', '987.654.321-00', 'Compra mensalmente', 2, true),
('Roberto Costa Lima', 'cliente', 'roberto.lima@email.com', '(11) 96666-5555', 'Rua Consolação, 200', 'São Paulo', 'SP', '01301-000', '456.789.123-00', NULL, 1, true),
('Patricia Santos', 'cliente', 'patricia.santos@email.com', '(11) 95555-4444', 'Av. Paulista, 1500', 'São Paulo', 'SP', '01310-100', '321.654.987-00', 'Cliente VIP', 3, true),
('Marcos Pereira', 'cliente', 'marcos.pereira@email.com', '(11) 94444-3333', 'Rua Augusta, 750', 'São Paulo', 'SP', '01305-100', '789.123.456-00', NULL, 2, true),
('Julia Fernandes', 'cliente', 'julia.fernandes@email.com', '(11) 93333-2222', 'Av. Rebouças, 300', 'São Paulo', 'SP', '05401-000', '654.321.987-00', 'Indicada por Patricia', 4, true),
('Ricardo Alves', 'cliente', 'ricardo.alves@email.com', '(11) 92222-1111', 'Rua Oscar Freire, 100', 'São Paulo', 'SP', '01426-000', '147.258.369-00', NULL, 1, true),
('Amanda Souza', 'cliente', 'amanda.souza@email.com', '(11) 91111-0000', 'Av. Faria Lima, 2000', 'São Paulo', 'SP', '01452-000', '258.369.147-00', 'Compra brinquedos', 3, true),
('Thiago Martins', 'cliente', 'thiago.martins@email.com', '(11) 90000-9999', 'Rua Haddock Lobo, 500', 'São Paulo', 'SP', '01414-001', '369.147.258-00', NULL, 2, true),
('Camila Rodrigues', 'cliente', 'camila.rodrigues@email.com', '(11) 89999-8888', 'Av. Ibirapuera, 3000', 'São Paulo', 'SP', '04029-902', '741.852.963-00', 'Cliente frequente', 4, true),
-- Fornecedores (referenciando os já criados na tabela fornecedores)
('Petshop Distribuidora Ltda', 'fornecedor', 'contato@petdistribuidor.com.br', '(11) 3333-4444', 'Rua das Flores, 123', 'São Paulo', 'SP', '01234-567', '12.345.678/0001-90', 'Fornecedor principal', NULL, true),
('Ração Total EIRELI', 'fornecedor', 'vendas@racaototal.com.br', '(11) 2222-3333', 'Av. Paulista, 1000', 'São Paulo', 'SP', '01310-100', '98.765.432/0001-10', 'Melhor preço em rações', NULL, true),
('Pet Care Produtos Ltda', 'fornecedor', 'comercial@petcare.com.br', '(11) 4444-5555', 'Rua Augusta, 500', 'São Paulo', 'SP', '01305-000', '11.222.333/0001-44', NULL, NULL, true),
('Animal House Supplies', 'fornecedor', 'info@animalhouse.com.br', '(11) 5555-6666', 'Av. Brigadeiro, 2000', 'São Paulo', 'SP', '01402-001', '55.666.777/0001-88', 'Acessórios importados', NULL, true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 5. ESTOQUES (locais de armazenamento)
-- =====================================================
INSERT INTO estoques (nome, descricao, localizacao, ativo) VALUES
('Estoque Principal', 'Estoque principal da loja física', 'Loja - Térreo', true),
('Depósito', 'Depósito externo para grandes volumes', 'Rua das Indústrias, 500', true),
('Loja Virtual', 'Estoque dedicado para vendas online', 'CD E-commerce', true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 6. PRODUTOS
-- =====================================================
INSERT INTO produtos (nome, descricao, preco_venda, preco_custo, estoque_minimo, categoria, codigo_barras, ativo) VALUES
-- Rações
('Ração Premium Cães Adultos 15kg', 'Ração super premium para cães adultos de todas as raças', 189.90, 125.00, 20, 'Ração - Cães', '7891234567890', true),
('Ração Premium Cães Filhotes 15kg', 'Ração super premium para filhotes até 12 meses', 199.90, 132.00, 15, 'Ração - Cães', '7891234567891', true),
('Ração Premium Gatos Adultos 10kg', 'Ração super premium para gatos adultos', 169.90, 112.00, 25, 'Ração - Gatos', '7891234567892', true),
('Ração Premium Gatos Filhotes 3kg', 'Ração especial para filhotes de gatos', 89.90, 59.00, 30, 'Ração - Gatos', '7891234567893', true),
('Ração Golden Cães Adultos 15kg', 'Ração Golden fórmula adultos', 165.90, 109.00, 18, 'Ração - Cães', '7891234567894', true),
-- Petiscos
('Petisco Natural Cães - Frango 500g', 'Petisco natural desidratado de frango', 34.90, 23.00, 40, 'Petiscos - Cães', '7891234567895', true),
('Petisco Natural Gatos - Peixe 300g', 'Petisco natural de peixe para gatos', 29.90, 19.50, 35, 'Petiscos - Gatos', '7891234567896', true),
('Osso Natural Grande', 'Osso natural bovino para cães grandes', 12.90, 8.50, 50, 'Petiscos - Cães', '7891234567897', true),
-- Brinquedos
('Bola de Borracha Grande', 'Bola resistente para cães grandes', 24.90, 16.00, 45, 'Brinquedos - Cães', '7891234567898', true),
('Arranhador Torre 1,2m', 'Torre arranhador para gatos com plataformas', 289.90, 190.00, 10, 'Brinquedos - Gatos', '7891234567899', true),
('Mordedor Dental Cães', 'Mordedor que limpa os dentes', 18.90, 12.50, 60, 'Brinquedos - Cães', '7891234567900', true),
-- Higiene e Limpeza
('Shampoo Neutro Cães 500ml', 'Shampoo pH neutro para uso frequente', 32.90, 21.50, 30, 'Higiene', '7891234567901', true),
('Shampoo Neutro Gatos 500ml', 'Shampoo pH neutro para gatos', 36.90, 24.00, 25, 'Higiene', '7891234567902', true),
('Areia Sanitária Gatos 4kg', 'Areia higiênica com controle de odor', 24.90, 16.50, 40, 'Higiene', '7891234567903', true),
('Tapete Higiênico 80x60 (30un)', 'Tapete absorvente para treinamento', 45.90, 30.00, 20, 'Higiene', '7891234567904', true),
-- Acessórios
('Coleira Nylon Ajustável P', 'Coleira resistente tamanho P', 15.90, 10.50, 50, 'Acessórios - Cães', '7891234567905', true),
('Coleira Nylon Ajustável M', 'Coleira resistente tamanho M', 18.90, 12.50, 45, 'Acessórios - Cães', '7891234567906', true),
('Coleira Nylon Ajustável G', 'Coleira resistente tamanho G', 21.90, 14.50, 40, 'Acessórios - Cães', '7891234567907', true),
('Guia Retrátil 5m', 'Guia retrátil para cães até 20kg', 79.90, 52.00, 15, 'Acessórios - Cães', '7891234567908', true),
('Bebedouro Automático 2L', 'Bebedouro com filtro automático', 129.90, 85.00, 12, 'Acessórios', '7891234567909', true),
('Comedouro Inox Duplo', 'Comedouro duplo em inox anti-derrapante', 49.90, 32.50, 25, 'Acessórios', '7891234567910', true),
-- Medicamentos e Saúde
('Antipulgas Cães até 10kg (3 pipetas)', 'Antipulgas de longa duração', 89.90, 59.00, 20, 'Saúde - Cães', '7891234567911', true),
('Antipulgas Cães 10-25kg (3 pipetas)', 'Antipulgas de longa duração', 99.90, 65.50, 18, 'Saúde - Cães', '7891234567912', true),
('Antipulgas Gatos (3 pipetas)', 'Antipulgas específico para gatos', 79.90, 52.50, 22, 'Saúde - Gatos', '7891234567913', true),
('Vermífugo Cães até 10kg (4 comprimidos)', 'Vermífugo de amplo espectro', 42.90, 28.00, 30, 'Saúde - Cães', '7891234567914', true),
('Vitamina para Cães 120ml', 'Suplemento vitamínico completo', 54.90, 36.00, 25, 'Saúde - Cães', '7891234567915', true)
ON CONFLICT (codigo_barras) DO NOTHING;

-- =====================================================
-- 7. PRODUTOS_ESTOQUES (quantidade em cada estoque)
-- =====================================================
INSERT INTO produtos_estoques (produto_id, estoque_id, quantidade) VALUES
-- Estoque Principal (id: 1)
(1, 1, 45), (2, 1, 32), (3, 1, 58), (4, 1, 67), (5, 1, 38),
(6, 1, 89), (7, 1, 76), (8, 1, 102), (9, 1, 67), (10, 1, 15),
(11, 1, 124), (12, 1, 54), (13, 1, 48), (14, 1, 78), (15, 1, 95),
(16, 1, 110), (17, 1, 98), (18, 1, 87), (19, 1, 34), (20, 1, 28),
(21, 1, 56), (22, 1, 42), (23, 1, 38), (24, 1, 35), (25, 1, 51),
-- Depósito (id: 2)
(1, 2, 120), (2, 2, 85), (3, 2, 145), (4, 2, 98), (5, 2, 76),
(6, 2, 210), (7, 2, 189), (12, 2, 95), (13, 2, 87), (14, 2, 156),
-- Loja Virtual (id: 3)
(1, 3, 25), (2, 3, 18), (3, 3, 32), (6, 3, 45), (9, 3, 28),
(10, 3, 8), (15, 3, 34), (19, 3, 12), (20, 3, 15), (22, 3, 18)
ON CONFLICT (produto_id, estoque_id) DO NOTHING;

-- =====================================================
-- 8. FORMAS DE PAGAMENTO
-- =====================================================
INSERT INTO formas_pagamento (nome, descricao, ativo) VALUES
('Dinheiro', 'Pagamento em dinheiro', true),
('Cartão de Débito', 'Cartão de débito à vista', true),
('Cartão de Crédito', 'Cartão de crédito em até 12x', true),
('PIX', 'Pagamento instantâneo via PIX', true),
('Boleto', 'Boleto bancário', true),
('Crediário', 'Parcelamento próprio da loja', true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 9. VENDAS
-- =====================================================
INSERT INTO vendas (numero_venda, cliente_id, vendedor_id, estoque_id, forma_pagamento_id, data_venda, valor_total, desconto, valor_final, prazo_pagamento, imposto_percentual, status, origem_venda, observacoes) VALUES
-- Vendas do mês atual
('VND-2025-001', 1, 1, 1, 4, '2025-10-01 10:30:00', 224.80, 0, 224.80, NULL, 0, 'pago', 'loja_fisica', 'Cliente levou ração e petiscos'),
('VND-2025-002', 2, 2, 1, 1, '2025-10-02 14:20:00', 289.90, 10.00, 279.90, NULL, 0, 'pago', 'loja_fisica', 'Desconto de fidelidade'),
('VND-2025-003', 3, 1, 1, 3, '2025-10-03 09:15:00', 465.70, 0, 465.70, NULL, 0, 'pago', 'loja_fisica', 'Parcelado em 3x'),
('VND-2025-004', 4, 3, 3, 4, '2025-10-05 16:45:00', 189.90, 0, 189.90, NULL, 0, 'pago', 'mercado_livre', 'Venda online'),
('VND-2025-005', 5, 2, 1, 2, '2025-10-07 11:00:00', 157.80, 5.00, 152.80, NULL, 0, 'pago', 'loja_fisica', NULL),
('VND-2025-006', 6, 4, 1, 4, '2025-10-08 13:30:00', 359.70, 0, 359.70, NULL, 0, 'pago', 'shopee', 'Venda online'),
('VND-2025-007', 7, 1, 1, 3, '2025-10-10 10:00:00', 524.60, 20.00, 504.60, NULL, 0, 'pago', 'loja_fisica', 'Cliente comprou kit completo'),
('VND-2025-008', 8, 3, 1, 4, '2025-10-12 15:20:00', 199.90, 0, 199.90, NULL, 0, 'pendente', 'loja_fisica', 'Aguardando confirmação PIX'),
('VND-2025-009', 9, 2, 1, 1, '2025-10-14 09:40:00', 387.60, 0, 387.60, NULL, 0, 'pago', 'loja_fisica', NULL),
('VND-2025-010', 10, 4, 3, 4, '2025-10-15 14:10:00', 169.90, 0, 169.90, NULL, 0, 'pago', 'mercado_livre', 'Entrega expressa'),
('VND-2025-011', 1, 1, 1, 4, '2025-10-17 11:25:00', 278.70, 10.00, 268.70, NULL, 0, 'pago', 'loja_fisica', 'Cliente frequente'),
('VND-2025-012', 2, 2, 1, 3, '2025-10-18 16:00:00', 445.50, 0, 445.50, NULL, 0, 'pago', 'loja_fisica', 'Parcelado em 4x'),
('VND-2025-013', 3, 3, 1, 4, '2025-10-19 10:30:00', 324.80, 15.00, 309.80, NULL, 0, 'pendente', 'loja_fisica', 'Separar produtos'),
('VND-2025-014', 4, 1, 1, 2, '2025-10-20 13:45:00', 195.80, 0, 195.80, NULL, 0, 'pago', 'loja_fisica', NULL),
('VND-2025-015', 5, 4, 3, 4, '2025-10-21 09:20:00', 259.70, 0, 259.70, NULL, 0, 'pago', 'shopee', NULL)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 10. VENDAS_ITENS
-- =====================================================
INSERT INTO vendas_itens (venda_id, produto_id, quantidade, preco_unitario, subtotal) VALUES
-- VND-2025-001
(1, 1, 1, 189.90, 189.90),
(1, 6, 1, 34.90, 34.90),
-- VND-2025-002
(2, 10, 1, 289.90, 289.90),
-- VND-2025-003
(3, 1, 2, 189.90, 379.80),
(3, 11, 1, 18.90, 18.90),
(3, 16, 1, 15.90, 15.90),
(3, 20, 1, 49.90, 49.90),
(3, 2, 1, 1.20, 1.20),
-- VND-2025-004
(4, 1, 1, 189.90, 189.90),
-- VND-2025-005
(5, 3, 1, 169.90, 169.90),
(5, 6, 1, 34.90, 34.90),
(5, 8, 1, 12.90, 12.90),
-- VND-2025-006
(6, 1, 1, 189.90, 189.90),
(6, 3, 1, 169.90, 169.90),
-- VND-2025-007
(7, 1, 1, 189.90, 189.90),
(7, 5, 1, 165.90, 165.90),
(7, 19, 1, 79.90, 79.90),
(7, 20, 1, 49.90, 49.90),
(7, 12, 1, 32.90, 32.90),
(7, 14, 1, 24.90, 24.90),
-- VND-2025-008
(8, 2, 1, 199.90, 199.90),
-- VND-2025-009
(9, 1, 2, 189.90, 379.80),
(9, 14, 1, 24.90, 24.90),
-- VND-2025-010
(10, 3, 1, 169.90, 169.90),
-- VND-2025-011
(11, 3, 1, 169.90, 169.90),
(11, 4, 1, 89.90, 89.90),
(11, 7, 1, 29.90, 29.90),
-- VND-2025-012
(12, 1, 2, 189.90, 379.80),
(12, 6, 2, 34.90, 69.80),
-- VND-2025-013
(13, 22, 2, 89.90, 179.80),
(13, 23, 1, 99.90, 99.90),
(13, 12, 1, 32.90, 32.90),
(13, 14, 1, 24.90, 24.90),
-- VND-2025-014
(14, 3, 1, 169.90, 169.90),
(14, 7, 1, 29.90, 29.90),
-- VND-2025-015
(15, 1, 1, 189.90, 189.90),
(15, 6, 2, 34.90, 69.80)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 11. TRANSAÇÕES FINANCEIRAS
-- =====================================================
INSERT INTO transacoes_financeiras (tipo, valor, descricao, categoria, data_transacao, observacoes) VALUES
-- Receitas (vendas)
('receita', 224.80, 'Venda VND-2025-001', 'Vendas', '2025-10-01', NULL),
('receita', 279.90, 'Venda VND-2025-002', 'Vendas', '2025-10-02', NULL),
('receita', 465.70, 'Venda VND-2025-003', 'Vendas', '2025-10-03', NULL),
('receita', 189.90, 'Venda VND-2025-004', 'Vendas', '2025-10-05', NULL),
('receita', 152.80, 'Venda VND-2025-005', 'Vendas', '2025-10-07', NULL),
('receita', 359.70, 'Venda VND-2025-006', 'Vendas', '2025-10-08', NULL),
('receita', 504.60, 'Venda VND-2025-007', 'Vendas', '2025-10-10', NULL),
('receita', 387.60, 'Venda VND-2025-009', 'Vendas', '2025-10-14', NULL),
('receita', 169.90, 'Venda VND-2025-010', 'Vendas', '2025-10-15', NULL),
('receita', 268.70, 'Venda VND-2025-011', 'Vendas', '2025-10-17', NULL),
('receita', 445.50, 'Venda VND-2025-012', 'Vendas', '2025-10-18', NULL),
('receita', 195.80, 'Venda VND-2025-014', 'Vendas', '2025-10-20', NULL),
('receita', 259.70, 'Venda VND-2025-015', 'Vendas', '2025-10-21', NULL),
-- Despesas
('despesa', 1500.00, 'Aluguel da loja', 'Aluguel', '2025-10-05', 'Referente a outubro/2025'),
('despesa', 850.00, 'Salários', 'Folha de Pagamento', '2025-10-05', 'Comissões vendedores'),
('despesa', 320.00, 'Conta de luz', 'Utilities', '2025-10-08', NULL),
('despesa', 180.00, 'Conta de água', 'Utilities', '2025-10-08', NULL),
('despesa', 150.00, 'Internet', 'Utilities', '2025-10-10', NULL),
('despesa', 450.00, 'Material de limpeza', 'Manutenção', '2025-10-12', NULL),
('despesa', 2500.00, 'Reposição estoque - Fornecedor 1', 'Compras', '2025-10-15', 'Compra de rações'),
('despesa', 680.00, 'Marketing digital', 'Marketing', '2025-10-18', 'Anúncios Google e Meta')
ON CONFLICT DO NOTHING;

-- =====================================================
-- 12. HISTÓRICO DE PREÇOS (para análise de variação)
-- =====================================================
INSERT INTO historico_precos (produto_id, preco_anterior, preco_novo, data_alteracao, motivo) VALUES
(1, 179.90, 189.90, '2025-09-01', 'Reajuste fornecedor'),
(3, 159.90, 169.90, '2025-09-01', 'Reajuste fornecedor'),
(10, 269.90, 289.90, '2025-09-15', 'Produto importado - câmbio'),
(19, 74.90, 79.90, '2025-08-20', 'Aumento de custos'),
(22, 84.90, 89.90, '2025-09-10', 'Reajuste fornecedor')
ON CONFLICT DO NOTHING;

-- =====================================================
-- RESUMO DOS DADOS INSERIDOS
-- =====================================================
-- 4 usuários (senha: admin123)
-- 4 vendedores
-- 4 fornecedores
-- 14 registros clientes/fornecedores (10 clientes + 4 fornecedores)
-- 3 estoques
-- 25 produtos
-- 45 registros produtos_estoques
-- 6 formas de pagamento
-- 15 vendas (13 pagas, 2 pendentes)
-- 34 itens de vendas
-- 21 transações financeiras (13 receitas + 8 despesas)
-- 5 históricos de preços

SELECT 'Dados mock inseridos com sucesso!' as status;
