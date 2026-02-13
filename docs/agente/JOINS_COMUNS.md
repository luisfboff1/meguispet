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

## 4b. ⚠️ Busca de Cliente Específico por Nome (REGRA CRÍTICA)

**PROBLEMA**: Usar `WHERE nome ILIKE '%TERMO%'` diretamente pode retornar múltiplos clientes e agregar dados incorretamente.

### ❌ JEITO ERRADO (Pode somar múltiplos clientes)

```sql
-- ❌ NÃO FAÇA ISSO!
SELECT
  cf.nome AS cliente,
  SUM(v.valor_final) AS total_vendas
FROM vendas v
JOIN clientes_fornecedores cf ON v.cliente_id = cf.id
WHERE cf.tipo = 'cliente'
  AND cf.nome ILIKE '%IELENPET%'  -- Pode pegar múltiplos clientes!
GROUP BY cf.id, cf.nome
```

**Problema**: Se existir "IELENPET DISTRIBUIDORA", "IELENPET COMERCIO", "IELENPET FILIAL 2", vai somar vendas de TODOS eles.

### ✅ JEITO CORRETO (Verificar unicidade primeiro)

**Passo 1**: Verificar quantos clientes correspondem:
```sql
SELECT id, nome, cpf_cnpj
FROM clientes_fornecedores
WHERE tipo = 'cliente'
  AND nome ILIKE '%IELENPET%'
LIMIT 10
```

**Passo 2a**: Se retornar **1 único cliente**, use o **ID específico**:
```sql
-- ✅ CORRETO: Usar WHERE cf.id = [ID]
SELECT
  cf.nome AS cliente,
  SUM(v.valor_final) AS total_vendas
FROM vendas v
JOIN clientes_fornecedores cf ON v.cliente_id = cf.id
WHERE cf.id = 42  -- ID do cliente ÚNICO encontrado
GROUP BY cf.id, cf.nome
```

**Passo 2b**: Se retornar **múltiplos clientes**, listar e pedir confirmação:

"Encontrei **3 clientes** com o termo 'IELENPET':

1. **IELENPET DISTRIBUIDORA LTDA** (CNPJ: 12.345.678/0001-90)
2. **IELENPET COMERCIO** (CNPJ: 98.765.432/0001-00)
3. **IELENPET FILIAL 2** (CNPJ: 11.222.333/0001-44)

Qual cliente você gostaria de analisar?"

**Passo 2c**: Se retornar **0 clientes**, informar:

"Não encontrei nenhum cliente com o nome 'IELENPET'. Gostaria de tentar outro termo de busca?"

### Resumo

**SEMPRE**:
1. Primeiro, execute `SELECT id, nome FROM clientes_fornecedores WHERE...`
2. Verifique quantos resultados retornaram
3. Se 1 resultado: use `WHERE cf.id = [ID]`
4. Se 2+ resultados: pergunte ao usuário
5. **NUNCA** use `WHERE cf.nome ILIKE` diretamente em queries de agregação!

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
WHERE v.status != 'cancelado'  -- ⚠️ OBRIGATÓRIO: excluir vendas canceladas
  AND v.status = 'pago'  -- ⚠️ Aqui SIM, pois comissão só em vendas pagas
  AND v.data_venda >= '2026-01-01'
GROUP BY vd.id, vd.nome, vd.comissao_percentual
ORDER BY valor_total DESC
```

**Quando usar**: "Qual vendedor mais vendeu" ou "Ranking de vendedores"

**Nota**: Para vendedores, FAZ SENTIDO filtrar por status='pago' porque comissão só é paga em vendas concluídas.

**⚠️ IMPORTANTE**: SEMPRE excluir `status='cancelado'` mesmo quando filtrar por 'pago', pois:
1. Primeiro exclui canceladas: `status != 'cancelado'`
2. Depois filtra pagas: `AND status = 'pago'`

Ou simplificado: `WHERE status = 'pago'` (já exclui canceladas automaticamente)

---

## 7b. ⚠️ Faturamento de Vendedores SEM Filtro de Status 'pago' (CUIDADO)

Se o usuário perguntar "faturamento do vendedor" **sem especificar 'pago'**, NÃO adicione `status='pago'`, mas SEMPRE exclua canceladas:

```sql
-- ✅ CORRETO: Incluir pendentes + pagas, excluir apenas canceladas
SELECT
  vd.nome AS vendedor,
  COUNT(v.id) AS total_vendas,
  SUM(v.valor_final) AS faturamento_total
FROM vendas v
JOIN vendedores vd ON v.vendedor_id = vd.id
WHERE v.status != 'cancelado'  -- ⚠️ OBRIGATÓRIO: sempre excluir canceladas
  AND v.data_venda BETWEEN '2026-02-01' AND '2026-02-11'
GROUP BY vd.nome
ORDER BY faturamento_total DESC
```

```sql
-- ❌ ERRADO: Não excluir canceladas infla os valores
SELECT
  vd.nome AS vendedor,
  SUM(v.valor_final) AS faturamento_total
FROM vendas v
JOIN vendedores vd ON v.vendedor_id = vd.id
WHERE v.data_venda BETWEEN '2026-02-01' AND '2026-02-11'
-- ❌ FALTA: AND v.status != 'cancelado'
GROUP BY vd.nome
```

**Exemplo do problema**:
- Rodrigo: 5 vendas válidas = R$ 45.000
- Rodrigo: 4 vendas canceladas (erros) = R$ 183.000
- Sem filtro de canceladas: R$ 228.000 ❌
- Com filtro correto: R$ 45.000 ✅

---

## 7c. ⚠️ FATURAMENTO/LUCRO DE PRODUTOS ESPECÍFICOS (REGRA CRÍTICA)

**PROBLEMA CRÍTICO**: Quando filtrar produtos específicos (categoria, nome, fornecedor), **NUNCA use SUM(v.valor_final)** para calcular faturamento!

### Por que isso é um problema?

Uma venda pode ter **MÚLTIPLOS produtos diferentes**. Se você filtrar apenas alguns produtos e usar `SUM(v.valor_final)`, vai somar o valor da **VENDA INTEIRA**, não apenas dos produtos filtrados.

### ❌ EXEMPLO ERRADO (Erro Real do Sistema)

Usuário perguntou: "Qual o lucro do projeto Petisco de Frango por vendedor?"

```sql
-- ❌ QUERY ERRADA: Filtra petiscos mas soma valor da venda inteira
SELECT
  vd.nome AS vendedor,
  SUM(v.valor_final) AS faturamento_total,  -- ❌ Pega VENDA INTEIRA
  SUM(vi.quantidade * p.preco_custo) AS custo_total,  -- ✅ Pega apenas PETISCOS
  SUM(v.valor_final) - SUM(vi.quantidade * p.preco_custo) AS lucro_total
FROM vendas v
JOIN vendas_itens vi ON v.id = vi.venda_id
JOIN produtos p ON vi.produto_id = p.id
JOIN vendedores vd ON v.vendedor_id = vd.id
WHERE v.status != 'cancelado'
  AND p.nome ILIKE '%FRANGO%'
  AND (p.nome ILIKE '%PETICO%' OR p.nome ILIKE '%snack%' OR p.nome ILIKE '%petisco%')
GROUP BY vd.id, vd.nome
ORDER BY lucro_total DESC
```

**Resultado ERRADO:**
- Rodrigo Neves: R$ 195.009,45 faturamento, R$ 16.854,80 custo = **Margem 91.36%** ❌
- Helena: R$ 73.230,94 faturamento, R$ 6.997,70 custo = **Margem 90.44%** ❌

**O que aconteceu:**
- Se uma venda tem R$ 9.000 de petiscos + R$ 22.000 de ração = R$ 31.000 total
- Faturamento calculado: R$ 31.000 (venda inteira, incluindo ração!) ❌
- Custo calculado: R$ 2.900 (apenas petiscos) ✅
- Resultado: Margem absurda de 90%+

### ✅ EXEMPLO CORRETO

```sql
-- ✅ QUERY CORRETA: Soma valores apenas dos itens filtrados
SELECT
  vd.nome AS vendedor,
  SUM(vi.quantidade * vi.preco_unitario) AS faturamento_total,  -- ✅ Soma apenas PETISCOS
  SUM(vi.quantidade * p.preco_custo) AS custo_total,  -- ✅ Soma apenas PETISCOS
  SUM((vi.quantidade * vi.preco_unitario) - (vi.quantidade * p.preco_custo)) AS lucro_total
FROM vendas v
JOIN vendas_itens vi ON v.id = vi.venda_id
JOIN produtos p ON vi.produto_id = p.id
JOIN vendedores vd ON v.vendedor_id = vd.id
WHERE v.status != 'cancelado'
  AND p.nome ILIKE '%FRANGO%'
  AND (p.nome ILIKE '%PETICO%' OR p.nome ILIKE '%snack%' OR p.nome ILIKE '%petisco%')
GROUP BY vd.id, vd.nome
ORDER BY lucro_total DESC
```

**Resultado CORRETO:**
- Rodrigo Neves: R$ 42.002,12 faturamento, R$ 16.854,80 custo = **Margem 59.87%** ✅
- Helena: R$ 17.033,94 faturamento, R$ 6.997,70 custo = **Margem 58.91%** ✅

**Diferença:**
- Faturamento agora reflete APENAS os petiscos de frango
- Margem de 60% faz sentido para produtos de pet shop

### 📋 REGRA GERAL

| Situação | Use SUM(v.valor_final) | Use SUM(vi.quantidade * vi.preco_unitario) |
|----------|:----------------------:|:------------------------------------------:|
| **Todas as vendas** (sem filtro de produto) | ✅ SIM | ❌ Não necessário |
| **Vendas de um vendedor** (sem filtro de produto) | ✅ SIM | ❌ Não necessário |
| **Vendas de um cliente** (sem filtro de produto) | ✅ SIM | ❌ Não necessário |
| **Produtos específicos** (com filtro WHERE p.nome/categoria) | ❌ NUNCA | ✅ OBRIGATÓRIO |
| **Categoria de produtos** (ex: petiscos, ração) | ❌ NUNCA | ✅ OBRIGATÓRIO |
| **Produtos de fornecedor específico** | ❌ NUNCA | ✅ OBRIGATÓRIO |

### 🎯 Outros Exemplos Onde DEVE Usar SUM(vi.quantidade * vi.preco_unitario)

**Exemplo 1: Faturamento de Ração**
```sql
SELECT
  SUM(vi.quantidade * vi.preco_unitario) AS faturamento_racao,  -- ✅ Correto
  SUM(vi.quantidade * p.preco_custo) AS custo_racao
FROM vendas v
JOIN vendas_itens vi ON v.id = vi.venda_id
JOIN produtos p ON vi.produto_id = p.id
WHERE v.status != 'cancelado'
  AND (p.nome ILIKE '%racao%' OR p.nome ILIKE '%alimento%')
```

**Exemplo 2: Lucro de Produtos de um Fornecedor**
```sql
SELECT
  cf_forn.nome AS fornecedor,
  SUM(vi.quantidade * vi.preco_unitario) AS faturamento,  -- ✅ Correto
  SUM(vi.quantidade * p.preco_custo) AS custo,
  SUM((vi.quantidade * vi.preco_unitario) - (vi.quantidade * p.preco_custo)) AS lucro
FROM vendas v
JOIN vendas_itens vi ON v.id = vi.venda_id
JOIN produtos p ON vi.produto_id = p.id
JOIN clientes_fornecedores cf_forn ON p.fornecedor_id = cf_forn.id
WHERE v.status != 'cancelado'
  AND cf_forn.tipo = 'fornecedor'
GROUP BY cf_forn.id, cf_forn.nome
```

**Exemplo 3: Faturamento por Categoria (se houver campo categoria)**
```sql
SELECT
  p.categoria,
  SUM(vi.quantidade * vi.preco_unitario) AS faturamento,  -- ✅ Correto
  COUNT(DISTINCT v.id) AS total_vendas
FROM vendas v
JOIN vendas_itens vi ON v.id = vi.venda_id
JOIN produtos p ON vi.produto_id = p.id
WHERE v.status != 'cancelado'
  AND v.data_venda >= '2026-01-01'
GROUP BY p.categoria
ORDER BY faturamento DESC
```

### 🚨 LEMBRE-SE

**Se há `WHERE` ou `JOIN` filtrando produtos específicos → Use `SUM(vi.quantidade * vi.preco_unitario)`**

**Se NÃO há filtro de produtos → Use `SUM(v.valor_final)`**

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
