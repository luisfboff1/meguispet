// ============================================================================
// PROCESSADOR DE VENDAS COM IMPOSTOS
// Processa vendas calculando descontos proporcionais e impostos por produto
// ============================================================================

import { getSupabase } from '@/lib/supabase'

export interface VendaItemComImpostos {
  produto_id: number
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

export interface TotaisVendaProcessada {
  total_produtos_bruto: number
  desconto_total: number
  total_produtos_liquido: number
  total_ipi: number
  total_icms: number // Informativo, NÃO incluído no total
  total_st: number
  total_geral: number // Subtotal + IPI + ST (sem ICMS)
}

export interface VendaProcessada {
  itens: VendaItemComImpostos[]
  totais: TotaisVendaProcessada
}

/**
 * Busca as alíquotas de impostos dos produtos
 */
async function buscarImpostosProdutos(produtoIds: number[]): Promise<Map<number, { ipi: number; icms: number; st: number }>> {
  const supabase = getSupabase()

  const { data: produtos, error } = await supabase
    .from('produtos')
    .select('id, ipi, icms, st')
    .in('id', produtoIds)

  if (error) {
    console.error('Erro ao buscar impostos dos produtos:', error)
    throw new Error('Erro ao buscar impostos dos produtos')
  }

  const mapImpostos = new Map<number, { ipi: number; icms: number; st: number }>()

  produtos?.forEach(p => {
    mapImpostos.set(p.id, {
      ipi: p.ipi || 0,
      icms: p.icms || 0,
      st: p.st || 0
    })
  })

  return mapImpostos
}

/**
 * Calcula descontos proporcionais para cada item
 */
function calcularDescontosProporcionais(
  itens: Array<{ quantidade: number; preco_unitario: number }>,
  descontoTotal: number
): number[] {
  // 1. Calcular total bruto
  const totalBruto = itens.reduce((acc, item) => {
    return acc + (item.preco_unitario * item.quantidade)
  }, 0)

  // 2. Se não houver desconto ou total for zero, retornar zeros
  if (descontoTotal === 0 || totalBruto === 0) {
    return itens.map(() => 0)
  }

  // 3. Calcular desconto proporcional para cada item
  const descontosProporcionais: number[] = []
  let somaDescontos = 0

  itens.forEach((item, index) => {
    const subtotalBruto = item.preco_unitario * item.quantidade
    const proporcao = subtotalBruto / totalBruto

    // Para o último item, ajustar para garantir soma exata
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
 * Calcula um item da venda com impostos
 */
function calcularItemComImpostos(
  produtoId: number,
  quantidade: number,
  precoUnitario: number,
  descontoProporcional: number,
  ipiAliquota: number,
  icmsAliquota: number,
  stAliquota: number
): VendaItemComImpostos {
  // 1. Subtotal bruto
  const subtotalBruto = precoUnitario * quantidade

  // 2. Subtotal líquido (após desconto proporcional)
  const subtotalLiquido = subtotalBruto - descontoProporcional

  // 3. Calcular impostos sobre subtotal líquido
  const ipiValor = subtotalLiquido * (ipiAliquota / 100)
  const icmsValor = subtotalLiquido * (icmsAliquota / 100) // Informativo
  const stValor = subtotalLiquido * (stAliquota / 100)

  // 4. Total do item = Subtotal líquido + IPI + ST (ICMS NÃO ENTRA)
  const totalItem = subtotalLiquido + ipiValor + stValor

  return {
    produto_id: produtoId,
    quantidade,
    preco_unitario: Number(precoUnitario.toFixed(2)),
    subtotal_bruto: Number(subtotalBruto.toFixed(2)),
    desconto_proporcional: Number(descontoProporcional.toFixed(2)),
    subtotal_liquido: Number(subtotalLiquido.toFixed(2)),
    ipi_aliquota: Number(ipiAliquota.toFixed(2)),
    ipi_valor: Number(ipiValor.toFixed(2)),
    icms_aliquota: Number(icmsAliquota.toFixed(2)),
    icms_valor: Number(icmsValor.toFixed(2)),
    st_aliquota: Number(stAliquota.toFixed(2)),
    st_valor: Number(stValor.toFixed(2)),
    total_item: Number(totalItem.toFixed(2))
  }
}

/**
 * Processa uma venda completa com cálculo de impostos
 */
export async function processarVendaComImpostos(
  itens: Array<{
    produto_id: number;
    quantidade: number;
    preco_unitario: number;
    ipi_aliquota?: number;
    icms_aliquota?: number;
    st_aliquota?: number;
  }>,
  descontoTotal: number
): Promise<VendaProcessada> {
  // 1. Buscar alíquotas de impostos dos produtos (apenas se não vier no item)
  const produtoIds = itens.map(item => item.produto_id)
  const mapImpostos = await buscarImpostosProdutos(produtoIds)

  // 2. Calcular descontos proporcionais
  const descontosProporcionais = calcularDescontosProporcionais(itens, descontoTotal)

  // 3. Calcular cada item com impostos
  const itensCalculados: VendaItemComImpostos[] = itens.map((item, index) => {
    const impostosDb = mapImpostos.get(item.produto_id) || { ipi: 0, icms: 0, st: 0 }

    // Usar alíquotas do item se já estiverem definidas, senão usa do produto
    const ipiAliquota = item.ipi_aliquota !== undefined ? item.ipi_aliquota : impostosDb.ipi
    const icmsAliquota = item.icms_aliquota !== undefined ? item.icms_aliquota : impostosDb.icms
    const stAliquota = item.st_aliquota !== undefined ? item.st_aliquota : impostosDb.st

    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Produto ${item.produto_id}: IPI=${ipiAliquota}%, ICMS=${icmsAliquota}%, ST=${stAliquota}%`, {
        item_ipi: item.ipi_aliquota,
        db_ipi: impostosDb.ipi,
        item_st: item.st_aliquota,
        db_st: impostosDb.st
      })
    }

    return calcularItemComImpostos(
      item.produto_id,
      item.quantidade,
      item.preco_unitario,
      descontosProporcionais[index],
      ipiAliquota,
      icmsAliquota,
      stAliquota
    )
  })

  // 4. Calcular totais da venda
  const totalProdutosBruto = itensCalculados.reduce((acc, item) => acc + item.subtotal_bruto, 0)
  const totalProdutosLiquido = itensCalculados.reduce((acc, item) => acc + item.subtotal_liquido, 0)
  const totalIpi = itensCalculados.reduce((acc, item) => acc + item.ipi_valor, 0)
  const totalIcms = itensCalculados.reduce((acc, item) => acc + item.icms_valor, 0)
  const totalSt = itensCalculados.reduce((acc, item) => acc + item.st_valor, 0)

  // Total geral NÃO inclui ICMS (apenas IPI e ST)
  const totalGeral = totalProdutosLiquido + totalIpi + totalSt

  const totais: TotaisVendaProcessada = {
    total_produtos_bruto: Number(totalProdutosBruto.toFixed(2)),
    desconto_total: Number(descontoTotal.toFixed(2)),
    total_produtos_liquido: Number(totalProdutosLiquido.toFixed(2)),
    total_ipi: Number(totalIpi.toFixed(2)),
    total_icms: Number(totalIcms.toFixed(2)), // Informativo
    total_st: Number(totalSt.toFixed(2)),
    total_geral: Number(totalGeral.toFixed(2))
  }

  console.log('📊 Venda processada com impostos:', {
    itens: itensCalculados.length,
    totais
  })

  return {
    itens: itensCalculados,
    totais
  }
}
