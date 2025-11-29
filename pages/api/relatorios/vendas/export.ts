import type { NextApiResponse } from 'next'
import { withSupabaseAuth, AuthenticatedRequest } from '@/lib/supabase-middleware'
import type { ReportConfiguration } from '@/types/reports'
import type { VendasReportData } from '@/types/reports'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { formatLocalDate } from '@/lib/utils'

interface ExportRequestBody extends ReportConfiguration {
  formato: 'pdf' | 'excel' | 'csv'
  chartImages?: {
    temporal?: { image: string; width: number; height: number }
    vendedor?: { image: string; width: number; height: number }
  }
}

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Método não permitido'
    })
  }

  try {
    const body: ExportRequestBody = req.body

    if (!body.filtros?.periodo) {
      return res.status(400).json({
        success: false,
        message: 'Período é obrigatório'
      })
    }

    // Buscar dados do relatório
    const protocol = req.headers['x-forwarded-proto'] || 'http'
    const host = req.headers.host || 'localhost:3000'
    const baseUrl = `${protocol}://${host}`
    
    const previewResponse = await fetch(`${baseUrl}/api/relatorios/vendas/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': req.headers.cookie || '',
      },
      body: JSON.stringify(body),
    })

    if (!previewResponse.ok) {
      throw new Error('Erro ao buscar dados do relatório')
    }

    const previewData = await previewResponse.json()

    if (!previewData.success) {
      throw new Error(previewData.message || 'Erro ao buscar dados do relatório')
    }

    const reportData: VendasReportData = previewData.data.dados

    // Exportar conforme formato solicitado
    switch (body.formato) {
      case 'pdf':
        return exportPDF(reportData, body, res)
      case 'excel':
        return exportExcel(reportData, body, res)
      case 'csv':
        return exportCSV(reportData, body, res)
      default:
        return res.status(400).json({
          success: false,
          message: 'Formato inválido'
        })
    }

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Erro ao exportar relatório',
    })
  }
}

// Helper functions para tabelas de fallback
function addTemporalDataTable(doc: jsPDF, data: VendasReportData, startY: number) {
  autoTable(doc, {
    startY: startY + 15,
    head: [['Data', 'Quantidade', 'Faturamento']],
    body: data.vendasPorDia.map(v => [
      formatLocalDate(v.data),
      v.quantidade.toString(),
      `R$ ${v.faturamento.toFixed(2)}`,
    ]),
    styles: { fontSize: 7 },
    headStyles: { fillColor: [59, 130, 246] },
  })
}

function addVendedorDataTable(doc: jsPDF, data: VendasReportData, startY: number) {
  autoTable(doc, {
    startY: startY + 15,
    head: [['Vendedor', 'Quantidade', 'Faturamento']],
    body: data.vendasPorVendedor.slice(0, 5).map(v => [
      v.vendedorNome,
      v.quantidade.toString(),
      `R$ ${v.faturamento.toFixed(2)}`,
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [16, 185, 129] },
  })
}

function exportPDF(data: VendasReportData, config: ExportRequestBody, res: NextApiResponse) {
  const doc = new jsPDF()
  const { periodo } = config.filtros
  const { graficos = {} } = config

  // Título
  doc.setFontSize(18)
  doc.text('Relatório de Vendas', 14, 20)

  // Período
  doc.setFontSize(10)
  doc.text(`Período: ${periodo.startDate} a ${periodo.endDate}`, 14, 28)

  // Resumo
  doc.setFontSize(14)
  doc.text('Resumo', 14, 38)

  doc.setFontSize(10)
  const resumoY = 45
  doc.text(`Total de Vendas: ${data.resumo.totalVendas}`, 14, resumoY)
  doc.text(`Faturamento Total (sem impostos): R$ ${data.resumo.faturamentoTotal.toFixed(2)}`, 14, resumoY + 7)
  doc.text(`Ticket Médio (sem impostos): R$ ${data.resumo.ticketMedio.toFixed(2)}`, 14, resumoY + 14)
  doc.text(`Total Impostos (pagos pelo cliente): R$ ${data.resumo.totalImpostos.toFixed(2)}`, 14, resumoY + 21)
  doc.text(`Custo Total: R$ ${data.resumo.custoTotal.toFixed(2)}`, 14, resumoY + 28)
  doc.text(`Margem de Lucro (sem impostos): ${data.resumo.margemLucro.toFixed(2)}%`, 14, resumoY + 35)

  // Tabela de vendas detalhadas
  autoTable(doc, {
    startY: resumoY + 45,
    head: [['Data', 'Cliente', 'Vendedor', 'Qtd Prod', 'Subtotal', 'Líquido', 'IPI', 'ICMS', 'ST', 'Total', 'Status']],
    body: data.vendasDetalhadas.map(v => [
      formatLocalDate(v.data),
      v.cliente,
      v.vendedor,
      v.produtos.toString(),
      `R$ ${v.subtotal.toFixed(2)}`,
      `R$ ${v.valorLiquido.toFixed(2)}`,
      `R$ ${v.ipi.toFixed(2)}`,
      `R$ ${v.icms.toFixed(2)}`,
      `R$ ${v.st.toFixed(2)}`,
      `R$ ${v.total.toFixed(2)}`,
      v.status,
    ]),
    styles: { fontSize: 7 },
    headStyles: { fillColor: [41, 128, 185] },
  })

  // Top 10 Produtos
  if (data.vendasPorProduto.length > 0) {
    const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? resumoY + 45

    doc.setFontSize(14)
    doc.text('Top 10 Produtos', 14, finalY + 15)

    autoTable(doc, {
      startY: finalY + 20,
      head: [['Produto', 'Quantidade', 'Preço Custo', 'Preço Venda', 'Faturamento', 'Lucro %']],
      body: data.vendasPorProduto.map(p => [
        p.produtoNome,
        p.quantidade.toString(),
        `R$ ${(p.precoCusto || 0).toFixed(2)}`,
        `R$ ${(p.precoVenda || 0).toFixed(2)}`,
        `R$ ${p.faturamento.toFixed(2)}`,
        `${(p.margemLucro || 0).toFixed(1)}%`,
      ]),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [39, 174, 96] },
    })
  }

  // Gráficos selecionados (como imagens PNG se disponíveis, senão como tabelas)
  let currentY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? resumoY + 45
  const { chartImages } = config

  // Gráfico Temporal
  if (graficos.incluirGraficoTemporal === true && data.vendasPorDia.length > 0) {
    // Adicionar nova página se necessário
    if (currentY > 200) {
      doc.addPage()
      currentY = 20
    }

    doc.setFontSize(14)
    doc.text('Vendas ao Longo do Tempo', 14, currentY + 10)

    if (chartImages?.temporal) {
      // Incluir imagem do gráfico mantendo proporção
      try {
        const { image, width: imgWidth, height: imgHeight } = chartImages.temporal

        // Calcular dimensões mantendo proporção
        const maxWidth = 170 // largura máxima em mm
        const aspectRatio = imgHeight / imgWidth
        const width = maxWidth
        const height = maxWidth * aspectRatio

        doc.addImage(image, 'PNG', 14, currentY + 15, width, height)
        currentY += height + 20
      } catch (error) {
        // Fallback para tabela se a imagem falhar
        addTemporalDataTable(doc, data, currentY)
        currentY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? currentY + 15
      }
    } else {
      // Fallback para tabela
      addTemporalDataTable(doc, data, currentY)
      currentY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? currentY + 15
    }
  }

  // Gráfico por Vendedor
  if (graficos.incluirGraficoVendedor === true && data.vendasPorVendedor.length > 0) {
    // Adicionar nova página se necessário
    if (currentY > 200) {
      doc.addPage()
      currentY = 20
    }

    doc.setFontSize(14)
    doc.text('Vendas por Vendedor', 14, currentY + 10)

    if (chartImages?.vendedor) {
      // Incluir imagem do gráfico mantendo proporção
      try {
        const { image, width: imgWidth, height: imgHeight } = chartImages.vendedor

        // Calcular dimensões mantendo proporção
        const maxWidth = 170 // largura máxima em mm
        const aspectRatio = imgHeight / imgWidth
        const width = maxWidth
        const height = maxWidth * aspectRatio

        doc.addImage(image, 'PNG', 14, currentY + 15, width, height)
        currentY += height + 20
      } catch (error) {
        // Fallback para tabela se a imagem falhar
        addVendedorDataTable(doc, data, currentY)
        currentY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? currentY + 15
      }
    } else {
      // Fallback para tabela
      addVendedorDataTable(doc, data, currentY)
      currentY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? currentY + 15
    }
  }

  const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename=relatorio_vendas_${periodo.startDate}_${periodo.endDate}.pdf`)
  return res.status(200).send(pdfBuffer)
}

function exportExcel(data: VendasReportData, config: ExportRequestBody, res: NextApiResponse) {
  const workbook = XLSX.utils.book_new()
  const { periodo } = config.filtros

  // Aba 1: Resumo
  const resumoData = [
    ['Relatório de Vendas'],
    [`Período: ${periodo.startDate} a ${periodo.endDate}`],
    ['* Faturamento e margem calculados SEM impostos (pagos pelo cliente)'],
    [],
    ['Métrica', 'Valor'],
    ['Total de Vendas', data.resumo.totalVendas],
    ['Faturamento Total (sem impostos)', `R$ ${data.resumo.faturamentoTotal.toFixed(2)}`],
    ['Ticket Médio (sem impostos)', `R$ ${data.resumo.ticketMedio.toFixed(2)}`],
    ['Total Impostos (pagos pelo cliente)', `R$ ${data.resumo.totalImpostos.toFixed(2)}`],
    ['Custo Total', `R$ ${data.resumo.custoTotal.toFixed(2)}`],
    ['Margem de Lucro (sem impostos)', `${data.resumo.margemLucro.toFixed(2)}%`],
  ]
  const resumoSheet = XLSX.utils.aoa_to_sheet(resumoData)
  XLSX.utils.book_append_sheet(workbook, resumoSheet, 'Resumo')

  // Aba 2: Vendas Detalhadas
  const vendasData = [
    ['Data', 'Cliente', 'Vendedor', 'Produtos', 'Subtotal', 'Valor Líquido', 'IPI', 'ICMS', 'ST', 'Total Impostos', 'Total', 'Status'],
    ...data.vendasDetalhadas.map(v => [
      formatLocalDate(v.data),
      v.cliente,
      v.vendedor,
      v.produtos,
      v.subtotal,
      v.valorLiquido,
      v.ipi,
      v.icms,
      v.st,
      v.impostos,
      v.total,
      v.status,
    ])
  ]
  const vendasSheet = XLSX.utils.aoa_to_sheet(vendasData)
  XLSX.utils.book_append_sheet(workbook, vendasSheet, 'Vendas')

  // Aba 3: Produtos
  if (data.vendasPorProduto.length > 0) {
    const produtosData = [
      ['Produto', 'Quantidade', 'Preço Custo', 'Preço Venda', 'Faturamento', 'Margem Lucro %'],
      ...data.vendasPorProduto.map(p => [
        p.produtoNome,
        p.quantidade,
        p.precoCusto || 0,
        p.precoVenda || 0,
        p.faturamento,
        p.margemLucro || 0,
      ])
    ]
    const produtosSheet = XLSX.utils.aoa_to_sheet(produtosData)
    XLSX.utils.book_append_sheet(workbook, produtosSheet, 'Produtos')
  }

  // Aba 4: Vendedores
  if (data.vendasPorVendedor.length > 0) {
    const vendedoresData = [
      ['Vendedor', 'Quantidade', 'Faturamento'],
      ...data.vendasPorVendedor.map(v => [
        v.vendedorNome,
        v.quantidade,
        v.faturamento,
      ])
    ]
    const vendedoresSheet = XLSX.utils.aoa_to_sheet(vendedoresData)
    XLSX.utils.book_append_sheet(workbook, vendedoresSheet, 'Vendedores')
  }

  const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', `attachment; filename=relatorio_vendas_${periodo.startDate}_${periodo.endDate}.xlsx`)
  return res.status(200).send(excelBuffer)
}

function exportCSV(data: VendasReportData, config: ExportRequestBody, res: NextApiResponse) {
  const csvLines: string[] = []
  const { periodo } = config.filtros

  // Cabeçalho
  csvLines.push('Relatório de Vendas')
  csvLines.push(`Período: ${periodo.startDate} a ${periodo.endDate}`)
  csvLines.push('')

  // Resumo
  csvLines.push('Resumo')
  csvLines.push('Métrica,Valor')
  csvLines.push(`Total de Vendas,${data.resumo.totalVendas}`)
  csvLines.push(`Faturamento Total,R$ ${data.resumo.faturamentoTotal.toFixed(2)}`)
  csvLines.push(`Ticket Médio,R$ ${data.resumo.ticketMedio.toFixed(2)}`)
  csvLines.push(`Total Impostos,R$ ${data.resumo.totalImpostos.toFixed(2)}`)
  csvLines.push(`Custo Total,R$ ${data.resumo.custoTotal.toFixed(2)}`)
  csvLines.push(`Margem de Lucro,${data.resumo.margemLucro.toFixed(2)}%`)
  csvLines.push('')

  // Vendas
  csvLines.push('Vendas Detalhadas')
  csvLines.push('Data,Cliente,Vendedor,Produtos,Subtotal,Valor Líquido,IPI,ICMS,ST,Total Impostos,Total,Status')
  data.vendasDetalhadas.forEach(v => {
    csvLines.push(
      `${formatLocalDate(v.data)},${v.cliente},${v.vendedor},${v.produtos},${v.subtotal},${v.valorLiquido},${v.ipi},${v.icms},${v.st},${v.impostos},${v.total},${v.status}`
    )
  })
  csvLines.push('')

  // Produtos
  if (data.vendasPorProduto.length > 0) {
    csvLines.push('Produtos Mais Vendidos')
    csvLines.push('Produto,Quantidade,Preço Custo,Preço Venda,Faturamento,Margem Lucro %')
    data.vendasPorProduto.forEach(p => {
      csvLines.push(`${p.produtoNome},${p.quantidade},${p.precoCusto || 0},${p.precoVenda || 0},${p.faturamento},${p.margemLucro || 0}`)
    })
  }

  const csvContent = csvLines.join('\n')
  const csvBuffer = Buffer.from(csvContent, 'utf-8')

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename=relatorio_vendas_${periodo.startDate}_${periodo.endDate}.csv`)
  return res.status(200).send(csvBuffer)
}

export default withSupabaseAuth(handler)
