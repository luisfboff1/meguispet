# Sistema de Parcelamento de Vendas

## Visão Geral

O sistema de parcelamento permite dividir o pagamento de uma venda em múltiplas parcelas, com datas de vencimento configuráveis. Cada parcela gera automaticamente uma transação financeira para acompanhamento no fluxo de caixa.

## Recursos Implementados

### 1. Banco de Dados

**Nova Tabela: `venda_parcelas`**
- `id`: Identificador único da parcela
- `venda_id`: ID da venda relacionada
- `numero_parcela`: Número sequencial da parcela (1, 2, 3, ...)
- `valor_parcela`: Valor individual da parcela
- `data_vencimento`: Data de vencimento
- `data_pagamento`: Data efetiva do pagamento (quando realizado)
- `status`: Status da parcela (pendente, pago, atrasado, cancelado)
- `transacao_id`: ID da transação financeira vinculada
- `observacoes`: Observações adicionais

**Arquivo de Migração:** `database/migrations/010_venda_parcelas_system.sql`

### 2. Interface de Usuário

#### Formulário de Vendas (`components/forms/VendaForm.tsx`)

**Nova Seção: "Parcelar Pagamento"**
1. Checkbox para ativar o parcelamento
2. Campo "Número de Parcelas" (1-60)
3. Campo "Data da Primeira Parcela"
4. Tabela de parcelas geradas com:
   - Número da parcela
   - Valor (editável)
   - Data de vencimento (editável)
   - Observações (opcional)

**Funcionalidades:**
- **Geração Automática**: As parcelas são calculadas automaticamente ao definir o número e a data inicial
- **Intervalo Mensal**: Cada parcela subsequente é agendada para 1 mês após a anterior
- **Ajuste Manual**: Valores e datas podem ser editados individualmente
- **Validação**: O total das parcelas é validado contra o valor final da venda

#### Página Financeira (`pages/financeiro.tsx`)

**Indicadores Visuais:**
- Badge "• Parcela" nas transações vinculadas a parcelas
- Link para a venda original (📦 Venda #ID)
- Possibilidade de editar datas através do formulário de transação

### 3. Fluxo de Criação

```
1. Usuário cria uma venda
   ↓
2. Adiciona itens e define valores
   ↓
3. Marca "Parcelar pagamento"
   ↓
4. Define número de parcelas e data inicial
   ↓
5. Sistema gera parcelas automaticamente
   ↓
6. Usuário pode ajustar valores/datas
   ↓
7. Ao salvar a venda:
   - Venda é criada no banco
   - Parcelas são registradas
   - Transações financeiras são geradas automaticamente
```

### 4. API Endpoints

**Parcelas de Vendas:**
- `POST /api/venda-parcelas` - Criar parcelas para uma venda
- `GET /api/venda-parcelas/[id]` - Obter parcelas de uma venda
- `PUT /api/venda-parcelas/[id]` - Atualizar uma parcela
- `PATCH /api/venda-parcelas/[id]` - Ações especiais (atualizar data, marcar como paga)
- `DELETE /api/venda-parcelas/[id]` - Deletar uma parcela

**Vendas (atualizado):**
- `POST /api/vendas` - Aceita campo `parcelas` opcional

### 5. Integração com Financeiro

Quando uma venda com parcelas é criada:
1. Cada parcela gera uma transação financeira do tipo "receita"
2. A descrição segue o padrão: "Receita Venda [NUMERO] - Parcela X/Y"
3. A data da transação é a data de vencimento da parcela
4. As transações são vinculadas à venda e à parcela específica

## Como Usar

### Para Criar uma Venda Parcelada:

1. Acesse a página de **Vendas**
2. Clique em **Nova Venda**
3. Preencha os dados da venda normalmente (cliente, vendedor, produtos, etc.)
4. Na seção "Desconto e Prazo", marque ✓ **Parcelar pagamento**
5. Defina o **Número de Parcelas** (ex: 3)
6. Selecione a **Data da Primeira Parcela** (ex: 30 dias a partir de hoje)
7. O sistema gerará automaticamente as parcelas com:
   - Valores divididos igualmente
   - Datas mensais a partir da primeira parcela
8. **Ajuste conforme necessário:**
   - Clique nos valores para alterar
   - Clique nas datas para modificar vencimentos
   - Adicione observações se desejar
9. Clique em **Salvar Venda**

### Para Acompanhar Parcelas:

1. Acesse a página **Financeiro**
2. As transações das parcelas aparecerão com:
   - Badge "• Parcela"
   - Link para a venda original
3. Para editar uma data de vencimento:
   - Clique no botão **Editar** na transação
   - Modifique a **Data da Transação**
   - Salve as alterações

## Exemplo Prático

**Cenário:** Venda de R$ 5.000,00 em 5 parcelas, primeira parcela em 30 dias.

1. Valor por parcela: R$ 1.000,00
2. Parcelas geradas automaticamente:
   - Parcela 1/5: R$ 1.000,00 - Vencimento: 14/12/2025
   - Parcela 2/5: R$ 1.000,00 - Vencimento: 14/01/2026
   - Parcela 3/5: R$ 1.000,00 - Vencimento: 14/02/2026
   - Parcela 4/5: R$ 1.000,00 - Vencimento: 14/03/2026
   - Parcela 5/5: R$ 1.000,00 - Vencimento: 14/04/2026

3. No financeiro, aparecerão 5 transações:
   ```
   📦 Venda 20251114-5815 • Parcela
   Receita Venda 20251114-5815 - Parcela 1/5
   R$ 1.000,00 | 14/12/2025
   ```

## Observações Importantes

1. **Validação de Valores:** O total das parcelas deve corresponder ao valor final da venda (com tolerância de R$ 0,10 para arredondamentos)

2. **Ajuste Automático:** A última parcela é ajustada automaticamente para compensar diferenças de arredondamento

3. **Flexibilidade:** Mesmo após definir o número de parcelas, você pode ajustar manualmente:
   - Valores individuais de cada parcela
   - Datas de vencimento
   - Adicionar observações específicas

4. **Transações Automáticas:** As transações financeiras são criadas automaticamente, mas você pode editá-las posteriormente se necessário

5. **Venda Sem Parcelas:** Se não marcar a opção "Parcelar pagamento", o comportamento é o mesmo de antes (uma transação única)

## Benefícios

- ✅ **Organização:** Acompanhamento claro de cada parcela no financeiro
- ✅ **Flexibilidade:** Datas e valores ajustáveis conforme necessidade do cliente
- ✅ **Rastreabilidade:** Vínculo direto entre parcelas e venda original
- ✅ **Automação:** Geração automática de parcelas e transações
- ✅ **Controle:** Visualização completa do fluxo de caixa futuro
