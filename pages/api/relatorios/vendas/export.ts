import type { NextApiResponse } from 'next'
import { withSupabaseAuth, AuthenticatedRequest } from '@/lib/supabase-middleware'
import type { ReportConfiguration } from '@/types/reports'
import type { VendasReportData } from '@/types/reports'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

interface ExportRequestBody extends ReportConfiguration {
  formato: 'pdf' | 'excel' | 'csv'
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
    const previewResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/relatorios/vendas/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
        return exportPDF(reportData, body.filtros.periodo, res)
      case 'excel':
        return exportExcel(reportData, body.filtros.periodo, res)
      case 'csv':
        return exportCSV(reportData, body.filtros.periodo, res)
      default:
        return res.status(400).json({
          success: false,
          message: 'Formato inválido'
        })
    }

  } catch (error: any) {
    console.error('[export] Erro:', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Erro ao exportar relatório',
    })
  }
}

function exportPDF(data: VendasReportData, periodo: { startDate: string; endDate: string }, res: NextApiResponse) {
  const doc = new jsPDF()

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
  doc.text(`Faturamento Total: R$ ${data.resumo.faturamentoTotal.toFixed(2)}`, 14, resumoY + 7)
  doc.text(`Ticket Médio: R$ ${data.resumo.ticketMedio.toFixed(2)}`, 14, resumoY + 14)
  doc.text(`Total Impostos: R$ ${data.resumo.totalImpostos.toFixed(2)}`, 14, resumoY + 21)
  doc.text(`Custo Total: R$ ${data.resumo.custoTotal.toFixed(2)}`, 14, resumoY + 28)
  doc.text(`Margem de Lucro: ${data.resumo.margemLucro.toFixed(2)}%`, 14, resumoY + 35)

  // Tabela de vendas detalhadas
  autoTable(doc, {
    startY: resumoY + 45,
    head: [['Data', 'Cliente', 'Vendedor', 'Produtos', 'Total', 'Status']],
    body: data.vendasDetalhadas.map(v => [
      new Date(v.data).toLocaleDateString('pt-BR'),
      v.cliente,
      v.vendedor,
      v.produtos.toString(),
      `R$ ${v.total.toFixed(2)}`,
      v.status,
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [41, 128, 185] },
  })

  // Top 10 Produtos
  if (data.vendasPorProduto.length > 0) {
    const finalY = (doc as any).lastAutoTable.finalY || resumoY + 45

    doc.setFontSize(14)
    doc.text('Top 10 Produtos', 14, finalY + 15)

    autoTable(doc, {
      startY: finalY + 20,
      head: [['Produto', 'Quantidade', 'Faturamento']],
      body: data.vendasPorProduto.map(p => [
        p.produtoNome,
        p.quantidade.toString(),
        `R$ ${p.faturamento.toFixed(2)}`,
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [39, 174, 96] },
    })
  }

  const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename=relatorio_vendas_${periodo.startDate}_${periodo.endDate}.pdf`)
  return res.status(200).send(pdfBuffer)
}

function exportExcel(data: VendasReportData, periodo: { startDate: string; endDate: string }, res: NextApiResponse) {
  const workbook = XLSX.utils.book_new()

  // Aba 1: Resumo
  const resumoData = [
    ['Relatório de Vendas'],
    [`Período: ${periodo.startDate} a ${periodo.endDate}`],
    [],
    ['Métrica', 'Valor'],
    ['Total de Vendas', data.resumo.totalVendas],
    ['Faturamento Total', `R$ ${data.resumo.faturamentoTotal.toFixed(2)}`],
    ['Ticket Médio', `R$ ${data.resumo.ticketMedio.toFixed(2)}`],
    ['Total Impostos', `R$ ${data.resumo.totalImpostos.toFixed(2)}`],
    ['Custo Total', `R$ ${data.resumo.custoTotal.toFixed(2)}`],
    ['Margem de Lucro', `${data.resumo.margemLucro.toFixed(2)}%`],
  ]
  const resumoSheet = XLSX.utils.aoa_to_sheet(resumoData)
  XLSX.utils.book_append_sheet(workbook, resumoSheet, 'Resumo')

  // Aba 2: Vendas Detalhadas
  const vendasData = [
    ['Data', 'Cliente', 'Vendedor', 'Produtos', 'Subtotal', 'Impostos', 'Total', 'Status'],
    ...data.vendasDetalhadas.map(v => [
      new Date(v.data).toLocaleDateString('pt-BR'),
      v.cliente,
      v.vendedor,
      v.produtos,
      v.subtotal,
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
      ['Produto', 'Quantidade', 'Faturamento'],
      ...data.vendasPorProduto.map(p => [
        p.produtoNome,
        p.quantidade,
        p.faturamento,
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

function exportCSV(data: VendasReportData, periodo: { startDate: string; endDate: string }, res: NextApiResponse) {
  const csvLines: string[] = []

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
  csvLines.push('Data,Cliente,Vendedor,Produtos,Subtotal,Impostos,Total,Status')
  data.vendasDetalhadas.forEach(v => {
    csvLines.push(
      `${new Date(v.data).toLocaleDateString('pt-BR')},${v.cliente},${v.vendedor},${v.produtos},${v.subtotal},${v.impostos},${v.total},${v.status}`
    )
  })
  csvLines.push('')

  // Produtos
  if (data.vendasPorProduto.length > 0) {
    csvLines.push('Produtos Mais Vendidos')
    csvLines.push('Produto,Quantidade,Faturamento')
    data.vendasPorProduto.forEach(p => {
      csvLines.push(`${p.produtoNome},${p.quantidade},${p.faturamento}`)
    })
  }

  const csvContent = csvLines.join('\n')
  const csvBuffer = Buffer.from(csvContent, 'utf-8')

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename=relatorio_vendas_${periodo.startDate}_${periodo.endDate}.csv`)
  return res.status(200).send(csvBuffer)
}

export default withSupabaseAuth(handler)
