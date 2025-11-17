import type { NextApiRequest, NextApiResponse } from 'next'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import type { ReportConfiguration, ReportFormat, ProdutosReportData } from '@/types/reports'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { config, formato = 'pdf' } = req.body as {
      config: ReportConfiguration
      formato?: ReportFormat
    }

    if (!config?.filtros?.periodo?.startDate || !config?.filtros?.periodo?.endDate) {
      return res.status(400).json({ error: 'Período é obrigatório' })
    }

    // 1️⃣ Obter dados do relatório (chamar API de preview)
    const protocol = req.headers['x-forwarded-proto'] || 'http'
    const host = req.headers.host || 'localhost:3000'
    const baseUrl = `${protocol}://${host}`
    
    const previewResponse = await fetch(`${baseUrl}/api/relatorios/produtos/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': req.headers.cookie || '',
      },
      body: JSON.stringify(config)
    })

    if (!previewResponse.ok) {
      const errorData = await previewResponse.json()
      return res.status(previewResponse.status).json(errorData)
    }

    const previewData = await previewResponse.json()
    const data: ProdutosReportData = previewData.data

    const { startDate, endDate } = config.filtros.periodo
    const periodoStr = `${new Date(startDate).toLocaleDateString('pt-BR')} - ${new Date(endDate).toLocaleDateString('pt-BR')}`

    // 2️⃣ Gerar arquivo conforme formato
    switch (formato) {
      case 'pdf':
        return exportPDF(res, data, periodoStr)

      case 'excel':
        return exportExcel(res, data, periodoStr)

      case 'csv':
        return exportCSV(res, data, periodoStr)

      default:
        return res.status(400).json({ error: 'Formato inválido' })
    }

  } catch (error) {
    return res.status(500).json({
      error: 'Erro ao exportar relatório',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    })
  }
}

// 📄 Exportar PDF
function exportPDF(res: NextApiResponse, data: ProdutosReportData, periodo: string) {
  const doc = new jsPDF()

  // Título
  doc.setFontSize(18)
  doc.text('Relatório de Produtos', 14, 20)

  doc.setFontSize(11)
  doc.text(`Período: ${periodo}`, 14, 28)

  // Resumo Executivo
  doc.setFontSize(14)
  doc.text('Resumo Executivo', 14, 40)

  const resumoData = [
    ['Total de Produtos', data.resumo.totalProdutos.toString()],
    ['Produtos Ativos', data.resumo.produtosAtivos.toString()],
    ['Produtos Baixo Estoque', data.resumo.produtosBaixoEstoque.toString()],
    ['Faturamento Total', `R$ ${data.resumo.faturamentoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
    ['Margem Média', `${data.resumo.margemMedia.toFixed(2)}%`]
  ]

  autoTable(doc, {
    startY: 45,
    head: [['Métrica', 'Valor']],
    body: resumoData,
    theme: 'grid',
    headStyles: { fillColor: [74, 144, 226] }
  })

  // Top 10 Produtos Mais Vendidos
  const startYMaisVendidos = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 80
  const startYPosition = startYMaisVendidos + 10
  doc.setFontSize(14)
  doc.text('Top 10 Produtos Mais Vendidos', 14, startYPosition)

  const maisVendidosData = data.produtosMaisVendidos.map(p => [
    p.produtoNome,
    p.quantidadeVendida.toString(),
    `R$ ${p.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
    `${p.margem.toFixed(2)}%`
  ])

  autoTable(doc, {
    startY: startYPosition + 5,
    head: [['Produto', 'Qtd Vendida', 'Faturamento', 'Margem']],
    body: maisVendidosData,
    theme: 'striped',
    headStyles: { fillColor: [34, 197, 94] }
  })

  // Produtos com Baixo Estoque
  if (data.produtosBaixoEstoque.length > 0) {
    const startYBaixoEstoque = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 150
    const startYBaixoEstoquePosition = startYBaixoEstoque + 10

    // Adicionar nova página se necessário
    if (startYBaixoEstoquePosition > 250) {
      doc.addPage()
      doc.setFontSize(14)
      doc.text('Produtos com Baixo Estoque', 14, 20)

      const baixoEstoqueData = data.produtosBaixoEstoque.slice(0, 15).map(p => [
        p.produtoNome,
        p.estoqueAtual.toString(),
        p.estoqueMinimo.toString(),
        (p.estoqueAtual - p.estoqueMinimo).toString()
      ])

      autoTable(doc, {
        startY: 25,
        head: [['Produto', 'Estoque Atual', 'Estoque Mínimo', 'Diferença']],
        body: baixoEstoqueData,
        theme: 'striped',
        headStyles: { fillColor: [239, 68, 68] }
      })
    } else {
      doc.setFontSize(14)
      doc.text('Produtos com Baixo Estoque', 14, startYBaixoEstoquePosition)

      const baixoEstoqueData = data.produtosBaixoEstoque.slice(0, 15).map(p => [
        p.produtoNome,
        p.estoqueAtual.toString(),
        p.estoqueMinimo.toString(),
        (p.estoqueAtual - p.estoqueMinimo).toString()
      ])

      autoTable(doc, {
        startY: startYBaixoEstoquePosition + 5,
        head: [['Produto', 'Estoque Atual', 'Estoque Mínimo', 'Diferença']],
        body: baixoEstoqueData,
        theme: 'striped',
        headStyles: { fillColor: [239, 68, 68] }
      })
    }
  }

  // Gerar PDF como buffer
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="relatorio-produtos-${Date.now()}.pdf"`)
  return res.send(pdfBuffer)
}

// 📊 Exportar Excel
function exportExcel(res: NextApiResponse, data: ProdutosReportData, periodo: string) {
  const wb = XLSX.utils.book_new()

  // Aba 1: Resumo
  const resumoData = [
    ['Relatório de Produtos'],
    [`Período: ${periodo}`],
    [],
    ['Métrica', 'Valor'],
    ['Total de Produtos', data.resumo.totalProdutos],
    ['Produtos Ativos', data.resumo.produtosAtivos],
    ['Produtos Baixo Estoque', data.resumo.produtosBaixoEstoque],
    ['Faturamento Total', data.resumo.faturamentoTotal],
    ['Margem Média', `${data.resumo.margemMedia.toFixed(2)}%`]
  ]
  const wsResumo = XLSX.utils.aoa_to_sheet(resumoData)
  XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo')

  // Aba 2: Mais Vendidos
  const maisVendidosData = [
    ['Produto', 'Quantidade Vendida', 'Faturamento', 'Margem (%)'],
    ...data.produtosMaisVendidos.map(p => [
      p.produtoNome,
      p.quantidadeVendida,
      p.faturamento,
      p.margem.toFixed(2)
    ])
  ]
  const wsMaisVendidos = XLSX.utils.aoa_to_sheet(maisVendidosData)
  XLSX.utils.book_append_sheet(wb, wsMaisVendidos, 'Mais Vendidos')

  // Aba 3: Menos Vendidos
  if (data.produtosMenosVendidos.length > 0) {
    const menosVendidosData = [
      ['Produto', 'Quantidade Vendida', 'Faturamento'],
      ...data.produtosMenosVendidos.map(p => [
        p.produtoNome,
        p.quantidadeVendida,
        p.faturamento
      ])
    ]
    const wsMenosVendidos = XLSX.utils.aoa_to_sheet(menosVendidosData)
    XLSX.utils.book_append_sheet(wb, wsMenosVendidos, 'Menos Vendidos')
  }

  // Aba 4: Baixo Estoque
  if (data.produtosBaixoEstoque.length > 0) {
    const baixoEstoqueData = [
      ['Produto', 'Estoque Atual', 'Estoque Mínimo', 'Diferença'],
      ...data.produtosBaixoEstoque.map(p => [
        p.produtoNome,
        p.estoqueAtual,
        p.estoqueMinimo,
        p.estoqueAtual - p.estoqueMinimo
      ])
    ]
    const wsBaixoEstoque = XLSX.utils.aoa_to_sheet(baixoEstoqueData)
    XLSX.utils.book_append_sheet(wb, wsBaixoEstoque, 'Baixo Estoque')
  }

  // Aba 5: Por Categoria
  if (data.produtosPorCategoria.length > 0) {
    const categoriaData = [
      ['Categoria', 'Quantidade Vendida', 'Faturamento'],
      ...data.produtosPorCategoria.map(c => [
        c.categoria,
        c.quantidade,
        c.faturamento
      ])
    ]
    const wsCategoria = XLSX.utils.aoa_to_sheet(categoriaData)
    XLSX.utils.book_append_sheet(wb, wsCategoria, 'Por Categoria')
  }

  // Gerar Excel como buffer
  const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', `attachment; filename="relatorio-produtos-${Date.now()}.xlsx"`)
  return res.send(excelBuffer)
}

// 📋 Exportar CSV
function exportCSV(res: NextApiResponse, data: ProdutosReportData, periodo: string) {
  let csv = `Relatório de Produtos\n`
  csv += `Período: ${periodo}\n\n`

  // Resumo
  csv += `RESUMO EXECUTIVO\n`
  csv += `Total de Produtos,${data.resumo.totalProdutos}\n`
  csv += `Produtos Ativos,${data.resumo.produtosAtivos}\n`
  csv += `Produtos Baixo Estoque,${data.resumo.produtosBaixoEstoque}\n`
  csv += `Faturamento Total,${data.resumo.faturamentoTotal.toFixed(2)}\n`
  csv += `Margem Média,${data.resumo.margemMedia.toFixed(2)}%\n\n`

  // Mais Vendidos
  csv += `TOP 10 PRODUTOS MAIS VENDIDOS\n`
  csv += `Produto,Quantidade Vendida,Faturamento,Margem (%)\n`
  data.produtosMaisVendidos.forEach(p => {
    csv += `"${p.produtoNome}",${p.quantidadeVendida},${p.faturamento.toFixed(2)},${p.margem.toFixed(2)}\n`
  })
  csv += `\n`

  // Baixo Estoque
  if (data.produtosBaixoEstoque.length > 0) {
    csv += `PRODUTOS COM BAIXO ESTOQUE\n`
    csv += `Produto,Estoque Atual,Estoque Mínimo,Diferença\n`
    data.produtosBaixoEstoque.forEach(p => {
      csv += `"${p.produtoNome}",${p.estoqueAtual},${p.estoqueMinimo},${p.estoqueAtual - p.estoqueMinimo}\n`
    })
    csv += `\n`
  }

  // Por Categoria
  if (data.produtosPorCategoria.length > 0) {
    csv += `VENDAS POR CATEGORIA\n`
    csv += `Categoria,Quantidade Vendida,Faturamento\n`
    data.produtosPorCategoria.forEach(c => {
      csv += `"${c.categoria}",${c.quantidade},${c.faturamento.toFixed(2)}\n`
    })
  }

  const csvBuffer = Buffer.from(csv, 'utf-8')

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="relatorio-produtos-${Date.now()}.csv"`)
  return res.send(csvBuffer)
}
