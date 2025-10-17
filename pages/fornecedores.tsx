import React, { useEffect, useMemo, useState } from 'react'
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
      if (editingFornecedor) {
        const response = await fornecedoresService.update(editingFornecedor.id, payload)
        if (response.success) {
          await loadFornecedores()
          setShowForm(false)
          setEditingFornecedor(null)
        }
      } else {
        const response = await fornecedoresService.create(payload as Omit<Fornecedor, 'id' | 'created_at' | 'updated_at'>)
        if (response.success) {
          await loadFornecedores()
          setShowForm(false)
        }
      }
    } catch (error) {
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

  return (
    <div className="space-y-6">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-meguispet-primary" />
          </div>
        ) : filteredFornecedores.length > 0 ? (
          filteredFornecedores.map((fornecedor) => (
            <Card key={fornecedor.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-meguispet-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-meguispet-primary">
                        {getInitials(fornecedor.nome)}
                      </span>
                    </div>
                    <div>
                      <CardTitle className="text-lg">{fornecedor.nome}</CardTitle>
                      <CardDescription>
                        Cadastro em {formatDate(fornecedor.created_at)}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEditarFornecedor(fornecedor)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleRemoverFornecedor(fornecedor)}
                      disabled={formLoading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {fornecedor.nome_fantasia && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Building2 className="h-4 w-4" />
                    <span>{fornecedor.nome_fantasia}</span>
                  </div>
                )}
                {fornecedor.email && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Mail className="h-4 w-4" />
                    <span>{fornecedor.email}</span>
                  </div>
                )}
                {fornecedor.telefone && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Phone className="h-4 w-4" />
                    <span>{fornecedor.telefone}</span>
                  </div>
                )}
                {(fornecedor.cidade || fornecedor.estado || fornecedor.endereco) && (
                  <div className="flex items-start space-x-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mt-0.5" />
                    <span>
                      {[
                        fornecedor.endereco,
                        fornecedor.cidade && fornecedor.estado ? `${fornecedor.cidade}/${fornecedor.estado}` : fornecedor.cidade,
                        fornecedor.cep
                      ]
                        .filter(Boolean)
                        .join(' • ')}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-8">
              <Building2 className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum fornecedor encontrado</h3>
              <p className="text-gray-600 text-center">
                {searchTerm ? 'Ajuste a busca ou limpe o filtro para ver mais resultados.' : 'Cadastre seu primeiro fornecedor para começar.'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

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
