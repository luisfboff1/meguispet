import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

/**
 * EmptyState - Componente para exibir quando não há dados
 *
 * @example
 * ```tsx
 * <EmptyState
 *   icon={ShoppingCart}
 *   title="Nenhuma venda registrada"
 *   description="Comece fazendo sua primeira venda"
 *   actionLabel="Nova Venda"
 *   onAction={() => console.log('abrir modal')}
 * />
 * ```
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Icon className="h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 text-center mb-4 max-w-md">{description}</p>
        {actionLabel && onAction && (
          <Button onClick={onAction} className="bg-meguispet-primary">
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
