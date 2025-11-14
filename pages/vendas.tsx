import React, { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { ColumnDef } from '@tanstack/react-table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Edit, 
  Trash2,
  ShoppingCart,
  DollarSign,
  Calendar,
  Loader2,
  Check,
  FileText
} from 'lucide-react'
import { vendasService, clientesService } from '@/services/api'
import type { Venda, VendaForm as VendaFormValues } from '@/types'
import VendaForm from '@/components/forms/VendaForm'
import Toast from '@/components/ui/Toast'
import AlertDialog from '@/components/ui/AlertDialog'
import { DataTable, SortableHeader } from '@/components/ui/data-table'
import { downloadOrderPDF, PDFGeneratorOptions } from '@/lib/pdf-generator'
import VendaPDFPreviewModal, { PDFPreviewOptions } from '@/components/modals/VendaPDFPreviewModal'

export default function VendasPage() {
  const [vendas, setVendas] = useState<Venda[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [editingVenda, setEditingVenda] = useState<Venda | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null)
  const [alert, setAlert] = useState<{ title: string; message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null)
  const [selectedVenda, setSelectedVenda] = useState<Venda | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [showPDFPreview, setShowPDFPreview] = useState(false)
  const [vendaParaPDF, setVendaParaPDF] = useState<Venda | null>(null)
  const [showPrintConfirmation, setShowPrintConfirmation] = useState(false)
  const [vendaRecemSalva, setVendaRecemSalva] = useState<Venda | null>(null)

  useEffect(() => {
    loadVendas()
  }, [currentPage])

  const loadVendas = async () => {
    try {
      setLoading(true)
      const response = await vendasService.getAll(currentPage, 10)
      if (response.success && response.data) {
        console.log('Vendas carregadas:', response.data)
        setVendas(response.data)
        if (selectedVenda) {
          const vendaAtualizada = response.data.find(v => v.id === selectedVenda.id) || null
          setSelectedVenda(vendaAtualizada)
        }
      }
    } catch (error) {
      console.error('Erro ao carregar vendas:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredVendas = vendas.filter(venda => {
    const searchLower = searchTerm.toLowerCase()
    const clienteMatch = venda.cliente?.nome?.toLowerCase().includes(searchLower)
    const vendedorMatch = venda.vendedor?.nome?.toLowerCase().includes(searchLower)
    const numeroVendaMatch = venda.numero_venda?.toLowerCase().includes(searchLower)

    // Garantir que forma_pagamento seja sempre string
    const formaPagamentoStr = venda.forma_pagamento_detalhe?.nome
      || (typeof venda.forma_pagamento === 'string' ? venda.forma_pagamento : '')
      || ''
    const formaPagamentoMatch = formaPagamentoStr.toLowerCase().includes(searchLower)

    return clienteMatch || vendedorMatch || formaPagamentoMatch || numeroVendaMatch
  })

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pago': return 'bg-green-100 text-green-800'
      case 'pendente': return 'bg-yellow-100 text-yellow-800'
      case 'cancelado': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleNovaVenda = () => {
    setSelectedVenda(null)
    setEditingVenda(null)
    setShowForm(true)
  }

  const handleEditarVenda = async (venda: Venda) => {
    try {
      setLoading(true)
      // Buscar a venda completa com seus itens
      const response = await vendasService.getById(venda.id)
      if (response.success && response.data) {
        setSelectedVenda(null)
        setEditingVenda(response.data)
        setShowForm(true)
      } else {
        setToast({ message: 'Erro ao carregar dados da venda', type: 'error' })
      }
    } catch (error) {
      console.error('Erro ao carregar venda:', error)
      setToast({ message: 'Erro ao carregar dados da venda', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleSalvarVenda = async (vendaData: VendaFormValues) => {
    try {
      setFormLoading(true)
      let response
      if (editingVenda) {
        response = await vendasService.update(editingVenda.id, vendaData)
      } else {
        response = await vendasService.create(vendaData)
      }
      if (response && response.success) {
        await loadVendas()
        setShowForm(false)
        setEditingVenda(null)

        // Buscar venda completa para impressão
        const vendaId = editingVenda?.id || (typeof response.data === 'object' && response.data && 'id' in response.data ? response.data.id : undefined)
        if (vendaId) {
          try {
            const vendaCompleta = await vendasService.getById(vendaId)
            if (vendaCompleta.success && vendaCompleta.data) {
              setVendaRecemSalva(vendaCompleta.data)
            }
          } catch (error) {
            console.error('Erro ao buscar venda completa:', error)
          }
        }

        // Mostrar mensagem de sucesso detalhada
        setAlert({
          title: editingVenda ? '✅ Venda Atualizada' : '✅ Venda Realizada com Sucesso',
          message: response.message || (editingVenda
            ? 'A venda foi atualizada com sucesso no sistema.'
            : 'A venda foi registrada com sucesso e o estoque foi atualizado automaticamente.'),
          type: 'success',
        })

        // Abrir modal de confirmação de impressão
        setShowPrintConfirmation(true)
      } else {
        setAlert({
          title: '❌ Erro ao Salvar Venda',
          message: response?.message || 'Não foi possível salvar a venda. Verifique os dados e tente novamente.',
          type: 'error',
        })
      }
    } catch (error: unknown) {
      let msg = 'Não foi possível salvar a venda. Verifique os dados e tente novamente.'
      if (typeof error === 'object' && error !== null) {
        const errObj = error as { response?: { data?: { message?: string } }, message?: string }
        if (errObj.response?.data?.message) {
          msg = errObj.response.data.message
        } else if (typeof errObj.message === 'string') {
          msg = errObj.message
        }
      }
      setAlert({
        title: '❌ Erro ao Salvar Venda',
        message: msg,
        type: 'error',
      })
      console.error('Erro ao salvar venda:', error)
    } finally {
      setFormLoading(false)
    }
  }

  const handleCancelarForm = () => {
  setShowForm(false)
  setEditingVenda(null)
  }

  const handleConfirmPrint = () => {
    if (vendaRecemSalva) {
      setShowPrintConfirmation(false)
      setVendaParaPDF(vendaRecemSalva)
      setShowPDFPreview(true)
      setVendaRecemSalva(null)
    }
  }

  const handleCancelPrint = () => {
    setShowPrintConfirmation(false)
    setVendaRecemSalva(null)
  }

  const handleVisualizarVenda = (venda: Venda) => {
    setSelectedVenda(venda)
    setShowForm(false)
    setEditingVenda(null)
  }

  const handleExcluirVenda = async (venda: Venda) => {
    const confirmar = window.confirm(`Deseja realmente excluir a venda #${venda.id}?`)
    if (!confirmar) return

    try {
      setDeletingId(venda.id)
      const response = await vendasService.delete(venda.id)
      if (response.success) {
        await loadVendas()
        setToast({ message: 'Venda excluída com sucesso.', type: 'success' })
        if (selectedVenda?.id === venda.id) {
          setSelectedVenda(null)
        }
      } else if (response.message) {
        setToast({ message: response.message, type: 'error' })
      }
    } catch (error: unknown) {
      let msg = 'Não foi possível excluir a venda.'
      if (typeof error === 'object' && error !== null) {
        const errObj = error as { response?: { data?: { message?: string } }, message?: string }
        if (errObj.response?.data?.message) {
          msg = errObj.response.data.message
        } else if (typeof errObj.message === 'string') {
          msg = errObj.message
        }
      }
      setToast({ message: msg, type: 'error' })
      console.error('Erro ao excluir venda:', error)
    } finally {
      setDeletingId(null)
    }
  }

  const handleConfirmarVenda = async (venda: Venda) => {
    const confirmar = window.confirm(`Confirmar pagamento da venda #${venda.id}?`)
    if (!confirmar) return

    try {
      const response = await vendasService.updateStatus(venda.id, 'pago')
      if (response.success) {
        await loadVendas()
        setToast({ message: 'Venda confirmada com sucesso!', type: 'success' })
      } else {
        setToast({ message: response.message || 'Erro ao confirmar venda', type: 'error' })
      }
    } catch (error: unknown) {
      let msg = 'Não foi possível confirmar a venda.'
      if (typeof error === 'object' && error !== null) {
        const errObj = error as { response?: { data?: { message?: string } }, message?: string }
        if (errObj.response?.data?.message) {
          msg = errObj.response.data.message
        } else if (typeof errObj.message === 'string') {
          msg = errObj.message
        }
      }
      setToast({ message: msg, type: 'error' })
      console.error('Erro ao confirmar venda:', error)
    }
  }

  const handleExportar = () => {
    // Gerar CSV das vendas
    const csvContent = generateCSV(vendas)
    downloadCSV(csvContent, 'vendas.csv')
  }

  const handleExportarPDF = async (venda: Venda) => {
    try {
      // Se a venda não tem itens, buscar a venda completa
      let vendaCompleta = venda
      if (!venda.itens?.length) {
        const response = await vendasService.getById(venda.id)
        if (response.success && response.data) {
          vendaCompleta = response.data
        } else {
          setToast({ message: 'Erro ao carregar dados da venda', type: 'error' })
          return
        }
      }

      // Sempre buscar dados completos do cliente se houver cliente_id e não tiver cliente
      if (vendaCompleta.cliente_id && !vendaCompleta.cliente) {
        try {
          const clienteResponse = await clientesService.getById(vendaCompleta.cliente_id)
          if (clienteResponse.success && clienteResponse.data) {
            vendaCompleta = {
              ...vendaCompleta,
              cliente: clienteResponse.data
            }
          }
        } catch (error) {
          console.error('Erro ao buscar dados do cliente:', error)
          // Continua mesmo se falhar ao buscar cliente
        }
      }

      // Abrir modal de pré-visualização ao invés de baixar diretamente
      setVendaParaPDF(vendaCompleta)
      setShowPDFPreview(true)
    } catch (error) {
      console.error('Erro ao preparar PDF:', error)
      setToast({ message: 'Erro ao preparar visualização do PDF', type: 'error' })
    }
  }

  const handleConfirmPDFDownload = async (options: PDFPreviewOptions) => {
    if (!vendaParaPDF) return

    try {
      // Converter as opções do modal para as opções do gerador de PDF
      const pdfOptions: PDFGeneratorOptions = {
        incluirObservacoes: options.incluirObservacoes,
        incluirDetalhesCliente: options.incluirDetalhesCliente,
        incluirEnderecoCompleto: options.incluirEnderecoCompleto,
        incluirImpostos: options.incluirImpostos,
        observacoesAdicionais: options.observacoesAdicionais
      }

      // Gerar e baixar o PDF com as opções selecionadas
      await downloadOrderPDF(vendaParaPDF, 'MEGUISPET', pdfOptions)
      setToast({ message: 'PDF gerado com sucesso!', type: 'success' })
    } catch (error) {
      console.error('Erro ao gerar PDF:', error)
      setToast({ message: 'Erro ao gerar PDF do pedido', type: 'error' })
    }
  }

  const generateCSV = (data: Venda[]) => {
    const headers = ['ID', 'Cliente', 'Vendedor', 'Total', 'Status', 'Data', 'Forma Pagamento']
    const rows = data.map(venda => [
      venda.id,
      venda.cliente?.nome || 'N/A',
      venda.vendedor?.nome || 'N/A',
      venda.valor_final,
      venda.status,
      new Date(venda.created_at).toLocaleDateString('pt-BR'),
      venda.forma_pagamento
    ])
    
    return [headers, ...rows].map(row => 
      row.map(field => `"${field}"`).join(',')
    ).join('\n')
  }

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Helper function to get payment method
  const getFormaPagamento = (venda: Venda): string => {
    return venda.forma_pagamento_detalhe?.nome || 
           (typeof venda.forma_pagamento === 'string' ? venda.forma_pagamento : '') || 
           ''
  }

  // Column definitions for vendas table
  const vendasColumns = useMemo<ColumnDef<Venda>[]>(() => {
    return [
    {
      accessorKey: "numero_venda",
      header: ({ column }) => <SortableHeader column={column}>Venda</SortableHeader>,
      cell: ({ row }) => (
        <div className="flex items-center space-x-3 min-w-[140px]">
          <div className="w-8 h-8 bg-meguispet-primary/10 rounded flex items-center justify-center flex-shrink-0">
            <ShoppingCart className="h-4 w-4 text-meguispet-primary" />
          </div>
          <div>
            <div className="font-medium text-gray-900">{row.original.numero_venda || `#${row.original.id}`}</div>
            <div className="text-sm text-gray-500">ID: #{row.original.id}</div>
          </div>
        </div>
      ),
    },
    {
      id: "cliente",
      header: ({ column }) => <SortableHeader column={column}>Cliente</SortableHeader>,
      accessorFn: (row) => row.cliente?.nome || 'N/A',
      cell: ({ row }) => (
        <div className="text-sm text-gray-900">
          {row.original.cliente?.nome || 'N/A'}
        </div>
      ),
    },
    {
      id: "vendedor",
      header: ({ column }) => <SortableHeader column={column}>Vendedor</SortableHeader>,
      accessorFn: (row) => row.vendedor?.nome || 'N/A',
      cell: ({ row }) => (
        <div className="text-sm text-gray-900">
          {row.original.vendedor?.nome || 'N/A'}
        </div>
      ),
    },
    {
      accessorKey: "valor_final",
      header: ({ column }) => <SortableHeader column={column}>Total com Imposto</SortableHeader>,
      cell: ({ row }) => (
        <div className="text-sm font-medium text-green-600">
          {formatCurrency(row.original.valor_final)}
        </div>
      ),
    },
    {
      accessorKey: "total_ipi",
      header: ({ column }) => <SortableHeader column={column}>IPI</SortableHeader>,
      cell: ({ row }) => (
        <div className="text-sm text-gray-700">
          {row.original.total_ipi ? formatCurrency(row.original.total_ipi) : '-'}
        </div>
      ),
      enableHiding: true,
    },
    {
      accessorKey: "total_icms",
      header: ({ column }) => <SortableHeader column={column}>ICMS</SortableHeader>,
      cell: ({ row }) => (
        <div className="text-sm text-blue-600" title="Informativo - não incluído no total">
          {row.original.total_icms ? formatCurrency(row.original.total_icms) : '-'}
        </div>
      ),
      enableHiding: true,
    },
    {
      accessorKey: "total_st",
      header: ({ column }) => <SortableHeader column={column}>ST</SortableHeader>,
      cell: ({ row }) => (
        <div className="text-sm text-gray-700">
          {row.original.total_st ? formatCurrency(row.original.total_st) : '-'}
        </div>
      ),
      enableHiding: true,
    },
    {
      id: "forma_pagamento",
      header: ({ column }) => <SortableHeader column={column}>Pagamento</SortableHeader>,
      accessorFn: (row) => getFormaPagamento(row),
      cell: ({ row }) => (
        <div className="text-sm text-gray-900">
          {getFormaPagamento(row.original) || 'N/A'}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => <SortableHeader column={column}>Status</SortableHeader>,
      cell: ({ row }) => (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(row.original.status)}`}>
          {row.original.status === 'pago' ? 'Pago' : 
           row.original.status === 'pendente' ? 'Pendente' : 'Cancelado'}
        </span>
      ),
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => <SortableHeader column={column}>Data</SortableHeader>,
      cell: ({ row }) => (
        <div className="text-sm text-gray-900">
          {formatDate(row.original.created_at)}
        </div>
      ),
    },
    {
      id: "acoes",
      header: "Ações",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => handleVisualizarVenda(row.original)}
            title="Ver detalhes"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => handleExportarPDF(row.original)}
            title="Exportar PDF"
            className="text-blue-600 hover:text-blue-700"
          >
            <FileText className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => handleEditarVenda(row.original)}
            title="Editar venda"
          >
            <Edit className="h-4 w-4" />
          </Button>
          {row.original.status === 'pendente' && (
            <Button 
              variant="ghost" 
              size="sm"
              className="text-green-600 hover:text-green-700"
              onClick={() => handleConfirmarVenda(row.original)}
              title="Confirmar pagamento"
            >
              <Check className="h-4 w-4" />
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="sm"
            className="text-red-600 hover:text-red-700"
            onClick={() => handleExcluirVenda(row.original)}
            disabled={deletingId === row.original.id}
            title="Excluir venda"
          >
            {deletingId === row.original.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      ),
    },
  ]
  }, [deletingId])

  return (
    <div className="space-y-6">
      {alert && (
        <AlertDialog
          title={alert.title}
          message={alert.message}
          type={alert.type}
          onClose={() => setAlert(null)}
        />
      )}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
      {/* Modal de Confirmação de Impressão */}
      {showPrintConfirmation && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-lg">
          <Card className="w-full max-w-md shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Imprimir Pedido
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700">
                Você deseja imprimir o pedido agora?
              </p>
              <div className="flex items-center justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={handleCancelPrint}
                >
                  Não, obrigado
                </Button>
                <Button
                  onClick={handleConfirmPrint}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Sim, visualizar PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal de Pré-visualização do PDF */}
      <VendaPDFPreviewModal
        venda={vendaParaPDF}
        open={showPDFPreview}
        onClose={() => {
          setShowPDFPreview(false)
          setVendaParaPDF(null)
        }}
        onConfirmDownload={handleConfirmPDFDownload}
      />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendas</h1>
          <p className="text-gray-600">Gerencie suas vendas e pedidos</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Button 
            className="bg-meguispet-primary hover:bg-meguispet-primary/90"
            onClick={handleNovaVenda}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova Venda
          </Button>
          <Button 
            variant="outline"
            onClick={handleExportar}
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Toast cobre mensagens de sucesso/erro */}

      {selectedVenda ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Detalhes da venda #{selectedVenda.id}</CardTitle>
              <CardDescription>Número: {selectedVenda.numero_venda}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleExportarPDF(selectedVenda)}
                className="text-blue-600 hover:text-blue-700"
              >
                <FileText className="mr-2 h-4 w-4" />
                Exportar PDF
              </Button>
              <Button variant="ghost" onClick={() => setSelectedVenda(null)}>
                Fechar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Cliente</p>
                <p className="text-base text-gray-900">{selectedVenda.cliente?.nome ?? 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vendedor</p>
                <p className="text-base text-gray-900">{selectedVenda.vendedor?.nome ?? 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valor final</p>
                <p className="text-base text-gray-900">{formatCurrency(Number(selectedVenda.valor_final || 0))}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Forma de pagamento</p>
                <p className="text-base text-gray-900">{selectedVenda.forma_pagamento_detalhe?.nome ?? (typeof selectedVenda.forma_pagamento === 'string' ? selectedVenda.forma_pagamento : 'N/A')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estoque</p>
                <p className="text-base text-gray-900">{typeof selectedVenda.estoque === 'object' && selectedVenda.estoque?.nome ? selectedVenda.estoque.nome : 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="text-base capitalize text-gray-900">{selectedVenda.status}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-muted-foreground">Observações</p>
                <p className="text-base text-gray-900">{selectedVenda.observacoes || 'Sem observações'}</p>
              </div>
            </div>

            {/* Impostos ICMS-ST - Seção compacta */}
            {selectedVenda.itens && selectedVenda.itens.length > 0 && selectedVenda.itens.some(item => item.icms_st_recolher && item.icms_st_recolher > 0) ? (
              <div className="mt-6 pt-6 border-t">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Impostos ICMS-ST
                    {selectedVenda.uf_destino && (
                      <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-mono ml-2">
                        UF: {selectedVenda.uf_destino}
                      </span>
                    )}
                  </h3>
                  {(() => {
                    const totais = selectedVenda.itens.reduce((acc, item) => ({
                      icms_st_recolher: acc.icms_st_recolher + (item.icms_st_recolher || 0)
                    }), { icms_st_recolher: 0 })
                    return (
                      <span className="text-sm font-bold text-green-700">
                        Total a Recolher: {formatCurrency(totais.icms_st_recolher)}
                      </span>
                    )
                  })()}
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
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
                      {selectedVenda.itens.filter(item => item.icms_st_recolher && item.icms_st_recolher > 0).map((item, idx) => (
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
              </div>
            ) : null}

          </CardContent>
        </Card>
      ) : null}


      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vendas</CardTitle>
            <ShoppingCart className="h-4 w-4 text-meguispet-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vendas.length}</div>
            <p className="text-xs text-muted-foreground">Este mês</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento</CardTitle>
            <DollarSign className="h-4 w-4 text-meguispet-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(vendas.reduce((sum, venda) => sum + Number(venda.valor_final || 0), 0))}
            </div>
            <p className="text-xs text-muted-foreground">Este mês</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <DollarSign className="h-4 w-4 text-meguispet-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {vendas.length > 0 ? formatCurrency(vendas.reduce((sum, venda) => sum + Number(venda.valor_final || 0), 0) / vendas.length) : 'R$ 0,00'}
            </div>
            <p className="text-xs text-muted-foreground">Por venda</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas Hoje</CardTitle>
            <Calendar className="h-4 w-4 text-meguispet-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {vendas.filter(venda => new Date(venda.created_at).toDateString() === new Date().toDateString()).length}
            </div>
            <p className="text-xs text-muted-foreground">Hoje</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  placeholder="Buscar por número, cliente ou vendedor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Vendas Table */}
      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-meguispet-primary"></div>
          </CardContent>
        </Card>
      ) : filteredVendas.length > 0 ? (
        <DataTable 
          columns={vendasColumns} 
          data={filteredVendas}
          enableColumnResizing={true}
          enableSorting={true}
          enableColumnVisibility={true}
          mobileVisibleColumns={['numero_venda', 'valor_final', 'status', 'acoes']}
          initialColumnVisibility={{
            total_ipi: false,
            total_icms: false,
            total_st: false,
          }}
        />
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <ShoppingCart className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma venda encontrada</h3>
            <p className="text-gray-600 text-center">
              {searchTerm ? 'Tente ajustar os filtros de busca' : 'Comece adicionando sua primeira venda'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Formulário de Venda */}
      {showForm && (
          <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-lg">
          <VendaForm
            venda={editingVenda || undefined}
            onSubmit={handleSalvarVenda}
            onCancel={handleCancelarForm}
            loading={formLoading}
            errorMessage={undefined}
          />
        </div>
      )}
    </div>
  )
}
