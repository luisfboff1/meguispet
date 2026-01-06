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

    // 3. Buscar vendas do período para calcular faturamento e custos
    const { data: vendas } = await supabase
      .from('vendas')
      .select('valor_final, custo_total')
      .gte('data_venda', startDate)
      .lte('data_venda', endDate)

    // Faturamento total das vendas (mesmo cálculo do relatório de vendas)
    const faturamentoVendas = (vendas || []).reduce((sum, v) => sum + parseFloat(v.valor_final?.toString() || '0'), 0)

    // Custo total dos produtos vendidos
    const custoProdutos = (vendas || []).reduce((sum, v) => sum + parseFloat(v.custo_total?.toString() || '0'), 0)

    // 4. Cálculos DRE (nova estrutura)
    // Receita Bruta = APENAS vendas (não somar transações para evitar duplicação)
    const receitaBruta = faturamentoVendas

    // Deduções = Todas as despesas (por enquanto, depois será categorizado)
    const deducoes = despesaTotal

    // Receita Líquida = Receita Bruta - Deduções
    const receitaLiquida = receitaBruta - deducoes

    // Lucro Bruto = Receita Líquida - Custo dos Produtos
    const lucroBruto = receitaLiquida - custoProdutos

    // Lucro Líquido = Lucro Bruto (sem outras deduções por enquanto)
    const lucroLiquido = lucroBruto

    // Margem de Lucro
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

    // 8. Montar arrays de receitas e despesas detalhadas
    const receitasDetalhadas = receitas.map(t => ({
      id: t.id,
      data: t.data_transacao,
      descricao: t.descricao || 'Sem descrição',
      categoria: t.categoria_detalhe?.nome || t.categoria || 'Sem Categoria',
      valor: parseFloat(t.valor.toString()),
      tipo: t.tipo
    }))

    const despesasDetalhadas = despesas.map(t => ({
      id: t.id,
      data: t.data_transacao,
      descricao: t.descricao || 'Sem descrição',
      categoria: t.categoria_detalhe?.nome || t.categoria || 'Sem Categoria',
      valor: parseFloat(t.valor.toString()),
      tipo: t.tipo
    }))

    // 9. Validação: Comparar faturamento de vendas vs receitas de transações
    const validacao = {
      faturamentoVendas: parseFloat(faturamentoVendas.toFixed(2)),
      receitasTransacoes: parseFloat(receitaTotal.toFixed(2)),
      diferenca: parseFloat((faturamentoVendas - receitaTotal).toFixed(2))
    }

    // 10. Montar relatório completo
    const reportData: FinanceiroReportData = {
      resumo: {
        receitaTotal: parseFloat(receitaTotal.toFixed(2)),
        despesaTotal: parseFloat(despesaTotal.toFixed(2)),
        lucroBruto: parseFloat(lucroBruto.toFixed(2)),
        lucroLiquido: parseFloat(lucroLiquido.toFixed(2)),
        margemLucro: parseFloat(margemLucro.toFixed(2)),
        impostoTotal: 0, // Não mais usado, mas mantido para compatibilidade
      },
      receitasPorMes,
      receitasPorCategoria,
      despesasPorCategoria,
      receitasDetalhadas,
      despesasDetalhadas,
      dre: {
        receitaBruta: parseFloat(receitaBruta.toFixed(2)),
        deducoes: parseFloat(deducoes.toFixed(2)),
        receitaLiquida: parseFloat(receitaLiquida.toFixed(2)),
        custoProdutos: parseFloat(custoProdutos.toFixed(2)),
        lucroBruto: parseFloat(lucroBruto.toFixed(2)),
        lucroLiquido: parseFloat(lucroLiquido.toFixed(2)),
      },
      validacao,
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
