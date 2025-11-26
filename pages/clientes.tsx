import React, { useState, useEffect, useMemo } from 'react'
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
  RotateCcw,
  Users,
  Phone,
  Mail,
  MapPin,
  Calendar
} from 'lucide-react'
import { clientesService } from '@/services/api'
import type { Cliente, ClienteForm as ClienteFormValues } from '@/types'
import ClienteForm from '@/components/forms/ClienteForm'
import Toast from '@/components/ui/Toast'
import { DataTable, SortableHeader } from '@/components/ui/data-table'

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState<'todos' | 'cliente' | 'fornecedor' | 'ambos'>('cliente')
  const [showInactive, setShowInactive] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null)

  useEffect(() => {
    loadClientes()
  }, [showInactive])

  const loadClientes = async () => {
    try {
      setLoading(true)
      // Carregar TODOS os clientes de uma vez (limit = 1000)
      // Se showInactive for true, inclui clientes inativos
      const response = await clientesService.getAll(1, 1000, showInactive)

      if (response.success && response.data) {
        setClientes(response.data)
      }
    } catch (error) {
      console.error('Erro ao carregar clientes:', error)
    } finally {
      setLoading(false)
    }
  }

  const tipoMatch = (tipo: Cliente['tipo']) => {
    if (tipoFiltro === 'todos') return true
    if (tipoFiltro === 'cliente') return tipo === 'cliente' || tipo === 'ambos'
    if (tipoFiltro === 'fornecedor') return tipo === 'fornecedor' || tipo === 'ambos'
    return tipo === 'ambos'
  }

  const filteredClientes = clientes.filter(cliente => {
    const termo = searchTerm.toLowerCase()
    const matchesSearch =
      cliente.nome.toLowerCase().includes(termo) ||
      cliente.email?.toLowerCase().includes(termo) ||
      cliente.telefone?.includes(searchTerm)
    return matchesSearch && tipoMatch(cliente.tipo)
  })

  const tipoLabel: Record<Cliente['tipo'], string> = {
    cliente: 'Cliente',
    fornecedor: 'Fornecedor',
    ambos: 'Cliente e Fornecedor'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const handleNovoCliente = () => {
    setEditingCliente(null)
    setShowForm(true)
  }

  const handleEditarCliente = (cliente: Cliente) => {
    setEditingCliente(cliente)
    setShowForm(true)
  }

  const handleSalvarCliente = async (clienteData: ClienteFormValues) => {
    try {
      setFormLoading(true)

      let response
      if (editingCliente) {
        // Editar cliente existente
        response = await clientesService.update(editingCliente.id, clienteData)
      } else {
        // Criar novo cliente
        response = await clientesService.create(clienteData)
      }

      if (response && response.success) {
        await loadClientes()
        setShowForm(false)
        setEditingCliente(null)
        setToast({ message: editingCliente ? 'Cliente atualizado com sucesso!' : 'Cliente cadastrado com sucesso!', type: 'success' })
      } else {
        // Extrair erros de validação se existirem
        let errorMsg = response?.message || 'Erro ao salvar cliente. Tente novamente.'
        if ((response as any)?.errors && Array.isArray((response as any).errors)) {
          const errorFields = (response as any).errors.map((err: any) => `${err.field}: ${err.message}`).join('\n')
          errorMsg = `${errorMsg}\n\n${errorFields}`
        }
        setToast({ message: errorMsg, type: 'error' })
      }
    } catch (error: unknown) {
      let msg = 'Erro ao salvar cliente. Tente novamente.'
      if (typeof error === 'object' && error !== null) {
        const errObj = error as { response?: { data?: { message?: string, errors?: any[] } }, message?: string }

        // Tentar extrair erros de validação da resposta
        if (errObj.response?.data?.errors && Array.isArray(errObj.response.data.errors)) {
          const errorFields = errObj.response.data.errors.map((err: any) => `• ${err.field}: ${err.message}`).join('\n')
          msg = `Dados inválidos:\n${errorFields}`
        } else if (errObj.response?.data?.message) {
          msg = errObj.response.data.message
        } else if (typeof errObj.message === 'string') {
          msg = errObj.message
        }
      }
      setToast({ message: msg, type: 'error' })
    } finally {
      setFormLoading(false)
    }
  }

  const handleCancelarForm = () => {
    setShowForm(false)
    setEditingCliente(null)
  }

  const handleDeletarCliente = async (cliente: Cliente) => {
    if (!confirm(`Tem certeza que deseja desativar o cliente "${cliente.nome}"?`)) {
      return
    }

    try {
      const response = await clientesService.delete(cliente.id)

      if (response && response.success) {
        await loadClientes()
        setToast({ message: 'Cliente desativado com sucesso!', type: 'success' })
      } else {
        setToast({ message: response?.message || 'Erro ao desativar cliente.', type: 'error' })
      }
    } catch (error) {
      console.error('Erro ao desativar cliente:', error)
      let msg = 'Erro ao desativar cliente. Tente novamente.'
      if (typeof error === 'object' && error !== null) {
        const errObj = error as { response?: { data?: { message?: string } }, message?: string }
        if (errObj.response?.data?.message) {
          msg = errObj.response.data.message
        } else if (typeof errObj.message === 'string') {
          msg = errObj.message
        }
      }
      setToast({ message: msg, type: 'error' })
    }
  }

  const handleReativarCliente = async (cliente: Cliente) => {
    if (!confirm(`Tem certeza que deseja reativar o cliente "${cliente.nome}"?`)) {
      return
    }

    try {
      const response = await clientesService.reactivate(cliente.id)

      if (response && response.success) {
        await loadClientes()
        setToast({ message: 'Cliente reativado com sucesso!', type: 'success' })
      } else {
        setToast({ message: response?.message || 'Erro ao reativar cliente.', type: 'error' })
      }
    } catch (error) {
      console.error('Erro ao reativar cliente:', error)
      let msg = 'Erro ao reativar cliente. Tente novamente.'
      if (typeof error === 'object' && error !== null) {
        const errObj = error as { response?: { data?: { message?: string } }, message?: string }
        if (errObj.response?.data?.message) {
          msg = errObj.response.data.message
        } else if (typeof errObj.message === 'string') {
          msg = errObj.message
        }
      }
      setToast({ message: msg, type: 'error' })
    }
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  // Column definitions for clientes table
  const clientesColumns = useMemo<ColumnDef<Cliente>[]>(() => {
    return [
    {
      id: "acoes",
      header: () => <div className="text-sm font-medium">Ações</div>,
      enableSorting: false,
      cell: ({ row }) => {
        const isInactive = !row.original.ativo
        return (
          <div className="flex items-center gap-2">
            {!isInactive && (
              <>
                <Button variant="ghost" size="sm" title="Ver detalhes">
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditarCliente(row.original)}
                  title="Editar cliente"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeletarCliente(row.original)}
                  title="Desativar cliente"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
            {isInactive && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleReativarCliente(row.original)}
                title="Reativar cliente"
                className="text-green-600 hover:text-green-700 hover:bg-green-50"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Reativar
              </Button>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "nome",
      header: ({ column }) => <SortableHeader column={column}>Cliente</SortableHeader>,
      cell: ({ row }) => {
        const isInactive = !row.original.ativo
        return (
          <div className="flex items-center space-x-3 min-w-[200px]">
            <div className={`w-10 h-10 ${isInactive ? 'bg-gray-300' : 'bg-meguispet-primary/10'} rounded-full flex items-center justify-center flex-shrink-0`}>
              <span className={`text-sm font-medium ${isInactive ? 'text-gray-600' : 'text-meguispet-primary'}`}>
                {getInitials(row.original.nome)}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`font-medium ${isInactive ? 'text-gray-500' : 'text-gray-900'}`}>
                  {row.original.nome}
                </span>
                {isInactive && (
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                    Inativo
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-500">
                Cliente desde {formatDate(row.original.created_at)}
              </div>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "tipo",
      header: ({ column }) => <SortableHeader column={column}>Tipo</SortableHeader>,
      cell: ({ row }) => (
        <span className="inline-flex items-center rounded-full bg-meguispet-primary/10 px-2 py-0.5 text-xs font-medium text-meguispet-primary">
          {tipoLabel[row.original.tipo]}
        </span>
      ),
    },
    {
      accessorKey: "email",
      header: ({ column }) => <SortableHeader column={column}>Email</SortableHeader>,
      cell: ({ row }) => (
        row.original.email ? (
          <div className="flex items-center space-x-2">
            <Mail className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">{row.original.email}</span>
          </div>
        ) : (
          <span className="text-sm text-gray-400">-</span>
        )
      ),
    },
    {
      accessorKey: "telefone",
      header: ({ column }) => <SortableHeader column={column}>Telefone</SortableHeader>,
      cell: ({ row }) => (
        row.original.telefone ? (
          <div className="flex items-center space-x-2">
            <Phone className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">{row.original.telefone}</span>
          </div>
        ) : (
          <span className="text-sm text-gray-400">-</span>
        )
      ),
    },
    {
      accessorKey: "endereco",
      header: ({ column }) => <SortableHeader column={column}>Endereço</SortableHeader>,
      cell: ({ row }) => (
        row.original.endereco ? (
          <div className="flex items-start space-x-2">
            <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <span className="text-sm text-gray-600 line-clamp-2">{row.original.endereco}</span>
          </div>
        ) : (
          <span className="text-sm text-gray-400">-</span>
        )
      ),
    },
  ]
  }, [])

  return (
    <div className="space-y-6">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-600">Gerencie sua base de clientes</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Button 
            className="bg-meguispet-primary hover:bg-meguispet-primary/90"
            onClick={handleNovoCliente}
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Cliente
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium truncate pr-2">Total Clientes</CardTitle>
            <Users className="h-4 w-4 text-meguispet-primary flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold whitespace-nowrap">{clientes.length}</div>
            <p className="text-xs text-muted-foreground truncate">Cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium truncate pr-2">Novos Este Mês</CardTitle>
            <Calendar className="h-4 w-4 text-meguispet-primary flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold whitespace-nowrap">
              {clientes.filter(cliente => {
                const clientDate = new Date(cliente.created_at)
                const now = new Date()
                return clientDate.getMonth() === now.getMonth() && clientDate.getFullYear() === now.getFullYear()
              }).length}
            </div>
            <p className="text-xs text-muted-foreground truncate">Este mês</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium truncate pr-2">Com Email</CardTitle>
            <Mail className="h-4 w-4 text-meguispet-primary flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold whitespace-nowrap">
              {clientes.filter(cliente => cliente.email).length}
            </div>
            <p className="text-xs text-muted-foreground truncate">Clientes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium truncate pr-2">Com Telefone</CardTitle>
            <Phone className="h-4 w-4 text-meguispet-primary flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold whitespace-nowrap">
              {clientes.filter(cliente => cliente.telefone).length}
            </div>
            <p className="text-xs text-muted-foreground truncate">Clientes</p>
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
                  placeholder="Buscar por nome, email ou telefone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={tipoFiltro}
                onChange={(e) => setTipoFiltro(e.target.value as typeof tipoFiltro)}
                className="border rounded-md px-3 py-2 text-sm"
              >
                <option value="cliente">Somente clientes</option>
                <option value="fornecedor">Somente fornecedores</option>
                <option value="ambos">Clientes+Fornecedores</option>
                <option value="todos">Todos os registros</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showInactive"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-meguispet-primary focus:ring-meguispet-primary"
              />
              <label htmlFor="showInactive" className="text-sm text-gray-700 cursor-pointer">
                Mostrar inativos
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clientes Table */}
      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-meguispet-primary"></div>
          </CardContent>
        </Card>
      ) : filteredClientes.length > 0 ? (
        <DataTable 
          columns={clientesColumns} 
          data={filteredClientes}
          tableId="clientes"
          enableColumnResizing={true}
          enableSorting={true}
          enableColumnVisibility={true}
          enableColumnReordering={true}
          mobileVisibleColumns={['acoes', 'nome', 'tipo']}
        />
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Users className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum cliente encontrado</h3>
            <p className="text-gray-600 text-center">
              {searchTerm ? 'Tente ajustar os filtros de busca' : 'Comece adicionando seu primeiro cliente'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Formulário de Cliente */}
      {showForm && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-lg">
          <ClienteForm
            cliente={editingCliente || undefined}
            onSubmit={handleSalvarCliente}
            onCancel={handleCancelarForm}
            loading={formLoading}
          />
        </div>
      )}
    </div>
  )
}
