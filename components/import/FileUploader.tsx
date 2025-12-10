import React, { useCallback, useState } from 'react'
import { Upload, FileText, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FileUploaderProps {
  onFileSelect: (file: File) => void
  onClear?: () => void
  selectedFile?: File | null
  accept?: string
  maxSizeMB?: number
}

export default function FileUploader({
  onFileSelect,
  onClear,
  selectedFile,
  accept = '.csv,.txt',
  maxSizeMB = 5
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validateFile = useCallback((file: File): string | null => {
    // Validar tamanho
    const maxSizeBytes = maxSizeMB * 1024 * 1024
    if (file.size > maxSizeBytes) {
      return `Arquivo muito grande. Tamanho máximo: ${maxSizeMB}MB`
    }

    // Validar extensão
    const allowedExtensions = accept.split(',').map(ext => ext.trim().toLowerCase())
    const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`

    if (!allowedExtensions.some(ext => fileExtension === ext)) {
      return `Formato não suportado. Use: ${accept}`
    }

    return null
  }, [accept, maxSizeMB])

  const handleFileChange = useCallback((file: File) => {
    setError(null)

    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    onFileSelect(file)
  }, [validateFile, onFileSelect])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileChange(file)
    }
  }, [handleFileChange])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileChange(file)
    }
  }, [handleFileChange])

  const handleClear = useCallback(() => {
    setError(null)
    onClear?.()
  }, [onClear])

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-4">
      {!selectedFile ? (
        <div
          className={`
            relative border-2 border-dashed rounded-lg p-8 text-center transition-all
            ${isDragging
              ? 'border-meguispet-primary bg-meguispet-primary/5'
              : 'border-gray-300 hover:border-meguispet-primary hover:bg-gray-50'
            }
            ${error ? 'border-red-300 bg-red-50' : ''}
          `}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
            type="file"
            accept={accept}
            onChange={handleInputChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />

          <div className="space-y-4">
            <div className="flex justify-center">
              <div className={`
                w-16 h-16 rounded-full flex items-center justify-center
                ${isDragging ? 'bg-meguispet-primary text-white' : 'bg-gray-100 text-gray-400'}
              `}>
                <Upload className="w-8 h-8" />
              </div>
            </div>

            <div>
              <p className="text-base font-medium text-gray-900">
                {isDragging ? 'Solte o arquivo aqui' : 'Arraste o arquivo aqui'}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                ou <span className="text-meguispet-primary font-medium">clique para selecionar</span>
              </p>
            </div>

            <div className="text-xs text-gray-500 space-y-1">
              <p>Formatos aceitos: {accept}</p>
              <p>Tamanho máximo: {maxSizeMB}MB</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg p-4 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-meguispet-primary/10 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-meguispet-primary" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="flex-shrink-0 ml-2"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
    </div>
  )
}
