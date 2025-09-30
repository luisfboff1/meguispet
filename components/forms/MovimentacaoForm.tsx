import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Package, TrendingUp, TrendingDown, User, Building2 } from 'lucide-react'
import { produtosService, clientesService, vendedoresService, fornecedoresService } from '@/services/api'
import type { Produto, Cliente, Vendedor, Fornecedor } from '@/types'

interface MovimentacaoFormProps {
  produto?: Produto
  onSubmit: (movimentacao: any) => void
  onCancel: () => void
  loading?: boolean
  editingData?: any // Dados para edição (opcional)
}

export default function MovimentacaoForm({ produto, onSubmit, onCancel, loading = false, editingData }: MovimentacaoFormProps) {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [loadingProdutos, setLoadingProdutos] = useState(false)
  const [loadingClientes, setLoadingClientes] = useState(false)
  const [loadingVendedores, setLoadingVendedores] = useState(false)
  const [loadingFornecedores, setLoadingFornecedores] = useState(false)
  
  const [formData, setFormData] = useState({
    produto_id: editingData?.produto_id || produto?.id || '',
    tipo_movimentacao: (editingData?.tipo_movimentacao || 'entrada') as 'entrada' | 'saida',
    quantidade: editingData?.quantidade || 0,
    preco_unitario: editingData?.preco_unitario || 0,
    valor_total: editingData?.valor_total || 0,
    cliente_id: editingData?.cliente_id || '', // Para saída (único cliente)
    fornecedor_id: editingData?.fornecedor_id || '', // Para entrada (dropdown)
    vendedor_id: editingData?.vendedor_id || '', // Para saída
    observacoes: editingData?.observacoes || ''
  })

  // Estado para múltiplos produtos (para compras/vendas em lote)
  const [produtosSelecionados, setProdutosSelecionados] = useState<Array<{
    produto_id: number
    quantidade: number
    preco_unitario: number
  }>>(
    editingData?.produtos ? JSON.parse(editingData.produtos) : []
  )
  const [modoMultiplosProdutos, setModoMultiplosProdutos] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  // Calcular valor total automaticamente
  useEffect(() => {
    const total = formData.quantidade * formData.preco_unitario
    setFormData(prev => ({ ...prev, valor_total: total }))
  }, [formData.quantidade, formData.preco_unitario])

  const loadData = async () => {
    await Promise.all([
      loadProdutos(),
      loadClientes(),
      loadVendedores(),
      loadFornecedores()
    ])
  }

  const loadProdutos = async () => {
    try {
      setLoadingProdutos(true)
      const response = await produtosService.getAll(1, 100)
      if (response.success && response.data) {
        setProdutos(response.data)
      }
    } catch (error) {
      console.error('Erro ao carregar produtos:', error)
    } finally {
      setLoadingProdutos(false)
    }
  }

  const loadClientes = async () => {
    try {
      setLoadingClientes(true)
      const response = await clientesService.getAll(1, 100)
      if (response.success && response.data) {
        setClientes(response.data)
      }
    } catch (error) {
      console.error('Erro ao carregar clientes:', error)
    } finally {
      setLoadingClientes(false)
    }
  }

  const loadVendedores = async () => {
    try {
      setLoadingVendedores(true)
      const response = await vendedoresService.getAll(1, 100)
      if (response.success && response.data) {
        setVendedores(response.data)
      }
    } catch (error) {
      console.error('Erro ao carregar vendedores:', error)
    } finally {
      setLoadingVendedores(false)
    }
  }

  const loadFornecedores = async () => {
    try {
      setLoadingFornecedores(true)
      const response = await fornecedoresService.getAll(1, 100)
      if (response.success && response.data) {
        setFornecedores(response.data)
      }
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error)
    } finally {
      setLoadingFornecedores(false)
    }
  }

  const produtoSelecionado = produtos.find(p => p.id === Number(formData.produto_id))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Se for modo múltiplos produtos, incluir os produtos selecionados
    const dataToSubmit = modoMultiplosProdutos 
      ? { ...formData, produtos: JSON.stringify(produtosSelecionados) }
      : formData
    
    onSubmit(dataToSubmit)
  }

  const adicionarProduto = () => {
    if (formData.produto_id && formData.quantidade > 0) {
      const produto = produtos.find(p => p.id === Number(formData.produto_id))
      if (produto) {
        setProdutosSelecionados(prev => [...prev, {
          produto_id: Number(formData.produto_id),
          quantidade: formData.quantidade,
          preco_unitario: formData.preco_unitario
        }])
        
        // Limpar campos para próximo produto
        setFormData(prev => ({
          ...prev,
          produto_id: '',
          quantidade: 0,
          preco_unitario: 0,
          valor_total: 0
        }))
      }
    }
  }

  const removerProduto = (index: number) => {
    setProdutosSelecionados(prev => prev.filter((_, i) => i !== index))
  }

  const calcularTotalProdutos = () => {
    return produtosSelecionados.reduce((total, item) => {
      return total + (item.quantidade * item.preco_unitario)
    }, 0)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  if (loadingProdutos || loadingClientes || loadingVendedores || loadingFornecedores) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Carregando dados...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          {formData.tipo_movimentacao === 'entrada' ? (
            <TrendingUp className="mr-2 h-5 w-5 text-green-600" />
          ) : (
            <TrendingDown className="mr-2 h-5 w-5 text-red-600" />
          )}
          {editingData ? 'Editar' : 'Nova'} Movimentação - {formData.tipo_movimentacao === 'entrada' ? 'Entrada' : 'Saída'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Modo de Seleção de Produto */}
          <div>
            <Label>Seleção de Produto *</Label>
            <div className="flex items-center space-x-4 mb-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={!modoMultiplosProdutos}
                  onChange={() => setModoMultiplosProdutos(false)}
                  className="mr-2"
                />
                Produto único
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={modoMultiplosProdutos}
                  onChange={() => setModoMultiplosProdutos(true)}
                  className="mr-2"
                />
                Múltiplos produtos
              </label>
            </div>

            {!modoMultiplosProdutos ? (
              /* Produto único */
              <div>
                <Label htmlFor="produto_id">Produto *</Label>
                <select
                  id="produto_id"
                  value={formData.produto_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, produto_id: e.target.value }))}
                  className="w-full p-2 border rounded-md"
                  required
                >
                  <option value="">Selecione um produto</option>
                  {produtos.map(produto => (
                    <option key={produto.id} value={produto.id}>
                      {produto.nome} - Estoque: {produto.estoque}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              /* Múltiplos produtos */
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  <div className="md:col-span-2">
                    <Label htmlFor="produto_id">Produto</Label>
                    <select
                      id="produto_id"
                      value={formData.produto_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, produto_id: e.target.value }))}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="">Selecione um produto</option>
                      {produtos.map(produto => (
                        <option key={produto.id} value={produto.id}>
                          {produto.nome} - Estoque: {produto.estoque}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="quantidade">Quantidade</Label>
                    <Input
                      id="quantidade"
                      type="number"
                      min="1"
                      value={formData.quantidade}
                      onChange={(e) => setFormData(prev => ({ ...prev, quantidade: Number(e.target.value) }))}
                      placeholder="Qtd"
                    />
                  </div>
                  <div>
                    <Label htmlFor="preco_unitario">Preço Unit.</Label>
                    <Input
                      id="preco_unitario"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.preco_unitario}
                      onChange={(e) => setFormData(prev => ({ ...prev, preco_unitario: Number(e.target.value) }))}
                      placeholder="0,00"
                    />
                  </div>
                </div>
                
                <Button
                  type="button"
                  onClick={adicionarProduto}
                  disabled={!formData.produto_id || formData.quantidade <= 0}
                  className="w-full"
                >
                  Adicionar Produto
                </Button>

                {/* Lista de produtos selecionados */}
                {produtosSelecionados.length > 0 && (
                  <div className="space-y-2">
                    <Label>Produtos Selecionados:</Label>
                    <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-2">
                      {produtosSelecionados.map((item, index) => {
                        const produto = produtos.find(p => p.id === item.produto_id)
                        return (
                          <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                            <div className="flex-1">
                              <span className="font-medium">{produto?.nome}</span>
                              <span className="text-sm text-gray-600 ml-2">
                                {item.quantidade}x {formatCurrency(item.preco_unitario)} = {formatCurrency(item.quantidade * item.preco_unitario)}
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removerProduto(index)}
                              className="text-red-600 hover:text-red-700"
                            >
                              Remover
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                    
                    {/* Total dos produtos */}
                    <div className="bg-blue-50 p-3 rounded-md">
                      <p className="font-medium text-blue-800">
                        Total: {formatCurrency(calcularTotalProdutos())}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tipo de Movimentação */}
          <div>
            <Label htmlFor="tipo_movimentacao">Tipo de Movimentação *</Label>
            <select
              id="tipo_movimentacao"
              value={formData.tipo_movimentacao}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                tipo_movimentacao: e.target.value as 'entrada' | 'saida',
                cliente_id: '', // Limpar campos ao trocar tipo
                fornecedor_nome: '',
                vendedor_id: ''
              }))}
              className="w-full p-2 border rounded-md"
            >
              <option value="entrada">Entrada (Compra de Fornecedor)</option>
              <option value="saida">Saída (Venda para Cliente)</option>
            </select>
          </div>

          {/* Campos para produto único */}
          {!modoMultiplosProdutos && (
            <>
              {/* Quantidade */}
              <div>
                <Label htmlFor="quantidade">Quantidade *</Label>
                <Input
                  id="quantidade"
                  type="number"
                  min="1"
                  value={formData.quantidade}
                  onChange={(e) => setFormData(prev => ({ ...prev, quantidade: Number(e.target.value) }))}
                  placeholder="Quantidade"
                  required
                />
              </div>

              {/* Preço Unitário */}
              <div>
                <Label htmlFor="preco_unitario">Preço Unitário *</Label>
                <Input
                  id="preco_unitario"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.preco_unitario}
                  onChange={(e) => setFormData(prev => ({ ...prev, preco_unitario: Number(e.target.value) }))}
                  placeholder="0,00"
                  required
                />
              </div>

              {/* Valor Total (calculado automaticamente) */}
              <div>
                <Label htmlFor="valor_total">Valor Total</Label>
                <Input
                  id="valor_total"
                  type="text"
                  value={formatCurrency(formData.valor_total)}
                  disabled
                  className="bg-gray-100 dark:bg-gray-700"
                />
              </div>
            </>
          )}

          {/* Campos Dinâmicos baseados no tipo */}
          {formData.tipo_movimentacao === 'entrada' ? (
            /* Fornecedor para entrada */
            <div>
              <Label htmlFor="fornecedor_id">Fornecedor *</Label>
              <div className="flex items-center space-x-2">
                <Building2 className="h-4 w-4 text-gray-500" />
                <select
                  id="fornecedor_id"
                  value={formData.fornecedor_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, fornecedor_id: e.target.value }))}
                  className="w-full p-2 border rounded-md"
                  required
                >
                  <option value="">Selecione um fornecedor</option>
                  {fornecedores.map(fornecedor => (
                    <option key={fornecedor.id} value={fornecedor.id}>
                      {fornecedor.nome} - {fornecedor.email || fornecedor.telefone}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            /* Cliente e Vendedor para saída */
            <>
              {/* Cliente */}
              <div>
                <Label htmlFor="cliente_id">Cliente *</Label>
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <select
                    id="cliente_id"
                    value={formData.cliente_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, cliente_id: e.target.value }))}
                    className="w-full p-2 border rounded-md"
                    required
                  >
                    <option value="">Selecione um cliente</option>
                    {clientes.map(cliente => (
                      <option key={cliente.id} value={cliente.id}>
                        {cliente.nome} - {cliente.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Vendedor (opcional) */}
              <div>
                <Label htmlFor="vendedor_id">Vendedor Responsável</Label>
                <select
                  id="vendedor_id"
                  value={formData.vendedor_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, vendedor_id: e.target.value }))}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="">Selecione um vendedor (opcional)</option>
                  {vendedores.map(vendedor => (
                    <option key={vendedor.id} value={vendedor.id}>
                      {vendedor.nome} - {vendedor.email}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Observações */}
          <div>
            <Label htmlFor="observacoes">Observações</Label>
            <textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
              placeholder="Observações adicionais"
              className="w-full p-2 border rounded-md h-20 resize-none"
            />
          </div>

          {/* Resumo da Movimentação */}
          {(produtoSelecionado || produtosSelecionados.length > 0) && (
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Resumo da Movimentação:</h4>
              <div className="text-sm space-y-1">
                {!modoMultiplosProdutos ? (
                  /* Resumo para produto único */
                  <>
                    <p><strong>Produto:</strong> {produtoSelecionado?.nome}</p>
                    <p><strong>Estoque Atual:</strong> {produtoSelecionado?.estoque}</p>
                    <p><strong>Tipo:</strong> {formData.tipo_movimentacao === 'entrada' ? 'Entrada' : 'Saída'}</p>
                    <p><strong>Quantidade:</strong> {formData.quantidade}</p>
                    <p><strong>Valor Total:</strong> {formatCurrency(formData.valor_total)}</p>
                  </>
                ) : (
                  /* Resumo para múltiplos produtos */
                  <>
                    <p><strong>Produtos:</strong> {produtosSelecionados.length} item(s)</p>
                    <p><strong>Tipo:</strong> {formData.tipo_movimentacao === 'entrada' ? 'Entrada' : 'Saída'}</p>
                    <p><strong>Valor Total:</strong> {formatCurrency(calcularTotalProdutos())}</p>
                  </>
                )}
                
                {formData.tipo_movimentacao === 'entrada' && (
                  <p><strong>Fornecedor:</strong> {fornecedores.find(f => f.id === Number(formData.fornecedor_id))?.nome || 'Não selecionado'}</p>
                )}
                {formData.tipo_movimentacao === 'saida' && (
                  <>
                    <p><strong>Cliente:</strong> {clientes.find(c => c.id === Number(formData.cliente_id))?.nome || 'Não selecionado'}</p>
                    <p><strong>Vendedor:</strong> {vendedores.find(v => v.id === Number(formData.vendedor_id))?.nome || 'Não informado'}</p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Botões */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-meguispet-primary hover:bg-meguispet-primary/90"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                `${editingData ? 'Atualizar' : 'Salvar'} ${formData.tipo_movimentacao === 'entrada' ? 'Entrada' : 'Saída'}`
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}