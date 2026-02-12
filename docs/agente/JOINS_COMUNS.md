# JOINs Comuns no MeguisPet

Este documento contém exemplos de queries SQL comuns que o frontend do MeguisPet já utiliza. Use esses exemplos como referência para gerar queries semelhantes.

## ⚠️ REGRA CRÍTICA

**NUNCA adicione `WHERE status='pago'` ou qualquer outro filtro de status a menos que o usuário peça explicitamente!**

---

## 1. Vendas com Detalhes do Cliente

```sql
SELECT
  v.id,
  v.numero_venda,
  v.data_venda,
  v.valor_final,
  v.status,
  cf.nome AS cliente_nome,
  cf.cpf_cnpj,
  cf.telefone,
  cf.email
FROM vendas v
JOIN clientes_fornecedores cf ON v.cliente_id = cf.id
WHERE cf.tipo = 'cliente'  -- IMPORTANTE: filtrar por tipo
ORDER BY v.data_venda DESC
LIMIT 100
```

**Quando usar**: "Mostrar vendas" ou "Listar vendas recentes"

---

## 2. Produtos Mais Vendidos

```sql
SELECT
  p.id,
  p.nome,
  p.codigo,
  SUM(vi.quantidade) AS total_vendido,
  COUNT(DISTINCT vi.venda_id) AS numero_vendas
FROM vendas_itens vi
JOIN produtos p ON vi.produto_id = p.id
-- ⚠️ NÃO adicione JOIN com vendas para filtrar status!
GROUP BY p.id, p.nome, p.codigo
ORDER BY total_vendido DESC
LIMIT 10
```

**Quando usar**: "Quais produtos mais vendidos" ou "Ranking de produtos"

**Nota**: Se precisar filtrar por período, faça JOIN com vendas e adicione WHERE na data:
```sql
SELECT
  p.nome,
  SUM(vi.quantidade) AS total_vendido
FROM vendas_itens vi
JOIN produtos p ON vi.produto_id = p.id
JOIN vendas v ON vi.venda_id = v.id
WHERE v.data_venda >= '2026-01-01'
  -- ⚠️ NÃO adicione AND v.status='pago' sem o usuário pedir!
GROUP BY p.id, p.nome
ORDER BY total_vendido DESC
```

---

## 3. Lucro por Cliente

```sql
SELECT
  cf.nome AS cliente,
  COUNT(v.id) AS total_vendas,
  SUM(v.valor_final) AS valor_total,
  SUM(vi.total_item - (vi.quantidade * p.preco_custo)) AS lucro_total
FROM vendas v
JOIN vendas_itens vi ON v.id = vi.venda_id
JOIN produtos p ON vi.produto_id = p.id
JOIN clientes_fornecedores cf ON v.cliente_id = cf.id
WHERE cf.tipo = 'cliente'
  -- ⚠️ NÃO adicione AND v.status='pago' aqui!
GROUP BY cf.id, cf.nome
ORDER BY lucro_total DESC
LIMIT 10
```

**Quando usar**: "Qual cliente gerou mais lucro" ou "Clientes mais lucrativos"

**Cálculo do Lucro**:
- `vi.total_item` = valor vendido do item
- `vi.quantidade * p.preco_custo` = custo do item
- Lucro = total vendido - custo total

---

## 4. Cliente que Mais Comprou um Produto Específico

```sql
SELECT
  cf.nome AS cliente,
  SUM(vi.quantidade) AS total_comprado,
  COUNT(v.id) AS numero_pedidos,
  SUM(vi.total_item) AS valor_total
FROM vendas v
JOIN vendas_itens vi ON v.id = vi.venda_id
JOIN clientes_fornecedores cf ON v.cliente_id = cf.id
JOIN produtos p ON vi.produto_id = p.id
WHERE cf.tipo = 'cliente'
  AND p.nome ILIKE '%PETICOS CAT SNACK%'  -- Exemplo: busca por nome
  -- ⚠️ NÃO filtrar por v.status aqui!
GROUP BY cf.id, cf.nome
ORDER BY total_comprado DESC
LIMIT 1
```

**Quando usar**: "Qual cliente comprou mais [produto]"

**Variações de Busca**: Use `OR` para sinônimos:
```sql
WHERE (p.nome ILIKE '%PETICO%' OR p.nome ILIKE '%snack%' OR p.nome ILIKE '%petisco%')
```

---

## 5. Vendas por Período com Totais

```sql
SELECT
  DATE(v.data_venda) AS data,
  COUNT(v.id) AS total_vendas,
  SUM(v.valor_final) AS valor_total,
  AVG(v.valor_final) AS ticket_medio
FROM vendas v
WHERE v.data_venda >= '2026-01-01'
  AND v.data_venda < '2026-02-01'
  -- ⚠️ NÃO filtrar por status sem ser pedido!
GROUP BY DATE(v.data_venda)
ORDER BY data
```

**Quando usar**: "Vendas do mês de janeiro" ou "Vendas por dia"

---

## 6. Estoque Atual de Produtos

```sql
SELECT
  p.id,
  p.nome,
  p.codigo,
  e.nome AS estoque,
  pe.quantidade,
  pe.quantidade_reservada,
  pe.quantidade - pe.quantidade_reservada AS disponivel,
  p.estoque_minimo,
  CASE
    WHEN (pe.quantidade - pe.quantidade_reservada) <= p.estoque_minimo
    THEN 'CRÍTICO'
    WHEN (pe.quantidade - pe.quantidade_reservada) <= p.estoque_minimo * 1.5
    THEN 'BAIXO'
    ELSE 'OK'
  END AS status_estoque
FROM produtos p
JOIN produtos_estoques pe ON p.id = pe.produto_id
JOIN estoques e ON pe.estoque_id = e.id
WHERE p.ativo = true
ORDER BY disponivel ASC
```

**Quando usar**: "Produtos com estoque baixo" ou "Situação do estoque"

---

## 7. Ranking de Vendedores

```sql
SELECT
  vd.nome AS vendedor,
  COUNT(v.id) AS total_vendas,
  SUM(v.valor_final) AS valor_total,
  AVG(v.valor_final) AS ticket_medio,
  SUM(v.valor_final * vd.comissao_percentual / 100) AS comissao_estimada
FROM vendedores vd
LEFT JOIN vendas v ON vd.id = v.vendedor_id
WHERE v.status = 'pago'  -- ⚠️ Aqui SIM, pois comissão só em vendas pagas
  AND v.data_venda >= '2026-01-01'
GROUP BY vd.id, vd.nome, vd.comissao_percentual
ORDER BY valor_total DESC
```

**Quando usar**: "Qual vendedor mais vendeu" ou "Ranking de vendedores"

**Nota**: Para vendedores, FAZ SENTIDO filtrar por status='pago' porque comissão só é paga em vendas concluídas.

---

## 8. Total de Impostos/Juros das Vendas

```sql
SELECT
  SUM(total_ipi) AS total_ipi,
  SUM(total_icms) AS total_icms,
  SUM(total_st) AS total_st,
  SUM(total_ipi + total_icms + total_st) AS total_impostos_juros
FROM vendas
WHERE EXTRACT(MONTH FROM data_venda) = EXTRACT(MONTH FROM CURRENT_DATE)
  AND EXTRACT(YEAR FROM data_venda) = EXTRACT(YEAR FROM CURRENT_DATE)
  -- ⚠️ NÃO filtrar por status!
```

**Quando usar**: "Qual o valor de juros este mês" ou "Total de impostos"

**Explicar ao usuário**:
> "Os impostos/juros cobrados nas vendas deste mês somam R$ X,XX:
> - Total IPI: R$ Y
> - Total ICMS: R$ Z
> - Total ST: R$ W"

---

## 9. Clientes Inativos (Não Compraram Há Tempo)

```sql
SELECT
  cf.nome,
  cf.telefone,
  cf.email,
  MAX(v.data_venda) AS ultima_compra,
  CURRENT_DATE - MAX(v.data_venda)::DATE AS dias_sem_comprar
FROM clientes_fornecedores cf
LEFT JOIN vendas v ON cf.id = v.cliente_id
WHERE cf.tipo = 'cliente'
  AND cf.ativo = true
GROUP BY cf.id, cf.nome, cf.telefone, cf.email
HAVING MAX(v.data_venda) < CURRENT_DATE - INTERVAL '90 days'
ORDER BY ultima_compra ASC
```

**Quando usar**: "Clientes que não compram há 3 meses" ou "Clientes inativos"

---

## 10. Detalhes Completos de uma Venda Específica

```sql
SELECT
  v.id,
  v.numero_venda,
  v.data_venda,
  v.status,
  cf.nome AS cliente_nome,
  cf.cpf_cnpj AS cliente_documento,
  vd.nome AS vendedor_nome,
  v.total_produtos_bruto,
  v.desconto_total,
  v.total_produtos_liquido,
  v.total_ipi,
  v.total_icms,
  v.total_st,
  v.valor_final,
  v.observacoes,
  fp.nome AS forma_pagamento
FROM vendas v
JOIN clientes_fornecedores cf ON v.cliente_id = cf.id
LEFT JOIN vendedores vd ON v.vendedor_id = vd.id
LEFT JOIN formas_pagamento fp ON v.forma_pagamento_id = fp.id
WHERE v.id = 136  -- Exemplo: venda ID 136
```

**Quando usar**: "Venda ID 136" ou "Detalhes da venda número V-2024-0847"

**Buscar itens da venda**:
```sql
SELECT
  vi.quantidade,
  vi.preco_unitario,
  vi.total_item,
  vi.desconto,
  p.nome AS produto_nome,
  p.codigo AS produto_codigo
FROM vendas_itens vi
JOIN produtos p ON vi.produto_id = p.id
WHERE vi.venda_id = 136
ORDER BY vi.id
```

---

## 11. Produtos de uma Categoria (Por Nome)

```sql
-- Buscar PETISCOS (várias variações)
SELECT
  p.id,
  p.nome,
  p.codigo,
  p.preco_venda,
  SUM(pe.quantidade) AS estoque_total
FROM produtos p
LEFT JOIN produtos_estoques pe ON p.id = pe.produto_id
WHERE p.ativo = true
  AND (
    p.nome ILIKE '%PETICO%'
    OR p.nome ILIKE '%snack%'
    OR p.nome ILIKE '%treat%'
    OR p.nome ILIKE '%petisco%'
  )
GROUP BY p.id, p.nome, p.codigo, p.preco_venda
ORDER BY p.nome
```

**Quando usar**: "Listar petiscos" ou "Produtos da categoria snacks"

**Outras categorias**:
- **Rações**: `p.nome ILIKE '%racao%' OR p.nome ILIKE '%alimento%'`
- **Areia**: `p.nome ILIKE '%areia%' OR p.nome ILIKE '%bentonita%'`
- **Brinquedos**: `p.nome ILIKE '%brinquedo%' OR p.nome ILIKE '%toy%'`

---

## 12. Dashboard - Métricas Gerais

```sql
-- Total de vendas do mês
SELECT
  COUNT(*) AS total_vendas,
  SUM(valor_final) AS valor_total,
  AVG(valor_final) AS ticket_medio
FROM vendas
WHERE EXTRACT(MONTH FROM data_venda) = EXTRACT(MONTH FROM CURRENT_DATE)
  AND EXTRACT(YEAR FROM data_venda) = EXTRACT(YEAR FROM CURRENT_DATE)
  -- ⚠️ NÃO filtrar por status!

-- Comparar com mês anterior
SELECT
  COUNT(*) AS total_vendas_mes_anterior,
  SUM(valor_final) AS valor_mes_anterior
FROM vendas
WHERE data_venda >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
  AND data_venda < DATE_TRUNC('month', CURRENT_DATE)
```

---

## Resumo - Padrões de JOIN

### Vendas + Cliente
```sql
FROM vendas v
JOIN clientes_fornecedores cf ON v.cliente_id = cf.id
WHERE cf.tipo = 'cliente'  -- SEMPRE filtrar por tipo
```

### Vendas + Itens + Produtos
```sql
FROM vendas v
JOIN vendas_itens vi ON v.id = vi.venda_id
JOIN produtos p ON vi.produto_id = p.id
```

### Vendas + Vendedor
```sql
FROM vendas v
LEFT JOIN vendedores vd ON v.vendedor_id = vd.id  -- LEFT pois pode ser NULL
```

### Produtos + Estoque
```sql
FROM produtos p
JOIN produtos_estoques pe ON p.id = pe.produto_id
JOIN estoques e ON pe.estoque_id = e.id
```

### ⚠️ LEMBRETE FINAL

**NUNCA adicione filtros de status sem o usuário pedir explicitamente!**

❌ Errado: `WHERE status='pago'` (sem ser solicitado)
✅ Correto: Retornar TODAS as vendas por padrão
