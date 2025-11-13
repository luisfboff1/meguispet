import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, Download, Eye, X, ArrowUpDown, GripVertical } from 'lucide-react'
import type { Venda, ItemVenda } from '@/types'

export interface PDFPreviewOptions {
  incluirObservacoes: boolean
  incluirDetalhesCliente: boolean
  incluirEnderecoCompleto: boolean
  incluirImpostos: boolean
  incluirImpostosICMSST: boolean
  observacoesAdicionais: string
  itensOrdenados?: ItemVenda[]
}

type SortField = 'codigo' | 'descricao' | 'quantidade' | 'preco' | 'total'
type SortDirection = 'asc' | 'desc'

interface VendaPDFPreviewModalProps {
  venda: Venda | null
  open: boolean
  onClose: () => void
  onConfirmDownload: (options: PDFPreviewOptions) => void
}

export default function VendaPDFPreviewModal({
  venda,
  open,
  onClose,
  onConfirmDownload
}: VendaPDFPreviewModalProps) {
  // Verificar se a venda tem impostos ICMS-ST calculados
  const hasICMSST = venda?.itens?.some(item =>
    item.icms_st_recolher != null && item.icms_st_recolher > 0
  ) || false

  const [options, setOptions] = useState<PDFPreviewOptions>({
    incluirObservacoes: true,
    incluirDetalhesCliente: true,
    incluirEnderecoCompleto: true,
    incluirImpostos: venda?.imposto_percentual ? venda.imposto_percentual > 0 : false,
    incluirImpostosICMSST: hasICMSST,
    observacoesAdicionais: ''
  })

  const [itensOrdenados, setItensOrdenados] = useState<ItemVenda[]>([])
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  // Atualizar itens quando venda mudar
  useEffect(() => {
    if (venda?.itens) {
      setItensOrdenados(venda.itens)
    }
  }, [venda])

  if (!open || !venda) return null

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  // Verificar se tem os novos campos de impostos (IPI, ICMS, ST)
  const hasNovosImpostos = venda.total_ipi != null || venda.total_icms != null || venda.total_st != null

  const totalProdutos = hasNovosImpostos
    ? (venda.total_produtos_bruto || 0)
    : itensOrdenados.reduce((sum, item) => sum + item.subtotal, 0)

  const valorDesconto = hasNovosImpostos
    ? (venda.desconto_total || 0)
    : (venda.desconto || 0)

  const totalProdutosLiquido = hasNovosImpostos
    ? (venda.total_produtos_liquido || totalProdutos - valorDesconto)
    : (totalProdutos - valorDesconto)

  const totalIPI = venda.total_ipi || 0
  const totalICMS = venda.total_icms || 0
  const totalST = venda.total_st || 0

  const hasImposto = venda.imposto_percentual && venda.imposto_percentual > 0

  // Calcular total final
  const totalFinal = hasNovosImpostos
    ? (venda.valor_final || totalProdutosLiquido + totalIPI + totalST)
    : (options.incluirImpostos && hasImposto
        ? totalProdutos - valorDesconto + ((totalProdutos - valorDesconto) * venda.imposto_percentual!) / 100
        : totalProdutos - valorDesconto)

  // Calcular totais de ICMS-ST
  const totaisICMSST = hasICMSST ? {
    total_base_calculo_st: itensOrdenados.reduce((sum, item) => sum + (item.base_calculo_st || 0), 0),
    total_icms_proprio: itensOrdenados.reduce((sum, item) => sum + (item.icms_proprio || 0), 0),
    total_icms_st_total: itensOrdenados.reduce((sum, item) => sum + (item.icms_st_total || 0), 0),
    total_icms_st_recolher: itensOrdenados.reduce((sum, item) => sum + (item.icms_st_recolher || 0), 0)
  } : null

  // Função de ordenação
  const handleSort = (field: SortField) => {
    const newDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc'
    setSortField(field)
    setSortDirection(newDirection)

    const sorted = [...itensOrdenados].sort((a, b) => {
      let aValue: string | number
      let bValue: string | number

      switch (field) {
        case 'codigo':
          aValue = a.produto?.id || 0
          bValue = b.produto?.id || 0
          break
        case 'descricao':
          aValue = a.produto?.nome || ''
          bValue = b.produto?.nome || ''
          break
        case 'quantidade':
          aValue = a.quantidade
          bValue = b.quantidade
          break
        case 'preco':
          aValue = a.preco_unitario
          bValue = b.preco_unitario
          break
        case 'total':
          aValue = a.subtotal
          bValue = b.subtotal
          break
        default:
          return 0
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return newDirection === 'asc'
          ? aValue.localeCompare(bValue, 'pt-BR')
          : bValue.localeCompare(aValue, 'pt-BR')
      }

      return newDirection === 'asc' ? (aValue as number) - (bValue as number) : (bValue as number) - (aValue as number)
    })

    setItensOrdenados(sorted)
  }

  // Funções de drag and drop
  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const newItens = [...itensOrdenados]
    const draggedItem = newItens[draggedIndex]
    newItens.splice(draggedIndex, 1)
    newItens.splice(index, 0, draggedItem)

    setItensOrdenados(newItens)
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  const handleConfirm = () => {
    onConfirmDownload({
      ...options,
      itensOrdenados
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl my-8 animate-fade-in">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6 text-meguispet-primary" />
              <h2 className="text-2xl font-semibold text-gray-900">
                Pré-visualização do Pedido #{venda.numero_venda || venda.id}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Preview do PDF - Coluna Esquerda/Principal */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader className="bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">MEGUISPET Produtos Pets LTDA</p>
                      <p className="text-xs text-muted-foreground">CNPJ: 60.826.400/0001-82</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">Pedido: {venda.numero_venda || `#${venda.id}`}</p>
                      <p className="text-xs text-muted-foreground">Emissão: {formatDate(venda.created_at)}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  {/* Cliente */}
                  {options.incluirDetalhesCliente && (
                    <div className="border-b pb-4">
                      <h4 className="text-sm font-semibold mb-2">DADOS DO CLIENTE</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="font-medium">Nome:</span> {venda.cliente?.nome || 'N/A'}
                        </div>
                        {venda.cliente?.documento && (
                          <div>
                            <span className="font-medium">CNPJ/CPF:</span> {venda.cliente.documento}
                          </div>
                        )}
                        {options.incluirEnderecoCompleto && (
                          <>
                            {venda.cliente?.endereco && (
                              <div className="col-span-2">
                                <span className="font-medium">Endereço:</span> {venda.cliente.endereco}
                              </div>
                            )}
                            {venda.cliente?.bairro && (
                              <div>
                                <span className="font-medium">Bairro:</span> {venda.cliente.bairro}
                              </div>
                            )}
                            {venda.cliente?.cidade && (
                              <div>
                                <span className="font-medium">Cidade:</span> {venda.cliente.cidade}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Informações do Pedido */}
                  <div className="grid grid-cols-2 gap-2 text-sm border-b pb-4">
                    <div>
                      <span className="font-medium">Vendedor(a):</span> {venda.vendedor?.nome || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Pagamento:</span>{' '}
                      {venda.prazo_pagamento ? `${venda.prazo_pagamento} dias` : venda.forma_pagamento_detalhe?.nome || 'N/A'}
                    </div>
                  </div>

                  {/* Produtos */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold">PRODUTOS</h4>
                      <p className="text-xs text-muted-foreground">Arraste para reordenar ou clique nos cabeçalhos para ordenar</p>
                    </div>
                    <div className="border rounded-lg overflow-hidden">
                      {hasNovosImpostos ? (
                        /* Tabela com novos campos de impostos */
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="w-6 px-2 py-2"></th>
                                <th className="text-left px-2 py-2 font-medium">Produto</th>
                                <th className="text-right px-2 py-2 font-medium">Qtd</th>
                                <th className="text-right px-2 py-2 font-medium">Preço</th>
                                <th className="text-right px-2 py-2 font-medium">Subtotal</th>
                                {valorDesconto > 0 && <th className="text-right px-2 py-2 font-medium text-red-600">Desc.</th>}
                                <th className="text-right px-2 py-2 font-medium">Líquido</th>
                                {totalIPI > 0 && <th className="text-right px-2 py-2 font-medium">IPI</th>}
                                {totalICMS > 0 && <th className="text-right px-2 py-2 font-medium text-blue-600">ICMS*</th>}
                                {totalST > 0 && <th className="text-right px-2 py-2 font-medium">ST</th>}
                                <th className="text-right px-2 py-2 font-medium">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {itensOrdenados.map((item, index) => (
                                <tr
                                  key={index}
                                  draggable
                                  onDragStart={() => handleDragStart(index)}
                                  onDragOver={(e) => handleDragOver(e, index)}
                                  onDragEnd={handleDragEnd}
                                  className={`border-t transition-all cursor-move hover:bg-gray-50 ${
                                    draggedIndex === index ? 'opacity-50 bg-blue-50' : ''
                                  }`}
                                >
                                  <td className="px-2 py-2">
                                    <GripVertical className="h-3 w-3 text-gray-400" />
                                  </td>
                                  <td className="px-2 py-2">{item.produto?.nome || 'Produto sem nome'}</td>
                                  <td className="text-right px-2 py-2">{item.quantidade}</td>
                                  <td className="text-right px-2 py-2">{formatCurrency(item.preco_unitario)}</td>
                                  <td className="text-right px-2 py-2">{formatCurrency(item.subtotal_bruto || item.subtotal)}</td>
                                  {valorDesconto > 0 && (
                                    <td className="text-right px-2 py-2 text-red-600">
                                      {item.desconto_proporcional ? `-${formatCurrency(item.desconto_proporcional)}` : '-'}
                                    </td>
                                  )}
                                  <td className="text-right px-2 py-2 font-medium">
                                    {formatCurrency(item.subtotal_liquido || (item.subtotal - (item.desconto_proporcional || 0)))}
                                  </td>
                                  {totalIPI > 0 && (
                                    <td className="text-right px-2 py-2">{item.ipi_valor ? formatCurrency(item.ipi_valor) : '-'}</td>
                                  )}
                                  {totalICMS > 0 && (
                                    <td className="text-right px-2 py-2 text-blue-600">
                                      {item.icms_valor ? formatCurrency(item.icms_valor) : '-'}
                                    </td>
                                  )}
                                  {totalST > 0 && (
                                    <td className="text-right px-2 py-2">{item.st_valor ? formatCurrency(item.st_valor) : '-'}</td>
                                  )}
                                  <td className="text-right px-2 py-2 font-bold">
                                    {formatCurrency(item.total_item || item.subtotal)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        /* Tabela original simplificada */
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="w-8 px-2 py-2"></th>
                              <th
                                className="text-left px-3 py-2 font-medium cursor-pointer hover:bg-gray-100 transition-colors"
                                onClick={() => handleSort('codigo')}
                              >
                                <div className="flex items-center gap-1">
                                  Código
                                  <ArrowUpDown className="h-3 w-3" />
                                </div>
                              </th>
                              <th
                                className="text-left px-3 py-2 font-medium cursor-pointer hover:bg-gray-100 transition-colors"
                                onClick={() => handleSort('descricao')}
                              >
                                <div className="flex items-center gap-1">
                                  Descrição
                                  <ArrowUpDown className="h-3 w-3" />
                                </div>
                              </th>
                              <th
                                className="text-center px-3 py-2 font-medium cursor-pointer hover:bg-gray-100 transition-colors"
                                onClick={() => handleSort('quantidade')}
                              >
                                <div className="flex items-center justify-center gap-1">
                                  Qtd
                                  <ArrowUpDown className="h-3 w-3" />
                                </div>
                              </th>
                              <th
                                className="text-right px-3 py-2 font-medium cursor-pointer hover:bg-gray-100 transition-colors"
                                onClick={() => handleSort('preco')}
                              >
                                <div className="flex items-center justify-end gap-1">
                                  Preço Unit.
                                  <ArrowUpDown className="h-3 w-3" />
                                </div>
                              </th>
                              <th
                                className="text-right px-3 py-2 font-medium cursor-pointer hover:bg-gray-100 transition-colors"
                                onClick={() => handleSort('total')}
                              >
                                <div className="flex items-center justify-end gap-1">
                                  Total
                                  <ArrowUpDown className="h-3 w-3" />
                                </div>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {itensOrdenados.map((item, index) => (
                              <tr
                                key={index}
                                draggable
                                onDragStart={() => handleDragStart(index)}
                                onDragOver={(e) => handleDragOver(e, index)}
                                onDragEnd={handleDragEnd}
                                className={`border-t transition-all cursor-move hover:bg-gray-50 ${
                                  draggedIndex === index ? 'opacity-50 bg-blue-50' : ''
                                }`}
                              >
                                <td className="px-2 py-2">
                                  <GripVertical className="h-4 w-4 text-gray-400" />
                                </td>
                                <td className="px-3 py-2">{item.produto?.id || '-'}</td>
                                <td className="px-3 py-2">{item.produto?.nome || 'Produto sem nome'}</td>
                                <td className="text-center px-3 py-2">{item.quantidade}</td>
                                <td className="text-right px-3 py-2">{formatCurrency(item.preco_unitario)}</td>
                                <td className="text-right px-3 py-2">{formatCurrency(item.subtotal)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>

                  {/* Totais */}
                  <div className="border-t pt-4">
                    <div className="flex justify-end">
                      <div className="w-80 space-y-2 text-sm">
                        {hasNovosImpostos ? (
                          /* Resumo com novos impostos */
                          <>
                            <div className="flex justify-between">
                              <span>Total Bruto:</span>
                              <span className="font-medium">{formatCurrency(totalProdutos)}</span>
                            </div>
                            {valorDesconto > 0 && (
                              <div className="flex justify-between text-red-600">
                                <span>Desconto:</span>
                                <span className="font-medium">- {formatCurrency(valorDesconto)}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span>Subtotal Líquido:</span>
                              <span className="font-medium">{formatCurrency(totalProdutosLiquido)}</span>
                            </div>
                            <div className="border-t pt-2 space-y-1">
                              {totalIPI > 0 && (
                                <div className="flex justify-between">
                                  <span>IPI:</span>
                                  <span className="font-medium">{formatCurrency(totalIPI)}</span>
                                </div>
                              )}
                              {totalST > 0 && (
                                <div className="flex justify-between">
                                  <span>ST:</span>
                                  <span className="font-medium">{formatCurrency(totalST)}</span>
                                </div>
                              )}
                            </div>
                            <div className="flex justify-between text-base font-bold border-t pt-2">
                              <span>TOTAL GERAL:</span>
                              <span className="text-green-600">{formatCurrency(totalFinal)}</span>
                            </div>
                            {totalICMS > 0 && (
                              <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                                <div className="flex justify-between text-blue-700 font-medium mb-1">
                                  <span>ICMS (Informativo):</span>
                                  <span>{formatCurrency(totalICMS)}</span>
                                </div>
                                <p className="text-blue-600">
                                  * Este valor NÃO está incluído no total. É apenas informativo (pode ser creditado).
                                </p>
                              </div>
                            )}
                          </>
                        ) : (
                          /* Resumo original */
                          <>
                            <div className="flex justify-between">
                              <span>Total de Produtos:</span>
                              <span className="font-medium">{formatCurrency(totalProdutos)}</span>
                            </div>
                            {valorDesconto > 0 && (
                              <div className="flex justify-between">
                                <span>Desconto:</span>
                                <span className="font-medium text-red-600">- {formatCurrency(valorDesconto)}</span>
                              </div>
                            )}
                            {options.incluirImpostos && hasImposto && (
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Imposto ({venda.imposto_percentual}%):</span>
                                <span>
                                  {formatCurrency(((totalProdutos - valorDesconto) * venda.imposto_percentual!) / 100)}
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between text-base font-bold border-t pt-2">
                              <span>{hasImposto && options.incluirImpostos ? 'TOTAL COM IMPOSTO:' : 'TOTAL:'}</span>
                              <span>{formatCurrency(totalFinal)}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Observações */}
                  {options.incluirObservacoes && (venda.observacoes || options.observacoesAdicionais) && (
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-semibold mb-2">OBSERVAÇÕES</h4>
                      <div className="text-sm text-gray-700 space-y-1">
                        {venda.observacoes && <p>{venda.observacoes}</p>}
                        {options.observacoesAdicionais && (
                          <p className="text-blue-600 italic">{options.observacoesAdicionais}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ICMS-ST */}
                  {options.incluirImpostosICMSST && hasICMSST && totaisICMSST && (
                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Impostos ICMS-ST
                          {venda.uf_destino && (
                            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-mono ml-2">
                              UF: {venda.uf_destino}
                            </span>
                          )}
                        </h4>
                        <span className="text-sm font-bold text-green-700">
                          Total a Recolher: {formatCurrency(totaisICMSST.total_icms_st_recolher)}
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 border rounded-lg">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Produto</th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qtd</th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">MVA</th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Alíq.</th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Base ST</th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">ICMS Próprio</th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">ICMS-ST Total</th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase bg-green-50">A Recolher</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {itensOrdenados.filter(item => item.icms_st_recolher && item.icms_st_recolher > 0).map((item, idx) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-3 py-2 text-sm text-gray-900">
                                  {item.produto?.nome || `Produto #${item.produto_id}`}
                                </td>
                                <td className="px-3 py-2 text-sm text-gray-600 text-right">{item.quantidade}</td>
                                <td className="px-3 py-2 text-sm text-gray-600 text-right">
                                  {item.mva_aplicado ? `${(item.mva_aplicado * 100).toFixed(2)}%` : '-'}
                                </td>
                                <td className="px-3 py-2 text-sm text-gray-600 text-right">
                                  {item.aliquota_icms ? `${(item.aliquota_icms * 100).toFixed(2)}%` : '-'}
                                </td>
                                <td className="px-3 py-2 text-sm text-gray-600 text-right">
                                  {formatCurrency(item.base_calculo_st || 0)}
                                </td>
                                <td className="px-3 py-2 text-sm text-gray-600 text-right">
                                  {formatCurrency(item.icms_proprio || 0)}
                                </td>
                                <td className="px-3 py-2 text-sm text-gray-600 text-right">
                                  {formatCurrency(item.icms_st_total || 0)}
                                </td>
                                <td className="px-3 py-2 text-sm font-semibold text-green-700 text-right bg-green-50">
                                  {formatCurrency(item.icms_st_recolher || 0)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-2">
                        <p className="text-xs text-blue-900">
                          <strong>Nota:</strong> Os valores de ICMS-ST são para controle fiscal e não estão incluídos no total da venda.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Opções de Customização - Coluna Direita */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Opções de Exibição</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Switch: Detalhes do Cliente */}
                  <div className="flex items-center justify-between">
                    <Label htmlFor="incluir-cliente" className="text-sm cursor-pointer">
                      Dados do cliente
                    </Label>
                    <Switch
                      id="incluir-cliente"
                      checked={options.incluirDetalhesCliente}
                      onCheckedChange={(checked) => setOptions({ ...options, incluirDetalhesCliente: checked })}
                    />
                  </div>

                  {/* Switch: Endereço Completo */}
                  <div className="flex items-center justify-between">
                    <Label htmlFor="incluir-endereco" className="text-sm cursor-pointer">
                      Endereço completo
                    </Label>
                    <Switch
                      id="incluir-endereco"
                      checked={options.incluirEnderecoCompleto}
                      onCheckedChange={(checked) => setOptions({ ...options, incluirEnderecoCompleto: checked })}
                      disabled={!options.incluirDetalhesCliente}
                    />
                  </div>

                  {/* Switch: Impostos */}
                  {hasImposto && (
                    <div className="flex items-center justify-between">
                      <Label htmlFor="incluir-impostos" className="text-sm cursor-pointer">
                        Informações de impostos
                      </Label>
                      <Switch
                        id="incluir-impostos"
                        checked={options.incluirImpostos}
                        onCheckedChange={(checked) => setOptions({ ...options, incluirImpostos: checked })}
                      />
                    </div>
                  )}

                  {/* Switch: ICMS-ST */}
                  {hasICMSST && (
                    <div className="flex items-center justify-between">
                      <Label htmlFor="incluir-icms-st" className="text-sm cursor-pointer">
                        Impostos ICMS-ST
                      </Label>
                      <Switch
                        id="incluir-icms-st"
                        checked={options.incluirImpostosICMSST}
                        onCheckedChange={(checked) => setOptions({ ...options, incluirImpostosICMSST: checked })}
                      />
                    </div>
                  )}

                  {/* Switch: Observações */}
                  <div className="flex items-center justify-between">
                    <Label htmlFor="incluir-obs" className="text-sm cursor-pointer">
                      Observações
                    </Label>
                    <Switch
                      id="incluir-obs"
                      checked={options.incluirObservacoes}
                      onCheckedChange={(checked) => setOptions({ ...options, incluirObservacoes: checked })}
                    />
                  </div>

                  {/* Observações Adicionais */}
                  {options.incluirObservacoes && (
                    <div className="space-y-2 pt-2 border-t">
                      <Label htmlFor="obs-adicionais" className="text-sm">
                        Observações adicionais
                      </Label>
                      <textarea
                        id="obs-adicionais"
                        value={options.observacoesAdicionais}
                        onChange={(e) => setOptions({ ...options, observacoesAdicionais: e.target.value })}
                        placeholder="Digite observações que aparecerão no PDF..."
                        rows={4}
                        className="w-full text-sm border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-meguispet-primary"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Info Card */}
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-2">
                    <Eye className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-blue-900">
                      As alterações na pré-visualização são aplicadas apenas ao PDF gerado. Os dados originais da venda não
                      serão modificados.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            <X className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
          <Button onClick={handleConfirm} className="bg-meguispet-primary hover:bg-meguispet-primary/90">
            <Download className="mr-2 h-4 w-4" />
            Gerar e Baixar PDF
          </Button>
        </div>
      </div>
    </div>
  )
}
