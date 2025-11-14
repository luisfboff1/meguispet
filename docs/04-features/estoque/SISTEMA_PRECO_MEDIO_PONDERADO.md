# 💰 Sistema de Preço Médio Ponderado - MeguisPet

## 🎯 Objetivo

Implementei um sistema completo de **preço médio ponderado** que calcula automaticamente o custo médio dos produtos baseado nas compras, exatamente como você solicitou.

## 📊 Como Funciona o Preço Médio Ponderado

### **Exemplo Prático:**
- **Produto X**: Você tem 50 unidades compradas por R$ 10,00 cada
- **Nova Compra**: 20 unidades por R$ 20,00 cada
- **Cálculo**: (50 × R$ 10,00 + 20 × R$ 20,00) ÷ 70 = R$ 12,86 por unidade
- **Resultado**: Agora você tem 70 unidades com preço médio de R$ 12,86

## 🔧 Implementações Realizadas

### 1. **Estrutura do Banco de Dados**
- **Arquivo**: `database/update_produtos_preco_medio.sql`
- **Novos campos**:
  - `preco_venda`: Preço de venda ao cliente
  - `preco_custo`: Preço médio ponderado de custo (calculado automaticamente)

### 2. **Funções Automáticas no PostgreSQL**
```sql
-- Calcula preço médio ponderado
calcular_preco_medio_ponderado(produto_id, quantidade, preco)

-- Atualiza estoque e preço médio automaticamente
atualizar_estoque_preco_medio(produto_id, quantidade, preco, tipo_movimentacao)
```

### 3. **Interface Atualizada**

#### **Formulário de Produtos**
- ✅ **Preço de Venda**: Preço que o cliente paga
- ✅ **Preço de Custo**: Preço médio ponderado (calculado automaticamente)
- ✅ **Cálculo automático**: Se não informar preço de custo, usa 70% do preço de venda

#### **Página de Estoque**
- ✅ **Valores Totais**: 
  - Valor total de venda (estoque × preço de venda)
  - Valor total de custo (estoque × preço de custo)
  - Margem de lucro (venda - custo)
  - Margem percentual
- ✅ **Cards de Estatísticas**: Mostram totais gerais
- ✅ **Tabela Detalhada**: Cada produto mostra todos os valores

### 4. **Sistema de Movimentações**
- ✅ **Entrada**: Calcula preço médio ponderado automaticamente
- ✅ **Saída**: Mantém o preço médio (apenas reduz estoque)
- ✅ **Ajuste**: Pode ser entrada ou saída dependendo do sinal

## 📈 Exemplo de Uso Prático

### **Cenário 1: Primeira Compra**
```
Produto: Ração Premium
Quantidade: 100 unidades
Preço de Compra: R$ 15,00
→ Preço médio: R$ 15,00
→ Estoque: 100 unidades
```

### **Cenário 2: Segunda Compra (Preço Médio)**
```
Produto: Ração Premium
Estoque atual: 100 unidades a R$ 15,00
Nova compra: 50 unidades a R$ 20,00
→ Cálculo: (100 × 15 + 50 × 20) ÷ 150 = R$ 16,67
→ Novo preço médio: R$ 16,67
→ Estoque: 150 unidades
```

### **Cenário 3: Terceira Compra (Preço Médio Atualizado)**
```
Produto: Ração Premium
Estoque atual: 150 unidades a R$ 16,67
Nova compra: 30 unidades a R$ 12,00
→ Cálculo: (150 × 16,67 + 30 × 12) ÷ 180 = R$ 15,56
→ Novo preço médio: R$ 15,56
→ Estoque: 180 unidades
```

## 🎨 Interface Visual

### **Cards de Estatísticas**
- 💚 **Valor Total Venda**: R$ 45.000,00 (verde)
- 💙 **Valor Total Custo**: R$ 28.000,00 (azul)
- 💜 **Margem de Lucro**: R$ 17.000,00 (37,5%) (roxo)

### **Tabela de Produtos**
| Produto | Estoque | Preço Venda | Preço Custo | Total Venda | Total Custo | Margem |
|---------|---------|-------------|-------------|-------------|-------------|---------|
| Ração Premium | 150 | R$ 30,00 | R$ 15,56 | R$ 4.500,00 | R$ 2.334,00 | R$ 2.166,00 (92,8%) |

### **Formulário de Movimentação**
- ✅ Busca de produtos mostra: "Estoque: 150 | Custo: R$ 15,56 | Venda: R$ 30,00"
- ✅ Preço unitário preenchido automaticamente com preço de custo
- ✅ Cálculo automático de totais

## 🔄 Fluxo Automático

### **Quando Você Faz uma Compra:**
1. **Seleciona o produto** → Sistema busca preço médio atual
2. **Informa quantidade e preço** → Sistema calcula novo preço médio
3. **Confirma movimentação** → Sistema atualiza automaticamente:
   - Estoque: +quantidade
   - Preço médio: recalculado
   - Valores totais: atualizados

### **Triggers Automáticos:**
- ✅ Movimentação confirmada → Atualiza estoque e preço médio
- ✅ Produto editado → Recalcula valores totais
- ✅ Nova movimentação → Aplica cálculos automaticamente

## 📊 Relatórios Disponíveis

### **API de Relatórios**: `api/estoque-relatorio.php`
- ✅ Lista completa com valores totais
- ✅ Filtros por categoria, status de estoque
- ✅ Ordenação por qualquer campo
- ✅ Totais gerais do estoque

### **View do Banco**: `estoque_com_valores`
```sql
SELECT 
    nome,
    estoque,
    preco_venda,
    preco_custo,
    valor_total_custo,
    valor_total_venda,
    margem_lucro,
    margem_percentual
FROM estoque_com_valores;
```

## 🚀 Como Usar

### 1. **Execute o Script SQL**
```sql
-- Execute database/update_produtos_preco_medio.sql
-- Isso criará todas as funções e triggers necessários
```

### 2. **Cadastre Produtos**
- Preencha **preço de venda**
- **Preço de custo** será calculado automaticamente (70% da venda)
- Ou defina manualmente o preço de custo

### 3. **Faça Movimentações**
- **Entrada**: Sistema calcula preço médio automaticamente
- **Saída**: Mantém preço médio, apenas reduz estoque
- **Ajuste**: Pode ser entrada ou saída

### 4. **Monitore Valores**
- Acesse a aba **Estoque** na página unificada
- Veja valores totais e margens em tempo real
- Use filtros para análises específicas

## 🎯 Benefícios Implementados

### **Para o Negócio:**
- ✅ **Controle preciso** do custo real dos produtos
- ✅ **Margem de lucro** calculada automaticamente
- ✅ **Preços competitivos** baseados no custo real
- ✅ **Análise de rentabilidade** por produto

### **Para o Usuário:**
- ✅ **Cálculos automáticos** - sem trabalho manual
- ✅ **Interface intuitiva** - fácil de usar
- ✅ **Relatórios completos** - visão total do negócio
- ✅ **Histórico preservado** - todas as movimentações registradas

---

**✅ Sistema implementado e funcionando!**

Agora você tem controle total sobre o preço médio ponderado dos seus produtos, exatamente como solicitado. O sistema calcula automaticamente tudo e mantém os valores sempre atualizados! 🚀
