import React, { useState, useEffect, useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { useModal } from '@/hooks/useModal'
import { useAuth } from '@/hooks/useAuth'
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Edit, 
  Trash2,
  User,
  Shield,
  Mail,
  Phone,
  Calendar
} from 'lucide-react'
import { usuariosService, authService } from '@/services/api'
import { DataTable, SortableHeader } from '@/components/ui/data-table'
import type { Usuario } from '@/types'

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const { toast } = useToast()
  const { open: openModal, close: closeModal } = useModal()
  const { user: currentUser } = useAuth()

  useEffect(() => {
    loadUsuarios()
  }, [currentPage])

  const loadUsuarios = async () => {
    try {
      setLoading(true)
      const response = await usuariosService.getAll(currentPage, 10)
      if (response.success && response.data) {
        setUsuarios(response.data)
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar a lista de usuários',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async (userData: {
    nome: string
    email: string
    password: string
    role: 'admin' | 'convidado'
    permissoes: Record<string, boolean>
  }) => {
    try {
      const response = await authService.signup(
        userData.email,
        userData.password,
        userData.nome,
        userData.role
      )

      if (response.success) {
        // Update the user's permissions in the usuarios table
        if (response.data?.user?.id) {
          await usuariosService.update(response.data.user.id, {
            permissoes: userData.permissoes as Record<string, unknown>,
          })
        }

        // Close modal first
        closeModal()

        // Show success toast
        toast({
          title: 'Sucesso',
          description: 'Usuário criado com sucesso',
          variant: 'default',
        })

        // Reload the usuarios list
        await loadUsuarios()
      } else {
        toast({
          title: 'Erro',
          description: response.message || 'Erro ao criar usuário',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Erro ao criar usuário:', error)
      
      // Extract error message safely
      let errorMessage = 'Erro ao criar usuário'
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (error && typeof error === 'object' && 'response' in error) {
        const response = (error as { response?: { data?: { message?: string } } }).response
        errorMessage = response?.data?.message || errorMessage
      }
      
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      })
    }
  }

  const openCreateUserModal = () => {
    openModal('usuario', {
      onSubmit: handleCreateUser,
    })
  }

  const handleViewUser = (usuario: Usuario) => {
    // Open a generic modal with user details
    openModal('generic', {
      title: 'Detalhes do Usuário',
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Nome</p>
              <p className="text-base font-semibold text-slate-900 dark:text-white">{usuario.nome}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Email</p>
              <p className="text-base font-semibold text-slate-900 dark:text-white">{usuario.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Função</p>
              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(usuario.role)}`}>
                {usuario.role}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Status</p>
              <span className={`text-sm font-medium ${usuario.ativo ? 'text-green-600' : 'text-red-600'}`}>
                {usuario.ativo ? 'Ativo' : 'Inativo'}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Criado em</p>
              <p className="text-base text-slate-900 dark:text-white">{formatDate(usuario.created_at)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Atualizado em</p>
              <p className="text-base text-slate-900 dark:text-white">{formatDate(usuario.updated_at)}</p>
            </div>
          </div>
          {usuario.permissoes && Object.keys(usuario.permissoes).length > 0 && (
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Permissões</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(usuario.permissoes).filter(([_, value]) => value).map(([key]) => (
                  <span key={key} className="inline-flex px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                    {key}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ),
      actions: (
        <Button onClick={() => closeModal()}>Fechar</Button>
      )
    })
  }

  const handleEditUser = async (usuario: Usuario) => {
    openModal('usuario', {
      mode: 'edit',
      initialData: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role,
        permissoes: usuario.permissoes,
      },
      onSubmit: async (userData: {
        nome: string
        email: string
        password: string
        role: 'admin' | 'convidado'
        permissoes: Record<string, boolean>
      }) => {
        try {
          // Prepare update data - only include password if it was changed
          const updateData: Partial<Usuario> = {
            nome: userData.nome,
            email: userData.email,
            role: userData.role,
            permissoes: userData.permissoes as Record<string, unknown>,
          }

          // Only include password if it was provided
          if (userData.password && userData.password.trim()) {
            // Note: The API should hash the password on the backend
            updateData.password_hash = userData.password
          }

          const response = await usuariosService.update(usuario.id, updateData)

          if (response.success) {
            // Close modal first
            closeModal()

            // Show success toast
            toast({
              title: 'Sucesso',
              description: 'Usuário atualizado com sucesso',
              variant: 'default',
            })

            // Reload the usuarios list
            await loadUsuarios()
          } else {
            toast({
              title: 'Erro',
              description: response.message || 'Erro ao atualizar usuário',
              variant: 'destructive',
            })
          }
        } catch (error) {
          console.error('Erro ao atualizar usuário:', error)

          let errorMessage = 'Erro ao atualizar usuário'
          if (error instanceof Error) {
            errorMessage = error.message
          } else if (error && typeof error === 'object' && 'response' in error) {
            const response = (error as { response?: { data?: { message?: string } } }).response
            errorMessage = response?.data?.message || errorMessage
          }

          toast({
            title: 'Erro',
            description: errorMessage,
            variant: 'destructive',
          })
        }
      },
    })
  }

  const handleDeleteUser = async (usuario: Usuario) => {
    // Check if current user is admin
    if (!currentUser || currentUser.role !== 'admin') {
      toast({
        title: 'Acesso negado',
        description: 'Apenas administradores podem excluir usuários',
        variant: 'destructive',
      })
      return
    }

    // Prevent deleting self
    if (currentUser.id === usuario.id) {
      toast({
        title: 'Operação não permitida',
        description: 'Você não pode excluir seu próprio usuário',
        variant: 'destructive',
      })
      return
    }

    // Confirm deletion
    if (!window.confirm(`Tem certeza que deseja excluir o usuário "${usuario.nome}"?`)) {
      return
    }

    try {
      const response = await usuariosService.delete(usuario.id)
      if (response.success) {
        toast({
          title: 'Sucesso',
          description: 'Usuário excluído com sucesso',
          variant: 'default',
        })
        await loadUsuarios()
      } else {
        toast({
          title: 'Erro',
          description: response.message || 'Erro ao excluir usuário',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Erro ao excluir usuário:', error)
      toast({
        title: 'Erro',
        description: 'Erro ao excluir usuário',
        variant: 'destructive',
      })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800'
      case 'vendedor': return 'bg-blue-100 text-blue-800'
      case 'gerente': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredUsuarios = usuarios.filter(usuario =>
    usuario.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    usuario.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Column definitions for usuarios table
  const usuariosColumns = useMemo<ColumnDef<Usuario>[]>(() => {
    return [
    {
      id: "acoes",
      header: () => <div className="text-sm font-medium">Ações</div>,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            title="Ver detalhes"
            onClick={() => handleViewUser(row.original)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            title="Editar usuário"
            onClick={() => handleEditUser(row.original)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          {currentUser?.role === 'admin' && currentUser?.id !== row.original.id && (
            <Button 
              variant="ghost" 
              size="sm" 
              title="Excluir usuário"
              onClick={() => handleDeleteUser(row.original)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
    {
      accessorKey: "nome",
      header: ({ column }) => <SortableHeader column={column}>Usuário</SortableHeader>,
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
        <div className="flex items-center space-x-2">
          <Mail className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-600">{row.original.email}</span>
        </div>
      ),
    },
    {
      accessorKey: "role",
      header: ({ column }) => <SortableHeader column={column}>Função</SortableHeader>,
      cell: ({ row }) => (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(row.original.role)}`}>
          {row.original.role}
        </span>
      ),
    },
    {
      accessorKey: "ativo",
      header: ({ column }) => <SortableHeader column={column}>Status</SortableHeader>,
      cell: ({ row }) => (
        <span className={`text-sm font-medium ${row.original.ativo ? 'text-green-600' : 'text-red-600'}`}>
          {row.original.ativo ? 'Ativo' : 'Inativo'}
        </span>
      ),
    },
  ]
  }, [currentUser])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
          <p className="text-gray-600">Gerencie usuários e permissões do sistema</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Button 
            className="bg-meguispet-primary hover:bg-meguispet-primary/90"
            onClick={openCreateUserModal}
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Usuário
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usuários</CardTitle>
            <User className="h-4 w-4 text-meguispet-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usuarios.length}</div>
            <p className="text-xs text-muted-foreground">Ativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Administradores</CardTitle>
            <Shield className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {usuarios.filter(u => u.role === 'admin').length}
            </div>
            <p className="text-xs text-muted-foreground">Usuários</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendedores</CardTitle>
            <User className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {usuarios.filter(u => u.ativo).length}
            </div>
            <p className="text-xs text-muted-foreground">Usuários Ativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Último Acesso</CardTitle>
            <Calendar className="h-4 w-4 text-meguispet-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Hoje</div>
            <p className="text-xs text-muted-foreground">Sistema</p>
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

      {/* Usuários Table */}
      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-meguispet-primary"></div>
          </CardContent>
        </Card>
      ) : filteredUsuarios.length > 0 ? (
        <DataTable 
          columns={usuariosColumns} 
          data={filteredUsuarios}
          tableId="usuarios"
          enableColumnResizing={true}
          enableSorting={true}
          enableColumnVisibility={true}
          enableColumnReordering={true}
          mobileVisibleColumns={['acoes', 'nome', 'email', 'role']}
        />
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <User className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum usuário encontrado</h3>
            <p className="text-gray-600 text-center">
              {searchTerm ? 'Tente ajustar os filtros de busca' : 'Comece adicionando usuários ao sistema'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
