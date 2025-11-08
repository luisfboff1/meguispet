// ============================================================================
// IMPOSTO PRODUTO FORM COMPONENT
// ============================================================================
// Form for configuring product tax settings (NCM, CEST, MVA, ICMS rates)
// ============================================================================

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { impostosService } from '@/services/impostosService'
import { formatPercentage } from '@/lib/icms-calculator'
import type { ImpostoProduto, ImpostoProdutoForm as ImpostoProdutoFormValues } from '@/types'
import { FileText, Info, Loader2, CheckCircle2 } from 'lucide-react'

interface ImpostoProdutoFormProps {
  produtoId: number
  produtoNome?: string
  imposto?: ImpostoProduto
  onSubmit: (data: ImpostoProdutoFormValues) => Promise<void> | void
  onCancel: () => void
  loading?: boolean
}

export default function ImpostoProdutoForm({
  produtoId,
  produtoNome,
  imposto,
  onSubmit,
  onCancel,
  loading = false
}: ImpostoProdutoFormProps) {
  const [formData, setFormData] = useState<ImpostoProdutoFormValues>({
    produto_id: imposto?.produto_id || produtoId,
    ncm: imposto?.ncm || '',
    cest: imposto?.cest || '',
    origem_mercadoria: imposto?.origem_mercadoria ?? 0,
    mva_manual: imposto?.mva_manual ?? null,
    aliquota_icms_manual: imposto?.aliquota_icms_manual ?? null,
    frete_padrao: imposto?.frete_padrao || 0,
    outras_despesas: imposto?.outras_despesas || 0,
    ativo: imposto?.ativo ?? true
  })

  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setSaving(true)
    setSaveSuccess(false)

    try {
      await impostosService.upsert(formData)
      console.log('[ImpostoProdutoForm] Configuração fiscal salva com sucesso')
      setSaveSuccess(true)

      // Show success message briefly
      setTimeout(() => {
        setSaveSuccess(false)
      }, 3000)

      // Notify parent component
      await onSubmit(formData)
    } catch (error) {
      console.error('[ImpostoProdutoForm] Erro ao salvar configuração fiscal:', error)
      alert('Erro ao salvar configuração fiscal. Por favor, tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {imposto ? 'Editar' : 'Configurar'} Impostos - {produtoNome || `Produto #${produtoId}`}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Info Card */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-medium mb-1">Configure as informações fiscais do produto</p>
                  <p className="text-xs">
                    O NCM é usado para buscar automaticamente a tabela MVA correta de acordo com
                    o estado de destino da venda. Você pode definir valores manuais opcionais (MVA e alíquota)
                    que substituirão os valores da tabela.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* NCM e CEST */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ncm">NCM (Código do Produto)</Label>
              <Input
                id="ncm"
                value={formData.ncm || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, ncm: e.target.value }))}
                placeholder="Ex: 2309"
                maxLength={8}
              />
              <p className="text-xs text-gray-500">8 dígitos - usado para buscar MVA na venda</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cest">CEST (Código Especificador)</Label>
              <Input
                id="cest"
                value={formData.cest || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, cest: e.target.value }))}
                placeholder="Ex: 1700100"
                maxLength={7}
              />
              <p className="text-xs text-gray-500">7 dígitos</p>
            </div>
          </div>

          {/* Origem da Mercadoria */}
          <div className="space-y-2">
            <Label htmlFor="origem">Origem da Mercadoria</Label>
            <select
              id="origem"
              value={formData.origem_mercadoria}
              onChange={(e) => setFormData(prev => ({ ...prev, origem_mercadoria: Number(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={0}>0 - Nacional</option>
              <option value={1}>1 - Estrangeira - Importação direta</option>
              <option value={2}>2 - Estrangeira - Adquirida no mercado interno</option>
            </select>
          </div>

          {/* Valores Manuais Opcionais */}
          <Card className="bg-yellow-50 border-yellow-200">
            <CardHeader>
              <CardTitle className="text-base">Valores Manuais (Opcional)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-yellow-800">
                Se preenchidos, estes valores serão usados <strong>em vez</strong> dos valores da tabela MVA.
                Deixe em branco para usar os valores da tabela automaticamente.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mva_manual">MVA Manual (%)</Label>
                  <Input
                    id="mva_manual"
                    type="number"
                    value={formData.mva_manual != null ? (formData.mva_manual * 100).toFixed(2) : ''}
                    onChange={(e) => {
                      const val = e.target.value
                      setFormData(prev => ({
                        ...prev,
                        mva_manual: val ? Number(val) / 100 : null
                      }))
                    }}
                    placeholder="Ex: 73.04"
                    step="0.01"
                    min="0"
                  />
                  <p className="text-xs text-gray-500">
                    {formData.mva_manual != null && `Valor: ${formatPercentage(formData.mva_manual)}`}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="aliquota_manual">Alíquota ICMS Manual (%)</Label>
                  <Input
                    id="aliquota_manual"
                    type="number"
                    value={formData.aliquota_icms_manual != null ? (formData.aliquota_icms_manual * 100).toFixed(2) : ''}
                    onChange={(e) => {
                      const val = e.target.value
                      setFormData(prev => ({
                        ...prev,
                        aliquota_icms_manual: val ? Number(val) / 100 : null
                      }))
                    }}
                    placeholder="Ex: 18.00"
                    step="0.01"
                    min="0"
                    max="100"
                  />
                  <p className="text-xs text-gray-500">
                    {formData.aliquota_icms_manual != null && `Valor: ${formatPercentage(formData.aliquota_icms_manual)}`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Custos Adicionais */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="frete">Frete Padrão (R$)</Label>
              <Input
                id="frete"
                type="number"
                value={formData.frete_padrao}
                onChange={(e) => setFormData(prev => ({ ...prev, frete_padrao: Number(e.target.value) }))}
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="despesas">Outras Despesas (R$)</Label>
              <Input
                id="despesas"
                type="number"
                value={formData.outras_despesas}
                onChange={(e) => setFormData(prev => ({ ...prev, outras_despesas: Number(e.target.value) }))}
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
          </div>

          {/* Success Message */}
          {saveSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <p className="text-sm font-medium text-green-800">
                  Configuração fiscal salva com sucesso!
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              onClick={onCancel}
              variant="outline"
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                imposto ? 'Atualizar Configuração' : 'Salvar Configuração'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
