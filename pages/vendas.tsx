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
  Loader2
} from 'lucide-react'
import { vendasService } from '@/services/api'
import type { Venda, VendaForm as VendaFormValues } from '@/types'
import VendaForm from '@/components/forms/VendaForm'

export default function VendasPage() {
  const [vendas, setVendas] = useState<Venda[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [editingVenda, setEditingVenda] = useState<Venda | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
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
    const formaPagamentoMatch = (venda.forma_pagamento_detalhe?.nome ?? venda.forma_pagamento ?? '')
      .toLowerCase()
      .includes(searchLower)
    return clienteMatch || vendedorMatch || formaPagamentoMatch
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
    setFormError(null)
    setSuccessMessage(null)
    setSelectedVenda(null)
    setEditingVenda(null)
    setShowForm(true)
  }

  const handleEditarVenda = (venda: Venda) => {
    setFormError(null)
    setSuccessMessage(null)
    setSelectedVenda(null)
    setEditingVenda(venda)
    setShowForm(true)
  }

  const handleSalvarVenda = async (vendaData: VendaFormValues) => {
    try {
      setFormLoading(true)
      setFormError(null)
      setSuccessMessage(null)
      
      if (editingVenda) {
        // Editar venda existente
        const response = await vendasService.update(editingVenda.id, vendaData)
        if (response.success) {
          await loadVendas()
          setShowForm(false)
          setEditingVenda(null)
          setSuccessMessage('Venda atualizada com sucesso.')
        }
      } else {
        // Criar nova venda
        const response = await vendasService.create(vendaData)
        if (response.success) {
          await loadVendas()
          setShowForm(false)
          setSuccessMessage('Venda criada com sucesso.')
        }
      }
    } catch (error) {
      console.error('Erro ao salvar venda:', error)
      if (axios.isAxiosError(error)) {
        const message = typeof error.response?.data?.message === 'string'
          ? error.response.data.message
          : 'Não foi possível salvar a venda. Verifique os dados e tente novamente.'
        setFormError(message)
      } else {
        setFormError('Não foi possível salvar a venda. Verifique os dados e tente novamente.')
      }
    } finally {
      setFormLoading(false)
    }
  }

  const handleCancelarForm = () => {
    setShowForm(false)
    setEditingVenda(null)
    setFormError(null)
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
      setFormError(null)
      setSuccessMessage(null)
      const response = await vendasService.delete(venda.id)
      if (response.success) {
        await loadVendas()
        setSuccessMessage('Venda excluída com sucesso.')
        if (selectedVenda?.id === venda.id) {
          setSelectedVenda(null)
        }
      } else if (response.message) {
        setFormError(response.message)
      }
    } catch (error) {
      console.error('Erro ao excluir venda:', error)
      if (axios.isAxiosError(error)) {
        const message = typeof error.response?.data?.message === 'string'
          ? error.response.data.message
          : 'Não foi possível excluir a venda.'
        setFormError(message)
      } else {
        setFormError('Não foi possível excluir a venda.')
      }
    } finally {
      setDeletingId(null)
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

      {successMessage ? (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {successMessage}
        </div>
      ) : null}

      {!showForm && formError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {formError}
        </div>
      ) : null}

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
                <p className="text-base text-gray-900">{selectedVenda.forma_pagamento_detalhe?.nome ?? selectedVenda.forma_pagamento ?? 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estoque</p>
                <p className="text-base text-gray-900">{selectedVenda.estoque?.nome ?? 'N/A'}</p>
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
                  placeholder="Buscar por cliente ou vendedor..."
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
                        {venda.forma_pagamento_detalhe?.nome ?? venda.forma_pagamento ?? 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {venda.estoque?.nome ?? 'N/A'}
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
            errorMessage={formError || undefined}
          />
        </div>
      )}
    </div>
  )
}
