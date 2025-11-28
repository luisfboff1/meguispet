# Documentação: Sistema de Vendas, Parcelas e PDF

## Visão Geral

Este documento descreve as correções e melhorias implementadas no sistema de vendas, incluindo:
- Tabela de parcelas no PDF
- Carregamento correto de dados de clientes
- Edição de vendas com parcelas
- Salvamento de condições de pagamento

---

## 1. Tabela de Parcelas no PDF

### Problema Inicial
Não havia uma tabela de parcelas no PDF de vendas, dificultando a visualização dos vencimentos e valores.

### Solução Implementada
Adicionada tabela de parcelas em **todos** os PDFs (inclusive vendas à vista mostram 1 parcela).

### Localização
**Arquivo**: `lib/pdf-generator.ts`

### Implementação

#### 1.1. Campo de Pagamento Dinâmico
```typescript
// Determinar o texto de pagamento
let pagamento = 'N/A'

// Se tiver parcelas cadastradas
if (venda.parcelas && Array.isArray(venda.parcelas) && venda.parcelas.length > 0) {
  // Se tiver condição de pagamento, mostrar o nome dela
  if (venda.condicao_pagamento?.nome) {
    pagamento = venda.condicao_pagamento.nome
  } else {
    // Caso contrário, mostrar "Parcelado (X parcelas)"
    pagamento = `Parcelado (${venda.parcelas.length}x)`
  }
} else {
  // Se não tiver parcelas, mostrar a forma de pagamento
  pagamento = getPaymentMethodName(venda)
}
```

#### 1.2. Tabela de Parcelas (Sempre Exibida)
```typescript
// Preparar dados da tabela de parcelas
let parcelasTableData: string[][] = []

if (venda.parcelas && Array.isArray(venda.parcelas) && venda.parcelas.length > 0) {
  // Se houver parcelas cadastradas, usar elas
  const parcelasOrdenadas = [...venda.parcelas].sort((a, b) => a.numero_parcela - b.numero_parcela)
  parcelasTableData = parcelasOrdenadas.map((parcela) => [
    parcela.numero_parcela.toString(),
    new Date(parcela.data_vencimento).toLocaleDateString('pt-BR'),
    `R$ ${parcela.valor_parcela.toFixed(2).replace('.', ',')}`
  ])
} else {
  // Se não houver parcelas (venda à vista), criar uma parcela única
  const dataVencimento = venda.data_venda || venda.created_at
  parcelasTableData = [[
    '1',
    new Date(dataVencimento).toLocaleDateString('pt-BR'),
    `R$ ${totalFinal.toFixed(2).replace('.', ',')}`
  ]]
}

// Criar tabela de parcelas
autoTable(doc, {
  startY: yPos,
  head: [['PARCELA', 'VENCIMENTO', 'VALOR']],
  body: parcelasTableData,
  // ... configurações de estilo
})
```

---

## 2. Carregamento de Dados do Cliente

### Problema
O CNPJ/CPF e outros dados do cliente não apareciam no PDF porque:
1. A lista de vendas retorna apenas `nome` e `email` do cliente (dados resumidos)
2. O `handleExportarPDF` só buscava dados completos se a venda **não tivesse itens**
3. Como vendas da lista já tinham itens, nunca buscava dados completos

### Solução
**Arquivo**: `pages/vendas.tsx`

```typescript
const handleExportarPDF = async (venda: Venda) => {
  try {
    // SEMPRE buscar a venda completa para garantir que temos todos os dados
    console.log('🔄 [Frontend] Buscando venda completa da API...')
    const response = await vendasService.getById(venda.id)

    if (!response.success || !response.data) {
      setToast({ message: 'Erro ao carregar dados da venda', type: 'error' })
      return
    }

    let vendaCompleta = response.data
    // ... resto do código
```

**Mudança chave**: Removido o `if (!venda.itens?.length)` - agora **sempre** busca dados completos.

---

## 3. API de Vendas - Queries Separadas

### Problema
Buscar cliente e parcelas via queries aninhadas (embedded) causava erros 404:
- Campo `bairro` não existe na tabela `clientes_fornecedores`
- RLS (Row Level Security) pode bloquear queries complexas

### Solução
**Arquivo**: `pages/api/vendas/[id].ts`

Mudança de queries aninhadas para **queries separadas**:

```typescript
// Buscar venda básica primeiro
const { data: venda, error } = await supabase
  .from('vendas')
  .select(`
    *,
    cliente:clientes_fornecedores!cliente_id(id, nome, email, documento, endereco, cidade, estado, cep, inscricao_estadual),
    vendedor:vendedores!vendedor_id(id, nome, email),
    estoque:estoques!estoque_id(id, nome),
    forma_pagamento_detalhe:formas_pagamento!forma_pagamento_id(id, nome),
    condicao_pagamento:condicoes_pagamento!condicao_pagamento_id(id, nome, descricao),
    itens:vendas_itens(...)
  `)
  .eq('id', id)
  .single();

// Buscar cliente completo SEPARADAMENTE
if (venda.cliente_id) {
  const { data: clienteCompleto, error: clienteError } = await supabase
    .from('clientes_fornecedores')
    .select('id, nome, email, documento, endereco, cidade, estado, cep, inscricao_estadual')
    .eq('id', venda.cliente_id)
    .single();

  if (clienteCompleto) {
    venda.cliente = clienteCompleto;
  }
}

// Buscar parcelas SEPARADAMENTE
const { data: parcelas, error: parcelasError } = await supabase
  .from('venda_parcelas')
  .select('id, numero_parcela, valor_parcela, data_vencimento, data_pagamento, status, observacoes')
  .eq('venda_id', id)
  .order('numero_parcela', { ascending: true });

if (parcelas && parcelas.length > 0) {
  venda.parcelas = parcelas;
} else {
  venda.parcelas = [];
}
```

**Vantagens**:
- Evita erros de campos inexistentes
- Mais robusto com RLS
- Parcelas são opcionais (não bloqueiam retorno da venda)

---

## 4. Edição de Vendas - Carregamento de Parcelas

### Problema
Ao editar uma venda com parcelas:
- API retornava corretamente as parcelas
- Mas o formulário mostrava "À Vista" e não exibia as parcelas

### Causa Raiz
O `useEffect` do `VendaForm` carregava os itens da venda, mas **não inicializava** os estados de parcelas.

### Solução
**Arquivo**: `components/forms/VendaForm.tsx`

```typescript
useEffect(() => {
  if (mode === 'edit' && initialData) {
    const venda = initialData;

    // ... código de carregamento de outros campos ...

    // Carregar parcelas se existirem
    if (venda.parcelas?.length) {
      console.log('📦 [VendaForm] Carregando parcelas da venda:', venda.parcelas)
      setUsarParcelas(true)
      setParcelas(venda.parcelas.map(p => ({
        numero_parcela: p.numero_parcela,
        valor_parcela: p.valor_parcela,
        data_vencimento: p.data_vencimento.split('T')[0], // Converter para formato YYYY-MM-DD
        observacoes: p.observacoes || ''
      })))
      setNumeroParcelas(venda.parcelas.length)
    } else {
      console.log('📦 [VendaForm] Venda sem parcelas - resetando estado')
      setUsarParcelas(false)
      setParcelas([])
      setNumeroParcelas(1)
    }
  }
}, [mode, initialData])
```

---

## 5. Salvamento de Condição de Pagamento

### Problema
O campo `condicao_pagamento_id` existe na tabela (migration 011), mas **não estava sendo salvo** na API.

### Solução
**Arquivo**: `pages/api/vendas.ts`

#### 5.1. POST (Criação de Vendas)
```typescript
// Linha 115 - Destructuring
const {
  numero_venda,
  cliente_id,
  vendedor_id,
  estoque_id,
  forma_pagamento_id,
  condicao_pagamento_id,  // ✅ ADICIONADO
  data_venda,
  valor_total,
  valor_final,
  desconto,
  // ...
} = req.body;

// Linha 164 - Insert
.insert({
  numero_venda,
  cliente_id: cliente_id || null,
  vendedor_id: vendedor_id || null,
  estoque_id: estoque_id || null,
  forma_pagamento_id: forma_pagamento_id || null,
  condicao_pagamento_id: condicao_pagamento_id || null,  // ✅ ADICIONADO
  data_venda: data_venda || new Date().toISOString(),
  // ...
})
```

#### 5.2. PUT (Edição de Vendas)
```typescript
// Linha 363 - Destructuring
const {
  id,
  numero_venda,
  cliente_id,
  vendedor_id,
  estoque_id,
  forma_pagamento_id,
  condicao_pagamento_id,  // ✅ ADICIONADO
  data_venda,
  desconto,
  // ...
} = req.body;

// Linha 424 - Update
.update({
  numero_venda,
  cliente_id: cliente_id || null,
  vendedor_id: vendedor_id || null,
  estoque_id: estoque_id || null,
  forma_pagamento_id: forma_pagamento_id || null,
  condicao_pagamento_id: condicao_pagamento_id || null,  // ✅ ADICIONADO
  data_venda,
  // ...
})
```

---

## 6. Estrutura da Tabela de Parcelas

### Schema do Banco de Dados

```sql
CREATE TABLE IF NOT EXISTS venda_parcelas (
  id BIGSERIAL PRIMARY KEY,
  venda_id BIGINT NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
  numero_parcela INTEGER NOT NULL,
  valor_parcela DECIMAL(10, 2) NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE NULL,
  status VARCHAR(20) DEFAULT 'pendente',
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Campos Importantes
- `numero_parcela`: Número sequencial da parcela (1, 2, 3, ...)
- `valor_parcela`: Valor da parcela em reais
- `data_vencimento`: Data de vencimento da parcela
- `data_pagamento`: Data em que foi paga (NULL se pendente)
- `status`: 'pendente' | 'pago' | 'atrasado'

---

## 7. Fluxo Completo de Dados

### 7.1. Criação de Venda com Parcelas

```
1. Frontend (VendaForm)
   ├─ Usuário preenche dados da venda
   ├─ Escolhe "Usar parcelas" ou condição de pagamento
   ├─ Define número de parcelas e datas de vencimento
   └─ Envia POST para /api/vendas

2. Backend (pages/api/vendas.ts)
   ├─ Valida dados
   ├─ Cria venda (com condicao_pagamento_id)
   ├─ Insere itens da venda
   ├─ Insere parcelas (venda_parcelas)
   ├─ Cria transações financeiras para cada parcela
   └─ Retorna sucesso

3. Banco de Dados
   ├─ vendas (com condicao_pagamento_id)
   ├─ vendas_itens
   ├─ venda_parcelas
   └─ transacoes
```

### 7.2. Edição de Venda

```
1. Frontend (vendas.tsx)
   ├─ Clica em "Editar" na lista
   ├─ Busca venda completa via API
   └─ Abre VendaForm com initialData

2. VendaForm
   ├─ useEffect detecta mode='edit'
   ├─ Carrega todos os dados (itens, parcelas, etc)
   ├─ Inicializa estados de parcelas
   └─ Exibe formulário preenchido

3. Ao Salvar
   ├─ Envia PUT para /api/vendas
   ├─ Backend atualiza venda (incluindo condicao_pagamento_id)
   └─ Atualiza itens e parcelas
```

### 7.3. Geração de PDF

```
1. Frontend (vendas.tsx)
   ├─ Clica em "Exportar PDF"
   ├─ SEMPRE busca venda completa via API
   └─ Chama gerarPDF()

2. API (/api/vendas/[id])
   ├─ Busca venda básica
   ├─ Busca cliente completo (separadamente)
   ├─ Busca parcelas (separadamente)
   └─ Retorna tudo completo

3. pdf-generator.ts
   ├─ Renderiza informações da venda
   ├─ Renderiza dados do cliente (com CNPJ/CPF)
   ├─ Renderiza informações fiscais
   ├─ Renderiza tabela de itens
   ├─ Renderiza tabela de parcelas (SEMPRE)
   └─ Gera PDF final
```

---

## 8. Debugging e Logs

Durante o desenvolvimento, foram adicionados logs extensivos para rastreamento:

### Frontend (vendas.tsx)
- `🔄 [Frontend] Buscando venda completa da API...`
- `📥 [Frontend] Resposta da API /vendas/[id]:`
- `📦 [Frontend] Venda completa após API:`
- `✏️ [Editar] Resposta da API:`
- `✏️ [Editar] Venda carregada:`

### API (pages/api/vendas/[id].ts)
- `🔍 [GET /api/vendas/[id]] Buscando venda ID:`
- `✅ [GET /api/vendas/[id]] Venda encontrada:`
- `🔍 [GET /api/vendas/[id]] Buscando cliente completo:`
- `✅ [GET /api/vendas/[id]] Cliente encontrado - TODOS OS CAMPOS:`
- `🔍 [GET /api/vendas/[id]] Buscando parcelas para venda_id:`
- `✅ [GET /api/vendas/[id]] Parcelas encontradas:`
- `📋 [GET /api/vendas/[id]] Detalhes das parcelas:`

### Service Layer (services/api.ts)
- `🌐 [Axios] Resposta bruta de /vendas/[id]:`
- `👤 [Axios] Cliente na resposta:`

### Form (VendaForm.tsx)
- `📦 [VendaForm] Carregando parcelas da venda:`
- `📦 [VendaForm] Venda sem parcelas - resetando estado`

### PDF Generator (lib/pdf-generator.ts)
- `📄 [PDF] Cliente:` (em desenvolvimento)

---

## 9. Problemas Encontrados e Soluções

### 9.1. Erro 404 ao Editar Vendas

**Erro**: `column clientes_fornecedores_1.bairro does not exist`

**Causa**: Campo `bairro` não existe na tabela

**Solução**: Removido `bairro` da query e mudado para queries separadas

---

### 9.2. CNPJ/CPF Não Aparece no PDF

**Sintoma**:
```javascript
{id: undefined, nome: 'F.E.L COMERCIO...', documento: undefined}
```

**Causa**: `handleExportarPDF` só buscava dados completos se não tivesse itens

**Solução**: SEMPRE buscar dados completos via API

---

### 9.3. Parcelas Não Aparecem ao Editar

**Sintoma**: Form mostra "À Vista" mesmo com 5 parcelas no banco

**Causa**: `useEffect` não inicializava estados de parcelas

**Solução**: Adicionar lógica de inicialização de parcelas no `useEffect`

---

### 9.4. Condição de Pagamento Não Salva

**Sintoma**: Campo `condicao_pagamento_id` sempre NULL no banco

**Causa**: Campo não estava no INSERT nem no UPDATE da API

**Solução**: Adicionar `condicao_pagamento_id` no POST e PUT

---

## 10. Checklist de Testes

### ✅ Criação de Venda
- [ ] Criar venda à vista (1 parcela)
- [ ] Criar venda parcelada (múltiplas parcelas)
- [ ] Criar venda com condição de pagamento (15/30/45)
- [ ] Verificar se `condicao_pagamento_id` foi salvo no banco
- [ ] Verificar se parcelas foram criadas corretamente

### ✅ Edição de Venda
- [ ] Editar venda à vista
- [ ] Editar venda parcelada
- [ ] Verificar se parcelas carregam no formulário
- [ ] Verificar se condição de pagamento carrega
- [ ] Salvar alterações e verificar no banco

### ✅ Geração de PDF
- [ ] Exportar PDF de venda à vista (deve mostrar 1 parcela)
- [ ] Exportar PDF de venda parcelada (deve mostrar todas as parcelas)
- [ ] Verificar se CNPJ/CPF aparece corretamente
- [ ] Verificar se endereço completo aparece
- [ ] Verificar se condição de pagamento aparece no cabeçalho
- [ ] Verificar tabela de parcelas (parcela, vencimento, valor)

---

## 11. Melhorias Futuras

### Sugestões de Melhorias
1. **Validação de Parcelas**: Garantir que soma das parcelas = valor total
2. **Edição de Parcelas**: Permitir editar parcelas individualmente
3. **Status de Parcelas**: Marcar parcelas como pagas/atrasadas
4. **Notificações**: Alertas para parcelas próximas do vencimento
5. **Relatórios**: Dashboard de parcelas a receber

---

## 12. Referências de Código

### Arquivos Modificados
1. `lib/pdf-generator.ts` - Tabela de parcelas no PDF
2. `pages/vendas.tsx` - Sempre buscar dados completos
3. `pages/api/vendas/[id].ts` - Queries separadas para cliente e parcelas
4. `pages/api/vendas.ts` - Salvar `condicao_pagamento_id` (POST e PUT)
5. `components/forms/VendaForm.tsx` - Carregar parcelas ao editar
6. `services/api.ts` - Logs de debug

### Migrations Relacionadas
- `011_condicoes_pagamento.sql` - Adiciona `condicao_pagamento_id` à tabela vendas
- `012_venda_parcelas.sql` - Cria tabela `venda_parcelas`

---

## 13. Notas Importantes

### RLS (Row Level Security)
- Queries complexas podem falhar com RLS ativo
- Preferir queries separadas para relacionamentos complexos
- Parcelas são opcionais (não devem bloquear retorno da venda)

### Compatibilidade
- Vendas antigas sem parcelas ainda funcionam
- Vendas à vista são tratadas como 1 parcela no PDF
- Campo `condicao_pagamento_id` é NULL para vendas sem condição

### Performance
- SEMPRE buscar dados completos evita inconsistências
- Queries separadas são mais rápidas que queries aninhadas
- Índices nas FKs (venda_id, cliente_id, etc) melhoram performance

---

**Última Atualização**: 2025-01-28
**Versão**: 1.0
**Autor**: Sistema MeguisPet - Claude Code
