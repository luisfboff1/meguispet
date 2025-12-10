import React, { useState, useCallback } from 'react'
import { X, Upload, Loader2, ChevronLeft, FileDown } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import FileUploader from '@/components/import/FileUploader'
import ImportConfigForm, { type ImportConfig } from '@/components/import/ImportConfigForm'
import ImportPreviewTable from '@/components/import/ImportPreviewTable'
import ImportResultSummary from '@/components/import/ImportResultSummary'
import { importService, type ClientePreview, type PreviewResponse, type RelatorioImportacao } from '@/services/importService'
import { useRouter } from 'next/router'

interface ClienteImportModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

type Step = 'upload' | 'preview' | 'importing' | 'result'

export default function ClienteImportModal({
  open,
  onClose,
  onSuccess
}: ClienteImportModalProps) {
  const router = useRouter()

  const [step, setStep] = useState<Step>('upload')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [config, setConfig] = useState<ImportConfig>({
    tipo: 'cliente',
    buscarCEP: true,
    duplicatas: 'ignorar'
  })

  const [previewData, setPreviewData] = useState<PreviewResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [relatorio, setRelatorio] = useState<RelatorioImportacao | null>(null)

  // Reset state
  const handleReset = useCallback(() => {
    setStep('upload')
    setSelectedFile(null)
    setPreviewData(null)
    setLoading(false)
    setError(null)
    setRelatorio(null)
  }, [])

  // Close modal
  const handleClose = useCallback(() => {
    handleReset()
    onClose()
  }, [handleReset, onClose])

  // File select
  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file)
    setError(null)
  }, [])

  // Clear file
  const handleClearFile = useCallback(() => {
    setSelectedFile(null)
    setError(null)
  }, [])

  // Analyze file (preview)
  const handleAnalyzeFile = useCallback(async () => {
    if (!selectedFile) return

    try {
      setLoading(true)
      setError(null)

      const response = await importService.preview(selectedFile, config)

      if (response.success && response.data) {
        setPreviewData(response.data)
        setStep('preview')
      } else {
        setError(response.message || 'Erro ao analisar arquivo')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao analisar arquivo')
    } finally {
      setLoading(false)
    }
  }, [selectedFile, config])

  // Toggle select one
  const handleToggleSelect = useCallback((linha: number) => {
    if (!previewData) return

    setPreviewData({
      ...previewData,
      registros: previewData.registros.map(r =>
        r.linha === linha ? { ...r, selecionado: !r.selecionado } : r
      )
    })
  }, [previewData])

  // Toggle select all
  const handleToggleSelectAll = useCallback(() => {
    if (!previewData) return

    const todosSelecionados = previewData.registros.every(r => r.selecionado || r.status === 'erro')

    setPreviewData({
      ...previewData,
      registros: previewData.registros.map(r => ({
        ...r,
        selecionado: r.status !== 'erro' && !todosSelecionados
      }))
    })
  }, [previewData])

  // Execute import
  const handleExecuteImport = useCallback(async () => {
    if (!previewData) return

    const clientesSelecionados = previewData.registros
      .filter(r => r.selecionado)
      .map(r => ({
        ...r.dados.processado,
        linha: r.linha
      }))

    if (clientesSelecionados.length === 0) {
      setError('Nenhum cliente selecionado para importar')
      return
    }

    try {
      setStep('importing')
      setError(null)

      const response = await importService.execute(clientesSelecionados as any, config)

      if (response.success && response.data) {
        setRelatorio(response.data)
        setStep('result')

        // Chamar callback de sucesso
        onSuccess?.()
      } else {
        setError(response.message || 'Erro ao importar clientes')
        setStep('preview')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao importar clientes')
      setStep('preview')
    }
  }, [previewData, config, onSuccess])

  // Download template
  const handleDownloadTemplate = useCallback(async () => {
    try {
      await importService.downloadTemplate()
    } catch (err) {
      setError('Erro ao baixar template')
    }
  }, [])

  // Ver no mapa
  const handleVerMapa = useCallback(() => {
    handleClose()
    router.push('/mapa-clientes')
  }, [handleClose, router])

  // Baixar relatório
  const handleBaixarRelatorio = useCallback(() => {
    if (!relatorio) return

    // Gerar CSV do relatório
    const csvContent = generateRelatorioCSV(relatorio)
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `relatorio-importacao-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [relatorio])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/50">
      <Card className="w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Importar Clientes
              </CardTitle>
              <CardDescription>
                {step === 'upload' && 'Selecione o arquivo CSV para importar'}
                {step === 'preview' && 'Revise os dados antes de importar'}
                {step === 'importing' && 'Importando clientes...'}
                {step === 'result' && 'Resultado da importação'}
              </CardDescription>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              disabled={loading || step === 'importing'}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-6">
              <FileUploader
                onFileSelect={handleFileSelect}
                onClear={handleClearFile}
                selectedFile={selectedFile}
                accept=".csv,.txt"
                maxSizeMB={5}
              />

              {selectedFile && (
                <>
                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Configurações</h3>
                    <ImportConfigForm
                      config={config}
                      onChange={setConfig}
                      disabled={loading}
                    />
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-900 font-medium mb-2">
                        💡 Dica: Baixe o template de exemplo
                      </p>
                      <p className="text-xs text-blue-700 mb-3">
                        Use nosso template para garantir que seu arquivo está no formato correto
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadTemplate}
                        className="text-blue-700 border-blue-300 hover:bg-blue-100"
                      >
                        <FileDown className="w-4 h-4 mr-2" />
                        Baixar Template
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Preview */}
          {step === 'preview' && previewData && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep('upload')}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Voltar
                </Button>

                <div className="text-sm text-gray-600">
                  <span className="font-medium text-gray-900">{previewData.resumo.total}</span> registros encontrados
                </div>
              </div>

              <ImportPreviewTable
                registros={previewData.registros}
                onToggleSelect={handleToggleSelect}
                onToggleSelectAll={handleToggleSelectAll}
              />

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Importing */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 text-meguispet-primary animate-spin mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Importando clientes...</h3>
              <p className="text-sm text-gray-600">Por favor, aguarde. Isso pode levar alguns segundos.</p>
            </div>
          )}

          {/* Step 4: Result */}
          {step === 'result' && relatorio && (
            <ImportResultSummary
              relatorio={relatorio}
              onClose={handleClose}
              onVerMapa={handleVerMapa}
              onBaixarRelatorio={handleBaixarRelatorio}
            />
          )}
        </CardContent>

        {/* Footer com ações */}
        {(step === 'upload' || step === 'preview') && (
          <div className="border-t border-gray-200 p-6 flex-shrink-0">
            <div className="flex items-center justify-between gap-4">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                Cancelar
              </Button>

              {step === 'upload' && (
                <Button
                  onClick={handleAnalyzeFile}
                  disabled={!selectedFile || loading}
                  className="bg-meguispet-primary hover:bg-meguispet-primary/90"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analisando...
                    </>
                  ) : (
                    <>Analisar Arquivo →</>
                  )}
                </Button>
              )}

              {step === 'preview' && previewData && (
                <Button
                  onClick={handleExecuteImport}
                  disabled={loading || previewData.registros.filter(r => r.selecionado).length === 0}
                  className="bg-green-600 hover:bg-green-700"
                >
                  ✅ Importar {previewData.registros.filter(r => r.selecionado).length} clientes
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

/**
 * Gera CSV do relatório de importação
 */
function generateRelatorioCSV(relatorio: RelatorioImportacao): string {
  const lines: string[] = []

  // Header
  lines.push('Status;Linha;Nome;CNPJ/CPF;Mensagem')

  // Importados
  relatorio.detalhes.importados.forEach(item => {
    lines.push(`Importado;${item.linha};${item.nome};${item.cpf_cnpj};Sucesso (ID: ${item.id})`)
  })

  // Duplicatas
  relatorio.detalhes.duplicatas.forEach(item => {
    lines.push(`Duplicata;${item.linha};${item.nome};${item.cpf_cnpj};${item.mensagem}`)
  })

  // Erros
  relatorio.detalhes.erros.forEach(item => {
    lines.push(`Erro;${item.linha};${item.nome};;${item.mensagem}`)
  })

  // Avisos
  relatorio.detalhes.avisos.forEach(item => {
    lines.push(`Aviso;${item.linha};${item.nome};;${item.mensagem}`)
  })

  return '\uFEFF' + lines.join('\n') // BOM para UTF-8
}
