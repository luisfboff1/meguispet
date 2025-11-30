import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Save, RefreshCw, Shield, Info, AlertCircle } from 'lucide-react'
import type { UserRole, Permissoes } from '@/types/permissions'
import { PERMISSIONS_PRESETS } from '@/types/permissions'
import api from '@/services/api'

/**
 * Componente de Configuração de Permissões por Role
 * 
 * Permite editar as permissões padrão de cada tipo de usuário (role)
 * diretamente no banco de dados.
 */

interface PermissionGroup {
  title: string
  description: string
  permissions: {
    key: keyof Permissoes
    label: string
    description: string
  }[]
}

const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    title: 'Módulos Principais',
    description: 'Acesso aos módulos do sistema',
    permissions: [
      { key: 'dashboard', label: 'Dashboard', description: 'Acesso ao painel principal' },
      { key: 'vendas', label: 'Vendas', description: 'Módulo de vendas' },
      { key: 'clientes', label: 'Clientes', description: 'Módulo de clientes' },
      { key: 'produtos', label: 'Produtos', description: 'Módulo de produtos' },
      { key: 'estoque', label: 'Estoque', description: 'Módulo de estoque' },
      { key: 'financeiro', label: 'Financeiro', description: 'Módulo financeiro' },
      { key: 'relatorios', label: 'Relatórios', description: 'Módulo de relatórios' },
      { key: 'configuracoes', label: 'Configurações', description: 'Configurações gerais' },
      { key: 'usuarios', label: 'Usuários', description: 'Gestão de usuários' },
    ]
  },
  {
    title: 'Ações de Vendas',
    description: 'Permissões relacionadas a vendas',
    permissions: [
      { key: 'vendas_criar', label: 'Criar Vendas', description: 'Criar novas vendas' },
      { key: 'vendas_editar', label: 'Editar Vendas', description: 'Editar vendas existentes' },
      { key: 'vendas_deletar', label: 'Deletar Vendas', description: 'Deletar vendas' },
      { key: 'vendas_visualizar_todas', label: 'Ver Todas as Vendas', description: 'Ver vendas de todos (senão, só as próprias)' },
    ]
  },
  {
    title: 'Ações de Clientes',
    description: 'Permissões relacionadas a clientes',
    permissions: [
      { key: 'clientes_criar', label: 'Criar Clientes', description: 'Criar novos clientes' },
      { key: 'clientes_editar', label: 'Editar Clientes', description: 'Editar clientes' },
      { key: 'clientes_deletar', label: 'Deletar Clientes', description: 'Deletar clientes' },
      { key: 'clientes_visualizar_todos', label: 'Ver Todos os Clientes', description: 'Ver todos os clientes (senão, só os próprios)' },
    ]
  },
  {
    title: 'Ações de Produtos',
    description: 'Permissões relacionadas a produtos',
    permissions: [
      { key: 'produtos_criar', label: 'Criar Produtos', description: 'Criar novos produtos' },
      { key: 'produtos_editar', label: 'Editar Produtos', description: 'Editar produtos' },
      { key: 'produtos_deletar', label: 'Deletar Produtos', description: 'Deletar produtos' },
      { key: 'produtos_ajustar_estoque', label: 'Ajustar Estoque', description: 'Ajustar quantidades de estoque' },
    ]
  },
  {
    title: 'Ações Financeiras',
    description: 'Permissões relacionadas ao financeiro',
    permissions: [
      { key: 'financeiro_visualizar', label: 'Visualizar Financeiro', description: 'Ver módulo financeiro' },
      { key: 'financeiro_criar_transacao', label: 'Criar Transações', description: 'Criar transações financeiras' },
      { key: 'financeiro_editar_transacao', label: 'Editar Transações', description: 'Editar transações' },
    ]
  },
  {
    title: 'Ações de Relatórios',
    description: 'Permissões relacionadas a relatórios',
    permissions: [
      { key: 'relatorios_gerar', label: 'Gerar Relatórios', description: 'Criar novos relatórios' },
      { key: 'relatorios_exportar', label: 'Exportar Relatórios', description: 'Exportar relatórios (PDF, Excel, CSV)' },
    ]
  },
  {
    title: 'Configurações',
    description: 'Permissões administrativas',
    permissions: [
      { key: 'config_sistema', label: 'Config. Sistema', description: 'Configurações do sistema' },
      { key: 'config_usuarios', label: 'Config. Usuários', description: 'Gerenciar usuários e permissões' },
    ]
  }
]

const ROLES: { value: UserRole; label: string; description: string; color: string }[] = [
  { value: 'admin', label: 'Administrador', description: 'Acesso total ao sistema', color: 'bg-red-500' },
  { value: 'gerente', label: 'Gerente', description: 'Gestão da equipe e relatórios', color: 'bg-purple-500' },
  { value: 'vendedor', label: 'Vendedor', description: 'Apenas suas vendas e clientes', color: 'bg-blue-500' },
  { value: 'financeiro', label: 'Financeiro', description: 'Módulo financeiro e relatórios', color: 'bg-green-500' },
  { value: 'estoque', label: 'Estoque', description: 'Gestão de produtos e estoque', color: 'bg-yellow-500' },
  { value: 'operador', label: 'Operador', description: 'Operações básicas (PDV)', color: 'bg-cyan-500' },
  { value: 'visualizador', label: 'Visualizador', description: 'Apenas visualização', color: 'bg-gray-500' },
]

export default function RolePermissionsConfig() {
  const { toast } = useToast()
  const [selectedRole, setSelectedRole] = useState<UserRole>('vendedor')
  const [permissions, setPermissions] = useState<Partial<Permissoes>>({})
  const [originalPermissions, setOriginalPermissions] = useState<Partial<Permissoes>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Carregar permissões do banco de dados
  useEffect(() => {
    loadPermissions(selectedRole)
  }, [selectedRole])

  // Detectar mudanças
  useEffect(() => {
    const changed = JSON.stringify(permissions) !== JSON.stringify(originalPermissions)
    setHasChanges(changed)
  }, [permissions, originalPermissions])

  const loadPermissions = async (role: UserRole) => {
    setLoading(true)
    try {
      // Buscar permissões do banco (role_permissions_config)
      const response = await api.get(`/role-permissions/${role}`)
      
      if (response.data.success && response.data.data) {
        const perms = response.data.data.permissions
        setPermissions(perms)
        setOriginalPermissions(perms)
      } else {
        // Se não existe configuração no banco, usar preset padrão
        const defaultPerms = PERMISSIONS_PRESETS[role]
        setPermissions(defaultPerms)
        setOriginalPermissions(defaultPerms)
      }
    } catch (error) {
      // Fallback para preset padrão
      const defaultPerms = PERMISSIONS_PRESETS[role]
      setPermissions(defaultPerms)
      setOriginalPermissions(defaultPerms)
    } finally {
      setLoading(false)
    }
  }

  const handleTogglePermission = (permissionKey: keyof Permissoes) => {
    setPermissions(prev => ({
      ...prev,
      [permissionKey]: !prev[permissionKey]
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await api.post('/role-permissions', {
        role: selectedRole,
        permissions
      })

      if (response.data.success) {
        toast({
          title: 'Sucesso',
          description: `Permissões de "${ROLES.find(r => r.value === selectedRole)?.label}" salvas com sucesso`,
        })
        setOriginalPermissions(permissions)
        setHasChanges(false)
      } else {
        throw new Error(response.data.message || 'Erro ao salvar')
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao salvar permissões',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    const defaultPerms = PERMISSIONS_PRESETS[selectedRole]
    setPermissions(defaultPerms)
  }

  const handleRevert = () => {
    setPermissions(originalPermissions)
  }

  const countActivePermissions = () => {
    return Object.values(permissions).filter(Boolean).length
  }

  const roleInfo = ROLES.find(r => r.value === selectedRole)

  return (
    <div className="space-y-6">
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 text-sm">
              <p className="text-blue-900 dark:text-blue-100">
                Configure as permissões padrão de cada tipo de usuário (role). Estas configurações serão aplicadas
                automaticamente a todos os usuários com esta função, a menos que tenham permissões customizadas.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seletor de Role */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Selecione a Função para Configurar
          </CardTitle>
          <CardDescription>
            Escolha o tipo de usuário para editar suas permissões padrão
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as UserRole)}>
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue placeholder="Selecione uma função" />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map(role => (
                  <SelectItem key={role.value} value={role.value}>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${role.color}`} />
                      <span className="font-medium">{role.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Badge variant="outline" className="ml-auto">
              {countActivePermissions()} permissões ativas
            </Badge>
          </div>

          {roleInfo && (
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    <Badge className={roleInfo.color}>{roleInfo.label}</Badge>
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">{roleInfo.description}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuração de Permissões */}
      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Permissões Detalhadas</CardTitle>
                <CardDescription>
                  Marque as permissões que usuários com esta função devem ter
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {hasChanges && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRevert}
                    disabled={saving}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reverter
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  disabled={saving}
                >
                  Resetar Padrão
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!hasChanges || saving}
                  size="sm"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Salvar Alterações
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {PERMISSION_GROUPS.map(group => (
                <div key={group.title} className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-sm">{group.title}</h3>
                    <p className="text-xs text-muted-foreground">{group.description}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {group.permissions.map(perm => (
                      <div
                        key={perm.key}
                        className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <Checkbox
                          id={`${selectedRole}-${perm.key}`}
                          checked={permissions[perm.key] === true}
                          onCheckedChange={() => handleTogglePermission(perm.key)}
                          disabled={saving}
                        />
                        <div className="space-y-1 flex-1">
                          <label
                            htmlFor={`${selectedRole}-${perm.key}`}
                            className="text-sm font-medium leading-none cursor-pointer"
                          >
                            {perm.label}
                          </label>
                          <p className="text-xs text-muted-foreground">
                            {perm.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
