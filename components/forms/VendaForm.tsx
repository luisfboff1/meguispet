import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Plus, Trash2, ShoppingCart } from 'lucide-react'
import { clientesService, vendedoresService, produtosService, formasPagamentoService, estoquesService } from '@/services/api'
import type {
  Venda,
  Cliente,
  Vendedor,
  Produto,
  VendaForm as VendaFormValues,
  VendaItemInput,
  OrigemVenda,
  FormaPagamentoRegistro,
  Estoque
} from '@/types'

interface ItemVenda extends VendaItemInput {
  produto_nome: string
  subtotal: number
}

interface VendaFormProps {
  venda?: Venda
  onSubmit: (venda: VendaFormValues) => Promise<void> | void
  onCancel: () => void
  loading?: boolean
  errorMessage?: string
}

interface VendaFormState {
  cliente_id: string
  vendedor_id: string
  forma_pagamento_id: string
  origem_venda: OrigemVenda
  estoque_id: string
  observacoes: string
  desconto: number
}

const getFormaPagamentoIdFromVenda = (dados?: Venda): string => {
  if (!dados) return ''
  if (dados.forma_pagamento_id) {
    return String(dados.forma_pagamento_id)
  }
  if (dados.forma_pagamento_detalhe?.id) {
    return String(dados.forma_pagamento_detalhe.id)
  }
  return ''
}

const getEstoqueIdFromVenda = (dados?: Venda): string => {
  if (!dados) return ''
  if (dados.estoque_id) {
    return String(dados.estoque_id)
  }
  if (dados.estoque?.id) {
    return String(dados.estoque.id)
  }
  return ''
}

export default function VendaForm({ venda, onSubmit, onCancel, loading = false, errorMessage }: VendaFormProps) {
  const [formData, setFormData] = useState<VendaFormState>({
    cliente_id: venda?.cliente_id ? String(venda.cliente_id) : '',
    vendedor_id: venda?.vendedor_id ? String(venda.vendedor_id) : '',
    forma_pagamento_id: getFormaPagamentoIdFromVenda(venda),
    origem_venda: venda?.origem_venda || 'loja_fisica',
    estoque_id: getEstoqueIdFromVenda(venda),
    observacoes: venda?.observacoes || '',
    desconto: venda?.desconto || 0
  })

  const [itens, setItens] = useState<ItemVenda[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [formasPagamento, setFormasPagamento] = useState<FormaPagamentoRegistro[]>([])
  const [estoques, setEstoques] = useState<Estoque[]>([])
  const [loadingData, setLoadingData] = useState(false)

  useEffect(() => {
    if (!venda) {
      setItens([])
      setFormData({
        cliente_id: '',
        vendedor_id: '',
        forma_pagamento_id: '',
        origem_venda: 'loja_fisica',
        estoque_id: '',
        observacoes: '',
        desconto: 0
      })
      return
    }

    setFormData({
      cliente_id: venda.cliente_id ? String(venda.cliente_id) : '',
      vendedor_id: venda.vendedor_id ? String(venda.vendedor_id) : '',
      forma_pagamento_id: getFormaPagamentoIdFromVenda(venda),
      origem_venda: venda.origem_venda,
      estoque_id: getEstoqueIdFromVenda(venda),
      observacoes: venda.observacoes || '',
      desconto: venda.desconto || 0
    })

    if (venda.itens?.length) {
      setItens(
        venda.itens.map(item => ({
          produto_id: item.produto_id,
          produto_nome: item.produto?.nome || '',
          quantidade: item.quantidade,
          preco_unitario: item.preco_unitario,
          subtotal: item.subtotal
        }))
      )
    } else {
      setItens([])
    }
  }, [venda])

  useEffect(() => {
    void loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoadingData(true)
      const [clientesRes, vendedoresRes, produtosRes, formasPagamentoRes, estoquesRes] = await Promise.all([
        clientesService.getAll(1, 100),
        vendedoresService.getAll(1, 100),
        produtosService.getAll(1, 100),
        formasPagamentoService.getAll(true),
        estoquesService.getAll(true)
      ])

      if (clientesRes.success && clientesRes.data) setClientes(clientesRes.data)
      if (vendedoresRes.success && vendedoresRes.data) setVendedores(vendedoresRes.data)
      if (produtosRes.success && produtosRes.data) setProdutos(produtosRes.data)
      if (formasPagamentoRes.success && formasPagamentoRes.data) setFormasPagamento(formasPagamentoRes.data)
      if (estoquesRes.success && estoquesRes.data) setEstoques(estoquesRes.data)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoadingData(false)
    }
  }

  const addItem = () => {
    setItens(prevItens => ([
      ...prevItens,
      {
        produto_id: 0,
        produto_nome: '',
        quantidade: 1,
        preco_unitario: 0,
        subtotal: 0
      }
    ]))
  }

  const removeItem = (index: number) => {
    setItens(itens.filter((_, i) => i !== index))
  }

  const updateItem = <Key extends keyof ItemVenda>(index: number, field: Key, value: ItemVenda[Key]) => {
    const newItens = [...itens]
    newItens[index] = { ...newItens[index], [field]: value }

    if (field === 'produto_id') {
      const produto = produtos.find(p => p.id === value)
      if (produto) {
        const precoVenda = Number(produto.preco_venda) || 0
        newItens[index].produto_nome = produto.nome
        newItens[index].preco_unitario = precoVenda
        newItens[index].subtotal = newItens[index].quantidade * precoVenda
      }
    } else if (field === 'quantidade' || field === 'preco_unitario') {
      const preco = Number(newItens[index].preco_unitario) || 0
      const qtd = Number(newItens[index].quantidade) || 0
      newItens[index].preco_unitario = preco
      newItens[index].quantidade = qtd
      newItens[index].subtotal = qtd * preco
    }

    setItens(newItens)
  }

  const calcularTotal = () => {
    const subtotal = itens.reduce((sum, item) => sum + item.subtotal, 0)
    const desconto = Number(formData.desconto) || 0
    return subtotal - desconto
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (itens.length === 0) {
      alert('Adicione pelo menos um item à venda')
      return
    }
    if (!formData.estoque_id) {
      alert('Selecione o estoque de origem da venda')
      return
    }
    if (!formData.forma_pagamento_id) {
      alert('Selecione a forma de pagamento')
      return
    }

    const itensValidos = itens.every(item => item.produto_id > 0 && item.quantidade > 0 && item.preco_unitario > 0)
    if (!itensValidos) {
      alert('Verifique os itens: selecione o produto e informe quantidade e preço válidos')
      return
    }

    const formaSelecionada = formasPagamento.find(fp => String(fp.id) === formData.forma_pagamento_id)
    if (!formaSelecionada) {
      alert('Forma de pagamento inválida')
      return
    }

    const vendaData: VendaFormValues = {
      ...formData,
      cliente_id: formData.cliente_id ? Number(formData.cliente_id) : null,
      vendedor_id: formData.vendedor_id ? Number(formData.vendedor_id) : null,
      forma_pagamento_id: Number(formData.forma_pagamento_id),
  estoque_id: Number(formData.estoque_id),
      forma_pagamento: formaSelecionada.nome,
      itens: itens.map(item => ({
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario
      }))
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[VendaForm] submit payload', vendaData)
    }

    onSubmit(vendaData)
  }

  if (loadingData) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Carregando dados...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-4xl mx-auto max-h-[90vh] overflow-y-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <ShoppingCart className="mr-2 h-5 w-5" />
          {venda ? 'Editar Venda' : 'Nova Venda'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {errorMessage ? (
          <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="cliente_id">Cliente</Label>
              <select
                id="cliente_id"
                value={formData.cliente_id}
                onChange={(e) => {
                  const clienteId = e.target.value
                  setFormData(prev => {
                    const cliente = clientes.find(c => String(c.id) === clienteId)
                    let vendedorId = prev.vendedor_id
                    if (cliente && (cliente.vendedor_id || cliente.vendedor?.id)) {
                      const vendedorPadrao = cliente.vendedor_id ?? cliente.vendedor?.id
                      vendedorId = vendedorPadrao ? String(vendedorPadrao) : prev.vendedor_id
                    }
                    return { ...prev, cliente_id: clienteId, vendedor_id: vendedorId }
                  })
                }}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Selecione um cliente</option>
                {clientes.map(cliente => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="estoque_id">Estoque de Origem</Label>
              <select
                id="estoque_id"
                value={formData.estoque_id}
                onChange={(e) => setFormData(prev => ({ ...prev, estoque_id: e.target.value }))}
                className="w-full p-2 border rounded-md"
                required
              >
                <option value="">Selecione o estoque</option>
                {estoques.map(estoque => (
                  <option key={estoque.id} value={estoque.id}>{estoque.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="vendedor_id">Vendedor</Label>
              <select
                id="vendedor_id"
                value={formData.vendedor_id}
                onChange={(e) => setFormData(prev => ({ ...prev, vendedor_id: e.target.value }))}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Selecione um vendedor</option>
                {vendedores.map(vendedor => (
                  <option key={vendedor.id} value={vendedor.id}>
                    {vendedor.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="forma_pagamento">Forma de Pagamento</Label>
              <select
                id="forma_pagamento"
                value={formData.forma_pagamento_id}
                onChange={(e) => setFormData(prev => ({ ...prev, forma_pagamento_id: e.target.value }))}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Selecione</option>
                {formasPagamento.map(forma => (
                  <option key={forma.id} value={forma.id}>{forma.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="origem_venda">Origem da Venda</Label>
              <select
                id="origem_venda"
                value={formData.origem_venda}
                onChange={(e) => setFormData(prev => ({ ...prev, origem_venda: e.target.value as OrigemVenda }))}
                className="w-full p-2 border rounded-md"
              >
                <option value="loja_fisica">Loja Física</option>
                <option value="mercado_livre">Mercado Livre</option>
                <option value="shopee">Shopee</option>
                <option value="magazine_luiza">Magazine Luiza</option>
                <option value="americanas">Americanas</option>
                <option value="outros">Outros</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Itens da Venda</Label>
              <Button type="button" onClick={addItem} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Item
              </Button>
            </div>

            <div className="border rounded-md overflow-hidden">
              <div className="max-h-[280px] overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b sticky top-0 z-10">
                    <tr>
                      <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Produto</th>
                      <th className="text-left py-2 px-3 text-sm font-medium text-gray-700 w-20">Qtd</th>
                      <th className="text-left py-2 px-3 text-sm font-medium text-gray-700 w-28">Preço Unit.</th>
                      <th className="text-left py-2 px-3 text-sm font-medium text-gray-700 w-28">Subtotal</th>
                      <th className="text-center py-2 px-3 text-sm font-medium text-gray-700 w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {itens.map((item, index) => (
                      <tr key={index} className="border-b last:border-b-0 hover:bg-gray-50">
                        <td className="py-2 px-3">
                          <select
                            value={item.produto_id}
                            onChange={(e) => updateItem(index, 'produto_id', Number(e.target.value))}
                            className="w-full p-1.5 border rounded text-sm"
                          >
                            <option value={0}>Selecione um produto</option>
                            {produtos.map(produto => {
                              const precoVenda = Number(produto.preco_venda)
                              const precoFormatado = Number.isFinite(precoVenda) ? precoVenda.toFixed(2) : '0.00'
                              return (
                                <option key={produto.id} value={produto.id}>
                                  {produto.nome} - R$ {precoFormatado}
                                </option>
                              )
                            })}
                          </select>
                        </td>
                        <td className="py-2 px-3">
                          <Input
                            type="number"
                            min="1"
                            value={item.quantidade}
                            onChange={(e) => updateItem(index, 'quantidade', Number(e.target.value))}
                            className="w-full text-sm p-1.5"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <Input
                            type="number"
                            step="0.01"
                            value={item.preco_unitario}
                            onChange={(e) => updateItem(index, 'preco_unitario', Number(e.target.value))}
                            className="w-full text-sm p-1.5"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <div className="text-sm font-medium bg-gray-50 px-2 py-1.5 rounded">
                            R$ {item.subtotal.toFixed(2)}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <Button
                            type="button"
                            onClick={() => removeItem(index)}
                            size="sm"
                            variant="ghost"
                            className="text-red-600 h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {itens.length === 0 && (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    Nenhum item adicionado. Clique em "Adicionar Item" para começar.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="desconto">Desconto (R$)</Label>
              <Input
                id="desconto"
                type="number"
                step="0.01"
                value={formData.desconto}
                onChange={(e) => setFormData(prev => ({ ...prev, desconto: Number(e.target.value) }))}
                placeholder="0,00"
              />
            </div>

            <div>
              <Label>Total da Venda</Label>
              <Input
                type="text"
                value={`R$ ${calcularTotal().toFixed(2)}`}
                readOnly
                className="bg-gray-50 font-bold text-lg"
              />
            </div>
          </div>

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

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || itens.length === 0}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Venda'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
