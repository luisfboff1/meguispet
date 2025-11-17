// ============================================================================
// TABELA MVA LIST COMPONENT
// ============================================================================
// Component for listing and filtering MVA (Margem de Valor Agregado) tables
// ============================================================================

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { tabelaMvaService } from '@/services/tabelaMvaService'
import { formatPercentage } from '@/lib/icms-calculator'
import type { TabelaMva } from '@/types'
import { Search, Filter, CheckCircle, XCircle, RefreshCw } from 'lucide-react'

export interface TabelaMvaListProps {
  onSelect?: (mva: TabelaMva) => void
  ufFilter?: string
  ncmFilter?: string
}

export default function TabelaMvaList({
  onSelect,
  ufFilter,
  ncmFilter
}: TabelaMvaListProps) {
  const [tabelas, setTabelas] = useState<TabelaMva[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [uf, setUf] = useState(ufFilter || '')
  const [ncm, setNcm] = useState(ncmFilter || '')
  const [sujeitoST, setSujeitoST] = useState<boolean | undefined>(undefined)
  const [searchTerm, setSearchTerm] = useState('')

  // Pagination
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 20

  const loadTabelas = async () => {
    try {
      setLoading(true)
      setError(null)

      const filters: Record<string, unknown> = {}
      if (uf) filters.uf = uf
      if (ncm) filters.ncm = ncm
      if (sujeitoST !== undefined) filters.sujeito_st = sujeitoST

      const response = await tabelaMvaService.getAll(page, limit, filters)
      setTabelas(response.data)
      setTotal(response.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar tabelas MVA')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTabelas()
  }, [page, uf, ncm, sujeitoST])

  const handleReset = () => {
    setUf('')
    setNcm('')
    setSujeitoST(undefined)
    setSearchTerm('')
    setPage(1)
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* UF Filter */}
            <div>
              <label className="block text-sm font-medium mb-1">UF</label>
              <input
                type="text"
                value={uf}
                onChange={(e) => setUf(e.target.value.toUpperCase())}
                placeholder="Ex: SP"
                maxLength={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* NCM Filter */}
            <div>
              <label className="block text-sm font-medium mb-1">NCM</label>
              <input
                type="text"
                value={ncm}
                onChange={(e) => setNcm(e.target.value)}
                placeholder="Ex: 2309"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Sujeito ST Filter */}
            <div>
              <label className="block text-sm font-medium mb-1">Sujeito a ST</label>
              <select
                value={sujeitoST === undefined ? '' : sujeitoST.toString()}
                onChange={(e) => setSujeitoST(e.target.value === '' ? undefined : e.target.value === 'true')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                <option value="true">Sim</option>
                <option value="false">Não</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex items-end gap-2">
              <Button
                onClick={handleReset}
                variant="outline"
                className="flex-1"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Limpar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Tabela MVA ({total} {total === 1 ? 'registro' : 'registros'})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              Carregando...
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">
              {error}
            </div>
          ) : tabelas.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nenhuma tabela MVA encontrada
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">UF</th>
                      <th className="text-left px-4 py-3 font-medium">NCM</th>
                      <th className="text-left px-4 py-3 font-medium">Descrição</th>
                      <th className="text-center px-4 py-3 font-medium">MVA</th>
                      <th className="text-center px-4 py-3 font-medium">Alíquota</th>
                      <th className="text-center px-4 py-3 font-medium">Sujeito ST</th>
                      {onSelect && <th className="text-center px-4 py-3 font-medium">Ação</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {tabelas.map((tabela) => (
                      <tr
                        key={tabela.id}
                        className="border-t hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <span className="font-medium text-blue-600">{tabela.uf}</span>
                        </td>
                        <td className="px-4 py-3">{tabela.ncm}</td>
                        <td className="px-4 py-3 max-w-xs truncate" title={tabela.descricao || ''}>
                          {tabela.descricao || '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {tabela.mva ? formatPercentage(tabela.mva) : '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {tabela.aliquota_efetiva
                            ? formatPercentage(tabela.aliquota_efetiva)
                            : tabela.aliquota_interna
                            ? formatPercentage(tabela.aliquota_interna)
                            : '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {tabela.sujeito_st ? (
                            <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600 mx-auto" />
                          )}
                        </td>
                        {onSelect && (
                          <td className="px-4 py-3 text-center">
                            <Button
                              onClick={() => onSelect(tabela)}
                              variant="outline"
                              size="sm"
                            >
                              Selecionar
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="text-sm text-gray-600">
                    Página {page} de {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      variant="outline"
                      size="sm"
                    >
                      Anterior
                    </Button>
                    <Button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      variant="outline"
                      size="sm"
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
