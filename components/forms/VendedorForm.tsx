import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, User } from 'lucide-react'
import type { Vendedor, VendedorForm as VendedorFormValues } from '@/types'

interface VendedorFormProps {
  vendedor?: Vendedor | null
  onSubmit: (vendedor: VendedorFormValues) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

export default function VendedorForm({ vendedor, onSubmit, onCancel, loading }: VendedorFormProps) {
  const [formData, setFormData] = useState<VendedorFormValues>({
    nome: '',
    email: '',
    telefone: '',
    cpf: '',
    comissao: 0,
    ativo: true,
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (vendedor) {
      setFormData({
        nome: vendedor.nome || '',
        email: vendedor.email || '',
        telefone: vendedor.telefone || '',
        cpf: vendedor.cpf || '',
        comissao: vendedor.comissao || 0,
        ativo: vendedor.ativo ?? true,
      })
    }
  }, [vendedor])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.nome.trim()) {
      alert('❌ Nome do vendedor é obrigatório')
      return
    }

    try {
      setSubmitting(true)
      await onSubmit(formData)
    } catch (error) {
      console.error('Erro ao salvar vendedor:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleChange = (field: keyof VendedorFormValues, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    }
    return numbers.slice(0, 11)
  }

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 11) {
      if (numbers.length <= 10) {
        return numbers
          .replace(/(\d{2})(\d)/, '($1) $2')
          .replace(/(\d{4})(\d)/, '$1-$2')
      }
      return numbers
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2')
    }
    return numbers.slice(0, 11)
  }

  if (loading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-meguispet-primary" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <User className="mr-2 h-5 w-5" />
          {vendedor ? 'Editar Vendedor' : 'Novo Vendedor'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nome */}
          <div>
            <Label htmlFor="nome">
              Nome <span className="text-red-500">*</span>
            </Label>
            <Input
              id="nome"
              type="text"
              value={formData.nome}
              onChange={(e) => handleChange('nome', e.target.value)}
              placeholder="Nome completo do vendedor"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Email */}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>

            {/* Telefone */}
            <div>
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                type="text"
                value={formData.telefone}
                onChange={(e) => handleChange('telefone', formatPhone(e.target.value))}
                placeholder="(00) 00000-0000"
                maxLength={15}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* CPF */}
            <div>
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                type="text"
                value={formData.cpf}
                onChange={(e) => handleChange('cpf', formatCPF(e.target.value))}
                placeholder="000.000.000-00"
                maxLength={14}
              />
            </div>

            {/* Comissão */}
            <div>
              <Label htmlFor="comissao">Comissão (%)</Label>
              <Input
                id="comissao"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.comissao}
                onChange={(e) => handleChange('comissao', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500 mt-1">
                Percentual de comissão sobre vendas
              </p>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center space-x-2">
            <input
              id="ativo"
              type="checkbox"
              checked={formData.ativo}
              onChange={(e) => handleChange('ativo', e.target.checked)}
              className="w-4 h-4 text-meguispet-primary border-gray-300 rounded focus:ring-meguispet-primary"
            />
            <Label htmlFor="ativo" className="cursor-pointer">
              Vendedor ativo
            </Label>
          </div>

          {/* Botões */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-meguispet-primary hover:bg-meguispet-primary/90"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                vendedor ? 'Atualizar Vendedor' : 'Cadastrar Vendedor'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
