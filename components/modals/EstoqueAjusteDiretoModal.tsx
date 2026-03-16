import React, { useState, useEffect } from 'react'
import { X, Plus, Minus, Hash, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { estoquesService } from '@/services/api'
import stockService, { type StockLocation } from '@/services/stockService'
import type { Estoque } from '@/types'

interface EstoqueAjusteDiretoModalProps {
  produtoId: number
  produtoNome: string
  onClose: () => void
  onSuccess: () => void
}

export default function EstoqueAjusteDiretoModal({
  produtoId,
  produtoNome,
  onClose,
  onSuccess,
}: EstoqueAjusteDiretoModalProps) {
  const [estoques, setEstoques] = useState<Estoque[]>([])
  const [produtoEstoques, setProdutoEstoques] = useState<StockLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const [estoqueId, setEstoqueId] = useState<number | ''>('')
  const [tipoAjuste, setTipoAjuste] = useState<'adicionar' | 'remover' | 'definir'>('definir')
  const [quantidade, setQuantidade] = useState<string>('')
  const [motivo, setMotivo] = useState('')

  useEffect(() => {
    loadData()
  }, [produtoId])

  const loadData = async () => {
    setLoading(true)
    try {
      const [estoquesRes, stockRes] = await Promise.all([
        estoquesService.getAll(true),
        stockService.getEstoque(produtoId),
      ])

      if (estoquesRes.success && estoquesRes.data) {
        setEstoques(estoquesRes.data)
      }

      if (stockRes.success && stockRes.data) {
        setProdutoEstoques(stockRes.data.estoques || [])

        // Auto-select first stock location if only one
        if (stockRes.data.estoques.length === 1) {
          setEstoqueId(stockRes.data.estoques[0].estoque_id)
        }
      }
    } catch {
      setError('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const getEstoqueAtual = (): number | null => {
    if (!estoqueId) return null
    const found = produtoEstoques.find((pe) => Number(pe.estoque_id) === Number(estoqueId))
    return found ? found.quantidade : 0
  }

  const getEstoqueNovo = (): number | null => {
    const atual = getEstoqueAtual()
    if (atual === null || quantidade === '') return null
    const qty = Number(quantidade)
    if (isNaN(qty)) return null

    switch (tipoAjuste) {
      case 'adicionar':
        return atual + qty
      case 'remover':
        return atual - qty
      case 'definir':
        return qty
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)

    if (!estoqueId) {
      setError('Selecione a localização do estoque')
      return
    }

    const qty = Number(quantidade)
    if (isNaN(qty) || qty < 0) {
      setError('Quantidade inválida')
      return
    }

    if (!motivo.trim()) {
      setError('Motivo/justificativa é obrigatório')
      return
    }

    setSubmitting(true)
    try {
      const response = await stockService.ajustarEstoque({
        produto_id: produtoId,
        estoque_id: Number(estoqueId),
        tipo_ajuste: tipoAjuste,
        quantidade: qty,
        motivo: motivo.trim(),
      })

      if (response.success) {
        setSuccessMsg(response.message || 'Estoque ajustado com sucesso!')
        // Reset form and notify parent after brief delay
        setTimeout(() => {
          onSuccess()
          onClose()
        }, 1500)
      } else {
        setError(response.message || 'Erro ao ajustar estoque')
      }
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { message?: string } }; message?: string }
      setError(errObj.response?.data?.message || errObj.message || 'Erro ao processar ajuste')
    } finally {
      setSubmitting(false)
    }
  }

  const estoqueAtual = getEstoqueAtual()
  const estoqueNovo = getEstoqueNovo()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/30">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Ajuste Direto de Estoque</CardTitle>
              <p className="text-sm text-gray-600 mt-1">{produtoNome}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Stock location breakdown */}
              {produtoEstoques.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-500 mb-2">Estoque atual por localização:</p>
                  <div className="flex flex-wrap gap-2">
                    {produtoEstoques.map((pe) => (
                      <span
                        key={pe.estoque_id}
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          pe.quantidade <= 0
                            ? 'bg-red-100 text-red-800'
                            : pe.quantidade <= 5
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {pe.nome}: {pe.quantidade}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Stock location select */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Localização do Estoque *
                </label>
                <select
                  value={estoqueId}
                  onChange={(e) => setEstoqueId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Selecione a localização...</option>
                  {estoques.map((est) => {
                    const prodEst = produtoEstoques.find(
                      (pe) => Number(pe.estoque_id) === est.id
                    )
                    return (
                      <option key={est.id} value={est.id}>
                        {est.nome} (atual: {prodEst?.quantidade ?? 0})
                      </option>
                    )
                  })}
                </select>
              </div>

              {/* Adjustment type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Ajuste *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTipoAjuste('adicionar')}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      tipoAjuste === 'adicionar'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoAjuste('remover')}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      tipoAjuste === 'remover'
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Minus className="h-4 w-4" />
                    Remover
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoAjuste('definir')}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      tipoAjuste === 'definir'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Hash className="h-4 w-4" />
                    Definir
                  </button>
                </div>
              </div>

              {/* Quantity input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {tipoAjuste === 'adicionar'
                    ? 'Quantidade a adicionar *'
                    : tipoAjuste === 'remover'
                    ? 'Quantidade a remover *'
                    : 'Novo valor do estoque *'}
                </label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                  placeholder={
                    tipoAjuste === 'definir'
                      ? 'Ex: 50 (novo total do estoque)'
                      : 'Ex: 10'
                  }
                  required
                />
              </div>

              {/* Preview */}
              {estoqueId && estoqueAtual !== null && estoqueNovo !== null && (
                <div
                  className={`rounded-lg p-3 border ${
                    estoqueNovo < 0
                      ? 'bg-red-50 border-red-200'
                      : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Estoque atual:</span>
                    <span className="font-semibold">{estoqueAtual}</span>
                  </div>
                  <div className="flex items-center justify-center my-1">
                    <span className="text-gray-400">↓</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Novo estoque:</span>
                    <span
                      className={`font-bold text-lg ${
                        estoqueNovo < 0 ? 'text-red-600' : 'text-blue-600'
                      }`}
                    >
                      {estoqueNovo}
                    </span>
                  </div>
                  {estoqueNovo < 0 && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-red-600">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Estoque ficará negativo
                    </div>
                  )}
                </div>
              )}

              {/* Reason/justification */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivo / Justificativa *
                </label>
                <textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ex: Ajuste após contagem física, correção de venda externa..."
                  rows={2}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  required
                />
              </div>

              {/* Error/success messages */}
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}
              {successMsg && (
                <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">
                  {successMsg}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={submitting || !estoqueId || quantidade === '' || !motivo.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {submitting ? 'Ajustando...' : 'Confirmar Ajuste'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
