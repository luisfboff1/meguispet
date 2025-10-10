import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Package, TrendingUp, TrendingDown, User, Building2 } from 'lucide-react'
import { produtosService, clientesService, vendedoresService, fornecedoresService } from '@/services/api'
import type {
  Produto,
  Cliente,
  Vendedor,
  Fornecedor,
  MovimentacaoForm as MovimentacaoFormValues,
  MovimentacaoProdutoItem,
  MovimentacaoEstoque
} from '@/types'

interface MovimentacaoFormProps {
  produto?: Produto
  onSubmit: (movimentacao: MovimentacaoFormValues) => Promise<void> | void
  onCancel: () => void
  loading?: boolean
  editingData?: MovimentacaoEstoque & { produtos?: string }
}

interface MovimentacaoFormState {
  tipo_movimentacao: 'entrada' | 'saida'
  cliente_id: string
  fornecedor_id: string
  vendedor_id: string
  observacoes: string
}

interface ProdutoAtualState {
  produto_id: string
  quantidade: number
  preco_unitario: number
  valor_total: number
}

const getInitialProdutosLista = (editingData?: MovimentacaoFormProps['editingData']): MovimentacaoProdutoItem[] => {
  if (!editingData) return []

  if (editingData.produtos) {
    try {
      const parsed = JSON.parse(editingData.produtos) as MovimentacaoProdutoItem[]
      return parsed.map(item => ({
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario,
        valor_total: item.valor_total ?? item.quantidade * item.preco_unitario,
        produto_nome: item.produto_nome
      }))
    } catch (error) {
      console.warn('Não foi possível converter produtos da movimentação para edição:', error)
      return []
    }
  }

  if (editingData.itens?.length) {
    return editingData.itens.map(item => ({
      produto_id: item.produto_id,
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario,
      valor_total: item.subtotal,
      produto_nome: item.produto?.nome
    }))
  }

  return []
}

const getInitialFormState = (editingData?: MovimentacaoFormProps['editingData']): MovimentacaoFormState => ({
  tipo_movimentacao: editingData?.tipo === 'saida' ? 'saida' : 'entrada',
  cliente_id: editingData?.cliente_id ? String(editingData.cliente_id) : '',
  fornecedor_id: editingData?.fornecedor_id ? String(editingData.fornecedor_id) : '',
  vendedor_id: editingData?.vendedor_id ? String(editingData.vendedor_id) : '',
  observacoes: editingData?.observacoes || ''
})

export default function MovimentacaoForm({ produto, onSubmit, onCancel, loading = false, editingData }: MovimentacaoFormProps) {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [loadingProdutos, setLoadingProdutos] = useState(false)
  const [loadingClientes, setLoadingClientes] = useState(false)
  const [loadingVendedores, setLoadingVendedores] = useState(false)
  const [loadingFornecedores, setLoadingFornecedores] = useState(false)
  
  const [formData, setFormData] = useState<MovimentacaoFormState>(getInitialFormState(editingData))

  // Estado para o produto atual sendo adicionado
  const [produtoAtual, setProdutoAtual] = useState<ProdutoAtualState>({
    produto_id: '',
    quantidade: 1,
    preco_unitario: 0,
    valor_total: 0
  })

  // Estado para lista de produtos adicionados
  const [produtosLista, setProdutosLista] = useState<MovimentacaoProdutoItem[]>(getInitialProdutosLista(editingData))


  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    setFormData(getInitialFormState(editingData))
    setProdutosLista(getInitialProdutosLista(editingData))
  }, [editingData])

  // Calcular valor total automaticamente do produto atual
  useEffect(() => {
    const total = produtoAtual.quantidade * produtoAtual.preco_unitario
    setProdutoAtual(prev => ({ ...prev, valor_total: total }))
  }, [produtoAtual.quantidade, produtoAtual.preco_unitario])

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


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload: MovimentacaoFormValues = {
      tipo_movimentacao: formData.tipo_movimentacao,
      observacoes: formData.observacoes || undefined,
      produtos: produtosLista.map(item => ({
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario,
        valor_total: item.valor_total,
        produto_nome: item.produto_nome
      }))
    }

    if (formData.tipo_movimentacao === 'entrada') {
      payload.fornecedor_id = formData.fornecedor_id ? Number(formData.fornecedor_id) : undefined
    } else {
      payload.cliente_id = formData.cliente_id ? Number(formData.cliente_id) : undefined
      payload.vendedor_id = formData.vendedor_id ? Number(formData.vendedor_id) : undefined
    }

    onSubmit(payload)
  }

  const adicionarProduto = () => {
    if (produtoAtual.produto_id && produtoAtual.quantidade > 0) {
      const produto = produtos.find(p => p.id === Number(produtoAtual.produto_id))
      if (produto) {
        const novoProduto = {
          produto_id: Number(produtoAtual.produto_id),
          quantidade: produtoAtual.quantidade,
          preco_unitario: produtoAtual.preco_unitario,
          valor_total: produtoAtual.valor_total,
          produto_nome: produto.nome
        }
        
        setProdutosLista(prev => [...prev, novoProduto])
        
        // Limpar campos para próximo produto
        setProdutoAtual({
          produto_id: '',
          quantidade: 1,
          preco_unitario: 0,
          valor_total: 0
        })
      }
    }
  }

  const removerProduto = (index: number) => {
    setProdutosLista(prev => prev.filter((_, i) => i !== index))
  }

  const calcularTotalGeral = () => {
    return produtosLista.reduce((total, item) => total + item.valor_total, 0)
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
          {/* Seção para Adicionar Produtos */}
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <h4 className="font-medium mb-3">Adicionar Produto</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Produto */}
              <div className="md:col-span-2">
                <Label htmlFor="produto_id">Produto *</Label>
                <select
                  id="produto_id"
                  value={produtoAtual.produto_id}
                  onChange={(e) => setProdutoAtual(prev => ({ ...prev, produto_id: e.target.value }))}
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

              {/* Quantidade */}
              <div>
                <Label htmlFor="quantidade">Quantidade *</Label>
                <Input
                  id="quantidade"
                  type="number"
                  min="1"
                  value={produtoAtual.quantidade}
                  onChange={(e) => setProdutoAtual(prev => ({ ...prev, quantidade: Number(e.target.value) }))}
                  placeholder="1"
                  className="w-full"
                />
              </div>

              {/* Preço Unitário */}
              <div>
                <Label htmlFor="preco_unitario">Preço Unit. *</Label>
                <Input
                  id="preco_unitario"
                  type="number"
                  min="0"
                  step="0.01"
                  value={produtoAtual.preco_unitario}
                  onChange={(e) => setProdutoAtual(prev => ({ ...prev, preco_unitario: Number(e.target.value) }))}
                  placeholder="0,00"
                  className="w-full"
                />
              </div>
            </div>

            {/* Linha com Total e Botão */}
            <div className="flex items-center justify-between mt-3 p-3 bg-white dark:bg-gray-700 rounded-md">
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">Total:</span>
                <span className="font-bold text-lg">{formatCurrency(produtoAtual.valor_total)}</span>
              </div>
              <Button
                type="button"
                onClick={adicionarProduto}
                disabled={!produtoAtual.produto_id || produtoAtual.quantidade <= 0}
                className="bg-green-600 hover:bg-green-700"
              >
                Adicionar Produto
              </Button>
            </div>
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
                cliente_id: '',
                fornecedor_id: '',
                vendedor_id: ''
              }))}
              className="w-full p-2 border rounded-md"
            >
              <option value="entrada">Entrada (Compra de Fornecedor)</option>
              <option value="saida">Saída (Venda para Cliente)</option>
            </select>
          </div>


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

          {/* Lista de Produtos Adicionados */}
          {produtosLista.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h4 className="font-medium mb-3">Produtos Adicionados</h4>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Produto</th>
                      <th className="text-left p-2">Descrição</th>
                      <th className="text-right p-2">Preço Unit.</th>
                      <th className="text-center p-2">Quantidade</th>
                      <th className="text-right p-2">Total</th>
                      <th className="text-center p-2">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {produtosLista.map((item, index) => (
                      <tr key={index} className="border-b hover:bg-gray-100 dark:hover:bg-gray-700">
                        <td className="p-2 font-medium">{item.produto_id}</td>
                        <td className="p-2">{item.produto_nome}</td>
                        <td className="p-2 text-right">{formatCurrency(item.preco_unitario)}</td>
                        <td className="p-2 text-center">{item.quantidade}</td>
                        <td className="p-2 text-right font-medium">{formatCurrency(item.valor_total)}</td>
                        <td className="p-2 text-center">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removerProduto(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Remover
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total Geral */}
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Geral:</span>
                  <span className="font-bold text-xl text-blue-600 dark:text-blue-400">
                    {formatCurrency(calcularTotalGeral())}
                  </span>
                </div>
              </div>
            </div>
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
              disabled={loading || produtosLista.length === 0}
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