import React, { useState, useEffect, useMemo } from 'react'
import { X, TrendingUp, TrendingDown, ShoppingCart, Package, AlertCircle, FileText, Settings2, MapPin } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import stockService, { type StockLocation } from '@/services/stockService'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import EstoqueAjusteDiretoModal from './EstoqueAjusteDiretoModal'

interface EstoqueHistoricoItem {
  id: number
  produto_id: number
  estoque_id: number
  quantidade_anterior: number
  quantidade_nova: number
  quantidade_mudanca: number
  tipo_operacao: string
  operacao_id: number | null
  motivo: string | null
  created_at: string
  estoque: { nome: string }
}

interface Produto {
  id: number
  nome: string
  preco_custo: number
  preco_venda: number
}

interface EstoqueHistoricoModalProps {
  produtoId: number
  produtoNome: string
  onClose: () => void
  onAjusteSuccess?: () => void
}

export default function EstoqueHistoricoModal({ produtoId, produtoNome, onClose, onAjusteSuccess }: EstoqueHistoricoModalProps) {
  const [activeTab, setActiveTab] = useState<'timeline' | 'grafico'>('timeline')
  const [loading, setLoading] = useState(true)
  const [historico, setHistorico] = useState<EstoqueHistoricoItem[]>([])
  const [produto, setProduto] = useState<Produto | null>(null)
  const [estoqueAtual, setEstoqueAtual] = useState<StockLocation[]>([])
  const [filtroLocal, setFiltroLocal] = useState<string>('todos')
  const [showAjusteModal, setShowAjusteModal] = useState(false)

  useEffect(() => {
    loadHistorico()
  }, [produtoId])

  const loadHistorico = async () => {
    setLoading(true)
    try {
      const estoqueIdNum = filtroLocal !== 'todos' ? Number(filtroLocal) : undefined
      const response = await stockService.getHistorico(produtoId, estoqueIdNum)
      if (response.success && response.data) {
        setHistorico(response.data.historico || [])
        setProduto(response.data.produto || null)
        setEstoqueAtual(response.data.estoques || [])
      }
    } catch (error) {
      console.error('Erro ao carregar histórico:', error)
    } finally {
      setLoading(false)
    }
  }

  // Extract unique locations for filter
  const locais = useMemo(() => {
    const map = new Map<number, string>()
    historico.forEach((item) => {
      if (item.estoque_id && item.estoque?.nome) {
        map.set(item.estoque_id, item.estoque.nome)
      }
    })
    return Array.from(map.entries()).map(([id, nome]) => ({ id, nome }))
  }, [historico])

  // Filter by location
  const filteredHistorico = useMemo(() => {
    if (filtroLocal === 'todos') return historico
    return historico.filter((item) => String(item.estoque_id) === filtroLocal)
  }, [historico, filtroLocal])

  // Timeline: newest first
  const timelineData = useMemo(() => {
    return [...filteredHistorico].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }, [filteredHistorico])

  // Chart data: when multiple locations, create separate series per location
  const isMultiLine = filtroLocal === 'todos' && locais.length > 1

  const chartData = useMemo(() => {
    const sorted = [...filteredHistorico].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )

    if (!isMultiLine) {
      // Single line mode
      return sorted.map((item) => ({
        name: formatDateShort(item.created_at),
        estoque: item.quantidade_nova,
        tipo: item.tipo_operacao,
        mudanca: item.quantidade_mudanca,
        fullDate: formatDate(item.created_at),
        operacao_id: item.operacao_id,
        motivo: item.motivo,
        local: item.estoque?.nome || ''
      }))
    }

    // Multi-line mode: track last known value per location
    const lastKnown: Record<string, number> = {}
    return sorted.map((item) => {
      const localName = item.estoque?.nome || `Local ${item.estoque_id}`
      lastKnown[localName] = item.quantidade_nova

      const point: Record<string, any> = {
        name: formatDateShort(item.created_at),
        tipo: item.tipo_operacao,
        mudanca: item.quantidade_mudanca,
        fullDate: formatDate(item.created_at),
        operacao_id: item.operacao_id,
        motivo: item.motivo,
        local: localName,
        _activeLocal: localName,
      }
      // Set each location's value (carry forward last known)
      for (const l of locais) {
        point[l.nome] = lastKnown[l.nome] ?? null
      }
      return point
    })
  }, [filteredHistorico, isMultiLine, locais])

  const getTipoIcon = (tipo: string) => {
    switch (tipo.toUpperCase()) {
      case 'VENDA':
        return <ShoppingCart className="h-4 w-4 text-info" />
      case 'COMPRA':
      case 'ENTRADA':
        return <TrendingUp className="h-4 w-4 text-success" />
      case 'AJUSTE':
      case 'AJUSTE_MANUAL':
        return <FileText className="h-4 w-4 text-warning" />
      case 'ESTORNO':
      case 'DEVOLUCAO':
        return <TrendingDown className="h-4 w-4 text-warning" />
      default:
        return <Package className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getTipoBadgeColor = (tipo: string) => {
    switch (tipo.toUpperCase()) {
      case 'VENDA':
        return 'bg-info-muted text-info'
      case 'COMPRA':
      case 'ENTRADA':
        return 'bg-success-muted text-success'
      case 'AJUSTE':
      case 'AJUSTE_MANUAL':
        return 'bg-warning-muted text-warning-muted-foreground'
      case 'ESTORNO':
      case 'DEVOLUCAO':
        return 'bg-warning-muted text-warning-muted-foreground'
      default:
        return 'bg-muted text-foreground'
    }
  }

  const getTipoLabel = (tipo: string) => {
    switch (tipo.toUpperCase()) {
      case 'AJUSTE_MANUAL':
        return 'AJUSTE MANUAL'
      default:
        return tipo.toUpperCase()
    }
  }

  const handleAjusteSuccess = () => {
    loadHistorico()
    onAjusteSuccess?.()
  }

  const LINE_COLORS: Record<string, string> = {}
  const PALETTE = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']
  locais.forEach((l, i) => {
    LINE_COLORS[l.nome] = PALETTE[i % PALETTE.length]
  })

  // Custom tooltip for chart with solid background
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload[0]) return null
    const data = payload[0].payload

    if (isMultiLine) {
      // Multi-line: show all locations values + which one changed
      return (
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            padding: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 9999,
            minWidth: '200px',
          }}
        >
          {locais.map((l) => {
            const val = data[l.nome]
            const isActive = data._activeLocal === l.nome
            return (
              <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: LINE_COLORS[l.nome], display: 'inline-block', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', fontWeight: isActive ? 'bold' : 'normal', color: '#111827' }}>
                  {l.nome}: {val != null ? val : '—'}
                </span>
              </div>
            )
          })}
          <div style={{ fontSize: '12px', color: data.mudanca > 0 ? '#16a34a' : '#dc2626', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #e5e7eb' }}>
            {data.mudanca > 0 ? '+' : ''}{data.mudanca} ({getTipoLabel(data.tipo)}) — {data._activeLocal}
          </div>
          {data.motivo && (
            <div style={{ fontSize: '11px', color: '#6b7280', fontStyle: 'italic', marginTop: '4px' }}>
              💬 {data.motivo}
            </div>
          )}
          <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
            {data.fullDate}
          </div>
        </div>
      )
    }

    // Single line
    return (
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #d1d5db',
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 9999,
          minWidth: '180px',
        }}
      >
        <div style={{ fontWeight: 'bold', color: '#2563eb', fontSize: '14px' }}>{data.estoque} unidades</div>
        <div style={{ fontSize: '13px', color: data.mudanca > 0 ? '#16a34a' : '#dc2626', marginTop: '4px' }}>
          {data.mudanca > 0 ? '+' : ''}{data.mudanca} ({getTipoLabel(data.tipo)})
        </div>
        {data.local && (
          <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
            📍 {data.local}
          </div>
        )}
        {data.operacao_id && (
          <div style={{ fontSize: '11px', color: '#2563eb', fontWeight: 500, marginTop: '4px' }}>
            🔗 {data.tipo === 'VENDA' ? 'Venda' : data.tipo === 'ESTORNO' ? 'Estorno de venda' : 'Operação'} #{data.operacao_id}
          </div>
        )}
        {data.motivo && (
          <div style={{ fontSize: '11px', color: '#6b7280', fontStyle: 'italic', marginTop: '4px' }}>
            💬 {data.motivo}
          </div>
        )}
        <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #e5e7eb' }}>
          {data.fullDate}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/30">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-xl">
        <CardHeader className="flex-shrink-0 border-b pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Histórico de Estoque</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">{produtoNome}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAjusteModal(true)}
                className="text-warning border-warning/30 hover:bg-warning-muted"
              >
                <Settings2 className="h-4 w-4 mr-1.5" />
                Ajustar Estoque
              </Button>
              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Tabs + Location Filter */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab('timeline')}
                className={`pb-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'timeline'
                    ? 'border-info text-info'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Timeline
              </button>
              <button
                onClick={() => setActiveTab('grafico')}
                className={`pb-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'grafico'
                    ? 'border-info text-info'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Gráfico
              </button>
            </div>

            {/* Location Filter */}
            {locais.length > 1 && (
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                <select
                  value={filtroLocal}
                  onChange={(e) => setFiltroLocal(e.target.value)}
                  className="text-sm border border-border rounded-md px-2 py-1 bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="todos">Todos os locais</option>
                  {locais.map((l) => (
                    <option key={l.id} value={String(l.id)}>
                      {l.nome}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-info"></div>
              <span className="ml-3 text-muted-foreground">Carregando histórico...</span>
            </div>
          ) : activeTab === 'timeline' ? (
            <div className="space-y-3">
              {timelineData.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Nenhum histórico encontrado para este produto</p>
                </div>
              ) : (
                timelineData.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-start gap-4 p-4 rounded-lg border ${
                      item.quantidade_mudanca > 0 ? 'bg-success-muted border-success/30' : 'bg-destructive/10 border-destructive/30'
                    }`}
                  >
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-1">
                      {getTipoIcon(item.tipo_operacao)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${getTipoBadgeColor(item.tipo_operacao)}`}>
                          {getTipoLabel(item.tipo_operacao)}
                        </span>
                        {item.estoque?.nome && (
                          <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground">
                            <MapPin className="h-3 w-3 mr-0.5" />
                            {item.estoque.nome}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">{formatDate(item.created_at)}</span>
                      </div>

                      <div className="flex items-baseline gap-2 text-sm">
                        <span className="text-muted-foreground">Estoque:</span>
                        <span className="font-medium">{item.quantidade_anterior}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="font-bold">{item.quantidade_nova}</span>
                        <span className={`font-bold ${item.quantidade_mudanca > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ({item.quantidade_mudanca > 0 ? '+' : ''}{item.quantidade_mudanca})
                        </span>
                      </div>

                      {item.motivo && (
                        <p className="text-xs text-muted-foreground mt-1">💬 {item.motivo}</p>
                      )}

                      {item.operacao_id && (
                        <p className="text-xs text-info mt-1">
                          🔗 Operação #{item.operacao_id}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            // Gráfico Tab
            <div className="space-y-6">
              {/* Summary Cards */}
              {filteredHistorico.length > 0 && !isMultiLine && (
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-4 pb-4">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Estoque Inicial</p>
                        <p className="text-xl font-bold text-foreground mt-1">
                          {chartData[0]?.estoque ?? 0}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-4 pb-4">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Estoque Atual</p>
                        <p className="text-xl font-bold text-info mt-1">
                          {estoqueAtual.reduce((sum, e) => sum + e.quantidade, 0)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-4 pb-4">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Total de Mudanças</p>
                        <p className="text-xl font-bold text-purple-600 mt-1">
                          {filteredHistorico.length}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {filteredHistorico.length > 0 && isMultiLine && (
                <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${locais.length}, 1fr)` }}>
                  {locais.map((l) => {
                    const currentStock = estoqueAtual.find((e) => e.estoque_id === l.id)
                    return (
                      <Card key={l.id}>
                        <CardContent className="pt-4 pb-4">
                          <div className="text-center">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '4px' }}>
                              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: LINE_COLORS[l.nome], display: 'inline-block' }} />
                              <p className="text-xs text-muted-foreground">{l.nome}</p>
                            </div>
                            <p className="text-xl font-bold mt-1" style={{ color: LINE_COLORS[l.nome] }}>
                              {currentStock?.quantidade ?? 0}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}

              {/* Gráfico de Evolução */}
              {chartData.length > 0 ? (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Evolução do Estoque</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="name"
                          stroke="#6b7280"
                          style={{ fontSize: '11px' }}
                          angle={-45}
                          textAnchor="end"
                          height={70}
                        />
                        <YAxis
                          stroke="#6b7280"
                          style={{ fontSize: '11px' }}
                          label={{ value: 'Qtd', angle: -90, position: 'insideLeft', style: { fontSize: '12px' } }}
                        />
                        <Tooltip
                          content={<CustomTooltip />}
                          wrapperStyle={{ zIndex: 9999, opacity: 1, visibility: 'visible', pointerEvents: 'none' }}
                          cursor={{ stroke: '#6b7280', strokeDasharray: '4 4' }}
                          allowEscapeViewBox={{ x: false, y: false }}
                        />
                        <Legend
                          wrapperStyle={{ paddingTop: '12px' }}
                          formatter={(value: string) => isMultiLine ? value : 'Quantidade em Estoque'}
                        />
                        {isMultiLine ? (
                          locais.map((l) => (
                            <Line
                              key={l.id}
                              type="monotone"
                              dataKey={l.nome}
                              name={l.nome}
                              stroke={LINE_COLORS[l.nome]}
                              strokeWidth={2}
                              dot={{ fill: LINE_COLORS[l.nome], strokeWidth: 2, r: 3 }}
                              activeDot={{ r: 6 }}
                              connectNulls
                            />
                          ))
                        ) : (
                          <Line
                            type="monotone"
                            dataKey="estoque"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
                            activeDot={{ r: 6 }}
                          />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center py-12">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Nenhum dado disponível para gerar o gráfico</p>
                </div>
              )}
            </div>
          )}
        </CardContent>

        <div className="flex-shrink-0 border-t p-3 bg-muted">
          <div className="flex justify-end">
            <Button onClick={onClose} variant="outline" size="sm">
              Fechar
            </Button>
          </div>
        </div>
      </Card>

      {/* Ajuste Direto Modal */}
      {showAjusteModal && (
        <EstoqueAjusteDiretoModal
          produtoId={produtoId}
          produtoNome={produtoNome}
          onClose={() => setShowAjusteModal(false)}
          onSuccess={handleAjusteSuccess}
        />
      )}
    </div>
  )
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatDateShort(dateString: string) {
  return new Date(dateString).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
