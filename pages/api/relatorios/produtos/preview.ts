import type { NextApiResponse } from 'next'
import { getSupabase } from '@/lib/supabase'
import { withSupabaseAuth, AuthenticatedRequest } from '@/lib/supabase-middleware'
import type { ReportConfiguration, ProdutosReportData } from '@/types/reports'

const handler = async (
  req: AuthenticatedRequest,
  res: NextApiResponse
) => {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Método não permitido'
    })
  }

  try {
    const config = req.body as ReportConfiguration
    const { filtros } = config

    if (!filtros?.periodo?.startDate || !filtros?.periodo?.endDate) {
      return res.status(400).json({
        success: false,
        message: 'Período é obrigatório'
      })
    }

    const { startDate, endDate } = filtros.periodo

    // Adicionar 1 dia à data final para incluir todo o dia limite
    const endDatePlusOne = new Date(endDate)
    endDatePlusOne.setDate(endDatePlusOne.getDate() + 1)
    const endDateAdjusted = endDatePlusOne.toISOString().split('T')[0]

    const supabase = getSupabase()

    // 1️⃣ Buscar todos os produtos
    let produtosQuery = supabase
      .from('produtos')
      .select('*')

    // Aplicar filtros de produtos
    if (filtros.produtoStatus === 'ativo') {
      produtosQuery = produtosQuery.eq('ativo', true)
    } else if (filtros.produtoStatus === 'inativo') {
      produtosQuery = produtosQuery.eq('ativo', false)
    }

    if (filtros.categorias && filtros.categorias.length > 0) {
      produtosQuery = produtosQuery.in('categoria', filtros.categorias)
    }

    const { data: produtos, error: produtosError } = await produtosQuery

    if (produtosError) {
      console.error('[produtos-preview] Erro ao buscar produtos:', produtosError)
      return res.status(500).json({
        success: false,
        message: 'Erro ao buscar produtos: ' + produtosError.message
      })
    }

    // 2️⃣ Buscar vendas do período para calcular produtos vendidos
    const { data: vendas, error: vendasError } = await supabase
      .from('vendas')
      .select(`
        id,
        data_venda,
        valor_final,
        status,
        itens:vendas_itens(
          id,
          produto_id,
          quantidade,
          preco_unitario,
          subtotal,
          subtotal_bruto,
          subtotal_liquido,
          produto:produtos(
            id,
            nome,
            preco_custo,
            categoria
          )
        )
      `)
      .gte('data_venda', startDate)
      .lt('data_venda', endDateAdjusted) // Incluir até o final do dia limite
      .neq('status', 'cancelado') // Não contar vendas canceladas

    if (vendasError) {
      console.error('[produtos-preview] Erro ao buscar vendas:', vendasError)
      return res.status(500).json({
        success: false,
        message: 'Erro ao buscar vendas: ' + vendasError.message
      })
    }

    // 3️⃣ Calcular métricas
    const totalProdutos = produtos?.length || 0
    const produtosAtivos = produtos?.filter(p => p.ativo).length || 0

    // Produtos com estoque baixo
    const produtosBaixoEstoque = produtos?.filter(
      p => p.estoque <= p.estoque_minimo && p.ativo
    ) || []

    // Criar um Set de IDs de produtos válidos baseado nos filtros aplicados
    const produtosValidosIds = new Set(produtos?.map(p => p.id) || [])

    // 4️⃣ Calcular vendas por produto
    const vendasPorProduto = new Map<number, {
      produtoId: number
      produtoNome: string
      quantidadeVendida: number
      faturamento: number
      custo: number
      margem: number
      categoria: string
    }>()

    let itemsComProblema = 0

    vendas?.forEach((venda) => {
      venda.itens?.forEach((item) => {
        if (!item.produto) return

        // Handle produto being an array (Supabase quirk)
        const produto = Array.isArray(item.produto) ? item.produto[0] : item.produto
        if (!produto) return

        const produtoId = item.produto_id
        
        // ✅ FILTRO: Só processar produtos que passaram pelos filtros iniciais
        if (!produtosValidosIds.has(produtoId)) {
          return
        }

        const existing = vendasPorProduto.get(produtoId)

        // Calcular faturamento com fallbacks apropriados
        // Prioridade: subtotal_liquido > subtotal_bruto > preco_unitario * quantidade
        let faturamento = 0
        let caminho = ''

        // Tentar subtotal_liquido primeiro (valor mais preciso)
        if (item.subtotal_liquido !== null && item.subtotal_liquido !== undefined && item.subtotal_liquido !== 0) {
          faturamento = item.subtotal_liquido
          caminho = 'subtotal_liquido'
        } 
        // Se subtotal_liquido é 0 ou null, tentar subtotal_bruto
        else if (item.subtotal_bruto !== null && item.subtotal_bruto !== undefined && item.subtotal_bruto !== 0) {
          faturamento = item.subtotal_bruto
          caminho = 'subtotal_bruto'
        } 
        // Se ambos são 0 ou null, usar preco_unitario * quantidade
        else if (item.preco_unitario !== null && item.preco_unitario !== undefined && item.preco_unitario !== 0) {
          faturamento = item.preco_unitario * item.quantidade
          caminho = 'preco_unitario'
        }
        // Se todos são 0 ou null, tentar buscar do campo subtotal antigo
        else if (item.subtotal !== null && item.subtotal !== undefined && item.subtotal !== 0) {
          faturamento = item.subtotal
          caminho = 'subtotal_legacy'
        }
        else {
          caminho = 'SEM_PRECO'
        }

        // LOG DETALHADO para produtos com problema
        if (faturamento === 0 && item.quantidade > 0) {
          itemsComProblema++
          console.log('🔍 [produtos-preview] Item com faturamento ZERO:', {
            venda_id: venda.id,
            produto_id: produtoId,
            produto_nome: produto.nome,
            quantidade: item.quantidade,
            caminho_usado: caminho,
            item_dados: {
              subtotal: item.subtotal,
              subtotal_liquido: item.subtotal_liquido,
              subtotal_bruto: item.subtotal_bruto,
              preco_unitario: item.preco_unitario,
            },
            faturamento_calculado: faturamento
          })
        }

        const custo = (produto.preco_custo || 0) * item.quantidade
        const lucro = faturamento - custo
        const margem = faturamento > 0 ? (lucro / faturamento) * 100 : 0

        if (existing) {
          existing.quantidadeVendida += item.quantidade
          existing.faturamento += faturamento
          existing.custo += custo
          existing.margem = existing.faturamento > 0
            ? ((existing.faturamento - existing.custo) / existing.faturamento) * 100
            : 0
        } else {
          vendasPorProduto.set(produtoId, {
            produtoId,
            produtoNome: produto.nome,
            quantidadeVendida: item.quantidade,
            faturamento,
            custo,
            margem,
            categoria: produto.categoria || 'Sem categoria'
          })
        }
      })
    })

    if (itemsComProblema > 0) {
      console.warn(`⚠️ [produtos-preview] Total de itens com faturamento zero: ${itemsComProblema}`)
    }

    // 5️⃣ Ordenar produtos
    const produtosVendidosArray = Array.from(vendasPorProduto.values())

    // Top 10 mais vendidos (por quantidade)
    const produtosMaisVendidos = produtosVendidosArray
      .sort((a, b) => b.quantidadeVendida - a.quantidadeVendida)
      .slice(0, 10)
      .map(p => ({
        produtoId: p.produtoId,
        produtoNome: p.produtoNome,
        quantidadeVendida: p.quantidadeVendida,
        faturamento: p.faturamento,
        margem: p.margem
      }))

    // Top 10 menos vendidos (produtos que venderam pouco)
    const produtosMenosVendidos = produtosVendidosArray
      .filter(p => p.quantidadeVendida > 0) // Apenas produtos que venderam algo
      .sort((a, b) => a.quantidadeVendida - b.quantidadeVendida)
      .slice(0, 10)
      .map(p => ({
        produtoId: p.produtoId,
        produtoNome: p.produtoNome,
        quantidadeVendida: p.quantidadeVendida,
        faturamento: p.faturamento
      }))

    // 6️⃣ Agrupar por categoria
    const categoriaMap = new Map<string, { quantidade: number; faturamento: number }>()

    produtosVendidosArray.forEach(p => {
      const categoria = p.categoria || 'Sem categoria'
      const existing = categoriaMap.get(categoria)

      if (existing) {
        existing.quantidade += p.quantidadeVendida
        existing.faturamento += p.faturamento
      } else {
        categoriaMap.set(categoria, {
          quantidade: p.quantidadeVendida,
          faturamento: p.faturamento
        })
      }
    })

    const produtosPorCategoria = Array.from(categoriaMap.entries())
      .map(([categoria, dados]) => ({
        categoria,
        quantidade: dados.quantidade,
        faturamento: dados.faturamento
      }))
      .sort((a, b) => b.faturamento - a.faturamento)

    // 7️⃣ Calcular métricas gerais
    const faturamentoTotal = produtosVendidosArray.reduce((sum, p) => sum + p.faturamento, 0)
    const margemMedia = produtosVendidosArray.length > 0
      ? produtosVendidosArray.reduce((sum, p) => sum + p.margem, 0) / produtosVendidosArray.length
      : 0

    // 8️⃣ Produtos com baixo estoque (lista detalhada)
    const produtosBaixoEstoqueList = produtosBaixoEstoque
      .map(p => ({
        produtoId: p.id,
        produtoNome: p.nome,
        estoqueAtual: p.estoque,
        estoqueMinimo: p.estoque_minimo
      }))
      .sort((a, b) => (a.estoqueAtual - a.estoqueMinimo) - (b.estoqueAtual - b.estoqueMinimo))
      .slice(0, 20) // Limitar a 20 produtos

    // 9️⃣ Montar resposta
    const data: ProdutosReportData = {
      resumo: {
        totalProdutos,
        produtosAtivos,
        produtosBaixoEstoque: produtosBaixoEstoque.length,
        faturamentoTotal,
        margemMedia
      },
      produtosMaisVendidos,
      produtosMenosVendidos,
      produtosBaixoEstoque: produtosBaixoEstoqueList,
      produtosPorCategoria
    }

    return res.status(200).json({
      success: true,
      data,
      totalRegistros: totalProdutos
    })

  } catch (error) {
    console.error('[produtos-preview] Erro:', error)
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Erro ao gerar preview de produtos'
    })
  }
}

export default withSupabaseAuth(handler)
