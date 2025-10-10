import React, { useState, useEffect } from 'react'
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
  Shield,
  Mail,
  Phone,
  Calendar
} from 'lucide-react'
import { usuariosService } from '@/services/api'
import type { Usuario } from '@/types'

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

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
    } finally {
      setLoading(false)
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
          <p className="text-gray-600">Gerencie usuários e permissões do sistema</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Button className="bg-meguispet-primary hover:bg-meguispet-primary/90">
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

      {/* Usuários List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-meguispet-primary"></div>
          </div>
        ) : (
          usuarios.filter(usuario =>
            usuario.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
            usuario.email.toLowerCase().includes(searchTerm.toLowerCase())
          ).map((usuario) => (
            <Card key={usuario.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-meguispet-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-meguispet-primary">
                        {getInitials(usuario.nome)}
                      </span>
                    </div>
                    <div>
                      <CardTitle className="text-lg">{usuario.nome}</CardTitle>
                      <CardDescription>
                        Usuário desde {formatDate(usuario.created_at)}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">{usuario.email}</span>
                </div>
                

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Função:</span>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(usuario.role)}`}>
                    {usuario.role}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Status:</span>
                  <span className={`text-sm font-medium ${usuario.ativo ? 'text-green-600' : 'text-red-600'}`}>
                    {usuario.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>

                <div className="pt-2 flex space-x-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    Editar
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    Permissões
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {!loading && usuarios.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <User className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum usuário encontrado</h3>
            <p className="text-gray-600 text-center">
              Comece adicionando usuários ao sistema
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
