import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Info, Shield, Users, Settings } from 'lucide-react'
import type { UserRole, Permissoes, Usuario } from '@/types'
import { PERMISSIONS_PRESETS, mergePermissions } from '@/types'

interface UsuarioPermissoesFormProps {
  usuario?: Usuario
  vendedores?: Array<{ id: number; nome: string }>
  onSubmit: (data: {
    tipo_usuario: UserRole
    roles: UserRole[]
    permissoes_custom: Partial<Permissoes>
    vendedor_id: number | null
  }) => Promise<void>
  onCancel: () => void
}

const ALL_ROLES: UserRole[] = ['admin', 'gerente', 'vendedor', 'financeiro', 'estoque', 'operador', 'visualizador']

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  gerente: 'Gerente',
  vendedor: 'Vendedor',
  financeiro: 'Financeiro',
  estoque: 'Estoque',
  operador: 'Operador',
  visualizador: 'Visualizador',
}

const PERMISSION_GROUPS = {
  modulos: {
    label: 'Módulos Principais',
    icon: '📦',
    permissions: ['dashboard', 'vendas', 'clientes', 'produtos', 'estoque', 'financeiro', 'relatorios', 'configuracoes', 'usuarios'] as (keyof Permissoes)[],
  },
  vendas: {
    label: 'Ações de Vendas',
    icon: '💰',
    permissions: ['vendas_criar', 'vendas_editar', 'vendas_deletar', 'vendas_visualizar_todas'] as (keyof Permissoes)[],
  },
  clientes: {
    label: 'Ações de Clientes',
    icon: '👥',
    permissions: ['clientes_criar', 'clientes_editar', 'clientes_deletar', 'clientes_visualizar_todos'] as (keyof Permissoes)[],
  },
  produtos: {
    label: 'Ações de Produtos',
    icon: '📦',
    permissions: ['produtos_criar', 'produtos_editar', 'produtos_deletar', 'produtos_ajustar_estoque'] as (keyof Permissoes)[],
  },
  financeiro: {
    label: 'Ações Financeiras',
    icon: '💳',
    permissions: ['financeiro_visualizar', 'financeiro_criar_transacao', 'financeiro_editar_transacao'] as (keyof Permissoes)[],
  },
  relatorios: {
    label: 'Ações de Relatórios',
    icon: '📊',
    permissions: ['relatorios_gerar', 'relatorios_exportar'] as (keyof Permissoes)[],
  },
  configuracoes: {
    label: 'Configurações',
    icon: '⚙️',
    permissions: ['config_sistema', 'config_usuarios'] as (keyof Permissoes)[],
  },
}

const PERMISSION_LABELS: Record<keyof Permissoes, string> = {
  dashboard: 'Dashboard',
  vendas: 'Módulo de Vendas',
  vendas_criar: 'Criar Vendas',
  vendas_editar: 'Editar Vendas',
  vendas_deletar: 'Deletar Vendas',
  vendas_visualizar_todas: 'Ver Todas as Vendas',
  clientes: 'Módulo de Clientes',
  clientes_criar: 'Criar Clientes',
  clientes_editar: 'Editar Clientes',
  clientes_deletar: 'Deletar Clientes',
  clientes_visualizar_todos: 'Ver Todos os Clientes',
  produtos: 'Módulo de Produtos',
  produtos_criar: 'Criar Produtos',
  produtos_editar: 'Editar Produtos',
  produtos_deletar: 'Deletar Produtos',
  produtos_ajustar_estoque: 'Ajustar Estoque',
  estoque: 'Módulo de Estoque',
  financeiro: 'Módulo Financeiro',
  financeiro_visualizar: 'Visualizar Financeiro',
  financeiro_criar_transacao: 'Criar Transações',
  financeiro_editar_transacao: 'Editar Transações',
  relatorios: 'Módulo de Relatórios',
  relatorios_gerar: 'Gerar Relatórios',
  relatorios_exportar: 'Exportar Relatórios',
  configuracoes: 'Configurações',
  config_sistema: 'Configurações do Sistema',
  config_usuarios: 'Gerenciar Usuários',
  usuarios: 'Módulo de Usuários',
}

export function UsuarioPermissoesForm({ usuario, vendedores = [], onSubmit, onCancel }: UsuarioPermissoesFormProps) {
  const [primaryRole, setPrimaryRole] = useState<UserRole>(usuario?.tipo_usuario || 'operador')
  const [additionalRoles, setAdditionalRoles] = useState<UserRole[]>(usuario?.roles || [])
  const [customPermissions, setCustomPermissions] = useState<Partial<Permissoes>>(usuario?.permissoes_custom || {})
  const [vendedorId, setVendedorId] = useState<number | null>(usuario?.vendedor_id || null)
  const [loading, setLoading] = useState(false)

  // Calcular permissões finais (merge de roles + custom)
  const finalPermissions = useMemo(() => {
    return mergePermissions(primaryRole, additionalRoles, customPermissions)
  }, [primaryRole, additionalRoles, customPermissions])

  // Calcular permissões base (sem custom) para mostrar preview
  const basePermissions = useMemo(() => {
    return mergePermissions(primaryRole, additionalRoles, {})
  }, [primaryRole, additionalRoles])

  const handleToggleAdditionalRole = (role: UserRole) => {
    if (additionalRoles.includes(role)) {
      setAdditionalRoles(additionalRoles.filter(r => r !== role))
    } else {
      setAdditionalRoles([...additionalRoles, role])
    }
  }

  const handleToggleCustomPermission = (permission: keyof Permissoes) => {
    const baseValue = basePermissions[permission]
    const currentCustomValue = customPermissions[permission]

    if (currentCustomValue === undefined) {
      // Customizar para o oposto do base
      setCustomPermissions({ ...customPermissions, [permission]: !baseValue })
    } else {
      // Remover customização
      const { [permission]: _, ...rest } = customPermissions
      setCustomPermissions(rest)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await onSubmit({
        tipo_usuario: primaryRole,
        roles: additionalRoles,
        permissoes_custom: customPermissions,
        vendedor_id: vendedorId,
      })
    } finally {
      setLoading(false)
    }
  }

  const hasCustomization = Object.keys(customPermissions).length > 0

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header com Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
              Sistema de Permissões Multi-Role
            </p>
            <p className="text-blue-700 dark:text-blue-300">
              Você pode atribuir múltiplos roles a um usuário (ex: vendedor + financeiro).
              As permissões serão mescladas (se qualquer role permite, a permissão é concedida).
              Você também pode customizar permissões individuais que sobrescrevem os roles.
            </p>
          </div>
        </div>
      </div>

      {/* Seleção de Role Primário */}
      <div className="space-y-2">
        <Label htmlFor="primaryRole" className="flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Role Primário *
        </Label>
        <Select value={primaryRole} onValueChange={(value) => setPrimaryRole(value as UserRole)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ALL_ROLES.map(role => (
              <SelectItem key={role} value={role}>
                {ROLE_LABELS[role]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Role principal que define o conjunto base de permissões
        </p>
      </div>

      {/* Seleção de Roles Adicionais */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Roles Adicionais (Opcional)
        </Label>
        <div className="grid grid-cols-2 gap-2">
          {ALL_ROLES.filter(role => role !== primaryRole).map(role => (
            <div
              key={role}
              className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
              onClick={() => handleToggleAdditionalRole(role)}
            >
              <Checkbox
                id={`role-${role}`}
                checked={additionalRoles.includes(role)}
                onCheckedChange={() => handleToggleAdditionalRole(role)}
              />
              <Label htmlFor={`role-${role}`} className="cursor-pointer flex-1">
                {ROLE_LABELS[role]}
              </Label>
            </div>
          ))}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Ex: Um usuário pode ser Vendedor E Financeiro ao mesmo tempo
        </p>
      </div>

      {/* Vinculação com Vendedor (OPCIONAL) */}
      <div className="space-y-2">
        <Label htmlFor="vendedor" className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Vincular com Vendedor (Opcional)
        </Label>
        <Select
          value={vendedorId?.toString() || ''}
          onValueChange={(value) => setVendedorId(value ? parseInt(value) : null)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Nenhum vendedor vinculado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Nenhum vendedor vinculado</SelectItem>
            {vendedores.map(v => (
              <SelectItem key={v.id} value={v.id.toString()}>
                {v.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Vincula o usuário a um vendedor para filtrar suas vendas e clientes
        </p>
      </div>

      {/* Tabs: Preview vs Customização */}
      <Tabs defaultValue="preview" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="preview">
            Preview de Permissões
            {hasCustomization && (
              <Badge variant="secondary" className="ml-2">
                {Object.keys(customPermissions).length} customizadas
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="custom">
            <Settings className="h-4 w-4 mr-2" />
            Customizar Permissões
          </TabsTrigger>
        </TabsList>

        {/* Tab: Preview */}
        <TabsContent value="preview" className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Permissões Finais
            </h4>
            <div className="space-y-3">
              {Object.entries(PERMISSION_GROUPS).map(([groupKey, group]) => (
                <div key={groupKey}>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {group.icon} {group.label}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {group.permissions.map(perm => {
                      const isGranted = finalPermissions[perm]
                      const isCustomized = customPermissions[perm] !== undefined

                      return (
                        <div
                          key={perm}
                          className={`flex items-center gap-2 text-sm px-2 py-1 rounded ${
                            isGranted
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                          }`}
                        >
                          <span>{isGranted ? '✓' : '✗'}</span>
                          <span className="flex-1">{PERMISSION_LABELS[perm]}</span>
                          {isCustomized && (
                            <Badge variant="outline" className="text-xs">
                              Custom
                            </Badge>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Tab: Customização */}
        <TabsContent value="custom" className="space-y-4">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                Clique em uma permissão para customizá-la (sobrescreve o valor dos roles).
                Clique novamente para remover a customização.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {Object.entries(PERMISSION_GROUPS).map(([groupKey, group]) => (
              <Card key={groupKey} className="p-4">
                <h4 className="font-medium mb-3">
                  {group.icon} {group.label}
                </h4>
                <div className="space-y-2">
                  {group.permissions.map(perm => {
                    const baseValue = basePermissions[perm]
                    const customValue = customPermissions[perm]
                    const finalValue = finalPermissions[perm]
                    const isCustomized = customValue !== undefined

                    return (
                      <div
                        key={perm}
                        className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${
                          isCustomized ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''
                        }`}
                        onClick={() => handleToggleCustomPermission(perm)}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox checked={finalValue} />
                          <div>
                            <p className="font-medium text-sm">{PERMISSION_LABELS[perm]}</p>
                            <p className="text-xs text-gray-500">
                              Valor base dos roles: {baseValue ? '✓ Permitido' : '✗ Negado'}
                              {isCustomized && (
                                <span className="text-blue-600 dark:text-blue-400 ml-2">
                                  → Customizado para: {finalValue ? '✓ Permitido' : '✗ Negado'}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        {isCustomized && (
                          <Badge variant="secondary">Customizado</Badge>
                        )}
                      </div>
                    )
                  })}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Botões de Ação */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Salvando...' : usuario ? 'Atualizar Permissões' : 'Criar Usuário'}
        </Button>
      </div>
    </form>
  )
}
