// ============================================================================
// FUNÇÕES DE CÁLCULO DE IMPOSTOS E DESCONTOS
// Sistema MeguisPet - Cálculos para vendas com IPI, ICMS e ST
// ============================================================================

import { ItemCalculado, TotaisVenda } from '@/types'

// ============================================================================
// REGRA IMPORTANTE: ICMS é informativo e NÃO entra no total
// Total do item = Subtotal líquido + IPI + ST (sem ICMS)
// ============================================================================

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
  const descontosProporcionais: number[] = []
  let somaDescontos = 0

  itens.forEach((item, index) => {
    const subtotalBruto = item.preco_unitario * item.quantidade
    const proporcao = subtotalBruto / totalBruto

    // Para o último item, ajustar para garantir que a soma seja exata
    if (index === itens.length - 1) {
      const descontoFinal = Number((descontoTotal - somaDescontos).toFixed(2))
      descontosProporcionais.push(descontoFinal)
    } else {
      const descontoProp = Number((descontoTotal * proporcao).toFixed(2))
      descontosProporcionais.push(descontoProp)
      somaDescontos += descontoProp
    }
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
 * IMPORTANTE: Total geral NÃO inclui ICMS (apenas IPI e ST)
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

/**
 * Formata um valor para moeda brasileira
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

/**
 * Formata uma alíquota para percentual
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(2)}%`
}
