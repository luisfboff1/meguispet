"use client"

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ReferenceLine, XAxis, YAxis } from 'recharts'
import { Settings2, TrendingUp, Calendar, Eye, EyeOff, CalendarDays } from 'lucide-react'
import type { ChartConfig } from '@/components/ui/chart'
import type { FinanceiroMetrics } from '@/types'

interface CustomizableFinanceiroChartProps {
  data: FinanceiroMetrics['grafico_mensal'] | FinanceiroMetrics['grafico_diario']
  loading?: boolean
}

type MetricKey = 'receitas' | 'despesas' | 'fluxoCaixa' | 'saldoAcumulado'
type ChartType = 'line' | 'bar' | 'area'
type PeriodFilter = 'next7' | 'next30' | 'next60' | 'next90' | 'month' | 'custom'

const metricConfig: Record<MetricKey, { label: string; color: string }> = {
  receitas: { label: 'Receitas', color: 'hsl(142, 71%, 45%)' },
  despesas: { label: 'Despesas', color: 'hsl(0, 84%, 60%)' },
  fluxoCaixa: { label: 'Fluxo de Caixa', color: 'hsl(221, 83%, 53%)' },
  saldoAcumulado: { label: 'Saldo Acumulado', color: 'hsl(38, 92%, 50%)' },
}

export default function CustomizableFinanceiroChart({ data, loading = false }: CustomizableFinanceiroChartProps) {
  const [selectedMetrics, setSelectedMetrics] = useState<Set<MetricKey>>(
    new Set<MetricKey>(['saldoAcumulado'])
  )
  const [chartType, setChartType] = useState<ChartType>('area')
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('next30')
  const [showEmptyDays, setShowEmptyDays] = useState(false)
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [showCustomDatePopover, setShowCustomDatePopover] = useState(false)

  // Utility functions defined before use
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
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

  // Process data based on selected filters
  const processedData = useMemo(() => {
    if (!data || data.length === 0) return []

    // Check if data has 'data' field (daily) or 'mes' field (monthly)
    const isDailyData = 'data' in data[0]

    if (!isDailyData) {
      // Legacy monthly data - convert to daily-like format for compatibility
      const monthlyData = data as FinanceiroMetrics['grafico_mensal']
      return monthlyData.map((item) => ({
        displayDate: item.mes,
        formattedDate: item.mes,
        receitas: item.receitas,
        despesas: -item.despesas, // Negativo
        fluxoCaixa: item.receitas - item.despesas,
        saldoAcumulado: 0,
        temMovimentacao: true,
        ehProjecao: false
      }))
    }

    // Daily data processing
    let filteredData = [...(data as FinanceiroMetrics['grafico_diario'])]

    // Apply period filter - Mostra passado + futuro centrado em HOJE
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    if (periodFilter === 'next7') {
      // Últimos 7 dias + Próximos 7 dias
      const startDate = new Date(hoje)
      startDate.setDate(startDate.getDate() - 7)
      const endDate = new Date(hoje)
      endDate.setDate(endDate.getDate() + 7)
      filteredData = filteredData.filter(d => {
        const itemDate = new Date(d.data)
        return itemDate >= startDate && itemDate <= endDate
      })
    } else if (periodFilter === 'next30') {
      // Últimos 30 dias + Próximos 30 dias
      const startDate = new Date(hoje)
      startDate.setDate(startDate.getDate() - 30)
      const endDate = new Date(hoje)
      endDate.setDate(endDate.getDate() + 30)
      filteredData = filteredData.filter(d => {
        const itemDate = new Date(d.data)
        return itemDate >= startDate && itemDate <= endDate
      })
    } else if (periodFilter === 'next60') {
      // Últimos 60 dias + Próximos 60 dias
      const startDate = new Date(hoje)
      startDate.setDate(startDate.getDate() - 60)
      const endDate = new Date(hoje)
      endDate.setDate(endDate.getDate() + 60)
      filteredData = filteredData.filter(d => {
        const itemDate = new Date(d.data)
        return itemDate >= startDate && itemDate <= endDate
      })
    } else if (periodFilter === 'next90') {
      // Últimos 90 dias + Próximos 90 dias
      const startDate = new Date(hoje)
      startDate.setDate(startDate.getDate() - 90)
      const endDate = new Date(hoje)
      endDate.setDate(endDate.getDate() + 90)
      filteredData = filteredData.filter(d => {
        const itemDate = new Date(d.data)
        return itemDate >= startDate && itemDate <= endDate
      })
    } else if (periodFilter === 'month') {
      // Do primeiro dia do mês atual até o último dia do mês atual
      const firstDayOfMonth = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
      const lastDayOfMonth = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
      filteredData = filteredData.filter(d => {
        const itemDate = new Date(d.data)
        return itemDate >= firstDayOfMonth && itemDate <= lastDayOfMonth
      })
    } else if (periodFilter === 'custom') {
      if (customStartDate && customEndDate) {
        const startDate = new Date(customStartDate)
        const endDate = new Date(customEndDate)
        filteredData = filteredData.filter(d => {
          const itemDate = new Date(d.data)
          return itemDate >= startDate && itemDate <= endDate
        })
      }
    }

    // Filter empty days if option is disabled
    if (!showEmptyDays) {
      filteredData = filteredData.filter(d => d.temMovimentacao)
    }

    // Limitar dados para performance (máximo 365 dias no gráfico)
    if (filteredData.length > 365) {
      // Pegar amostra distribuída uniformemente
      const step = Math.ceil(filteredData.length / 365)
      filteredData = filteredData.filter((_, index) => index % step === 0)
    }

    // Add formatted display date
    return filteredData.map(d => ({
      ...d,
      displayDate: d.data,
      formattedDate: formatDate(d.data)
    }))
  }, [data, periodFilter, showEmptyDays, customStartDate, customEndDate])

  // Calculate period totals
  const periodTotals = useMemo(() => {
    if (processedData.length === 0) return { receitas: 0, despesas: 0, fluxo: 0 }

    const receitas = processedData.reduce((sum, d) => sum + (d.receitas || 0), 0)
    const despesas = processedData.reduce((sum, d) => sum + Math.abs(d.despesas || 0), 0) // Math.abs pois já vem negativo
    const fluxo = receitas - despesas

    return { receitas, despesas, fluxo }
  }, [processedData])

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

  const applyCustomDates = () => {
    if (customStartDate && customEndDate) {
      setPeriodFilter('custom')
      setShowCustomDatePopover(false)
    }
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
              <p>Nenhum dado disponível para o período selecionado</p>
              {!showEmptyDays && (
                <p className="text-sm mt-2">Tente ativar &quot;Mostrar dias sem movimentação&quot;</p>
              )}
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

    // Encontrar linha "hoje" para referência visual
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const hojeStr = hoje.toISOString().split('T')[0]
    const hojeIndex = processedData.findIndex(d => d.displayDate === hojeStr)

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
              dot={processedData.length <= 31 ? { fill: color, r: 3 } : false}
              activeDot={{ r: 5 }}
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
          angle={processedData.length > 31 ? -45 : 0}
          textAnchor={processedData.length > 31 ? 'end' : 'middle'}
          height={processedData.length > 31 ? 60 : 30}
          interval={processedData.length > 60 ? Math.floor(processedData.length / 30) : 'preserveStartEnd'}
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
        {/* Linha de referência para "Hoje" */}
        {hojeIndex >= 0 && (
          <ReferenceLine
            x={processedData[hojeIndex].formattedDate}
            stroke="hsl(217, 91%, 60%)"
            strokeDasharray="3 3"
            label={{ value: 'Hoje', position: 'top', fill: 'hsl(217, 91%, 60%)' }}
          />
        )}
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(value): React.ReactNode => {
                const item = processedData.find((d) => d.formattedDate === value)
                if (item && item.displayDate) {
                  const date = new Date(item.displayDate)
                  const label = date.toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                  })
                  return (
                    <div>
                      <div>{label}</div>
                      {item.ehProjecao && (
                        <div className="text-xs text-blue-500 font-medium">Projeção</div>
                      )}
                    </div>
                  )
                }
                return String(value ?? '')
              }}
              formatter={(value, name) => {
                const numValue = typeof value === 'number' ? value : parseFloat(value as string)
                const formattedValue = formatCurrency(numValue)
                const label = metricConfig[name as MetricKey]?.label || name

                return (
                  <div className="flex items-center justify-between gap-4 min-w-[180px]">
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
              <CardTitle>Fluxo de Caixa Projetado</CardTitle>
              <CardDescription>
                Projeção do saldo futuro com base em receitas, despesas e transações recorrentes
              </CardDescription>
            </div>
          </div>

          {/* Controls Row */}
          <div className="flex flex-wrap gap-2 items-center">
            {/* Period Filter */}
            <div className="flex flex-wrap gap-1">
              <Button
                variant={periodFilter === 'next7' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriodFilter('next7')}
                className="px-3"
              >
                14 dias
              </Button>
              <Button
                variant={periodFilter === 'next30' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriodFilter('next30')}
                className="px-3"
              >
                60 dias
              </Button>
              <Button
                variant={periodFilter === 'next60' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriodFilter('next60')}
                className="px-3"
              >
                120 dias
              </Button>
              <Button
                variant={periodFilter === 'next90' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriodFilter('next90')}
                className="px-3"
              >
                180 dias
              </Button>
              <Button
                variant={periodFilter === 'month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriodFilter('month')}
                className="px-3"
              >
                Este Mês
              </Button>

              {/* Custom Date Range */}
              <Button
                variant={periodFilter === 'custom' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowCustomDatePopover(!showCustomDatePopover)}
                className="px-3"
              >
                <CalendarDays className="h-4 w-4 mr-2" />
                Customizado
              </Button>
            </div>

            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>

            {/* Chart Type Toggle */}
            <div className="flex gap-1">
              <Button
                variant={chartType === 'area' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('area')}
                className="px-3"
              >
                Área
              </Button>
              <Button
                variant={chartType === 'line' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('line')}
                className="px-3"
              >
                Linha
              </Button>
              <Button
                variant={chartType === 'bar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('bar')}
                className="px-3"
              >
                Barra
              </Button>
            </div>

            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>

            {/* Show Empty Days Toggle */}
            <Button
              variant={showEmptyDays ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowEmptyDays(!showEmptyDays)}
              className="px-3"
            >
              {showEmptyDays ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
              Dias Vazios
            </Button>

            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>

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

          {/* Custom Date Range Inputs */}
          {showCustomDatePopover && (
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-meguispet-primary">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Período Customizado</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="grid gap-1">
                    <Label htmlFor="start-date" className="text-xs">Data Início</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="end-date" className="text-xs">Data Fim</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs opacity-0">Ação</Label>
                    <Button
                      onClick={applyCustomDates}
                      disabled={!customStartDate || !customEndDate}
                      size="sm"
                      className="h-9"
                    >
                      Aplicar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Period Summary */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-center">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Receitas do Período
              </div>
              <div className="text-lg font-bold text-green-600">
                {formatCurrency(periodTotals.receitas)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Despesas do Período
              </div>
              <div className="text-lg font-bold text-red-600">
                {formatCurrency(periodTotals.despesas)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Fluxo do Período
              </div>
              <div className={`text-lg font-bold ${periodTotals.fluxo >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {formatCurrency(periodTotals.fluxo)}
              </div>
            </div>
          </div>

          {/* Legenda de Projeção */}
          <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <div className="h-3 w-8 border-2 border-blue-500"></div>
              <span>Dados Históricos</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-8 border-2 border-blue-500 border-dashed"></div>
              <span>Projeções Futuras</span>
            </div>
          </div>
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
