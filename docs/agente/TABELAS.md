# Guia Detalhado de Tabelas - MeguisPet

Este documento detalha cada tabela do banco de dados com informações críticas para gerar queries corretas e interpretar os dados adequadamente.

## vendas

**Propósito**: Vendas registradas no sistema interno do MeguisPet

### Campos Principais

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | BIGINT | ID único da venda (sequencial) |
| `numero_venda` | VARCHAR | Número de identificação da venda (ex: V-2024-0847) |
| `cliente_id` | BIGINT | FK para clientes_fornecedores |
| `vendedor_id` | BIGINT | FK para vendedores (pode ser NULL) |
| `estoque_id` | BIGINT | FK para estoques |
| `data_venda` | TIMESTAMP | Data e hora da venda |
| `total_produtos_bruto` | NUMERIC | Valor total dos produtos SEM desconto |
| `desconto_total` | NUMERIC | Valor total de descontos aplicados |
| `total_produtos_liquido` | NUMERIC | Valor dos produtos APÓS desconto |
| `total_ipi` | NUMERIC | Total de IPI (imposto) |
| `total_icms` | NUMERIC | Total de ICMS (imposto) |
| `total_st` | NUMERIC | Total de Substituição Tributária |
| `valor_final` | NUMERIC | **Valor total cobrado do cliente** (inclui tudo) |
| `status` | VARCHAR | 'pago', 'pendente', 'cancelado' |
| `forma_pagamento_id` | BIGINT | FK para formas_pagamento |
| `observacoes` | TEXT | Observações sobre a venda |

### ⚠️ ALERTAS IMPORTANTES

1. **NÃO FILTRAR POR STATUS POR PADRÃO!**
   - Se o usuário perguntar "vendas", retorne TODAS (pago + pendente + cancelado)
   - Filtre APENAS se o usuário especificar: "vendas pagas", "vendas pendentes", etc.

2. **Impostos são "Juros"**
   - `total_ipi + total_icms + total_st` = "juros" ou "impostos" da venda
   - Quando usuário perguntar sobre "juros", considere esses campos

3. **valor_final é o que importa**
   - É o valor real cobrado do cliente
   - Já inclui produtos, descontos, impostos, frete, etc.

### Relacionamentos

```sql
-- Venda com cliente
SELECT v.*, cf.nome AS cliente_nome
FROM vendas v
JOIN clientes_fornecedores cf ON v.cliente_id = cf.id

-- Venda com itens
SELECT v.*, vi.*
FROM vendas v
JOIN vendas_itens vi ON v.id = vi.venda_id

-- Venda com produtos
SELECT v.*, p.nome AS produto_nome
FROM vendas v
JOIN vendas_itens vi ON v.id = vi.venda_id
JOIN produtos p ON vi.produto_id = p.id
```

### Como Calcular Lucro de uma Venda

```sql
SELECT
  v.id,
  v.numero_venda,
  v.valor_final,
  SUM(vi.quantidade * p.preco_custo) AS custo_total,
  v.valor_final - SUM(vi.quantidade * p.preco_custo) AS lucro
FROM vendas v
JOIN vendas_itens vi ON v.id = vi.venda_id
JOIN produtos p ON vi.produto_id = p.id
WHERE v.id = 123
GROUP BY v.id, v.numero_venda, v.valor_final
```

---

## vendas_itens

**Propósito**: Itens individuais de cada venda (produtos vendidos)

### Campos Principais

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | BIGINT | ID único do item |
| `venda_id` | BIGINT | FK para vendas |
| `produto_id` | BIGINT | FK para produtos |
| `quantidade` | NUMERIC | Quantidade vendida |
| `preco_unitario` | NUMERIC | Preço unitário no momento da venda |
| `total_item` | NUMERIC | Total deste item (quantidade × preco_unitario) |
| `desconto` | NUMERIC | Desconto aplicado a este item |

### Uso Comum

```sql
-- Ver todos os itens de uma venda
SELECT
  vi.*,
  p.nome AS produto_nome,
  p.codigo AS produto_codigo
FROM vendas_itens vi
JOIN produtos p ON vi.produto_id = p.id
WHERE vi.venda_id = 123
```

---

## bling_vendas

**Propósito**: Vendas sincronizadas do Bling ERP (sistema externo)

### Campos Principais

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | BIGINT | ID único (interno do sistema) |
| `bling_id` | VARCHAR | **ID da venda no Bling** |
| `numero_pedido` | VARCHAR | Número do pedido no Bling |
| `data_pedido` | TIMESTAMP | Data do pedido no Bling |
| `contato_nome` | VARCHAR | Nome do cliente (texto) |
| `total_produtos` | NUMERIC | Total dos produtos |
| `valor_total` | NUMERIC | Valor total da venda |
| `situacao_id` | VARCHAR | ID da situação no Bling |
| `marketplace` | VARCHAR | Nome do marketplace (se aplicável) |
| `raw_data` | JSONB | Dados completos JSON do Bling |
| `synced_at` | TIMESTAMP | Quando foi sincronizado |

### ⚠️ DIFERENÇAS IMPORTANTES

1. **IDs diferentes**: `bling_vendas.id` ≠ `vendas.id`
2. **Duplicação**: Uma venda pode estar em AMBAS as tabelas
3. **Quando usar**:
   - Se usuário mencionar "Bling" ou "marketplace" → use `bling_vendas`
   - Caso contrário → use `vendas` (tabela interna)

### Exemplo de Query

```sql
-- Vendas do Bling de um marketplace específico
SELECT *
FROM bling_vendas
WHERE marketplace = 'Mercado Livre'
  AND DATE(data_pedido) >= '2026-01-01'
```

---

## produtos

**Propósito**: Catálogo de produtos da loja

### Campos Principais

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | BIGINT | ID único do produto |
| `codigo` | VARCHAR | Código do produto |
| `nome` | VARCHAR | Nome do produto |
| `descricao` | TEXT | Descrição detalhada |
| `preco_venda` | NUMERIC | **Preço de venda ao cliente** |
| `preco_custo` | NUMERIC | **Custo de aquisição** |
| `estoque_minimo` | NUMERIC | Quantidade mínima em estoque |
| `ativo` | BOOLEAN | Se o produto está ativo |

### ⚠️ CATEGORIAS (NÃO HÁ CAMPO CATEGORIA)

Identifique categorias pelo **nome do produto**:

- **Petiscos/Snacks**: PETICO, snack, treat, petisco
- **Rações**: racao, alimento, food, ração
- **Areia Sanitária**: areia, bentonita, granulado, sanitário
- **Brinquedos**: brinquedo, toy, jouet

### Buscar por Categoria

```sql
-- Buscar petiscos (usar OR para variações)
SELECT *
FROM produtos
WHERE nome ILIKE '%PETICO%'
   OR nome ILIKE '%snack%'
   OR nome ILIKE '%treat%'
   OR nome ILIKE '%petisco%'
```

### Calcular Margem de Lucro

```sql
SELECT
  nome,
  preco_venda,
  preco_custo,
  preco_venda - preco_custo AS lucro_unitario,
  ROUND((preco_venda - preco_custo) / preco_custo * 100, 2) AS margem_percentual
FROM produtos
WHERE preco_custo > 0  -- Evitar divisão por zero
ORDER BY margem_percentual DESC
```

---

## clientes_fornecedores

**Propósito**: Cadastro de clientes E fornecedores (mesma tabela!)

### Campos Principais

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | BIGINT | ID único |
| `tipo` | VARCHAR | **'cliente' ou 'fornecedor'** |
| `nome` | VARCHAR | Nome/Razão social |
| `cpf_cnpj` | VARCHAR | CPF (pessoa física) ou CNPJ (jurídica) |
| `email` | VARCHAR | E-mail |
| `telefone` | VARCHAR | Telefone |
| `endereco` | TEXT | Endereço completo |
| `cidade` | VARCHAR | Cidade |
| `estado` | VARCHAR | UF (2 letras) |
| `cep` | VARCHAR | CEP |
| `ativo` | BOOLEAN | Se está ativo |

### ⚠️ SEMPRE FILTRAR POR TIPO

```sql
-- ERRADO: Retorna clientes E fornecedores
SELECT * FROM clientes_fornecedores

-- CORRETO: Filtrar por tipo
SELECT * FROM clientes_fornecedores WHERE tipo = 'cliente'
SELECT * FROM clientes_fornecedores WHERE tipo = 'fornecedor'
```

### Queries Comuns

```sql
-- Clientes que mais compraram
SELECT
  cf.nome,
  COUNT(v.id) AS total_compras,
  SUM(v.valor_final) AS valor_total
FROM clientes_fornecedores cf
JOIN vendas v ON cf.id = v.cliente_id
WHERE cf.tipo = 'cliente'
GROUP BY cf.id, cf.nome
ORDER BY valor_total DESC
LIMIT 10
```

---

## transacoes

**Propósito**: Transações financeiras (receitas e despesas)

### Campos Principais

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | BIGINT | ID único |
| `tipo` | VARCHAR | 'receita' ou 'despesa' |
| `categoria_id` | BIGINT | FK para categorias_financeiras |
| `descricao` | TEXT | Descrição da transação |
| `valor` | NUMERIC | Valor da transação |
| `data_transacao` | DATE | Data da transação |
| `data_pagamento` | DATE | Data do pagamento (pode ser NULL) |
| `status` | VARCHAR | 'pago', 'pendente', 'cancelado' |
| `forma_pagamento_id` | BIGINT | FK para formas_pagamento |

### Buscar Despesas por Categoria

```sql
-- Despesas com "Juros" financeiros (categoria)
SELECT
  t.*,
  cf.nome AS categoria
FROM transacoes t
JOIN categorias_financeiras cf ON t.categoria_id = cf.id
WHERE t.tipo = 'despesa'
  AND cf.nome = 'Juros'
  AND t.status = 'pago'
```

**Nota**: Lembre-se que "juros" também pode significar impostos nas vendas!

---

## categorias_financeiras

**Propósito**: Categorias de receitas e despesas

### Campos Principais

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | BIGINT | ID único |
| `nome` | VARCHAR | Nome da categoria |
| `tipo` | VARCHAR | 'receita' ou 'despesa' |
| `descricao` | TEXT | Descrição |

### Categorias Comuns

- **Receitas**: Vendas, Serviços
- **Despesas**: Aluguel, Salários, Impostos, Juros, Fornecedores

---

## vendedores

**Propósito**: Cadastro de vendedores da loja

### Campos Principais

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | BIGINT | ID único |
| `nome` | VARCHAR | Nome do vendedor |
| `cpf` | VARCHAR | CPF |
| `email` | VARCHAR | E-mail |
| `telefone` | VARCHAR | Telefone |
| `comissao_percentual` | NUMERIC | % de comissão |
| `ativo` | BOOLEAN | Se está ativo |

### Calcular Comissão de Vendedor

```sql
SELECT
  vd.nome AS vendedor,
  COUNT(v.id) AS total_vendas,
  SUM(v.valor_final) AS valor_total_vendas,
  SUM(v.valor_final * vd.comissao_percentual / 100) AS comissao_total
FROM vendedores vd
JOIN vendas v ON vd.id = v.vendedor_id
WHERE v.status = 'pago'  -- Aqui SIM, filtrar por pago (comissão só em vendas pagas)
GROUP BY vd.id, vd.nome, vd.comissao_percentual
ORDER BY valor_total_vendas DESC
```

---

## estoques

**Propósito**: Controle de estoques (locais físicos)

### Campos Principais

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | BIGINT | ID único |
| `nome` | VARCHAR | Nome do estoque (ex: "Loja Principal", "Depósito") |
| `descricao` | TEXT | Descrição |
| `ativo` | BOOLEAN | Se está ativo |

---

## produtos_estoques

**Propósito**: Quantidade de cada produto em cada estoque

### Campos Principais

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | BIGINT | ID único |
| `produto_id` | BIGINT | FK para produtos |
| `estoque_id` | BIGINT | FK para estoques |
| `quantidade` | NUMERIC | Quantidade atual |
| `quantidade_reservada` | NUMERIC | Quantidade reservada (pendente) |

### Ver Estoque de um Produto

```sql
SELECT
  p.nome AS produto,
  e.nome AS estoque,
  pe.quantidade,
  pe.quantidade_reservada,
  pe.quantidade - pe.quantidade_reservada AS disponivel
FROM produtos_estoques pe
JOIN produtos p ON pe.produto_id = p.id
JOIN estoques e ON pe.estoque_id = e.id
WHERE p.id = 123
```

---

## movimentacoes_estoque

**Propósito**: Histórico de movimentações de estoque

### Campos Principais

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | BIGINT | ID único |
| `tipo_movimentacao` | VARCHAR | 'entrada', 'saida', 'transferencia', 'ajuste' |
| `estoque_id` | BIGINT | FK para estoques |
| `data_movimentacao` | TIMESTAMP | Data/hora da movimentação |
| `observacoes` | TEXT | Observações |

---

## Resumo - Tabelas Críticas

| Tabela | Quando Usar |
|--------|-------------|
| `vendas` | Vendas internas do sistema (**usar por padrão**) |
| `bling_vendas` | Apenas quando usuário mencionar "Bling" ou "marketplace" |
| `produtos` | Catálogo de produtos (identificar categoria pelo nome) |
| `clientes_fornecedores` | **SEMPRE filtrar por `tipo`** ('cliente' ou 'fornecedor') |
| `transacoes` | Transações financeiras (categoria "Juros" = juros financeiros) |
| `vendas.total_ipi/icms/st` | Impostos das vendas (também chamados de "juros") |
| `vendas_itens` | Produtos individuais de cada venda |
| `produtos_estoques` | Quantidade de produtos em estoque |
