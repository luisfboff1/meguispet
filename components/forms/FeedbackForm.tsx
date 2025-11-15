import React, { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { X, Upload, ImagePlus, AlertCircle } from 'lucide-react'
import type { FeedbackTicketForm, FeedbackTipo, FeedbackPrioridade } from '@/types'

interface FeedbackFormProps {
  onSubmit: (data: FeedbackTicketForm) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

const tipoOptions: { value: FeedbackTipo; label: string; description: string }[] = [
  {
    value: 'bug',
    label: 'Correção de Bug',
    description: 'Reportar um erro ou comportamento inesperado'
  },
  {
    value: 'melhoria',
    label: 'Sugestão de Melhoria',
    description: 'Melhorar uma funcionalidade existente'
  },
  {
    value: 'funcionalidade',
    label: 'Nova Funcionalidade',
    description: 'Sugerir uma nova funcionalidade'
  },
  {
    value: 'outro',
    label: 'Outro',
    description: 'Outro tipo de feedback'
  }
]

const prioridadeOptions: { value: FeedbackPrioridade; label: string; color: string }[] = [
  { value: 'baixa', label: 'Baixa', color: 'text-slate-600' },
  { value: 'media', label: 'Média', color: 'text-blue-600' },
  { value: 'alta', label: 'Alta', color: 'text-orange-600' },
  { value: 'critica', label: 'Crítica', color: 'text-red-600' }
]

export default function FeedbackForm({ onSubmit, onCancel, loading = false }: FeedbackFormProps) {
  const [formData, setFormData] = useState<FeedbackTicketForm>({
    titulo: '',
    descricao: '',
    tipo: 'bug',
    prioridade: 'media',
    anexos: [],
    imagens_coladas: []
  })
  const [error, setError] = useState<string | null>(null)
  const [pastedImages, setPastedImages] = useState<string[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const descricaoRef = useRef<HTMLTextAreaElement>(null)

  // Handle paste event for images
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault()
        const blob = item.getAsFile()
        if (blob) {
          const reader = new FileReader()
          reader.onload = (event) => {
            const base64 = event.target?.result as string
            // Extract base64 without data URL prefix
            const base64Data = base64.split(',')[1]
            setPastedImages((prev) => [...prev, base64Data])
            setFormData((prev) => ({
              ...prev,
              imagens_coladas: [...(prev.imagens_coladas || []), base64Data]
            }))
          }
          reader.readAsDataURL(blob)
        }
      }
    }
  }, [])

  // Handle file upload
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setUploadedFiles((prev) => [...prev, ...files])
    setFormData((prev) => ({
      ...prev,
      anexos: [...(prev.anexos || []), ...files]
    }))
  }

  // Remove pasted image
  const removePastedImage = (index: number) => {
    setPastedImages((prev) => prev.filter((_, i) => i !== index))
    setFormData((prev) => ({
      ...prev,
      imagens_coladas: prev.imagens_coladas?.filter((_, i) => i !== index)
    }))
  }

  // Remove uploaded file
  const removeUploadedFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
    setFormData((prev) => ({
      ...prev,
      anexos: prev.anexos?.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!formData.titulo.trim()) {
      setError('O título é obrigatório')
      return
    }

    if (!formData.descricao.trim()) {
      setError('A descrição é obrigatória')
      return
    }

    try {
      await onSubmit(formData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar feedback')
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          Criar Feedback
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Reporte bugs, sugira melhorias ou novas funcionalidades
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-300">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="space-y-4">
        {/* Tipo de Feedback */}
        <div className="space-y-2">
          <Label htmlFor="tipo">Tipo de Feedback *</Label>
          <Select
            value={formData.tipo}
            onValueChange={(value: FeedbackTipo) =>
              setFormData((prev) => ({ ...prev, tipo: value }))
            }
          >
            <SelectTrigger id="tipo">
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              {tipoOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div>
                    <div className="font-medium">{option.label}</div>
                    <div className="text-xs text-slate-500">{option.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Prioridade */}
        <div className="space-y-2">
          <Label htmlFor="prioridade">Prioridade</Label>
          <Select
            value={formData.prioridade}
            onValueChange={(value: FeedbackPrioridade) =>
              setFormData((prev) => ({ ...prev, prioridade: value }))
            }
          >
            <SelectTrigger id="prioridade">
              <SelectValue placeholder="Selecione a prioridade" />
            </SelectTrigger>
            <SelectContent>
              {prioridadeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <span className={option.color}>{option.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Título */}
        <div className="space-y-2">
          <Label htmlFor="titulo">Título *</Label>
          <Input
            id="titulo"
            type="text"
            value={formData.titulo}
            onChange={(e) => setFormData((prev) => ({ ...prev, titulo: e.target.value }))}
            placeholder="Resuma o feedback em uma linha"
            disabled={loading}
            required
          />
        </div>

        {/* Descrição */}
        <div className="space-y-2">
          <Label htmlFor="descricao">Descrição *</Label>
          <Textarea
            ref={descricaoRef}
            id="descricao"
            value={formData.descricao}
            onChange={(e) => setFormData((prev) => ({ ...prev, descricao: e.target.value }))}
            onPaste={handlePaste}
            placeholder="Descreva o feedback em detalhes. Você pode colar imagens (Ctrl+V) aqui..."
            rows={6}
            disabled={loading}
            required
          />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            💡 Dica: Você pode colar imagens diretamente no campo de descrição (Ctrl+V após copiar uma captura de tela)
          </p>
        </div>

        {/* Imagens Coladas */}
        {pastedImages.length > 0 && (
          <div className="space-y-2">
            <Label>Imagens Coladas</Label>
            <div className="grid grid-cols-2 gap-3">
              {pastedImages.map((base64, index) => (
                <div
                  key={index}
                  className="group relative overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`data:image/png;base64,${base64}`}
                    alt={`Imagem colada ${index + 1}`}
                    className="h-32 w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePastedImage(index)}
                    className="absolute right-2 top-2 rounded-full bg-red-500 p-1 text-white opacity-0 transition hover:bg-red-600 group-hover:opacity-100"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload de Arquivos */}
        <div className="space-y-2">
          <Label>Anexar Arquivos</Label>
          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
              disabled={loading}
            >
              <Upload size={16} className="mr-2" />
              Selecionar Arquivos
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.txt"
            />
          </div>

          {/* Lista de Arquivos */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-2">
              {uploadedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800"
                >
                  <div className="flex items-center gap-3">
                    <ImagePlus size={18} className="text-slate-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {file.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeUploadedFile(index)}
                    className="rounded-full p-1 text-red-500 transition hover:bg-red-100 dark:hover:bg-red-900/20"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Criando...' : 'Criar Feedback'}
        </Button>
      </div>
    </form>
  )
}
