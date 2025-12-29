import React, { useState, useEffect, useMemo } from 'react'
import { X, TrendingUp, TrendingDown, ShoppingCart, Package, AlertCircle, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { estoqueHistoricoService } from '@/services/api'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

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
}

export default function EstoqueHistoricoModal({ produtoId, produtoNome, onClose }: EstoqueHistoricoModalProps) {
  const [activeTab, setActiveTab] = useState<'timeline' | 'grafico'>('timeline')
  const [loading, setLoading] = useState(true)
  const [historico, setHistorico] = useState<EstoqueHistoricoItem[]>([])
  const [produto, setProduto] = useState<Produto | null>(null)

  useEffect(() => {
    loadHistorico()
  }, [produtoId])

  const loadHistorico = async () => {
    setLoading(true)
    try {
      const response = await estoqueHistoricoService.getByProdutoId(produtoId)
      if (response.success && response.data) {
        // Não agrupar duplicatas - mostrar tudo para manter a sequência anterior→nova correta
        setHistorico(response.data.historico || [])
        setProduto(response.data.produto || null)
      }
    } catch (error) {
      console.error('Erro ao carregar histórico:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTipoIcon = (tipo: string) => {
    switch (tipo.toUpperCase()) {
      case 'VENDA':
        return <ShoppingCart className="h-4 w-4 text-blue-600" />
      case 'COMPRA':
      case 'ENTRADA':
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'AJUSTE':
        return <FileText className="h-4 w-4 text-yellow-600" />
      case 'ESTORNO':
      case 'DEVOLUCAO':
        return <TrendingDown className="h-4 w-4 text-orange-600" />
      default:
        return <Package className="h-4 w-4 text-gray-600" />
    }
  }

  const getTipoBadgeColor = (tipo: string) => {
    switch (tipo.toUpperCase()) {
      case 'VENDA':
        return 'bg-blue-100 text-blue-800'
      case 'COMPRA':
      case 'ENTRADA':
        return 'bg-green-100 text-green-800'
      case 'AJUSTE':
        return 'bg-yellow-100 text-yellow-800'
      case 'ESTORNO':
      case 'DEVOLUCAO':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDateShort = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Preparar dados para o gráfico
  const chartData = useMemo(() => {
    return historico.map((item, index) => ({
      name: formatDateShort(item.created_at),
      estoque: item.quantidade_nova,
      tipo: item.tipo_operacao,
      mudanca: item.quantidade_mudanca,
      fullDate: formatDate(item.created_at),
      operacao_id: item.operacao_id,
      motivo: item.motivo
    }))
  }, [historico])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/30">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-xl">
        <CardHeader className="flex-shrink-0 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Histórico de Estoque</CardTitle>
              <p className="text-sm text-gray-600 mt-1">{produtoNome}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mt-4">
            <button
              onClick={() => setActiveTab('timeline')}
              className={`pb-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'timeline'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Timeline
            </button>
            <button
              onClick={() => setActiveTab('grafico')}
              className={`pb-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'grafico'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Gráfico
            </button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Carregando histórico...</span>
            </div>
          ) : activeTab === 'timeline' ? (
            <div className="space-y-3">
              {historico.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">Nenhum histórico encontrado para este produto</p>
                </div>
              ) : (
                historico.map((item, index) => (
                  <div
                    key={item.id}
                    className={`flex items-start gap-4 p-4 rounded-lg border ${
                      item.quantidade_mudanca > 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                    }`}
                  >
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-1">
                      {getTipoIcon(item.tipo_operacao)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTipoBadgeColor(item.tipo_operacao)}`}>
                          {item.tipo_operacao}
                        </span>
                        <span className="text-xs text-gray-500">{formatDate(item.created_at)}</span>
                      </div>

                      <div className="flex items-baseline gap-2 text-sm">
                        <span className="text-gray-600">Estoque:</span>
                        <span className="font-medium">{item.quantidade_anterior}</span>
                        <span className="text-gray-400">→</span>
                        <span className="font-bold">{item.quantidade_nova}</span>
                        <span className={`font-bold ${item.quantidade_mudanca > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ({item.quantidade_mudanca > 0 ? '+' : ''}{item.quantidade_mudanca})
                        </span>
                      </div>

                      {item.motivo && (
                        <p className="text-xs text-gray-600 mt-1">💬 {item.motivo}</p>
                      )}

                      {item.operacao_id && (
                        <p className="text-xs text-blue-600 mt-1">
                          🔗 Operação #{item.operacao_id}
                        </p>
                      )}
                    </div>

                    {/* Timeline indicator */}
                    {index < historico.length - 1 && (
                      <div className="absolute left-[38px] top-[60px] w-0.5 h-[calc(100%-24px)] bg-gray-300"></div>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : (
            // Gráfico Tab
            <div className="space-y-6">
              {/* Summary Cards */}
              {historico.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Estoque Inicial</p>
                        <p className="text-2xl font-bold text-gray-900 mt-2">
                          {historico[0]?.quantidade_anterior || 0}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Estoque Atual</p>
                        <p className="text-2xl font-bold text-blue-600 mt-2">
                          {historico[historico.length - 1]?.quantidade_nova || 0}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Total de Mudanças</p>
                        <p className="text-2xl font-bold text-purple-600 mt-2">
                          {historico.length}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Gráfico de Evolução */}
              {historico.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Evolução do Estoque</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="name"
                          stroke="#6b7280"
                          style={{ fontSize: '12px' }}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis
                          stroke="#6b7280"
                          style={{ fontSize: '12px' }}
                          label={{ value: 'Quantidade', angle: -90, position: 'insideLeft' }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#fff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            padding: '12px'
                          }}
                          formatter={(value: any, name: string, props: any) => {
                            if (name === 'estoque') {
                              const mudanca = props.payload.mudanca
                              const tipo = props.payload.tipo
                              const operacao_id = props.payload.operacao_id
                              const motivo = props.payload.motivo
                              return [
                                <div key="tooltip" className="space-y-1">
                                  <div className="font-bold text-blue-600">{value} unidades</div>
                                  <div className={`text-sm ${mudanca > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {mudanca > 0 ? '+' : ''}{mudanca} ({tipo})
                                  </div>
                                  {operacao_id && (
                                    <div className="text-xs text-blue-600 font-medium">
                                      🔗 {tipo === 'VENDA' ? 'Venda' : tipo === 'ESTORNO' ? 'Estorno de venda' : 'Operação'} #{operacao_id}
                                    </div>
                                  )}
                                  {motivo && (
                                    <div className="text-xs text-gray-600 italic">
                                      💬 {motivo}
                                    </div>
                                  )}
                                  <div className="text-xs text-gray-500 pt-1 border-t">{props.payload.fullDate}</div>
                                </div>,
                                ''
                              ]
                            }
                            return [value, name]
                          }}
                          labelFormatter={(label) => ''}
                        />
                        <Legend
                          wrapperStyle={{ paddingTop: '20px' }}
                          formatter={() => 'Quantidade em Estoque'}
                        />
                        <Line
                          type="monotone"
                          dataKey="estoque"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center py-12">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">Nenhum dado disponível para gerar o gráfico</p>
                </div>
              )}
            </div>
          )}
        </CardContent>

        <div className="flex-shrink-0 border-t p-4 bg-gray-50">
          <div className="flex justify-end">
            <Button onClick={onClose} variant="outline">
              Fechar
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
