import React, { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, AlertCircle, Loader2, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { DataTable, SortableHeader } from '@/components/ui/data-table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ProdutoSelect } from '@/components/forms/ProdutoSelect'
import { blingService } from '@/services/blingService'
import Toast from '@/components/ui/Toast'
import type { BlingProdutoMapeamento, BlingProdutoMapeamentoForm, BlingProdutoNaoMapeado } from '@/types'
import { ColumnDef } from '@tanstack/react-table'

interface MapeamentoItem {
  produto_local_id: number
  quantidade: number
  _tempId?: string  // For React key
  produto?: {
    id: number
    nome: string
    codigo_barras?: string | null
  }
}

interface MapeamentoFormData {
  descricao: string
  codigo?: string | null
  bling_produto_id?: number | null
  observacoes?: string | null
  ativo: boolean
  itens: MapeamentoItem[]
}

export function BlingReferenciasTab() {
  const [mapeamentos, setMapeamentos] = useState<BlingProdutoMapeamento[]>([])
  const [loading, setLoading] = useState(true)
  const [totalMapeamentos, setTotalMapeamentos] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingMapeamento, setEditingMapeamento] = useState<BlingProdutoMapeamento | null>(null)
  const [produtosNaoMapeados, setProdutosNaoMapeados] = useState<BlingProdutoNaoMapeado[]>([])
  const [showNaoMapeados, setShowNaoMapeados] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState<MapeamentoFormData>({
    descricao: '',
    codigo: '',
    bling_produto_id: undefined,
    observacoes: '',
    ativo: true,
    itens: [],
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  // Load mapeamentos
  const loadMapeamentos = async () => {
    try {
      setLoading(true)
      const response = await blingService.getMapeamentos({ page, limit: 50, search, ativo: true })
      if (response.success && response.data) {
        setMapeamentos(response.data)
        setTotalMapeamentos(response.pagination?.total || 0)
      }
    } catch (err) {
      console.error('Erro ao carregar mapeamentos:', err)
      setToast({ message: 'Erro ao carregar mapeamentos', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  // Load produtos não mapeados
  const loadProdutosNaoMapeados = async () => {
    try {
      const response = await blingService.getProdutosNaoMapeados()
      if (response.success && response.data) {
        setProdutosNaoMapeados(response.data)
      }
    } catch (err) {
      console.error('Erro ao carregar produtos não mapeados:', err)
    }
  }

  useEffect(() => {
    loadMapeamentos()
  }, [page, search])

  useEffect(() => {
    loadProdutosNaoMapeados()
  }, [])

  // Open modal for creating new mapeamento
  const handleNovoMapeamento = () => {
    setEditingMapeamento(null)
    setFormData({
      descricao: '',
      codigo: null,
      bling_produto_id: null,
      observacoes: null,
      ativo: true,
      itens: [],
    })
    setFormErrors({})
    setShowModal(true)
  }

  // Open modal for editing
  const handleEditMapeamento = (mapeamento: BlingProdutoMapeamento) => {
    setEditingMapeamento(mapeamento)
    setFormData({
      descricao: mapeamento.descricao,
      codigo: mapeamento.codigo || null,
      bling_produto_id: mapeamento.bling_produto_id || null,
      observacoes: mapeamento.observacoes || null,
      ativo: mapeamento.ativo,
      itens: (mapeamento.itens || []).map(item => ({
        produto_local_id: item.produto_local_id,
        quantidade: item.quantidade,
        produto: item.produto,
        _tempId: Math.random().toString(36),
      })),
    })
    setFormErrors({})
    setShowModal(true)
  }

  // Add item to form
  const handleAddItem = () => {
    setFormData((prev) => ({
      ...prev,
      itens: [...prev.itens, { produto_local_id: 0, quantidade: 1, _tempId: Math.random().toString(36) }],
    }))
  }

  // Remove item from form
  const handleRemoveItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      itens: prev.itens.filter((_, i) => i !== index),
    }))
  }

  // Update item in form
  const handleUpdateItem = (index: number, field: 'produto_local_id' | 'quantidade', value: number, produto?: any) => {
    setFormData((prev) => {
      const newItens = [...prev.itens]
      newItens[index] = { ...newItens[index], [field]: value }
      if (field === 'produto_local_id' && produto) {
        newItens[index].produto = produto
      }
      return { ...prev, itens: newItens }
    })
  }

  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!formData.descricao.trim()) {
      errors.descricao = 'Descrição é obrigatória'
    }

    if (formData.itens.length === 0) {
      errors.itens = 'Adicione ao menos um produto local'
    }

    for (let i = 0; i < formData.itens.length; i++) {
      const item = formData.itens[i]
      if (!item.produto_local_id || item.produto_local_id === 0) {
        errors[`item_${i}_produto`] = 'Selecione um produto'
      }
      if (!item.quantidade || item.quantidade <= 0) {
        errors[`item_${i}_quantidade`] = 'Quantidade deve ser maior que zero'
      }
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Save mapeamento
  const handleSave = async () => {
    if (!validateForm()) return

    try {
      setSaving(true)
      
      // Convert form data to API format (remove temporary fields)
      const apiData: BlingProdutoMapeamentoForm = {
        ...formData,
        itens: formData.itens.map(({ produto_local_id, quantidade }) => ({
          produto_local_id,
          quantidade,
        })),
      }
      
      if (editingMapeamento) {
        // Update
        await blingService.updateMapeamento(editingMapeamento.id, apiData)
        setToast({ message: 'Mapeamento atualizado com sucesso', type: 'success' })
      } else {
        // Create
        await blingService.createMapeamento(apiData)
        setToast({ message: 'Mapeamento criado com sucesso', type: 'success' })
      }

      setShowModal(false)
      loadMapeamentos()
      loadProdutosNaoMapeados()
    } catch (err: any) {
      console.error('Erro ao salvar mapeamento:', err)
      setToast({ 
        message: err.response?.data?.message || 'Erro ao salvar mapeamento', 
        type: 'error' 
      })
    } finally {
      setSaving(false)
    }
  }

  // Delete mapeamento
  const handleDelete = async (id: number) => {
    if (!confirm('Deseja realmente desativar este mapeamento?')) return

    try {
      await blingService.deleteMapeamento(id)
      setToast({ message: 'Mapeamento desativado com sucesso', type: 'success' })
      loadMapeamentos()
      loadProdutosNaoMapeados()
    } catch (err) {
      console.error('Erro ao deletar mapeamento:', err)
      setToast({ message: 'Erro ao deletar mapeamento', type: 'error' })
    }
  }

  // Quick create from não mapeado
  const handleQuickCreate = (produto: BlingProdutoNaoMapeado) => {
    console.log('Quick create produto:', produto) // Debug
    setEditingMapeamento(null)
    
    // Usar codigo_produto se disponível, senão usar bling_produto_id como fallback
    const codigo = produto.codigo_produto || (produto.bling_produto_id ? String(produto.bling_produto_id) : null)
    
    setFormData({
      descricao: produto.descricao,
      codigo: codigo,
      bling_produto_id: produto.bling_produto_id || null,
      observacoes: '',
      ativo: true,
      itens: [],
    })
    setFormErrors({})
    setShowNaoMapeados(false)
    setShowModal(true)
  }

  // Table columns
  const columns: ColumnDef<BlingProdutoMapeamento>[] = [
    {
      accessorKey: 'codigo',
      header: 'Código',
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.original.codigo || '-'}</span>
      ),
    },
    {
      accessorKey: 'descricao',
      header: 'Descrição Bling',
      cell: ({ row }) => (
        <div className="max-w-md">
          <div className="font-medium">{row.original.descricao}</div>
          {row.original.observacoes && (
            <div className="text-sm text-gray-500 truncate">{row.original.observacoes}</div>
          )}
        </div>
      ),
    },
    {
      id: 'produtos_locais',
      header: 'Produtos Locais',
      cell: ({ row }) => {
        const count = row.original.itens?.length || 0
        return (
          <Badge variant="secondary">
            {count} {count === 1 ? 'produto' : 'produtos'}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'ativo',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.ativo ? 'default' : 'secondary'}>
          {row.original.ativo ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Ações',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleEditMapeamento(row.original)}
          >
            <Edit2 className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleDelete(row.original.id)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ),
    },
  ]

  const totalMapeados = mapeamentos.length
  const totalNaoMapeados = produtosNaoMapeados.length

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500">Total Mapeados</div>
            <div className="text-2xl font-bold">{totalMapeamentos}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500">Não Mapeados</div>
            <div className="text-2xl font-bold text-orange-600">{totalNaoMapeados}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500">Última Atualização</div>
            <div className="text-sm font-medium">
              {mapeamentos[0]?.updated_at 
                ? new Date(mapeamentos[0].updated_at).toLocaleDateString('pt-BR')
                : '-'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Buscar por descrição ou código..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button onClick={handleNovoMapeamento}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Mapeamento
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowNaoMapeados(!showNaoMapeados)}
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              Não Mapeados ({totalNaoMapeados})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Produtos Não Mapeados */}
      {showNaoMapeados && (
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Produtos Não Mapeados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {produtosNaoMapeados.length === 0 ? (
              <p className="text-gray-500">Todos os produtos estão mapeados! 🎉</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {produtosNaoMapeados.map((produto, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{produto.descricao}</div>
                      <div className="text-sm text-gray-500">
                        {produto.codigo_produto && `Código: ${produto.codigo_produto}`}
                        {!produto.codigo_produto && produto.bling_produto_id && `ID Bling: ${produto.bling_produto_id}`}
                        {produto.ocorrencias && ` • ${produto.ocorrencias} ocorrência(s)`}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleQuickCreate(produto)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Mapear
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Mapeamentos Table */}
      <Card>
        <CardContent className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <DataTable columns={columns} data={mapeamentos} />
          )}
        </CardContent>
      </Card>

      {/* Modal de Criação/Edição */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingMapeamento ? 'Editar Mapeamento' : 'Novo Mapeamento'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Produto no Bling */}
            <div className="p-4 bg-gray-50 rounded-lg space-y-3">
              <h3 className="font-medium text-sm text-gray-700">Produto no Bling</h3>
              
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Código / ID Bling</label>
                <Input
                  value={formData.codigo || ''}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                  placeholder="Código ou ID do produto no Bling"
                  className="font-mono"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Código do produto ou ID Bling para identificação
                </p>
              </div>

              <div>
                <label className="text-sm text-gray-600 mb-1 block">Descrição *</label>
                <Input
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descrição do produto no Bling"
                  className={formErrors.descricao ? 'border-red-500' : ''}
                />
                {formErrors.descricao && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.descricao}</p>
                )}
              </div>
            </div>

            {/* Produtos Locais */}
<div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm text-gray-700">Produtos Locais *</h3>
                <Button size="sm" variant="outline" onClick={handleAddItem}>
                  <Plus className="h-3 w-3 mr-1" />
                  Adicionar Produto
                </Button>
              </div>

              {formErrors.itens && (
                <p className="text-red-500 text-sm">{formErrors.itens}</p>
              )}

              {formData.itens.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">
                  Nenhum produto local adicionado
                </p>
              ) : (
                <div className="space-y-2">
                  {formData.itens.map((item, index) => (
                    <div key={item._tempId || index} className="flex gap-2 items-start p-3 border rounded-lg">
                      <div className="flex-1">
                        <ProdutoSelect
                          value={item.produto_local_id || null}
                          onChange={(id, produto) => handleUpdateItem(index, 'produto_local_id', id || 0, produto)}
                          placeholder="Selecionar produto..."
                          error={!!formErrors[`item_${index}_produto`]}
                        />
                        {formErrors[`item_${index}_produto`] && (
                          <p className="text-red-500 text-xs mt-1">{formErrors[`item_${index}_produto`]}</p>
                        )}
                      </div>

                      <div className="w-28">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.quantidade}
                          onChange={(e) => handleUpdateItem(index, 'quantidade', parseFloat(e.target.value) || 0)}
                          placeholder="Qtd"
                          className={formErrors[`item_${index}_quantidade`] ? 'border-red-500' : ''}
                        />
                        {formErrors[`item_${index}_quantidade`] && (
                          <p className="text-red-500 text-xs mt-1">{formErrors[`item_${index}_quantidade`]}</p>
                        )}
                      </div>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveItem(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Observações */}
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Observações</label>
              <textarea
                value={formData.observacoes || ''}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                placeholder="Notas sobre este mapeamento..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>

            {/* Ativo */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="ativo"
                checked={formData.ativo}
                onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="ativo" className="text-sm cursor-pointer">
                Mapeamento ativo
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowModal(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Mapeamento'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}
