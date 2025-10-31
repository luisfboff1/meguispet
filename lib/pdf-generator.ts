import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Venda } from '@/types'

/**
 * Helper function to extract payment method name from venda
 */
const getPaymentMethodName = (venda: Venda): string => {
  return venda.forma_pagamento_detalhe?.nome || 
         (typeof venda.forma_pagamento === 'string' ? venda.forma_pagamento : '') || 
         'N/A'
}

/**
 * Gera PDF de pedido de venda em formato profissional
 * Layout simples, preto e branco, sem efeitos
 */
export const generateOrderPDF = (venda: Venda, nomeEmpresa = 'MEGUISPET') => {
  // Criar documento PDF (A4)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 15

  // Configurações de fonte
  doc.setFont('helvetica', 'normal')
  
  let yPos = margin

  // ==================== CABEÇALHO ====================
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(nomeEmpresa, pageWidth / 2, yPos, { align: 'center' })
  yPos += 10

  // Linha separadora
  doc.setLineWidth(0.5)
  doc.line(margin, yPos, pageWidth - margin, yPos)
  yPos += 8

  // ==================== INFORMAÇÕES DO CLIENTE ====================
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('NOME:', margin, yPos)
  doc.setFont('helvetica', 'normal')
  doc.text(venda.cliente?.nome || 'N/A', margin + 20, yPos)
  yPos += 6

  // Endereço do cliente (se disponível)
  if (venda.cliente?.endereco) {
    doc.setFont('helvetica', 'bold')
    doc.text('ENDEREÇO:', margin, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text(venda.cliente.endereco, margin + 25, yPos)
    yPos += 6
  }

  // Cidade/Estado/CEP
  if (venda.cliente?.cidade || venda.cliente?.estado || venda.cliente?.cep) {
    const location = [
      venda.cliente?.cidade,
      venda.cliente?.estado,
      venda.cliente?.cep
    ].filter(Boolean).join(' - ')
    
    if (location) {
      doc.text(location, margin + 25, yPos)
      yPos += 6
    }
  }

  // Telefone
  if (venda.cliente?.telefone) {
    doc.setFont('helvetica', 'bold')
    doc.text('TELEFONE:', margin, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text(venda.cliente.telefone, margin + 25, yPos)
    yPos += 6
  }

  yPos += 3

  // Linha separadora
  doc.setLineWidth(0.3)
  doc.line(margin, yPos, pageWidth - margin, yPos)
  yPos += 8

  // ==================== INFORMAÇÕES DO PEDIDO ====================
  const infoBoxWidth = (pageWidth - 2 * margin) / 2

  // Coluna esquerda
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('PEDIDO:', margin, yPos)
  doc.setFont('helvetica', 'normal')
  doc.text(venda.numero_venda || `#${venda.id}`, margin + 20, yPos)

  // Coluna direita
  doc.setFont('helvetica', 'bold')
  doc.text('DATA:', pageWidth / 2, yPos)
  doc.setFont('helvetica', 'normal')
  const dataEmissao = new Date(venda.created_at).toLocaleDateString('pt-BR')
  doc.text(dataEmissao, pageWidth / 2 + 15, yPos)
  yPos += 5

  // Segunda linha
  doc.setFont('helvetica', 'bold')
  doc.text('VENDEDOR:', margin, yPos)
  doc.setFont('helvetica', 'normal')
  doc.text(venda.vendedor?.nome || 'N/A', margin + 25, yPos)

  // Forma de pagamento
  doc.setFont('helvetica', 'bold')
  doc.text('PAGAMENTO:', pageWidth / 2, yPos)
  doc.setFont('helvetica', 'normal')
  doc.text(getPaymentMethodName(venda), pageWidth / 2 + 30, yPos)
  yPos += 8

  // ==================== TABELA DE PRODUTOS ====================
  const tableData = (venda.itens || []).map((item) => [
    item.produto?.id?.toString() || '',
    item.produto?.nome || 'Produto sem nome',
    item.quantidade.toString(),
    `R$ ${item.preco_unitario.toFixed(2)}`,
    `R$ ${item.subtotal.toFixed(2)}`
  ])

  autoTable(doc, {
    startY: yPos,
    head: [['CÓD', 'DESCRIÇÃO', 'QTD', 'PREÇO UNIT.', 'TOTAL']],
    body: tableData,
    theme: 'plain',
    styles: {
      fontSize: 9,
      cellPadding: 3,
      lineColor: [0, 0, 0],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'left',
      lineWidth: { bottom: 0.3, top: 0.3 },
    },
    bodyStyles: {
      textColor: [0, 0, 0],
    },
    columnStyles: {
      0: { cellWidth: 20, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 30, halign: 'right' },
    },
    didDrawPage: (data) => {
      yPos = data.cursor?.y || yPos
    }
  })

  yPos += 8

  // ==================== TOTAIS ====================
  const totalsX = pageWidth - margin - 50
  
  // Valor total
  if (venda.valor_total !== venda.valor_final && venda.desconto > 0) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text('Subtotal:', totalsX, yPos)
    doc.text(`R$ ${venda.valor_total.toFixed(2)}`, totalsX + 35, yPos, { align: 'right' })
    yPos += 5

    doc.text('Desconto:', totalsX, yPos)
    doc.text(`R$ ${venda.desconto.toFixed(2)}`, totalsX + 35, yPos, { align: 'right' })
    yPos += 5
  }

  // Total final
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('TOTAL PEDIDO:', totalsX, yPos)
  doc.text(`R$ ${venda.valor_final.toFixed(2)}`, totalsX + 35, yPos, { align: 'right' })
  yPos += 8

  // ==================== OBSERVAÇÕES ====================
  if (venda.observacoes) {
    doc.setLineWidth(0.3)
    doc.line(margin, yPos, pageWidth - margin, yPos)
    yPos += 6

    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('OBSERVAÇÕES:', margin, yPos)
    yPos += 5

    doc.setFont('helvetica', 'normal')
    const obsLines = doc.splitTextToSize(venda.observacoes, pageWidth - 2 * margin)
    doc.text(obsLines, margin, yPos)
  }

  // ==================== RODAPÉ ====================
  const footerY = doc.internal.pageSize.getHeight() - 15
  doc.setLineWidth(0.3)
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5)
  
  doc.setFontSize(8)
  doc.setFont('helvetica', 'italic')
  doc.text('Documento gerado automaticamente - MEGUISPET Sistema de Gestão', pageWidth / 2, footerY, { align: 'center' })

  return doc
}

/**
 * Baixa o PDF gerado
 */
export const downloadOrderPDF = (venda: Venda, nomeEmpresa?: string) => {
  const doc = generateOrderPDF(venda, nomeEmpresa)
  const filename = `pedido-${venda.numero_venda || venda.id}.pdf`
  doc.save(filename)
}

/**
 * Abre o PDF em nova aba para visualização
 */
export const previewOrderPDF = (venda: Venda, nomeEmpresa?: string) => {
  const doc = generateOrderPDF(venda, nomeEmpresa)
  const blob = doc.output('blob')
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
}
