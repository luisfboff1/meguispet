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
          <div className="w-16 h-16 rounded-full bg-success/10 mx-auto flex items-center justify-center mb-4">
            <CheckCircle className="w-10 h-10 text-success" />
          </div>
        ) : (
          <div className="w-16 h-16 rounded-full bg-warning/10 mx-auto flex items-center justify-center mb-4">
            <AlertCircle className="w-10 h-10 text-warning" />
          </div>
        )}

        <h2 className="text-2xl font-bold text-foreground mb-2">
          {!temErros ? 'Importação Concluída!' : 'Importação Concluída com Avisos'}
        </h2>
        <p className="text-muted-foreground">
          {relatorio.importados} de {relatorio.total} clientes importados
        </p>
      </div>

      {/* Estatísticas principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-success/10 border border-success rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-success">{relatorio.importados}</div>
          <div className="text-sm text-success mt-1">Importados</div>
        </div>

        {temDuplicatas && (
          <div className="bg-info/10 border border-info rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-info">{relatorio.duplicatas}</div>
            <div className="text-sm text-info mt-1">Duplicatas</div>
          </div>
        )}

        {temAvisos && (
          <div className="bg-warning/10 border border-warning rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-warning">{relatorio.avisos}</div>
            <div className="text-sm text-warning mt-1">Avisos</div>
          </div>
        )}

        {temErros && (
          <div className="bg-destructive/10 border border-destructive rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-destructive">{relatorio.erros}</div>
            <div className="text-sm text-destructive mt-1">Erros</div>
          </div>
        )}
      </div>

      {/* Informações sobre CEP */}
      {relatorio.cep && (
        <div className="bg-muted/50 border rounded-lg p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            CEPs
          </h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Encontrados</div>
              <div className="text-lg font-bold text-success">{relatorio.cep.encontrados}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Aproximados</div>
              <div className="text-lg font-bold text-warning">{relatorio.cep.aproximados}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Não encontrados</div>
              <div className="text-lg font-bold text-muted-foreground">{relatorio.cep.naoEncontrados}</div>
            </div>
          </div>
        </div>
      )}

      {/* Informações sobre o mapa */}
      {relatorio.mapa && relatorio.mapa.adicionados > 0 && (
        <div className="bg-info/10 border border-info rounded-lg p-4">
          <h3 className="text-sm font-semibold text-info mb-2 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Mapa de Clientes
          </h3>
          <p className="text-sm text-info">
            {relatorio.mapa.adicionados} cliente(s) adicionado(s) ao mapa e disponíveis para visualização
          </p>
        </div>
      )}

      {/* Detalhes expandíveis */}
      {(temErros || temDuplicatas) && (
        <div className="space-y-3">
          {/* Erros */}
          {temErros && relatorio.detalhes.erros.length > 0 && (
            <details className="border border-destructive rounded-lg overflow-hidden">
              <summary className="px-4 py-3 bg-destructive/10 cursor-pointer font-medium text-sm text-destructive flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  Erros ({relatorio.detalhes.erros.length})
                </span>
                <span className="text-xs text-destructive">Clique para ver detalhes</span>
              </summary>
              <div className="px-4 py-3 bg-card max-h-48 overflow-y-auto">
                <ul className="space-y-2">
                  {relatorio.detalhes.erros.map((erro, idx) => (
                    <li key={idx} className="text-sm text-foreground">
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
            <details className="border border-info rounded-lg overflow-hidden">
              <summary className="px-4 py-3 bg-info/10 cursor-pointer font-medium text-sm text-info flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Duplicatas ({relatorio.detalhes.duplicatas.length})
                </span>
                <span className="text-xs text-info">Clique para ver detalhes</span>
              </summary>
              <div className="px-4 py-3 bg-card max-h-48 overflow-y-auto">
                <ul className="space-y-2">
                  {relatorio.detalhes.duplicatas.map((dup, idx) => (
                    <li key={idx} className="text-sm text-foreground">
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
            <details className="border border-warning rounded-lg overflow-hidden">
              <summary className="px-4 py-3 bg-warning/10 cursor-pointer font-medium text-sm text-warning flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Avisos ({relatorio.detalhes.avisos.length})
                </span>
                <span className="text-xs text-warning">Clique para ver detalhes</span>
              </summary>
              <div className="px-4 py-3 bg-card max-h-48 overflow-y-auto">
                <ul className="space-y-2">
                  {relatorio.detalhes.avisos.map((aviso, idx) => (
                    <li key={idx} className="text-sm text-foreground">
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
