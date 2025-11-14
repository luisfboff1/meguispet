# 🛒 Sistema de Vendas

Documentação do sistema de gestão de vendas e pedidos do MeguisPet.

---

## 📋 Documentação de Correções e Melhorias

### 🔧 Correções Implementadas

- **[Correção: Número de Venda](./CORRECAO_NUMERO_VENDA.md)** - Número de venda automático e editável
- **[Correção: Subtotal de Venda](./CORRECAO_SUBTOTAL_VENDA.md)** - Correção de erro de subtotal NULL
- **[Correção: Vendedores](./CORRECAO_VENDEDORES.md)** - Página de vendedores completa e funcional
- **[Correção: Modais do Dashboard](./CORRECAO_DASHBOARD_MODALS.md)** - Modais do dashboard não salvavam dados

---

## 🎯 Funcionalidades

### ✅ Implementado

#### Cadastro de Vendas
- ✅ Criação de pedidos/vendas
- ✅ Número de venda automático e editável
- ✅ Adição de múltiplos produtos
- ✅ Cálculo automático de totais
- ✅ Cálculo de impostos (IPI, ST, ICMS)

#### Formas de Pagamento
- ✅ Múltiplas formas de pagamento por venda
- ✅ Parcelamento
- ✅ Desconto por forma de pagamento
- ✅ Controle de valores pagos

#### Gestão de Status
- ✅ Status da venda (Pendente, Pago, Cancelado)
- ✅ Histórico de alterações
- ✅ Controle de cancelamentos

#### Integração
- ✅ Integração com estoque
- ✅ Baixa automática de estoque
- ✅ Reversão de estoque em cancelamentos
- ✅ Multi-marketplace (Mercado Livre, etc)

#### Vendedores
- ✅ Cadastro de vendedores
- ✅ Comissões por vendedor
- ✅ Relatórios por vendedor

---

## 🚀 Como Usar

### Criar Nova Venda
```typescript
import { createVenda } from '@/services/vendas';

const venda = await createVenda({
  cliente_id: 123,
  vendedor_id: 1,
  estoque_id: 1,
  itens: [
    {
      produto_id: 45,
      quantidade: 2,
      preco_unitario: 50.00
    }
  ],
  formas_pagamento: [
    {
      forma: 'DINHEIRO',
      valor: 100.00
    }
  ]
});
```

### Cancelar Venda
```typescript
import { cancelarVenda } from '@/services/vendas';

await cancelarVenda(venda_id, 'Motivo do cancelamento');
// Estoque será automaticamente devolvido
```

---

## 📊 Fluxo de Venda

```
1. Cliente seleciona produtos
   ↓
2. Sistema calcula totais e impostos
   ↓
3. Cliente define formas de pagamento
   ↓
4. Sistema valida estoque disponível
   ↓
5. Venda é criada
   ↓
6. Estoque é baixado automaticamente
   ↓
7. Comissão do vendedor é calculada
```

---

## 🔗 Links Relacionados

- [Estoque](../estoque/) - Sistema de estoque integrado
- [Impostos](../impostos/) - Cálculo de impostos
- [PDF](../pdf/) - Geração de pedidos em PDF
- [Relatórios](../relatorios/) - Relatórios de vendas

---

[⬅️ Voltar para Features](../README.md)
