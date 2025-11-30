import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Info } from 'lucide-react'
import type { UserRole } from '@/types'

interface UsuarioFormData {
  nome: string
  email: string
  password: string
  tipo_usuario: UserRole
}

interface UsuarioFormProps {
  onSubmit: (data: UsuarioFormData) => Promise<void> | void
  onCancel: () => void
  loading?: boolean
  initialData?: {
    id?: number
    nome: string
    email: string
    tipo_usuario?: UserRole
    role?: 'admin' | 'convidado'
  }
  mode?: 'create' | 'edit'
}

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  gerente: 'Gerente',
  vendedor: 'Vendedor',
  financeiro: 'Financeiro',
  estoque: 'Estoque',
  operador: 'Operador',
  visualizador: 'Visualizador'
}

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin: 'Acesso total ao sistema',
  gerente: 'Gestão de equipe e relatórios',
  vendedor: 'Apenas suas vendas e clientes',
  financeiro: 'Módulo financeiro e relatórios',
  estoque: 'Gestão de produtos e estoque',
  operador: 'Operações básicas (PDV)',
  visualizador: 'Apenas visualização (read-only)'
}

export default function UsuarioForm({ onSubmit, onCancel, loading = false, initialData, mode = 'create' }: UsuarioFormProps) {
  const [formData, setFormData] = useState<UsuarioFormData>({
    nome: initialData?.nome || '',
    email: initialData?.email || '',
    password: '',
    tipo_usuario: initialData?.tipo_usuario || initialData?.role as UserRole || 'operador',
  })

  const [errors, setErrors] = useState<Partial<Record<keyof UsuarioFormData, string>>>({})

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof UsuarioFormData, string>> = {}

    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email é obrigatório'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido'
    }

    // Password is required for create mode, optional for edit mode
    if (mode === 'create') {
      if (!formData.password) {
        newErrors.password = 'Senha é obrigatória'
      } else if (formData.password.length < 6) {
        newErrors.password = 'A senha deve ter pelo menos 6 caracteres'
      }
    } else if (mode === 'edit' && formData.password && formData.password.length < 6) {
      // For edit mode, password is optional but if provided must be at least 6 characters
      newErrors.password = 'A senha deve ter pelo menos 6 caracteres'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    await onSubmit(formData)
  }

  const handleRoleChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      tipo_usuario: value as UserRole
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {mode === 'edit' ? 'Editar Usuário' : 'Novo Usuário'}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {mode === 'edit' 
            ? 'Atualize as informações do usuário e suas permissões de acesso'
            : 'Crie um novo usuário e defina suas permissões de acesso'
          }
        </p>
      </div>

      {/* Dados Básicos */}
      <Card>
        <CardHeader>
          <CardTitle>Dados Básicos</CardTitle>
          <CardDescription>Informações de identificação do usuário</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">
              Nome Completo <span className="text-red-500">*</span>
            </Label>
            <Input
              id="nome"
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              placeholder="Digite o nome completo"
              className={errors.nome ? 'border-red-500' : ''}
              disabled={loading}
            />
            {errors.nome && <p className="text-sm text-red-500">{errors.nome}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">
              Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="usuario@exemplo.com"
              className={errors.email ? 'border-red-500' : ''}
              disabled={loading}
            />
            {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
              Senha {mode === 'create' && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder={mode === 'edit' ? 'Deixe em branco para manter a senha atual' : 'Mínimo 6 caracteres'}
              className={errors.password ? 'border-red-500' : ''}
              disabled={loading}
            />
            {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
            {mode === 'edit' && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Deixe em branco para manter a senha atual
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipo_usuario">
              Função <span className="text-red-500">*</span>
            </Label>
            <Select value={formData.tipo_usuario} onValueChange={handleRoleChange} disabled={loading}>
              <SelectTrigger id="tipo_usuario" className="w-full">
                <SelectValue placeholder="Selecione uma função" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ROLE_LABELS) as UserRole[]).map(role => (
                  <SelectItem key={role} value={role}>
                    <div className="flex flex-col">
                      <span className="font-medium">{ROLE_LABELS[role]}</span>
                      <span className="text-xs text-gray-500">{ROLE_DESCRIPTIONS[role]}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Info className="h-3 w-3" />
              Cada função possui permissões pré-definidas. Para permissões avançadas, use a página de gerenciamento de usuários.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading} className="bg-meguispet-primary hover:bg-meguispet-primary/90">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {loading 
            ? (mode === 'edit' ? 'Salvando...' : 'Criando...')
            : (mode === 'edit' ? 'Salvar Alterações' : 'Criar Usuário')
          }
        </Button>
      </div>
    </form>
  )
}
