import React from 'react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff } from 'lucide-react'
import type { VendaTabelaColunasVisiveis } from '@/types'

interface VendaTabelaColunasProps {
  visibleColumns: VendaTabelaColunasVisiveis
  onChange: (columns: VendaTabelaColunasVisiveis) => void
}

const COLUNAS_INFO = [
  { key: 'produto' as const, label: 'Produto', obrigatoria: true },
  { key: 'quantidade' as const, label: 'Quantidade', obrigatoria: true },
  { key: 'precoUnitario' as const, label: 'Preço Unit.', obrigatoria: true },
  { key: 'subtotalBruto' as const, label: 'Subtotal Bruto', obrigatoria: false },
  { key: 'descontoProporcional' as const, label: 'Desconto', obrigatoria: false },
  { key: 'subtotalLiquido' as const, label: 'Subtotal Líquido', obrigatoria: false },
  { key: 'ipiAliquota' as const, label: 'IPI %', obrigatoria: false },
  { key: 'ipiValor' as const, label: 'IPI Valor', obrigatoria: false },
  { key: 'icmsAliquota' as const, label: 'ICMS %', obrigatoria: false },
  { key: 'icmsValor' as const, label: 'ICMS Valor', obrigatoria: false },
  { key: 'stAliquota' as const, label: 'ST %', obrigatoria: false },
  { key: 'stValor' as const, label: 'ST Valor', obrigatoria: false },
  { key: 'totalItem' as const, label: 'Total Item', obrigatoria: true },
  { key: 'acoes' as const, label: 'Ações', obrigatoria: true }
]

export default function VendaTabelaColunas({ visibleColumns, onChange }: VendaTabelaColunasProps) {
  const handleToggle = (key: keyof VendaTabelaColunasVisiveis) => {
    onChange({
      ...visibleColumns,
      [key]: !visibleColumns[key]
    })
  }

  const handleMostrarTodas = () => {
    const todasVisiveis: VendaTabelaColunasVisiveis = {
      produto: true,
      quantidade: true,
      precoUnitario: true,
      subtotalBruto: true,
      descontoProporcional: true,
      subtotalLiquido: true,
      ipiAliquota: true,
      ipiValor: true,
      icmsAliquota: true,
      icmsValor: true,
      stAliquota: true,
      stValor: true,
      totalItem: true,
      acoes: true
    }
    onChange(todasVisiveis)
  }

  const handleMostrarMinimo = () => {
    const minimas: VendaTabelaColunasVisiveis = {
      produto: true,
      quantidade: true,
      precoUnitario: true,
      subtotalBruto: false,
      descontoProporcional: false,
      subtotalLiquido: false,
      ipiAliquota: false,
      ipiValor: false,
      icmsAliquota: false,
      icmsValor: false,
      stAliquota: false,
      stValor: false,
      totalItem: true,
      acoes: true
    }
    onChange(minimas)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Colunas Visíveis</h3>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleMostrarMinimo}
          >
            <EyeOff className="h-4 w-4 mr-1" />
            Mínimo
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleMostrarTodas}
          >
            <Eye className="h-4 w-4 mr-1" />
            Todas
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {COLUNAS_INFO.map((coluna) => (
          <div key={coluna.key} className="flex items-center space-x-2">
            <input
              type="checkbox"
              id={`col-${coluna.key}`}
              checked={visibleColumns[coluna.key]}
              onChange={() => handleToggle(coluna.key)}
              disabled={coluna.obrigatoria}
              className="rounded"
            />
            <Label
              htmlFor={`col-${coluna.key}`}
              className={`text-xs cursor-pointer ${
                coluna.obrigatoria ? 'text-gray-400 cursor-not-allowed' : ''
              }`}
            >
              {coluna.label}
              {coluna.obrigatoria && ' *'}
            </Label>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-500">
        * Colunas marcadas com asterisco são obrigatórias e não podem ser ocultadas
      </p>
    </div>
  )
}
