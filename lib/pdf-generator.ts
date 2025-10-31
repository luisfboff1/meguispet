import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Venda } from '@/types'

/**
 * Helper function to extract payment method name from venda
 */
const getPaymentMethodName = (venda: Venda): string => {
  // Priority 1: forma_pagamento_detalhe.nome
  if (venda.forma_pagamento_detalhe?.nome) {
    return venda.forma_pagamento_detalhe.nome
  }
  
  // Priority 2: forma_pagamento as string
  if (typeof venda.forma_pagamento === 'string' && venda.forma_pagamento) {
    return venda.forma_pagamento
  }
  
  // Default fallback
  return 'N/A'
}

/**
 * Gera PDF de pedido de venda em formato profissional
 * Layout simples, preto e branco, sem efeitos
 */
export const generateOrderPDF = async (venda: Venda, nomeEmpresa = 'MEGUISPET') => {
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

  // ==================== CABEÇALHO COM LOGO ====================
  try {
    // Carregar logo (deve estar em /public/Meguis-pet-1280x1147.png)
    const logoPath = '/Meguis-pet-1280x1147.png'
    const logoWidth = 20
    const logoHeight = 18 // Manter proporção aproximada (1280x1147)
    const logoX = margin
    
    // Adicionar logo ao PDF
    if (typeof window !== 'undefined') {
      const img = new Image()
      img.src = logoPath
      await new Promise((resolve, reject) => {
        img.onload = () => {
          doc.addImage(img, 'PNG', logoX, yPos, logoWidth, logoHeight)
          resolve(true)
        }
        img.onerror = () => {
          console.warn('Logo não carregado, continuando sem logo')
          resolve(false)
        }
      })
    }
  } catch (error) {
    console.warn('Erro ao carregar logo:', error)
  }

  // Nome da empresa ao lado do logo
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  const empresaNome = 'Meguispet Produtos Pets LTDA'
  doc.text(empresaNome, margin + 25, yPos + 6)
  
  // CNPJ da empresa abaixo do nome
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('60.826.400/0001-82', margin + 25, yPos + 12)
  
  yPos += 22

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
  
  // CNPJ/CPF abaixo do nome - sempre exibir o campo
  doc.setFont('helvetica', 'bold')
  doc.text('CNPJ:', margin, yPos)
  doc.setFont('helvetica', 'normal')
  doc.text(venda.cliente?.documento || '', margin + 20, yPos)
  yPos += 6

  // Endereço do cliente
  if (venda.cliente?.endereco) {
    doc.setFont('helvetica', 'bold')
    doc.text('ENDEREÇO:', margin, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text(venda.cliente.endereco, margin + 25, yPos)
    yPos += 6
  }

  // Nome do contato (se disponível no campo nome_contato ou similar)
  // Linha vazia para contato - pode ser preenchido manualmente

  // Bairro e Cidade na mesma linha
  const hasBairro = venda.cliente?.bairro
  const hasCidade = venda.cliente?.cidade
  
  if (hasBairro || hasCidade) {
    if (hasBairro) {
      doc.setFont('helvetica', 'bold')
      doc.text('BAIRRO:', margin, yPos)
      doc.setFont('helvetica', 'normal')
      doc.text(venda.cliente!.bairro!, margin + 20, yPos)
    }
    
    if (hasCidade) {
      const cidadeX = hasBairro ? pageWidth / 2 : margin
      const cidadeLabel = hasBairro ? pageWidth / 2 : margin
      doc.setFont('helvetica', 'bold')
      doc.text('CIDADE:', cidadeX, yPos)
      doc.setFont('helvetica', 'normal')
      doc.text(venda.cliente!.cidade!, cidadeX + 20, yPos)
    }
    yPos += 6
  }

  yPos += 3

  // Linha separadora
  doc.setLineWidth(0.3)
  doc.line(margin, yPos, pageWidth - margin, yPos)
  yPos += 8

  // ==================== INFORMAÇÕES DO PEDIDO ====================
  const infoBoxWidth = (pageWidth - 2 * margin) / 2

  // Primeira linha
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('PEDIDO:', margin, yPos)
  doc.setFont('helvetica', 'normal')
  doc.text(venda.numero_venda || `#${venda.id}`, margin + 20, yPos)

  // Data de emissão
  doc.setFont('helvetica', 'bold')
  doc.text('EMISSÃO:', pageWidth / 2, yPos)
  doc.setFont('helvetica', 'normal')
  const dataEmissao = new Date(venda.created_at).toLocaleDateString('pt-BR')
  doc.text(dataEmissao, pageWidth / 2 + 20, yPos)
  yPos += 5

  // Segunda linha - Vendedor e Pagamento
  doc.setFont('helvetica', 'bold')
  doc.text('VENDEDORA:', margin, yPos)
  doc.setFont('helvetica', 'normal')
  doc.text(venda.vendedor?.nome || 'N/A', margin + 28, yPos)

  // Prazo de pagamento (em dias)
  doc.setFont('helvetica', 'bold')
  doc.text('PAGAMENTO:', pageWidth / 2, yPos)
  doc.setFont('helvetica', 'normal')
  const pagamento = venda.prazo_pagamento 
    ? `${venda.prazo_pagamento} dias` 
    : getPaymentMethodName(venda)
  doc.text(pagamento, pageWidth / 2 + 30, yPos)
  yPos += 5

  // Terceira linha - Data de entrega (placeholder)
  doc.setFont('helvetica', 'bold')
  doc.text('DATA DE ENTREGA:', margin, yPos)
  doc.setFont('helvetica', 'normal')
  // Deixar em branco para preenchimento manual ou usar observacoes
  doc.text('___/___/___', margin + 40, yPos)
  yPos += 8

  // ==================== TABELA DE PRODUTOS ====================
  const tableData = (venda.itens || []).map((item) => [
    item.produto?.id?.toString() || '',
    item.produto?.nome || 'Produto sem nome',
    item.quantidade.toString().replace('.', ','),
    `R$ ${item.preco_unitario.toFixed(2).replace('.', ',')}`,
    `R$ ${item.subtotal.toFixed(2).replace('.', ',')}`
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
  // Ajustar posição baseada no tamanho da página para ser responsivo
  const totalsX = pageWidth - margin - 70
  const valueX = pageWidth - margin - 5 // Valores sempre alinhados à direita com margem fixa
  
  // Calcular total de produtos (soma dos subtotais dos itens)
  const totalProdutos = (venda.itens || []).reduce((sum, item) => sum + item.subtotal, 0)
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  
  // Total de Produtos
  doc.text('Total de Produtos:', totalsX, yPos)
  doc.text(`R$ ${totalProdutos.toFixed(2).replace('.', ',')}`, valueX, yPos, { align: 'right' })
  yPos += 5

  // Desconto (se aplicável)
  if (venda.desconto > 0) {
    doc.text('Desconto:', totalsX, yPos)
    doc.text(`R$ ${venda.desconto.toFixed(2).replace('.', ',')}`, valueX, yPos, { align: 'right' })
    yPos += 5
  }

  // Total com Imposto (valor final) - mesmo tamanho mas em negrito
  doc.setFont('helvetica', 'bold')
  doc.text('TOTAL COM IMPOSTO:', totalsX, yPos)
  doc.text(`R$ ${venda.valor_final.toFixed(2).replace('.', ',')}`, valueX, yPos, { align: 'right' })
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
export const downloadOrderPDF = async (venda: Venda, nomeEmpresa?: string) => {
  const doc = await generateOrderPDF(venda, nomeEmpresa)
  const filename = `pedido-${venda.numero_venda || venda.id}.pdf`
  doc.save(filename)
}

/**
 * Abre o PDF em nova aba para visualização
 */
export const previewOrderPDF = async (venda: Venda, nomeEmpresa?: string) => {
  const doc = await generateOrderPDF(venda, nomeEmpresa)
  const blob = doc.output('blob')
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
}
