"use client"

import React, { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
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
import { Settings2, TrendingUp, Menu, Calendar } from 'lucide-react'
import { formatLocalDate } from '@/lib/utils'
import type { ChartConfig } from '@/components/ui/chart'

// Recharts imports (lazy loaded na página)
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, XAxis, YAxis } from 'recharts'

export interface DashboardChartData {
  data: string
  vendas: number
  receita: number
  despesas?: number
  impostos?: number
}

type PeriodDays = 7 | 14 | 30

interface DashboardChartProps {
  data: DashboardChartData[]
  loading?: boolean
  selectedPeriod?: PeriodDays
  onPeriodChange?: (days: PeriodDays) => void
}

type MetricKey = 'receita' | 'vendas' | 'despesas' | 'impostos'
type ChartType = 'line' | 'bar' | 'area'
type DisplayMode = 'total' | 'percent'
type MetricScale = 'monetary' | 'quantity'

const metricConfig: Record<MetricKey, { label: string; color: string; scale: MetricScale }> = {
  receita: { label: 'Receita', color: 'hsl(142, 71%, 45%)', scale: 'monetary' },
  vendas: { label: 'Vendas', color: 'hsl(221, 83%, 53%)', scale: 'quantity' },
  despesas: { label: 'Despesas', color: 'hsl(0, 84%, 60%)', scale: 'monetary' },
  impostos: { label: 'Impostos', color: 'hsl(38, 92%, 50%)', scale: 'monetary' },
}

export default function DashboardChart({ data, loading = false, selectedPeriod = 7, onPeriodChange }: DashboardChartProps) {
  const [selectedMetrics, setSelectedMetrics] = useState<Set<MetricKey>>(
    new Set<MetricKey>(['receita', 'vendas'])
  )
  const [chartType, setChartType] = useState<ChartType>('area')
  const [displayMode, setDisplayMode] = useState<DisplayMode>('total')
  const [showControls, setShowControls] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile screen size
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)

    return () => window.removeEventListener('resize', checkMobile)
  }, [])

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

  // Check if we need dual Y-axis (different scales selected)
  const useDualAxis = useMemo(() => {
    if (displayMode === 'percent') return false // In percent mode, all use same scale
    const scales = new Set(Array.from(selectedMetrics).map(m => metricConfig[m].scale))
    return scales.size > 1
  }, [selectedMetrics, displayMode])

  const processedData = useMemo(() => {
    if (displayMode === 'total') {
      return data.map((item) => ({
        ...item,
        formattedDate: formatLocalDate(item.data, {
          day: '2-digit',
          month: 'short',
        }),
      }))
    }

    // Calculate percentages
    return data.map((item) => {
      const total = (item.receita || 0) + (item.despesas || 0) + (item.impostos || 0)
      const safetotal = total > 0 ? total : 1

      return {
        data: item.data,
        formattedDate: formatLocalDate(item.data, {
          day: '2-digit',
          month: 'short',
        }),
        vendas: item.vendas,
        receita: ((item.receita || 0) / safetotal) * 100,
        despesas: ((item.despesas || 0) / safetotal) * 100,
        impostos: ((item.impostos || 0) / safetotal) * 100,
      }
    })
  }, [data, displayMode])

  const closeControlsIfNeeded = () => {
    // Fecha o menu após seleção
    setShowControls(false)
  }

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

  const formatValue = (value: number, metric: MetricKey) => {
    if (displayMode === 'percent') {
      return `${value.toFixed(1)}%`
    }
    if (metric === 'vendas') {
      return value.toString()
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value)
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

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Análise de Desempenho</CardTitle>
          <CardDescription>Acompanhe as métricas do seu negócio</CardDescription>
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
        top: 5,
        right: isMobile ? 5 : (useDualAxis ? 30 : 5),
        left: isMobile ? 5 : 5,
        bottom: 0
      },
    }

    const metricsArray = Array.from(selectedMetrics)

    const renderMetrics = () => {
      return metricsArray.map((metric) => {
        const color = metricConfig[metric].color
        const yAxisId = useDualAxis ? metricConfig[metric].scale : 'default'

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
              yAxisId={yAxisId}
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
              yAxisId={yAxisId}
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
            yAxisId={yAxisId}
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
        {!isMobile && (useDualAxis ? (
          <>
            {/* Left Y-axis for monetary values */}
            <YAxis
              yAxisId="monetary"
              orientation="left"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              className="text-xs"
              stroke="hsl(142, 71%, 45%)"
              tickFormatter={(value) => {
                if (displayMode === 'percent') return `${value}%`
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
            {/* Right Y-axis for quantity values */}
            <YAxis
              yAxisId="quantity"
              orientation="right"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              className="text-xs"
              stroke="hsl(221, 83%, 53%)"
              tickFormatter={(value) => {
                if (displayMode === 'percent') return `${value}%`
                return Math.round(value).toString()
              }}
            />
          </>
        ) : (
          /* Single Y-axis when all metrics use same scale */
          <YAxis
            yAxisId="default"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            className="text-xs"
            tickFormatter={(value) => {
              if (displayMode === 'percent') return `${value}%`
              const firstMetric = metricsArray[0]
              const scale = metricConfig[firstMetric]?.scale

              if (scale === 'quantity') {
                return Math.round(value).toString()
              }

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
        ))}
        <ChartTooltip
          wrapperStyle={{ zIndex: 1000 }}
          content={
            <ChartTooltipContent
              labelFormatter={(value): React.ReactNode => {
                const item = processedData.find((d) => d.formattedDate === value)
                if (item) {
                  return new Date(item.data).toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'long',
                  })
                }
                return String(value ?? '')
              }}
              formatter={(value, name) => {
                const numValue = typeof value === 'number' ? value : parseFloat(value as string)
                const formattedValue = formatValue(numValue, name as MetricKey)
                const label = metricConfig[name as MetricKey]?.label || name

                // Return array: [label, value] for proper formatting
                return (
                  <div className="flex items-center justify-between gap-4 min-w-[120px]">
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
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Análise de Desempenho</CardTitle>
              <CardDescription>
                Personalize a visualização das métricas do seu negócio
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowControls(!showControls)}
              className="w-fit"
            >
              <Menu className="h-4 w-4 mr-2" />
              Personalizar
            </Button>
          </div>

          {/* Controls Section - Collapsible */}
          {showControls && (
            <div className="flex flex-wrap gap-2 items-center border-t pt-4">
            {/* Display Mode Toggle */}
            <div className="flex rounded-md border">
              <Button
                variant={displayMode === 'total' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => { setDisplayMode('total'); closeControlsIfNeeded() }}
                className="rounded-r-none"
              >
                Total
              </Button>
              <Button
                variant={displayMode === 'percent' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => { setDisplayMode('percent'); closeControlsIfNeeded() }}
                className="rounded-l-none"
              >
                %
              </Button>
            </div>

            {/* Chart Type Toggle */}
            <div className="flex rounded-md border">
              <Button
                variant={chartType === 'area' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => { setChartType('area'); closeControlsIfNeeded() }}
                className="rounded-r-none rounded-l-md px-3"
              >
                Área
              </Button>
              <Button
                variant={chartType === 'line' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => { setChartType('line'); closeControlsIfNeeded() }}
                className="rounded-none px-3"
              >
                Linha
              </Button>
              <Button
                variant={chartType === 'bar' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => { setChartType('bar'); closeControlsIfNeeded() }}
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
              <DropdownMenuContent align="end" className="w-48">
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
                      {useDualAxis && (
                        <span className="text-[10px] text-gray-500 ml-auto">
                          {metricConfig[metric].scale === 'monetary' ? 'R$ ←' : '→ Qtd'}
                        </span>
                      )}
                    </div>
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Period Selector */}
            {onPeriodChange && (
              <div className="flex rounded-md border">
                <Button
                  variant={selectedPeriod === 7 ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => onPeriodChange(7)}
                  className="rounded-r-none rounded-l-md px-3"
                >
                  <Calendar className="h-4 w-4 mr-1" />
                  7 dias
                </Button>
                <Button
                  variant={selectedPeriod === 14 ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => onPeriodChange(14)}
                  className="rounded-none px-3"
                >
                  14 dias
                </Button>
                <Button
                  variant={selectedPeriod === 30 ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => onPeriodChange(30)}
                  className="rounded-l-none rounded-r-md px-3"
                >
                  30 dias
                </Button>
              </div>
            )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-96 w-full">
          {renderChart()}
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
