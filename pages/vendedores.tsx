import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/router'
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
  User,
  Phone,
  Mail,
  TrendingUp,
  DollarSign
} from 'lucide-react'
import { vendedoresService } from '@/services/api'
import VendedorForm from '@/components/forms/VendedorForm'
import AlertDialog from '@/components/ui/AlertDialog'
import { DataTable, SortableHeader } from '@/components/ui/data-table'
import type { Vendedor, VendedorForm as VendedorFormValues } from '@/types'

export default function VendedoresPage() {
  const router = useRouter()
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [editingVendedor, setEditingVendedor] = useState<Vendedor | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const [alertDialog, setAlertDialog] = useState<{ title: string; message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null)

  useEffect(() => {
    loadVendedores()
  }, [currentPage, router.asPath])

  const loadVendedores = async () => {
    try {
      setLoading(true)
      const response = await vendedoresService.getAll(currentPage, 10)
      if (response.success && response.data) {
        console.log('Vendedores carregados:', response.data)
        setVendedores(response.data)
      }
    } catch (error) {
      console.error('Erro ao carregar vendedores:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const handleNovoVendedor = () => {
    setEditingVendedor(null)
    setShowForm(true)
  }

  const handleEditarVendedor = (vendedor: Vendedor) => {
    setEditingVendedor(vendedor)
    setShowForm(true)
  }

  const handleSalvarVendedor = async (vendedorData: VendedorFormValues) => {
    try {
      setFormLoading(true)

      // Garantir que ativo seja sempre boolean
      const vendedorPayload = {
        ...vendedorData,
        ativo: vendedorData.ativo ?? true
      }

      if (editingVendedor) {
        const response = await vendedoresService.update(editingVendedor.id, vendedorPayload)
        if (response.success) {
          await loadVendedores()
          setShowForm(false)
          setEditingVendedor(null)
          setAlertDialog({
            title: '✅ Vendedor Atualizado',
            message: `O vendedor "${vendedorData.nome}" foi atualizado com sucesso!`,
            type: 'success',
          })
        } else {
          setAlertDialog({
            title: '❌ Erro ao Atualizar Vendedor',
            message: response.message || 'Não foi possível atualizar o vendedor. Tente novamente.',
            type: 'error',
          })
        }
      } else {
        const response = await vendedoresService.create(vendedorPayload)
        if (response.success) {
          await loadVendedores()
          setShowForm(false)
          setAlertDialog({
            title: '✅ Vendedor Cadastrado',
            message: `O vendedor "${vendedorData.nome}" foi cadastrado com sucesso!`,
            type: 'success',
          })
        } else {
          setAlertDialog({
            title: '❌ Erro ao Cadastrar Vendedor',
            message: response.message || 'Não foi possível cadastrar o vendedor. Verifique os dados e tente novamente.',
            type: 'error',
          })
        }
      }
    } catch (error) {
      console.error('Erro ao salvar vendedor:', error)
      setAlertDialog({
        title: '❌ Erro Inesperado',
        message: 'Ocorreu um erro ao salvar o vendedor. Tente novamente mais tarde.',
        type: 'error',
      })
    } finally {
      setFormLoading(false)
    }
  }

  const handleCancelarForm = () => {
    setShowForm(false)
    setEditingVendedor(null)
  }

  const handleExcluirVendedor = async (vendedor: Vendedor) => {
    const confirmar = window.confirm(`Deseja realmente excluir o vendedor "${vendedor.nome}"?`)
    if (!confirmar) return

    try {
      const response = await vendedoresService.delete(vendedor.id)
      if (response.success) {
        await loadVendedores()
        setAlertDialog({
          title: '✅ Vendedor Excluído',
          message: `O vendedor "${vendedor.nome}" foi removido com sucesso.`,
          type: 'success',
        })
      } else {
        setAlertDialog({
          title: '❌ Erro ao Excluir',
          message: response.message || 'Não foi possível excluir o vendedor.',
          type: 'error',
        })
      }
    } catch (error) {
      console.error('Erro ao excluir vendedor:', error)
      setAlertDialog({
        title: '❌ Erro Inesperado',
        message: 'Ocorreu um erro ao excluir o vendedor. Tente novamente.',
        type: 'error',
      })
    }
  }

  const handleVerVendas = (vendedor: Vendedor) => {
    // Usar router.push para navegar sem recarregar a página
    router.push({
      pathname: '/vendas',
      query: { 
        vendedor_id: vendedor.id, 
        vendedor_nome: vendedor.nome 
      }
    })
  }

  const handleVerRelatorio = (vendedor: Vendedor) => {
    // Usar router.push para navegar sem recarregar a página
    router.push({
      pathname: '/relatorios',
      query: { 
        vendedor_id: vendedor.id, 
        vendedor_nome: vendedor.nome 
      }
    })
  }

  const handleExportar = () => {
    // Gerar CSV dos vendedores
    const csvContent = generateCSV(vendedores)
    downloadCSV(csvContent, 'vendedores.csv')
  }

  const generateCSV = (data: Vendedor[]) => {
    const headers = ['ID', 'Nome', 'Email', 'Telefone', 'Comissão (%)', 'Vendas', 'Faturamento']
    const rows = data.map(vendedor => [
      vendedor.id,
      vendedor.nome,
      vendedor.email || 'N/A',
      vendedor.telefone || 'N/A',
      vendedor.comissao,
      vendedor.total_vendas || 0,
      vendedor.total_faturamento || 0
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

  const filteredVendedores = vendedores.filter(vendedor =>
    vendedor.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendedor.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Column definitions for vendedores table
  const vendedoresColumns = useMemo<ColumnDef<Vendedor>[]>(() => {
    return [
    {
      accessorKey: "nome",
      header: ({ column }) => <SortableHeader column={column}>Vendedor</SortableHeader>,
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
              Desde {formatDate(row.original.created_at)}
            </div>
          </div>
        </div>
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
      accessorKey: "comissao",
      header: ({ column }) => <SortableHeader column={column}>Comissão</SortableHeader>,
      cell: ({ row }) => (
        <span className="text-sm font-medium text-gray-900">
          {row.original.comissao}%
        </span>
      ),
    },
    {
      accessorKey: "total_vendas",
      header: ({ column }) => <SortableHeader column={column}>Vendas</SortableHeader>,
      cell: ({ row }) => (
        <div className="text-center">
          <div className="text-lg font-semibold text-meguispet-primary">
            {row.original.total_vendas || 0}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "total_faturamento",
      header: ({ column }) => <SortableHeader column={column}>Faturamento</SortableHeader>,
      cell: ({ row }) => (
        <div className="text-center">
          <div className="text-lg font-semibold text-green-600">
            {formatCurrency(row.original.total_faturamento || 0)}
          </div>
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
            onClick={() => handleVerVendas(row.original)}
            title="Ver vendas"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => handleEditarVendedor(row.original)}
            title="Editar vendedor"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => handleExcluirVendedor(row.original)}
            title="Excluir vendedor"
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]
  }, [])

  if (showForm) {
    return (
      <div className="space-y-6">
        <VendedorForm
          vendedor={editingVendedor}
          onSubmit={handleSalvarVendedor}
          onCancel={handleCancelarForm}
          loading={formLoading}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {alertDialog && (
        <AlertDialog
          title={alertDialog.title}
          message={alertDialog.message}
          type={alertDialog.type}
          onClose={() => setAlertDialog(null)}
        />
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendedores</h1>
          <p className="text-gray-600">Gerencie sua equipe de vendas</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            className="bg-meguispet-primary hover:bg-meguispet-primary/90"
            onClick={handleNovoVendedor}
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Vendedor
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vendedores</CardTitle>
            <User className="h-4 w-4 text-meguispet-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vendedores.length}</div>
            <p className="text-xs text-muted-foreground">Ativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Vendas</CardTitle>
            <TrendingUp className="h-4 w-4 text-meguispet-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {vendedores.reduce((sum, v) => sum + (v.total_vendas || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">Todas as vendas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento Total</CardTitle>
            <DollarSign className="h-4 w-4 text-meguispet-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(vendedores.reduce((sum, v) => sum + (v.total_faturamento || 0), 0))}
            </div>
            <p className="text-xs text-muted-foreground">Todos os vendedores</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <TrendingUp className="h-4 w-4 text-meguispet-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {vendedores.length > 0 
                ? formatCurrency(vendedores.reduce((sum, v) => sum + (v.total_faturamento || 0), 0) / vendedores.length)
                : 'R$ 0,00'
              }
            </div>
            <p className="text-xs text-muted-foreground">Por vendedor</p>
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
                  placeholder="Buscar por nome ou email..."
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

      {/* Vendedores Table */}
      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-meguispet-primary"></div>
          </CardContent>
        </Card>
      ) : filteredVendedores.length > 0 ? (
        <DataTable 
          columns={vendedoresColumns} 
          data={filteredVendedores}
          enableColumnResizing={true}
          enableSorting={true}
          enableColumnVisibility={true}
          mobileVisibleColumns={['nome', 'telefone', 'comissao', 'acoes']}
        />
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <User className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum vendedor encontrado</h3>
            <p className="text-gray-600 text-center">
              {searchTerm ? 'Tente ajustar os filtros de busca' : 'Comece adicionando seu primeiro vendedor'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
