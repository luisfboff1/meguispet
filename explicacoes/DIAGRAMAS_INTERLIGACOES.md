# 📊 **DIAGRAMAS DE INTERLIGAÇÕES - SISTEMA MEGUISPET**

> **Diagramas Visuais das Dependências**  
> *Última atualização: $(date)*

## 🎯 **ARQUITETURA GERAL**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   FRONTEND      │    │      API        │    │   DATABASE      │
│   (Next.js)     │◄──►│     (PHP)       │◄──►│   (MariaDB)     │
│                 │    │                 │    │                 │
│ • React Pages   │    │ • REST APIs     │    │ • Tables        │
│ • Components    │    │ • Business      │    │ • Functions     │
│ • Forms         │    │   Logic         │    │ • Procedures    │
│ • Services      │    │ • Validation    │    │ • Views         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## 🗄️ **ESTRUTURA DO BANCO DE DADOS**

```
┌─────────────────────────────────────────────────────────────┐
│                    TABELA: produtos                         │
├─────────────────────────────────────────────────────────────┤
│ id (PK) │ nome │ preco_venda │ preco_custo │ estoque │ ... │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                TABELA: movimentacoes_estoque                │
├─────────────────────────────────────────────────────────────┤
│ id │ tipo │ fornecedor_id │ data │ status │ observacoes │ ...│
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                TABELA: movimentacoes_itens                  │
├─────────────────────────────────────────────────────────────┤
│ id │ movimentacao_id │ produto_id │ quantidade │ preco │ ...│
└─────────────────────────────────────────────────────────────┘
```

---

## 🔌 **APIS E ENDPOINTS**

```
┌─────────────────────────────────────────────────────────────┐
│                    API LAYER                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ produtos.php│  │ vendas.php  │  │movimentacoes│         │
│  │             │  │             │  │    .php     │         │
│  │ • GET       │  │ • GET       │  │             │         │
│  │ • POST      │  │ • POST      │  │ • GET       │         │
│  │ • PUT       │  │ • PUT       │  │ • POST      │         │
│  │ • DELETE    │  │ • DELETE    │  │ • PUT       │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │estoque-     │  │ dashboard/  │  │ fornecedores│         │
│  │relatorio.php│  │top-products │  │    .php     │         │
│  │             │  │    .php     │  │             │         │
│  │ • GET       │  │ • GET       │  │ • CRUD      │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎨 **COMPONENTES FRONTEND**

```
┌─────────────────────────────────────────────────────────────┐
│                   COMPONENTS LAYER                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                    FORMS                                │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐      │ │
│  │  │ProdutoForm  │ │ VendaForm   │ │Movimentacao │      │ │
│  │  │             │ │             │ │    Form     │      │ │
│  │  │• preco_venda│ │• preco_venda│ │• preco_custo│      │ │
│  │  │• preco_custo│ │• calcula    │ │• quantidade │      │ │
│  │  │• estoque    │ │  subtotal   │ │• fornecedor │      │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘      │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                    PAGES                                │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐      │ │
│  │  │produtos.tsx │ │ vendas.tsx  │ │produtos-    │      │ │
│  │  │             │ │             │ │estoque.tsx  │      │ │
│  │  │• lista      │ │• nova venda │ │             │      │ │
│  │  │• cadastro   │ │• histórico  │ │• estoque    │      │ │
│  │  │• edição     │ │• relatórios │ │• movimenta  │      │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘      │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 **FLUXOS DE DADOS**

### **1. FLUXO DE VENDA:**
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ VendaForm   │───►│vendas.php   │───►│ produtos    │───►│ preco_venda │
│             │    │             │    │             │    │             │
│• seleciona  │    │• valida     │    │• busca      │    │• calcula    │
│  produto    │    │• salva      │    │• verifica   │    │  subtotal   │
│• quantidade │    │• calcula    │    │• atualiza   │    │• atualiza   │
│             │    │  total      │    │  estoque    │    │  estoque    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

### **2. FLUXO DE MOVIMENTAÇÃO:**
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│Movimentacao │───►│movimentacoes│───►│ produtos    │───►│ preco_custo │
│    Form     │    │    .php     │    │             │    │             │
│             │    │             │    │             │    │             │
│• entrada    │    │• valida     │    │• atualiza   │    │• calcula    │
│• saída      │    │• salva      │    │  estoque    │    │  preço      │
│• ajuste     │    │• chama      │    │• chama      │    │  médio      │
│             │    │  procedure  │    │  trigger    │    │  ponderado  │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

### **3. FLUXO DE RELATÓRIO:**
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│produtos-    │───►│estoque-     │───►│estoque_com_ │───►│ valores     │
│estoque.tsx  │    │relatorio.php│    │   valores   │    │             │
│             │    │             │    │             │    │             │
│• exibe      │    │• consulta   │    │• view       │    │• total      │
│  relatório  │    │  view       │    │  calculada  │    │  custo      │
│• estatísticas│   │• formata    │    │• margem     │    │• total      │
│• filtros    │    │  dados      │    │  lucro      │    │  venda      │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

---

## ⚠️ **IMPACTOS DE MUDANÇAS**

### **🔄 SE ALTERAR `preco_venda`:**
```
┌─────────────────────────────────────────────────────────────┐
│                    IMPACTO: preco_venda                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │ produtos.php│    │ VendaForm   │    │ vendas.tsx  │     │
│  │             │    │             │    │             │     │
│  │ • validação │◄──►│ • cálculo   │◄──►│ • exibição  │     │
│  │ • salvamento│    │ • subtotal  │    │ • relatórios│     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │ProdutoForm  │    │produtos.tsx │    │ busca.tsx   │     │
│  │             │    │             │    │             │     │
│  │ • entrada   │◄──►│ • listagem  │◄──►│ • busca     │     │
│  │ • validação │    │ • cards     │    │ • resultados│     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│                                                             │
│  ┌─────────────┐    ┌─────────────┐                        │
│  │top-products │    │dashboard.tsx│                        │
│  │    .php     │    │             │                        │
│  │             │    │             │                        │
│  │ • relatório │◄──►│ • métricas  │                        │
│  │ • ranking   │    │ • gráficos  │                        │
│  └─────────────┘    └─────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

### **🔄 SE ALTERAR `preco_custo`:**
```
┌─────────────────────────────────────────────────────────────┐
│                    IMPACTO: preco_custo                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │ produtos.php│    │Movimentacao │    │movimentacoes│     │
│  │             │    │    Form     │    │    .php     │     │
│  │ • validação │◄──►│ • entrada   │◄──►│ • procedure │     │
│  │ • cálculo   │    │ • cálculo   │    │ • trigger   │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │ProdutoForm  │    │produtos-    │    │estoque_com_ │     │
│  │             │    │estoque.tsx  │    │   valores   │     │
│  │ • entrada   │◄──►│ • relatório │◄──►│ • view      │     │
│  │ • validação │    │ • estatísticas│   │ • cálculo   │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│                                                             │
│  ┌─────────────┐    ┌─────────────┐                        │
│  │calcular_    │    │atualizar_   │                        │
│  │preco_medio_ │    │estoque_     │                        │
│  │ponderado()  │    │preco_medio()│                        │
│  │             │    │             │                        │
│  │ • função    │◄──►│ • procedure │                        │
│  │ • cálculo   │    │ • trigger   │                        │
│  └─────────────┘    └─────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔍 **COMANDOS DE BUSCA**

### **Buscar Impactos de um Campo:**
```bash
# Buscar todas as referências a preco_venda
grep -r "preco_venda" . --include="*.tsx" --include="*.ts" --include="*.php"

# Buscar todas as referências a preco_custo
grep -r "preco_custo" . --include="*.tsx" --include="*.ts" --include="*.php"

# Buscar todas as referências a estoque
grep -r "estoque" . --include="*.tsx" --include="*.ts" --include="*.php"
```

### **Buscar Impactos de uma API:**
```bash
# Buscar todas as chamadas para api/produtos.php
grep -r "api/produtos" . --include="*.tsx" --include="*.ts"

# Buscar todas as chamadas para api/vendas.php
grep -r "api/vendas" . --include="*.tsx" --include="*.ts"

# Buscar todas as chamadas para api/movimentacoes.php
grep -r "api/movimentacoes" . --include="*.tsx" --include="*.ts"
```

### **Buscar Impactos de um Componente:**
```bash
# Buscar todas as importações de ProdutoForm
grep -r "ProdutoForm" . --include="*.tsx" --include="*.ts"

# Buscar todas as importações de VendaForm
grep -r "VendaForm" . --include="*.tsx" --include="*.ts"

# Buscar todas as importações de MovimentacaoForm
grep -r "MovimentacaoForm" . --include="*.tsx" --include="*.ts"
```

---

## 📋 **CHECKLIST VISUAL**

```
┌─────────────────────────────────────────────────────────────┐
│                    CHECKLIST DE MUDANÇAS                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ✅ ANTES DA MUDANÇA:                                       │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ [ ] Identificar todos os arquivos afetados             │ │
│  │ [ ] Verificar APIs relacionadas                        │ │
│  │ [ ] Verificar componentes relacionados                 │ │
│  │ [ ] Verificar formulários relacionados                 │ │
│  │ [ ] Verificar relatórios relacionados                  │ │
│  │ [ ] Verificar triggers e procedures                    │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                             │
│  ✅ DURANTE A MUDANÇA:                                      │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ [ ] Atualizar banco de dados                           │ │
│  │ [ ] Atualizar APIs                                     │ │
│  │ [ ] Atualizar componentes                              │ │
│  │ [ ] Atualizar formulários                              │ │
│  │ [ ] Atualizar relatórios                               │ │
│  │ [ ] Testar fluxos completos                            │ │
│  │ [ ] Verificar cálculos                                 │ │
│  │ [ ] Verificar validações                               │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                             │
│  ✅ APÓS A MUDANÇA:                                         │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ [ ] Testar todas as funcionalidades                    │ │
│  │ [ ] Verificar relatórios                               │ │
│  │ [ ] Verificar dashboard                                │ │
│  │ [ ] Verificar cálculos                                 │ │
│  │ [ ] Verificar validações                               │ │
│  │ [ ] Atualizar documentação                             │ │
│  │ [ ] Fazer commit com descrição clara                   │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 **CONCLUSÃO**

Estes diagramas fornecem uma **visão visual clara** das interligações do sistema, facilitando:

- ✅ **Identificação rápida** de impactos
- ✅ **Planejamento** de mudanças
- ✅ **Validação** de alterações
- ✅ **Documentação** viva do sistema

**📝 Lembre-se:** Sempre atualize estes diagramas quando fizer alterações no sistema!

---

*Diagramas criados para o sistema MeguisPet v2*  
*Mantido por: Equipe de Desenvolvimento*
