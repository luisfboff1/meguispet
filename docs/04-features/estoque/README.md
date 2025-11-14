# 📦 Sistema de Estoque

Documentação completa do sistema de controle de estoque multi-loja do MeguisPet.

---

## 📋 Documentação Principal

### 📖 Visão Geral
- **[Stock Management](./STOCK_MANAGEMENT.md)** - Documentação principal do sistema de estoque
- **[Stock V2 README](./STOCK_V2_README.md)** - Guia rápido da versão 2 do sistema

### 🔄 Evolução e Melhorias
- **[Stock Improvements V2](./STOCK_IMPROVEMENTS_V2.md)** - Melhorias implementadas na versão 2
- **[Plano Multi-Estoque](./PLANO_MULTI_ESTOQUE.md)** - Plano de evolução para suporte multi-estoque

### 📊 Diagramas e Fluxos
- **[Stock Flow Diagrams](./STOCK_FLOW_DIAGRAMS.md)** - Diagramas de fluxo do sistema de estoque

### ⚙️ Funcionalidades Específicas
- **[Sistema de Movimentações](./SISTEMA_MOVIMENTACOES_ESTOQUE.md)** - Sistema de movimentações de estoque
- **[Preço Médio Ponderado](./SISTEMA_PRECO_MEDIO_PONDERADO.md)** - Cálculo de preço médio ponderado

### 📝 Implementação e Correções
- **[Implementation Summary](./IMPLEMENTATION_SUMMARY_STOCK.md)** - Resumo da implementação inicial
- **[Implementation V2](./IMPLEMENTATION_SUMMARY_V2.md)** - Resumo da versão 2
- **[Correções de Estoque](./CORRECOES_ESTOQUE.md)** - Correções na relação Produto-Estoque-Venda

### 🧪 Testes
- **[Testing Guide](./TESTING_GUIDE.md)** - Guia de testes do sistema de estoque

---

## 🎯 Funcionalidades

### ✅ Implementado

#### Multi-Estoque
- ✅ Suporte para múltiplos estoques (lojas/depósitos)
- ✅ Controle de estoque por produto e local
- ✅ Transferências entre estoques
- ✅ Visibilidade de estoque por loja

#### Movimentações
- ✅ Entrada de produtos
- ✅ Saída de produtos (vendas)
- ✅ Ajustes de estoque
- ✅ Histórico de movimentações

#### Cálculos
- ✅ Preço médio ponderado
- ✅ Valorização de estoque
- ✅ Custo de produtos vendidos (CMV)

#### Controles
- ✅ Estoque mínimo por produto
- ✅ Alertas de baixo estoque
- ✅ Validação de estoque negativo
- ✅ Rastreamento de lotes (parcial)

---

## 🚀 Como Usar

### Criar Movimentação de Entrada
```typescript
import { createMovimentacao } from '@/services/estoque';

await createMovimentacao({
  produto_id: 123,
  estoque_id: 1,
  tipo: 'ENTRADA',
  quantidade: 10,
  valor_unitario: 50.00,
  motivo: 'Compra de fornecedor'
});
```

### Verificar Estoque Disponível
```typescript
import { getEstoqueProduto } from '@/services/estoque';

const estoque = await getEstoqueProduto(produto_id, estoque_id);
console.log(`Quantidade disponível: ${estoque.quantidade}`);
```

### Transferir Entre Estoques
```typescript
import { transferirEstoque } from '@/services/estoque';

await transferirEstoque({
  produto_id: 123,
  estoque_origem_id: 1,
  estoque_destino_id: 2,
  quantidade: 5,
  observacao: 'Transferência para loja 2'
});
```

---

## 📊 Estrutura do Banco de Dados

### Tabelas Principais
- `produtos` - Cadastro de produtos
- `estoques` - Definição de estoques (lojas/depósitos)
- `produto_estoque` - Quantidade por produto/estoque
- `movimentacoes_estoque` - Histórico de movimentações

### Relacionamentos
```
produtos (1) ──→ (N) produto_estoque (N) ←── (1) estoques
                           ↓
                     movimentacoes_estoque
```

---

## 🔗 Links Relacionados

- [Vendas](../vendas/) - Integração com vendas
- [PDF](../pdf/) - Geração de relatórios PDF
- [Database](../../03-database/) - Schema completo

---

[⬅️ Voltar para Features](../README.md)
