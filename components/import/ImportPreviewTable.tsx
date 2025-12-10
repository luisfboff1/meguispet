import React, { useMemo, useState } from 'react'
import { Check, AlertCircle, XCircle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ClientePreview } from '@/services/importService'

interface ImportPreviewTableProps {
  registros: ClientePreview[]
  onToggleSelect: (index: number) => void
  onToggleSelectAll: () => void
}

export default function ImportPreviewTable({
  registros,
  onToggleSelect,
  onToggleSelectAll
}: ImportPreviewTableProps) {
  const [filtro, setFiltro] = useState<'todos' | 'validos' | 'avisos' | 'erros' | 'duplicatas'>('todos')
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())

  // Filtrar registros
  const registrosFiltrados = useMemo(() => {
    if (filtro === 'todos') return registros

    return registros.filter(r => {
      if (filtro === 'validos') return r.status === 'valido'
      if (filtro === 'avisos') return r.status === 'aviso'
      if (filtro === 'erros') return r.status === 'erro'
      if (filtro === 'duplicatas') return r.status === 'duplicata'
      return true
    })
  }, [registros, filtro])

  // Estatísticas
  const stats = useMemo(() => {
    const total = registros.length
    const selecionados = registros.filter(r => r.selecionado).length
    const validos = registros.filter(r => r.status === 'valido').length
    const avisos = registros.filter(r => r.status === 'aviso').length
    const erros = registros.filter(r => r.status === 'erro').length
    const duplicatas = registros.filter(r => r.status === 'duplicata').length

    return { total, selecionados, validos, avisos, erros, duplicatas }
  }, [registros])

  // Toggle expand row
  const toggleExpand = (linha: number) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev)
      if (newSet.has(linha)) {
        newSet.delete(linha)
      } else {
        newSet.add(linha)
      }
      return newSet
    })
  }

  // Ícones de status
  const getStatusIcon = (status: ClientePreview['status']) => {
    switch (status) {
      case 'valido':
        return <Check className="w-5 h-5 text-green-600" />
      case 'aviso':
        return <AlertCircle className="w-5 h-5 text-amber-600" />
      case 'erro':
        return <XCircle className="w-5 h-5 text-red-600" />
      case 'duplicata':
        return <RefreshCw className="w-5 h-5 text-blue-600" />
    }
  }

  // Badge de status
  const getStatusBadge = (status: ClientePreview['status']) => {
    const classes = {
      valido: 'bg-green-100 text-green-800',
      aviso: 'bg-amber-100 text-amber-800',
      erro: 'bg-red-100 text-red-800',
      duplicata: 'bg-blue-100 text-blue-800'
    }

    const labels = {
      valido: 'Válido',
      aviso: 'Aviso',
      erro: 'Erro',
      duplicata: 'Duplicata'
    }

    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${classes[status]}`}>
        {labels[status]}
      </span>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header com estatísticas e filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="space-y-2">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-sm font-medium text-gray-900">
              {stats.total} registros
            </span>
            <span className="text-sm text-gray-600">
              {stats.selecionados} selecionados
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap text-xs">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              {stats.validos} válidos
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-amber-500"></div>
              {stats.avisos} avisos
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              {stats.erros} erros
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              {stats.duplicatas} duplicatas
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={stats.selecionados === stats.total && stats.total > 0}
              onChange={onToggleSelectAll}
              className="w-4 h-4 rounded border-gray-300 text-meguispet-primary focus:ring-meguispet-primary"
            />
            <span className="text-gray-700">Selecionar todos</span>
          </label>

          <select
            value={filtro}
            onChange={(e) => setFiltro(e.target.value as typeof filtro)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-meguispet-primary focus:border-transparent"
          >
            <option value="todos">Todos</option>
            <option value="validos">Válidos ({stats.validos})</option>
            <option value="avisos">Avisos ({stats.avisos})</option>
            <option value="erros">Erros ({stats.erros})</option>
            <option value="duplicatas">Duplicatas ({stats.duplicatas})</option>
          </select>
        </div>
      </div>

      {/* Tabela */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="max-h-[500px] overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="w-10 px-3 py-3 text-left"></th>
                <th className="w-12 px-3 py-3 text-left">
                  <span className="text-xs font-medium text-gray-500 uppercase">ST</span>
                </th>
                <th className="px-3 py-3 text-left">
                  <span className="text-xs font-medium text-gray-500 uppercase">Nome</span>
                </th>
                <th className="px-3 py-3 text-left">
                  <span className="text-xs font-medium text-gray-500 uppercase">CNPJ/CPF</span>
                </th>
                <th className="px-3 py-3 text-left">
                  <span className="text-xs font-medium text-gray-500 uppercase">Cidade/UF</span>
                </th>
                <th className="px-3 py-3 text-left">
                  <span className="text-xs font-medium text-gray-500 uppercase">CEP</span>
                </th>
                <th className="w-10 px-3 py-3"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {registrosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-sm text-gray-500">
                    Nenhum registro encontrado com o filtro selecionado
                  </td>
                </tr>
              ) : (
                registrosFiltrados.map((registro) => (
                  <React.Fragment key={registro.linha}>
                    <tr className={`hover:bg-gray-50 ${!registro.selecionado ? 'opacity-60' : ''}`}>
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={registro.selecionado}
                          onChange={() => onToggleSelect(registro.linha)}
                          disabled={registro.status === 'erro'}
                          className="w-4 h-4 rounded border-gray-300 text-meguispet-primary focus:ring-meguispet-primary disabled:opacity-50"
                        />
                      </td>
                      <td className="px-3 py-3">
                        {getStatusIcon(registro.status)}
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                          {registro.dados.processado.nome}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-sm text-gray-600">
                          {registro.dados.processado.documento || '-'}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-sm text-gray-600">
                          {registro.dados.processado.cidade}, {registro.dados.processado.estado}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        {registro.validacoes.cep.encontrado ? (
                          <div className="text-sm">
                            <div className="text-gray-900">{registro.validacoes.cep.valor}</div>
                            {registro.validacoes.cep.aproximado && (
                              <div className="text-xs text-amber-600">Aproximado</div>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400">Não encontrado</div>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpand(registro.linha)}
                        >
                          {expandedRows.has(registro.linha) ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </Button>
                      </td>
                    </tr>

                    {/* Linha expandida com detalhes */}
                    {expandedRows.has(registro.linha) && (
                      <tr>
                        <td colSpan={7} className="px-3 py-4 bg-gray-50">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">Status</p>
                                {getStatusBadge(registro.status)}
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-medium text-gray-500 mb-1">Linha</p>
                                <p className="text-sm text-gray-900">#{registro.linha}</p>
                              </div>
                            </div>

                            {registro.mensagens.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-gray-500 mb-2">Mensagens:</p>
                                <ul className="space-y-1">
                                  {registro.mensagens.map((msg, idx) => (
                                    <li key={idx} className="text-xs text-gray-700 flex items-start gap-2">
                                      <span className="text-gray-400">•</span>
                                      <span>{msg}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {registro.validacoes.cep.endereco && (
                              <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">Endereço encontrado:</p>
                                <p className="text-sm text-gray-700">{registro.validacoes.cep.endereco}</p>
                              </div>
                            )}

                            {registro.duplicata && (
                              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-xs font-medium text-blue-900 mb-1">Duplicata detectada</p>
                                <p className="text-xs text-blue-700">
                                  Cliente já existe: {registro.duplicata.nome} (ID: {registro.duplicata.clienteExistente})
                                </p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legenda */}
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-xs font-medium text-gray-700 mb-2">Legenda:</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-600" />
            <span className="text-gray-700">Válido e pronto para importar</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <span className="text-gray-700">Aviso - revisar após importação</span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-600" />
            <span className="text-gray-700">Erro - não será importado</span>
          </div>
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-blue-600" />
            <span className="text-gray-700">Duplicata - CNPJ já existe</span>
          </div>
        </div>
      </div>
    </div>
  )
}
