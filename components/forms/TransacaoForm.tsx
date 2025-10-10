import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, Calendar, FileText, Tag, MessageSquare } from 'lucide-react'
import { TransacaoForm as TransacaoFormType } from '@/types'

interface TransacaoFormProps {
  initialData?: Partial<TransacaoFormType>
  onSubmit: (data: TransacaoFormType) => Promise<void>
  onCancel: () => void
  loading?: boolean
  title?: string
}

const categorias = [
  { value: 'Vendas', label: 'Vendas' },
  { value: 'Compras', label: 'Compras' },
  { value: 'Utilidades', label: 'Utilidades' },
  { value: 'Aluguel', label: 'Aluguel' },
  { value: 'Folha', label: 'Folha de Pagamento' },
  { value: 'Marketing', label: 'Marketing' },
  { value: 'Manutenção', label: 'Manutenção' },
  { value: 'Transporte', label: 'Transporte' },
  { value: 'Outros', label: 'Outros' }
]

export function TransacaoForm({ 
  initialData, 
  onSubmit, 
  onCancel, 
  loading = false,
  title = 'Nova Transação'
}: TransacaoFormProps) {
  const [formData, setFormData] = useState<TransacaoFormType>({
    tipo: initialData?.tipo || 'receita',
    valor: initialData?.valor || 0,
    descricao: initialData?.descricao || '',
    categoria: initialData?.categoria || '',
    data_transacao: initialData?.data_transacao || new Date().toISOString().split('T')[0],
    observacoes: initialData?.observacoes || ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleChange = <Key extends keyof TransacaoFormType>(field: Key, value: TransacaoFormType[Key]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Limpar erro quando usuário começar a digitar
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

    if (!formData.categoria) {
      newErrors.categoria = 'Categoria é obrigatória'
    }

    if (!formData.data_transacao) {
      newErrors.data_transacao = 'Data é obrigatória'
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
          <DollarSign className="h-5 w-5" />
          <span>{title}</span>
        </CardTitle>
        <CardDescription>
          Preencha os dados da transação financeira
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
                placeholder="Ex: Venda de ração premium"
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

          {/* Categoria */}
          <div className="space-y-2">
            <Label htmlFor="categoria">Categoria *</Label>
            <div className="relative">
              <Tag className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <select
                id="categoria"
                value={formData.categoria}
                onChange={(e) => handleChange('categoria', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                required
              >
                <option value="">Selecione uma categoria</option>
                {categorias.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
            {errors.categoria && (
              <p className="text-sm text-red-600">{errors.categoria}</p>
            )}
          </div>

          {/* Data */}
          <div className="space-y-2">
            <Label htmlFor="data_transacao">Data *</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="data_transacao"
                type="date"
                value={formData.data_transacao}
                onChange={(e) => handleChange('data_transacao', e.target.value)}
                className="pl-10"
                required
              />
            </div>
            {errors.data_transacao && (
              <p className="text-sm text-red-600">{errors.data_transacao}</p>
            )}
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

          {/* Botões */}
          <div className="flex space-x-4 pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-meguispet-primary hover:bg-meguispet-primary/90"
            >
              {loading ? 'Salvando...' : 'Salvar Transação'}
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
