import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tag, Palette, FileText, Type } from 'lucide-react'
import { CategoriaFinanceiraForm as CategoriaFormType } from '@/types'

interface CategoriaFinanceiraFormProps {
  initialData?: Partial<CategoriaFormType>
  onSubmit: (data: CategoriaFormType) => Promise<void>
  onCancel: () => void
  loading?: boolean
  title?: string
}

const presetColors = [
  { value: '#10B981', label: 'Verde' },
  { value: '#EF4444', label: 'Vermelho' },
  { value: '#3B82F6', label: 'Azul' },
  { value: '#F59E0B', label: 'Laranja' },
  { value: '#8B5CF6', label: 'Roxo' },
  { value: '#EC4899', label: 'Rosa' },
  { value: '#6B7280', label: 'Cinza' },
]

export function CategoriaFinanceiraForm({ 
  initialData, 
  onSubmit, 
  onCancel, 
  loading = false,
  title = 'Nova Categoria'
}: CategoriaFinanceiraFormProps) {
  const [formData, setFormData] = useState<CategoriaFormType>({
    nome: initialData?.nome || '',
    tipo: initialData?.tipo || 'ambos',
    cor: initialData?.cor || '#6B7280',
    icone: initialData?.icone || '',
    descricao: initialData?.descricao || '',
    ativo: initialData?.ativo !== false,
    ordem: initialData?.ordem || 0
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleChange = <Key extends keyof CategoriaFormType>(field: Key, value: CategoriaFormType[Key]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (validateForm()) {
      await onSubmit(formData)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Tag className="h-5 w-5" />
          <span>{title}</span>
        </CardTitle>
        <CardDescription>
          Preencha os dados da categoria financeira
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="nome">Nome da Categoria *</Label>
            <div className="relative">
              <Type className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="nome"
                placeholder="Ex: Marketing Digital"
                value={formData.nome}
                onChange={(e) => handleChange('nome', e.target.value)}
                className="pl-10"
                required
              />
            </div>
            {errors.nome && (
              <p className="text-sm text-red-600">{errors.nome}</p>
            )}
          </div>

          {/* Tipo */}
          <div className="space-y-2">
            <Label>Tipo de Categoria</Label>
            <div className="flex space-x-3">
              <Button
                type="button"
                variant={formData.tipo === 'receita' ? 'default' : 'outline'}
                onClick={() => handleChange('tipo', 'receita')}
                className="flex-1"
                size="sm"
              >
                Receita
              </Button>
              <Button
                type="button"
                variant={formData.tipo === 'despesa' ? 'default' : 'outline'}
                onClick={() => handleChange('tipo', 'despesa')}
                className="flex-1"
                size="sm"
              >
                Despesa
              </Button>
              <Button
                type="button"
                variant={formData.tipo === 'ambos' ? 'default' : 'outline'}
                onClick={() => handleChange('tipo', 'ambos')}
                className="flex-1"
                size="sm"
              >
                Ambos
              </Button>
            </div>
          </div>

          {/* Cor */}
          <div className="space-y-2">
            <Label htmlFor="cor">Cor</Label>
            <div className="flex items-center space-x-3">
              <div className="relative flex-1">
                <Palette className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="cor"
                  type="text"
                  placeholder="#6B7280"
                  value={formData.cor}
                  onChange={(e) => handleChange('cor', e.target.value)}
                  className="pl-10"
                />
              </div>
              <div 
                className="w-10 h-10 rounded-md border-2 border-gray-300 dark:border-gray-600"
                style={{ backgroundColor: formData.cor }}
              />
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {presetColors.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => handleChange('cor', color.value)}
                  className="w-8 h-8 rounded-md border-2 border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform"
                  style={{ backgroundColor: color.value }}
                  title={color.label}
                />
              ))}
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <textarea
                id="descricao"
                placeholder="Descrição opcional da categoria"
                value={formData.descricao}
                onChange={(e) => handleChange('descricao', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                rows={3}
              />
            </div>
          </div>

          {/* Status Ativo */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="ativo"
              checked={formData.ativo}
              onChange={(e) => handleChange('ativo', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <Label htmlFor="ativo" className="cursor-pointer">
              Categoria Ativa
            </Label>
          </div>

          {/* Botões */}
          <div className="flex space-x-4 pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-meguispet-primary hover:bg-meguispet-primary/90"
            >
              {loading ? 'Salvando...' : 'Salvar Categoria'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
              className="flex-1"
            >
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
