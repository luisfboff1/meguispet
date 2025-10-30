import React, { useEffect, useMemo, useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Plus,
  Search,
  Filter,
  Mail,
  Phone,
  MapPin,
  Building2,
  Trash2,
  Edit,
  Loader2
} from 'lucide-react'
import { fornecedoresService } from '@/services/api'
import type { Fornecedor, FornecedorForm as FornecedorFormValues } from '@/types'
import FornecedorForm from '@/components/forms/FornecedorForm'
import Toast from '@/components/ui/Toast'
import { DataTable, SortableHeader } from '@/components/ui/data-table'

interface PaginationState {
  page: number
  pages: number
  total: number
  limit: number
}

export default function FornecedoresPage() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [loading, setLoading] = useState(true)
  const [formLoading, setFormLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState<PaginationState>({ page: 1, pages: 1, total: 0, limit: 10 })
  const [showForm, setShowForm] = useState(false)
  const [editingFornecedor, setEditingFornecedor] = useState<Fornecedor | null>(null)
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null)

  useEffect(() => {
    void loadFornecedores()
  }, [currentPage])

  const loadFornecedores = async () => {
    try {
      setLoading(true)
      const response = await fornecedoresService.getAll(currentPage, pagination.limit)
      if (response.success && response.data) {
        setFornecedores(response.data)
        if (response.pagination) {
          setPagination({
            page: response.pagination.page,
            pages: response.pagination.pages,
            total: response.pagination.total,
            limit: response.pagination.limit
          })
        }
      }
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredFornecedores = useMemo(() => {
    const termo = searchTerm.toLowerCase()
    if (!termo) return fornecedores

    return fornecedores.filter((fornecedor) => {
      const nome = fornecedor.nome?.toLowerCase() || ''
      const fantasia = fornecedor.nome_fantasia?.toLowerCase() || ''
      const cnpj = fornecedor.cnpj?.toLowerCase() || ''
      const email = fornecedor.email?.toLowerCase() || ''
      const telefone = fornecedor.telefone?.toLowerCase() || ''
      const cidade = fornecedor.cidade?.toLowerCase() || ''
      const estado = fornecedor.estado?.toLowerCase() || ''

      return (
        nome.includes(termo) ||
        fantasia.includes(termo) ||
        cnpj.includes(termo) ||
        email.includes(termo) ||
        telefone.includes(termo) ||
        cidade.includes(termo) ||
        estado.includes(termo)
      )
    })
  }, [fornecedores, searchTerm])

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Data indisponível'
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const handleNovoFornecedor = () => {
    setEditingFornecedor(null)
    setShowForm(true)
  }

  const handleEditarFornecedor = (fornecedor: Fornecedor) => {
    setEditingFornecedor(fornecedor)
    setShowForm(true)
  }

  const handleSalvarFornecedor = async (fornecedorData: FornecedorFormValues) => {
    try {
      setFormLoading(true)
      const { tipo: _tipo, ...payload } = fornecedorData
      let response
      if (editingFornecedor) {
        response = await fornecedoresService.update(editingFornecedor.id, payload)
      } else {
        response = await fornecedoresService.create(payload as Omit<Fornecedor, 'id' | 'created_at' | 'updated_at'>)
      }
      if (response && response.success) {
        await loadFornecedores()
        setShowForm(false)
        setEditingFornecedor(null)
        setToast({ message: editingFornecedor ? 'Fornecedor atualizado com sucesso!' : 'Fornecedor cadastrado com sucesso!', type: 'success' })
      } else {
        setToast({ message: response?.message || 'Erro ao salvar fornecedor. Tente novamente.', type: 'error' })
      }
    } catch (error: unknown) {
      let msg = 'Erro ao salvar fornecedor. Tente novamente.'
      if (typeof error === 'object' && error !== null) {
        const errObj = error as { response?: { data?: { message?: string } }, message?: string }
        if (errObj.response?.data?.message) {
          msg = errObj.response.data.message
        } else if (typeof errObj.message === 'string') {
          msg = errObj.message
        }
      }
      setToast({ message: msg, type: 'error' })
      console.error('Erro ao salvar fornecedor:', error)
    } finally {
      setFormLoading(false)
    }
  }

  const handleRemoverFornecedor = async (fornecedor: Fornecedor) => {
    if (!confirm(`Desativar o fornecedor "${fornecedor.nome}"?`)) return
    try {
      setFormLoading(true)
      const response = await fornecedoresService.delete(fornecedor.id)
      if (response.success) {
        await loadFornecedores()
      }
    } catch (error) {
      console.error('Erro ao desativar fornecedor:', error)
    } finally {
      setFormLoading(false)
    }
  }

  const handleCancelarForm = () => {
    setShowForm(false)
    setEditingFornecedor(null)
  }

  const canGoPrev = pagination.page > 1
  const canGoNext = pagination.page < pagination.pages

  const handlePreviousPage = () => {
    if (canGoPrev) setCurrentPage((prev) => Math.max(1, prev - 1))
  }

  const handleNextPage = () => {
    if (canGoNext) setCurrentPage((prev) => prev + 1)
  }

  // Column definitions for fornecedores table
  const fornecedoresColumns = useMemo<ColumnDef<Fornecedor>[]>(() => {
    return [
    {
      accessorKey: "nome",
      header: ({ column }) => <SortableHeader column={column}>Fornecedor</SortableHeader>,
      cell: ({ row }) => (
        <div className="flex items-center space-x-3 min-w-[200px]">
          <div className="w-10 h-10 bg-meguispet-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-medium text-meguispet-primary">
              {getInitials(row.original.nome)}
            </span>
          </div>
          <div>
            <div className="font-medium text-gray-900">{row.original.nome}</div>
            <div className="text-sm text-gray-500">
              Cadastro em {formatDate(row.original.created_at)}
            </div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "nome_fantasia",
      header: ({ column }) => <SortableHeader column={column}>Nome Fantasia</SortableHeader>,
      cell: ({ row }) => (
        row.original.nome_fantasia ? (
          <div className="flex items-center space-x-2">
            <Building2 className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">{row.original.nome_fantasia}</span>
          </div>
        ) : (
          <span className="text-sm text-gray-400">-</span>
        )
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
      id: "localizacao",
      header: "Localização",
      cell: ({ row }) => {
        const { endereco, cidade, estado, cep } = row.original
        if (!endereco && !cidade && !estado) {
          return <span className="text-sm text-gray-400">-</span>
        }
        const location = [
          endereco,
          cidade && estado ? `${cidade}/${estado}` : cidade,
          cep
        ].filter(Boolean).join(' • ')
        return (
          <div className="flex items-start space-x-2">
            <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <span className="text-sm text-gray-600 line-clamp-2">{location}</span>
          </div>
        )
      },
    },
    {
      id: "acoes",
      header: "Ações",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleEditarFornecedor(row.original)}
            title="Editar fornecedor"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700"
            onClick={() => handleRemoverFornecedor(row.original)}
            disabled={formLoading}
            title="Desativar fornecedor"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]
  }, [formLoading])

  return (
    <div className="space-y-6">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fornecedores</h1>
          <p className="text-gray-600">Gerencie seus parceiros de abastecimento</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button className="bg-meguispet-primary hover:bg-meguispet-primary/90" onClick={handleNovoFornecedor}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Fornecedor
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cadastros totais</CardTitle>
            <Building2 className="h-4 w-4 text-meguispet-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pagination.total}</div>
            <p className="text-xs text-muted-foreground">Inclui todos os fornecedores ativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Na página atual</CardTitle>
            <Search className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fornecedores.length}</div>
            <p className="text-xs text-muted-foreground">Registros carregados nesta página</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resultados atuais</CardTitle>
            <Filter className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredFornecedores.length}</div>
            <p className="text-xs text-muted-foreground">Após filtros aplicados</p>
          </CardContent>
        </Card>
      </div>

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
                  placeholder="Buscar por nome, fantasia, CNPJ ou cidade..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fornecedores Table */}
      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-meguispet-primary" />
          </CardContent>
        </Card>
      ) : filteredFornecedores.length > 0 ? (
        <DataTable 
          columns={fornecedoresColumns} 
          data={filteredFornecedores}
          enableColumnResizing={true}
          enableSorting={true}
          enableColumnVisibility={true}
        />
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Building2 className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum fornecedor encontrado</h3>
            <p className="text-gray-600 text-center">
              {searchTerm ? 'Ajuste a busca ou limpe o filtro para ver mais resultados.' : 'Cadastre seu primeiro fornecedor para começar.'}
            </p>
          </CardContent>
        </Card>
      )}

      {pagination.pages > 1 && (
        <div className="flex items-center justify-between border rounded-md px-4 py-3">
          <div>
            Página {pagination.page} de {pagination.pages}
            <span className="text-sm text-gray-500 ml-2">{pagination.total} fornecedores</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePreviousPage} disabled={!canGoPrev || loading}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" onClick={handleNextPage} disabled={!canGoNext || loading}>
              Próxima
            </Button>
          </div>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-lg">
          <FornecedorForm
            fornecedor={editingFornecedor || undefined}
            onSubmit={handleSalvarFornecedor}
            onCancel={handleCancelarForm}
            loading={formLoading}
          />
        </div>
      )}
    </div>
  )
}
