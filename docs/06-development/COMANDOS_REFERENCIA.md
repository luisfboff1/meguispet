# 🚀 **COMANDOS DE REFERÊNCIA - SISTEMA MEGUISPET**

> **Comandos Úteis para Análise de Impactos**  
> *Última atualização: $(date)*

## 🔍 **BUSCA DE IMPACTOS**

### **Buscar por Campo de Banco de Dados:**
```bash
# Buscar todas as referências a preco_venda
grep -r "preco_venda" . --include="*.tsx" --include="*.ts" --include="*.php"

# Buscar todas as referências a preco_custo
grep -r "preco_custo" . --include="*.tsx" --include="*.ts" --include="*.php"

# Buscar todas as referências a estoque
grep -r "estoque" . --include="*.tsx" --include="*.ts" --include="*.php"

# Buscar todas as referências a nome (produto)
grep -r "produto\.nome" . --include="*.tsx" --include="*.ts" --include="*.php"

# Buscar todas as referências a categoria
grep -r "categoria" . --include="*.tsx" --include="*.ts" --include="*.php"
```

### **Buscar por API Endpoint:**
```bash
# Buscar todas as chamadas para api/produtos.php
grep -r "api/produtos" . --include="*.tsx" --include="*.ts"

# Buscar todas as chamadas para api/vendas.php
grep -r "api/vendas" . --include="*.tsx" --include="*.ts"

# Buscar todas as chamadas para api/movimentacoes.php
grep -r "api/movimentacoes" . --include="*.tsx" --include="*.ts"

# Buscar todas as chamadas para api/estoque-relatorio.php
grep -r "api/estoque-relatorio" . --include="*.tsx" --include="*.ts"

# Buscar todas as chamadas para api/dashboard
grep -r "api/dashboard" . --include="*.tsx" --include="*.ts"
```

### **Buscar por Componente React:**
```bash
# Buscar todas as importações de ProdutoForm
grep -r "ProdutoForm" . --include="*.tsx" --include="*.ts"

# Buscar todas as importações de VendaForm
grep -r "VendaForm" . --include="*.tsx" --include="*.ts"

# Buscar todas as importações de MovimentacaoForm
grep -r "MovimentacaoForm" . --include="*.tsx" --include="*.ts"

# Buscar todas as importações de ClienteForm
grep -r "ClienteForm" . --include="*.tsx" --include="*.ts"

# Buscar todas as importações de AjusteEstoqueForm
grep -r "AjusteEstoqueForm" . --include="*.tsx" --include="*.ts"
```

### **Buscar por Página:**
```bash
# Buscar todas as referências a produtos.tsx
grep -r "produtos" . --include="*.tsx" --include="*.ts"

# Buscar todas as referências a vendas.tsx
grep -r "vendas" . --include="*.tsx" --include="*.ts"

# Buscar todas as referências a estoque.tsx
grep -r "estoque" . --include="*.tsx" --include="*.ts"

# Buscar todas as referências a dashboard.tsx
grep -r "dashboard" . --include="*.tsx" --include="*.ts"
```

---

## 🔧 **ANÁLISE DE DEPENDÊNCIAS**

### **Buscar Imports e Exports:**
```bash
# Buscar todas as importações de componentes
grep -r "import.*from.*components" . --include="*.tsx" --include="*.ts"

# Buscar todas as importações de serviços
grep -r "import.*from.*services" . --include="*.tsx" --include="*.ts"

# Buscar todas as importações de tipos
grep -r "import.*from.*types" . --include="*.tsx" --include="*.ts"

# Buscar todas as importações de hooks
grep -r "import.*from.*hooks" . --include="*.tsx" --include="*.ts"
```

### **Buscar por Função ou Método:**
```bash
# Buscar todas as chamadas para formatCurrency
grep -r "formatCurrency" . --include="*.tsx" --include="*.ts"

# Buscar todas as chamadas para formatDate
grep -r "formatDate" . --include="*.tsx" --include="*.ts"

# Buscar todas as chamadas para getProdutos
grep -r "getProdutos" . --include="*.tsx" --include="*.ts"

# Buscar todas as chamadas para getVendas
grep -r "getVendas" . --include="*.tsx" --include="*.ts"
```

---

## 🗄️ **ANÁLISE DE BANCO DE DADOS**

### **Buscar por Tabela:**
```bash
# Buscar todas as referências à tabela produtos
grep -r "FROM produtos" . --include="*.php"
grep -r "INSERT INTO produtos" . --include="*.php"
grep -r "UPDATE produtos" . --include="*.php"
grep -r "DELETE FROM produtos" . --include="*.php"

# Buscar todas as referências à tabela vendas
grep -r "FROM vendas" . --include="*.php"
grep -r "INSERT INTO vendas" . --include="*.php"
grep -r "UPDATE vendas" . --include="*.php"

# Buscar todas as referências à tabela movimentacoes_estoque
grep -r "FROM movimentacoes_estoque" . --include="*.php"
grep -r "INSERT INTO movimentacoes_estoque" . --include="*.php"

# Buscar todas as referências à tabela fornecedores
grep -r "FROM fornecedores" . --include="*.php"
grep -r "INSERT INTO fornecedores" . --include="*.php"
```

### **Buscar por Função/Procedure:**
```bash
# Buscar todas as chamadas para calcular_preco_medio_ponderado
grep -r "calcular_preco_medio_ponderado" . --include="*.php" --include="*.sql"

# Buscar todas as chamadas para atualizar_estoque_preco_medio
grep -r "atualizar_estoque_preco_medio" . --include="*.php" --include="*.sql"

# Buscar todas as referências a triggers
grep -r "TRIGGER" . --include="*.sql"
grep -r "trigger_" . --include="*.sql"
```

---

## 🎨 **ANÁLISE DE INTERFACE**

### **Buscar por Classe CSS:**
```bash
# Buscar todas as referências a classes Tailwind
grep -r "className.*bg-" . --include="*.tsx" --include="*.ts"
grep -r "className.*text-" . --include="*.tsx" --include="*.ts"
grep -r "className.*p-" . --include="*.tsx" --include="*.ts"
grep -r "className.*m-" . --include="*.tsx" --include="*.ts"
```

### **Buscar por Estado (useState):**
```bash
# Buscar todos os estados relacionados a produtos
grep -r "useState.*produto" . --include="*.tsx" --include="*.ts"

# Buscar todos os estados relacionados a vendas
grep -r "useState.*venda" . --include="*.tsx" --include="*.ts"

# Buscar todos os estados relacionados a estoque
grep -r "useState.*estoque" . --include="*.tsx" --include="*.ts"

# Buscar todos os estados relacionados a loading
grep -r "useState.*loading" . --include="*.tsx" --include="*.ts"
```

---

## 🔄 **ANÁLISE DE FLUXOS**

### **Buscar por useEffect:**
```bash
# Buscar todos os useEffect que fazem fetch de dados
grep -r "useEffect.*fetch" . --include="*.tsx" --include="*.ts"

# Buscar todos os useEffect que dependem de produtos
grep -r "useEffect.*produto" . --include="*.tsx" --include="*.ts"

# Buscar todos os useEffect que dependem de vendas
grep -r "useEffect.*venda" . --include="*.tsx" --include="*.ts"
```

### **Buscar por Event Handlers:**
```bash
# Buscar todos os handlers de submit
grep -r "handleSubmit" . --include="*.tsx" --include="*.ts"

# Buscar todos os handlers de change
grep -r "handleChange" . --include="*.tsx" --include="*.ts"

# Buscar todos os handlers de click
grep -r "handleClick" . --include="*.tsx" --include="*.ts"
```

---

## 🚀 **COMANDOS DE DESENVOLVIMENTO**

### **Build e Teste:**
```bash
# Fazer build do projeto
npm run build

# Executar em modo desenvolvimento
npm run dev

# Verificar tipos TypeScript
npx tsc --noEmit

# Executar linting
npm run lint
```

### **Git:**
```bash
# Ver status dos arquivos
git status

# Adicionar todos os arquivos
git add .

# Fazer commit com mensagem
git commit -m "descrição da mudança"

# Fazer push para repositório
git push origin main

# Ver histórico de commits
git log --oneline

# Ver diferenças
git diff
```

---

## 📊 **ANÁLISE DE PERFORMANCE**

### **Buscar por Queries Pesadas:**
```bash
# Buscar queries com JOIN
grep -r "JOIN" . --include="*.php"

# Buscar queries com ORDER BY
grep -r "ORDER BY" . --include="*.php"

# Buscar queries com GROUP BY
grep -r "GROUP BY" . --include="*.php"

# Buscar queries com LIMIT
grep -r "LIMIT" . --include="*.php"
```

### **Buscar por Loops:**
```bash
# Buscar todos os map() no frontend
grep -r "\.map(" . --include="*.tsx" --include="*.ts"

# Buscar todos os forEach() no frontend
grep -r "\.forEach(" . --include="*.tsx" --include="*.ts"

# Buscar todos os loops for no backend
grep -r "foreach" . --include="*.php"
```

---

## 🎯 **COMANDOS ESPECÍFICOS DO SISTEMA**

### **Buscar por Funcionalidades:**
```bash
# Buscar todas as referências a preço médio ponderado
grep -r "preco.*medio" . --include="*.tsx" --include="*.ts" --include="*.php" --include="*.sql"

# Buscar todas as referências a movimentação de estoque
grep -r "movimentacao" . --include="*.tsx" --include="*.ts" --include="*.php"

# Buscar todas as referências a fornecedores
grep -r "fornecedor" . --include="*.tsx" --include="*.ts" --include="*.php"

# Buscar todas as referências a condições de pagamento
grep -r "condicao.*pagamento" . --include="*.tsx" --include="*.ts" --include="*.php"
```

### **Buscar por Validações:**
```bash
# Buscar todas as validações de preço
grep -r "preco.*>.*0" . --include="*.tsx" --include="*.ts" --include="*.php"

# Buscar todas as validações de estoque
grep -r "estoque.*>.*0" . --include="*.tsx" --include="*.ts" --include="*.php"

# Buscar todas as validações de quantidade
grep -r "quantidade.*>.*0" . --include="*.tsx" --include="*.ts" --include="*.php"
```

---

## 📝 **EXEMPLOS DE USO**

### **Exemplo 1: Verificar impacto de mudança em preco_venda**
```bash
# 1. Buscar todas as referências
grep -r "preco_venda" . --include="*.tsx" --include="*.ts" --include="*.php"

# 2. Verificar APIs que usam
grep -r "preco_venda" api/ --include="*.php"

# 3. Verificar componentes que usam
grep -r "preco_venda" components/ --include="*.tsx" --include="*.ts"

# 4. Verificar páginas que usam
grep -r "preco_venda" pages/ --include="*.tsx" --include="*.ts"
```

### **Exemplo 2: Verificar impacto de mudança em uma API**
```bash
# 1. Buscar todas as chamadas para a API
grep -r "api/produtos" . --include="*.tsx" --include="*.ts"

# 2. Verificar serviços que usam
grep -r "produtosService" . --include="*.tsx" --include="*.ts"

# 3. Verificar componentes que fazem fetch
grep -r "fetch.*produtos" . --include="*.tsx" --include="*.ts"
```

### **Exemplo 3: Verificar impacto de mudança em um componente**
```bash
# 1. Buscar todas as importações
grep -r "ProdutoForm" . --include="*.tsx" --include="*.ts"

# 2. Verificar onde é usado
grep -r "import.*ProdutoForm" . --include="*.tsx" --include="*.ts"

# 3. Verificar props que recebe
grep -r "ProdutoForm.*produto" . --include="*.tsx" --include="*.ts"
```

---

## 🎯 **CONCLUSÃO**

Estes comandos fornecem uma **ferramenta poderosa** para análise de impactos no sistema:

- ✅ **Identificação rápida** de dependências
- ✅ **Análise completa** de mudanças
- ✅ **Validação** de alterações
- ✅ **Documentação** automática de impactos

**📝 Dica:** Salve estes comandos em um arquivo de texto para acesso rápido durante o desenvolvimento!

---

*Comandos criados para o sistema MeguisPet v2*  
*Mantido por: Equipe de Desenvolvimento*
