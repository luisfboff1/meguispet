# Contexto do Negócio - MeguisPet

Este documento explica conceitos específicos do negócio MeguisPet que são essenciais para interpretar corretamente as perguntas dos usuários e gerar queries SQL precisas.

## Impostos e "Juros"

No MeguisPet, quando um usuário pergunta sobre **"juros"**, ele pode estar se referindo aos **impostos** cobrados nas vendas, não apenas a juros financeiros da categoria de transações.

### Campos de Impostos nas Vendas

A tabela `vendas` possui três campos que representam impostos/custos adicionais:

- **`total_ipi`**: Imposto sobre Produtos Industrializados
- **`total_icms`**: Imposto sobre Circulação de Mercadorias e Serviços
- **`total_st`**: Substituição Tributária

**Importante**: Esses valores são considerados "custos adicionais" ou "juros" no contexto do negócio pet shop.

### Exemplo de Query para "Juros"

Quando o usuário perguntar: *"Qual o valor total de juros este mês?"*

**NÃO faça** apenas:
```sql
SELECT SUM(valor) FROM transacoes
WHERE categoria_id = (SELECT id FROM categorias_financeiras WHERE nome = 'Juros')
```

**FAÇA** também (ou principalmente):
```sql
SELECT
  SUM(total_ipi) AS total_ipi,
  SUM(total_icms) AS total_icms,
  SUM(total_st) AS total_st,
  SUM(total_ipi + total_icms + total_st) AS total_impostos_juros
FROM vendas
WHERE EXTRACT(MONTH FROM data_venda) = EXTRACT(MONTH FROM CURRENT_DATE)
  AND EXTRACT(YEAR FROM data_venda) = EXTRACT(YEAR FROM CURRENT_DATE)
```

E explique ao usuário:
> "Os impostos/juros cobrados nas vendas deste mês somam R$ X,XX:
> - Total IPI: R$ Y
> - Total ICMS: R$ Z
> - Total ST: R$ W
>
> (No MeguisPet, esses impostos são considerados custos adicionais/juros nas vendas)"

## Cálculo de Lucro

O lucro de uma venda é calculado da seguinte forma:

**Lucro = Valor Final da Venda - Soma dos Custos dos Produtos**

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
GROUP BY v.id, v.numero_venda, v.valor_final
```

**Nota importante**:
- Use `produtos.preco_custo` para o custo unitário
- Use `produtos.preco_venda` para o preço de venda
- O `valor_final` da venda já inclui impostos, descontos, etc.

## Status de Vendas

A tabela `vendas` possui um campo `status` com os seguintes valores possíveis:

- **'pago'**: Venda concluída e paga pelo cliente
- **'pendente'**: Venda registrada mas ainda não paga
- **'cancelado'**: Venda cancelada, não deve contar em análises

### REGRA CRÍTICA sobre Status

**NUNCA adicione filtro de status automaticamente!**

❌ **ERRADO** (adicionar filtro não solicitado):
```sql
SELECT * FROM vendas WHERE status = 'pago'  -- Usuário NÃO pediu isso!
```

✅ **CORRETO** (incluir todas por padrão):
```sql
SELECT * FROM vendas  -- Retorna TODAS as vendas
```

**Filtre por status APENAS quando o usuário especificar explicitamente**:
- "vendas pagas" → `WHERE status = 'pago'`
- "vendas pendentes" → `WHERE status = 'pendente'`
- "vendas" → NÃO adicione filtro de status

## Integrações com Bling ERP

O MeguisPet está integrado com o Bling ERP (sistema externo de gestão). Existem duas tabelas de vendas:

### vendas (tabela interna)
- Vendas registradas diretamente no sistema MeguisPet
- ID sequencial próprio

### bling_vendas (tabela de sincronização)
- Vendas importadas do Bling ERP
- Possui campo `bling_id` (ID do Bling)
- Possui campo `numero_pedido` (número do pedido no Bling)

### ATENÇÃO: Duplicação de Dados

**Pode haver vendas duplicadas** entre `vendas` e `bling_vendas`!

- Uma venda pode estar registrada em ambas as tabelas
- `vendas.id` ≠ `bling_vendas.id` (IDs diferentes)
- Para evitar duplicação em relatórios, use APENAS uma tabela por vez
- Se o usuário mencionar "Bling" ou "marketplace", use `bling_vendas`
- Caso contrário, use `vendas` (tabela interna)

## Categorias de Produtos

O MeguisPet não possui um campo `categoria` na tabela `produtos`, mas as categorias podem ser identificadas pelos **nomes dos produtos**:

- **Petiscos/Snacks**: Nomes contêm "PETICO", "snack", "treat"
- **Rações**: Nomes contêm "racao", "alimento", "food"
- **Areia Sanitária**: Nomes contêm "areia", "bentonita", "granulado"
- **Brinquedos**: Nomes contêm "brinquedo", "toy"

**Exemplo de busca por categoria**:
```sql
-- Buscar petiscos
SELECT * FROM produtos
WHERE nome ILIKE '%PETICO%'
   OR nome ILIKE '%snack%'
   OR nome ILIKE '%treat%'
   OR nome ILIKE '%petisco%'
```

## Períodos de Tempo

Quando o usuário mencionar períodos, use:

- **"este mês"**: `EXTRACT(MONTH FROM data_venda) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM data_venda) = EXTRACT(YEAR FROM CURRENT_DATE)`
- **"hoje"**: `DATE(data_venda) = CURRENT_DATE`
- **"esta semana"**: `data_venda >= DATE_TRUNC('week', CURRENT_DATE)`
- **"últimos 30 dias"**: `data_venda >= CURRENT_DATE - INTERVAL '30 days'`
- **"últimos 7 dias"**: `data_venda >= CURRENT_DATE - INTERVAL '7 days'`

## Clientes vs Fornecedores

A tabela `clientes_fornecedores` armazena **AMBOS** clientes e fornecedores, diferenciados pelo campo `tipo`:

- `tipo = 'cliente'`: Clientes que compram produtos
- `tipo = 'fornecedor'`: Fornecedores que vendem produtos para a loja

**Sempre filtrar** quando buscar especificamente clientes ou fornecedores:
```sql
-- Buscar apenas clientes
SELECT * FROM clientes_fornecedores WHERE tipo = 'cliente'

-- Buscar apenas fornecedores
SELECT * FROM clientes_fornecedores WHERE tipo = 'fornecedor'
```

## Formato de Valores Monetários

Todos os valores monetários devem ser formatados em **Real Brasileiro (BRL)**:

- Usar ponto para separar milhares: R$ 1.234,56
- Usar vírgula para decimais: R$ 10,50
- Sempre incluir o símbolo R$ antes do valor

**Exemplo de formatação na resposta**:
> "O lucro total foi de R$ 15.340,75"

## Data e Hora

Datas devem ser formatadas no padrão **brasileiro (dd/mm/yyyy)**:

- ✅ Correto: 12/02/2026
- ❌ Errado: 2026-02-12

Horários no formato **24h (HH:mm)**:
- ✅ Correto: 14:30
- ❌ Errado: 2:30 PM

## Resumo - Conceitos Principais

1. **"Juros"** = Impostos (IPI, ICMS, ST) nas vendas
2. **Nunca filtrar por status** sem o usuário pedir
3. **Vendas duplicadas** entre `vendas` e `bling_vendas`
4. **Categorias** identificadas pelo nome do produto
5. **Lucro** = valor_final - soma(quantidade × preco_custo)
6. **Clientes e fornecedores** na mesma tabela, filtrar por `tipo`
