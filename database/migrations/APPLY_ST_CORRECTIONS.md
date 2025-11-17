# Correção do Cálculo de ST (Substituição Tributária)

## Resumo das Mudanças

O sistema estava usando o MVA (Margem de Valor Agregado) como se fosse a própria alíquota de ST, quando na verdade o MVA é apenas a base de cálculo para o ST.

### Fórmula Anterior (INCORRETA)
```
ST = Valor Líquido × MVA%
```

### Fórmula Nova (CORRETA)
```
1. Base ST = Valor Líquido × (1 + MVA/100)
2. ICMS ST = Base ST × Alíquota Interna (18%)
3. ICMS Próprio = Valor Líquido × ICMS Próprio % (padrão 4%)
4. ST Final = ICMS ST - ICMS Próprio
5. IPI = Valor Líquido × IPI %
6. Valor Final = Valor Líquido + ST Final + IPI
```

### Exemplo Prático
```
Valor Líquido: R$ 2.500,00
MVA: 83,63%
IPI: 10%
ICMS Próprio: 4%
Alíquota ST (interna): 18%

Cálculo:
1. Base ST = 2.500 × (1 + 0,8363) = 2.500 × 1,8363 = R$ 4.590,75
2. ICMS ST = 4.590,75 × 18% = R$ 826,33
3. ICMS Próprio = 2.500 × 4% = R$ 100,00
4. ST Final = 826,33 - 100,00 = R$ 726,33
5. IPI = 2.500 × 10% = R$ 250,00
6. Valor Final = 2.500 + 726,33 + 250 = R$ 3.476,33
```

## Migrations a Aplicar

Execute as migrations na ordem:

### 1. Adicionar campo `icms_proprio` na tabela `produtos`
```bash
# Arquivo: 012_add_icms_proprio_field.sql
```

Esta migration adiciona o campo `icms_proprio` na tabela `produtos` com valor padrão de 4%.

### 2. Adicionar campos detalhados de ST em `vendas_itens`
```bash
# Arquivo: 013_add_st_detailed_fields.sql
```

Esta migration adiciona os seguintes campos em `vendas_itens`:
- `icms_proprio_aliquota` - Alíquota de ICMS Próprio (ex: 4%)
- `icms_proprio_valor` - Valor do ICMS Próprio calculado
- `base_calculo_st` - Base de cálculo ST = Valor Líquido × (1 + MVA)
- `icms_st_aliquota` - Alíquota de ICMS-ST (ex: 18%)
- `icms_st_valor` - Valor total do ICMS-ST
- `mva_aplicado` - MVA aplicado no cálculo

## Como Aplicar no Supabase

### Opção 1: Via Supabase Dashboard (Recomendado)
1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Navegue para o seu projeto
3. Clique em "SQL Editor" no menu lateral
4. Copie e cole o conteúdo de `012_add_icms_proprio_field.sql`
5. Execute a query (clique em "Run")
6. Repita os passos 4-5 para `013_add_st_detailed_fields.sql`

### Opção 2: Via Supabase CLI
```bash
# Executar migration 012
supabase db push --file database/migrations/012_add_icms_proprio_field.sql

# Executar migration 013
supabase db push --file database/migrations/013_add_st_detailed_fields.sql
```

## Alterações no Código

### 1. Tipos TypeScript (`types/index.ts`)
- Adicionado `icms_proprio` no tipo `Produto`
- Adicionados campos detalhados de ST no tipo `ItemVenda`
- Comentários atualizados para refletir que `st` é MVA

### 2. Processador de Impostos (`lib/venda-impostos-processor.ts`)
- Função `calcularItemComImpostos` atualizada com a fórmula correta
- Adicionados logs de debug para rastreamento do cálculo
- Campos detalhados de ST são calculados e retornados

### 3. Interface de Vendas
Os novos campos estarão disponíveis nos itens de venda:
- Podem ser exibidos nas colunas da tabela (inicialmente ocultos)
- São salvos automaticamente ao criar/editar vendas
- Estão disponíveis para relatórios e exportações

## Impacto em Vendas Existentes

As vendas já existentes:
- **NÃO serão recalculadas automaticamente**
- Manterão os valores antigos (incorretos)
- Apenas vendas novas usarão o cálculo correto

Se desejar recalcular vendas antigas, será necessário criar uma migration adicional.

## Próximos Passos Opcionais

### Integração com tabela_mva
Futuramente, o sistema pode buscar:
- `aliquota_interna` da tabela `tabela_mva` baseado em UF + NCM
- `mva` da tabela `tabela_mva` ao invés de usar campo do produto
- Validação se o produto está sujeito a ST

### Campos Editáveis em Produtos
Todos os campos de impostos devem ser editáveis em produtos:
- `ipi` - Alíquota de IPI
- `icms` - Alíquota de ICMS (informativo)
- `icms_proprio` - Alíquota de ICMS Próprio (para ST)
- `st` - MVA (Margem de Valor Agregado)

## Verificação

Após aplicar as migrations, verifique:

```sql
-- Verificar se o campo icms_proprio foi adicionado em produtos
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'produtos' AND column_name = 'icms_proprio';

-- Verificar se os campos detalhados foram adicionados em vendas_itens
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'vendas_itens'
AND column_name IN (
  'icms_proprio_aliquota',
  'icms_proprio_valor',
  'base_calculo_st',
  'icms_st_aliquota',
  'icms_st_valor',
  'mva_aplicado'
);
```

## Suporte

Em caso de dúvidas ou problemas:
1. Verifique os logs do console (modo desenvolvimento)
2. Revise os comentários nos arquivos de migration
3. Consulte a documentação em `CLAUDE.md`
