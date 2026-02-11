import React, { useState, useCallback, useRef, useMemo } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import * as XLSX from 'xlsx'
import { Copy, Check, Download, MoreHorizontal, Maximize2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Color palette for charts
const CHART_COLORS = [
  '#f59e0b', // amber-500
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#f97316', // orange-500
]

interface ChartDataPoint {
  [key: string]: string | number
}

interface ChartFilter {
  type: 'select' | 'multiselect'
  label: string
  options: Array<{ value: string; label: string }>
  default?: string | string[]
}

export interface ChartSpec {
  type: 'bar' | 'line' | 'pie' | 'area'
  title: string
  data: ChartDataPoint[]
  datasets?: Record<string, Record<string, ChartDataPoint[]>> // Multi-filter datasets: { filterKey: { filterValue: data[] } }
  xAxis?: string
  yAxis?: string | string[] // Can be multiple metrics
  filters?: Record<string, ChartFilter>
  colors?: string[]
  allowExport?: boolean
  allowFullscreen?: boolean
}

interface ChartRendererProps {
  spec: ChartSpec
}

export function ChartRenderer({ spec }: ChartRendererProps) {
  const chartRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [filters, setFilters] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    if (spec.filters) {
      Object.entries(spec.filters).forEach(([key, filter]) => {
        initial[key] = (filter.default || filter.options[0]?.value) as string
      })
    }
    return initial
  })

  const colors = spec.colors || CHART_COLORS

  // Get data based on current filter values
  const filteredData = useMemo(() => {
    if (!spec.datasets || Object.keys(filters).length === 0) {
      return spec.data
    }

    // Try to find matching dataset for current filter combination
    // For now, support single filter (most common case)
    const firstFilterKey = Object.keys(filters)[0]
    const firstFilterValue = filters[firstFilterKey]

    if (spec.datasets[firstFilterKey]?.[firstFilterValue]) {
      return spec.datasets[firstFilterKey][firstFilterValue]
    }

    // Fallback to default data
    return spec.data
  }, [filters, spec.data, spec.datasets])

  const handleCopyData = useCallback(() => {
    const tsv = [
      // Header
      Object.keys(filteredData[0] || {}).join('\t'),
      // Rows
      ...filteredData.map((row) => Object.values(row).join('\t')),
    ].join('\n')
    navigator.clipboard.writeText(tsv)
    setCopied(true)
    setMenuOpen(false)
    setTimeout(() => setCopied(false), 2000)
  }, [filteredData])

  const handleExportExcel = useCallback(() => {
    const ws = XLSX.utils.json_to_sheet(filteredData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Dados')
    XLSX.writeFile(wb, `${spec.title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.xlsx`)
    setMenuOpen(false)
  }, [filteredData, spec.title])

  const handleExportPNG = useCallback(async () => {
    if (!chartRef.current) return
    try {
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: document.documentElement.classList.contains('dark') ? '#1e293b' : '#ffffff',
      })
      const url = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.download = `${spec.title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.png`
      link.href = url
      link.click()
      setMenuOpen(false)
    } catch (error) {
      console.error('Failed to export PNG:', error)
    }
  }, [spec.title])

  const renderChart = () => {
    const commonProps = {
      data: filteredData,
      margin: { top: 10, right: 30, left: 0, bottom: 0 },
    }

    switch (spec.type) {
      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
            <XAxis
              dataKey={spec.xAxis}
              className="text-xs text-slate-600 dark:text-slate-400"
              tick={{ fill: 'currentColor' }}
            />
            <YAxis
              className="text-xs text-slate-600 dark:text-slate-400"
              tick={{ fill: 'currentColor' }}
            />
            <Tooltip
              wrapperStyle={{
                zIndex: 1000,
              }}
              contentStyle={{
                backgroundColor: 'var(--tooltip-bg)',
                border: '1px solid var(--tooltip-border)',
                borderRadius: '0.5rem',
                fontSize: '0.75rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              }}
            />
            <Legend
              wrapperStyle={{
                fontSize: '0.75rem',
                paddingTop: '12px',
              }}
              iconType="circle"
              iconSize={8}
            />
            {Array.isArray(spec.yAxis) ? (
              spec.yAxis.map((key, idx) => (
                <Bar key={key} dataKey={key} fill={colors[idx % colors.length]} />
              ))
            ) : (
              <Bar dataKey={spec.yAxis} fill={colors[0]} />
            )}
          </BarChart>
        )

      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
            <XAxis
              dataKey={spec.xAxis}
              className="text-xs text-slate-600 dark:text-slate-400"
              tick={{ fill: 'currentColor' }}
            />
            <YAxis
              className="text-xs text-slate-600 dark:text-slate-400"
              tick={{ fill: 'currentColor' }}
            />
            <Tooltip
              wrapperStyle={{
                zIndex: 1000,
              }}
              contentStyle={{
                backgroundColor: 'var(--tooltip-bg)',
                border: '1px solid var(--tooltip-border)',
                borderRadius: '0.5rem',
                fontSize: '0.75rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              }}
            />
            <Legend
              wrapperStyle={{
                fontSize: '0.75rem',
                paddingTop: '12px',
              }}
              iconType="circle"
              iconSize={8}
            />
            {Array.isArray(spec.yAxis) ? (
              spec.yAxis.map((key, idx) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={colors[idx % colors.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ))
            ) : (
              <Line
                type="monotone"
                dataKey={spec.yAxis}
                stroke={colors[0]}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            )}
          </LineChart>
        )

      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
            <XAxis
              dataKey={spec.xAxis}
              className="text-xs text-slate-600 dark:text-slate-400"
              tick={{ fill: 'currentColor' }}
            />
            <YAxis
              className="text-xs text-slate-600 dark:text-slate-400"
              tick={{ fill: 'currentColor' }}
            />
            <Tooltip
              wrapperStyle={{
                zIndex: 1000,
              }}
              contentStyle={{
                backgroundColor: 'var(--tooltip-bg)',
                border: '1px solid var(--tooltip-border)',
                borderRadius: '0.5rem',
                fontSize: '0.75rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              }}
            />
            <Legend
              wrapperStyle={{
                fontSize: '0.75rem',
                paddingTop: '12px',
              }}
              iconType="circle"
              iconSize={8}
            />
            {Array.isArray(spec.yAxis) ? (
              spec.yAxis.map((key, idx) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={colors[idx % colors.length]}
                  fill={colors[idx % colors.length]}
                  fillOpacity={0.6}
                />
              ))
            ) : (
              <Area
                type="monotone"
                dataKey={spec.yAxis || 'value'}
                stroke={colors[0]}
                fill={colors[0]}
                fillOpacity={0.6}
              />
            )}
          </AreaChart>
        )

      case 'pie':
        const pieData = filteredData.map((item, index) => ({
          name: item[spec.xAxis || 'name'] as string,
          value: item[spec.yAxis as string || 'value'] as number,
          fill: colors[index % colors.length],
        }))
        return (
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={(entry: any) => `${entry.name}: ${(entry.percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              wrapperStyle={{
                zIndex: 1000,
              }}
              contentStyle={{
                backgroundColor: 'var(--tooltip-bg)',
                border: '1px solid var(--tooltip-border)',
                borderRadius: '0.5rem',
                fontSize: '0.75rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              }}
            />
            <Legend
              wrapperStyle={{
                fontSize: '0.75rem',
                paddingTop: '12px',
              }}
              iconType="circle"
              iconSize={8}
            />
          </PieChart>
        )

      default:
        return <div className="text-xs text-slate-500">Tipo de gráfico não suportado</div>
    }
  }

  return (
    <div
      ref={chartRef}
      className={cn(
        'group/chart relative my-3 rounded-lg border border-slate-300 bg-white p-4 dark:border-slate-600 dark:bg-slate-800',
        fullscreen && 'fixed inset-4 z-50 flex flex-col'
      )}
    >
      {/* Header with title and actions */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {spec.title}
          </h3>
          {spec.filters && Object.keys(spec.filters).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(spec.filters).map(([key, filter]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <label className="text-xs text-slate-500 dark:text-slate-400">
                    {filter.label}:
                  </label>
                  <Select
                    value={filters[key]}
                    onValueChange={(value) => setFilters((prev) => ({ ...prev, [key]: value }))}
                  >
                    <SelectTrigger className="h-7 w-auto min-w-[120px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {filter.options.map((option) => (
                        <SelectItem key={option.value} value={option.value} className="text-xs">
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover/chart:opacity-100">
          <button
            onClick={handleCopyData}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
            title="Copiar dados"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
          {spec.allowFullscreen !== false && (
            <button
              onClick={() => setFullscreen(!fullscreen)}
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
              title={fullscreen ? 'Sair tela cheia' : 'Tela cheia'}
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          )}
          {spec.allowExport !== false && (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                title="Mais opções"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-full z-30 mt-1 w-40 rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                    <button
                      onClick={handleCopyData}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      <Copy className="h-3 w-3" />
                      Copiar dados
                    </button>
                    <button
                      onClick={handleExportExcel}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      <Download className="h-3 w-3" />
                      Exportar Excel
                    </button>
                    <button
                      onClick={handleExportPNG}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      <Download className="h-3 w-3" />
                      Exportar PNG
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className={cn('w-full', fullscreen ? 'flex-1' : 'h-[300px]')}>
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>

      {/* Data summary */}
      <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
        <span>{filteredData.length} pontos de dados</span>
        <span className="text-[10px]">Hover para interagir • Click na legenda para toggle</span>
      </div>
    </div>
  )
}
