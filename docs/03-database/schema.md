# Documentação das Tabelas do Banco de Dados MeguisPet

Abaixo estão listadas as principais tabelas do banco de dados MeguisPet, com uma breve explicação sobre o propósito de cada uma. As descrições são baseadas nos comentários e estrutura do arquivo de backup.

## Tabelas Principais

- **clientes_fornecedores**: Armazena informações de clientes e fornecedores, incluindo dados cadastrais, contatos e tipo (cliente, fornecedor ou ambos).
- **produtos**: Cadastro de produtos, com campos para código, descrição, categoria, preços, status, entre outros.
- **estoques**: Define os estoques físicos ou lógicos disponíveis no sistema.
- **produtos_estoques**: Relaciona produtos aos estoques, controlando quantidade, preço médio e status.
- **estoques_historico**: Histórico de movimentações e ajustes de estoque, para auditoria e rastreabilidade.
- **fornecedores**: Cadastro detalhado de fornecedores, podendo ser usado para compras e movimentações.
- **formas_pagamento**: Tabela de formas de pagamento aceitas (dinheiro, cartão, boleto, etc).
- **vendas**: Registro das vendas realizadas, com referência a clientes, estoque, forma de pagamento, vendedor, status e datas.
- **vendas_itens**: Itens de cada venda, detalhando produto, quantidade, preço, descontos e impostos.
- **vendas_impostos**: Detalhamento dos impostos aplicados em cada venda.
- **vendedores**: Cadastro de vendedores, com dados de identificação e status.
- **usuarios**: Usuários do sistema, com informações de login, permissões e status.
- **movimentacoes_estoque**: Movimentações de entrada, saída, transferência e ajuste de estoque.
- **movimentacoes_itens**: Itens de cada movimentação de estoque, detalhando produto, quantidade e valores.
- **transacoes**: Registro de transações financeiras, como pagamentos, recebimentos e transferências.
- **historico_precos**: Histórico de alterações de preço dos produtos.
- **impostos_produto**: Relação de impostos aplicáveis a cada produto, incluindo regras de MVA.
- **tabela_mva**: Tabela de Margem de Valor Agregado (MVA) por NCM e UF, usada para cálculo de impostos.
- **feedback_tickets**: Sistema de chamados/feedback dos usuários, com status, prioridade e histórico.
- **feedback_comentarios**: Comentários em chamados/feedback.
- **feedback_anexos**: Anexos enviados em chamados/feedback.

## Observações
- Existem tabelas auxiliares e sequências para controle de IDs.
- As tabelas possuem relacionamentos via chaves estrangeiras, garantindo integridade referencial.
- Triggers e funções automatizam atualizações de datas e históricos.

Para detalhes de colunas e relacionamentos, consulte o arquivo de estrutura SQL ou a documentação técnica detalhada.
