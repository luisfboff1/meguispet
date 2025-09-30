import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface FinanceiroChartProps {
  data: {
    mes: string
    receitas: string | number
    despesas: string | number
  }[]
  title: string
  description: string
}

export function FinanceiroChart({ data, title, description }: FinanceiroChartProps) {
  const maxValue = Math.max(
    ...data.flatMap(d => [parseFloat(d.receitas.toString()) || 0, parseFloat(d.despesas.toString()) || 0]),
    100 // Valor mínimo para evitar gráfico vazio
  )

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatMes = (mes: string) => {
    const [ano, mesNum] = mes.split('-')
    const meses = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ]
    return `${meses[parseInt(mesNum) - 1]} ${ano.slice(-2)}`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Legend */}
          <div className="flex items-center justify-center space-x-6">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Receitas</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Despesas</span>
            </div>
          </div>

          {/* Chart */}
          <div className="h-64 flex items-end justify-between space-x-2 p-4">
            {data.map((item, index) => (
              <div key={index} className="flex-1 flex flex-col items-center space-y-2">
                {/* Bars */}
                <div className="w-full flex flex-col items-center space-y-1 h-48">
                  {/* Receitas Bar */}
                  <div className="w-full flex flex-col items-center">
                    <div
                      className="w-full bg-green-500 rounded-t transition-all duration-300 hover:bg-green-600 cursor-pointer"
                      style={{
                        height: `${((parseFloat(item.receitas.toString()) || 0) / maxValue) * 180}px`,
                        minHeight: (parseFloat(item.receitas.toString()) || 0) > 0 ? '4px' : '0px'
                      }}
                      title={`Receitas: ${formatCurrency(parseFloat(item.receitas.toString()) || 0)}`}
                    />
                  </div>

                  {/* Despesas Bar */}
                  <div className="w-full flex flex-col items-center">
                    <div
                      className="w-full bg-red-500 rounded-b transition-all duration-300 hover:bg-red-600 cursor-pointer"
                      style={{
                        height: `${((parseFloat(item.despesas.toString()) || 0) / maxValue) * 180}px`,
                        minHeight: (parseFloat(item.despesas.toString()) || 0) > 0 ? '4px' : '0px'
                      }}
                      title={`Despesas: ${formatCurrency(parseFloat(item.despesas.toString()) || 0)}`}
                    />
                  </div>
                </div>

                {/* Month Label */}
                <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  {formatMes(item.mes)}
                </div>

                {/* Values */}
                <div className="text-xs text-center space-y-1">
                  <div className="text-green-600 font-medium">
                    {formatCurrency(parseFloat(item.receitas.toString()) || 0)}
                  </div>
                  <div className="text-red-600 font-medium">
                    {formatCurrency(parseFloat(item.despesas.toString()) || 0)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="border-t pt-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(data.reduce((acc, item) => acc + (parseFloat(item.receitas.toString()) || 0), 0))}
                </div>
                <div className="text-xs text-gray-500">Total Receitas</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(data.reduce((acc, item) => acc + (parseFloat(item.despesas.toString()) || 0), 0))}
                </div>
                <div className="text-xs text-gray-500">Total Despesas</div>
              </div>
              <div>
                <div className={`text-2xl font-bold ${
                  data.reduce((acc, item) => acc + (parseFloat(item.receitas.toString()) || 0) - (parseFloat(item.despesas.toString()) || 0), 0) >= 0 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`}>
                  {formatCurrency(data.reduce((acc, item) => acc + (parseFloat(item.receitas.toString()) || 0) - (parseFloat(item.despesas.toString()) || 0), 0))}
                </div>
                <div className="text-xs text-gray-500">Saldo</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Componente para gráfico de pizza simples
interface PizzaChartProps {
  data: {
    receita: string | number
    despesas: string | number
  }
  title: string
  description: string
}

export function PizzaChart({ data, title, description }: PizzaChartProps) {
  const receita = parseFloat(data.receita.toString()) || 0
  const despesas = parseFloat(data.despesas.toString()) || 0
  const total = receita + despesas
  const receitaPercent = total > 0 ? (receita / total) * 100 : 0
  const despesaPercent = total > 0 ? (despesas / total) * 100 : 0

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Pie Chart Visual */}
          <div className="flex justify-center">
            <div className="relative w-48 h-48">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Receitas */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="20"
                  strokeDasharray={`${receitaPercent * 2.51} ${100 * 2.51}`}
                  className="transition-all duration-300"
                />
                {/* Despesas */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="20"
                  strokeDasharray={`${despesaPercent * 2.51} ${100 * 2.51}`}
                  strokeDashoffset={`-${receitaPercent * 2.51}`}
                  className="transition-all duration-300"
                />
              </svg>
              
              {/* Center Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {formatCurrency(total)}
                </div>
                <div className="text-xs text-gray-500">Total</div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className="text-sm">Receitas</span>
              </div>
              <div className="text-right">
                <div className="font-medium">{formatCurrency(receita)}</div>
                <div className="text-xs text-gray-500">{receitaPercent.toFixed(1)}%</div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span className="text-sm">Despesas</span>
              </div>
              <div className="text-right">
                <div className="font-medium">{formatCurrency(despesas)}</div>
                <div className="text-xs text-gray-500">{despesaPercent.toFixed(1)}%</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
