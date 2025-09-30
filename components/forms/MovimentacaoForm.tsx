import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X, Plus, Trash2, Search, Package } from 'lucide-react'
import type { MovimentacaoForm as MovimentacaoFormType, Produto, Fornecedor } from '@/types'
import { produtosService, fornecedoresService } from '@/services/api'

interface MovimentacaoFormProps {
  onSubmit: (data: MovimentacaoFormType) => void
  onCancel: () => void
  loading?: boolean
}

interface ItemMovimentacao {
  produto_id: number
  quantidade: number
  preco_unitario: number
  produto?: Produto
}

interface MovimentacaoFormLocal {
  tipo: 'entrada' | 'saida' | 'ajuste'
  fornecedor_id?: number
  numero_pedido?: string
  data_movimentacao: string
  condicao_pagamento: 'avista' | '30dias' | '60dias' | '90dias' | 'emprestimo' | 'cobranca'
  observacoes?: string
  itens: ItemMovimentacao[]
}

export default function MovimentacaoForm({ onSubmit, onCancel, loading = false }: MovimentacaoFormProps) {
  const [formData, setFormData] = useState<MovimentacaoFormLocal>({
    tipo: 'entrada',
    fornecedor_id: undefined,
    numero_pedido: '',
    data_movimentacao: new Date().toISOString().split('T')[0],
    condicao_pagamento: 'avista',
    observacoes: '',
    itens: []
  })

  const [produtos, setProdutos] = useState<Produto[]>([])
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [searchProduto, setSearchProduto] = useState('')
  const [showProdutoSearch, setShowProdutoSearch] = useState(false)
  const [currentItem, setCurrentItem] = useState<ItemMovimentacao>({
    produto_id: 0,
    quantidade: 1,
    preco_unitario: 0
  })

  useEffect(() => {
    loadProdutos()
    loadFornecedores()
  }, [])

  const loadProdutos = async () => {
    try {
      const response = await produtosService.getAll(1, 100)
      if (response.success && response.data) {
        setProdutos(response.data)
      }
    } catch (error) {
      console.error('Erro ao carregar produtos:', error)
    }
  }

  const loadFornecedores = async () => {
    try {
      const response = await fornecedoresService.getAll(1, 100)
      if (response.success && response.data) {
        setFornecedores(response.data)
      }
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.itens.length === 0) {
      alert('Adicione pelo menos um item à movimentação')
      return
    }

    // Converter para o tipo esperado pela API (remover produto dos itens)
    const dataToSubmit: MovimentacaoFormType = {
      ...formData,
      itens: formData.itens.map(item => ({
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario
      }))
    }

    onSubmit(dataToSubmit)
  }

  const handleChange = (field: keyof MovimentacaoFormType, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleCurrentItemChange = (field: keyof ItemMovimentacao, value: any) => {
    setCurrentItem(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const addItem = () => {
    if (!currentItem.produto_id || currentItem.quantidade <= 0 || currentItem.preco_unitario <= 0) {
      alert('Preencha todos os campos do item')
      return
    }

    const produto = produtos.find(p => p.id === currentItem.produto_id)
    
    const newItem = {
      ...currentItem,
      produto
    }

    setFormData(prev => ({
      ...prev,
      itens: [...prev.itens, newItem]
    }))

    setCurrentItem({
      produto_id: 0,
      quantidade: 1,
      preco_unitario: 0
    })
  }

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      itens: prev.itens.filter((_, i) => i !== index)
    }))
  }

  const selectProduto = (produto: Produto) => {
    setCurrentItem(prev => ({
      ...prev,
      produto_id: produto.id,
      preco_unitario: produto.preco_custo // Usar preço de custo para movimentações
    }))
    setShowProdutoSearch(false)
    setSearchProduto('')
  }

  const filteredProdutos = produtos.filter(produto =>
    produto.nome.toLowerCase().includes(searchProduto.toLowerCase()) ||
    produto.codigo_barras?.includes(searchProduto)
  )

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const getTotalValue = () => {
    return formData.itens.reduce((sum, item) => sum + (item.quantidade * item.preco_unitario), 0)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Nova Movimentação</CardTitle>
            <CardDescription>
              Registre entrada, saída ou ajuste de estoque
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Informações Gerais */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo de Movimentação *</Label>
                <select
                  id="tipo"
                  value={formData.tipo}
                  onChange={(e) => handleChange('tipo', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-meguispet-primary focus:border-transparent"
                  required
                >
                  <option value="entrada">Entrada</option>
                  <option value="saida">Saída</option>
                  <option value="ajuste">Ajuste</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="data_movimentacao">Data *</Label>
                <Input
                  id="data_movimentacao"
                  type="date"
                  value={formData.data_movimentacao}
                  onChange={(e) => handleChange('data_movimentacao', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="numero_pedido">Número do Pedido</Label>
                <Input
                  id="numero_pedido"
                  value={formData.numero_pedido}
                  onChange={(e) => handleChange('numero_pedido', e.target.value)}
                  placeholder="Ex: PED-001"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="condicao_pagamento">Condição de Pagamento</Label>
                <select
                  id="condicao_pagamento"
                  value={formData.condicao_pagamento}
                  onChange={(e) => handleChange('condicao_pagamento', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-meguispet-primary focus:border-transparent"
                >
                  <option value="avista">À Vista</option>
                  <option value="30dias">30 Dias</option>
                  <option value="60dias">60 Dias</option>
                  <option value="90dias">90 Dias</option>
                  <option value="emprestimo">Empréstimo</option>
                  <option value="cobranca">Cobrança</option>
                </select>
              </div>
            </div>

            {/* Fornecedor */}
            <div className="space-y-2">
              <Label htmlFor="fornecedor">Fornecedor</Label>
              <div className="flex gap-2">
                <select
                  id="fornecedor"
                  value={formData.fornecedor_id || ''}
                  onChange={(e) => handleChange('fornecedor_id', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-meguispet-primary focus:border-transparent"
                >
                  <option value="">Selecione um fornecedor</option>
                  {fornecedores.map(fornecedor => (
                    <option key={fornecedor.id} value={fornecedor.id}>
                      {fornecedor.nome}
                    </option>
                  ))}
                </select>
                <Button type="button" variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Novo
                </Button>
              </div>
            </div>

            {/* Adicionar Produtos */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Produtos</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border border-gray-200 rounded-lg">
                <div className="space-y-2">
                  <Label>Produto *</Label>
                  <div className="relative">
                    <Input
                      placeholder="Buscar produto..."
                      value={searchProduto}
                      onChange={(e) => setSearchProduto(e.target.value)}
                      onFocus={() => setShowProdutoSearch(true)}
                    />
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    
                    {showProdutoSearch && searchProduto && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {filteredProdutos.map(produto => (
                          <div
                            key={produto.id}
                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center justify-between"
                            onClick={() => selectProduto(produto)}
                          >
                            <div>
                              <div className="font-medium">{produto.nome}</div>
                              <div className="text-sm text-gray-500">
                                Estoque: {produto.estoque} | Custo: {formatCurrency(produto.preco_custo)} | Venda: {formatCurrency(produto.preco_venda)}
                              </div>
                            </div>
                            <Package className="h-4 w-4 text-gray-400" />
                          </div>
                        ))}
                        {filteredProdutos.length === 0 && (
                          <div className="px-4 py-2 text-gray-500">Nenhum produto encontrado</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Quantidade *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={currentItem.quantidade}
                    onChange={(e) => handleCurrentItemChange('quantidade', parseInt(e.target.value) || 0)}
                    placeholder="1"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Preço Unitário *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={currentItem.preco_unitario}
                    onChange={(e) => handleCurrentItemChange('preco_unitario', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Subtotal</Label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm">
                    {formatCurrency(currentItem.quantidade * currentItem.preco_unitario)}
                  </div>
                </div>
              </div>

              <Button
                type="button"
                onClick={addItem}
                className="w-full"
                variant="outline"
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Produto
              </Button>
            </div>

            {/* Lista de Produtos */}
            {formData.itens.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Itens Adicionados</h3>
                
                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">Produto</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">Quantidade</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">Preço Unit.</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">Subtotal</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.itens.map((item, index) => (
                        <tr key={index} className="border-t">
                          <td className="px-4 py-2">
                            <div>
                              <div className="font-medium">{item.produto?.nome || 'Produto não encontrado'}</div>
                              <div className="text-sm text-gray-500">
                                Estoque atual: {item.produto?.estoque || 0}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-2">{item.quantidade}</td>
                          <td className="px-4 py-2">{formatCurrency(item.preco_unitario)}</td>
                          <td className="px-4 py-2 font-medium">{formatCurrency(item.quantidade * item.preco_unitario)}</td>
                          <td className="px-4 py-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(index)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t">
                      <tr>
                        <td colSpan={3} className="px-4 py-2 text-right font-medium">Total:</td>
                        <td className="px-4 py-2 font-bold text-lg">{formatCurrency(getTotalValue())}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Observações */}
            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <textarea
                id="observacoes"
                value={formData.observacoes}
                onChange={(e) => handleChange('observacoes', e.target.value)}
                placeholder="Informações adicionais sobre a movimentação"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-meguispet-primary focus:border-transparent resize-none"
                rows={3}
              />
            </div>

            {/* Botões */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="bg-meguispet-primary hover:bg-meguispet-primary/90"
                disabled={loading || formData.itens.length === 0}
              >
                {loading ? 'Salvando...' : 'Salvar Movimentação'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
