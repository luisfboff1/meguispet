import React, { useState, useEffect } from 'react'
import axios from 'axios'
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
  Check
} from 'lucide-react'
import { vendasService } from '@/services/api'
import type { Venda, VendaForm as VendaFormValues } from '@/types'
import VendaForm from '@/components/forms/VendaForm'
import Toast from '@/components/ui/Toast'
import AlertDialog from '@/components/ui/AlertDialog'

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

        // Mostrar mensagem de sucesso detalhada
        setAlert({
          title: editingVenda ? '✅ Venda Atualizada' : '✅ Venda Realizada com Sucesso',
          message: response.message || (editingVenda
            ? 'A venda foi atualizada com sucesso no sistema.'
            : 'A venda foi registrada com sucesso e o estoque foi atualizado automaticamente.'),
          type: 'success',
        })
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
            <Button variant="ghost" onClick={() => setSelectedVenda(null)}>
              Fechar
            </Button>
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
      <Card>
        <CardHeader>
          <CardTitle>Lista de Vendas</CardTitle>
          <CardDescription>
            {filteredVendas.length} venda(s) encontrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-meguispet-primary"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">ID</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Cliente</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Vendedor</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Total</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Forma Pagamento</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Estoque</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Data</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVendas.map((venda) => (
                    <tr key={venda.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-900">#{venda.id}</td>
                      <td className="py-3 px-4 text-sm text-gray-900">{venda.cliente?.nome || 'N/A'}</td>
                      <td className="py-3 px-4 text-sm text-gray-900">{venda.vendedor?.nome || 'N/A'}</td>
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">
                        {formatCurrency(venda.valor_final)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {venda.forma_pagamento_detalhe?.nome ?? (typeof venda.forma_pagamento === 'string' ? venda.forma_pagamento : 'N/A')}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {typeof venda.estoque === 'object' && venda.estoque?.nome ? venda.estoque.nome : 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(venda.status)}`}>
                          {venda.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {formatDate(venda.created_at)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="sm" onClick={() => handleVisualizarVenda(venda)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleEditarVenda(venda)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          {venda.status === 'pendente' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-green-600 hover:text-green-700"
                              onClick={() => handleConfirmarVenda(venda)}
                              title="Confirmar Venda"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleExcluirVenda(venda)}
                            disabled={deletingId === venda.id}
                          >
                            {deletingId === venda.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

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
