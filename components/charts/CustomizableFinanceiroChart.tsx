"use client"

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, XAxis, YAxis } from 'recharts'
import { Settings2, TrendingUp, Calendar } from 'lucide-react'
import type { ChartConfig } from '@/components/ui/chart'

export interface FinanceiroChartData {
  mes: string
  receitas: number
  despesas: number
}

interface CustomizableFinanceiroChartProps {
  data: FinanceiroChartData[]
  loading?: boolean
}

type MetricKey = 'receitas' | 'despesas' | 'fluxoCaixa' | 'saldo'
type ChartType = 'line' | 'bar' | 'area'
type PeriodFilter = 'all' | 'month' | 'week' | 'custom'

const metricConfig: Record<MetricKey, { label: string; color: string }> = {
  receitas: { label: 'Receitas', color: 'hsl(142, 71%, 45%)' },
  despesas: { label: 'Despesas', color: 'hsl(0, 84%, 60%)' },
  fluxoCaixa: { label: 'Fluxo de Caixa', color: 'hsl(221, 83%, 53%)' },
  saldo: { label: 'Saldo Acumulado', color: 'hsl(38, 92%, 50%)' },
}

export default function CustomizableFinanceiroChart({ data, loading = false }: CustomizableFinanceiroChartProps) {
  const [selectedMetrics, setSelectedMetrics] = useState<Set<MetricKey>>(
    new Set<MetricKey>(['fluxoCaixa'])
  )
  const [chartType, setChartType] = useState<ChartType>('area')
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('month')

  // Utility functions defined before use
  const formatMes = (mes: string) => {
    const [ano, mesNum] = mes.split('-')
    const meses = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ]
    return `${meses[parseInt(mesNum) - 1]} ${ano.slice(-2)}`
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value)
  }

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {}
    selectedMetrics.forEach((metric) => {
      config[metric] = {
        label: metricConfig[metric].label,
        color: metricConfig[metric].color,
      }
    })
    return config
  }, [selectedMetrics])

  // Process data based on selected metrics
  const processedData = useMemo(() => {
    if (!data || data.length === 0) return []

    // Apply period filter
    let filteredData = [...data]
    if (periodFilter === 'month') {
      filteredData = data.slice(-1) // Current month only
    } else if (periodFilter === 'week') {
      filteredData = data.slice(-1) // Approximate last week (needs daily data for true week)
    }

    // Calculate additional metrics
    let saldoAcumulado = 0
    return filteredData.map((item) => {
      const receitas = parseFloat(item.receitas?.toString() || '0')
      const despesas = parseFloat(item.despesas?.toString() || '0')
      const fluxoCaixa = receitas - despesas
      saldoAcumulado += fluxoCaixa

      return {
        mes: item.mes,
        formattedDate: formatMes(item.mes),
        receitas,
        despesas,
        fluxoCaixa,
        saldo: saldoAcumulado,
      }
    })
  }, [data, periodFilter])

  const toggleMetric = (metric: MetricKey) => {
    setSelectedMetrics((prev) => {
      const next = new Set(prev)
      if (next.has(metric)) {
        if (next.size > 1) {
          next.delete(metric)
        }
      } else {
        next.add(metric)
      }
      return next
    })
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-1/3 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mt-2 animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-meguispet-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!processedData || processedData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Análise Financeira</CardTitle>
          <CardDescription>Acompanhe o fluxo de caixa e desempenho financeiro</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p>Nenhum dado disponível</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderChart = () => {
    const chartProps = {
      data: processedData,
      margin: {
        top: 10,
        right: 10,
        left: 10,
        bottom: 0
      },
    }

    const metricsArray = Array.from(selectedMetrics)

    const renderMetrics = () => {
      return metricsArray.map((metric) => {
        const color = metricConfig[metric].color

        if (chartType === 'line') {
          return (
            <Line
              key={metric}
              type="monotone"
              dataKey={metric}
              stroke={color}
              strokeWidth={2}
              dot={{ fill: color, r: 4 }}
              activeDot={{ r: 6 }}
            />
          )
        }

        if (chartType === 'bar') {
          return (
            <Bar
              key={metric}
              dataKey={metric}
              fill={color}
              radius={[4, 4, 0, 0]}
            />
          )
        }

        return (
          <Area
            key={metric}
            type="monotone"
            dataKey={metric}
            stroke={color}
            fill={color}
            fillOpacity={0.2}
            strokeWidth={2}
          />
        )
      })
    }

    const commonChildren = (
      <>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
        <XAxis
          dataKey="formattedDate"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          className="text-xs"
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          className="text-xs"
          tickFormatter={(value) => {
            return new Intl.NumberFormat('pt-BR', {
              notation: 'compact',
              compactDisplay: 'short',
              style: 'currency',
              currency: 'BRL',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(value)
          }}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(value): React.ReactNode => {
                const item = processedData.find((d) => d.formattedDate === value)
                if (item) {
                  return formatMes(item.mes)
                }
                return String(value ?? '')
              }}
              formatter={(value, name) => {
                const numValue = typeof value === 'number' ? value : parseFloat(value as string)
                const formattedValue = formatCurrency(numValue)
                const label = metricConfig[name as MetricKey]?.label || name

                return (
                  <div className="flex items-center justify-between gap-4 min-w-[140px]">
                    <span className="font-medium">{label}:</span>
                    <span className="font-mono text-right">{formattedValue}</span>
                  </div>
                )
              }}
            />
          }
        />
        <Legend
          wrapperStyle={{ paddingTop: '20px' }}
          iconType="circle"
          formatter={(value) => {
            const metric = value as MetricKey
            return metricConfig[metric]?.label || value
          }}
        />
        {renderMetrics()}
      </>
    )

    if (chartType === 'line') {
      return <LineChart {...chartProps}>{commonChildren}</LineChart>
    }

    if (chartType === 'bar') {
      return <BarChart {...chartProps}>{commonChildren}</BarChart>
    }

    return <AreaChart {...chartProps}>{commonChildren}</AreaChart>
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Análise Financeira</CardTitle>
            <CardDescription>
              Personalize a visualização do fluxo de caixa e métricas financeiras
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Period Filter */}
            <div className="flex rounded-md border">
              <Button
                variant={periodFilter === 'all' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setPeriodFilter('all')}
                className="rounded-r-none px-3"
              >
                Todos
              </Button>
              <Button
                variant={periodFilter === 'month' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setPeriodFilter('month')}
                className="rounded-none px-3"
              >
                Mês
              </Button>
              <Button
                variant={periodFilter === 'week' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setPeriodFilter('week')}
                className="rounded-l-none px-3"
              >
                Semana
              </Button>
            </div>

            {/* Chart Type Toggle */}
            <div className="flex rounded-md border">
              <Button
                variant={chartType === 'area' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setChartType('area')}
                className="rounded-r-none rounded-l-md px-3"
              >
                Área
              </Button>
              <Button
                variant={chartType === 'line' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setChartType('line')}
                className="rounded-none px-3"
              >
                Linha
              </Button>
              <Button
                variant={chartType === 'bar' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setChartType('bar')}
                className="rounded-l-none rounded-r-md px-3"
              >
                Barra
              </Button>
            </div>

            {/* Metrics Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings2 className="h-4 w-4 mr-2" />
                  Métricas ({selectedMetrics.size})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>Selecionar Métricas</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(Object.keys(metricConfig) as MetricKey[]).map((metric) => (
                  <DropdownMenuCheckboxItem
                    key={metric}
                    checked={selectedMetrics.has(metric)}
                    onCheckedChange={() => toggleMetric(metric)}
                    disabled={selectedMetrics.has(metric) && selectedMetrics.size === 1}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: metricConfig[metric].color }}
                      />
                      <span className="flex-1">{metricConfig[metric].label}</span>
                    </div>
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-80 w-full">
          {renderChart()}
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
