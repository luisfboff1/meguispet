import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface WelcomeCardProps {
  name: string
  role: string
  message?: string
  className?: string
}

/**
 * WelcomeCard - Card de boas-vindas personalizado
 *
 * Mostra mensagem de boas-vindas personalizada por role
 *
 * @example
 * ```tsx
 * <WelcomeCard
 *   name="João Silva"
 *   role="Vendedor"
 *   message="Bem-vindo ao seu painel de vendas!"
 * />
 * ```
 */
export function WelcomeCard({
  name,
  role,
  message,
  className,
}: WelcomeCardProps) {
  const defaultMessages: Record<string, string> = {
    admin: 'Bem-vindo ao painel administrativo completo',
    vendedor: 'Bem-vindo ao seu painel de vendas pessoal',
    financeiro: 'Bem-vindo ao painel financeiro',
    gerente: 'Bem-vindo ao painel de gestão',
    estoque: 'Bem-vindo ao painel de estoque',
    operador: 'Bem-vindo ao sistema',
    visualizador: 'Bem-vindo ao sistema (modo visualização)',
  }

  const displayMessage =
    message || defaultMessages[role.toLowerCase()] || 'Bem-vindo ao sistema'

  return (
    <Card
      className={cn(
        'bg-gradient-to-r from-meguispet-primary to-meguispet-secondary text-white overflow-hidden',
        className
      )}
    >
      <CardContent className="py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xl">👋</span>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight truncate">
                Olá, {name}!
              </p>
              <p className="text-white/75 text-xs truncate">{displayMessage}</p>
            </div>
          </div>
          <span className="flex-shrink-0 px-2.5 py-0.5 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium">
            {role}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
