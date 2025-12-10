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
      <CardContent className="pt-6 pb-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold">
            Olá, {name}! 👋
          </h1>
          <p className="text-white/90 text-sm">
            {displayMessage}
          </p>
          <div className="mt-2">
            <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium">
              {role}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
