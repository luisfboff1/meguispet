import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import type { ReportConfiguration, ProdutosReportData } from '@/types/reports'
import type { Produto, ItemVenda, Venda } from '@/types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const config = req.body as ReportConfiguration
    const { filtros } = config

    if (!filtros?.periodo?.startDate || !filtros?.periodo?.endDate) {
      return res.status(400).json({ error: 'Período é obrigatório' })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

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
      console.error('Erro ao buscar produtos:', produtosError)
      return res.status(500).json({ error: 'Erro ao buscar produtos' })
    }

    // 2️⃣ Buscar vendas do período para calcular produtos vendidos
    const { data: vendas, error: vendasError } = await supabase
      .from('vendas')
      .select(`
        id,
        data_venda,
        valor_final,
        status,
        itens:itens_venda(
          id,
          produto_id,
          quantidade,
          preco_unitario,
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
      .gte('data_venda', filtros.periodo.startDate)
      .lte('data_venda', filtros.periodo.endDate)
      .neq('status', 'cancelado') // Não contar vendas canceladas

    if (vendasError) {
      console.error('Erro ao buscar vendas:', vendasError)
      return res.status(500).json({ error: 'Erro ao buscar vendas' })
    }

    // 3️⃣ Calcular métricas
    const totalProdutos = produtos?.length || 0
    const produtosAtivos = produtos?.filter(p => p.ativo).length || 0

    // Produtos com estoque baixo
    const produtosBaixoEstoque = produtos?.filter(
      p => p.estoque <= p.estoque_minimo && p.ativo
    ) || []

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

    vendas?.forEach((venda) => {
      venda.itens?.forEach((item) => {
        if (!item.produto) return
        
        // Handle produto being an array (Supabase quirk)
        const produto = Array.isArray(item.produto) ? item.produto[0] : item.produto
        if (!produto) return

        const produtoId = item.produto_id
        const existing = vendasPorProduto.get(produtoId)

        const faturamento = item.subtotal_liquido || item.preco_unitario * item.quantidade
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
    console.error('Erro ao gerar preview de produtos:', error)
    return res.status(500).json({
      error: 'Erro ao gerar preview de produtos',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    })
  }
}
