import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Venda, ItemVenda } from '@/types'

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

export interface PDFGeneratorOptions {
  incluirObservacoes?: boolean
  incluirDetalhesCliente?: boolean
  incluirEnderecoCompleto?: boolean
  incluirImpostos?: boolean
  incluirImpostosICMSST?: boolean
  observacoesAdicionais?: string
  itensOrdenados?: ItemVenda[]
}

/**
 * Gera PDF de pedido de venda em formato profissional
 * Layout simples, preto e branco, sem efeitos
 */
export const generateOrderPDF = async (
  venda: Venda,
  nomeEmpresa = 'MEGUISPET',
  options: PDFGeneratorOptions = {}
) => {
  // Verificar se a venda tem impostos ICMS-ST calculados
  const hasICMSST = venda.itens?.some(item =>
    item.icms_st_recolher != null && item.icms_st_recolher > 0
  ) || false

  // Opções padrão
  const opts = {
    incluirObservacoes: true,
    incluirDetalhesCliente: true,
    incluirEnderecoCompleto: true,
    incluirImpostos: venda.imposto_percentual ? venda.imposto_percentual > 0 : false,
    incluirImpostosICMSST: hasICMSST,
    observacoesAdicionais: '',
    ...options
  }
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
          resolve(false)
        }
      })
    }
  } catch (error) {
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
  if (opts.incluirDetalhesCliente) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('NOME:', margin, yPos)
    doc.setFont('helvetica', 'normal')
    // Garantir que temos um nome válido
    const clienteNome = venda.cliente?.nome || 'N/A'
    doc.text(clienteNome, margin + 20, yPos)
    yPos += 6

    // CNPJ/CPF abaixo do nome - sempre exibir o campo
    doc.setFont('helvetica', 'bold')
    doc.text('CNPJ:', margin, yPos)
    doc.setFont('helvetica', 'normal')
    const clienteDocumento = venda.cliente?.documento || ''
    doc.text(clienteDocumento, margin + 20, yPos)
    yPos += 6

    // Endereço do cliente (somente se incluirEnderecoCompleto)
    if (opts.incluirEnderecoCompleto) {
      if (venda.cliente?.endereco) {
        doc.setFont('helvetica', 'bold')
        doc.text('ENDEREÇO:', margin, yPos)
        doc.setFont('helvetica', 'normal')
        doc.text(venda.cliente.endereco, margin + 25, yPos)
        yPos += 6
      }

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
    }

    yPos += 3
  }

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
  doc.text('VENDEDOR(A):', margin, yPos)
  doc.setFont('helvetica', 'normal')
  doc.text(venda.vendedor?.nome || 'N/A', margin + 32, yPos)

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
  // Usar itensOrdenados se fornecido, caso contrário usar venda.itens
  const itensParaPDF = options?.itensOrdenados || venda.itens || []
  
  // Verificar se tem os novos campos de impostos (IPI, ICMS, ST)
  const hasNovosImpostos = venda.total_ipi != null || venda.total_icms != null || venda.total_st != null
  
  // Calcular totais dos campos novos
  const totalProdutosBruto = hasNovosImpostos
    ? (venda.total_produtos_bruto || 0)
    : itensParaPDF.reduce((sum, item) => sum + (item.subtotal_bruto || item.subtotal || 0), 0)
  
  const valorDesconto = hasNovosImpostos
    ? (venda.desconto_total || 0)
    : (venda.desconto || 0)
  
  const totalProdutosLiquido = hasNovosImpostos
    ? (venda.total_produtos_liquido || totalProdutosBruto - valorDesconto)
    : (totalProdutosBruto - valorDesconto)
  
  const totalIPI = venda.total_ipi || 0
  const totalICMS = venda.total_icms || 0
  const totalST = venda.total_st || 0
  
  const hasImposto = venda.imposto_percentual && venda.imposto_percentual > 0
  
  // Calcular total final
  const totalFinal = hasNovosImpostos
    ? (venda.valor_final || totalProdutosLiquido + totalIPI + totalST)
    : (opts.incluirImpostos && hasImposto
        ? totalProdutosBruto - valorDesconto + ((totalProdutosBruto - valorDesconto) * venda.imposto_percentual!) / 100
        : totalProdutosBruto - valorDesconto)

  // Criar tabela com colunas detalhadas se houver impostos novos
  if (hasNovosImpostos) {
    // Cabeçalhos da tabela detalhada
    const headers = [['PRODUTO', 'QTD', 'PREÇO', 'SUBTOTAL']]
    if (valorDesconto > 0) headers[0].push('DESC.')
    headers[0].push('LÍQUIDO')
    if (totalIPI > 0) headers[0].push('IPI')
    if (totalICMS > 0) headers[0].push('ICMS*')
    if (totalST > 0) headers[0].push('ST')
    headers[0].push('TOTAL')
    
    // Dados da tabela
    const tableData = itensParaPDF.map((item) => {
      const row = [
        item.produto?.nome || 'Produto sem nome',
        item.quantidade.toString().replace('.', ','),
        `R$ ${item.preco_unitario.toFixed(2).replace('.', ',')}`,
        `R$ ${(item.subtotal_bruto || item.subtotal || 0).toFixed(2).replace('.', ',')}`
      ]
      if (valorDesconto > 0) {
        row.push(item.desconto_proporcional ? `-R$ ${item.desconto_proporcional.toFixed(2).replace('.', ',')}` : '-')
      }
      row.push(`R$ ${(item.subtotal_liquido || (item.subtotal - (item.desconto_proporcional || 0))).toFixed(2).replace('.', ',')}`)
      if (totalIPI > 0) {
        row.push(item.ipi_valor ? `R$ ${item.ipi_valor.toFixed(2).replace('.', ',')}` : '-')
      }
      if (totalICMS > 0) {
        row.push(item.icms_valor ? `R$ ${item.icms_valor.toFixed(2).replace('.', ',')}` : '-')
      }
      if (totalST > 0) {
        row.push(item.st_valor ? `R$ ${item.st_valor.toFixed(2).replace('.', ',')}` : '-')
      }
      row.push(`R$ ${(item.total_item || item.subtotal).toFixed(2).replace('.', ',')}`)
      return row
    })
    
    // Footer com totais por coluna
    const footerRow = ['TOTAIS', '', '', `R$ ${totalProdutosBruto.toFixed(2).replace('.', ',')}`]
    if (valorDesconto > 0) {
      footerRow.push(`-R$ ${valorDesconto.toFixed(2).replace('.', ',')}`)
    }
    footerRow.push(`R$ ${totalProdutosLiquido.toFixed(2).replace('.', ',')}`)
    if (totalIPI > 0) {
      footerRow.push(`R$ ${totalIPI.toFixed(2).replace('.', ',')}`)
    }
    if (totalICMS > 0) {
      footerRow.push(`R$ ${totalICMS.toFixed(2).replace('.', ',')}`)
    }
    if (totalST > 0) {
      footerRow.push(`R$ ${totalST.toFixed(2).replace('.', ',')}`)
    }
    footerRow.push(`R$ ${totalFinal.toFixed(2).replace('.', ',')}`)
    
    tableData.push(footerRow)
    
    autoTable(doc, {
      startY: yPos,
      head: headers,
      body: tableData,
      theme: 'plain',
      styles: {
        fontSize: 7,
        cellPadding: 2,
        lineColor: [0, 0, 0],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        halign: 'center',
        lineWidth: { bottom: 0.3, top: 0.3 },
        fontSize: 7,
      },
      bodyStyles: {
        textColor: [0, 0, 0],
        fontSize: 7,
      },
      footStyles: {
        fillColor: [220, 220, 220],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 9,
        lineWidth: { top: 0.5, bottom: 0.5 },
      },
      columnStyles: {
        0: { cellWidth: 'auto', halign: 'left' },
        1: { cellWidth: 12, halign: 'center' },
        2: { cellWidth: 18, halign: 'right' },
        3: { cellWidth: 18, halign: 'right' },
        ...(valorDesconto > 0 ? { 4: { cellWidth: 16, halign: 'right' } } : {}),
      },
      didDrawPage: (data) => {
        yPos = data.cursor?.y || yPos
      }
    })
  } else {
    // Tabela simplificada original
    const tableData = itensParaPDF.map((item) => [
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
  }

  yPos += 8

  // ==================== TOTAIS ====================
  // Ajustar posição baseada no tamanho da página para ser responsivo
  const totalsX = pageWidth - margin - 70
  const valueX = pageWidth - margin - 5 // Valores sempre alinhados à direita com margem fixa

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')

  // Mostrar resumo de totais apenas se não tiver os novos impostos (já mostrados na tabela)
  if (!hasNovosImpostos) {
    // Total de Produtos
    doc.text('Total de Produtos:', totalsX, yPos)
    doc.text(`R$ ${totalProdutosBruto.toFixed(2).replace('.', ',')}`, valueX, yPos, { align: 'right' })
    yPos += 5

    // Desconto (se aplicável)
    if (valorDesconto > 0) {
      doc.text('Desconto:', totalsX, yPos)
      doc.text(`R$ ${valorDesconto.toFixed(2).replace('.', ',')}`, valueX, yPos, { align: 'right' })
      yPos += 5
    }

    // Total final - mostrar "TOTAL COM IMPOSTO" apenas se houver imposto e incluirImpostos estiver ativo
    doc.setFont('helvetica', 'bold')
    doc.text(hasImposto && opts.incluirImpostos ? 'TOTAL COM IMPOSTO:' : 'TOTAL:', totalsX, yPos)
    doc.text(`R$ ${totalFinal.toFixed(2).replace('.', ',')}`, valueX, yPos, { align: 'right' })
    yPos += 8
  } else {
    // Com novos impostos, adicionar resumo de impostos (IPI + ST, SEM ICMS próprio)
    const totalImpostos = totalIPI + totalST
    
    if (totalImpostos > 0) {
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      
      // Mostrar IPI se houver
      if (totalIPI > 0) {
        doc.text('IPI:', totalsX, yPos)
        doc.text(`R$ ${totalIPI.toFixed(2).replace('.', ',')}`, valueX, yPos, { align: 'right' })
        yPos += 5
      }
      
      // Mostrar ST se houver
      if (totalST > 0) {
        doc.text('ST:', totalsX, yPos)
        doc.text(`R$ ${totalST.toFixed(2).replace('.', ',')}`, valueX, yPos, { align: 'right' })
        yPos += 5
      }
      
      // Total de Impostos (IPI + ST, sem ICMS próprio)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.text('TOTAL DE IMPOSTOS:', totalsX, yPos)
      doc.text(`R$ ${totalImpostos.toFixed(2).replace('.', ',')}`, valueX, yPos, { align: 'right' })
      yPos += 8
    }
    
    // Adicionar nota sobre ICMS se aplicável
    if (totalICMS > 0) {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'italic')
      const notaICMS = '* ICMS: Valor informativo, NÃO incluído no total da venda (pode ser creditado).'
      doc.text(notaICMS, margin, yPos)
      yPos += 5
    }
  }

  // ==================== OBSERVAÇÕES ====================
  if (opts.incluirObservacoes && (venda.observacoes || opts.observacoesAdicionais)) {
    doc.setLineWidth(0.3)
    doc.line(margin, yPos, pageWidth - margin, yPos)
    yPos += 6

    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('OBSERVAÇÕES:', margin, yPos)
    yPos += 5

    doc.setFont('helvetica', 'normal')

    // Observações originais da venda
    if (venda.observacoes) {
      const obsLines = doc.splitTextToSize(venda.observacoes, pageWidth - 2 * margin)
      doc.text(obsLines, margin, yPos)
      yPos += (obsLines.length * 4) + 3
    }

    // Observações adicionais do modal
    if (opts.observacoesAdicionais) {
      const obsAdicionaisLines = doc.splitTextToSize(opts.observacoesAdicionais, pageWidth - 2 * margin)
      doc.text(obsAdicionaisLines, margin, yPos)
      yPos += (obsAdicionaisLines.length * 4) + 3
    }
  }

  // ==================== ICMS-ST ====================
  if (opts.incluirImpostosICMSST && hasICMSST) {
    // Calcular totais de ICMS-ST
    const totaisICMSST = {
      total_base_calculo_st: itensParaPDF.reduce((sum, item) => sum + (item.base_calculo_st || 0), 0),
      total_icms_proprio: itensParaPDF.reduce((sum, item) => sum + (item.icms_proprio || 0), 0),
      total_icms_st_total: itensParaPDF.reduce((sum, item) => sum + (item.icms_st_total || 0), 0),
      total_icms_st_recolher: itensParaPDF.reduce((sum, item) => sum + (item.icms_st_recolher || 0), 0)
    }

    // Adicionar espaçamento
    yPos += 3

    // Linha separadora
    doc.setLineWidth(0.3)
    doc.line(margin, yPos, pageWidth - margin, yPos)
    yPos += 6

    // Título da seção
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('INFORMAÇÕES FISCAIS - ICMS-ST', margin, yPos)
    yPos += 5

    // Criar tabela com os totalizadores
    const icmsTableData = [
      ['Base de Cálculo ST', `R$ ${totaisICMSST.total_base_calculo_st.toFixed(2).replace('.', ',')}`],
      ['ICMS Próprio', `R$ ${totaisICMSST.total_icms_proprio.toFixed(2).replace('.', ',')}`],
      ['ICMS-ST Total', `R$ ${totaisICMSST.total_icms_st_total.toFixed(2).replace('.', ',')}`],
      ['ICMS-ST a Recolher', `R$ ${totaisICMSST.total_icms_st_recolher.toFixed(2).replace('.', ',')}`]
    ]

    autoTable(doc, {
      startY: yPos,
      body: icmsTableData,
      theme: 'plain',
      styles: {
        fontSize: 9,
        cellPadding: 2,
        lineColor: [0, 0, 0],
        lineWidth: 0.1,
      },
      bodyStyles: {
        textColor: [0, 0, 0],
      },
      columnStyles: {
        0: { cellWidth: 'auto', fontStyle: 'bold' },
        1: { cellWidth: 50, halign: 'right', fontStyle: 'bold' },
      },
      didDrawPage: (data) => {
        yPos = data.cursor?.y || yPos
      }
    })

    yPos += 3

    // Nota explicativa
    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    const notaText = 'Nota: Os valores de ICMS-ST são para controle fiscal e não estão incluídos no total da venda.'
    const notaLines = doc.splitTextToSize(notaText, pageWidth - 2 * margin)
    doc.text(notaLines, margin, yPos)
    yPos += (notaLines.length * 3) + 5
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
export const downloadOrderPDF = async (venda: Venda, nomeEmpresa?: string, options?: PDFGeneratorOptions) => {
  const doc = await generateOrderPDF(venda, nomeEmpresa, options)
  const filename = `pedido-${venda.numero_venda || venda.id}.pdf`
  doc.save(filename)
}

/**
 * Abre o PDF em nova aba para visualização
 */
export const previewOrderPDF = async (venda: Venda, nomeEmpresa?: string, options?: PDFGeneratorOptions) => {
  const doc = await generateOrderPDF(venda, nomeEmpresa, options)
  const blob = doc.output('blob')
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
}
