import type { NextApiResponse } from 'next'
import { withSupabaseAuth, AuthenticatedRequest } from '@/lib/supabase-middleware'
import { getSupabase } from '@/lib/supabase'
import type { ReportConfiguration, FinanceiroReportData } from '@/types/reports'

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Método não permitido'
    })
  }

  try {
    const config: ReportConfiguration = req.body

    if (!config.filtros?.periodo) {
      return res.status(400).json({
        success: false,
        message: 'Período é obrigatório'
      })
    }

    const { startDate, endDate } = config.filtros.periodo
    // Use authenticated supabase client from middleware to respect RLS policies
    const supabase = req.supabaseClient

    // 1. Buscar todas as transações do período
    const { data: transacoes, error: transacoesError } = await supabase
      .from('transacoes')
      .select(`
        *,
        categoria_detalhe:categorias_financeiras(id, nome, tipo, cor, icone)
      `)
      .gte('data_transacao', startDate)
      .lte('data_transacao', endDate)
      .order('data_transacao', { ascending: true })

    if (transacoesError) throw transacoesError

    // 2. Calcular totais
    const receitas = (transacoes || []).filter(t => t.tipo === 'receita')
    const despesas = (transacoes || []).filter(t => t.tipo === 'despesa')

    const receitaTotal = receitas.reduce((sum, t) => sum + parseFloat(t.valor.toString()), 0)
    const despesaTotal = despesas.reduce((sum, t) => sum + parseFloat(t.valor.toString()), 0)

    // 3. Buscar vendas do período para calcular custos e impostos
    const { data: vendas } = await supabase
      .from('vendas')
      .select('valor_final, custo_total, total_produtos_liquido, total_ipi, total_st, total_icms')
      .gte('data_venda', startDate)
      .lte('data_venda', endDate)

    const custoProdutos = (vendas || []).reduce((sum, v) => sum + parseFloat(v.custo_total?.toString() || '0'), 0)
    
    // Calcular impostos totais das vendas (IPI + ST)
    // IMPORTANTE: Impostos não fazem parte da receita da empresa, são pagos pelo cliente
    const impostosVendas = (vendas || []).reduce((sum, v) => {
      const ipi = parseFloat(v.total_ipi?.toString() || '0')
      const st = parseFloat(v.total_st?.toString() || '0')
      return sum + ipi + st
    }, 0)

    // 4. Cálculos DRE
    // Receita bruta SEM impostos (usar total_produtos_liquido ou valor_final - impostos)
    const receitaBrutaVendas = (vendas || []).reduce((sum, v) => {
      const receitaVenda = v.total_produtos_liquido || (v.valor_final - parseFloat(v.total_ipi?.toString() || '0') - parseFloat(v.total_st?.toString() || '0'))
      return sum + receitaVenda
    }, 0)
    
    // Somar com receitas de transações (que já estão sem impostos)
    const receitaBruta = receitaTotal + receitaBrutaVendas
    const deducoes = 0 // TODO: Implementar deduções (devoluções, descontos)
    const receitaLiquida = receitaBruta - deducoes
    const lucroBruto = receitaLiquida - custoProdutos

    // Separar despesas operacionais (excluindo custo de produtos)
    const despesasOperacionais = despesaTotal
    const lucroOperacional = lucroBruto - despesasOperacionais

    // Impostos são mostrados separadamente mas não reduzem a receita da empresa
    const impostos = impostosVendas
    const lucroLiquido = lucroOperacional
    const margemLucro = receitaBruta > 0 ? (lucroLiquido / receitaBruta) * 100 : 0

    // 5. Agrupar por mês
    const receitasPorMesMap: Record<string, { receita: number; despesa: number }> = {}

    ;(transacoes || []).forEach(t => {
      const data = new Date(t.data_transacao)
      const mesAno = data.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '')
      const mesKey = mesAno.charAt(0).toUpperCase() + mesAno.slice(1)

      if (!receitasPorMesMap[mesKey]) {
        receitasPorMesMap[mesKey] = { receita: 0, despesa: 0 }
      }

      const valor = parseFloat(t.valor.toString())
      if (t.tipo === 'receita') {
        receitasPorMesMap[mesKey].receita += valor
      } else {
        receitasPorMesMap[mesKey].despesa += valor
      }
    })

    const receitasPorMes = Object.entries(receitasPorMesMap).map(([mes, valores]) => ({
      mes,
      receita: valores.receita,
      despesa: valores.despesa,
      lucro: valores.receita - valores.despesa
    }))

    // 6. Agrupar receitas por categoria
    const receitasPorCategoriaMap: Record<string, number> = {}
    receitas.forEach(t => {
      const categoria = t.categoria_detalhe?.nome || t.categoria || 'Sem Categoria'
      receitasPorCategoriaMap[categoria] = (receitasPorCategoriaMap[categoria] || 0) + parseFloat(t.valor.toString())
    })

    const receitasPorCategoria = Object.entries(receitasPorCategoriaMap)
      .map(([categoria, valor]) => ({
        categoria,
        valor,
        percentual: receitaTotal > 0 ? (valor / receitaTotal) * 100 : 0
      }))
      .sort((a, b) => b.valor - a.valor)

    // 7. Agrupar despesas por categoria
    const despesasPorCategoriaMap: Record<string, number> = {}
    despesas.forEach(t => {
      const categoria = t.categoria_detalhe?.nome || t.categoria || 'Sem Categoria'
      despesasPorCategoriaMap[categoria] = (despesasPorCategoriaMap[categoria] || 0) + parseFloat(t.valor.toString())
    })

    const despesasPorCategoria = Object.entries(despesasPorCategoriaMap)
      .map(([categoria, valor]) => ({
        categoria,
        valor,
        percentual: despesaTotal > 0 ? (valor / despesaTotal) * 100 : 0
      }))
      .sort((a, b) => b.valor - a.valor)

    // 8. Montar relatório completo
    const reportData: FinanceiroReportData = {
      resumo: {
        receitaTotal: parseFloat(receitaTotal.toFixed(2)),
        despesaTotal: parseFloat(despesaTotal.toFixed(2)),
        lucroBruto: parseFloat(lucroBruto.toFixed(2)),
        lucroLiquido: parseFloat(lucroLiquido.toFixed(2)),
        margemLucro: parseFloat(margemLucro.toFixed(2)),
        impostoTotal: parseFloat(impostos.toFixed(2)),
      },
      receitasPorMes,
      receitasPorCategoria,
      despesasPorCategoria,
      dre: {
        receitaBruta: parseFloat(receitaBruta.toFixed(2)),
        deducoes: parseFloat(deducoes.toFixed(2)),
        receitaLiquida: parseFloat(receitaLiquida.toFixed(2)),
        custoProdutos: parseFloat(custoProdutos.toFixed(2)),
        lucroBruto: parseFloat(lucroBruto.toFixed(2)),
        despesasOperacionais: parseFloat(despesasOperacionais.toFixed(2)),
        lucroOperacional: parseFloat(lucroOperacional.toFixed(2)),
        impostos: parseFloat(impostos.toFixed(2)),
        lucroLiquido: parseFloat(lucroLiquido.toFixed(2)),
      },
    }

    return res.status(200).json({
      success: true,
      data: {
        dados: reportData,
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
