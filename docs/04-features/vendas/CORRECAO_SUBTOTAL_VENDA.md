# 🔧 Correção: Erro de Subtotal NULL em Vendas

## 📅 Data: 2025-10-22

---

## 🐛 Problema Identificado

Ao tentar criar uma venda, aparecia o erro:

```
Erro ao inserir itens da venda: null value in column "subtotal"
of relation "vendas_itens" violates not-null constraint
```

**Tradução:** O banco de dados não aceitou inserir o item da venda porque o campo `subtotal` estava NULL, mas ele é obrigatório (NOT NULL).

---

## 🔍 Causa Raiz

### Schema do Banco de Dados

```sql
-- database/supabase_schema.sql:153-163
CREATE TABLE IF NOT EXISTS vendas_itens (
    id BIGSERIAL PRIMARY KEY,
    venda_id BIGINT NOT NULL,
    produto_id BIGINT NOT NULL,
    quantidade INT NOT NULL,
    preco_unitario NUMERIC(10,2) NOT NULL,
    subtotal NUMERIC(10,2) NOT NULL,  -- ← Campo obrigatório!
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_vendas_itens_venda FOREIGN KEY (venda_id) REFERENCES vendas(id) ON DELETE CASCADE,
    CONSTRAINT fk_vendas_itens_produto FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE RESTRICT
);
```

### Código com Problema

**Arquivo:** `components/forms/VendaForm.tsx`

```typescript
// ❌ ANTES (ERRADO) - Não enviava subtotal
itens: itens.map(item => ({
  produto_id: item.produto_id,
  quantidade: item.quantidade,
  preco_unitario: item.preco_unitario
  // ❌ Faltava o subtotal!
}))
```

O formulário enviava apenas 3 campos:
- `produto_id` ✅
- `quantidade` ✅
- `preco_unitario` ✅
- `subtotal` ❌ **FALTANDO!**

Como o banco exige `subtotal NOT NULL`, dava erro ao tentar inserir.

---

## ✅ Solução Implementada

### 1. Adicionar Cálculo do Subtotal no Payload

**Arquivo:** `components/forms/VendaForm.tsx:308-313`

```typescript
// ✅ DEPOIS (CORRETO) - Calcula e envia subtotal
itens: itens.map(item => ({
  produto_id: item.produto_id,
  quantidade: item.quantidade,
  preco_unitario: item.preco_unitario,
  subtotal: item.quantidade * item.preco_unitario  // ✅ Adicionado!
}))
```

**Cálculo:**
```
subtotal = quantidade × preco_unitario

Exemplo:
- Quantidade: 5
- Preço Unitário: R$ 10,00
- Subtotal: 5 × 10,00 = R$ 50,00
```

---

### 2. Atualizar Interface TypeScript

**Arquivo:** `types/index.ts:273-278`

```typescript
// ✅ ANTES
export interface VendaItemInput {
  produto_id: number
  quantidade: number
  preco_unitario: number
  // ❌ Faltava subtotal
}

// ✅ DEPOIS
export interface VendaItemInput {
  produto_id: number
  quantidade: number
  preco_unitario: number
  subtotal: number  // ✅ Adicionado!
}
```

Isso garante que o TypeScript force o envio do `subtotal` em todos os lugares que usam `VendaItemInput`.

---

## 🔄 Fluxo Correto Agora

### Adicionar Item à Venda

```
1. Usuário seleciona produto: "Ração Premium"
   ↓
2. Define quantidade: 5
   ↓
3. Sistema busca preço: R$ 50,00
   ↓
4. Sistema calcula subtotal:
   5 × 50,00 = R$ 250,00
   ↓
5. Item adicionado à lista com:
   - produto_id: 123
   - quantidade: 5
   - preco_unitario: 50.00
   - subtotal: 250.00  ✅
```

### Salvar Venda

```
1. Usuário clica em "Salvar Venda"
   ↓
2. Frontend monta payload com TODOS os campos:
   {
     numero_venda: "20251022-0001",
     cliente_id: 1,
     estoque_id: 1,
     itens: [
       {
         produto_id: 123,
         quantidade: 5,
         preco_unitario: 50.00,
         subtotal: 250.00  ✅
       }
     ]
   }
   ↓
3. API recebe e insere no banco:
   INSERT INTO vendas_itens (
     venda_id,
     produto_id,
     quantidade,
     preco_unitario,
     subtotal  ✅
   ) VALUES (...)
   ↓
4. ✅ Sucesso! Nenhum erro de NULL constraint
```

---

## 📊 Comparação: Antes vs Depois

### Payload Enviado

#### ❌ Antes (Errado)
```json
{
  "itens": [
    {
      "produto_id": 123,
      "quantidade": 5,
      "preco_unitario": 50.00
      // ❌ Faltava "subtotal"
    }
  ]
}
```

**Resultado:** Erro ao inserir no banco

#### ✅ Depois (Correto)
```json
{
  "itens": [
    {
      "produto_id": 123,
      "quantidade": 5,
      "preco_unitario": 50.00,
      "subtotal": 250.00  // ✅ Adicionado
    }
  ]
}
```

**Resultado:** Inserção bem-sucedida!

---

## 🧪 Como Testar

### Teste 1: Criar Venda com 1 Item

1. Acesse "Vendas" → "Nova Venda"
2. Preencha:
   - Número: (gerado automaticamente)
   - Cliente: Qualquer
   - Estoque: Selecione um
3. Adicione item:
   - Produto: Selecione um
   - Quantidade: 2
   - Preço: R$ 25,00
4. Clique em "Salvar Venda"
5. ✅ **Deve criar com sucesso**
6. ✅ **Não deve mostrar erro de NULL constraint**

### Teste 2: Criar Venda com Múltiplos Itens

1. Nova Venda
2. Adicione 3 produtos diferentes
3. Salve
4. ✅ **Todos os itens devem ser salvos com subtotal**

### Teste 3: Verificar no Banco

```sql
-- Buscar itens da venda
SELECT
  produto_id,
  quantidade,
  preco_unitario,
  subtotal
FROM vendas_itens
WHERE venda_id = 1;
```

**Resultado esperado:**
```
produto_id | quantidade | preco_unitario | subtotal
-----------|------------|----------------|----------
123        | 5          | 50.00          | 250.00   ✅
456        | 2          | 30.00          | 60.00    ✅
```

**IMPORTANTE:** Coluna `subtotal` **NUNCA** deve estar NULL!

---

## 🎯 Por Que o Subtotal é Obrigatório?

### 1. **Integridade dos Dados**
- Garante que todos os itens tenham valor calculado
- Evita cálculos inconsistentes depois

### 2. **Performance**
- Subtotal pré-calculado = consultas mais rápidas
- Não precisa calcular `quantidade × preco_unitario` em toda consulta

### 3. **Auditoria**
- Registro exato do valor no momento da venda
- Mesmo que o preço do produto mude depois, o histórico permanece correto

### 4. **Relatórios**
- Fácil somar `subtotal` para ter total da venda
- Relatórios fiscais precisam desse valor

---

## 📝 Cálculos Relacionados

### Cálculo do Subtotal (Por Item)
```
subtotal = quantidade × preco_unitario
```

### Cálculo do Total da Venda
```
valor_total = Σ(subtotal de todos os itens)
```

### Cálculo do Valor Final (Com Desconto)
```
valor_final = valor_total - desconto
```

### Exemplo Completo
```
Itens:
1. Ração 10kg × 2 unidades = R$ 100,00 (subtotal)
2. Shampoo × 3 unidades = R$ 45,00 (subtotal)

Valor Total: R$ 100,00 + R$ 45,00 = R$ 145,00
Desconto: R$ 5,00
Valor Final: R$ 145,00 - R$ 5,00 = R$ 140,00
```

---

## 🔒 Validação Adicional (Futuro)

Para garantir ainda mais a integridade, pode adicionar validação no backend:

```typescript
// pages/api/vendas.ts
for (const item of itens as VendaItemInput[]) {
  // Validar que subtotal bate com o cálculo
  const subtotalCalculado = item.quantidade * item.preco_unitario

  if (Math.abs(item.subtotal - subtotalCalculado) > 0.01) {
    return res.status(400).json({
      success: false,
      message: `❌ Subtotal inválido para produto ${item.produto_id}.
                Esperado: ${subtotalCalculado}, Recebido: ${item.subtotal}`
    })
  }
}
```

Isso evita que alguém envie um subtotal errado propositalmente.

---

## 📁 Arquivos Modificados

```
✅ types/index.ts                      → Adicionado subtotal em VendaItemInput
✅ components/forms/VendaForm.tsx      → Cálculo do subtotal no payload
```

---

## ✅ Resultado Final

Agora ao criar uma venda:
1. ✅ **Subtotal é calculado automaticamente** (quantidade × preço)
2. ✅ **Subtotal é enviado no payload** (não fica NULL)
3. ✅ **Banco aceita a inserção** (constraint NOT NULL satisfeita)
4. ✅ **Venda é criada com sucesso** (sem erros)

---

## 🎉 Resumo da Correção

| Aspecto | ❌ Antes | ✅ Depois |
|---------|----------|-----------|
| Subtotal enviado | Não | Sim |
| Erro de NULL | Sim | Não |
| Cálculo automático | Não | Sim (qtd × preço) |
| TypeScript valida | Não | Sim |
| Venda criada | Erro | Sucesso |

---

**Desenvolvido com ❤️ para MeguisPet**
