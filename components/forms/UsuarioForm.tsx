import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

interface UsuarioFormData {
  nome: string
  email: string
  password: string
  role: 'admin' | 'convidado'
  permissoes: {
    clientes: boolean
    produtos: boolean
    vendas: boolean
    estoque: boolean
    financeiro: boolean
    relatorios: boolean
    configuracoes: boolean
  }
}

interface UsuarioFormProps {
  onSubmit: (data: UsuarioFormData) => Promise<void> | void
  onCancel: () => void
  loading?: boolean
}

export default function UsuarioForm({ onSubmit, onCancel, loading = false }: UsuarioFormProps) {
  const [formData, setFormData] = useState<UsuarioFormData>({
    nome: '',
    email: '',
    password: '',
    role: 'convidado',
    permissoes: {
      clientes: false,
      produtos: false,
      vendas: false,
      estoque: false,
      financeiro: false,
      relatorios: false,
      configuracoes: false,
    },
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

    if (!formData.password) {
      newErrors.password = 'Senha é obrigatória'
    } else if (formData.password.length < 6) {
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

  const togglePermission = (key: keyof UsuarioFormData['permissoes']) => {
    setFormData(prev => ({
      ...prev,
      permissoes: {
        ...prev.permissoes,
        [key]: !prev.permissoes[key],
      },
    }))
  }

  const selectAllPermissions = () => {
    setFormData(prev => ({
      ...prev,
      permissoes: {
        clientes: true,
        produtos: true,
        vendas: true,
        estoque: true,
        financeiro: true,
        relatorios: true,
        configuracoes: true,
      },
    }))
  }

  const deselectAllPermissions = () => {
    setFormData(prev => ({
      ...prev,
      permissoes: {
        clientes: false,
        produtos: false,
        vendas: false,
        estoque: false,
        financeiro: false,
        relatorios: false,
        configuracoes: false,
      },
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Novo Usuário</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Crie um novo usuário e defina suas permissões de acesso
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
              Senha <span className="text-red-500">*</span>
            </Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Mínimo 6 caracteres"
              className={errors.password ? 'border-red-500' : ''}
              disabled={loading}
            />
            {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">
              Função <span className="text-red-500">*</span>
            </Label>
            <select
              id="role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'convidado' })}
              className="w-full p-2 border rounded-md dark:bg-slate-900 dark:border-slate-700"
              disabled={loading}
            >
              <option value="convidado">Convidado</option>
              <option value="admin">Administrador</option>
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Administradores têm acesso completo ao sistema
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Permissões */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Permissões de Acesso</CardTitle>
              <CardDescription>Defina quais módulos o usuário pode acessar</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={selectAllPermissions}
                disabled={loading}
              >
                Selecionar Todas
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={deselectAllPermissions}
                disabled={loading}
              >
                Limpar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries({
              clientes: 'Clientes',
              produtos: 'Produtos',
              vendas: 'Vendas',
              estoque: 'Estoque',
              financeiro: 'Financeiro',
              relatorios: 'Relatórios',
              configuracoes: 'Configurações',
            }).map(([key, label]) => (
              <div key={key} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id={key}
                  checked={formData.permissoes[key as keyof UsuarioFormData['permissoes']]}
                  onChange={() => togglePermission(key as keyof UsuarioFormData['permissoes'])}
                  disabled={loading}
                  className="w-4 h-4 text-meguispet-primary border-gray-300 rounded focus:ring-meguispet-primary"
                />
                <Label
                  htmlFor={key}
                  className="text-sm font-medium leading-none cursor-pointer"
                >
                  {label}
                </Label>
              </div>
            ))}
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
          {loading ? 'Criando...' : 'Criar Usuário'}
        </Button>
      </div>
    </form>
  )
}
