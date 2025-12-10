import React from 'react'
import { CheckCircle, XCircle, AlertCircle, RefreshCw, MapPin, FileText, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { RelatorioImportacao } from '@/services/importService'

interface ImportResultSummaryProps {
  relatorio: RelatorioImportacao
  onClose: () => void
  onVerMapa?: () => void
  onBaixarRelatorio?: () => void
}

export default function ImportResultSummary({
  relatorio,
  onClose,
  onVerMapa,
  onBaixarRelatorio
}: ImportResultSummaryProps) {
  const temErros = relatorio.erros > 0
  const temAvisos = relatorio.avisos > 0
  const temDuplicatas = relatorio.duplicatas > 0

  return (
    <div className="space-y-6">
      {/* Header com ícone de sucesso/aviso */}
      <div className="text-center">
        {!temErros ? (
          <div className="w-16 h-16 rounded-full bg-green-100 mx-auto flex items-center justify-center mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
        ) : (
          <div className="w-16 h-16 rounded-full bg-amber-100 mx-auto flex items-center justify-center mb-4">
            <AlertCircle className="w-10 h-10 text-amber-600" />
          </div>
        )}

        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {!temErros ? 'Importação Concluída!' : 'Importação Concluída com Avisos'}
        </h2>
        <p className="text-gray-600">
          {relatorio.importados} de {relatorio.total} clientes importados
        </p>
      </div>

      {/* Estatísticas principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-green-700">{relatorio.importados}</div>
          <div className="text-sm text-green-600 mt-1">Importados</div>
        </div>

        {temDuplicatas && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-blue-700">{relatorio.duplicatas}</div>
            <div className="text-sm text-blue-600 mt-1">Duplicatas</div>
          </div>
        )}

        {temAvisos && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-amber-700">{relatorio.avisos}</div>
            <div className="text-sm text-amber-600 mt-1">Avisos</div>
          </div>
        )}

        {temErros && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-red-700">{relatorio.erros}</div>
            <div className="text-sm text-red-600 mt-1">Erros</div>
          </div>
        )}
      </div>

      {/* Informações sobre CEP */}
      {relatorio.cep && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            CEPs
          </h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-gray-600">Encontrados</div>
              <div className="text-lg font-bold text-green-600">{relatorio.cep.encontrados}</div>
            </div>
            <div>
              <div className="text-gray-600">Aproximados</div>
              <div className="text-lg font-bold text-amber-600">{relatorio.cep.aproximados}</div>
            </div>
            <div>
              <div className="text-gray-600">Não encontrados</div>
              <div className="text-lg font-bold text-gray-600">{relatorio.cep.naoEncontrados}</div>
            </div>
          </div>
        </div>
      )}

      {/* Informações sobre o mapa */}
      {relatorio.mapa && relatorio.mapa.adicionados > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Mapa de Clientes
          </h3>
          <p className="text-sm text-blue-700">
            {relatorio.mapa.adicionados} cliente(s) adicionado(s) ao mapa e disponíveis para visualização
          </p>
        </div>
      )}

      {/* Detalhes expandíveis */}
      {(temErros || temDuplicatas) && (
        <div className="space-y-3">
          {/* Erros */}
          {temErros && relatorio.detalhes.erros.length > 0 && (
            <details className="border border-red-200 rounded-lg overflow-hidden">
              <summary className="px-4 py-3 bg-red-50 cursor-pointer font-medium text-sm text-red-900 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  Erros ({relatorio.detalhes.erros.length})
                </span>
                <span className="text-xs text-red-600">Clique para ver detalhes</span>
              </summary>
              <div className="px-4 py-3 bg-white max-h-48 overflow-y-auto">
                <ul className="space-y-2">
                  {relatorio.detalhes.erros.map((erro, idx) => (
                    <li key={idx} className="text-sm text-gray-700">
                      <span className="font-medium">Linha {erro.linha}:</span>{' '}
                      {erro.nome} - {erro.mensagem}
                    </li>
                  ))}
                </ul>
              </div>
            </details>
          )}

          {/* Duplicatas */}
          {temDuplicatas && relatorio.detalhes.duplicatas.length > 0 && (
            <details className="border border-blue-200 rounded-lg overflow-hidden">
              <summary className="px-4 py-3 bg-blue-50 cursor-pointer font-medium text-sm text-blue-900 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Duplicatas ({relatorio.detalhes.duplicatas.length})
                </span>
                <span className="text-xs text-blue-600">Clique para ver detalhes</span>
              </summary>
              <div className="px-4 py-3 bg-white max-h-48 overflow-y-auto">
                <ul className="space-y-2">
                  {relatorio.detalhes.duplicatas.map((dup, idx) => (
                    <li key={idx} className="text-sm text-gray-700">
                      <span className="font-medium">Linha {dup.linha}:</span>{' '}
                      {dup.nome} - {dup.mensagem}
                    </li>
                  ))}
                </ul>
              </div>
            </details>
          )}

          {/* Avisos */}
          {temAvisos && relatorio.detalhes.avisos.length > 0 && (
            <details className="border border-amber-200 rounded-lg overflow-hidden">
              <summary className="px-4 py-3 bg-amber-50 cursor-pointer font-medium text-sm text-amber-900 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Avisos ({relatorio.detalhes.avisos.length})
                </span>
                <span className="text-xs text-amber-600">Clique para ver detalhes</span>
              </summary>
              <div className="px-4 py-3 bg-white max-h-48 overflow-y-auto">
                <ul className="space-y-2">
                  {relatorio.detalhes.avisos.map((aviso, idx) => (
                    <li key={idx} className="text-sm text-gray-700">
                      <span className="font-medium">Linha {aviso.linha}:</span>{' '}
                      {aviso.nome} - {aviso.mensagem}
                    </li>
                  ))}
                </ul>
              </div>
            </details>
          )}
        </div>
      )}

      {/* Ações */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
        {onBaixarRelatorio && (
          <Button
            variant="outline"
            onClick={onBaixarRelatorio}
            className="flex-1"
          >
            <Download className="w-4 h-4 mr-2" />
            Baixar Relatório
          </Button>
        )}

        {onVerMapa && relatorio.mapa.adicionados > 0 && (
          <Button
            variant="outline"
            onClick={onVerMapa}
            className="flex-1"
          >
            <MapPin className="w-4 h-4 mr-2" />
            Ver no Mapa
          </Button>
        )}

        <Button
          onClick={onClose}
          className="flex-1 bg-meguispet-primary hover:bg-meguispet-primary/90"
        >
          Concluir
        </Button>
      </div>
    </div>
  )
}
