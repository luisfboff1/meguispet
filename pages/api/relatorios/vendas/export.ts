import type { NextApiResponse } from 'next'
import { withSupabaseAuth, AuthenticatedRequest } from '@/lib/supabase-middleware'
import type { ReportConfiguration } from '@/types/reports'
import type { VendasReportData } from '@/types/reports'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { formatLocalDate, formatNumber } from '@/lib/utils'

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

// Helper para converter data de aaaa-mm-dd para dd/mm/aaaa
function formatPeriodDate(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split('-')
    return `${day}/${month}/${year}`
  } catch {
    return dateStr
  }
}

// Helper functions para tabelas de fallback
function addTemporalDataTable(doc: jsPDF, data: VendasReportData, startY: number) {
  autoTable(doc, {
    startY: startY + 15,
    head: [['Data', 'Quantidade', 'Faturamento']],
    body: data.vendasPorDia.map(v => [
      formatLocalDate(v.data),
      formatNumber(v.quantidade, 0),
      `R$ ${formatNumber(v.faturamento)}`,
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
      formatNumber(v.quantidade, 0),
      `R$ ${formatNumber(v.faturamento)}`,
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [16, 185, 129] },
  })
}

function exportPDF(data: VendasReportData, config: ExportRequestBody, res: NextApiResponse) {
  const doc = new jsPDF()
  const { periodo } = config.filtros
  const { graficos = {} } = config

  // Calcular total de lucro (faturamento - custo)
  const totalLucro = data.resumo.faturamentoTotal - data.resumo.custoTotal

  // Título
  doc.setFontSize(18)
  doc.text('Relatório de Vendas', 14, 20)

  // Período (formato dd/mm/aaaa)
  doc.setFontSize(10)
  doc.text(`Período: ${formatPeriodDate(periodo.startDate)} a ${formatPeriodDate(periodo.endDate)}`, 14, 28)

  // Resumo
  doc.setFontSize(14)
  doc.text('Resumo', 14, 38)

  doc.setFontSize(10)
  const resumoY = 45
  doc.text(`Total de Vendas: ${formatNumber(data.resumo.totalVendas, 0)}`, 14, resumoY)
  doc.text(`Faturamento Total (sem impostos): R$ ${formatNumber(data.resumo.faturamentoTotal)}`, 14, resumoY + 7)
  doc.text(`Ticket Médio (sem impostos): R$ ${formatNumber(data.resumo.ticketMedio)}`, 14, resumoY + 14)
  doc.text(`Total Impostos (pagos pelo cliente): R$ ${formatNumber(data.resumo.totalImpostos)}`, 14, resumoY + 21)
  doc.text(`Custo Total: R$ ${formatNumber(data.resumo.custoTotal)}`, 14, resumoY + 28)
  doc.text(`Total de Lucro: R$ ${formatNumber(totalLucro)}`, 14, resumoY + 35)
  doc.text(`Margem de Lucro (sem impostos): ${formatNumber(data.resumo.margemLucro)}%`, 14, resumoY + 42)

  // Tabela de vendas detalhadas
  autoTable(doc, {
    startY: resumoY + 52,
    head: [['Data', 'Cliente', 'Vendedor', 'Qtd Prod', 'Subtotal', 'Líquido', 'IPI', 'ICMS', 'ST', 'Total', 'Status']],
    body: data.vendasDetalhadas.map(v => [
      formatLocalDate(v.data),
      v.cliente,
      v.vendedor,
      formatNumber(v.produtos, 0),
      `R$ ${formatNumber(v.subtotal)}`,
      `R$ ${formatNumber(v.valorLiquido)}`,
      `R$ ${formatNumber(v.ipi)}`,
      `R$ ${formatNumber(v.icms)}`,
      `R$ ${formatNumber(v.st)}`,
      `R$ ${formatNumber(v.total)}`,
      v.status,
    ]),
    styles: { fontSize: 7 },
    headStyles: { fillColor: [41, 128, 185] },
  })

  // Top 10 Produtos
  if (data.vendasPorProduto.length > 0) {
    const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? resumoY + 52

    doc.setFontSize(14)
    doc.text('Top 10 Produtos', 14, finalY + 15)

    autoTable(doc, {
      startY: finalY + 20,
      head: [['Produto', 'Qtd', 'Preço Custo', 'Preço Venda', 'Faturamento', 'Lucro', 'Lucro %']],
      body: data.vendasPorProduto.map(p => {
        const custoTotal = p.quantidade * (p.precoCusto || 0)
        const lucro = p.faturamento - custoTotal
        return [
          p.produtoNome,
          formatNumber(p.quantidade, 0),
          `R$ ${formatNumber(p.precoCusto || 0)}`,
          `R$ ${formatNumber(p.precoVenda || 0)}`,
          `R$ ${formatNumber(p.faturamento)}`,
          `R$ ${formatNumber(lucro)}`,
          `${formatNumber(p.margemLucro || 0, 1)}%`,
        ]
      }),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [39, 174, 96] },
    })
  }

  // Gráficos selecionados (como imagens PNG se disponíveis, senão como tabelas)
  let currentY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? resumoY + 52
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

  // Calcular total de lucro
  const totalLucro = data.resumo.faturamentoTotal - data.resumo.custoTotal

  // Aba 1: Resumo
  const resumoData = [
    ['Relatório de Vendas'],
    [`Período: ${formatPeriodDate(periodo.startDate)} a ${formatPeriodDate(periodo.endDate)}`],
    ['* Faturamento e margem calculados SEM impostos (pagos pelo cliente)'],
    [],
    ['Métrica', 'Valor'],
    ['Total de Vendas', formatNumber(data.resumo.totalVendas, 0)],
    ['Faturamento Total (sem impostos)', `R$ ${formatNumber(data.resumo.faturamentoTotal)}`],
    ['Ticket Médio (sem impostos)', `R$ ${formatNumber(data.resumo.ticketMedio)}`],
    ['Total Impostos (pagos pelo cliente)', `R$ ${formatNumber(data.resumo.totalImpostos)}`],
    ['Custo Total', `R$ ${formatNumber(data.resumo.custoTotal)}`],
    ['Total de Lucro', `R$ ${formatNumber(totalLucro)}`],
    ['Margem de Lucro (sem impostos)', `${formatNumber(data.resumo.margemLucro)}%`],
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
      formatNumber(v.produtos, 0),
      formatNumber(v.subtotal),
      formatNumber(v.valorLiquido),
      formatNumber(v.ipi),
      formatNumber(v.icms),
      formatNumber(v.st),
      formatNumber(v.impostos),
      formatNumber(v.total),
      v.status,
    ])
  ]
  const vendasSheet = XLSX.utils.aoa_to_sheet(vendasData)
  XLSX.utils.book_append_sheet(workbook, vendasSheet, 'Vendas')

  // Aba 3: Produtos
  if (data.vendasPorProduto.length > 0) {
    const produtosData = [
      ['Produto', 'Quantidade', 'Preço Custo', 'Preço Venda', 'Faturamento', 'Lucro', 'Margem Lucro %'],
      ...data.vendasPorProduto.map(p => {
        const custoTotal = p.quantidade * (p.precoCusto || 0)
        const lucro = p.faturamento - custoTotal
        return [
          p.produtoNome,
          formatNumber(p.quantidade, 0),
          formatNumber(p.precoCusto || 0),
          formatNumber(p.precoVenda || 0),
          formatNumber(p.faturamento),
          formatNumber(lucro),
          formatNumber(p.margemLucro || 0, 1),
        ]
      })
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
        formatNumber(v.quantidade, 0),
        formatNumber(v.faturamento),
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

  // Calcular total de lucro
  const totalLucro = data.resumo.faturamentoTotal - data.resumo.custoTotal

  // Cabeçalho
  csvLines.push('Relatório de Vendas')
  csvLines.push(`Período: ${formatPeriodDate(periodo.startDate)} a ${formatPeriodDate(periodo.endDate)}`)
  csvLines.push('')

  // Resumo
  csvLines.push('Resumo')
  csvLines.push('Métrica,Valor')
  csvLines.push(`Total de Vendas,${formatNumber(data.resumo.totalVendas, 0)}`)
  csvLines.push(`Faturamento Total,R$ ${formatNumber(data.resumo.faturamentoTotal)}`)
  csvLines.push(`Ticket Médio,R$ ${formatNumber(data.resumo.ticketMedio)}`)
  csvLines.push(`Total Impostos,R$ ${formatNumber(data.resumo.totalImpostos)}`)
  csvLines.push(`Custo Total,R$ ${formatNumber(data.resumo.custoTotal)}`)
  csvLines.push(`Total de Lucro,R$ ${formatNumber(totalLucro)}`)
  csvLines.push(`Margem de Lucro,${formatNumber(data.resumo.margemLucro)}%`)
  csvLines.push('')

  // Vendas
  csvLines.push('Vendas Detalhadas')
  csvLines.push('Data,Cliente,Vendedor,Produtos,Subtotal,Valor Líquido,IPI,ICMS,ST,Total Impostos,Total,Status')
  data.vendasDetalhadas.forEach(v => {
    csvLines.push(
      `${formatLocalDate(v.data)},${v.cliente},${v.vendedor},${formatNumber(v.produtos, 0)},${formatNumber(v.subtotal)},${formatNumber(v.valorLiquido)},${formatNumber(v.ipi)},${formatNumber(v.icms)},${formatNumber(v.st)},${formatNumber(v.impostos)},${formatNumber(v.total)},${v.status}`
    )
  })
  csvLines.push('')

  // Produtos
  if (data.vendasPorProduto.length > 0) {
    csvLines.push('Produtos Mais Vendidos')
    csvLines.push('Produto,Quantidade,Preço Custo,Preço Venda,Faturamento,Lucro,Margem Lucro %')
    data.vendasPorProduto.forEach(p => {
      const custoTotal = p.quantidade * (p.precoCusto || 0)
      const lucro = p.faturamento - custoTotal
      csvLines.push(`${p.produtoNome},${formatNumber(p.quantidade, 0)},${formatNumber(p.precoCusto || 0)},${formatNumber(p.precoVenda || 0)},${formatNumber(p.faturamento)},${formatNumber(lucro)},${formatNumber(p.margemLucro || 0, 1)}`)
    })
  }

  const csvContent = csvLines.join('\n')
  const csvBuffer = Buffer.from(csvContent, 'utf-8')

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename=relatorio_vendas_${periodo.startDate}_${periodo.endDate}.csv`)
  return res.status(200).send(csvBuffer)
}

export default withSupabaseAuth(handler)
