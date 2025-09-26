import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  DollarSign, 
  ShoppingCart, 
  Users, 
  Package,
  TrendingUp,
  TrendingDown,
  Eye
} from 'lucide-react'

// 📊 PÁGINA DASHBOARD - EXEMPLO DE LAYOUT AUTOMÁTICO
// Esta página não precisa configurar layout - é automático!
// O layout é aplicado pelo _app.tsx globalmente

interface MetricCard {
  title: string
  value: string
  change: string
  changeType: 'positive' | 'negative'
  icon: React.ComponentType<{ className?: string }>
}

const metrics: MetricCard[] = [
  {
    title: 'Vendas Hoje',
    value: 'R$ 2.450,00',
    change: '+12.5%',
    changeType: 'positive',
    icon: DollarSign
  },
  {
    title: 'Pedidos',
    value: '23',
    change: '+5.2%',
    changeType: 'positive',
    icon: ShoppingCart
  },
  {
    title: 'Clientes',
    value: '1.234',
    change: '+8.1%',
    changeType: 'positive',
    icon: Users
  },
  {
    title: 'Produtos',
    value: '456',
    change: '-2.4%',
    changeType: 'negative',
    icon: Package
  }
]

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => {
          const Icon = metric.icon
          return (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {metric.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-meguispet-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {metric.value}
                </div>
                <div className="flex items-center text-xs">
                  {metric.changeType === 'positive' ? (
                    <TrendingUp className="mr-1 h-3 w-3 text-meguispet-success" />
                  ) : (
                    <TrendingDown className="mr-1 h-3 w-3 text-meguispet-error" />
                  )}
                  <span className={
                    metric.changeType === 'positive' 
                      ? 'text-meguispet-success' 
                      : 'text-meguispet-error'
                  }>
                    {metric.change}
                  </span>
                  <span className="text-gray-500 ml-1">vs. ontem</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vendas Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Vendas dos Últimos 7 Dias</CardTitle>
            <CardDescription>
              Acompanhe o desempenho das suas vendas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <p className="text-gray-500">Gráfico de Vendas (Em desenvolvimento)</p>
            </div>
          </CardContent>
        </Card>

        {/* Produtos Mais Vendidos */}
        <Card>
          <CardHeader>
            <CardTitle>Produtos Mais Vendidos</CardTitle>
            <CardDescription>
              Top 5 produtos mais vendidos hoje
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: 'Ração Premium 15kg', sales: 12, revenue: 'R$ 840,00' },
                { name: 'Coleira Anti-pulgas', sales: 8, revenue: 'R$ 240,00' },
                { name: 'Brinquedo Mordedor', sales: 6, revenue: 'R$ 120,00' },
                { name: 'Shampoo Pet', sales: 4, revenue: 'R$ 80,00' },
                { name: 'Casinha de Madeira', sales: 2, revenue: 'R$ 180,00' },
              ].map((product, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-500">{product.sales} vendas</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-meguispet-primary">{product.revenue}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-4">
        <Button className="bg-meguispet-primary hover:bg-meguispet-primary/90">
          <ShoppingCart className="mr-2 h-4 w-4" />
          Nova Venda
        </Button>
        <Button variant="outline">
          <Package className="mr-2 h-4 w-4" />
          Cadastrar Produto
        </Button>
        <Button variant="outline">
          <Users className="mr-2 h-4 w-4" />
          Novo Cliente
        </Button>
        <Button variant="outline">
          <Eye className="mr-2 h-4 w-4" />
          Ver Relatórios
        </Button>
      </div>
    </div>
  )
}
