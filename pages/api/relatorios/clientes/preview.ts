import type { NextApiResponse } from 'next'
import { withSupabaseAuth, AuthenticatedRequest } from '@/lib/supabase-middleware'
import type { ClientesReportData, ReportConfiguration } from '@/types/reports'

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Método não permitido'
    })
  }

  try {
    const config = req.body as ReportConfiguration
    const supabase = req.supabaseClient

    if (!config.filtros?.periodo) {
      return res.status(400).json({
        success: false,
        message: 'Período é obrigatório'
      })
    }

    const { startDate, endDate } = config.filtros.periodo
    const endDatePlusOne = new Date(endDate)
    endDatePlusOne.setDate(endDatePlusOne.getDate() + 1)
    const endDateAdjusted = endDatePlusOne.toISOString().split('T')[0]

    let clientesQuery = supabase
      .from('clientes_fornecedores')
      .select('id, nome, tipo, endereco, cidade, estado, cep, ativo, documento, created_at')
      .in('tipo', ['cliente', 'ambos'])

    if (config.filtros.clienteStatus === 'ativo') {
      clientesQuery = clientesQuery.eq('ativo', true)
    } else if (config.filtros.clienteStatus === 'inativo') {
      clientesQuery = clientesQuery.eq('ativo', false)
    }

    if (config.filtros.estado && config.filtros.estado.length > 0) {
      clientesQuery = clientesQuery.in('estado', config.filtros.estado)
    }

    if (config.filtros.cidade && config.filtros.cidade.length > 0) {
      clientesQuery = clientesQuery.in('cidade', config.filtros.cidade as unknown as string[])
    }

    const { data: clientes, error: clientesError } = await clientesQuery

    if (clientesError) throw clientesError

    const clientesIds = (clientes || []).map((cliente) => cliente.id)

    let vendas: Array<{
      id: number
      cliente_id: number | null
      data_venda: string
      valor_final: number
      total_produtos_liquido: number | null
      total_ipi: number | null
      total_st: number | null
      status: string
    }> = []

    if (clientesIds.length > 0) {
      let vendasQuery = supabase
        .from('vendas')
        .select('id, cliente_id, data_venda, valor_final, total_produtos_liquido, total_ipi, total_st, status')
        .in('cliente_id', clientesIds)
        .gte('data_venda', startDate)
        .lt('data_venda', endDateAdjusted)
        .neq('status', 'cancelado')

      if (config.filtros.clienteIds && config.filtros.clienteIds.length > 0) {
        vendasQuery = vendasQuery.in('cliente_id', config.filtros.clienteIds)
      }

      const { data: vendasData, error: vendasError } = await vendasQuery

      if (vendasError) throw vendasError
      vendas = vendasData || []
    }

    const clientesMap = new Map((clientes || []).map((cliente) => [cliente.id, cliente]))
    const salesByClient = new Map<number, {
      totalCompras: number
      quantidadeCompras: number
      ultimaCompra: string
    }>()

    vendas.forEach((venda) => {
      if (!venda.cliente_id) return
      const faturamento = venda.total_produtos_liquido || (venda.valor_final - (venda.total_ipi || 0) - (venda.total_st || 0))
      const current = salesByClient.get(venda.cliente_id) || {
        totalCompras: 0,
        quantidadeCompras: 0,
        ultimaCompra: '',
      }

      salesByClient.set(venda.cliente_id, {
        totalCompras: current.totalCompras + faturamento,
        quantidadeCompras: current.quantidadeCompras + 1,
        ultimaCompra: !current.ultimaCompra || venda.data_venda > current.ultimaCompra
          ? venda.data_venda
          : current.ultimaCompra,
      })
    })

    const filteredClientes = (clientes || []).filter((cliente) => {
      if (!config.filtros.tipoCliente || config.filtros.tipoCliente === 'todos') return true
      const documento = cliente.documento?.replace(/\D/g, '') || ''
      const inferredType = documento.length > 11 ? 'pj' : 'pf'
      return inferredType === config.filtros.tipoCliente
    })

    const totalClientes = filteredClientes.length
    const clientesAtivos = filteredClientes.filter((cliente) => cliente.ativo).length
    const novosClientes = filteredClientes.filter((cliente) => {
      const created = cliente.created_at?.split('T')[0]
      return created && created >= startDate && created <= endDateAdjusted
    }).length

    const faturamentoTotal = Array.from(salesByClient.values()).reduce((sum, item) => sum + item.totalCompras, 0)
    const totalComprasCount = Array.from(salesByClient.values()).reduce((sum, item) => sum + item.quantidadeCompras, 0)
    const ticketMedio = totalComprasCount > 0 ? faturamentoTotal / totalComprasCount : 0

    const topClientes = filteredClientes
      .map((cliente) => {
        const sales = salesByClient.get(cliente.id)
        return {
          clienteId: cliente.id,
          clienteNome: cliente.nome,
          totalCompras: sales?.totalCompras || 0,
          ticketMedio: sales && sales.quantidadeCompras > 0 ? sales.totalCompras / sales.quantidadeCompras : 0,
          ultimaCompra: sales?.ultimaCompra || '',
        }
      })
      .filter((cliente) => cliente.totalCompras > 0)
      .sort((a, b) => b.totalCompras - a.totalCompras)
      .slice(0, 10)

    const estadosMap = new Map<string, { quantidade: number; faturamento: number }>()
    filteredClientes.forEach((cliente) => {
      const key = cliente.estado || 'Sem UF'
      const sales = salesByClient.get(cliente.id)
      const current = estadosMap.get(key) || { quantidade: 0, faturamento: 0 }
      estadosMap.set(key, {
        quantidade: current.quantidade + 1,
        faturamento: current.faturamento + (sales?.totalCompras || 0),
      })
    })

    const clientesPorEstado = Array.from(estadosMap.entries())
      .map(([estado, valores]) => ({
        estado,
        quantidade: valores.quantidade,
        faturamento: valores.faturamento,
      }))
      .sort((a, b) => b.quantidade - a.quantidade)

    const novosClientesPorMesMap = new Map<string, number>()
    filteredClientes.forEach((cliente) => {
      const created = cliente.created_at
      if (!created) return
      const date = new Date(created)
      const monthKey = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '')
      novosClientesPorMesMap.set(monthKey, (novosClientesPorMesMap.get(monthKey) || 0) + 1)
    })

    const novosClientesPorMes = Array.from(novosClientesPorMesMap.entries()).map(([mes, quantidade]) => ({
      mes,
      quantidade,
    }))

    const clientesDetalhados = filteredClientes
      .map((cliente) => {
        const sales = salesByClient.get(cliente.id)
        return {
          id: cliente.id,
          nome: cliente.nome,
          tipo: cliente.tipo,
          documento: cliente.documento || '',
          endereco: cliente.endereco || '',
          cidade: cliente.cidade || '',
          estado: cliente.estado || '',
          cep: cliente.cep || '',
          totalCompras: sales?.totalCompras || 0,
          quantidadeCompras: sales?.quantidadeCompras || 0,
          ticketMedio: sales && sales.quantidadeCompras > 0 ? sales.totalCompras / sales.quantidadeCompras : 0,
          ultimaCompra: sales?.ultimaCompra || '',
          status: cliente.ativo ? 'ativo' : 'inativo',
        }
      })
      .sort((a, b) => b.totalCompras - a.totalCompras)

    const reportData: ClientesReportData = {
      resumo: {
        totalClientes,
        clientesAtivos,
        novosClientes,
        ticketMedio: Number(ticketMedio.toFixed(2)),
        faturamentoTotal: Number(faturamentoTotal.toFixed(2)),
      },
      novosClientesPorMes,
      topClientes,
      clientesPorEstado,
      clientesDetalhados,
    }

    return res.status(200).json({
      success: true,
      data: {
        resumo: reportData.resumo,
        dados: reportData,
        totalRegistros: reportData.clientesDetalhados.length,
      },
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Erro ao gerar preview do relatório',
    })
  }
}

export default withSupabaseAuth(handler)
