# Resumo Completo - Correção do Cálculo de ST

## O que foi corrigido

### Problema Original
O sistema estava usando o MVA (Margem de Valor Agregado) como se fosse a própria alíquota de ST, quando na verdade o MVA é apenas a **base de cálculo** para o ST.

**Cálculo ANTIGO (INCORRETO)**:
```
ST = Valor Líquido × MVA%
```

**Cálculo NOVO (CORRETO)**:
```
1. Base ST = Valor Líquido × (1 + MVA/100)
2. ICMS ST = Base ST × 18% (alíquota interna)
3. ICMS Próprio = Valor Líquido × 4% (ICMS Próprio do produto)
4. ST Final = ICMS ST - ICMS Próprio
5. IPI = Valor Líquido × IPI%
6. Valor Final = Valor Líquido + ST Final + IPI
```

### Exemplo Validado
```
Entrada:
- Valor Líquido: R$ 2.500,00
- MVA: 83,63%
- IPI: 10%
- ICMS Próprio: 4%

Cálculo:
1. Base ST = 2.500 × 1,8363 = R$ 4.590,75
2. ICMS ST = 4.590,75 × 18% = R$ 826,33
3. ICMS Próprio = 2.500 × 4% = R$ 100,00
4. ST Final = 826,33 - 100 = R$ 726,33
5. IPI = 2.500 × 10% = R$ 250,00
6. Valor Final = 2.500 + 726,33 + 250 = R$ 3.476,33 ✅
```

## Arquivos Modificados

### 1. Database Migrations

#### `012_add_icms_proprio_field.sql`
- Adiciona campo `icms_proprio` na tabela `produtos`
- Valor padrão: 4%
- **STATUS**: Precisa ser aplicada no Supabase

#### `013_add_st_detailed_fields.sql`
- Adiciona 6 campos detalhados na tabela `vendas_itens`:
  - `icms_proprio_aliquota`
  - `icms_proprio_valor`
  - `base_calculo_st`
  - `icms_st_aliquota`
  - `icms_st_valor`
  - `mva_aplicado`
- **STATUS**: Precisa ser aplicada no Supabase

#### `012_UPDATE_PRODUTOS.sql`
- Atualiza produtos existentes para ter `icms_proprio = 4%`
- **STATUS**: Executar após aplicar migration 012

### 2. Tipos TypeScript

#### `types/index.ts`
- **Produto**: Adicionado campo `icms_proprio`
- **ItemVenda**: Adicionados campos detalhados de ST
- Comentários atualizados para indicar que `st` é MVA

### 3. Processador de Impostos

#### `lib/venda-impostos-processor.ts`
- Função `calcularItemComImpostos` totalmente reescrita
- Implementa fórmula correta de ST
- Só calcula ST se MVA > 0
- Retorna todos os campos detalhados
- Logs de debug em modo desenvolvimento

### 4. API de Vendas

#### `pages/api/vendas.ts`
**GET**:
- Adicionado `icms_proprio` no select de produtos
- Adicionados campos detalhados de ST no select de itens

**POST** (criação):
- Corrigido mapeamento dos campos detalhados de ST
- Agora salva os valores calculados pelo processador

**PUT** (edição):
- Mesmas correções do POST
- Recalcula ST ao editar venda

#### `pages/api/vendas/[id].ts`
**GET by ID**:
- Adicionado `icms_proprio` no select de produtos
- Adicionados campos detalhados de ST

### 5. Testes

#### `lib/__tests__/st-calculation.test.ts`
- Teste do exemplo fornecido (R$ 2.500) ✅
- Teste de produto sem ST (MVA = 0) ✅
- Teste com diferentes MVAs ✅

## Como Aplicar as Correções

### Passo 1: Aplicar Migrations no Supabase

**Via Supabase Dashboard** (Recomendado):
1. Acesse https://app.supabase.com
2. Navegue até seu projeto
3. Clique em "SQL Editor"
4. Execute em ordem:

```sql
-- Migration 012: Adicionar campo icms_proprio
ALTER TABLE produtos
ADD COLUMN IF NOT EXISTS icms_proprio DECIMAL(5,2) DEFAULT 4.00
CHECK (icms_proprio >= 0 AND icms_proprio <= 100);

COMMENT ON COLUMN produtos.icms_proprio IS 'Alíquota de ICMS Próprio em % (0-100). Usado no cálculo de ST. Padrão: 4%';

-- Atualizar produtos existentes
UPDATE produtos
SET icms_proprio = 4.00
WHERE icms_proprio IS NULL OR icms_proprio = 0;
```

```sql
-- Migration 013: Adicionar campos detalhados de ST em vendas_itens
-- (Copiar conteúdo completo de 013_add_st_detailed_fields.sql)
```

### Passo 2: Reiniciar o Servidor de Desenvolvimento

```bash
# Parar o servidor atual (Ctrl+C)
# Iniciar novamente
pnpm dev
```

### Passo 3: Verificar no Console do Browser

Ao criar uma venda, você verá logs no console do browser (modo development) mostrando:
```
📊 Cálculo ST do Produto X:
  valorLiquido: "2500.00"
  mva: "83.63%"
  baseST: "4590.75"
  aliquotaSTInterna: "18%"
  icmsST: "826.33"
  icmsProprioAliquota: "4%"
  icmsProprio: "100.00"
  stFinal: "726.33"
```

### Passo 4: Testar Criação de Venda

1. Abra o modal de nova venda
2. Adicione um produto com:
   - MVA (ST): 83,63%
   - IPI: 10%
   - ICMS Próprio: 4% (padrão)
3. Valor unitário: R$ 2.500,00
4. Quantidade: 1
5. Salve a venda

**Resultado esperado**:
- ST calculado: R$ 726,33
- IPI: R$ 250,00
- Total: R$ 3.476,33

## Verificações no Banco de Dados

Após aplicar as migrations, verifique:

```sql
-- Verificar campo icms_proprio em produtos
SELECT
  id,
  nome,
  ipi,
  icms,
  icms_proprio,
  st
FROM produtos
LIMIT 5;

-- Verificar campos detalhados em vendas_itens (após criar uma venda)
SELECT
  vi.id,
  vi.produto_id,
  vi.subtotal_liquido,
  vi.icms_proprio_aliquota,
  vi.icms_proprio_valor,
  vi.base_calculo_st,
  vi.icms_st_aliquota,
  vi.icms_st_valor,
  vi.mva_aplicado,
  vi.st_valor,
  vi.total_item
FROM vendas_itens vi
ORDER BY vi.id DESC
LIMIT 1;
```

## Impacto em Vendas Existentes

- ❌ Vendas antigas **NÃO serão recalculadas automaticamente**
- ✅ Apenas vendas novas usarão o cálculo correto
- ⚠️ Se precisar recalcular vendas antigas, criar migration separada

## Próximos Passos Opcionais

### 1. Buscar da Tabela MVA
Futuramente, buscar `aliquota_interna` da tabela `tabela_mva` baseado em UF + NCM do produto.

### 2. Campos Editáveis em Produtos
Permitir edição de todos os campos de impostos:
- IPI
- ICMS
- ICMS Próprio
- MVA (ST)

### 3. Colunas Visíveis na Tabela
Adicionar opção de mostrar/ocultar colunas detalhadas de ST na tabela de vendas.

## Arquivos de Documentação

- `APPLY_ST_CORRECTIONS.md`: Instruções detalhadas
- `ST_CORRECTION_SUMMARY.md`: Este arquivo
- `lib/__tests__/st-calculation.test.ts`: Testes de validação

## Suporte

Em caso de problemas:
1. Verificar logs do console (modo desenvolvimento)
2. Verificar se migrations foram aplicadas
3. Verificar se produtos têm `icms_proprio` configurado
4. Testar com o arquivo de teste: `npx ts-node lib/__tests__/st-calculation.test.ts`
