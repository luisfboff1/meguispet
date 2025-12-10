import React from 'react'
import { Label } from '@/components/ui/label'
import type { Cliente } from '@/types'
import { AlertCircle } from 'lucide-react'

export interface ImportConfig {
  tipo: Cliente['tipo']
  buscarCEP: boolean
  duplicatas: 'ignorar' | 'atualizar' | 'novo'
}

interface ImportConfigFormProps {
  config: ImportConfig
  onChange: (config: ImportConfig) => void
  disabled?: boolean
}

export default function ImportConfigForm({
  config,
  onChange,
  disabled = false
}: ImportConfigFormProps) {
  const handleTipoChange = (tipo: Cliente['tipo']) => {
    onChange({ ...config, tipo })
  }

  const handleBuscarCEPChange = (checked: boolean) => {
    onChange({ ...config, buscarCEP: checked })
  }

  const handleDuplicatasChange = (duplicatas: ImportConfig['duplicatas']) => {
    onChange({ ...config, duplicatas })
  }

  return (
    <div className="space-y-6">
      {/* Tipo padrão */}
      <div>
        <Label className="text-sm font-medium text-gray-900 mb-3 block">
          Tipo padrão dos clientes
        </Label>
        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            disabled={disabled}
            onClick={() => handleTipoChange('cliente')}
            className={`
              px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all
              ${config.tipo === 'cliente'
                ? 'border-meguispet-primary bg-meguispet-primary/5 text-meguispet-primary'
                : 'border-gray-200 text-gray-700 hover:border-gray-300'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            Cliente
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => handleTipoChange('fornecedor')}
            className={`
              px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all
              ${config.tipo === 'fornecedor'
                ? 'border-meguispet-primary bg-meguispet-primary/5 text-meguispet-primary'
                : 'border-gray-200 text-gray-700 hover:border-gray-300'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            Fornecedor
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => handleTipoChange('ambos')}
            className={`
              px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all
              ${config.tipo === 'ambos'
                ? 'border-meguispet-primary bg-meguispet-primary/5 text-meguispet-primary'
                : 'border-gray-200 text-gray-700 hover:border-gray-300'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            Ambos
          </button>
        </div>
      </div>

      {/* Buscar CEP */}
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
        <div className="flex items-start space-x-3">
          <input
            type="checkbox"
            id="buscarCEP"
            checked={config.buscarCEP}
            onChange={(e) => handleBuscarCEPChange(e.target.checked)}
            disabled={disabled}
            className="mt-1 w-4 h-4 rounded border-gray-300 text-meguispet-primary focus:ring-meguispet-primary disabled:opacity-50"
          />
          <div className="flex-1">
            <Label
              htmlFor="buscarCEP"
              className="text-sm font-medium text-gray-900 cursor-pointer"
            >
              Buscar CEP automaticamente
            </Label>
            <p className="text-xs text-gray-600 mt-1">
              Busca o CEP aproximado (centro da cidade) via ViaCEP para cada cliente
            </p>

            {config.buscarCEP && (
              <div className="mt-3 flex items-start space-x-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">CEPs serão aproximados</p>
                  <p className="mt-1">
                    Os CEPs encontrados serão do centro da cidade.
                    Revise e corrija após a importação se necessário.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tratamento de duplicatas */}
      <div>
        <Label className="text-sm font-medium text-gray-900 mb-3 block">
          Em caso de duplicatas (mesmo CNPJ/CPF)
        </Label>
        <select
          value={config.duplicatas}
          onChange={(e) => handleDuplicatasChange(e.target.value as ImportConfig['duplicatas'])}
          disabled={disabled}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-meguispet-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="ignorar">Ignorar (não importar duplicatas)</option>
          <option value="atualizar">Atualizar dados existentes</option>
          <option value="novo">Importar como novo (com aviso)</option>
        </select>

        <div className="mt-2 text-xs text-gray-600">
          {config.duplicatas === 'ignorar' && (
            <p>Clientes com CNPJ/CPF já cadastrado serão ignorados</p>
          )}
          {config.duplicatas === 'atualizar' && (
            <p>Clientes com CNPJ/CPF já cadastrado terão seus dados atualizados</p>
          )}
          {config.duplicatas === 'novo' && (
            <p>Clientes com CNPJ/CPF já cadastrado serão importados mesmo assim (com aviso)</p>
          )}
        </div>
      </div>
    </div>
  )
}
