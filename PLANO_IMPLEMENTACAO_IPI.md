# Plano de Implementação - Sistema de Impostos nas Vendas (IPI, ICMS, ST)

## Visão Geral

Implementar cálculo completo de impostos (IPI, ICMS e ST) por produto nas vendas, com desconto total distribuído proporcionalmente entre os produtos e interface responsiva com colunas configuráveis.

## ⚠️ REGRA IMPORTANTE - ICMS

**O ICMS é calculado e exibido apenas como INFORMAÇÃO para o cliente.**

- ✅ **INCLUÍDOS no total da venda**: IPI e ST
- ❌ **NÃO incluído no total**: ICMS (informativo, pode ser creditado pelo cliente)

**Fórmula do Total:**
```
Total da Venda = Subtotal Líquido + IPI + ST
```

**ICMS aparece separado** em uma seção informativa destacada na interface.

## Regras de Negócio

### Hierarquia de Cálculo

1. **Subtotal bruto do produto** = Preço unitário × Quantidade
2. **Total bruto da venda** = Soma de todos os subtotais brutos
3. **Proporção do produto** = Subtotal bruto do produto ÷ Total bruto da venda
4. **Desconto proporcional do produto** = Desconto total da venda × Proporção do produto
5. **Subtotal líquido do produto** = Subtotal bruto - Desconto proporcional
6. **IPI do produto** = Subtotal líquido × (Alíquota IPI ÷ 100)
7. **ICMS do produto (informativo)** = Subtotal líquido × (Alíquota ICMS ÷ 100) ⚠️ **NÃO entra no total**
8. **ST do produto** = Subtotal líquido × (Alíquota ST ÷ 100)
9. **Total do produto** = Subtotal líquido + IPI + ST *(ICMS não entra)*

### Totais Gerais da Venda
- **Total Produtos (bruto)** = Soma dos subtotais brutos
- **Desconto Total** = Valor informado pelo usuário
- **Total Produtos (líquido)** = Total bruto - Desconto total
- **Total IPI** = Soma dos IPIs de todos os produtos
- **Total ICMS (informativo)** = Soma dos ICMS de todos os produtos ⚠️ **NÃO entra no total**
- **Total ST** = Soma dos STs de todos os produtos
- **Total Geral** = Total produtos líquido + Total IPI + Total ST *(ICMS não incluído)*

### ⚠️ IMPORTANTE: ICMS é Informativo
O ICMS é calculado e exibido para informação do cliente (pode ser creditado), mas **NÃO** é somado no total da venda. Apenas IPI e ST entram no valor final.

### Exemplo de Cálculo com Desconto Proporcional

**Cenário:**
- Desconto total da venda: R$ 100,00

**Produto A:**
- Preço unitário: R$ 200,00
- Quantidade: 1
- Subtotal bruto: R$ 200,00
- Proporção: 200 ÷ 1.000 = 20%
- Desconto proporcional: R$ 100,00 × 20% = R$ 20,00
- Subtotal líquido: R$ 200,00 - R$ 20,00 = R$ 180,00
- IPI (10%): R$ 18,00
- ICMS (18%) *informativo*: R$ 32,40
- ST (5%): R$ 9,00
- **Total do item: R$ 207,00** (180,00 + 18,00 + 9,00) *ICMS não incluído*

**Produto B:**
- Preço unitário: R$ 300,00
- Quantidade: 1
- Subtotal bruto: R$ 300,00
- Proporção: 300 ÷ 1.000 = 30%
- Desconto proporcional: R$ 100,00 × 30% = R$ 30,00
- Subtotal líquido: R$ 300,00 - R$ 30,00 = R$ 270,00
- IPI (8%): R$ 21,60
- ICMS (18%) *informativo*: R$ 48,60
- ST (5%): R$ 13,50
- **Total do item: R$ 305,10** (270,00 + 21,60 + 13,50) *ICMS não incluído*

**Produto C:**
- Preço unitário: R$ 500,00
- Quantidade: 1
- Subtotal bruto: R$ 500,00
- Proporção: 500 ÷ 1.000 = 50%
- Desconto proporcional: R$ 100,00 × 50% = R$ 50,00
- Subtotal líquido: R$ 500,00 - R$ 50,00 = R$ 450,00
- IPI (12%): R$ 54,00
- ICMS (18%) *informativo*: R$ 81,00
- ST (5%): R$ 22,50
- **Total do item: R$ 526,50** (450,00 + 54,00 + 22,50) *ICMS não incluído*

**Resumo da Venda:**
- Total produtos (bruto): R$ 1.000,00
- Desconto total: R$ 100,00
- Total produtos (líquido): R$ 900,00
- Total IPI: R$ 93,60 (18,00 + 21,60 + 54,00)
- Total ICMS (informativo): R$ 162,00 (32,40 + 48,60 + 81,00) ⚠️ *Não incluído no total*
- Total ST: R$ 45,00 (9,00 + 13,50 + 22,50)
- **TOTAL GERAL A PAGAR: R$ 1.038,60** (900,00 + 93,60 + 45,00)
- *ICMS de R$ 162,00 é informativo (pode ser creditado pelo cliente)*

## Etapas de Implementação

### 1. Banco de Dados

#### 1.1. Adicionar campos de impostos na tabela `produtos`
```sql
ALTER TABLE produtos
ADD COLUMN ipi DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Alíquota de IPI em percentual (0-100)',
ADD COLUMN icms DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Alíquota de ICMS em percentual (0-100)',
ADD COLUMN st DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Alíquota de ST em percentual (0-100)';
```

#### 1.2. Adicionar campos de impostos na tabela `venda_itens`
```sql
ALTER TABLE venda_itens
ADD COLUMN subtotal_bruto DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Subtotal antes do desconto (preço × qtd)',
ADD COLUMN desconto_proporcional DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Desconto proporcional do item',
ADD COLUMN subtotal_liquido DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Subtotal após desconto proporcional',
ADD COLUMN ipi_aliquota DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Alíquota de IPI no momento da venda',
ADD COLUMN ipi_valor DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Valor do IPI calculado',
ADD COLUMN icms_aliquota DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Alíquota de ICMS no momento da venda',
ADD COLUMN icms_valor DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Valor do ICMS calculado',
ADD COLUMN st_aliquota DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Alíquota de ST no momento da venda',
ADD COLUMN st_valor DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Valor do ST calculado',
ADD COLUMN total_item DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Total do item (subtotal líquido + impostos)';

-- Remover ou depreciar colunas antigas se existirem
-- ALTER TABLE venda_itens DROP COLUMN desconto IF EXISTS;
-- ALTER TABLE venda_itens DROP COLUMN desconto_tipo IF EXISTS;
```

#### 1.3. Adicionar campos de impostos na tabela `vendas`
```sql
ALTER TABLE vendas
ADD COLUMN total_produtos_bruto DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Total dos produtos sem desconto',
ADD COLUMN desconto_total DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Desconto total da venda',
ADD COLUMN total_produtos_liquido DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Total dos produtos após desconto',
ADD COLUMN total_ipi DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Total de IPI da venda',
ADD COLUMN total_icms DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Total de ICMS da venda',
ADD COLUMN total_st DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Total de ST da venda';

-- Atualizar a coluna total para refletir o total geral com impostos
-- O campo 'total' já existe, apenas será recalculado com os impostos
```

### 2. TypeScript - Tipos e Interfaces

#### 2.1. Atualizar tipo `Produto` em `types/index.ts`
```typescript
export interface Produto {
  id: number
  nome: string
  descricao?: string
  preco_venda: number
  preco_custo: number
  codigo_barras?: string
  categoria_id: number
  categoria?: string
  fornecedor_id?: number
  fornecedor?: string
  estoque_minimo: number
  estoque_atual: number
  ativo: boolean
  ipi: number // NOVO: Alíquota de IPI (0-100)
  icms: number // NOVO: Alíquota de ICMS (0-100)
  st: number // NOVO: Alíquota de ST (0-100)
}
```

#### 2.2. Atualizar tipo `VendaItem` em `types/index.ts`
```typescript
export interface VendaItem {
  id?: number
  venda_id?: number
  produto_id: number
  produto_nome: string
  quantidade: number
  preco_unitario: number
  subtotal_bruto: number // NOVO: Preço × Quantidade
  desconto_proporcional: number // NOVO: Desconto calculado proporcionalmente
  subtotal_liquido: number // NOVO: Subtotal após desconto
  ipi_aliquota: number // NOVO: Alíquota IPI no momento da venda
  ipi_valor: number // NOVO: Valor do IPI calculado
  icms_aliquota: number // NOVO: Alíquota ICMS no momento da venda
  icms_valor: number // NOVO: Valor do ICMS calculado
  st_aliquota: number // NOVO: Alíquota ST no momento da venda
  st_valor: number // NOVO: Valor do ST calculado
  total_item: number // NOVO: Total do item com todos os impostos

  // Campos deprecados (manter por compatibilidade)
  desconto?: number
  desconto_tipo?: 'valor' | 'percentual'
  subtotal?: number
}
```

#### 2.3. Atualizar tipo `Venda` em `types/index.ts`
```typescript
export interface Venda {
  id: number
  cliente_id: number
  cliente_nome?: string
  usuario_id: number
  usuario_nome?: string
  data_venda: string
  status: 'pendente' | 'concluida' | 'cancelada'
  forma_pagamento: string
  parcelas?: number
  observacoes?: string
  total_produtos_bruto: number // NOVO: Total dos produtos sem desconto
  desconto_total: number // NOVO: Desconto total da venda (substituindo 'desconto')
  total_produtos_liquido: number // NOVO: Total dos produtos após desconto
  total_ipi: number // NOVO: Total de IPI da venda
  total_icms: number // NOVO: Total de ICMS da venda
  total_st: number // NOVO: Total de ST da venda
  total: number // Total geral com impostos
  itens?: VendaItem[]

  // Campo deprecado (manter por compatibilidade)
  desconto?: number
}
```

#### 2.4. Criar tipo para configuração de colunas visíveis
```typescript
export interface VendaTabelaColunasVisiveis {
  produto: boolean
  quantidade: boolean
  precoUnitario: boolean
  subtotalBruto: boolean
  descontoProporcional: boolean
  subtotalLiquido: boolean
  ipiAliquota: boolean
  ipiValor: boolean
  icmsAliquota: boolean
  icmsValor: boolean
  stAliquota: boolean
  stValor: boolean
  totalItem: boolean
  acoes: boolean
}

export const COLUNAS_VISIVEIS_DEFAULT: VendaTabelaColunasVisiveis = {
  produto: true,
  quantidade: true,
  precoUnitario: true,
  subtotalBruto: true,
  descontoProporcional: true,
  subtotalLiquido: true,
  ipiAliquota: false, // Oculta por padrão
  ipiValor: true,
  icmsAliquota: false, // Oculta por padrão
  icmsValor: true,
  stAliquota: false, // Oculta por padrão
  stValor: true,
  totalItem: true,
  acoes: true
}
```

### 3. Frontend - Componentes

#### 3.1. Atualizar `ProdutoForm.tsx`

Adicionar três campos numéricos para impostos após o campo de preço de venda:

```typescript
// Seção de Impostos
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  <div>
    <label>IPI (%)</label>
    <input
      type="number"
      min="0"
      max="100"
      step="0.01"
      value={ipi}
      onChange={handleIpiChange}
      placeholder="0.00"
    />
    <span className="text-xs text-gray-500">
      Imposto sobre Produtos Industrializados
    </span>
  </div>

  <div>
    <label>ICMS (%)</label>
    <input
      type="number"
      min="0"
      max="100"
      step="0.01"
      value={icms}
      onChange={handleIcmsChange}
      placeholder="0.00"
    />
    <span className="text-xs text-gray-500">
      Imposto sobre Circulação de Mercadorias
    </span>
  </div>

  <div>
    <label>ST (%)</label>
    <input
      type="number"
      min="0"
      max="100"
      step="0.01"
      value={st}
      onChange={handleStChange}
      placeholder="0.00"
    />
    <span className="text-xs text-gray-500">
      Substituição Tributária
    </span>
  </div>
</div>
```

**Validações:**
- Não permitir valores negativos
- Não permitir valores acima de 100
- Arredondar para 2 casas decimais

#### 3.2. Criar componente `VendaTabelaColunas.tsx`

Componente de configuração de colunas visíveis com dropdown/popover:

```typescript
interface VendaTabelaColunasProps {
  colunasVisiveis: VendaTabelaColunasVisiveis
  onChange: (colunas: VendaTabelaColunasVisiveis) => void
}

export function VendaTabelaColunas({ colunasVisiveis, onChange }: VendaTabelaColunasProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Colunas
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-2">
          <h4 className="font-medium">Colunas Visíveis</h4>
          <div className="space-y-2">
            {Object.entries(LABELS_COLUNAS).map(([key, label]) => (
              <div key={key} className="flex items-center">
                <Checkbox
                  id={key}
                  checked={colunasVisiveis[key as keyof VendaTabelaColunasVisiveis]}
                  onCheckedChange={(checked) => {
                    onChange({
                      ...colunasVisiveis,
                      [key]: checked
                    })
                  }}
                />
                <label htmlFor={key} className="ml-2 text-sm">
                  {label}
                </label>
              </div>
            ))}
          </div>
          <div className="pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onChange(COLUNAS_VISIVEIS_DEFAULT)}
            >
              Restaurar padrão
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
```

#### 3.3. Atualizar `VendaForm.tsx` - Tabela de Produtos

**Estrutura completa da tabela (todas as colunas possíveis):**

| Produto | Qtd | Preço Unit. | Subtotal Bruto | Desc. Prop. | Subtotal Líq. | IPI% | IPI R$ | ICMS% | ICMS R$ | ST% | ST R$ | Total | Ações |
|---------|-----|-------------|----------------|-------------|---------------|------|--------|-------|---------|-----|-------|-------|-------|

**Colunas visíveis por padrão:**
- Produto ✓
- Quantidade ✓
- Preço Unitário ✓
- Subtotal Bruto ✓
- Desconto Proporcional ✓
- Subtotal Líquido ✓
- IPI (%) ✗ (oculto)
- IPI (R$) ✓
- ICMS (%) ✗ (oculto)
- ICMS (R$) ✓
- ST (%) ✗ (oculto)
- ST (R$) ✓
- Total ✓
- Ações ✓

**Funcionalidades:**
- Botão "Colunas" no canto superior direito da tabela
- Dropdown com checkboxes para mostrar/ocultar colunas
- Estado persiste no localStorage
- Tabela responsiva com scroll horizontal em telas pequenas
- Cabeçalhos com tooltips explicativos

**Implementação:**
```typescript
// Estado de colunas visíveis
const [colunasVisiveis, setColunasVisiveis] = useState<VendaTabelaColunasVisiveis>(() => {
  const saved = localStorage.getItem('venda_colunas_visiveis')
  return saved ? JSON.parse(saved) : COLUNAS_VISIVEIS_DEFAULT
})

// Salvar no localStorage quando mudar
useEffect(() => {
  localStorage.setItem('venda_colunas_visiveis', JSON.stringify(colunasVisiveis))
}, [colunasVisiveis])

// Renderizar apenas colunas visíveis
<thead>
  <tr>
    {colunasVisiveis.produto && <th>Produto</th>}
    {colunasVisiveis.quantidade && <th>Qtd</th>}
    {colunasVisiveis.precoUnitario && <th>Preço Unit.</th>}
    {colunasVisiveis.subtotalBruto && <th>Subtotal Bruto</th>}
    {colunasVisiveis.descontoProporcional && <th>Desc. Prop.</th>}
    {colunasVisiveis.subtotalLiquido && <th>Subtotal Líq.</th>}
    {colunasVisiveis.ipiAliquota && <th>IPI %</th>}
    {colunasVisiveis.ipiValor && <th>IPI R$</th>}
    {colunasVisiveis.icmsAliquota && <th>ICMS %</th>}
    {colunasVisiveis.icmsValor && <th>ICMS R$</th>}
    {colunasVisiveis.stAliquota && <th>ST %</th>}
    {colunasVisiveis.stValor && <th>ST R$</th>}
    {colunasVisiveis.totalItem && <th>Total</th>}
    {colunasVisiveis.acoes && <th>Ações</th>}
  </tr>
</thead>
```

#### 3.4. Atualizar `VendaForm.tsx` - Campo de Desconto Total

Remover campo de desconto por produto e adicionar campo de desconto total da venda:

```typescript
<div className="mb-4">
  <label>Desconto Total (R$)</label>
  <input
    type="number"
    min="0"
    step="0.01"
    value={descontoTotal}
    onChange={(e) => setDescontoTotal(Number(e.target.value))}
    placeholder="0.00"
  />
  <span className="text-xs text-gray-500">
    Desconto será distribuído proporcionalmente entre os produtos
  </span>
</div>
```

#### 3.5. Atualizar `VendaForm.tsx` - Resumo da Venda

**Novo resumo detalhado:**

```typescript
<div className="bg-gray-50 p-4 rounded-lg">
  <h3 className="font-semibold mb-3">Resumo da Venda</h3>

  <div className="space-y-2">
    <div className="flex justify-between">
      <span className="text-gray-600">Total Produtos (bruto):</span>
      <span className="font-medium">
        {formatCurrency(totalProdutosBruto)}
      </span>
    </div>

    <div className="flex justify-between text-red-600">
      <span>Desconto Total:</span>
      <span className="font-medium">
        - {formatCurrency(descontoTotal)}
      </span>
    </div>

    <div className="flex justify-between border-t pt-2">
      <span className="text-gray-600">Total Produtos (líquido):</span>
      <span className="font-medium">
        {formatCurrency(totalProdutosLiquido)}
      </span>
    </div>

    <div className="pl-4 space-y-1 text-sm border-l-2 border-gray-300">
      <div className="flex justify-between">
        <span className="text-gray-600">IPI:</span>
        <span className="text-green-700">+ {formatCurrency(totalIpi)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-600">ST:</span>
        <span className="text-green-700">+ {formatCurrency(totalSt)}</span>
      </div>
    </div>

    <div className="flex justify-between border-t-2 border-gray-800 pt-2 mt-2">
      <span className="text-lg font-bold">TOTAL A PAGAR:</span>
      <span className="text-lg font-bold text-green-600">
        {formatCurrency(totalGeral)}
      </span>
    </div>

    {/* ICMS Informativo - Separado e destacado */}
    <div className="mt-4 pt-3 border-t border-blue-200 bg-blue-50 p-3 rounded">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <InfoIcon className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-900">
            ICMS (informativo):
          </span>
        </div>
        <span className="text-sm font-medium text-blue-900">
          {formatCurrency(totalIcms)}
        </span>
      </div>
      <p className="text-xs text-blue-700 mt-1">
        Não incluído no total. Pode ser creditado pelo cliente.
      </p>
    </div>
  </div>
</div>
```

#### 3.6. Aumentar largura do modal de venda

Atualizar a classe CSS do modal para usar largura máxima maior:

```typescript
// Em modal-host.tsx ou VendaModal
<Dialog>
  <DialogContent className="max-w-[95vw] lg:max-w-[1400px] max-h-[90vh] overflow-y-auto">
    {/* Conteúdo do modal */}
  </DialogContent>
</Dialog>
```

#### 3.7. Atualizar `VendaDetalhes.tsx`

- Usar o mesmo sistema de colunas visíveis
- Exibir todos os impostos na tabela de itens
- Exibir resumo completo com impostos
- Manter compatibilidade com vendas antigas (impostos = 0)

### 4. Lógica de Cálculo

#### 4.1. Criar funções de cálculo em `services/vendaCalculations.ts`

```typescript
// services/vendaCalculations.ts

export interface ItemCalculado {
  produto_id: number
  produto_nome: string
  quantidade: number
  preco_unitario: number
  subtotal_bruto: number
  desconto_proporcional: number
  subtotal_liquido: number
  ipi_aliquota: number
  ipi_valor: number
  icms_aliquota: number
  icms_valor: number
  st_aliquota: number
  st_valor: number
  total_item: number
}

export interface TotaisVenda {
  total_produtos_bruto: number
  desconto_total: number
  total_produtos_liquido: number
  total_ipi: number
  total_icms: number
  total_st: number
  total_geral: number
}

/**
 * Calcula um item da venda com todos os impostos e desconto proporcional
 */
export function calcularItemVenda(
  precoUnitario: number,
  quantidade: number,
  ipiAliquota: number,
  icmsAliquota: number,
  stAliquota: number,
  descontoProporcional: number
): Omit<ItemCalculado, 'produto_id' | 'produto_nome' | 'quantidade' | 'preco_unitario' | 'ipi_aliquota' | 'icms_aliquota' | 'st_aliquota'> {
  // 1. Subtotal bruto (preço × quantidade)
  const subtotalBruto = precoUnitario * quantidade

  // 2. Subtotal líquido (após desconto proporcional)
  const subtotalLiquido = subtotalBruto - descontoProporcional

  // 3. Calcular impostos sobre o subtotal líquido
  const ipiValor = subtotalLiquido * (ipiAliquota / 100)
  const icmsValor = subtotalLiquido * (icmsAliquota / 100) // ICMS é informativo, não entra no total
  const stValor = subtotalLiquido * (stAliquota / 100)

  // 4. Total do item (subtotal líquido + IPI + ST) - ICMS NÃO ENTRA
  const totalItem = subtotalLiquido + ipiValor + stValor

  return {
    subtotal_bruto: Number(subtotalBruto.toFixed(2)),
    desconto_proporcional: Number(descontoProporcional.toFixed(2)),
    subtotal_liquido: Number(subtotalLiquido.toFixed(2)),
    ipi_valor: Number(ipiValor.toFixed(2)),
    icms_valor: Number(icmsValor.toFixed(2)),
    st_valor: Number(stValor.toFixed(2)),
    total_item: Number(totalItem.toFixed(2))
  }
}

/**
 * Calcula o desconto proporcional de cada item baseado no desconto total da venda
 */
export function calcularDescontosProporcionais(
  itens: Array<{ preco_unitario: number; quantidade: number }>,
  descontoTotal: number
): number[] {
  // 1. Calcular total bruto de todos os itens
  const totalBruto = itens.reduce(
    (acc, item) => acc + item.preco_unitario * item.quantidade,
    0
  )

  // 2. Se não houver desconto ou total bruto for zero, retornar zeros
  if (descontoTotal === 0 || totalBruto === 0) {
    return itens.map(() => 0)
  }

  // 3. Calcular desconto proporcional para cada item
  const descontosProporcionais = itens.map((item, index) => {
    const subtotalBruto = item.preco_unitario * item.quantidade
    const proporcao = subtotalBruto / totalBruto

    // Para o último item, ajustar para garantir que a soma seja exata
    if (index === itens.length - 1) {
      const somaAnteriores = descontosProporcionais
        .slice(0, -1)
        .reduce((acc, d) => acc + d, 0)
      return Number((descontoTotal - somaAnteriores).toFixed(2))
    }

    return Number((descontoTotal * proporcao).toFixed(2))
  })

  return descontosProporcionais
}

/**
 * Calcula todos os itens da venda com descontos proporcionais e impostos
 */
export function calcularItensVenda(
  itens: Array<{
    produto_id: number
    produto_nome: string
    quantidade: number
    preco_unitario: number
    ipi_aliquota: number
    icms_aliquota: number
    st_aliquota: number
  }>,
  descontoTotal: number
): ItemCalculado[] {
  // 1. Calcular descontos proporcionais
  const descontosProporcionais = calcularDescontosProporcionais(itens, descontoTotal)

  // 2. Calcular cada item
  return itens.map((item, index) => {
    const calculado = calcularItemVenda(
      item.preco_unitario,
      item.quantidade,
      item.ipi_aliquota,
      item.icms_aliquota,
      item.st_aliquota,
      descontosProporcionais[index]
    )

    return {
      produto_id: item.produto_id,
      produto_nome: item.produto_nome,
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario,
      ipi_aliquota: item.ipi_aliquota,
      icms_aliquota: item.icms_aliquota,
      st_aliquota: item.st_aliquota,
      ...calculado
    }
  })
}

/**
 * Calcula os totais da venda
 */
export function calcularTotaisVenda(
  itens: ItemCalculado[],
  descontoTotal: number
): TotaisVenda {
  const totalProdutosBruto = itens.reduce((acc, item) => acc + item.subtotal_bruto, 0)
  const totalProdutosLiquido = itens.reduce((acc, item) => acc + item.subtotal_liquido, 0)
  const totalIpi = itens.reduce((acc, item) => acc + item.ipi_valor, 0)
  const totalIcms = itens.reduce((acc, item) => acc + item.icms_valor, 0) // Informativo apenas
  const totalSt = itens.reduce((acc, item) => acc + item.st_valor, 0)

  // Total geral NÃO inclui ICMS (apenas IPI e ST)
  const totalGeral = totalProdutosLiquido + totalIpi + totalSt

  return {
    total_produtos_bruto: Number(totalProdutosBruto.toFixed(2)),
    desconto_total: Number(descontoTotal.toFixed(2)),
    total_produtos_liquido: Number(totalProdutosLiquido.toFixed(2)),
    total_ipi: Number(totalIpi.toFixed(2)),
    total_icms: Number(totalIcms.toFixed(2)), // Informativo, não somado
    total_st: Number(totalSt.toFixed(2)),
    total_geral: Number(totalGeral.toFixed(2)) // Subtotal + IPI + ST (sem ICMS)
  }
}
```

### 5. Backend - API

#### 5.1. Atualizar `api/produtos.php`

```php
// GET - Incluir campos de impostos
$sql = "SELECT
  id, nome, descricao, preco_venda, preco_custo,
  codigo_barras, categoria_id, fornecedor_id,
  estoque_minimo, estoque_atual, ativo,
  ipi, icms, st  /* NOVOS CAMPOS */
FROM produtos WHERE id = ?";

// POST/PUT - Validar e inserir/atualizar campos de impostos
$ipi = isset($_POST['ipi']) ? floatval($_POST['ipi']) : 0;
$icms = isset($_POST['icms']) ? floatval($_POST['icms']) : 0;
$st = isset($_POST['st']) ? floatval($_POST['st']) : 0;

// Validações
if ($ipi < 0 || $ipi > 100) {
    http_response_code(400);
    echo json_encode(['error' => 'IPI deve estar entre 0 e 100']);
    exit;
}
if ($icms < 0 || $icms > 100) {
    http_response_code(400);
    echo json_encode(['error' => 'ICMS deve estar entre 0 e 100']);
    exit;
}
if ($st < 0 || $st > 100) {
    http_response_code(400);
    echo json_encode(['error' => 'ST deve estar entre 0 e 100']);
    exit;
}

$sql = "INSERT INTO produtos (..., ipi, icms, st) VALUES (..., ?, ?, ?)";
```

#### 5.2. Atualizar `api/vendas.php`

```php
// Criar venda com cálculos completos
function criarVenda($dados) {
    global $conn;

    // 1. Extrair dados da venda
    $cliente_id = $dados['cliente_id'];
    $usuario_id = $dados['usuario_id'];
    $forma_pagamento = $dados['forma_pagamento'];
    $desconto_total = floatval($dados['desconto_total'] ?? 0);
    $itens = $dados['itens'];

    // 2. Buscar dados dos produtos
    $itensComImpostos = [];
    foreach ($itens as $item) {
        $produto = buscarProduto($item['produto_id']);
        $itensComImpostos[] = [
            'produto_id' => $item['produto_id'],
            'produto_nome' => $produto['nome'],
            'quantidade' => floatval($item['quantidade']),
            'preco_unitario' => floatval($produto['preco_venda']),
            'ipi_aliquota' => floatval($produto['ipi']),
            'icms_aliquota' => floatval($produto['icms']),
            'st_aliquota' => floatval($produto['st'])
        ];
    }

    // 3. Calcular descontos proporcionais
    $total_bruto = 0;
    foreach ($itensComImpostos as $item) {
        $total_bruto += $item['preco_unitario'] * $item['quantidade'];
    }

    $descontos_proporcionais = [];
    $soma_descontos = 0;
    foreach ($itensComImpostos as $index => $item) {
        $subtotal_bruto = $item['preco_unitario'] * $item['quantidade'];
        $proporcao = $total_bruto > 0 ? $subtotal_bruto / $total_bruto : 0;

        // Para o último item, ajustar para garantir soma exata
        if ($index === count($itensComImpostos) - 1) {
            $descontos_proporcionais[] = round($desconto_total - $soma_descontos, 2);
        } else {
            $desconto_prop = round($desconto_total * $proporcao, 2);
            $descontos_proporcionais[] = $desconto_prop;
            $soma_descontos += $desconto_prop;
        }
    }

    // 4. Calcular cada item com impostos
    $itens_calculados = [];
    $total_produtos_bruto = 0;
    $total_produtos_liquido = 0;
    $total_ipi = 0;
    $total_icms = 0;
    $total_st = 0;

    foreach ($itensComImpostos as $index => $item) {
        $subtotal_bruto = $item['preco_unitario'] * $item['quantidade'];
        $desconto_proporcional = $descontos_proporcionais[$index];
        $subtotal_liquido = $subtotal_bruto - $desconto_proporcional;

        $ipi_valor = $subtotal_liquido * ($item['ipi_aliquota'] / 100);
        $icms_valor = $subtotal_liquido * ($item['icms_aliquota'] / 100); // Informativo
        $st_valor = $subtotal_liquido * ($item['st_aliquota'] / 100);
        $total_item = $subtotal_liquido + $ipi_valor + $st_valor; // ICMS NÃO entra no total

        $itens_calculados[] = [
            'produto_id' => $item['produto_id'],
            'quantidade' => $item['quantidade'],
            'preco_unitario' => round($item['preco_unitario'], 2),
            'subtotal_bruto' => round($subtotal_bruto, 2),
            'desconto_proporcional' => round($desconto_proporcional, 2),
            'subtotal_liquido' => round($subtotal_liquido, 2),
            'ipi_aliquota' => round($item['ipi_aliquota'], 2),
            'ipi_valor' => round($ipi_valor, 2),
            'icms_aliquota' => round($item['icms_aliquota'], 2),
            'icms_valor' => round($icms_valor, 2),
            'st_aliquota' => round($item['st_aliquota'], 2),
            'st_valor' => round($st_valor, 2),
            'total_item' => round($total_item, 2)
        ];

        $total_produtos_bruto += $subtotal_bruto;
        $total_produtos_liquido += $subtotal_liquido;
        $total_ipi += $ipi_valor;
        $total_icms += $icms_valor; // Acumulado mas não entra no total
        $total_st += $st_valor;
    }

    // Total geral NÃO inclui ICMS (apenas IPI e ST)
    $total_geral = $total_produtos_liquido + $total_ipi + $total_st;

    // 5. Inserir venda
    $conn->begin_transaction();

    try {
        $sql = "INSERT INTO vendas (
            cliente_id, usuario_id, data_venda, status,
            forma_pagamento, total_produtos_bruto, desconto_total,
            total_produtos_liquido, total_ipi, total_icms, total_st, total
        ) VALUES (?, ?, NOW(), 'pendente', ?, ?, ?, ?, ?, ?, ?, ?)";

        $stmt = $conn->prepare($sql);
        $stmt->bind_param(
            'iisdddddd',
            $cliente_id,
            $usuario_id,
            $forma_pagamento,
            $total_produtos_bruto,
            $desconto_total,
            $total_produtos_liquido,
            $total_ipi,
            $total_icms,
            $total_st,
            $total_geral
        );
        $stmt->execute();
        $venda_id = $conn->insert_id;

        // 6. Inserir itens da venda
        $sql_item = "INSERT INTO venda_itens (
            venda_id, produto_id, quantidade, preco_unitario,
            subtotal_bruto, desconto_proporcional, subtotal_liquido,
            ipi_aliquota, ipi_valor, icms_aliquota, icms_valor,
            st_aliquota, st_valor, total_item
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        $stmt_item = $conn->prepare($sql_item);

        foreach ($itens_calculados as $item) {
            $stmt_item->bind_param(
                'iidddddddddddd',
                $venda_id,
                $item['produto_id'],
                $item['quantidade'],
                $item['preco_unitario'],
                $item['subtotal_bruto'],
                $item['desconto_proporcional'],
                $item['subtotal_liquido'],
                $item['ipi_aliquota'],
                $item['ipi_valor'],
                $item['icms_aliquota'],
                $item['icms_valor'],
                $item['st_aliquota'],
                $item['st_valor'],
                $item['total_item']
            );
            $stmt_item->execute();
        }

        $conn->commit();
        return $venda_id;

    } catch (Exception $e) {
        $conn->rollback();
        throw $e;
    }
}
```

### 6. Services - Frontend

#### 6.1. Atualizar `services/produtosService.ts`
- Tipos já atualizados com campo `ipi`
- Nenhuma alteração necessária se API já retorna o campo

#### 6.2. Atualizar `services/vendasService.ts`
- Garantir que `VendaItem` inclui campos de IPI
- Função de cálculo pode ser usada antes de enviar ao backend
- Backend deve sempre recalcular (nunca confiar no frontend)

### 7. Migração de Dados Existentes

#### 7.1. Script de migração para produtos existentes
```sql
-- Definir impostos zerados para produtos existentes
UPDATE produtos
SET
  ipi = 0.00,
  icms = 0.00,
  st = 0.00
WHERE ipi IS NULL OR icms IS NULL OR st IS NULL;
```

#### 7.2. Script de migração para vendas antigas
```sql
-- Migrar vendas antigas para nova estrutura
UPDATE vendas
SET
  total_produtos_bruto = COALESCE(total - desconto, total),
  desconto_total = COALESCE(desconto, 0),
  total_produtos_liquido = total,
  total_ipi = 0,
  total_icms = 0,
  total_st = 0
WHERE total_produtos_bruto IS NULL;

-- Migrar itens de vendas antigas
UPDATE venda_itens vi
JOIN vendas v ON vi.venda_id = v.id
SET
  vi.subtotal_bruto = vi.preco_unitario * vi.quantidade,
  vi.desconto_proporcional = 0,
  vi.subtotal_liquido = vi.preco_unitario * vi.quantidade,
  vi.ipi_aliquota = 0,
  vi.ipi_valor = 0,
  vi.icms_aliquota = 0,
  vi.icms_valor = 0,
  vi.st_aliquota = 0,
  vi.st_valor = 0,
  vi.total_item = vi.preco_unitario * vi.quantidade
WHERE vi.subtotal_bruto IS NULL;
```

### 8. Testes

#### 8.1. Testes unitários de cálculo
- Testar `calcularDescontosProporcionais` com diferentes cenários
- Testar `calcularItemVenda` com impostos variados
- Testar `calcularItensVenda` com múltiplos itens
- Testar `calcularTotaisVenda` para validar totais
- Testar com impostos zerados (retrocompatibilidade)
- Testar arredondamento de valores

#### 8.2. Testes de integração
- Criar produto com impostos (IPI, ICMS, ST)
- Adicionar múltiplos produtos à venda
- Aplicar desconto total
- Verificar cálculos na interface (tabela e resumo)
- Salvar venda e verificar no banco
- Consultar venda e verificar valores
- Testar com vendas antigas (sem impostos)

#### 8.3. Casos de teste

**Caso 1: Produto sem impostos e sem desconto**
- Produto: R$ 100,00
- Desconto total: R$ 0,00
- Impostos: 0%
- Resultado: Total = R$ 100,00

**Caso 2: Produto com impostos sem desconto**
- Produto: R$ 100,00
- IPI: 10%, ICMS: 18%, ST: 5%
- Desconto total: R$ 0,00
- Resultado:
  - Subtotal líquido: R$ 100,00
  - IPI: R$ 10,00, ICMS: R$ 18,00 (informativo), ST: R$ 5,00
  - Total: R$ 115,00 (100 + 10 + 5, ICMS não incluído)

**Caso 3: Desconto proporcional simples (1 produto)**
- Produto: R$ 1.000,00
- Desconto total: R$ 100,00
- IPI: 10%, ICMS: 18%, ST: 5%
- Resultado:
  - Subtotal bruto: R$ 1.000,00
  - Desconto proporcional: R$ 100,00 (100%)
  - Subtotal líquido: R$ 900,00
  - IPI: R$ 90,00, ICMS: R$ 162,00 (informativo), ST: R$ 45,00
  - Total: R$ 1.035,00 (900 + 90 + 45, ICMS não incluído)

**Caso 4: Desconto proporcional com 3 produtos (exemplo principal)**
- Produto A: R$ 200,00 (20% do total)
- Produto B: R$ 300,00 (30% do total)
- Produto C: R$ 500,00 (50% do total)
- Desconto total: R$ 100,00
- IPI: A=10%, B=8%, C=12%
- ICMS: 18% para todos
- ST: 5% para todos

**Resultado:**
- Produto A:
  - Subtotal bruto: R$ 200,00
  - Desconto prop.: R$ 20,00
  - Subtotal líq.: R$ 180,00
  - IPI: R$ 18,00, ICMS: R$ 32,40 (info), ST: R$ 9,00
  - Total: R$ 207,00 (180 + 18 + 9)

- Produto B:
  - Subtotal bruto: R$ 300,00
  - Desconto prop.: R$ 30,00
  - Subtotal líq.: R$ 270,00
  - IPI: R$ 21,60, ICMS: R$ 48,60 (info), ST: R$ 13,50
  - Total: R$ 305,10 (270 + 21,60 + 13,50)

- Produto C:
  - Subtotal bruto: R$ 500,00
  - Desconto prop.: R$ 50,00
  - Subtotal líq.: R$ 450,00
  - IPI: R$ 54,00, ICMS: R$ 81,00 (info), ST: R$ 22,50
  - Total: R$ 526,50 (450 + 54 + 22,50)

**Totais da venda:**
- Total produtos (bruto): R$ 1.000,00
- Desconto total: R$ 100,00
- Total produtos (líquido): R$ 900,00
- Total IPI: R$ 93,60
- Total ICMS (informativo): R$ 162,00 ⚠️ *Não incluído*
- Total ST: R$ 45,00
- **TOTAL A PAGAR: R$ 1.038,60** (900 + 93,60 + 45,00)
- *ICMS de R$ 162,00 é informativo*

**Caso 5: Desconto maior que valor de um produto**
- Produto A: R$ 50,00
- Produto B: R$ 950,00
- Desconto total: R$ 100,00
- Resultado:
  - Desconto prop. A: R$ 5,00 (5%)
  - Desconto prop. B: R$ 95,00 (95%)
  - Subtotal líq. A: R$ 45,00
  - Subtotal líq. B: R$ 855,00

**Caso 6: Arredondamento com centavos**
- Produto A: R$ 33,33
- Produto B: R$ 33,33
- Produto C: R$ 33,34
- Desconto total: R$ 10,00
- Resultado:
  - Desconto prop. A: R$ 3,33 (33,33%)
  - Desconto prop. B: R$ 3,33 (33,33%)
  - Desconto prop. C: R$ 3,34 (33,34% - ajustado no último)
  - Soma dos descontos = R$ 10,00 (exato)

## Ordem de Implementação Recomendada

1. ✅ **Banco de Dados** (Etapa 1)
   - Adicionar campos de impostos nas tabelas (produtos, vendas, venda_itens)
   - Executar migração de dados existentes (produtos e vendas antigas)
   - Testar scripts de migração

2. ✅ **TypeScript - Tipos** (Etapa 2)
   - Atualizar interfaces `Produto`, `Venda`, `VendaItem`
   - Criar tipo `VendaTabelaColunasVisiveis`
   - Criar tipo `ItemCalculado` e `TotaisVenda`
   - Garantir type safety

3. ✅ **Lógica de Cálculo** (Etapa 4)
   - Implementar `calcularDescontosProporcionais`
   - Implementar `calcularItemVenda`
   - Implementar `calcularItensVenda`
   - Implementar `calcularTotaisVenda`
   - Testar unitariamente com casos de teste

4. ✅ **Backend - Produtos** (Etapa 5.1)
   - Atualizar `api/produtos.php`
   - Incluir campos IPI, ICMS, ST no SELECT
   - Implementar validações (0-100%)
   - Testar endpoints

5. ✅ **Backend - Vendas** (Etapa 5.2)
   - Atualizar `api/vendas.php`
   - Implementar lógica de cálculo no servidor
   - Garantir transações corretas
   - Testar criação de venda com impostos

6. ✅ **Frontend - Produto** (Etapa 3.1)
   - Adicionar campos IPI, ICMS, ST no formulário
   - Implementar validações
   - Testar cadastro/edição de produto

7. ✅ **Frontend - Componente de Colunas** (Etapa 3.2)
   - Criar `VendaTabelaColunas.tsx`
   - Implementar popover com checkboxes
   - Persistir no localStorage

8. ✅ **Frontend - Venda (Tabela)** (Etapa 3.3)
   - Atualizar tabela de produtos no formulário
   - Implementar sistema de colunas visíveis
   - Adicionar todas as colunas de impostos
   - Tornar responsivo com scroll horizontal

9. ✅ **Frontend - Venda (Desconto e Resumo)** (Etapa 3.4, 3.5)
   - Remover desconto por produto
   - Adicionar campo de desconto total
   - Atualizar resumo com todos os impostos
   - Integrar funções de cálculo

10. ✅ **Frontend - Modal** (Etapa 3.6)
    - Aumentar largura do modal para max-w-[1400px]
    - Garantir responsividade

11. ✅ **Frontend - Visualização** (Etapa 3.7)
    - Atualizar `VendaDetalhes.tsx`
    - Usar sistema de colunas visíveis
    - Exibir resumo completo com impostos
    - Garantir compatibilidade com vendas antigas

12. ✅ **Services** (Etapa 6)
    - Atualizar `produtosService.ts` se necessário
    - Atualizar `vendasService.ts` se necessário
    - Integrar com componentes

13. ✅ **Testes** (Etapa 8)
    - Testes unitários das funções de cálculo
    - Testes de integração (criar produto, criar venda)
    - Validação de todos os casos de teste
    - Testar retrocompatibilidade

14. ✅ **Documentação**
    - Atualizar CLAUDE.md com novas regras de impostos
    - Documentar sistema de colunas visíveis
    - Documentar cálculo de desconto proporcional
    - Adicionar exemplos práticos

## Considerações Adicionais

### Desconto Proporcional
- **Decisão**: Desconto total distribuído proporcionalmente entre produtos
- **Motivo**: Permite desconto flexível mantendo cálculo correto de impostos por produto
- **Implementação**: Último item ajustado para garantir soma exata
- **Vantagem**: Interface mais simples e cálculos mais precisos

### Impostos por Produto
- **IPI e ST** são calculados individualmente por produto e **incluídos no total**
- **ICMS** é calculado mas **NÃO incluído no total** (apenas informativo)
- Base de cálculo: subtotal líquido (após desconto proporcional)
- Cada produto pode ter alíquotas diferentes
- **Total do item** = Subtotal líquido + IPI + ST (sem ICMS)
- **Total da venda** = Soma dos totais dos itens (IPI e ST incluídos, ICMS não)

### Arredondamento e Precisão
- Todos os valores devem ter 2 casas decimais
- Arredondar em cada etapa do cálculo
- Usar `Number.toFixed(2)` (JS) e `DECIMAL(10,2)` (SQL)
- Último item ajustado em descontos proporcionais para garantir soma exata
- **Exemplo**: Se desconto = R$ 10,00 e produtos = 3, ajustar último para evitar R$ 9,99 ou R$ 10,01

### Retrocompatibilidade
- Produtos antigos terão impostos = 0
- Vendas antigas terão todos os impostos = 0
- Scripts de migração garantem dados consistentes
- Interface exibe corretamente vendas com e sem impostos
- Campos deprecados mantidos para compatibilidade (`desconto`, `desconto_tipo`, `subtotal`)

### Performance
- Cálculos feitos em memória (frontend e backend)
- Recalcular sempre no backend antes de salvar (segurança)
- Índices no banco para consultas rápidas
- Sistema de colunas visíveis reduz renderização desnecessária

### Segurança
- Backend sempre recalcula valores (nunca confia no frontend)
- Validações de alíquotas (0-100%)
- Transações no banco para garantir consistência
- Valores arredondados para evitar manipulação

### Interface - Exibição do ICMS
- ICMS aparece em **seção separada** no resumo da venda
- Background azul claro para diferenciar visualmente
- Ícone de informação (ℹ️) ao lado do título
- Texto explicativo: "Não incluído no total. Pode ser creditado pelo cliente."
- Na tabela, coluna ICMS R$ visível, mas claramente marcada
- Total da venda mostra apenas IPI + ST, **não** ICMS

## Checklist de Implementação

### Banco de Dados
- [ ] Criar scripts SQL para adicionar campos em `produtos` (ipi, icms, st)
- [ ] Criar scripts SQL para adicionar campos em `venda_itens` (11 campos novos)
- [ ] Criar scripts SQL para adicionar campos em `vendas` (6 campos novos)
- [ ] Executar scripts no banco de dados de desenvolvimento
- [ ] Criar scripts de migração para produtos existentes
- [ ] Criar scripts de migração para vendas antigas
- [ ] Executar scripts de migração
- [ ] Validar dados migrados

### TypeScript
- [ ] Atualizar interface `Produto` (`types/index.ts`)
- [ ] Atualizar interface `VendaItem` (`types/index.ts`)
- [ ] Atualizar interface `Venda` (`types/index.ts`)
- [ ] Criar interface `VendaTabelaColunasVisiveis` (`types/index.ts`)
- [ ] Criar constante `COLUNAS_VISIVEIS_DEFAULT` (`types/index.ts`)
- [ ] Criar interface `ItemCalculado` (em `services/vendaCalculations.ts`)
- [ ] Criar interface `TotaisVenda` (em `services/vendaCalculations.ts`)

### Lógica de Cálculo
- [ ] Criar arquivo `services/vendaCalculations.ts`
- [ ] Implementar função `calcularDescontosProporcionais`
- [ ] Implementar função `calcularItemVenda`
- [ ] Implementar função `calcularItensVenda`
- [ ] Implementar função `calcularTotaisVenda`
- [ ] Criar testes unitários para cada função
- [ ] Testar casos de teste documentados
- [ ] Validar arredondamento e precisão

### Backend
- [ ] Atualizar `api/produtos.php` - incluir campos no SELECT
- [ ] Atualizar `api/produtos.php` - adicionar validações (0-100%)
- [ ] Atualizar `api/produtos.php` - INSERT/UPDATE com novos campos
- [ ] Testar endpoints de produtos
- [ ] Atualizar `api/vendas.php` - implementar cálculo de descontos proporcionais
- [ ] Atualizar `api/vendas.php` - implementar cálculo de impostos
- [ ] Atualizar `api/vendas.php` - INSERT com todos os campos
- [ ] Atualizar `api/vendas.php` - garantir transações
- [ ] Testar criação de venda com impostos

### Frontend - Produto
- [ ] Atualizar `ProdutoForm.tsx` - adicionar campos IPI, ICMS, ST
- [ ] Implementar validações nos campos de impostos
- [ ] Testar cadastro de produto com impostos
- [ ] Testar edição de produto com impostos

### Frontend - Componente de Colunas
- [ ] Criar componente `VendaTabelaColunas.tsx`
- [ ] Implementar popover com checkboxes
- [ ] Implementar lógica de mostrar/ocultar colunas
- [ ] Implementar persistência no localStorage
- [ ] Implementar botão "Restaurar padrão"

### Frontend - Venda (Formulário)
- [ ] Remover campo de desconto por produto
- [ ] Adicionar campo de desconto total da venda
- [ ] Atualizar tabela com todas as colunas de impostos
- [ ] Integrar componente `VendaTabelaColunas`
- [ ] Implementar renderização condicional de colunas
- [ ] Atualizar resumo da venda com detalhamento de impostos
- [ ] Integrar funções de cálculo de `vendaCalculations.ts`
- [ ] Implementar recalculo automático ao mudar desconto
- [ ] Testar responsividade da tabela

### Frontend - Modal
- [ ] Aumentar largura do modal para `max-w-[1400px]`
- [ ] Garantir scroll horizontal na tabela
- [ ] Testar em diferentes resoluções

### Frontend - Visualização
- [ ] Atualizar `VendaDetalhes.tsx` - usar sistema de colunas
- [ ] Exibir todos os impostos na tabela de itens
- [ ] Exibir resumo completo com impostos
- [ ] Garantir compatibilidade com vendas antigas

### Services
- [ ] Verificar `produtosService.ts` - ajustar se necessário
- [ ] Verificar `vendasService.ts` - ajustar se necessário
- [ ] Testar integração com backend

### Testes e Validação
- [ ] Executar testes unitários das funções de cálculo
- [ ] Testar Caso 1: Produto sem impostos e sem desconto
- [ ] Testar Caso 2: Produto com impostos sem desconto
- [ ] Testar Caso 3: Desconto proporcional simples (1 produto)
- [ ] Testar Caso 4: Desconto proporcional com 3 produtos
- [ ] Testar Caso 5: Desconto maior que valor de um produto
- [ ] Testar Caso 6: Arredondamento com centavos
- [ ] Testar criação de venda completa (end-to-end)
- [ ] Testar visualização de venda
- [ ] Testar edição de venda (se aplicável)
- [ ] Testar com vendas antigas (retrocompatibilidade)
- [ ] Validar cálculos no banco de dados
- [ ] Testar em diferentes navegadores

### Documentação
- [ ] Atualizar CLAUDE.md com regras de impostos
- [ ] Documentar sistema de colunas visíveis
- [ ] Documentar cálculo de desconto proporcional
- [ ] Adicionar exemplos de uso
- [ ] Documentar API endpoints atualizados

### Deploy
- [ ] Executar scripts SQL no banco de produção
- [ ] Fazer backup do banco antes de executar
- [ ] Deploy da aplicação
- [ ] Validar em produção com dados reais
- [ ] Monitorar logs por 24h

## Estimativa de Tempo

- **Banco de Dados**: 2h (scripts + migração + testes)
- **TypeScript - Tipos**: 1h
- **Lógica de Cálculo**: 3h (4 funções + testes unitários)
- **Backend - Produtos**: 2h
- **Backend - Vendas**: 4h (lógica complexa + transações)
- **Frontend - Produto**: 1,5h
- **Frontend - Componente Colunas**: 2h
- **Frontend - Venda (Formulário)**: 6h (tabela + resumo + integração)
- **Frontend - Modal**: 0,5h
- **Frontend - Visualização**: 2h
- **Services**: 1h
- **Testes e Validação**: 4h (6 casos + integração)
- **Documentação**: 1,5h
- **Deploy**: 1,5h

**Total estimado: 32 horas (~4 dias de trabalho)**

### Distribuição Sugerida
- **Dia 1** (8h): Banco de Dados + TypeScript + Lógica de Cálculo
- **Dia 2** (8h): Backend (Produtos + Vendas)
- **Dia 3** (8h): Frontend (Produto + Componente Colunas + início Venda)
- **Dia 4** (8h): Frontend (fim Venda + Modal + Visualização) + Services + Testes + Deploy

## Próximos Passos

1. **Revisar e aprovar este plano**
   - Validar regras de negócio
   - Confirmar cálculos e exemplos
   - Aprovar estrutura de tabelas

2. **Criar branch de desenvolvimento**
   ```bash
   git checkout -b feature/impostos-vendas
   ```

3. **Seguir ordem de implementação** (14 etapas)
   - Trabalhar etapa por etapa
   - Testar após cada etapa
   - Fazer commits incrementais

4. **Code review em etapas críticas**
   - Após lógica de cálculo (Etapa 3)
   - Após backend de vendas (Etapa 5)
   - Após tabela de vendas (Etapa 8)

5. **Testes completos**
   - Executar todos os 6 casos de teste
   - Validar retrocompatibilidade
   - Testar em diferentes navegadores

6. **Deploy em ambiente de testes**
   - Executar scripts SQL em banco de teste
   - Deploy da aplicação
   - Testes com dados reais

7. **Validação e ajustes**
   - Feedback dos usuários
   - Ajustes de UX se necessário
   - Correção de bugs

8. **Deploy em produção**
   - Backup completo do banco
   - Executar scripts SQL
   - Deploy da aplicação
   - Monitoramento 24h

## Resumo Executivo

Este plano implementa um sistema completo de impostos (IPI, ICMS, ST) nas vendas com as seguintes características:

### Funcionalidades Principais
✅ **Impostos por produto** - IPI, ICMS e ST configuráveis individualmente
✅ **IPI e ST incluídos no total** - Entram no valor final da venda
✅ **ICMS informativo** - Calculado e exibido, mas não entra no total (pode ser creditado)
✅ **Desconto total proporcional** - Distribuído automaticamente entre produtos
✅ **Tabela responsiva com colunas configuráveis** - Usuário escolhe o que visualizar
✅ **Modal mais largo** - Melhor visualização das informações
✅ **Cálculos precisos** - Arredondamento correto e ajuste no último item
✅ **Retrocompatibilidade** - Vendas antigas continuam funcionando
✅ **Segurança** - Backend recalcula todos os valores

### Impacto no Sistema
- **3 tabelas alteradas**: produtos, vendas, venda_itens
- **18 novos campos no banco**: 3 em produtos, 6 em vendas, 11 em venda_itens (reduzido devido a remoção de desconto por item)
- **1 novo arquivo**: `services/vendaCalculations.ts`
- **4 componentes alterados**: ProdutoForm, VendaForm, VendaDetalhes, modal-host
- **1 novo componente**: VendaTabelaColunas
- **2 APIs alteradas**: produtos.php, vendas.php

### Exemplo Prático
**Venda com 3 produtos e desconto de R$ 100,00:**
- Produto A (R$ 200): desc. R$ 20, IPI+ST R$ 27 → Total: **R$ 207,00**
- Produto B (R$ 300): desc. R$ 30, IPI+ST R$ 35,10 → Total: **R$ 305,10**
- Produto C (R$ 500): desc. R$ 50, IPI+ST R$ 76,50 → Total: **R$ 526,50**

**Total a pagar: R$ 1.038,60** (bruto R$ 1.000 - desc. R$ 100 + IPI R$ 93,60 + ST R$ 45)
**ICMS informativo: R$ 162,00** (não incluído no total, pode ser creditado)

### Estimativa
**32 horas** de desenvolvimento (~4 dias úteis) + testes e validação
