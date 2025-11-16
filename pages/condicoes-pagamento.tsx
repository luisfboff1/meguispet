import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Plus, 
  Edit, 
  Trash2,
  Loader2,
  CreditCard,
  Calendar,
  X
} from 'lucide-react'
import { condicoesPagamentoService } from '@/services/api'
import type { CondicaoPagamento, CondicaoPagamentoForm } from '@/types'
import Toast from '@/components/ui/Toast'
import AlertDialog from '@/components/ui/AlertDialog'

interface FormState extends CondicaoPagamentoForm {
  dias_input: string // Input field for comma-separated days
}

export default function CondicoesPagamentoPage() {
  const [condicoes, setCondicoes] = useState<CondicaoPagamento[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingCondicao, setEditingCondicao] = useState<CondicaoPagamento | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null)
  const [alert, setAlert] = useState<{ title: string; message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const [formData, setFormData] = useState<FormState>({
    nome: '',
    descricao: '',
    dias_parcelas: [],
    dias_input: '',
    ativo: true,
    ordem: 0
  })

  useEffect(() => {
    loadCondicoes()
  }, [])

  const loadCondicoes = async () => {
    try {
      setLoading(true)
      const response = await condicoesPagamentoService.getAll()
      if (response.success && response.data) {
        setCondicoes(response.data)
      }
    } catch (error) {
      console.error('Erro ao carregar condições de pagamento:', error)
      setToast({ message: 'Erro ao carregar condições de pagamento', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleNovaCondicao = () => {
    setEditingCondicao(null)
    setFormData({
      nome: '',
      descricao: '',
      dias_parcelas: [],
      dias_input: '',
      ativo: true,
      ordem: 0
    })
    setShowForm(true)
  }

  const handleEditarCondicao = (condicao: CondicaoPagamento) => {
    setEditingCondicao(condicao)
    setFormData({
      nome: condicao.nome,
      descricao: condicao.descricao || '',
      dias_parcelas: condicao.dias_parcelas,
      dias_input: condicao.dias_parcelas.join(', '),
      ativo: condicao.ativo,
      ordem: condicao.ordem
    })
    setShowForm(true)
  }

  const parseDiasInput = (input: string): number[] => {
    return input
      .split(',')
      .map(d => d.trim())
      .filter(d => d !== '')
      .map(d => parseInt(d))
      .filter(d => !isNaN(d) && d >= 0)
      .sort((a, b) => a - b)
  }

  const handleSalvarCondicao = async (e: React.FormEvent) => {
    e.preventDefault()

    const dias_parcelas = parseDiasInput(formData.dias_input)

    if (!formData.nome) {
      setAlert({
        title: '❌ Erro de Validação',
        message: 'Nome da condição de pagamento é obrigatório',
        type: 'error',
      })
      return
    }

    if (dias_parcelas.length === 0) {
      setAlert({
        title: '❌ Erro de Validação',
        message: 'Informe ao menos um prazo de pagamento (em dias)',
        type: 'error',
      })
      return
    }

    try {
      setFormLoading(true)
      const payload: CondicaoPagamentoForm = {
        nome: formData.nome,
        descricao: formData.descricao || undefined,
        dias_parcelas,
        ativo: formData.ativo,
        ordem: formData.ordem || 0
      }

      let response
      if (editingCondicao) {
        response = await condicoesPagamentoService.update(editingCondicao.id, payload)
      } else {
        response = await condicoesPagamentoService.create(payload)
      }

      if (response && response.success) {
        await loadCondicoes()
        setShowForm(false)
        setEditingCondicao(null)
        setAlert({
          title: editingCondicao ? '✅ Condição Atualizada' : '✅ Condição Criada',
          message: response.message || (editingCondicao
            ? 'A condição de pagamento foi atualizada com sucesso.'
            : 'A condição de pagamento foi criada com sucesso.'),
          type: 'success',
        })
      } else {
        setAlert({
          title: '❌ Erro ao Salvar',
          message: response?.message || 'Não foi possível salvar a condição de pagamento.',
          type: 'error',
        })
      }
    } catch (error: unknown) {
      let msg = 'Não foi possível salvar a condição de pagamento.'
      if (typeof error === 'object' && error !== null) {
        const errObj = error as { response?: { data?: { message?: string } }, message?: string }
        if (errObj.response?.data?.message) {
          msg = errObj.response.data.message
        } else if (typeof errObj.message === 'string') {
          msg = errObj.message
        }
      }
      setAlert({
        title: '❌ Erro ao Salvar',
        message: msg,
        type: 'error',
      })
      console.error('Erro ao salvar condição:', error)
    } finally {
      setFormLoading(false)
    }
  }

  const handleExcluirCondicao = async (condicao: CondicaoPagamento) => {
    const confirmar = window.confirm(`Deseja realmente excluir a condição "${condicao.nome}"?`)
    if (!confirmar) return

    try {
      setDeletingId(condicao.id)
      const response = await condicoesPagamentoService.delete(condicao.id)
      if (response.success) {
        await loadCondicoes()
        setToast({ message: 'Condição de pagamento excluída com sucesso.', type: 'success' })
      } else {
        setToast({ message: response.message || 'Erro ao excluir condição', type: 'error' })
      }
    } catch (error: unknown) {
      let msg = 'Não foi possível excluir a condição de pagamento.'
      if (typeof error === 'object' && error !== null) {
        const errObj = error as { response?: { data?: { message?: string } }, message?: string }
        if (errObj.response?.data?.message) {
          msg = errObj.response.data.message
        } else if (typeof errObj.message === 'string') {
          msg = errObj.message
        }
      }
      setToast({ message: msg, type: 'error' })
      console.error('Erro ao excluir condição:', error)
    } finally {
      setDeletingId(null)
    }
  }

  const handleToggleAtivo = async (condicao: CondicaoPagamento) => {
    try {
      const response = await condicoesPagamentoService.update(condicao.id, {
        ativo: !condicao.ativo
      })
      if (response.success) {
        await loadCondicoes()
        setToast({ 
          message: `Condição ${!condicao.ativo ? 'ativada' : 'desativada'} com sucesso.`, 
          type: 'success' 
        })
      }
    } catch (error) {
      console.error('Erro ao alterar status:', error)
      setToast({ message: 'Erro ao alterar status da condição', type: 'error' })
    }
  }

  const formatDiasParcelas = (dias: number[]): string => {
    if (dias.length === 0) return '-'
    if (dias.length === 1 && dias[0] === 0) return 'À Vista'
    return dias.map(d => `${d} dias`).join(' / ')
  }

  return (
    <div className="space-y-6">
      {alert && (
        <AlertDialog
          title={alert.title}
          message={alert.message}
          type={alert.type}
          onClose={() => setAlert(null)}
        />
      )}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Condições de Pagamento</h1>
          <p className="text-gray-600">Gerencie os prazos de pagamento disponíveis para vendas</p>
        </div>
        
        <Button 
          className="bg-meguispet-primary hover:bg-meguispet-primary/90"
          onClick={handleNovaCondicao}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova Condição
        </Button>
      </div>

      {/* Lista de Condições */}
      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-meguispet-primary"></div>
          </CardContent>
        </Card>
      ) : condicoes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {condicoes.map(condicao => (
            <Card key={condicao.id} className={!condicao.ativo ? 'opacity-60' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-meguispet-primary" />
                      {condicao.nome}
                      {!condicao.ativo && (
                        <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded">
                          Inativo
                        </span>
                      )}
                    </CardTitle>
                    {condicao.descricao && (
                      <CardDescription className="mt-1 text-sm">
                        {condicao.descricao}
                      </CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">{formatDiasParcelas(condicao.dias_parcelas)}</span>
                </div>
                
                <div className="text-xs text-gray-500">
                  {condicao.dias_parcelas.length === 1 ? '1 parcela' : `${condicao.dias_parcelas.length} parcelas`}
                </div>

                <div className="flex gap-2 pt-2 border-t">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleEditarCondicao(condicao)}
                    className="flex-1"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleToggleAtivo(condicao)}
                    className="flex-1"
                  >
                    {condicao.ativo ? 'Desativar' : 'Ativar'}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleExcluirCondicao(condicao)}
                    disabled={deletingId === condicao.id}
                  >
                    {deletingId === condicao.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CreditCard className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma condição cadastrada</h3>
            <p className="text-gray-600 text-center mb-4">
              Comece adicionando sua primeira condição de pagamento
            </p>
            <Button onClick={handleNovaCondicao}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Condição
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Formulário Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-lg bg-black/20">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <CreditCard className="mr-2 h-5 w-5" />
                  {editingCondicao ? 'Editar Condição de Pagamento' : 'Nova Condição de Pagamento'}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowForm(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription>
                Configure os prazos de pagamento que estarão disponíveis nas vendas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSalvarCondicao} className="space-y-4">
                <div>
                  <Label htmlFor="nome">
                    Nome da Condição <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="nome"
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                    placeholder="Ex: 15/30/45 dias"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Nome descritivo para identificar a condição
                  </p>
                </div>

                <div>
                  <Label htmlFor="descricao">Descrição (Opcional)</Label>
                  <Input
                    id="descricao"
                    type="text"
                    value={formData.descricao}
                    onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                    placeholder="Ex: Parcelado em 3x sem juros"
                  />
                </div>

                <div>
                  <Label htmlFor="dias_input">
                    Dias de Pagamento <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="dias_input"
                    type="text"
                    value={formData.dias_input}
                    onChange={(e) => setFormData(prev => ({ ...prev, dias_input: e.target.value }))}
                    placeholder="Ex: 15, 30, 45 ou 30, 60, 90"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Informe os dias separados por vírgula. Use 0 (zero) para pagamento à vista.
                  </p>
                  {formData.dias_input && (
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                      <p className="font-medium text-blue-900 mb-1">Pré-visualização:</p>
                      <p className="text-blue-700">
                        {formatDiasParcelas(parseDiasInput(formData.dias_input))}
                        {' '}
                        ({parseDiasInput(formData.dias_input).length} 
                        {parseDiasInput(formData.dias_input).length === 1 ? ' parcela' : ' parcelas'})
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="ordem">Ordem de Exibição</Label>
                    <Input
                      id="ordem"
                      type="number"
                      min="0"
                      value={formData.ordem}
                      onChange={(e) => setFormData(prev => ({ ...prev, ordem: Number(e.target.value) }))}
                      placeholder="0"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Menor número aparece primeiro
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 pt-6">
                    <input
                      type="checkbox"
                      id="ativo"
                      checked={formData.ativo}
                      onChange={(e) => setFormData(prev => ({ ...prev, ativo: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <Label htmlFor="ativo" className="cursor-pointer">
                      Condição ativa
                    </Label>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4 border-t">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowForm(false)}
                    disabled={formLoading}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={formLoading}
                  >
                    {formLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      'Salvar Condição'
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
