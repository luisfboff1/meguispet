import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { VendedorUsuarioLinkManager } from '@/components/admin/VendedorUsuarioLinkManager'
import { PermissionGate } from '@/components/auth/PermissionGate'
import { vendedoresService, usuariosService } from '@/services/api'
import api from '@/services/api'
import type { Vendedor, Usuario } from '@/types'
import { Shield, Users } from 'lucide-react'

interface VendedorComLink extends Vendedor {
  usuario?: {
    id: number
    nome: string
    email: string
    ativo: boolean
  } | null
}

export default function VendedoresUsuariosPage() {
  const [vendedores, setVendedores] = useState<VendedorComLink[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)

      // Carregar vendedores e usu�rios em paralelo
      const [vendedoresRes, usuariosRes] = await Promise.all([
        vendedoresService.getAll(1, 100),
        usuariosService.getAll(1, 100)
      ])

      if (vendedoresRes.success && vendedoresRes.data) {
        // Enriquecer vendedores com dados do usu�rio vinculado
        const vendedoresEnriquecidos = await Promise.all(
          vendedoresRes.data.map(async (vendedor) => {
            if (vendedor.usuario_id && usuariosRes.success && usuariosRes.data) {
              const usuario = usuariosRes.data.find(u => u.id === vendedor.usuario_id)
              return {
                ...vendedor,
                usuario: usuario ? {
                  id: usuario.id,
                  nome: usuario.nome,
                  email: usuario.email,
                  ativo: usuario.ativo
                } : null
              }
            }
            return { ...vendedor, usuario: null }
          })
        )

        setVendedores(vendedoresEnriquecidos)
      }

      if (usuariosRes.success && usuariosRes.data) {
        setUsuarios(usuariosRes.data)
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'N�o foi poss�vel carregar os dados',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLink = async (vendedorId: number, usuarioId: number) => {
    try {
      const response = await api.post(`/vendedores/${vendedorId}/link-usuario`, {
        usuario_id: usuarioId
      })

      if (response.data.success) {
        toast({
          title: 'Sucesso',
          description: 'Vendedor vinculado ao usu�rio com sucesso'
        })
        await loadData()
      } else {
        toast({
          title: 'Erro',
          description: response.data.message || 'Erro ao vincular vendedor',
          variant: 'destructive'
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : (error && typeof error === 'object' && 'response' in error)
          ? ((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Erro ao vincular vendedor')
          : 'Erro ao vincular vendedor'

      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      })
    }
  }

  const handleUnlink = async (vendedorId: number) => {
    try {
      const response = await api.delete(`/api/vendedores/${vendedorId}/unlink-usuario`)

      if (response.data.success) {
        toast({
          title: 'Sucesso',
          description: 'Vendedor desvinculado com sucesso'
        })
        await loadData()
      } else {
        toast({
          title: 'Erro',
          description: response.data.message || 'Erro ao desvincular vendedor',
          variant: 'destructive'
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : (error && typeof error === 'object' && 'response' in error)
          ? ((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Erro ao desvincular vendedor')
          : 'Erro ao desvincular vendedor'

      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      })
    }
  }

  const handleCreateUser = async (vendedorId: number) => {
    const vendedor = vendedores.find(v => v.id === vendedorId)
    if (!vendedor || !vendedor.email) {
      toast({
        title: 'Erro',
        description: 'Vendedor n�o possui email cadastrado',
        variant: 'destructive'
      })
      return
    }

    const senha = window.prompt('Digite a senha para o novo usu�rio:')
    if (!senha) return

    try {
      const response = await api.post(`/api/vendedores/${vendedorId}/create-usuario`, {
        email: vendedor.email,
        nome: vendedor.nome,
        password: senha
      })

      if (response.data.success) {
        toast({
          title: 'Sucesso',
          description: 'Usu�rio criado e vinculado com sucesso'
        })
        await loadData()
      } else {
        toast({
          title: 'Erro',
          description: response.data.message || 'Erro ao criar usu�rio',
          variant: 'destructive'
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : (error && typeof error === 'object' && 'response' in error)
          ? ((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Erro ao criar usuário')
          : 'Erro ao criar usuário'

      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      })
    }
  }

  return (
    <PermissionGate permission="config_usuarios" redirect="/dashboard">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="h-7 w-7" />
            Gerenciar Vendedores e Usu�rios
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Vincule vendedores existentes a usu�rios do sistema para rastreamento individual de vendas
          </p>
        </div>

        {/* Prote��o Admin */}
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="flex-1 text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  �rea Administrativa
                </p>
                <p className="text-blue-700 dark:text-blue-300 mt-1">
                  Esta p�gina permite gerenciar a vincula��o entre vendedores e usu�rios do sistema.
                  Apenas administradores t�m acesso a esta funcionalidade.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Conte�do Principal */}
        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-meguispet-primary"></div>
            </CardContent>
          </Card>
        ) : (
          <VendedorUsuarioLinkManager
            vendedores={vendedores}
            usuarios={usuarios}
            onLink={handleLink}
            onUnlink={handleUnlink}
            onCreateUser={handleCreateUser}
          />
        )}
      </div>
    </PermissionGate>
  )
}
