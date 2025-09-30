# 🗺️ **MAPA DE INTERLIGAÇÕES - SISTEMA MEGUISPET**

> **Documento de Arquitetura e Dependências**  
> *Última atualização: $(date)*

## 📋 **ÍNDICE**

1. [Visão Geral](#-visão-geral)
2. [Estrutura do Banco de Dados](#-estrutura-do-banco-de-dados)
3. [APIs e Endpoints](#-apis-e-endpoints)
4. [Componentes Frontend](#-componentes-frontend)
5. [Fluxos de Dados](#-fluxos-de-dados)
6. [Impactos de Mudanças](#-impactos-de-mudanças)
7. [Checklist de Alterações](#-checklist-de-alterações)

---

## 🎯 **VISÃO GERAL**

Este documento mapeia todas as interligações do sistema MeguisPet, permitindo entender rapidamente o impacto de mudanças em qualquer parte do sistema.

### **Arquitetura:**
```
Frontend (Next.js/React) ↔ API (PHP) ↔ Database (MariaDB)
```

---

## 🗄️ **ESTRUTURA DO BANCO DE DADOS**

### **Tabela: `produtos`**
```sql
- id (PK)
- nome
- descricao
- preco_venda      ← CAMPO PRINCIPAL PARA VENDAS
- preco_custo      ← CAMPO PRINCIPAL PARA MOVIMENTAÇÕES
- estoque
- estoque_minimo
- categoria
- codigo_barras
- ativo
- created_at
- updated_at
```

**🔗 IMPACTO:**
- Se alterar `preco_venda` → Afeta vendas, relatórios, dashboard
- Se alterar `preco_custo` → Afeta movimentações, preço médio ponderado
- Se alterar `estoque` → Afeta movimentações, alertas, relatórios

### **Tabela: `fornecedores`**
```sql
- id (PK)
- nome
- cnpj
- telefone
- email
- endereco
- ativo
- created_at
- updated_at
```

### **Tabela: `movimentacoes_estoque`**
```sql
- id (PK)
- tipo (entrada/saida/ajuste)
- fornecedor_id (FK)
- numero_pedido
- data_movimentacao
- condicao_pagamento
- status (pendente/confirmado/cancelado)
- observacoes
- created_at
- updated_at
```

### **Tabela: `movimentacoes_itens`**
```sql
- id (PK)
- movimentacao_id (FK)
- produto_id (FK)
- quantidade
- preco_unitario
- subtotal
```

### **Funções/Procedures:**
- `calcular_preco_medio_ponderado()` - Calcula preço médio
- `atualizar_estoque_preco_medio()` - Atualiza estoque e preço
- `trigger_movimentacao_preco_medio` - Trigger automático

### **View: `estoque_com_valores`**
```sql
- Todos os campos de produtos
- valor_total_custo
- valor_total_venda
- margem_lucro
- margem_percentual
- status_estoque
```

---

## 🔌 **APIS E ENDPOINTS**

### **📁 `/api/produtos.php`**
**Métodos:** GET, POST, PUT, DELETE

**Campos que usa:**
- `preco_venda` (obrigatório)
- `preco_custo` (opcional, calculado como 70% do preço_venda)

**🔗 CHAMADO POR:**
- `pages/produtos.tsx`
- `pages/produtos-estoque.tsx`
- `components/forms/ProdutoForm.tsx`
- `components/forms/VendaForm.tsx`
- `components/forms/MovimentacaoForm.tsx`

**⚠️ IMPACTO:**
- Se alterar estrutura → Atualizar todos os componentes acima
- Se alterar validações → Verificar formulários

### **📁 `/api/vendas.php`**
**Métodos:** GET, POST, PUT, DELETE

**Campos que usa:**
- `preco_venda` (para calcular subtotal)

**🔗 CHAMADO POR:**
- `pages/vendas.tsx`
- `components/forms/VendaForm.tsx`
- `pages/dashboard.tsx` (métricas)

**⚠️ IMPACTO:**
- Se alterar cálculo de preço → Afeta relatórios financeiros

### **📁 `/api/movimentacoes.php`**
**Métodos:** GET, POST, PUT, DELETE

**Campos que usa:**
- `preco_custo` (para movimentações)
- Chama `atualizar_estoque_preco_medio()`

**🔗 CHAMADO POR:**
- `pages/produtos-estoque.tsx`
- `components/forms/MovimentacaoForm.tsx`

**⚠️ IMPACTO:**
- Se alterar → Afeta preço médio ponderado
- Se alterar trigger → Afeta cálculos automáticos

### **📁 `/api/estoque-relatorio.php`**
**Métodos:** GET

**Usa a view:** `estoque_com_valores`

**🔗 CHAMADO POR:**
- `pages/produtos-estoque.tsx`
- `services/api.ts` → `getEstoqueRelatorio()`

**⚠️ IMPACTO:**
- Se alterar view → Afeta relatórios de estoque
- Se alterar campos → Atualizar interface

### **📁 `/api/dashboard/top-products.php`**
**Métodos:** GET

**Campos que usa:**
- `preco_venda` (para relatórios)

**🔗 CHAMADO POR:**
- `pages/dashboard.tsx`

**⚠️ IMPACTO:**
- Se alterar → Afeta métricas do dashboard

---

## 🎨 **COMPONENTES FRONTEND**

### **📁 `/components/forms/ProdutoForm.tsx`**
**Campos que manipula:**
- `preco_venda` (obrigatório)
- `preco_custo` (opcional)

**🔗 CHAMA:**
- `api/produtos.php`

**🔗 USADO POR:**
- `pages/produtos.tsx`
- `pages/produtos-estoque.tsx`

**⚠️ IMPACTO:**
- Se alterar campos → Atualizar validações na API
- Se alterar interface → Verificar usabilidade

### **📁 `/components/forms/VendaForm.tsx`**
**Campos que usa:**
- `preco_venda` (para vendas)

**🔗 CHAMA:**
- `api/vendas.php`
- `api/produtos.php` (para buscar produtos)

**🔗 USADO POR:**
- `pages/vendas.tsx`

**⚠️ IMPACTO:**
- Se alterar cálculo → Afeta receita
- Se alterar produto → Verificar disponibilidade

### **📁 `/components/forms/MovimentacaoForm.tsx`**
**Campos que usa:**
- `preco_custo` (para movimentações)
- `preco_venda` (para exibição)

**🔗 CHAMA:**
- `api/movimentacoes.php`
- `api/produtos.php` (para buscar produtos)

**🔗 USADO POR:**
- `pages/produtos-estoque.tsx`

**⚠️ IMPACTO:**
- Se alterar → Afeta preço médio ponderado
- Se alterar produto → Verificar estoque

### **📁 `/pages/produtos-estoque.tsx`**
**Campos que exibe:**
- `preco_venda`
- `preco_custo`
- `valor_total_venda`
- `valor_total_custo`
- `margem_lucro`

**🔗 CHAMA:**
- `api/estoque-relatorio.php`
- `api/movimentacoes.php`
- `api/produtos.php`

**⚠️ IMPACTO:**
- Se alterar interface → Verificar cálculos
- Se alterar dados → Atualizar estatísticas

---

## 🔄 **FLUXOS DE DADOS**

### **1. FLUXO DE VENDA:**
```
VendaForm → api/vendas.php → produtos.preco_venda → calcula subtotal
```

**⚠️ IMPACTO:**
- Se alterar `preco_venda` → Afeta todas as vendas
- Se alterar cálculo → Afeta receita total

### **2. FLUXO DE MOVIMENTAÇÃO:**
```
MovimentacaoForm → api/movimentacoes.php → produtos.preco_custo → 
atualizar_estoque_preco_medio() → recalcula preco_custo
```

**⚠️ IMPACTO:**
- Se alterar `preco_custo` → Afeta preço médio ponderado
- Se alterar trigger → Afeta cálculos automáticos

### **3. FLUXO DE RELATÓRIO:**
```
produtos-estoque.tsx → api/estoque-relatorio.php → 
estoque_com_valores → exibe valores totais
```

**⚠️ IMPACTO:**
- Se alterar view → Afeta todos os relatórios
- Se alterar campos → Atualizar interface

---

## ⚠️ **IMPACTOS DE MUDANÇAS**

### **🔄 SE ALTERAR `preco_venda`:**
**✅ ATUALIZAR:**
- `api/produtos.php` (validações)
- `components/forms/ProdutoForm.tsx`
- `components/forms/VendaForm.tsx`
- `pages/produtos.tsx`
- `pages/produtos-estoque.tsx`
- `pages/busca.tsx`
- `api/dashboard/top-products.php`

**✅ VERIFICAR:**
- Cálculos de vendas
- Relatórios financeiros
- Métricas do dashboard

### **🔄 SE ALTERAR `preco_custo`:**
**✅ ATUALIZAR:**
- `api/produtos.php` (validações)
- `components/forms/ProdutoForm.tsx`
- `components/forms/MovimentacaoForm.tsx`
- `pages/produtos-estoque.tsx`
- `api/movimentacoes.php`

**✅ VERIFICAR:**
- Preço médio ponderado
- Movimentações de estoque
- Cálculos de margem

### **🔄 SE ALTERAR `estoque`:**
**✅ ATUALIZAR:**
- `api/produtos.php`
- `api/movimentacoes.php`
- `pages/estoque.tsx`
- `pages/produtos-estoque.tsx`

**✅ VERIFICAR:**
- Alertas de estoque baixo
- Movimentações
- Relatórios

### **🔄 SE ALTERAR ESTRUTURA DO BANCO:**
**✅ ATUALIZAR:**
- Todas as APIs que usam a tabela
- Todos os componentes que exibem os dados
- Validações de formulários
- Views e procedures

**✅ VERIFICAR:**
- Migração de dados
- Compatibilidade com dados existentes
- Performance de queries

---

## ✅ **CHECKLIST DE ALTERAÇÕES**

### **🔧 ANTES DE FAZER UMA MUDANÇA:**

- [ ] **Identificar todos os arquivos que usam o campo/tabela**
- [ ] **Verificar APIs que manipulam os dados**
- [ ] **Verificar componentes que exibem os dados**
- [ ] **Verificar formulários que capturam os dados**
- [ ] **Verificar relatórios e dashboards**
- [ ] **Verificar triggers e procedures**
- [ ] **Verificar views do banco de dados**

### **🔧 DURANTE A MUDANÇA:**

- [ ] **Atualizar banco de dados primeiro**
- [ ] **Atualizar APIs**
- [ ] **Atualizar componentes**
- [ ] **Atualizar formulários**
- [ ] **Atualizar relatórios**
- [ ] **Testar fluxos completos**
- [ ] **Verificar cálculos**
- [ ] **Verificar validações**

### **🔧 APÓS A MUDANÇA:**

- [ ] **Testar todas as funcionalidades**
- [ ] **Verificar relatórios**
- [ ] **Verificar dashboard**
- [ ] **Verificar cálculos**
- [ ] **Verificar validações**
- [ ] **Atualizar documentação**
- [ ] **Fazer commit com descrição clara**

---

## 📚 **RECURSOS ADICIONAIS**

### **🔍 COMO ENCONTRAR IMPACTOS:**

1. **Buscar por nome do campo:**
   ```bash
   grep -r "nome_do_campo" .
   ```

2. **Buscar por nome da tabela:**
   ```bash
   grep -r "nome_da_tabela" .
   ```

3. **Buscar por endpoint:**
   ```bash
   grep -r "api/nome" .
   ```

4. **Buscar por componente:**
   ```bash
   grep -r "NomeComponente" .
   ```

### **📋 COMANDOS ÚTEIS:**

```bash
# Buscar todas as referências a um campo
grep -r "preco_venda" . --include="*.tsx" --include="*.ts" --include="*.php"

# Buscar todas as chamadas de API
grep -r "api/" . --include="*.tsx" --include="*.ts"

# Buscar todas as importações de componentes
grep -r "import.*from.*components" . --include="*.tsx" --include="*.ts"
```

---

## 🎯 **CONCLUSÃO**

Este mapa de interligações deve ser **sempre atualizado** quando houver mudanças no sistema. Ele serve como:

- ✅ **Guia de impacto** para mudanças
- ✅ **Documentação viva** do sistema
- ✅ **Checklist** para alterações
- ✅ **Referência rápida** para desenvolvedores

**📝 Lembre-se:** Sempre atualize este documento quando fizer alterações no sistema!

---

*Documento criado para o sistema MeguisPet v2*  
*Mantido por: Equipe de Desenvolvimento*
