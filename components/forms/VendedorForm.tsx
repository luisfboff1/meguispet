import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Loader2, User, Link as LinkIcon } from 'lucide-react'
import { usuariosService } from '@/services/api'
import type { Vendedor, VendedorForm as VendedorFormValues, Usuario } from '@/types'

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
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [selectedUsuarioId, setSelectedUsuarioId] = useState<number | null>(null)
  const [loadingUsuarios, setLoadingUsuarios] = useState(false)

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
      // Se vendedor já tem usuario_id, setar o selectedUsuarioId
      if (vendedor.usuario_id && typeof vendedor.usuario_id === 'number') {
        setSelectedUsuarioId(vendedor.usuario_id)
      } else {
        setSelectedUsuarioId(null)
      }
    }
  }, [vendedor])

  // Carregar usuários disponíveis
  useEffect(() => {
    const loadUsuarios = async () => {
      try {
        setLoadingUsuarios(true)
        const response = await usuariosService.getAll(1, 100)

        if (response.success && response.data) {
          // Handle paginated response structure
          if (typeof response.data === 'object' && 'items' in response.data) {
            const items = (response.data as any).items
            setUsuarios(Array.isArray(items) ? items : [])
          } else if (Array.isArray(response.data)) {
            setUsuarios(response.data)
          }
        }
      } catch (error) {
        console.error('Erro ao carregar usuários:', error)
      } finally {
        setLoadingUsuarios(false)
      }
    }

    loadUsuarios()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.nome.trim()) {
      alert('❌ Nome do vendedor é obrigatório')
      return
    }

    try {
      setSubmitting(true)
      // Include usuario_id in the form data
      await onSubmit({
        ...formData,
        usuario_id: selectedUsuarioId,
      })
    } catch (error) {
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

          {/* Vincular Usuário (Opcional) */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-3">
              <LinkIcon className="h-4 w-4 text-meguispet-primary" />
              <Label className="text-base font-semibold">Vincular a Usuário (Opcional)</Label>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Vincule este vendedor a um usuário do sistema para dar acesso ao painel de vendas personalizado.
            </p>
            <Select
              value={(() => {
                // Only use selectedUsuarioId if it exists in the usuarios list
                const usuarioExists = selectedUsuarioId && usuarios.some(u => u.id === selectedUsuarioId)
                return usuarioExists ? selectedUsuarioId.toString() : '0'
              })()}
              onValueChange={(value) => {
                if (value === '0') {
                  // User explicitly selected "no user"
                  setSelectedUsuarioId(null)
                } else if (value === '' || !value) {
                  // Empty string from Select glitch - ignore it, keep current value
                  // Don't update selectedUsuarioId
                } else {
                  // Valid user ID selected
                  const parsedValue = parseInt(value, 10)
                  if (!isNaN(parsedValue)) {
                    setSelectedUsuarioId(parsedValue)
                  }
                }
              }}
              disabled={loadingUsuarios}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingUsuarios ? "Carregando usuários..." : "Selecione um usuário (opcional)"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Nenhum usuário (sem vínculo)</SelectItem>
                {usuarios
                  .filter(u => !u.vendedor_id || u.vendedor_id === vendedor?.id)
                  .map(usuario => (
                    <SelectItem key={usuario.id} value={usuario.id.toString()}>
                      {usuario.nome} ({usuario.email}) - {usuario.tipo_usuario}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {selectedUsuarioId && !isNaN(selectedUsuarioId) && (
              <p className="text-xs text-green-600 mt-2">
                ✓ Vendedor será vinculado ao usuário{' '}
                {usuarios.find(u => u.id === selectedUsuarioId)?.nome || `#${selectedUsuarioId}`}
              </p>
            )}
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
