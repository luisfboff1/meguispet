import type { NextApiResponse } from 'next'
import { withSupabaseAuth, AuthenticatedRequest } from '@/lib/supabase-middleware'
import type { ReportConfiguration, FinanceiroReportData } from '@/types/reports'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

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
    console.error('[export] Erro:', error)
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
  doc.text(`Período: ${periodo.startDate} a ${periodo.endDate}`, 14, 28)

  // Resumo
  doc.setFontSize(14)
  doc.text('Resumo Executivo', 14, 38)

  doc.setFontSize(10)
  const resumoY = 45
  doc.text(`Receita Total: R$ ${data.resumo.receitaTotal.toFixed(2)}`, 14, resumoY)
  doc.text(`Despesa Total: R$ ${data.resumo.despesaTotal.toFixed(2)}`, 14, resumoY + 7)
  doc.text(`Lucro Líquido: R$ ${data.resumo.lucroLiquido.toFixed(2)}`, 14, resumoY + 14)
  doc.text(`Margem de Lucro: ${data.resumo.margemLucro.toFixed(2)}%`, 14, resumoY + 21)

  // DRE
  doc.addPage()
  doc.setFontSize(14)
  doc.text('DRE - Demonstração do Resultado do Exercício', 14, 20)

  autoTable(doc, {
    startY: 25,
    head: [['Item', 'Valor']],
    body: [
      ['Receita Bruta', `R$ ${data.dre.receitaBruta.toFixed(2)}`],
      ['(-) Deduções', `R$ ${data.dre.deducoes.toFixed(2)}`],
      ['(=) Receita Líquida', `R$ ${data.dre.receitaLiquida.toFixed(2)}`],
      ['(-) Custo dos Produtos', `R$ ${data.dre.custoProdutos.toFixed(2)}`],
      ['(=) Lucro Bruto', `R$ ${data.dre.lucroBruto.toFixed(2)}`],
      ['(-) Despesas Operacionais', `R$ ${data.dre.despesasOperacionais.toFixed(2)}`],
      ['(=) Lucro Operacional', `R$ ${data.dre.lucroOperacional.toFixed(2)}`],
      ['(-) Impostos', `R$ ${data.dre.impostos.toFixed(2)}`],
      ['(=) Lucro Líquido', `R$ ${data.dre.lucroLiquido.toFixed(2)}`],
    ],
    styles: { fontSize: 10 },
    headStyles: { fillColor: [41, 128, 185] },
  })

  let currentY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 100

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
      console.error('Erro ao adicionar gráfico de receitas:', error)
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
      console.error('Erro ao adicionar gráfico de receitas por categoria:', error)
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
      console.error('Erro ao adicionar gráfico de despesas por categoria:', error)
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
    [`Período: ${periodo.startDate} a ${periodo.endDate}`],
    [],
    ['Métrica', 'Valor'],
    ['Receita Total', `R$ ${data.resumo.receitaTotal.toFixed(2)}`],
    ['Despesa Total', `R$ ${data.resumo.despesaTotal.toFixed(2)}`],
    ['Lucro Líquido', `R$ ${data.resumo.lucroLiquido.toFixed(2)}`],
    ['Margem de Lucro', `${data.resumo.margemLucro.toFixed(2)}%`],
  ]
  const resumoSheet = XLSX.utils.aoa_to_sheet(resumoData)
  XLSX.utils.book_append_sheet(workbook, resumoSheet, 'Resumo')

  // Aba 2: DRE
  const dreData = [
    ['Item', 'Valor'],
    ['Receita Bruta', data.dre.receitaBruta],
    ['(-) Deduções', data.dre.deducoes],
    ['(=) Receita Líquida', data.dre.receitaLiquida],
    ['(-) Custo dos Produtos', data.dre.custoProdutos],
    ['(=) Lucro Bruto', data.dre.lucroBruto],
    ['(-) Despesas Operacionais', data.dre.despesasOperacionais],
    ['(=) Lucro Operacional', data.dre.lucroOperacional],
    ['(-) Impostos', data.dre.impostos],
    ['(=) Lucro Líquido', data.dre.lucroLiquido],
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
      ...data.despesasPorCategoria.map(d => [d.categoria, d.valor, d.percentual])
    ]
    const despesasSheet = XLSX.utils.aoa_to_sheet(despesasData)
    XLSX.utils.book_append_sheet(workbook, despesasSheet, 'Despesas Categoria')
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
  csvLines.push(`Período: ${periodo.startDate} a ${periodo.endDate}`)
  csvLines.push('')

  // Resumo
  csvLines.push('Resumo')
  csvLines.push('Métrica,Valor')
  csvLines.push(`Receita Total,R$ ${data.resumo.receitaTotal.toFixed(2)}`)
  csvLines.push(`Despesa Total,R$ ${data.resumo.despesaTotal.toFixed(2)}`)
  csvLines.push(`Lucro Líquido,R$ ${data.resumo.lucroLiquido.toFixed(2)}`)
  csvLines.push(`Margem de Lucro,${data.resumo.margemLucro.toFixed(2)}%`)
  csvLines.push('')

  // DRE
  csvLines.push('DRE')
  csvLines.push('Item,Valor')
  csvLines.push(`Receita Bruta,${data.dre.receitaBruta}`)
  csvLines.push(`(-) Deduções,${data.dre.deducoes}`)
  csvLines.push(`(=) Receita Líquida,${data.dre.receitaLiquida}`)
  csvLines.push(`(-) Custo dos Produtos,${data.dre.custoProdutos}`)
  csvLines.push(`(=) Lucro Bruto,${data.dre.lucroBruto}`)
  csvLines.push(`(-) Despesas Operacionais,${data.dre.despesasOperacionais}`)
  csvLines.push(`(=) Lucro Operacional,${data.dre.lucroOperacional}`)
  csvLines.push(`(-) Impostos,${data.dre.impostos}`)
  csvLines.push(`(=) Lucro Líquido,${data.dre.lucroLiquido}`)

  const csvContent = csvLines.join('\n')
  const csvBuffer = Buffer.from(csvContent, 'utf-8')

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename=relatorio_financeiro_${periodo.startDate}_${periodo.endDate}.csv`)
  return res.status(200).send(csvBuffer)
}

export default withSupabaseAuth(handler)
