import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { AlertCircle, Link as LinkIcon, Unlink, Search, CheckCircle, XCircle, Users } from 'lucide-react'
import type { Vendedor, Usuario } from '@/types'

interface VendedorComLink extends Vendedor {
  usuario?: {
    id: number
    nome: string
    email: string
    ativo: boolean
  } | null
}

interface VendedorUsuarioLinkManagerProps {
  vendedores: VendedorComLink[]
  usuarios: Usuario[]
  onLink: (vendedorId: number, usuarioId: number) => Promise<void>
  onUnlink: (vendedorId: number) => Promise<void>
  onCreateUser: (vendedorId: number) => Promise<void>
}

export function VendedorUsuarioLinkManager({
  vendedores,
  usuarios,
  onLink,
  onUnlink,
  onCreateUser,
}: VendedorUsuarioLinkManagerProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'linked' | 'unlinked'>('all')
  const [selectedVendedorId, setSelectedVendedorId] = useState<number | null>(null)
  const [selectedUsuarioId, setSelectedUsuarioId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  // Filtrar vendedores
  const filteredVendedores = vendedores.filter(v => {
    const matchesSearch = v.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         v.email?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'linked' && v.usuario_id) ||
      (filterStatus === 'unlinked' && !v.usuario_id)

    return matchesSearch && matchesStatus
  })

  // Estatísticas
  const stats = {
    total: vendedores.length,
    linked: vendedores.filter(v => v.usuario_id).length,
    unlinked: vendedores.filter(v => !v.usuario_id).length,
  }

  // Usuarios disponíveis para link (sem vendedor vinculado)
  const availableUsuarios = usuarios.filter(u => !u.vendedor_id || u.vendedor_id === selectedVendedorId)

  const handleLink = async () => {
    if (!selectedVendedorId || !selectedUsuarioId) return

    setLoading(true)
    try {
      await onLink(selectedVendedorId, selectedUsuarioId)
      setSelectedVendedorId(null)
      setSelectedUsuarioId(null)
    } finally {
      setLoading(false)
    }
  }

  const handleUnlink = async (vendedorId: number) => {
    if (!confirm('Deseja realmente desvincular este vendedor do usuário?')) return

    setLoading(true)
    try {
      await onUnlink(vendedorId)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async (vendedorId: number) => {
    setLoading(true)
    try {
      await onCreateUser(vendedorId)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header com Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Users className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
              Gerenciar Vinculação Vendedor ↔ Usuário
            </p>
            <p className="text-blue-700 dark:text-blue-300">
              Vincule vendedores existentes a usuários do sistema. Isso permite que eles façam login
              e vejam apenas suas vendas e clientes. Nem todo vendedor precisa ter um usuário.
            </p>
          </div>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total de Vendedores</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <Users className="h-8 w-8 text-gray-400" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Com Usuário</p>
              <p className="text-2xl font-bold text-green-600">{stats.linked}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Sem Usuário</p>
              <p className="text-2xl font-bold text-orange-600">{stats.unlinked}</p>
            </div>
            <XCircle className="h-8 w-8 text-orange-600" />
          </div>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar vendedor por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterStatus} onValueChange={(value: string) => setFilterStatus(value as 'all' | 'linked' | 'unlinked')}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="linked">Com Usuário</SelectItem>
            <SelectItem value="unlinked">Sem Usuário</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabela de Vendedores */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Vendedor
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status do Vínculo
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Usuário Vinculado
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredVendedores.map((vendedor) => (
                <tr key={vendedor.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-4 py-3">
                    <div className="flex items-center">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {vendedor.nome}
                        </p>
                        <p className="text-sm text-gray-500">ID: {vendedor.id}</p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      {vendedor.email || '-'}
                    </p>
                  </td>

                  <td className="px-4 py-3">
                    {vendedor.usuario_id ? (
                      <Badge variant="default" className="bg-green-600">
                        <LinkIcon className="h-3 w-3 mr-1" />
                        Vinculado
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-orange-600 border-orange-600">
                        <Unlink className="h-3 w-3 mr-1" />
                        Sem Vínculo
                      </Badge>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    {vendedor.usuario ? (
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {vendedor.usuario.nome}
                        </p>
                        <p className="text-xs text-gray-500">
                          {vendedor.usuario.email}
                        </p>
                        {!vendedor.usuario.ativo && (
                          <Badge variant="outline" className="text-red-600 text-xs mt-1">
                            Inativo
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">-</p>
                    )}
                  </td>

                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {vendedor.usuario_id ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUnlink(vendedor.id)}
                          disabled={loading}
                        >
                          <Unlink className="h-4 w-4 mr-1" />
                          Desvincular
                        </Button>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedVendedorId(vendedor.id)
                              setSelectedUsuarioId(null)
                            }}
                          >
                            <LinkIcon className="h-4 w-4 mr-1" />
                            Vincular
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleCreateUser(vendedor.id)}
                            disabled={loading}
                          >
                            Criar Usuário
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filteredVendedores.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    Nenhum vendedor encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal de Vinculação */}
      {selectedVendedorId && (
        <Card className="p-6 border-2 border-blue-500">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Vincular Vendedor a Usuário</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedVendedorId(null)
                  setSelectedUsuarioId(null)
                }}
              >
                ✕
              </Button>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Vendedor:</strong>{' '}
                {vendedores.find(v => v.id === selectedVendedorId)?.nome}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="usuario">Selecione o Usuário</Label>
              <Select
                value={selectedUsuarioId?.toString() || ''}
                onValueChange={(value) => setSelectedUsuarioId(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um usuário..." />
                </SelectTrigger>
                <SelectContent>
                  {availableUsuarios.map(u => (
                    <SelectItem key={u.id} value={u.id.toString()}>
                      {u.nome} ({u.email}) - {u.tipo_usuario}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500">
                Apenas usuários sem vendedor vinculado aparecem na lista
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedVendedorId(null)
                  setSelectedUsuarioId(null)
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleLink}
                disabled={!selectedUsuarioId || loading}
              >
                {loading ? 'Vinculando...' : 'Confirmar Vínculo'}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
