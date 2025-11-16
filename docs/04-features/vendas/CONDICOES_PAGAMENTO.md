# Sistema de Condições de Pagamento

## Descrição

O sistema de condições de pagamento permite que o cliente configure opções de parcelamento pré-definidas que podem ser selecionadas rapidamente durante o processo de venda. Por exemplo, você pode criar condições como "15/30/45 dias" ou "30/60/90 dias".

## Acesso

As condições de pagamento estão integradas na **página de Vendas** (`/vendas`) como uma aba. 

Para acessar:
1. Navegue para `/vendas`
2. Clique na aba **"Condições de Pagamento"**

## Funcionalidades

### 1. Gerenciamento de Condições de Pagamento

Na aba **Condições de Pagamento** você pode:

- ✅ Visualizar todas as condições em uma tabela customizável
- ✅ Criar novas condições de pagamento
- ✅ Editar condições existentes
- ✅ Ativar/Desativar condições
- ✅ Excluir condições (desde que não estejam em uso)
- ✅ Ordenar por colunas
- ✅ Visualização responsiva (mobile e desktop)

### 2. Criação de Condições

Para criar uma nova condição:

1. Na aba **Condições de Pagamento**, clique em **"Nova Condição"**
2. Preencha o formulário:
   - **Nome**: Nome descritivo (ex: "15/30/45 dias")
   - **Descrição** (opcional): Descrição adicional (ex: "Parcelado em 3x sem juros")
   - **Dias de Pagamento**: Informe os dias separados por vírgula (ex: `15, 30, 45`)
     - Use `0` para pagamento à vista
     - Os dias serão automaticamente ordenados
   - **Ordem**: Define a ordem de exibição na lista
   - **Ativo**: Marca se a condição está disponível para uso
3. Clique em **"Salvar Condição"**

**Exemplo de configurações:**
- À Vista: `0`
- 15 dias: `15`
- 30/60 dias: `30, 60`
- 15/30/45 dias: `15, 30, 45`
- 30/60/90 dias: `30, 60, 90`

### 3. Uso nas Vendas

No formulário de **Nova Venda** (aba "Vendas"):

1. Adicione produtos ao carrinho
2. Localize o campo **"Condição de Pagamento"** (logo acima do parcelamento manual)
3. Selecione uma condição da lista
4. (Opcional) Ajuste a **Data Base para Cálculo** (padrão: hoje)
5. As parcelas serão geradas automaticamente com base na condição selecionada

**Comportamento:**
- Quando uma condição é selecionada, o sistema automaticamente:
  - Calcula as datas de vencimento baseado na data base
  - Divide o valor total igualmente entre as parcelas
  - Preenche a tabela de parcelas
  - Ajusta a última parcela para compensar diferenças de arredondamento

### 4. Data Base para Cálculo

A **Data Base** define a partir de qual data as parcelas serão calculadas:

- **Padrão**: Data atual (hoje)
- **Personalizável**: O usuário pode escolher outra data de referência

**Exemplo:**
- Condição: `15, 30, 45` dias
- Data Base: 2025-01-10
- Resultado:
  - Parcela 1: 2025-01-25 (10 + 15 dias)
  - Parcela 2: 2025-02-09 (10 + 30 dias)
  - Parcela 3: 2025-02-24 (10 + 45 dias)

## Estrutura do Banco de Dados

### Tabela: `condicoes_pagamento`

```sql
CREATE TABLE condicoes_pagamento (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    descricao TEXT,
    dias_parcelas JSONB NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT true,
    ordem INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

### Relação com Vendas

```sql
ALTER TABLE vendas 
ADD COLUMN condicao_pagamento_id BIGINT NULL 
REFERENCES condicoes_pagamento(id) ON DELETE SET NULL;
```

## API Endpoints

### GET `/api/condicoes_pagamento`
Retorna todas as condições de pagamento.

**Query Parameters:**
- `active`: Filtrar apenas condições ativas (`active=1` ou `active=true`)
- `id`: Buscar uma condição específica

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "nome": "15/30/45 dias",
      "descricao": "Parcelado em 3x",
      "dias_parcelas": [15, 30, 45],
      "ativo": true,
      "ordem": 1,
      "created_at": "2025-11-16T...",
      "updated_at": "2025-11-16T..."
    }
  ]
}
```

### POST `/api/condicoes_pagamento`
Cria uma nova condição de pagamento.

**Body:**
```json
{
  "nome": "15/30/45 dias",
  "descricao": "Parcelado em 3x sem juros",
  "dias_parcelas": [15, 30, 45],
  "ativo": true,
  "ordem": 1
}
```

### PUT `/api/condicoes_pagamento`
Atualiza uma condição existente.

**Body:**
```json
{
  "id": 1,
  "nome": "15/30/45 dias",
  "descricao": "Parcelado em 3x sem juros",
  "dias_parcelas": [15, 30, 45],
  "ativo": true,
  "ordem": 1
}
```

### DELETE `/api/condicoes_pagamento?id={id}`
Remove uma condição de pagamento (se não estiver em uso).

## Integração com o Sistema

### Frontend

**Página de Gerenciamento:**
- `/pages/condicoes-pagamento.tsx`

**Componente de Formulário:**
- `/components/forms/VendaForm.tsx`

### Backend

**API:**
- `/pages/api/condicoes_pagamento.ts`

**Serviço:**
```typescript
import { condicoesPagamentoService } from '@/services/api'

// Buscar todas as condições ativas
const { data } = await condicoesPagamentoService.getAll(true)

// Criar nova condição
await condicoesPagamentoService.create({
  nome: "30/60 dias",
  dias_parcelas: [30, 60]
})
```

### Types

```typescript
interface CondicaoPagamento {
  id: number
  nome: string
  descricao?: string
  dias_parcelas: number[]
  ativo: boolean
  ordem: number
  created_at: string
  updated_at: string
}
```

## Migrações

Para aplicar a migração do banco de dados, execute:

```sql
-- Arquivo: database/migrations/011_condicoes_pagamento.sql
\i database/migrations/011_condicoes_pagamento.sql
```

Isso criará:
- Tabela `condicoes_pagamento`
- Coluna `condicao_pagamento_id` na tabela `vendas`
- Índices para otimização
- Dados iniciais (condições padrão)

## Exemplos de Uso

### Criar Condição "30/60/90 dias"

1. Acesse `/condicoes-pagamento`
2. Clique em "Nova Condição"
3. Preencha:
   - Nome: `30/60/90 dias`
   - Descrição: `Parcelado em 3 meses`
   - Dias: `30, 60, 90`
4. Salve

### Usar Condição em Venda

1. No formulário de venda, adicione os produtos
2. Selecione "30/60/90 dias" em **Condição de Pagamento**
3. Veja as parcelas sendo geradas automaticamente:
   - Parcela 1: Hoje + 30 dias
   - Parcela 2: Hoje + 60 dias
   - Parcela 3: Hoje + 90 dias

### Alterar Data Base

1. Selecione a condição de pagamento
2. Altere a **Data Base para Cálculo** para a data desejada
3. As parcelas serão recalculadas automaticamente

## Notas Importantes

- ⚠️ Condições em uso não podem ser excluídas (apenas desativadas)
- ✅ Condições desativadas não aparecem no formulário de vendas
- ✅ O sistema divide o valor total igualmente entre as parcelas
- ✅ A última parcela é ajustada para compensar diferenças de arredondamento
- ✅ A data base padrão é sempre "hoje", mas pode ser customizada
- ✅ Condições são ordenadas por `ordem` e depois por `nome`

## Testes

### Testar CRUD de Condições

```typescript
// 1. Criar
const response = await condicoesPagamentoService.create({
  nome: "Teste 15/45 dias",
  dias_parcelas: [15, 45],
  ativo: true
})

// 2. Listar
const { data } = await condicoesPagamentoService.getAll()

// 3. Atualizar
await condicoesPagamentoService.update(response.data.id, {
  dias_parcelas: [15, 30, 45]
})

// 4. Excluir
await condicoesPagamentoService.delete(response.data.id)
```

### Testar Geração de Parcelas

1. Crie uma venda com valor total de R$ 300,00
2. Selecione condição "15/30/45 dias"
3. Verifique que foram geradas 3 parcelas de R$ 100,00 cada
4. Verifique as datas de vencimento

## Troubleshooting

### Problema: Condições não aparecem no formulário

**Solução:** Verifique se as condições estão marcadas como ativas.

### Problema: Erro ao excluir condição

**Solução:** A condição pode estar em uso por alguma venda. Desative-a em vez de excluir.

### Problema: Parcelas não são geradas automaticamente

**Solução:** Certifique-se de que:
1. Uma condição foi selecionada
2. Há itens na venda com valores válidos
3. A data base está preenchida (deve ser hoje por padrão)

## Suporte

Para questões ou problemas relacionados ao sistema de condições de pagamento, consulte a documentação técnica ou entre em contato com a equipe de desenvolvimento.
