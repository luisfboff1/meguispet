// ============================================================================
// CALCULADORA ICMS COMPONENT
// ============================================================================
// Interactive visual calculator for ICMS-ST tax calculations
// ============================================================================

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { calcularICMSST, formatCurrency, formatPercentage } from '@/lib/icms-calculator'
import type { CalculoImpostoInput, CalculoImpostoResult } from '@/types'
import { Calculator, ArrowRight, Info } from 'lucide-react'

export interface CalculadoraICMSProps {
  initialValues?: Partial<CalculoImpostoInput>
  onCalculate?: (result: CalculoImpostoResult) => void
}

export default function CalculadoraICMS({
  initialValues = {},
  onCalculate
}: CalculadoraICMSProps) {
  const [input, setInput] = useState<CalculoImpostoInput>({
    valor_mercadoria: initialValues.valor_mercadoria || 1000,
    frete: initialValues.frete || 0,
    outras_despesas: initialValues.outras_despesas || 0,
    mva: initialValues.mva || 0.40, // 40%
    aliquota_icms: initialValues.aliquota_icms || 0.18 // 18%
  })

  const [result, setResult] = useState<CalculoImpostoResult | null>(null)

  const handleCalculate = () => {
    const calculado = calcularICMSST(input)
    setResult(calculado)
    onCalculate?.(calculado)
  }

  // Auto-calculate on mount and when inputs change
  useEffect(() => {
    handleCalculate()
  }, [input])

  const updateValue = (field: keyof CalculoImpostoInput, value: number) => {
    setInput(prev => ({ ...prev, [field]: value }))
  }

  const valorBase = input.valor_mercadoria + input.frete + input.outras_despesas

  return (
    <div className="space-y-4">
      {/* Input Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Calculadora ICMS-ST
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Valor Mercadoria */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Valor da Mercadoria
            </label>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">R$</span>
              <input
                type="number"
                value={input.valor_mercadoria}
                onChange={(e) => updateValue('valor_mercadoria', parseFloat(e.target.value) || 0)}
                step="0.01"
                min="0"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Frete */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Frete
            </label>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">R$</span>
              <input
                type="number"
                value={input.frete}
                onChange={(e) => updateValue('frete', parseFloat(e.target.value) || 0)}
                step="0.01"
                min="0"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Outras Despesas */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Outras Despesas
            </label>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">R$</span>
              <input
                type="number"
                value={input.outras_despesas}
                onChange={(e) => updateValue('outras_despesas', parseFloat(e.target.value) || 0)}
                step="0.01"
                min="0"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* MVA */}
          <div>
            <label className="block text-sm font-medium mb-2">
              MVA (Margem de Valor Agregado)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={(input.mva * 100).toFixed(2)}
                onChange={(e) => updateValue('mva', parseFloat(e.target.value) / 100 || 0)}
                step="0.01"
                min="0"
                max="1000"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-500">%</span>
            </div>
          </div>

          {/* Alíquota ICMS */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Alíquota ICMS
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={(input.aliquota_icms * 100).toFixed(2)}
                onChange={(e) => updateValue('aliquota_icms', parseFloat(e.target.value) / 100 || 0)}
                step="0.01"
                min="0"
                max="100"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-500">%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calculation Steps */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Passos do Cálculo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Step 1: Valor Base */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div>
                <p className="text-sm font-medium">1. Valor Base</p>
                <p className="text-xs text-gray-500">Mercadoria + Frete + Despesas</p>
              </div>
              <p className="font-mono font-semibold">{formatCurrency(valorBase)}</p>
            </div>

            {/* Arrow */}
            <div className="flex justify-center">
              <ArrowRight className="h-5 w-5 text-gray-400" />
            </div>

            {/* Step 2: Base Cálculo ST */}
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded">
              <div>
                <p className="text-sm font-medium">2. Base de Cálculo ST</p>
                <p className="text-xs text-gray-500">
                  Valor Base × (1 + MVA de {formatPercentage(input.mva)})
                </p>
              </div>
              <p className="font-mono font-semibold text-blue-600">
                {formatCurrency(result.base_calculo_st)}
              </p>
            </div>

            {/* Arrow */}
            <div className="flex justify-center">
              <ArrowRight className="h-5 w-5 text-gray-400" />
            </div>

            {/* Step 3: ICMS Próprio */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div>
                <p className="text-sm font-medium">3. ICMS Próprio</p>
                <p className="text-xs text-gray-500">
                  Valor Base × {formatPercentage(input.aliquota_icms)}
                </p>
              </div>
              <p className="font-mono font-semibold">
                {formatCurrency(result.icms_proprio)}
              </p>
            </div>

            {/* Arrow */}
            <div className="flex justify-center">
              <ArrowRight className="h-5 w-5 text-gray-400" />
            </div>

            {/* Step 4: ICMS-ST Total */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div>
                <p className="text-sm font-medium">4. ICMS-ST Total</p>
                <p className="text-xs text-gray-500">
                  Base ST × {formatPercentage(input.aliquota_icms)}
                </p>
              </div>
              <p className="font-mono font-semibold">
                {formatCurrency(result.icms_st_total)}
              </p>
            </div>

            {/* Arrow */}
            <div className="flex justify-center">
              <ArrowRight className="h-5 w-5 text-gray-400" />
            </div>

            {/* Final Result: ICMS-ST a Recolher */}
            <div className="flex items-center justify-between p-4 bg-green-50 border-2 border-green-200 rounded-lg">
              <div>
                <p className="text-base font-semibold text-green-800">ICMS-ST a Recolher</p>
                <p className="text-sm text-green-600">
                  ICMS-ST Total - ICMS Próprio
                </p>
              </div>
              <p className="text-2xl font-bold text-green-700">
                {formatCurrency(result.icms_st_recolher)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900 space-y-1">
              <p className="font-medium">Como funciona o cálculo?</p>
              <p className="text-xs">
                O ICMS-ST (Substituição Tributária) é calculado antecipadamente sobre uma base
                ampliada (valor da mercadoria + MVA). O valor a recolher é a diferença entre o
                ICMS-ST total e o ICMS próprio já destacado na nota fiscal.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
