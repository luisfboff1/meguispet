import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Repeat, DollarSign, Calendar, FileText, MessageSquare, Tag } from 'lucide-react'
import { TransacaoRecorrenteForm as TransacaoRecorrenteFormType, CategoriaFinanceira } from '@/types'
import { categoriasFinanceirasService } from '@/services/api'

interface TransacaoRecorrenteFormProps {
  initialData?: Partial<TransacaoRecorrenteFormType>
  onSubmit: (data: TransacaoRecorrenteFormType) => Promise<void>
  onCancel: () => void
  loading?: boolean
  title?: string
}

const frequenciaOptions = [
  { value: 'diaria', label: 'Diária' },
  { value: 'semanal', label: 'Semanal' },
  { value: 'quinzenal', label: 'Quinzenal' },
  { value: 'mensal', label: 'Mensal' },
  { value: 'bimestral', label: 'Bimestral' },
  { value: 'trimestral', label: 'Trimestral' },
  { value: 'semestral', label: 'Semestral' },
  { value: 'anual', label: 'Anual' },
]

export function TransacaoRecorrenteForm({ 
  initialData, 
  onSubmit, 
  onCancel, 
  loading = false,
  title = 'Nova Transação Recorrente'
}: TransacaoRecorrenteFormProps) {
  const [categorias, setCategorias] = useState<CategoriaFinanceira[]>([])
  const [loadingCategorias, setLoadingCategorias] = useState(false)
  
  const [formData, setFormData] = useState<TransacaoRecorrenteFormType>({
    tipo: initialData?.tipo || 'despesa',
    categoria_id: initialData?.categoria_id,
    descricao: initialData?.descricao || '',
    valor: initialData?.valor || 0,
    frequencia: initialData?.frequencia || 'mensal',
    dia_vencimento: initialData?.dia_vencimento || 1,
    data_inicio: initialData?.data_inicio || new Date().toISOString().split('T')[0],
    data_fim: initialData?.data_fim || '',
    observacoes: initialData?.observacoes || '',
    ativo: initialData?.ativo !== false
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    loadCategorias()
  }, [formData.tipo])

  const loadCategorias = async () => {
    try {
      setLoadingCategorias(true)
      const response = await categoriasFinanceirasService.getAll(formData.tipo)
      if (response.success && response.data) {
        setCategorias(response.data.filter(c => c.ativo))
      }
    } catch (error) {
    } finally {
      setLoadingCategorias(false)
    }
  }

  const handleChange = <Key extends keyof TransacaoRecorrenteFormType>(
    field: Key, 
    value: TransacaoRecorrenteFormType[Key]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.descricao.trim()) {
      newErrors.descricao = 'Descrição é obrigatória'
    }

    if (formData.valor <= 0) {
      newErrors.valor = 'Valor deve ser maior que zero'
    }

    if (!formData.data_inicio) {
      newErrors.data_inicio = 'Data de início é obrigatória'
    }

    if (formData.data_fim && formData.data_inicio) {
      if (new Date(formData.data_fim) < new Date(formData.data_inicio)) {
        newErrors.data_fim = 'Data de término deve ser após a data de início'
      }
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
          <Repeat className="h-5 w-5" />
          <span>{title}</span>
        </CardTitle>
        <CardDescription>
          Configure uma transação que se repetirá automaticamente
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tipo da Transação */}
          <div className="space-y-2">
            <Label>Tipo da Transação</Label>
            <div className="flex space-x-4">
              <Button
                type="button"
                variant={formData.tipo === 'receita' ? 'default' : 'outline'}
                onClick={() => handleChange('tipo', 'receita')}
                className="flex-1"
              >
                Receita
              </Button>
              <Button
                type="button"
                variant={formData.tipo === 'despesa' ? 'default' : 'outline'}
                onClick={() => handleChange('tipo', 'despesa')}
                className="flex-1"
              >
                Despesa
              </Button>
            </div>
          </div>

          {/* Categoria */}
          <div className="space-y-2">
            <Label htmlFor="categoria_id">Categoria</Label>
            <div className="relative">
              <Tag className="absolute left-3 top-3 h-4 w-4 text-gray-400 pointer-events-none z-10" />
              <select
                id="categoria_id"
                value={formData.categoria_id || ''}
                onChange={(e) => handleChange('categoria_id', e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                disabled={loadingCategorias}
              >
                <option value="">Selecione uma categoria (opcional)</option>
                {categorias.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Valor */}
          <div className="space-y-2">
            <Label htmlFor="valor">Valor *</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="valor"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={formData.valor || ''}
                onChange={(e) => handleChange('valor', parseFloat(e.target.value) || 0)}
                className="pl-10"
                required
              />
            </div>
            {errors.valor && (
              <p className="text-sm text-red-600">{errors.valor}</p>
            )}
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição *</Label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="descricao"
                placeholder="Ex: Aluguel mensal da loja"
                value={formData.descricao}
                onChange={(e) => handleChange('descricao', e.target.value)}
                className="pl-10"
                required
              />
            </div>
            {errors.descricao && (
              <p className="text-sm text-red-600">{errors.descricao}</p>
            )}
          </div>

          {/* Frequência */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="frequencia">Frequência *</Label>
              <select
                id="frequencia"
                value={formData.frequencia}
                onChange={(e) => handleChange('frequencia', e.target.value as TransacaoRecorrenteFormType['frequencia'])}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                required
              >
                {frequenciaOptions.map((freq) => (
                  <option key={freq.value} value={freq.value}>
                    {freq.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dia_vencimento">Dia do Vencimento</Label>
              <Input
                id="dia_vencimento"
                type="number"
                min="1"
                max="31"
                placeholder="1"
                value={formData.dia_vencimento || ''}
                onChange={(e) => handleChange('dia_vencimento', parseInt(e.target.value) || 1)}
              />
              <p className="text-xs text-gray-500">
                {formData.frequencia === 'semanal' ? 'Dia da semana (1=Domingo, 7=Sábado)' : 'Dia do mês (1-31)'}
              </p>
            </div>
          </div>

          {/* Datas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data_inicio">Data de Início *</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="data_inicio"
                  type="date"
                  value={formData.data_inicio}
                  onChange={(e) => handleChange('data_inicio', e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
              {errors.data_inicio && (
                <p className="text-sm text-red-600">{errors.data_inicio}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_fim">Data de Término</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="data_fim"
                  type="date"
                  value={formData.data_fim}
                  onChange={(e) => handleChange('data_fim', e.target.value)}
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-gray-500">Deixe vazio para recorrência indefinida</p>
              {errors.data_fim && (
                <p className="text-sm text-red-600">{errors.data_fim}</p>
              )}
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <div className="relative">
              <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <textarea
                id="observacoes"
                placeholder="Informações adicionais (opcional)"
                value={formData.observacoes}
                onChange={(e) => handleChange('observacoes', e.target.value)}
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
              Transação Recorrente Ativa
            </Label>
          </div>

          {/* Botões */}
          <div className="flex space-x-4 pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-meguispet-primary hover:bg-meguispet-primary/90"
            >
              {loading ? 'Salvando...' : 'Salvar Transação Recorrente'}
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
