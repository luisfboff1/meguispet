import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Bell,
  Shield,
  Database,
  Save,
  Eye,
  EyeOff,
  CreditCard,
  Plus,
  Edit,
  Trash2
} from 'lucide-react'
import axios from 'axios'

type ConfiguracoesState = {
  notificacoesEmail: boolean
  notificacoesPush: boolean
  notificacoesEstoque: boolean
  notificacoesVendas: boolean
  autenticacao2FA: boolean
  sessaoTimeout: number
  tema: 'claro' | 'escuro'
  idioma: 'pt-BR' | 'en-US'
  backupAutomatico: boolean
  logsAuditoria: boolean
}

const DEFAULT_CONFIGURACOES: ConfiguracoesState = {
  notificacoesEmail: true,
  notificacoesPush: true,
  notificacoesEstoque: true,
  notificacoesVendas: true,
  autenticacao2FA: false,
  sessaoTimeout: 30,
  tema: 'claro',
  idioma: 'pt-BR',
  backupAutomatico: true,
  logsAuditoria: true
}

interface FormaPagamento {
  id: number
  nome: string
  ordem: number
  ativo: boolean
}

export default function ConfiguracoesPage() {
  const [configuracoes, setConfiguracoes] = useState<ConfiguracoesState>(DEFAULT_CONFIGURACOES)
  const [formasPagamento, setFormasPagamento] = useState<FormaPagamento[]>([])
  const [novaFormaPagamento, setNovaFormaPagamento] = useState('')
  const [editandoForma, setEditandoForma] = useState<FormaPagamento | null>(null)

  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [showSenhas, setShowSenhas] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadFormasPagamento()
  }, [])

  const loadFormasPagamento = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get('/api/formas_pagamento', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.data.success) {
        setFormasPagamento(response.data.data)
      }
    } catch (error) {
    }
  }

  const handleAdicionarFormaPagamento = async () => {
    if (!novaFormaPagamento.trim()) {
      alert('Digite o nome da forma de pagamento')
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await axios.post('/api/formas_pagamento', 
        { 
          nome: novaFormaPagamento,
          ordem: formasPagamento.length + 1
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      if (response.data.success) {
        setNovaFormaPagamento('')
        await loadFormasPagamento()
        alert('Forma de pagamento adicionada com sucesso!')
      }
    } catch (error) {
      alert('Erro ao adicionar forma de pagamento')
    }
  }

  const handleEditarFormaPagamento = async (forma: FormaPagamento) => {
    const novoNome = prompt('Digite o novo nome:', forma.nome)
    if (!novoNome || novoNome === forma.nome) return

    try {
      const token = localStorage.getItem('token')
      const response = await axios.put('/api/formas_pagamento',
        { id: forma.id, nome: novoNome, ordem: forma.ordem },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      if (response.data.success) {
        await loadFormasPagamento()
        alert('Forma de pagamento atualizada com sucesso!')
      }
    } catch (error) {
      alert('Erro ao editar forma de pagamento')
    }
  }

  const handleRemoverFormaPagamento = async (id: number) => {
    if (!confirm('Tem certeza que deseja remover esta forma de pagamento?')) return

    try {
      const token = localStorage.getItem('token')
      const response = await axios.delete(`/api/formas_pagamento?id=${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (response.data.success) {
        await loadFormasPagamento()
        alert('Forma de pagamento removida com sucesso!')
      }
    } catch (error) {
      alert('Erro ao remover forma de pagamento')
    }
  }

  const handleConfigChange = <K extends keyof ConfiguracoesState>(key: K, value: ConfiguracoesState[K]) => {
    setConfiguracoes(prev => ({ ...prev, [key]: value }))
  }

  const handleSalvarConfiguracoes = async () => {
    try {
      setLoading(true)
      // Simular delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      alert('Configurações salvas com sucesso!')
    } catch (error) {
      alert('Erro ao salvar configurações')
    } finally {
      setLoading(false)
    }
  }

  const handleAlterarSenha = async (e: React.FormEvent) => {
    e.preventDefault()
    if (novaSenha !== confirmarSenha) {
      alert('As senhas não coincidem')
      return
    }
    if (novaSenha.length < 6) {
      alert('A senha deve ter pelo menos 6 caracteres')
      return
    }
    
    try {
      setLoading(true)
      // Simular delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      alert('Senha alterada com sucesso!')
      setSenhaAtual('')
      setNovaSenha('')
      setConfirmarSenha('')
    } catch (error) {
      alert('Erro ao alterar senha')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
          <p className="text-gray-600">Personalize seu sistema</p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Notificações */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bell className="mr-2 h-5 w-5" />
              Notificações
            </CardTitle>
            <CardDescription>
              Configure como você deseja receber notificações
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="notificacoesEmail">Notificações por Email</Label>
                <p className="text-sm text-gray-600">Receber notificações por email</p>
              </div>
              <Switch
                id="notificacoesEmail"
                checked={configuracoes.notificacoesEmail}
                onCheckedChange={(checked) => handleConfigChange('notificacoesEmail', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="notificacoesPush">Notificações Push</Label>
                <p className="text-sm text-gray-600">Receber notificações no navegador</p>
              </div>
              <Switch
                id="notificacoesPush"
                checked={configuracoes.notificacoesPush}
                onCheckedChange={(checked) => handleConfigChange('notificacoesPush', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="notificacoesEstoque">Alertas de Estoque</Label>
                <p className="text-sm text-gray-600">Notificar quando estoque estiver baixo</p>
              </div>
              <Switch
                id="notificacoesEstoque"
                checked={configuracoes.notificacoesEstoque}
                onCheckedChange={(checked) => handleConfigChange('notificacoesEstoque', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="notificacoesVendas">Notificações de Vendas</Label>
                <p className="text-sm text-gray-600">Notificar sobre novas vendas</p>
              </div>
              <Switch
                id="notificacoesVendas"
                checked={configuracoes.notificacoesVendas}
                onCheckedChange={(checked) => handleConfigChange('notificacoesVendas', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Segurança */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="mr-2 h-5 w-5" />
              Segurança
            </CardTitle>
            <CardDescription>
              Configure as opções de segurança da sua conta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="autenticacao2FA">Autenticação 2FA</Label>
                <p className="text-sm text-gray-600">Habilitar autenticação de dois fatores</p>
              </div>
              <Switch
                id="autenticacao2FA"
                checked={configuracoes.autenticacao2FA}
                onCheckedChange={(checked) => handleConfigChange('autenticacao2FA', checked)}
              />
            </div>
            
            <div>
              <Label htmlFor="sessaoTimeout">Timeout da Sessão (minutos)</Label>
              <Input
                id="sessaoTimeout"
                type="number"
                value={configuracoes.sessaoTimeout}
                onChange={(e) => handleConfigChange('sessaoTimeout', parseInt(e.target.value))}
                min="5"
                max="480"
              />
            </div>
          </CardContent>
        </Card>

        {/* Alterar Senha */}
        <Card>
          <CardHeader>
            <CardTitle>Alterar Senha</CardTitle>
            <CardDescription>
              Mantenha sua conta segura com uma senha forte
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAlterarSenha} className="space-y-4">
              <div>
                <Label htmlFor="senhaAtual">Senha Atual</Label>
                <div className="relative">
                  <Input
                    id="senhaAtual"
                    type={showSenhas ? "text" : "password"}
                    value={senhaAtual}
                    onChange={(e) => setSenhaAtual(e.target.value)}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowSenhas(!showSenhas)}
                  >
                    {showSenhas ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              <div>
                <Label htmlFor="novaSenha">Nova Senha</Label>
                <Input
                  id="novaSenha"
                  type={showSenhas ? "text" : "password"}
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="confirmarSenha">Confirmar Nova Senha</Label>
                <Input
                  id="confirmarSenha"
                  type={showSenhas ? "text" : "password"}
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  required
                />
              </div>
              
              <Button type="submit" disabled={loading}>
                {loading ? 'Alterando...' : 'Alterar Senha'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Sistema */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="mr-2 h-5 w-5" />
              Sistema
            </CardTitle>
            <CardDescription>
              Configurações do sistema e backup
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="backupAutomatico">Backup Automático</Label>
                <p className="text-sm text-gray-600">Fazer backup automático dos dados</p>
              </div>
              <Switch
                id="backupAutomatico"
                checked={configuracoes.backupAutomatico}
                onCheckedChange={(checked) => handleConfigChange('backupAutomatico', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="logsAuditoria">Logs de Auditoria</Label>
                <p className="text-sm text-gray-600">Registrar atividades do sistema</p>
              </div>
              <Switch
                id="logsAuditoria"
                checked={configuracoes.logsAuditoria}
                onCheckedChange={(checked) => handleConfigChange('logsAuditoria', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Formas de Pagamento */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="mr-2 h-5 w-5" />
              Formas de Pagamento
            </CardTitle>
            <CardDescription>
              Gerencie as formas de pagamento aceitas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Lista de Formas de Pagamento */}
            <div className="space-y-2">
              {formasPagamento.map((forma) => (
                <div key={forma.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="font-medium">{forma.nome}</span>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditarFormaPagamento(forma)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoverFormaPagamento(forma.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Adicionar Nova Forma */}
            <div className="flex space-x-2">
              <Input
                placeholder="Nome da nova forma de pagamento"
                value={novaFormaPagamento}
                onChange={(e) => setNovaFormaPagamento(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAdicionarFormaPagamento()}
              />
              <Button onClick={handleAdicionarFormaPagamento}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Botão Salvar */}
        <div className="flex justify-end">
          <Button onClick={handleSalvarConfiguracoes} disabled={loading}>
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Configurações
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
