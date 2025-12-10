import { Card, CardContent } from '@/components/ui/card'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MetricCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  color?: 'blue' | 'green' | 'orange' | 'purple' | 'red' | 'amber'
  trend?: {
    value: string
    isPositive: boolean
  }
  subtitle?: string
}

const colorClasses = {
  blue: 'bg-blue-500 text-white',
  green: 'bg-green-500 text-white',
  orange: 'bg-orange-500 text-white',
  purple: 'bg-purple-500 text-white',
  red: 'bg-red-500 text-white',
  amber: 'bg-amber-500 text-white',
}

/**
 * MetricCard - Componente reutilizável para exibir métricas
 *
 * Usado em todos os dashboards para mostrar KPIs de forma consistente
 *
 * @example
 * ```tsx
 * <MetricCard
 *   title="Vendas do Mês"
 *   value={42}
 *   icon={ShoppingCart}
 *   color="blue"
 *   trend={{ value: "+15%", isPositive: true }}
 * />
 * ```
 */
export function MetricCard({
  title,
  value,
  icon: Icon,
  color = 'blue',
  trend,
  subtitle,
}: MetricCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-1">
              {title}
            </p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {value}
            </h3>
            {trend && (
              <p
                className={cn(
                  'text-xs mt-1',
                  trend.isPositive ? 'text-green-600' : 'text-red-600'
                )}
              >
                {trend.value}
              </p>
            )}
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div
            className={cn(
              'p-3 rounded-full',
              colorClasses[color]
            )}
          >
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
