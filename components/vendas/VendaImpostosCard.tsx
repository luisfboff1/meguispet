// ============================================================================
// VENDA IMPOSTOS CARD COMPONENT
// ============================================================================
// Modular component for optional ICMS-ST calculation in sales
// ============================================================================

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { FileText, Calculator, AlertCircle, Info, Loader2 } from 'lucide-react'
import { formatCurrency, formatPercentage, calcularICMSSTVendaCompleta } from '@/lib/icms-calculator'
import { impostosService } from '@/services/impostosService'
import type { ImpostoProduto, CalculoImpostoInput } from '@/types'

export interface VendaItem {
  produto_id: number
  produto_nome: string
  quantidade: number
  preco_unitario: number
  subtotal: number
}

export interface VendaImpostosResult {
  enabled: boolean
  total_base_calculo_st: number
  total_icms_proprio: number
  total_icms_st_total: number
  total_icms_st_recolher: number
  itens: Array<{
    produto_id: number
    base_calculo_st: number
    icms_proprio: number
    icms_st_total: number
    icms_st_recolher: number
    mva_aplicado: number
    aliquota_icms: number
  }>
}

export interface VendaImpostosCardProps {
  itens: VendaItem[]
  enabled?: boolean
  onChange: (result: VendaImpostosResult | null) => void
  className?: string
}

export default function VendaImpostosCard({
  itens,
  enabled = false,
  onChange,
  className = ''
}: VendaImpostosCardProps) {
  const [impostoEnabled, setImpostoEnabled] = useState(enabled)
  const [loading, setLoading] = useState(false)
  const [configsFiscais, setConfigsFiscais] = useState<Map<number, ImpostoProduto>>(new Map())
  const [result, setResult] = useState<VendaImpostosResult | null>(null)
  const [produtosSemConfig, setProdutosSemConfig] = useState<string[]>([])
  const isCalculatingRef = useRef(false)
  const onChangeRef = useRef(onChange)

  // Update onChange ref when it changes
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  // Create stable dependency key based on items content (not reference)
  const itensKey = useMemo(() => {
    if (itens.length === 0) return ''
    return itens.map(item =>
      `${item.produto_id}-${item.quantidade}-${item.preco_unitario}`
    ).join('|')
  }, [itens])

  const handleToggle = (checked: boolean) => {
    setImpostoEnabled(checked)
  }

  useEffect(() => {
    if (!impostoEnabled || itens.length === 0) {
      setResult(null)
      onChangeRef.current(null)
      return
    }

    // Prevent duplicate calls while already calculating
    if (isCalculatingRef.current) {
      return
    }

    const calcularImpostos = async () => {
      isCalculatingRef.current = true
      setLoading(true)
      setProdutosSemConfig([])

      try {
        // Buscar configurações fiscais de todos os produtos
        const configs = new Map<number, ImpostoProduto>()
        const semConfig: string[] = []

        for (const item of itens) {
          const config = await impostosService.getByProdutoId(item.produto_id)
          if (config) {
            configs.set(item.produto_id, config)
          } else {
            semConfig.push(item.produto_nome)
          }
        }

        setConfigsFiscais(configs)
        setProdutosSemConfig(semConfig)

        // Preparar itens para cálculo
        const itensParaCalculo = itens.map(item => {
          const config = configs.get(item.produto_id)
          const freteUnitario = (config?.frete_padrao || 0) / item.quantidade
          const despesasUnitario = (config?.outras_despesas || 0) / item.quantidade

          return {
            valor: item.preco_unitario,
            quantidade: item.quantidade,
            frete_unitario: freteUnitario,
            outras_despesas_unitario: despesasUnitario,
            mva: config?.mva_manual ?? config?.tabela_mva?.mva ?? 0,
            aliquota_icms: config?.aliquota_icms_manual ??
                          config?.tabela_mva?.aliquota_efetiva ??
                          config?.tabela_mva?.aliquota_interna ??
                          0.18
          }
        })

        // Calcular impostos
        const calculado = calcularICMSSTVendaCompleta(itensParaCalculo)

        // Montar resultado com IDs dos produtos
        const impostoResult: VendaImpostosResult = {
          enabled: true,
          total_base_calculo_st: calculado.total_base_calculo_st,
          total_icms_proprio: calculado.total_icms_proprio,
          total_icms_st_total: calculado.total_icms_st,
          total_icms_st_recolher: calculado.total_icms_recolher,
          itens: calculado.itens_calculados.map((calc, index) => ({
            produto_id: itens[index].produto_id,
            base_calculo_st: calc.base_calculo_st,
            icms_proprio: calc.icms_proprio,
            icms_st_total: calc.icms_st_total,
            icms_st_recolher: calc.icms_st_recolher,
            mva_aplicado: calc.mva_aplicado,
            aliquota_icms: calc.aliquota_icms
          }))
        }

        setResult(impostoResult)
        onChangeRef.current(impostoResult)
      } catch (error) {
        console.error('[VendaImpostosCard] Error calculating impostos:', error)
        setResult(null)
        onChangeRef.current(null)
      } finally {
        setLoading(false)
        isCalculatingRef.current = false
      }
    }

    void calcularImpostos()
  }, [impostoEnabled, itensKey])

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            Impostos (ICMS-ST)
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Switch
              id="imposto-toggle"
              checked={impostoEnabled}
              onCheckedChange={handleToggle}
              disabled={itens.length === 0}
            />
            <Label htmlFor="imposto-toggle" className="cursor-pointer">
              {impostoEnabled ? 'Ativado' : 'Desativado'}
            </Label>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {!impostoEnabled ? (
          <div className="text-center py-6 text-gray-500">
            <Calculator className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p className="font-medium">Cálculo de impostos desativado</p>
            <p className="text-sm mt-1">
              Ative o switch acima para incluir ICMS-ST nesta venda
            </p>
          </div>
        ) : itens.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p className="font-medium">Adicione itens à venda</p>
            <p className="text-sm mt-1">
              Os impostos serão calculados automaticamente
            </p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Calculando impostos...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Avisos de produtos sem configuração */}
            {produtosSemConfig.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-800">
                      Produtos sem configuração fiscal
                    </p>
                    <p className="text-xs text-yellow-700 mt-1">
                      Os seguintes produtos não possuem configuração fiscal cadastrada.
                      Será usado MVA = 0% e Alíquota ICMS = 18%:
                    </p>
                    <ul className="list-disc list-inside text-xs text-yellow-700 mt-2">
                      {produtosSemConfig.map((nome, idx) => (
                        <li key={idx}>{nome}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Resumo dos impostos */}
            {result && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs font-medium text-blue-600 uppercase">Base de Cálculo ST</p>
                    <p className="text-lg font-bold text-blue-700 mt-1">
                      {formatCurrency(result.total_base_calculo_st)}
                    </p>
                  </div>

                  <div className="bg-purple-50 rounded-lg p-3">
                    <p className="text-xs font-medium text-purple-600 uppercase">ICMS Próprio</p>
                    <p className="text-lg font-bold text-purple-700 mt-1">
                      {formatCurrency(result.total_icms_proprio)}
                    </p>
                  </div>

                  <div className="bg-orange-50 rounded-lg p-3">
                    <p className="text-xs font-medium text-orange-600 uppercase">ICMS-ST Total</p>
                    <p className="text-lg font-bold text-orange-700 mt-1">
                      {formatCurrency(result.total_icms_st_total)}
                    </p>
                  </div>

                  <div className="bg-green-50 rounded-lg p-3 border-2 border-green-200">
                    <p className="text-xs font-medium text-green-600 uppercase">ICMS-ST a Recolher</p>
                    <p className="text-xl font-bold text-green-700 mt-1">
                      {formatCurrency(result.total_icms_st_recolher)}
                    </p>
                  </div>
                </div>

                {/* Info box */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-blue-900">
                        <strong>Estes valores serão salvos separadamente.</strong> O total da venda
                        não inclui os impostos - eles são apenas para controle fiscal.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
