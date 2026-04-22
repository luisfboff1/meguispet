import type { NextApiRequest, NextApiResponse } from 'next'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import type { ClientesReportData, ReportConfiguration, ReportFormat } from '@/types/reports'
import { formatLocalDate } from '@/lib/utils'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Método não permitido'
    })
  }

  try {
    const { formato = 'pdf', ...config } = req.body as ReportConfiguration & { formato?: ReportFormat }

    if (!config?.filtros?.periodo?.startDate || !config?.filtros?.periodo?.endDate) {
      return res.status(400).json({
        success: false,
        message: 'Período é obrigatório'
      })
    }

    const protocol = req.headers['x-forwarded-proto'] || 'http'
    const host = req.headers.host || 'localhost:3000'
    const baseUrl = `${protocol}://${host}`

    const previewResponse = await fetch(`${baseUrl}/api/relatorios/clientes/preview`, {
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
    const data: ClientesReportData = previewData.data.dados
    const periodo = `${formatLocalDate(config.filtros.periodo.startDate)} - ${formatLocalDate(config.filtros.periodo.endDate)}`

    switch (formato) {
      case 'pdf':
        return exportPDF(res, data, periodo)
      case 'excel':
        return exportExcel(res, data, periodo)
      case 'csv':
        return exportCSV(res, data, periodo)
      default:
        return res.status(400).json({
          success: false,
          message: 'Formato inválido'
        })
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    })
  }
}

function exportPDF(res: NextApiResponse, data: ClientesReportData, periodo: string) {
  const doc = new jsPDF()

  doc.setFontSize(18)
  doc.text('Relatório de Clientes', 14, 20)
  doc.setFontSize(11)
  doc.text(`Período: ${periodo}`, 14, 28)

  autoTable(doc, {
    startY: 38,
    head: [['Métrica', 'Valor']],
    body: [
      ['Total de Clientes', data.resumo.totalClientes.toString()],
      ['Clientes Ativos', data.resumo.clientesAtivos.toString()],
      ['Novos Clientes', data.resumo.novosClientes.toString()],
      ['Ticket Médio', data.resumo.ticketMedio.toFixed(2)],
      ['Faturamento Total', data.resumo.faturamentoTotal.toFixed(2)],
    ],
  })

  autoTable(doc, {
    startY: ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 60) + 10,
    head: [['Cliente', 'Total Compras', 'Ticket Médio', 'Última Compra']],
    body: data.topClientes.map((cliente) => [
      cliente.clienteNome,
      cliente.totalCompras.toFixed(2),
      cliente.ticketMedio.toFixed(2),
      cliente.ultimaCompra ? formatLocalDate(cliente.ultimaCompra) : '-',
    ]),
  })

  const buffer = Buffer.from(doc.output('arraybuffer'))
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="relatorio-clientes-${Date.now()}.pdf"`)
  return res.send(buffer)
}

function exportExcel(res: NextApiResponse, data: ClientesReportData, periodo: string) {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Relatório de Clientes'],
    [`Período: ${periodo}`],
    [],
    ['Métrica', 'Valor'],
    ['Total de Clientes', data.resumo.totalClientes],
    ['Clientes Ativos', data.resumo.clientesAtivos],
    ['Novos Clientes', data.resumo.novosClientes],
    ['Ticket Médio', data.resumo.ticketMedio],
    ['Faturamento Total', data.resumo.faturamentoTotal],
  ]), 'Resumo')

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Cliente', 'Total Compras', 'Ticket Médio', 'Última Compra'],
    ...data.topClientes.map((cliente) => [
      cliente.clienteNome,
      cliente.totalCompras,
      cliente.ticketMedio,
      cliente.ultimaCompra ? formatLocalDate(cliente.ultimaCompra) : '-',
    ])
  ]), 'Top Clientes')

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Nome', 'CPF/CNPJ', 'Endereço', 'Cidade', 'UF', 'CEP', 'Tipo', 'Vendas', 'Total Compras', 'Ticket Médio', 'Última Compra', 'Status'],
    ...data.clientesDetalhados.map((cliente) => [
      cliente.nome,
      cliente.documento,
      cliente.endereco,
      cliente.cidade,
      cliente.estado,
      cliente.cep,
      cliente.tipo,
      cliente.quantidadeCompras,
      cliente.totalCompras,
      cliente.ticketMedio,
      cliente.ultimaCompra ? formatLocalDate(cliente.ultimaCompra) : '-',
      cliente.status,
    ])
  ]), 'Clientes')

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', `attachment; filename="relatorio-clientes-${Date.now()}.xlsx"`)
  return res.send(buffer)
}

function exportCSV(res: NextApiResponse, data: ClientesReportData, periodo: string) {
  const lines = [
    'Relatório de Clientes',
    `Período: ${periodo}`,
    '',
    'RESUMO',
    `Total de Clientes,${data.resumo.totalClientes}`,
    `Clientes Ativos,${data.resumo.clientesAtivos}`,
    `Novos Clientes,${data.resumo.novosClientes}`,
    `Ticket Médio,${data.resumo.ticketMedio.toFixed(2)}`,
    `Faturamento Total,${data.resumo.faturamentoTotal.toFixed(2)}`,
    '',
    'TOP CLIENTES',
    'Cliente,Total Compras,Ticket Médio,Última Compra',
    ...data.topClientes.map((cliente) => `"${cliente.clienteNome}",${cliente.totalCompras.toFixed(2)},${cliente.ticketMedio.toFixed(2)},${cliente.ultimaCompra ? formatLocalDate(cliente.ultimaCompra) : '-'}`),
    '',
    'CLIENTES DETALHADOS',
    'Nome,CPF/CNPJ,Endereço,Cidade,UF,CEP,Tipo,Vendas,Total Compras,Ticket Médio,Última Compra,Status',
    ...data.clientesDetalhados.map((cliente) => `"${cliente.nome}","${cliente.documento}","${cliente.endereco}","${cliente.cidade}","${cliente.estado}","${cliente.cep}",${cliente.tipo},${cliente.quantidadeCompras},${cliente.totalCompras.toFixed(2)},${cliente.ticketMedio.toFixed(2)},${cliente.ultimaCompra ? formatLocalDate(cliente.ultimaCompra) : '-'},${cliente.status}`),
  ]

  const buffer = Buffer.from(lines.join('\n'), 'utf-8')
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="relatorio-clientes-${Date.now()}.csv"`)
  return res.send(buffer)
}
