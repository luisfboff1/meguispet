import { usePermissions } from '@/hooks/usePermissions'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import type { Permissoes } from '@/types'
import { AlertCircle, Lock } from 'lucide-react'

interface PermissionGateProps {
  /**
   * Permissão necessária para acessar o conteúdo
   */
  permission: keyof Permissoes

  /**
   * Componente alternativo a ser exibido se não tiver permissão
   * Se não fornecido, mostra mensagem padrão de acesso negado
   */
  fallback?: React.ReactNode

  /**
   * Se fornecido, redireciona para esta rota quando não tiver permissão
   */
  redirect?: string

  /**
   * Conteúdo a ser protegido
   */
  children: React.ReactNode

  /**
   * Se true, mostra uma mensagem menor ao invés da tela cheia
   * Útil para proteger seções dentro de uma página
   */
  inline?: boolean
}

/**
 * PermissionGate - Componente de Proteção de Permissões
 *
 * Renderiza o conteúdo apenas se o usuário tiver a permissão necessária.
 * Pode redirecionar ou mostrar mensagem de erro caso não tenha permissão.
 *
 * @example
 * ```tsx
 * // Proteger uma página inteira
 * <PermissionGate permission="financeiro" redirect="/dashboard">
 *   <FinanceiroPage />
 * </PermissionGate>
 *
 * // Proteger uma seção inline
 * <PermissionGate permission="vendas_deletar" inline>
 *   <Button>Deletar Venda</Button>
 * </PermissionGate>
 *
 * // Com fallback customizado
 * <PermissionGate permission="vendas_criar" fallback={<p>Sem permissão</p>}>
 *   <VendaForm />
 * </PermissionGate>
 * ```
 */
export function PermissionGate({
  permission,
  fallback,
  redirect,
  inline = false,
  children,
}: PermissionGateProps) {
  const router = useRouter()
  const { hasPermission } = usePermissions()

  // Redirecionar se não tiver permissão e redirect foi fornecido
  useEffect(() => {
    if (redirect && !hasPermission(permission)) {
      router.push(`${redirect}?error=permission_denied`)
    }
  }, [permission, redirect, hasPermission, router])

  // Se não tem permissão
  if (!hasPermission(permission)) {
    // Se tem fallback customizado, usar ele
    if (fallback) {
      return <>{fallback}</>
    }

    // Se é inline, mostrar mensagem pequena
    if (inline) {
      return (
        <div className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Lock className="h-4 w-4" />
          <span>Sem permissão</span>
        </div>
      )
    }

    // Senão, mostrar tela cheia de acesso negado
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-gray-50 dark:bg-gray-900">
        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md">
          <div className="mb-4 inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full">
            <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>

          <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
            Acesso Negado
          </h2>

          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Você não tem permissão para acessar esta funcionalidade.
          </p>

          <p className="text-sm text-gray-500 dark:text-gray-500">
            Entre em contato com o administrador se precisar de acesso.
          </p>
        </div>
      </div>
    )
  }

  // Se tem permissão, renderizar o conteúdo
  return <>{children}</>
}
