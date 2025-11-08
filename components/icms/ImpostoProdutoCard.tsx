// ============================================================================
// IMPOSTO PRODUTO CARD COMPONENT
// ============================================================================
// Component for displaying product tax configuration in a card format
// ============================================================================

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatPercentage, formatCurrency } from '@/lib/icms-calculator'
import type { ImpostoProduto } from '@/types'
import { FileText, MapPin, Package, Calculator, AlertCircle, CheckCircle2 } from 'lucide-react'

export interface ImpostoProdutoCardProps {
  imposto: ImpostoProduto
  showProduct?: boolean
  className?: string
}

export default function ImpostoProdutoCard({
  imposto,
  showProduct = true,
  className = ''
}: ImpostoProdutoCardProps) {
  const mvaValue = imposto.mva_manual ?? imposto.tabela_mva?.mva
  const aliquotaValue =
    imposto.aliquota_icms_manual ??
    imposto.tabela_mva?.aliquota_efetiva ??
    imposto.tabela_mva?.aliquota_interna

  const sujeitoST = imposto.tabela_mva?.sujeito_st ?? true
  const isManual = imposto.mva_manual !== null || imposto.aliquota_icms_manual !== null

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            Configuração Fiscal
          </CardTitle>
          {sujeitoST ? (
            <Badge variant="default" className="bg-green-600">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Sujeito a ST
            </Badge>
          ) : (
            <Badge variant="secondary">
              <AlertCircle className="h-3 w-3 mr-1" />
              Não Sujeito a ST
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Product Info */}
        {showProduct && imposto.produto && (
          <div className="pb-4 border-b">
            <div className="flex items-center gap-2 mb-1">
              <Package className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Produto</span>
            </div>
            <p className="text-base font-semibold">{imposto.produto.nome}</p>
            {imposto.produto.codigo_barras && (
              <p className="text-sm text-gray-500">Cód: {imposto.produto.codigo_barras}</p>
            )}
          </div>
        )}

        {/* Tax Codes */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">NCM</label>
            <p className="text-sm font-mono font-semibold">{imposto.ncm || '-'}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">CEST</label>
            <p className="text-sm font-mono font-semibold">{imposto.cest || '-'}</p>
          </div>
        </div>

        {/* Origin and Destination */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">Origem</label>
            <p className="text-sm">
              {imposto.origem_mercadoria === 0 ? 'Nacional' : 'Estrangeira'}
            </p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              UF Destino
            </label>
            <p className="text-sm font-semibold">{imposto.uf_destino}</p>
          </div>
        </div>

        {/* Tax Rates */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Calculator className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-gray-700">Alíquotas e MVA</span>
            {isManual && (
              <Badge variant="outline" className="text-xs">
                Manual
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">MVA</label>
              <p className="text-lg font-bold text-blue-600">
                {mvaValue !== null && mvaValue !== undefined
                  ? formatPercentage(mvaValue)
                  : '-'}
              </p>
              {imposto.mva_manual !== null && (
                <span className="text-xs text-gray-500">Valor manual</span>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">Alíquota ICMS</label>
              <p className="text-lg font-bold text-blue-600">
                {aliquotaValue !== null && aliquotaValue !== undefined
                  ? formatPercentage(aliquotaValue)
                  : '-'}
              </p>
              {imposto.aliquota_icms_manual !== null && (
                <span className="text-xs text-gray-500">Valor manual</span>
              )}
            </div>
          </div>
        </div>

        {/* Additional Costs */}
        {(imposto.frete_padrao > 0 || imposto.outras_despesas > 0) && (
          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">Frete Padrão</label>
              <p className="text-sm font-semibold">
                {formatCurrency(imposto.frete_padrao)}
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">Outras Despesas</label>
              <p className="text-sm font-semibold">
                {formatCurrency(imposto.outras_despesas)}
              </p>
            </div>
          </div>
        )}

        {/* Tabela MVA Info */}
        {imposto.tabela_mva && (
          <div className="pt-3 border-t">
            <label className="text-xs font-medium text-gray-500 uppercase mb-1 block">
              Tabela MVA Vinculada
            </label>
            <p className="text-sm text-gray-700">
              {imposto.tabela_mva.uf} - {imposto.tabela_mva.ncm}
            </p>
            {imposto.tabela_mva.descricao && (
              <p className="text-xs text-gray-500 mt-1">
                {imposto.tabela_mva.descricao}
              </p>
            )}
          </div>
        )}

        {/* Status */}
        <div className="flex items-center justify-between pt-2 border-t text-xs text-gray-500">
          <span>Status:</span>
          <Badge variant={imposto.ativo ? 'default' : 'secondary'}>
            {imposto.ativo ? 'Ativo' : 'Inativo'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
