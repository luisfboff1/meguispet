# 📄 Atualização do Layout do PDF - Pedido de Venda

## ✅ Melhorias Implementadas (Commit 9349477)

### Problemas Corrigidos

1. **❌ Problema: Total do pedido com formatação incorreta**
   - ✅ **Solução**: Ajustado espaçamento e formato brasileiro (R$ 2.276,25)

2. **❌ Problema: Faltava endereço completo**
   - ✅ **Solução**: Adicionado campo ENDEREÇO separado

3. **❌ Problema: Faltava bairro**
   - ✅ **Solução**: Adicionado campo BAIRRO na mesma linha da CIDADE

4. **❌ Problema: Faltava cidade separada**
   - ✅ **Solução**: Campo CIDADE adicionado ao lado do BAIRRO

5. **❌ Problema: Prazo de pagamento não exibido**
   - ✅ **Solução**: Exibe prazo em dias (ex: "28.42 dias") quando disponível

6. **❌ Problema: Sem campo para data de entrega**
   - ✅ **Solução**: Adicionado campo com placeholder (___/___/___) para preenchimento manual

## 📋 Novo Layout do PDF

```
┌─────────────────────────────────────────────────────────────┐
│                        MEGUISPET                             │
├─────────────────────────────────────────────────────────────┤
│ NOME: DELTA FIRE LTDA              CNPJ: 09.523.815/0001-20│
│ ENDEREÇO: RUA VICO COSTA                                    │
│ BAIRRO: CIDADE NOVA        CIDADE: CAXIAS DO SUL           │
├─────────────────────────────────────────────────────────────┤
│ PEDIDO: 22874              EMISSÃO: 21/10/2025            │
│ VENDEDORA: ROSE MENEGAZZO  PAGAMENTO: 28.42 dias          │
│ DATA DE ENTREGA: ___/___/___                              │
├─────────────────────────────────────────────────────────────┤
│ CÓD │  DESCRIÇÃO               │ QTD │ P. UNIT. │  TOTAL  │
├─────┼──────────────────────────┼─────┼──────────┼─────────┤
│2771 │ETIQUETA BOPP ACRÍLICA... │ 20  │  42,50   │ 850,00 │
│3892 │ETIQUETA BOPP ACRÍLICA... │ 25  │  42,00   │1.050,00│
│5241 │ETIQUETA BOPP ACRÍLICA... │  5  │  75,25   │ 376,25 │
└─────┴──────────────────────────┴─────┴──────────┴─────────┘
                                    Subtotal: R$ 2.380,25
                                    Desconto: R$   104,00
                              TOTAL PEDIDO: R$ 2.276,25
```

## 🆕 Campos Adicionados

### 1. CNPJ
- **Localização**: Mesma linha do NOME do cliente
- **Formato**: Alinhado à direita
- **Exemplo**: `CNPJ: 09.523.815/0001-20`

### 2. BAIRRO
- **Localização**: Nova linha, lado esquerdo
- **Formato**: `BAIRRO: CIDADE NOVA`

### 3. CIDADE
- **Localização**: Mesma linha do bairro, lado direito
- **Formato**: `CIDADE: CAXIAS DO SUL`

### 4. PRAZO DE PAGAMENTO
- **Localização**: Substitui forma de pagamento quando disponível
- **Formato**: `28.42 dias` ou forma de pagamento padrão
- **Campo usado**: `venda.prazo_pagamento`

### 5. DATA DE EMISSÃO
- **Alteração**: Label mudado de "DATA:" para "EMISSÃO:"
- **Motivo**: Maior clareza

### 6. VENDEDORA
- **Alteração**: Label mudado de "VENDEDOR:" para "VENDEDORA:"
- **Motivo**: Alinhar com padrão do exemplo

### 7. DATA DE ENTREGA
- **Localização**: Nova linha após vendedora/pagamento
- **Formato**: `DATA DE ENTREGA: ___/___/___`
- **Propósito**: Campo para preenchimento manual pelo usuário

## 💰 Formatação Brasileira

Todos os valores agora usam vírgula como separador decimal:
- ✅ Antes: `R$ 2.276.25`
- ✅ Agora: `R$ 2.276,25`

### Campos Formatados
- Preço unitário: `R$ 42,50`
- Subtotal do item: `R$ 850,00`
- Subtotal geral: `R$ 2.380,25`
- Desconto: `R$ 104,00`
- Total final: `R$ 2.276,25`
- Quantidade: `20,000` → `20,0`

## 🔧 Melhorias Técnicas

### Tratamento de Campos Opcionais
```typescript
// BAIRRO e CIDADE aparecem apenas se disponíveis
const hasBairro = venda.cliente?.bairro
const hasCidade = venda.cliente?.cidade

if (hasBairro || hasCidade) {
  // Renderizar campos...
}
```

### Prazo de Pagamento
```typescript
const pagamento = venda.prazo_pagamento 
  ? `${venda.prazo_pagamento} dias` 
  : getPaymentMethodName(venda)
```

### Total com Espaçamento Adequado
```typescript
// Aumentado espaçamento para evitar sobreposição
const totalsX = pageWidth - margin - 60  // antes: -50

doc.text('TOTAL PEDIDO: R$', totalsX, yPos)
doc.text(venda.valor_final.toFixed(2).replace('.', ','), 
         totalsX + 50, yPos, { align: 'right' })
```

## 📝 Como Usar

O PDF é gerado automaticamente quando o usuário clica no botão de exportação. Todos os campos disponíveis nos dados da venda são preenchidos automaticamente.

**Campos para preenchimento manual:**
- Data de Entrega (sempre em branco com placeholder `___/___/___`)

**Campos automáticos:**
- NOME, CNPJ (se disponível no campo `documento`)
- ENDEREÇO (se disponível)
- BAIRRO (se disponível)
- CIDADE (se disponível)
- Número do pedido
- Data de emissão
- Vendedora
- Prazo de pagamento (se disponível, senão forma de pagamento)
- Produtos e valores
- Totais

## ✨ Resultado

O PDF agora está mais completo e profissional, seguindo o padrão do exemplo fornecido, com todos os campos necessários para um pedido comercial formal.
