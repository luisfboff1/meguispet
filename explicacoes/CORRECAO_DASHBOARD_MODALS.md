# 🔧 Correção: Modais do Dashboard Não Salvavam Dados

## 📅 Data: 2025-10-22

---

## 🐛 Problema Identificado

Ao adicionar **clientes**, **vendas** ou **movimentações** pelos **modais do Dashboard**, os dados **NÃO eram salvos** no banco de dados.

Porém, ao usar as **páginas dedicadas** (ex: `/clientes`), os dados eram salvos corretamente.

---

## 🔍 Causa Raiz

No arquivo `pages/dashboard.tsx`, as funções dos modais estavam **apenas fazendo `console.log()`** sem chamar a API para persistir os dados:

### ❌ Código INCORRETO (antes)

```typescript
// NÃO SALVAVA - Apenas console.log
const showClienteModal = useCallback(() => {
  open('cliente', {
    onSubmit: async (values: ClienteFormValues) => {
      try {
        updateModalLoading(true)
        console.log('Salvando cliente:', values)  // ❌ Só faz log!
        await loadDashboardData()  // ❌ Não salva nada
        close()
      } catch (error) {
        console.error('Erro ao salvar cliente:', error)
      } finally {
        updateModalLoading(false)
      }
    }
  })
}, [close, loadDashboardData, open, updateModalLoading])
```

### ✅ Código CORRETO (depois)

```typescript
// SALVA CORRETAMENTE - Chama a API
const showClienteModal = useCallback(() => {
  open('cliente', {
    onSubmit: async (values: ClienteFormValues) => {
      try {
        updateModalLoading(true)
        console.log('Salvando cliente:', values)
        // ✅ CHAMA A API PARA SALVAR
        const response = await clientesService.create(values)
        console.log('[dashboard] clientes.create response', response)
        if (response.success) {
          await loadDashboardData()
          close()
          window.alert('✅ Cliente cadastrado com sucesso!')
        } else {
          window.alert('❌ Erro ao criar cliente: ' + (response.message || 'não especificado'))
          console.error('dashboard clientes.create error', response)
        }
      } catch (error) {
        console.error('Erro ao salvar cliente:', error)
        window.alert('❌ Erro ao salvar cliente. Tente novamente.')
      } finally {
        updateModalLoading(false)
      }
    }
  })
}, [close, loadDashboardData, open, updateModalLoading])
```

---

## ✅ Correções Implementadas

### 1. `showClienteModal` - ✅ CORRIGIDO

**Arquivo:** `pages/dashboard.tsx:148-174`

**O que foi feito:**
- ✅ Adicionado `import { clientesService } from '@/services/api'`
- ✅ Adicionada chamada `await clientesService.create(values)`
- ✅ Validação de resposta com `if (response.success)`
- ✅ Mensagem de sucesso: "✅ Cliente cadastrado com sucesso!"
- ✅ Mensagem de erro: "❌ Erro ao criar cliente: [detalhes]"

---

### 2. `showVendaModal` - ✅ CORRIGIDO

**Arquivo:** `pages/dashboard.tsx:106-132`

**O que foi feito:**
- ✅ Adicionado `import { vendasService } from '@/services/api'`
- ✅ Adicionada chamada `await vendasService.create(values)`
- ✅ Validação de resposta com `if (response.success)`
- ✅ Mensagem de sucesso: "✅ Venda realizada com sucesso! Estoque atualizado."
- ✅ Mensagem de erro: "❌ Erro ao criar venda: [detalhes]"

**IMPORTANTE:** Ao criar venda pelo dashboard, o estoque é atualizado automaticamente (conforme correção anterior).

---

### 3. `showMovimentacaoModal` - ✅ CORRIGIDO

**Arquivo:** `pages/dashboard.tsx:176-202`

**O que foi feito:**
- ✅ Adicionado `import { movimentacoesService } from '@/services/api'`
- ✅ Adicionada chamada `await movimentacoesService.create(values)`
- ✅ Validação de resposta com `if (response.success)`
- ✅ Mensagem de sucesso: "✅ Movimentação cadastrada com sucesso!"
- ✅ Mensagem de erro: "❌ Erro ao criar movimentação: [detalhes]"

---

### 4. `showProdutoModal` - ✅ JÁ ESTAVA CORRETO

**Arquivo:** `pages/dashboard.tsx:134-146`

Este modal **já estava salvando corretamente** antes da correção.

---

## 🎯 Comparação: Dashboard vs Página Dedicada

### Por que a Página de Clientes funcionava?

A página `/clientes` sempre chamou a API corretamente:

```typescript
// pages/clientes.tsx
const handleSalvarCliente = async (clienteData: ClienteFormValues) => {
  try {
    setFormLoading(true)
    const response = await clientesService.create(clienteData)  // ✅ Sempre chamou a API
    if (response.success) {
      await loadClientes()
      setShowForm(false)
    }
  } catch (error) {
    console.error('Erro ao salvar cliente:', error)
  } finally {
    setFormLoading(false)
  }
}
```

### Por que o Dashboard NÃO funcionava?

O dashboard estava apenas simulando o salvamento sem persistir os dados:

```typescript
// pages/dashboard.tsx (ANTES da correção)
const showClienteModal = useCallback(() => {
  open('cliente', {
    onSubmit: async (values: ClienteFormValues) => {
      console.log('Salvando cliente:', values)  // ❌ Apenas log
      await loadDashboardData()  // ❌ Não salva
      close()
    }
  })
}, [close, loadDashboardData, open, updateModalLoading])
```

---

## 🧪 Como Testar

### Teste 1: Criar Cliente pelo Dashboard

1. Acesse o Dashboard
2. Clique em "Novo Cliente" no card de ações rápidas
3. Preencha o formulário
4. Clique em "Salvar"
5. ✅ Deve mostrar: "Cliente cadastrado com sucesso!"
6. ✅ Vá em `/clientes` e verifique que o cliente foi criado

### Teste 2: Criar Venda pelo Dashboard

1. Acesse o Dashboard
2. Clique em "Nova Venda"
3. Preencha o formulário com produtos e estoque
4. Clique em "Salvar"
5. ✅ Deve mostrar: "Venda realizada com sucesso! Estoque atualizado."
6. ✅ Vá em `/vendas` e verifique que a venda foi criada
7. ✅ Vá em `/produtos-estoque` e verifique que o estoque foi decrementado

### Teste 3: Criar Movimentação pelo Dashboard

1. Acesse o Dashboard
2. Clique em "Nova Movimentação"
3. Preencha o formulário
4. Clique em "Salvar"
5. ✅ Deve mostrar: "Movimentação cadastrada com sucesso!"
6. ✅ Vá em `/produtos-estoque` → aba "Movimentações" e verifique

### Teste 4: Erro de Validação

1. Tente criar um cliente sem preencher campos obrigatórios
2. ✅ Deve mostrar erro de validação do formulário
3. Tente criar uma venda com estoque insuficiente
4. ✅ Deve mostrar: "Estoque insuficiente para os seguintes produtos..."

---

## 📊 Resumo das Alterações

| Modal | Status Antes | Status Depois | Linha |
|-------|-------------|---------------|-------|
| Cliente | ❌ Não salvava | ✅ Salva corretamente | 148-174 |
| Venda | ❌ Não salvava | ✅ Salva + atualiza estoque | 106-132 |
| Movimentação | ❌ Não salvava | ✅ Salva corretamente | 176-202 |
| Produto | ✅ Já funcionava | ✅ Continua funcionando | 134-146 |

---

## 🔐 Validações Adicionadas

Todos os modais agora incluem:

1. ✅ **Validação de resposta da API**
   ```typescript
   if (response.success) {
     // Sucesso
   } else {
     // Erro com mensagem
   }
   ```

2. ✅ **Tratamento de erros**
   ```typescript
   try {
     // Salvar
   } catch (error) {
     window.alert('Erro ao salvar...')
   } finally {
     updateModalLoading(false)
   }
   ```

3. ✅ **Mensagens claras ao usuário**
   - ✅ Sucesso: "Cliente cadastrado com sucesso!"
   - ❌ Erro: "Erro ao criar cliente: [detalhes]"

4. ✅ **Console logs para debug**
   ```typescript
   console.log('[dashboard] clientes.create response', response)
   ```

---

## 📝 Notas Técnicas

- **Imports adicionados:** `clientesService`, `vendasService`, `movimentacoesService`
- **Pattern:** Mesma lógica do `showProdutoModal` (que já funcionava)
- **Lint:** ✅ Sem warnings ou erros
- **Build:** ✅ Compila com sucesso

---

**Desenvolvido com ❤️ para MeguisPet**
