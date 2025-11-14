import type { NextApiResponse } from 'next'
import { getSupabase } from '@/lib/supabase'
import { withSupabaseAuth, AuthenticatedRequest } from '@/lib/supabase-middleware'
import type { ReportConfiguration } from '@/types/reports'
import type { VendasReportData } from '@/types/reports'

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Método não permitido'
    })
  }

  try {
    const supabase = getSupabase()
    const config: ReportConfiguration = req.body

    if (!config.filtros?.periodo) {
      return res.status(400).json({
        success: false,
        message: 'Período é obrigatório'
      })
    }

    const { startDate, endDate } = config.filtros.periodo

    // Base query com todos os dados necessários
    let query = supabase
      .from('vendas')
      .select(`
        id,
        numero_venda,
        data_venda,
        valor_total,
        valor_final,
        status,
        origem_venda,
        uf_destino,
        total_produtos_bruto,
        desconto_total,
        total_produtos_liquido,
        total_ipi,
        total_icms,
        total_st,
        cliente:clientes_fornecedores(id, nome, tipo),
        vendedor:vendedores(id, nome),
        forma_pagamento_detalhe:formas_pagamento(id, nome),
        itens:vendas_itens(
          id,
          produto_id,
          quantidade,
          preco_unitario,
          subtotal_bruto,
          desconto_proporcional,
          subtotal_liquido,
          ipi_valor,
          icms_valor,
          st_valor,
          total_item,
          produto:produtos(id, nome, preco_custo, categoria)
        )
      `)
      .gte('data_venda', startDate)
      .lte('data_venda', endDate)

    // Aplicar filtros adicionais
    if (config.filtros.status && config.filtros.status.length > 0) {
      query = query.in('status', config.filtros.status)
    }

    if (config.filtros.vendedorIds && config.filtros.vendedorIds.length > 0) {
      query = query.in('vendedor_id', config.filtros.vendedorIds)
    }

    if (config.filtros.clienteIds && config.filtros.clienteIds.length > 0) {
      query = query.in('cliente_id', config.filtros.clienteIds)
    }

    if (config.filtros.ufDestino && config.filtros.ufDestino.length > 0) {
      query = query.in('uf_destino', config.filtros.ufDestino)
    }

    if (config.filtros.origem && config.filtros.origem.length > 0) {
      query = query.in('origem_venda', config.filtros.origem)
    }

    const { data: vendas, error } = await query.order('data_venda', { ascending: false })

    if (error) {
      console.error('[preview] Erro ao buscar vendas:', error)
      throw error
    }

    if (!vendas || vendas.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          resumo: {
            totalVendas: 0,
            faturamentoTotal: 0,
            ticketMedio: 0,
            totalImpostos: 0,
            custoTotal: 0,
            margemLucro: 0,
          },
          vendasPorDia: [],
          vendasPorVendedor: [],
          vendasPorProduto: [],
          vendasDetalhadas: [],
        },
        totalRegistros: 0,
      })
    }

    // Calcular resumo
    const totalVendas = vendas.length
    const faturamentoTotal = vendas.reduce((sum, v) => sum + (v.valor_final || 0), 0)
    const ticketMedio = faturamentoTotal / totalVendas
    const totalIPI = vendas.reduce((sum, v) => sum + (v.total_ipi || 0), 0)
    const totalST = vendas.reduce((sum, v) => sum + (v.total_st || 0), 0)
    const totalICMS = vendas.reduce((sum, v) => sum + (v.total_icms || 0), 0)
    const totalImpostos = totalIPI + totalST

    // Calcular custo total (soma dos custos dos produtos vendidos)
    let custoTotal = 0
    vendas.forEach(venda => {
      if (venda.itens) {
        venda.itens.forEach((item: any) => {
          const precoCusto = item.produto?.preco_custo || 0
          custoTotal += precoCusto * item.quantidade
        })
      }
    })

    // Calcular margem de lucro
    const lucroTotal = faturamentoTotal - custoTotal - totalImpostos
    const margemLucro = faturamentoTotal > 0 ? (lucroTotal / faturamentoTotal) * 100 : 0

    // Vendas por dia
    const vendasPorDiaMap = new Map<string, { quantidade: number; faturamento: number }>()
    vendas.forEach(venda => {
      const data = venda.data_venda.split('T')[0]
      const existing = vendasPorDiaMap.get(data) || { quantidade: 0, faturamento: 0 }
      vendasPorDiaMap.set(data, {
        quantidade: existing.quantidade + 1,
        faturamento: existing.faturamento + (venda.valor_final || 0),
      })
    })

    const vendasPorDia = Array.from(vendasPorDiaMap.entries())
      .map(([data, valores]) => ({
        data,
        quantidade: valores.quantidade,
        faturamento: valores.faturamento,
      }))
      .sort((a, b) => a.data.localeCompare(b.data))

    // Vendas por vendedor
    const vendasPorVendedorMap = new Map<number, { nome: string; quantidade: number; faturamento: number }>()
    vendas.forEach(venda => {
      if (venda.vendedor) {
        const vendedorId = venda.vendedor.id
        const vendedorNome = venda.vendedor.nome
        const existing = vendasPorVendedorMap.get(vendedorId) || { nome: vendedorNome, quantidade: 0, faturamento: 0 }
        vendasPorVendedorMap.set(vendedorId, {
          nome: vendedorNome,
          quantidade: existing.quantidade + 1,
          faturamento: existing.faturamento + (venda.valor_final || 0),
        })
      }
    })

    const vendasPorVendedor = Array.from(vendasPorVendedorMap.entries())
      .map(([vendedorId, valores]) => ({
        vendedorId,
        vendedorNome: valores.nome,
        quantidade: valores.quantidade,
        faturamento: valores.faturamento,
      }))
      .sort((a, b) => b.faturamento - a.faturamento)

    // Vendas por produto (Top 10)
    const vendasPorProdutoMap = new Map<number, { nome: string; quantidade: number; faturamento: number }>()
    vendas.forEach(venda => {
      if (venda.itens) {
        venda.itens.forEach((item: any) => {
          if (item.produto) {
            const produtoId = item.produto.id
            const produtoNome = item.produto.nome
            const existing = vendasPorProdutoMap.get(produtoId) || { nome: produtoNome, quantidade: 0, faturamento: 0 }
            vendasPorProdutoMap.set(produtoId, {
              nome: produtoNome,
              quantidade: existing.quantidade + item.quantidade,
              faturamento: existing.faturamento + (item.total_item || 0),
            })
          }
        })
      }
    })

    const vendasPorProduto = Array.from(vendasPorProdutoMap.entries())
      .map(([produtoId, valores]) => ({
        produtoId,
        produtoNome: valores.nome,
        quantidade: valores.quantidade,
        faturamento: valores.faturamento,
      }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 10)

    // Vendas detalhadas (limitado a 100 para preview)
    const vendasDetalhadas = vendas.slice(0, 100).map(venda => ({
      id: venda.id,
      data: venda.data_venda,
      cliente: venda.cliente?.nome || 'Cliente não informado',
      vendedor: venda.vendedor?.nome || 'Vendedor não informado',
      produtos: venda.itens?.length || 0,
      subtotal: venda.total_produtos_liquido || 0,
      impostos: (venda.total_ipi || 0) + (venda.total_st || 0),
      total: venda.valor_final || 0,
      status: venda.status,
    }))

    const reportData: VendasReportData = {
      resumo: {
        totalVendas,
        faturamentoTotal: Math.round(faturamentoTotal * 100) / 100,
        ticketMedio: Math.round(ticketMedio * 100) / 100,
        totalImpostos: Math.round(totalImpostos * 100) / 100,
        custoTotal: Math.round(custoTotal * 100) / 100,
        margemLucro: Math.round(margemLucro * 100) / 100,
      },
      vendasPorDia,
      vendasPorVendedor,
      vendasPorProduto,
      vendasDetalhadas,
    }

    return res.status(200).json({
      success: true,
      data: {
        resumo: reportData.resumo,
        dados: reportData,
        totalRegistros: totalVendas,
      },
    })

  } catch (error: any) {
    console.error('[preview] Erro:', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Erro ao gerar preview do relatório',
    })
  }
}

export default withSupabaseAuth(handler)
