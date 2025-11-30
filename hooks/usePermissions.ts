import { useAuthStore } from '@/store/auth'
import { useMemo } from 'react'
import type { Permissoes, UserRole } from '@/types'

/**
 * Hook usePermissions
 *
 * Fornece acesso às permissões do usuário atual e funções helpers
 * para verificar permissões específicas.
 *
 * @example
 * ```tsx
 * const { hasPermission, isAdmin, canViewAllSales } = usePermissions()
 *
 * if (hasPermission('vendas_criar')) {
 *   // Mostrar botão de criar venda
 * }
 *
 * if (isVendedor && !canViewAllSales) {
 *   // Filtrar apenas vendas do vendedor
 * }
 * ```
 */
export function usePermissions() {
  const user = useAuthStore(state => state.user)

  // Memoizar permissões para evitar recalcular
  const permissions = useMemo<Permissoes>(() => {
    if (!user || !user.permissoes) {
      // Retorna permissões vazias se não houver usuário
      return {} as Permissoes
    }
    return user.permissoes
  }, [user])

  /**
   * Verifica se o usuário tem uma permissão específica
   *
   * @param permission - Nome da permissão a verificar
   * @returns true se tem a permissão, false caso contrário
   */
  const hasPermission = (permission: keyof Permissoes): boolean => {
    return permissions[permission] === true
  }

  /**
   * Verifica se o usuário tem QUALQUER uma das permissões fornecidas
   *
   * @param perms - Array de permissões
   * @returns true se tem pelo menos uma permissão
   *
   * @example
   * ```tsx
   * if (hasAnyPermission(['vendas_criar', 'vendas_editar'])) {
   *   // Usuário pode criar OU editar vendas
   * }
   * ```
   */
  const hasAnyPermission = (perms: (keyof Permissoes)[]): boolean => {
    return perms.some(p => permissions[p] === true)
  }

  /**
   * Verifica se o usuário tem TODAS as permissões fornecidas
   *
   * @param perms - Array de permissões
   * @returns true se tem todas as permissões
   *
   * @example
   * ```tsx
   * if (hasAllPermissions(['produtos_criar', 'produtos_editar'])) {
   *   // Usuário pode criar E editar produtos
   * }
   * ```
   */
  const hasAllPermissions = (perms: (keyof Permissoes)[]): boolean => {
    return perms.every(p => permissions[p] === true)
  }

  // ===== HELPERS POR ROLE =====

  /**
   * Verifica se o usuário é Admin (acesso total)
   */
  const isAdmin = user?.tipo_usuario === 'admin'

  /**
   * Verifica se o usuário é Vendedor (primário OU adicional)
   */
  const isVendedor =
    user?.tipo_usuario === 'vendedor' ||
    user?.roles?.includes('vendedor')

  /**
   * Verifica se o usuário é do Financeiro (primário OU adicional)
   */
  const isFinanceiro =
    user?.tipo_usuario === 'financeiro' ||
    user?.roles?.includes('financeiro')

  /**
   * Verifica se o usuário é Gerente (primário OU adicional)
   */
  const isGerente =
    user?.tipo_usuario === 'gerente' ||
    user?.roles?.includes('gerente')

  /**
   * Retorna todos os roles do usuário (primário + adicionais)
   */
  const allRoles = useMemo(() => {
    const roles = [user?.tipo_usuario]
    if (user?.roles && user.roles.length > 0) {
      roles.push(...user.roles)
    }
    return roles.filter(Boolean) as UserRole[]
  }, [user?.tipo_usuario, user?.roles])

  /**
   * Verifica se o usuário tem um role específico (primário OU adicional)
   */
  const hasRole = (role: UserRole): boolean => {
    return allRoles.includes(role)
  }

  // ===== HELPERS DE PERMISSÕES ESPECÍFICAS =====

  /**
   * Verifica se pode visualizar TODAS as vendas
   * (false = só vê as próprias vendas, como vendedor)
   */
  const canViewAllSales = permissions.vendas_visualizar_todas === true

  /**
   * Verifica se pode visualizar TODOS os clientes
   * (false = só vê os próprios clientes, como vendedor)
   */
  const canViewAllClients = permissions.clientes_visualizar_todos === true

  /**
   * Verifica se pode acessar o módulo financeiro
   */
  const canAccessFinanceiro = permissions.financeiro === true

  /**
   * Verifica se pode gerenciar usuários
   */
  const canManageUsers = permissions.config_usuarios === true

  /**
   * Verifica se pode gerenciar configurações do sistema
   */
  const canManageSystem = permissions.config_sistema === true

  // ===== DADOS DO USUÁRIO =====

  /**
   * ID do vendedor vinculado ao usuário (se for vendedor)
   * Útil para filtrar vendas e clientes
   */
  const vendedorId = user?.vendedor_id

  /**
   * Nome do usuário
   */
  const userName = user?.nome

  /**
   * Role/Tipo do usuário
   */
  const userRole = user?.tipo_usuario

  /**
   * Verifica se o usuário tem um vendedor vinculado
   */
  const hasVendedor = vendedorId != null

  return {
    // Permissões completas
    permissions,

    // Funções de verificação
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,

    // Helpers por role
    isAdmin,
    isVendedor,
    isFinanceiro,
    isGerente,
    hasRole,         // 🆕 Verifica se tem um role específico
    allRoles,        // 🆕 Array com todos os roles do usuário

    // Helpers de permissões específicas
    canViewAllSales,
    canViewAllClients,
    canAccessFinanceiro,
    canManageUsers,
    canManageSystem,

    // Dados do usuário
    vendedorId,
    userName,
    userRole,
    hasVendedor,
  }
}
