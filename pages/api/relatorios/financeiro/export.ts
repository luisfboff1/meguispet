import type { NextApiResponse } from 'next'
import { withSupabaseAuth, AuthenticatedRequest } from '@/lib/supabase-middleware'
import type { ReportConfiguration, FinanceiroReportData } from '@/types/reports'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

// Helper functions for formatting
function formatNumber(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value)
}

function formatPeriodDate(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split('-')
    return `${day}/${month}/${year}`
  } catch {
    return dateStr
  }
}

interface ExportRequestBody extends ReportConfiguration {
  formato: 'pdf' | 'excel' | 'csv'
  chartImages?: {
    receitasMes?: { image: string; width: number; height: number }
    receitasCategoria?: { image: string; width: number; height: number }
    despesasCategoria?: { image: string; width: number; height: number }
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

    const previewResponse = await fetch(`${baseUrl}/api/relatorios/financeiro/preview`, {
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

    const reportData: FinanceiroReportData = previewData.data.dados

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

function exportPDF(data: FinanceiroReportData, config: ExportRequestBody, res: NextApiResponse) {
  const doc = new jsPDF()
  const { periodo } = config.filtros
  const { chartImages } = config

  // Título
  doc.setFontSize(18)
  doc.text('Relatório Financeiro', 14, 20)

  // Período
  doc.setFontSize(10)
  doc.text(`Período: ${formatPeriodDate(periodo.startDate)} a ${formatPeriodDate(periodo.endDate)}`, 14, 28)

  // Resumo
  doc.setFontSize(14)
  doc.text('Resumo Executivo', 14, 38)

  doc.setFontSize(10)
  const resumoY = 45
  doc.text(`Receita Total: R$ ${formatNumber(data.resumo.receitaTotal)}`, 14, resumoY)
  doc.text(`Despesa Total: R$ ${formatNumber(data.resumo.despesaTotal)}`, 14, resumoY + 7)
  doc.text(`Lucro Líquido: R$ ${formatNumber(data.resumo.lucroLiquido)}`, 14, resumoY + 14)
  doc.text(`Margem de Lucro: ${formatNumber(data.resumo.margemLucro)}%`, 14, resumoY + 21)

  // DRE
  doc.addPage()
  doc.setFontSize(14)
  doc.text('DRE - Demonstração do Resultado do Exercício', 14, 20)
  doc.setFontSize(8)
  doc.text('Análise de resultados do período (faturamento de vendas)', 14, 27)

  autoTable(doc, {
    startY: 32,
    head: [['Item', 'Valor']],
    body: [
      ['Receita Bruta (vendas)', `R$ ${formatNumber(data.dre.receitaBruta)}`],
      ['(-) Deduções (despesas)', `R$ ${formatNumber(data.dre.deducoes)}`],
      ['(=) Receita Líquida', `R$ ${formatNumber(data.dre.receitaLiquida)}`],
      ['(-) Custo dos Produtos', `R$ ${formatNumber(data.dre.custoProdutos)}`],
      ['(=) Lucro Bruto', `R$ ${formatNumber(data.dre.lucroBruto)}`],
      ['(=) Lucro Líquido', `R$ ${formatNumber(data.dre.lucroLiquido)}`],
    ],
    styles: { fontSize: 10 },
    headStyles: { fillColor: [41, 128, 185] },
  })

  let currentY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 100

  // Receitas Detalhadas
  if (data.receitasDetalhadas && data.receitasDetalhadas.length > 0) {
    doc.addPage()
    doc.setFontSize(14)
    doc.text('Receitas do Período', 14, 20)
    doc.setFontSize(8)
    doc.text(`Total: ${data.receitasDetalhadas.length} transações`, 14, 27)

    autoTable(doc, {
      startY: 32,
      head: [['Data', 'Descrição', 'Categoria', 'Valor']],
      body: data.receitasDetalhadas.map(r => [
        formatPeriodDate(r.data),
        r.descricao,
        r.categoria,
        `R$ ${formatNumber(r.valor)}`,
      ]),
      foot: [['', '', 'Total:', `R$ ${formatNumber(data.receitasDetalhadas.reduce((sum, r) => sum + r.valor, 0))}`]],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [22, 163, 74] },
      footStyles: { fillColor: [22, 163, 74], fontStyle: 'bold' },
    })
    currentY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 100
  }

  // Despesas Detalhadas
  if (data.despesasDetalhadas && data.despesasDetalhadas.length > 0) {
    doc.addPage()
    doc.setFontSize(14)
    doc.text('Despesas do Período', 14, 20)
    doc.setFontSize(8)
    doc.text(`Total: ${data.despesasDetalhadas.length} transações`, 14, 27)

    autoTable(doc, {
      startY: 32,
      head: [['Data', 'Descrição', 'Categoria', 'Valor']],
      body: data.despesasDetalhadas.map(d => [
        formatPeriodDate(d.data),
        d.descricao,
        d.categoria,
        `R$ ${formatNumber(d.valor)}`,
      ]),
      foot: [['', '', 'Total:', `R$ ${formatNumber(data.despesasDetalhadas.reduce((sum, d) => sum + d.valor, 0))}`]],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [239, 68, 68] },
      footStyles: { fillColor: [239, 68, 68], fontStyle: 'bold' },
    })
    currentY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 100
  }

  // Validação: Vendas vs Receitas
  if (data.validacao) {
    doc.addPage()
    doc.setFontSize(14)
    doc.text('Validação: Vendas vs Receitas', 14, 20)
    doc.setFontSize(8)
    doc.text('Comparação entre faturamento de vendas e receitas lançadas manualmente', 14, 27)

    autoTable(doc, {
      startY: 32,
      head: [['Item', 'Valor']],
      body: [
        ['Faturamento de Vendas', `R$ ${formatNumber(data.validacao.faturamentoVendas)}`],
        ['Receitas de Transações', `R$ ${formatNumber(data.validacao.receitasTransacoes)}`],
        ['Diferença', `R$ ${formatNumber(Math.abs(data.validacao.diferenca))} ${data.validacao.diferenca > 0 ? '(vendas maiores)' : data.validacao.diferenca < 0 ? '(receitas maiores)' : ''}`],
      ],
      styles: { fontSize: 10 },
      headStyles: { fillColor: [249, 115, 22] },
    })

    currentY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 100

    doc.setFontSize(8)
    doc.text('* Se houver diferença, pode indicar receitas lançadas manualmente que já foram', 14, currentY + 10)
    doc.text('contabilizadas nas vendas, ou receitas extras (não operacionais) que não vieram de vendas.', 14, currentY + 15)
  }

  // Gráficos (se disponíveis)
  if (chartImages?.receitasMes) {
    if (currentY > 200) {
      doc.addPage()
      currentY = 20
    }

    doc.setFontSize(14)
    doc.text('Fluxo Financeiro Mensal', 14, currentY + 10)

    try {
      const { image, width: imgWidth, height: imgHeight } = chartImages.receitasMes
      const maxWidth = 170
      const aspectRatio = imgHeight / imgWidth
      const width = maxWidth
      const height = maxWidth * aspectRatio

      doc.addImage(image, 'PNG', 14, currentY + 15, width, height)
      currentY += height + 20
    } catch (error) {
    }
  }

  if (chartImages?.receitasCategoria) {
    if (currentY > 200) {
      doc.addPage()
      currentY = 20
    }

    doc.setFontSize(14)
    doc.text('Receitas por Categoria', 14, currentY + 10)

    try {
      const { image, width: imgWidth, height: imgHeight } = chartImages.receitasCategoria
      const maxWidth = 170
      const aspectRatio = imgHeight / imgWidth
      const width = maxWidth
      const height = maxWidth * aspectRatio

      doc.addImage(image, 'PNG', 14, currentY + 15, width, height)
      currentY += height + 20
    } catch (error) {
    }
  }

  if (chartImages?.despesasCategoria) {
    if (currentY > 200) {
      doc.addPage()
      currentY = 20
    }

    doc.setFontSize(14)
    doc.text('Despesas por Categoria', 14, currentY + 10)

    try {
      const { image, width: imgWidth, height: imgHeight } = chartImages.despesasCategoria
      const maxWidth = 170
      const aspectRatio = imgHeight / imgWidth
      const width = maxWidth
      const height = maxWidth * aspectRatio

      doc.addImage(image, 'PNG', 14, currentY + 15, width, height)
      currentY += height + 20
    } catch (error) {
    }
  }

  const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename=relatorio_financeiro_${periodo.startDate}_${periodo.endDate}.pdf`)
  return res.status(200).send(pdfBuffer)
}

function exportExcel(data: FinanceiroReportData, config: ExportRequestBody, res: NextApiResponse) {
  const workbook = XLSX.utils.book_new()
  const { periodo } = config.filtros

  // Aba 1: Resumo
  const resumoData = [
    ['Relatório Financeiro'],
    [`Período: ${formatPeriodDate(periodo.startDate)} a ${formatPeriodDate(periodo.endDate)}`],
    ['Análise de resultados do período (faturamento de vendas)'],
    [],
    ['Métrica', 'Valor'],
    ['Receita Total', formatNumber(data.resumo.receitaTotal)],
    ['Despesa Total', formatNumber(data.resumo.despesaTotal)],
    ['Lucro Líquido', formatNumber(data.resumo.lucroLiquido)],
    ['Margem de Lucro (%)', formatNumber(data.resumo.margemLucro)],
  ]
  const resumoSheet = XLSX.utils.aoa_to_sheet(resumoData)
  XLSX.utils.book_append_sheet(workbook, resumoSheet, 'Resumo')

  // Aba 2: DRE
  const dreData = [
    ['Item', 'Valor'],
    ['Receita Bruta (vendas)', formatNumber(data.dre.receitaBruta)],
    ['(-) Deduções (despesas)', formatNumber(data.dre.deducoes)],
    ['(=) Receita Líquida', formatNumber(data.dre.receitaLiquida)],
    ['(-) Custo dos Produtos', formatNumber(data.dre.custoProdutos)],
    ['(=) Lucro Bruto', formatNumber(data.dre.lucroBruto)],
    ['(=) Lucro Líquido', formatNumber(data.dre.lucroLiquido)],
  ]
  const dreSheet = XLSX.utils.aoa_to_sheet(dreData)
  XLSX.utils.book_append_sheet(workbook, dreSheet, 'DRE')

  // Aba 3: Receitas por Categoria
  if (data.receitasPorCategoria.length > 0) {
    const receitasData = [
      ['Categoria', 'Valor', 'Percentual'],
      ...data.receitasPorCategoria.map(r => [r.categoria, r.valor, r.percentual])
    ]
    const receitasSheet = XLSX.utils.aoa_to_sheet(receitasData)
    XLSX.utils.book_append_sheet(workbook, receitasSheet, 'Receitas Categoria')
  }

  // Aba 4: Despesas por Categoria
  if (data.despesasPorCategoria.length > 0) {
    const despesasData = [
      ['Categoria', 'Valor', 'Percentual'],
      ...data.despesasPorCategoria.map(d => [d.categoria, formatNumber(d.valor), formatNumber(d.percentual, 1)])
    ]
    const despesasSheet = XLSX.utils.aoa_to_sheet(despesasData)
    XLSX.utils.book_append_sheet(workbook, despesasSheet, 'Despesas Categoria')
  }

  // Aba 5: Receitas Detalhadas
  if (data.receitasDetalhadas && data.receitasDetalhadas.length > 0) {
    const receitasDetalhadasData = [
      ['Data', 'Descrição', 'Categoria', 'Valor'],
      ...data.receitasDetalhadas.map(r => [
        formatPeriodDate(r.data),
        r.descricao,
        r.categoria,
        formatNumber(r.valor)
      ]),
      ['', '', 'Total:', formatNumber(data.receitasDetalhadas.reduce((sum, r) => sum + r.valor, 0))]
    ]
    const receitasDetalhadasSheet = XLSX.utils.aoa_to_sheet(receitasDetalhadasData)
    XLSX.utils.book_append_sheet(workbook, receitasDetalhadasSheet, 'Receitas Detalhadas')
  }

  // Aba 6: Despesas Detalhadas
  if (data.despesasDetalhadas && data.despesasDetalhadas.length > 0) {
    const despesasDetalhadasData = [
      ['Data', 'Descrição', 'Categoria', 'Valor'],
      ...data.despesasDetalhadas.map(d => [
        formatPeriodDate(d.data),
        d.descricao,
        d.categoria,
        formatNumber(d.valor)
      ]),
      ['', '', 'Total:', formatNumber(data.despesasDetalhadas.reduce((sum, d) => sum + d.valor, 0))]
    ]
    const despesasDetalhadasSheet = XLSX.utils.aoa_to_sheet(despesasDetalhadasData)
    XLSX.utils.book_append_sheet(workbook, despesasDetalhadasSheet, 'Despesas Detalhadas')
  }

  // Aba 7: Validação
  if (data.validacao) {
    const validacaoData = [
      ['Validação: Vendas vs Receitas'],
      ['Comparação entre faturamento de vendas e receitas lançadas manualmente'],
      [],
      ['Item', 'Valor'],
      ['Faturamento de Vendas', formatNumber(data.validacao.faturamentoVendas)],
      ['Receitas de Transações', formatNumber(data.validacao.receitasTransacoes)],
      ['Diferença', `${formatNumber(Math.abs(data.validacao.diferenca))} ${data.validacao.diferenca > 0 ? '(vendas maiores)' : data.validacao.diferenca < 0 ? '(receitas maiores)' : ''}`],
      [],
      ['* Se houver diferença, pode indicar receitas lançadas manualmente que já foram contabilizadas nas vendas,'],
      ['ou receitas extras (não operacionais) que não vieram de vendas.']
    ]
    const validacaoSheet = XLSX.utils.aoa_to_sheet(validacaoData)
    XLSX.utils.book_append_sheet(workbook, validacaoSheet, 'Validação')
  }

  const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', `attachment; filename=relatorio_financeiro_${periodo.startDate}_${periodo.endDate}.xlsx`)
  return res.status(200).send(excelBuffer)
}

function exportCSV(data: FinanceiroReportData, config: ExportRequestBody, res: NextApiResponse) {
  const csvLines: string[] = []
  const { periodo } = config.filtros

  // Cabeçalho
  csvLines.push('Relatório Financeiro')
  csvLines.push(`Período: ${formatPeriodDate(periodo.startDate)} a ${formatPeriodDate(periodo.endDate)}`)
  csvLines.push('')

  // Resumo
  csvLines.push('Resumo')
  csvLines.push('Métrica,Valor')
  csvLines.push(`Receita Total,R$ ${formatNumber(data.resumo.receitaTotal)}`)
  csvLines.push(`Despesa Total,R$ ${formatNumber(data.resumo.despesaTotal)}`)
  csvLines.push(`Lucro Líquido,R$ ${formatNumber(data.resumo.lucroLiquido)}`)
  csvLines.push(`Margem de Lucro,${formatNumber(data.resumo.margemLucro)}%`)
  csvLines.push('')

  // DRE
  csvLines.push('DRE')
  csvLines.push('Item,Valor')
  csvLines.push(`Receita Bruta (vendas),${formatNumber(data.dre.receitaBruta)}`)
  csvLines.push(`(-) Deduções (despesas),${formatNumber(data.dre.deducoes)}`)
  csvLines.push(`(=) Receita Líquida,${formatNumber(data.dre.receitaLiquida)}`)
  csvLines.push(`(-) Custo dos Produtos,${formatNumber(data.dre.custoProdutos)}`)
  csvLines.push(`(=) Lucro Bruto,${formatNumber(data.dre.lucroBruto)}`)
  csvLines.push(`(=) Lucro Líquido,${formatNumber(data.dre.lucroLiquido)}`)
  csvLines.push('')

  // Receitas Detalhadas
  if (data.receitasDetalhadas && data.receitasDetalhadas.length > 0) {
    csvLines.push('Receitas do Período')
    csvLines.push('Data,Descrição,Categoria,Valor')
    data.receitasDetalhadas.forEach(r => {
      csvLines.push(`${formatPeriodDate(r.data)},${r.descricao},${r.categoria},R$ ${formatNumber(r.valor)}`)
    })
    csvLines.push(`,,,Total: R$ ${formatNumber(data.receitasDetalhadas.reduce((sum, r) => sum + r.valor, 0))}`)
    csvLines.push('')
  }

  // Despesas Detalhadas
  if (data.despesasDetalhadas && data.despesasDetalhadas.length > 0) {
    csvLines.push('Despesas do Período')
    csvLines.push('Data,Descrição,Categoria,Valor')
    data.despesasDetalhadas.forEach(d => {
      csvLines.push(`${formatPeriodDate(d.data)},${d.descricao},${d.categoria},R$ ${formatNumber(d.valor)}`)
    })
    csvLines.push(`,,,Total: R$ ${formatNumber(data.despesasDetalhadas.reduce((sum, d) => sum + d.valor, 0))}`)
    csvLines.push('')
  }

  // Validação
  if (data.validacao) {
    csvLines.push('Validação: Vendas vs Receitas')
    csvLines.push('Item,Valor')
    csvLines.push(`Faturamento de Vendas,R$ ${formatNumber(data.validacao.faturamentoVendas)}`)
    csvLines.push(`Receitas de Transações,R$ ${formatNumber(data.validacao.receitasTransacoes)}`)
    csvLines.push(`Diferença,R$ ${formatNumber(Math.abs(data.validacao.diferenca))} ${data.validacao.diferenca > 0 ? '(vendas maiores)' : data.validacao.diferenca < 0 ? '(receitas maiores)' : ''}`)
    csvLines.push('')
    csvLines.push('* Se houver diferença pode indicar receitas lançadas manualmente que já foram contabilizadas nas vendas')
  }

  const csvContent = csvLines.join('\n')
  const csvBuffer = Buffer.from(csvContent, 'utf-8')

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename=relatorio_financeiro_${periodo.startDate}_${periodo.endDate}.csv`)
  return res.status(200).send(csvBuffer)
}

export default withSupabaseAuth(handler)
