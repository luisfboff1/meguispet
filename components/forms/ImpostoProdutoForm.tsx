// ============================================================================
// IMPOSTO PRODUTO FORM COMPONENT
// ============================================================================
// Form for configuring product tax settings (NCM, CEST, MVA, ICMS rates)
// ============================================================================

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import TabelaMvaList from '@/components/icms/TabelaMvaList'
import { tabelaMvaService } from '@/services/tabelaMvaService'
import { impostosService } from '@/services/impostosService'
import { formatPercentage } from '@/lib/icms-calculator'
import type { ImpostoProduto, ImpostoProdutoForm as ImpostoProdutoFormValues, TabelaMva } from '@/types'
import { FileText, Search, X, Info, Calculator, Loader2, CheckCircle2 } from 'lucide-react'

interface ImpostoProdutoFormProps {
  produtoId: number
  produtoNome?: string
  imposto?: ImpostoProduto
  onSubmit: (data: ImpostoProdutoFormValues) => Promise<void> | void
  onCancel: () => void
  loading?: boolean
}

const ESTADOS_BR = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
]

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
    uf_destino: imposto?.uf_destino || 'SP',
    tabela_mva_id: imposto?.tabela_mva_id || null,
    mva_manual: imposto?.mva_manual ?? null,
    aliquota_icms_manual: imposto?.aliquota_icms_manual ?? null,
    frete_padrao: imposto?.frete_padrao || 0,
    outras_despesas: imposto?.outras_despesas || 0,
    ativo: imposto?.ativo ?? true
  })

  const [showMvaSelector, setShowMvaSelector] = useState(false)
  const [selectedTabelaMva, setSelectedTabelaMva] = useState<TabelaMva | null>(imposto?.tabela_mva || null)
  const [useManualValues, setUseManualValues] = useState(
    (imposto?.mva_manual !== null && imposto?.mva_manual !== undefined) ||
    (imposto?.aliquota_icms_manual !== null && imposto?.aliquota_icms_manual !== undefined)
  )
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Load tabela MVA if ID exists
  useEffect(() => {
    if (formData.tabela_mva_id && !selectedTabelaMva) {
      tabelaMvaService.getById(formData.tabela_mva_id).then(tabela => {
        if (tabela) setSelectedTabelaMva(tabela)
      })
    }
  }, [formData.tabela_mva_id])

  const handleSelectTabelaMva = (tabela: TabelaMva) => {
    setSelectedTabelaMva(tabela)
    setFormData(prev => ({
      ...prev,
      tabela_mva_id: tabela.id,
      ncm: tabela.ncm,
      uf_destino: tabela.uf
    }))
    setShowMvaSelector(false)
  }

  const handleRemoveTabelaMva = () => {
    setSelectedTabelaMva(null)
    setFormData(prev => ({
      ...prev,
      tabela_mva_id: null
    }))
  }

  const handleToggleManualValues = () => {
    const newUseManual = !useManualValues
    setUseManualValues(newUseManual)

    if (!newUseManual) {
      // Clear manual values when switching to tabela MVA
      setFormData(prev => ({
        ...prev,
        mva_manual: null,
        aliquota_icms_manual: null
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!useManualValues && !formData.tabela_mva_id) {
      alert('Selecione uma tabela MVA ou informe valores manuais')
      return
    }

    if (useManualValues) {
      if (formData.mva_manual === null || formData.aliquota_icms_manual === null) {
        alert('Informe MVA e Alíquota ICMS manuais ou selecione uma tabela MVA')
        return
      }
    }

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

  const mvaValue = useManualValues
    ? formData.mva_manual
    : selectedTabelaMva?.mva

  const aliquotaValue = useManualValues
    ? formData.aliquota_icms_manual
    : selectedTabelaMva?.aliquota_efetiva ?? selectedTabelaMva?.aliquota_interna

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
                    Informe o NCM, CEST e selecione a tabela MVA correspondente ao estado de destino.
                    Alternativamente, você pode informar valores manuais de MVA e alíquota ICMS.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tax Codes Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* NCM */}
            <div>
              <Label htmlFor="ncm">NCM (Nomenclatura Comum do Mercosul) *</Label>
              <Input
                id="ncm"
                type="text"
                value={formData.ncm || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, ncm: e.target.value }))}
                placeholder="Ex: 2309"
                required
                maxLength={8}
              />
              <p className="text-xs text-gray-500 mt-1">8 dígitos</p>
            </div>

            {/* CEST */}
            <div>
              <Label htmlFor="cest">CEST (Código Especificador da ST)</Label>
              <Input
                id="cest"
                type="text"
                value={formData.cest || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, cest: e.target.value }))}
                placeholder="Ex: 0101300"
                maxLength={7}
              />
              <p className="text-xs text-gray-500 mt-1">7 dígitos (opcional)</p>
            </div>
          </div>

          {/* Origin and Destination */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Origem */}
            <div>
              <Label htmlFor="origem">Origem da Mercadoria *</Label>
              <select
                id="origem"
                value={formData.origem_mercadoria}
                onChange={(e) => setFormData(prev => ({ ...prev, origem_mercadoria: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value={0}>0 - Nacional</option>
                <option value={1}>1 - Estrangeira - Importação direta</option>
                <option value={2}>2 - Estrangeira - Adquirida no mercado interno</option>
              </select>
            </div>

            {/* UF Destino */}
            <div>
              <Label htmlFor="uf_destino">UF Destino *</Label>
              <select
                id="uf_destino"
                value={formData.uf_destino}
                onChange={(e) => setFormData(prev => ({ ...prev, uf_destino: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                {ESTADOS_BR.map(uf => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </div>
          </div>

          {/* MVA Source Toggle */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-4">
              <Label className="text-base font-semibold">Fonte de Alíquotas e MVA</Label>
              <Button
                type="button"
                onClick={handleToggleManualValues}
                variant="outline"
                size="sm"
              >
                {useManualValues ? 'Usar Tabela MVA' : 'Usar Valores Manuais'}
              </Button>
            </div>

            {!useManualValues ? (
              /* Tabela MVA Section */
              <div className="space-y-3">
                {selectedTabelaMva ? (
                  <div className="bg-white border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <Badge variant="default" className="mb-2">Tabela MVA Selecionada</Badge>
                        <p className="text-sm font-medium">
                          {selectedTabelaMva.uf} - NCM {selectedTabelaMva.ncm}
                        </p>
                        {selectedTabelaMva.descricao && (
                          <p className="text-xs text-gray-600 mt-1">{selectedTabelaMva.descricao}</p>
                        )}
                      </div>
                      <Button
                        type="button"
                        onClick={handleRemoveTabelaMva}
                        variant="ghost"
                        size="sm"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div>
                        <p className="text-xs text-gray-500">MVA</p>
                        <p className="text-lg font-bold text-blue-600">
                          {selectedTabelaMva.mva ? formatPercentage(selectedTabelaMva.mva) : '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Alíquota ICMS</p>
                        <p className="text-lg font-bold text-blue-600">
                          {selectedTabelaMva.aliquota_efetiva
                            ? formatPercentage(selectedTabelaMva.aliquota_efetiva)
                            : selectedTabelaMva.aliquota_interna
                            ? formatPercentage(selectedTabelaMva.aliquota_interna)
                            : '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500 mb-3">Nenhuma tabela MVA selecionada</p>
                    <Button
                      type="button"
                      onClick={() => setShowMvaSelector(!showMvaSelector)}
                      variant="outline"
                    >
                      <Search className="h-4 w-4 mr-2" />
                      {showMvaSelector ? 'Ocultar' : 'Buscar'} Tabela MVA
                    </Button>
                  </div>
                )}

                {/* MVA Selector */}
                {showMvaSelector && (
                  <div className="mt-4">
                    <TabelaMvaList
                      onSelect={handleSelectTabelaMva}
                      ufFilter={formData.uf_destino}
                      ncmFilter={formData.ncm}
                    />
                  </div>
                )}
              </div>
            ) : (
              /* Manual Values Section */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* MVA Manual */}
                <div>
                  <Label htmlFor="mva_manual">MVA (%) *</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="mva_manual"
                      type="number"
                      value={formData.mva_manual != null ? (formData.mva_manual * 100).toFixed(2) : ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        mva_manual: e.target.value ? parseFloat(e.target.value) / 100 : null
                      }))}
                      placeholder="Ex: 40"
                      step="0.01"
                      min="0"
                      max="1000"
                      required={useManualValues}
                    />
                    <span className="text-gray-500">%</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Informe o MVA em percentual</p>
                </div>

                {/* Alíquota ICMS Manual */}
                <div>
                  <Label htmlFor="aliquota_manual">Alíquota ICMS (%) *</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="aliquota_manual"
                      type="number"
                      value={formData.aliquota_icms_manual != null ? (formData.aliquota_icms_manual * 100).toFixed(2) : ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        aliquota_icms_manual: e.target.value ? parseFloat(e.target.value) / 100 : null
                      }))}
                      placeholder="Ex: 18"
                      step="0.01"
                      min="0"
                      max="100"
                      required={useManualValues}
                    />
                    <span className="text-gray-500">%</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Informe a alíquota ICMS</p>
                </div>
              </div>
            )}
          </div>

          {/* Additional Costs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Frete Padrão */}
            <div>
              <Label htmlFor="frete_padrao">Frete Padrão (R$)</Label>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">R$</span>
                <Input
                  id="frete_padrao"
                  type="number"
                  value={formData.frete_padrao}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    frete_padrao: parseFloat(e.target.value) || 0
                  }))}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>

            {/* Outras Despesas */}
            <div>
              <Label htmlFor="outras_despesas">Outras Despesas (R$)</Label>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">R$</span>
                <Input
                  id="outras_despesas"
                  type="number"
                  value={formData.outras_despesas}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    outras_despesas: parseFloat(e.target.value) || 0
                  }))}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* Preview Calculation */}
          {(mvaValue !== null || aliquotaValue !== null) && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <Calculator className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-900 mb-2">Valores Configurados</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-green-700">MVA:</span>
                        <span className="font-bold ml-2">{mvaValue !== null ? formatPercentage(mvaValue) : '-'}</span>
                      </div>
                      <div>
                        <span className="text-green-700">Alíquota ICMS:</span>
                        <span className="font-bold ml-2">{aliquotaValue !== null ? formatPercentage(aliquotaValue) : '-'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

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
