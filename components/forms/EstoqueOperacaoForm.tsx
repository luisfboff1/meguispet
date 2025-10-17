import React, { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  RefreshCcw,
  Package,
  Users,
  Building2,
  UserCheck,
  Warehouse,
  ListChecks
} from 'lucide-react'
import {
  clientesService,
  fornecedoresService,
  vendedoresService,
  produtosService,
  estoquesService
} from '@/services/api'
import type {
  Cliente,
  Fornecedor,
  Produto,
  Vendedor,
  Estoque,
  EstoqueOperacaoInput,
  EstoqueOperacaoItem,
  EstoqueOperacaoParticipante,
  EstoqueOperacaoTipo
} from '@/types'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

const STATUS_OPTIONS: Array<{ value: NonNullable<EstoqueOperacaoInput['status']>; label: string }> = [
  { value: 'rascunho', label: 'Rascunho' },
  { value: 'pendente', label: 'Pendente' },
  { value: 'confirmado', label: 'Confirmado' }
]

const DEFAULT_TIPO_OPTIONS: Array<{ value: EstoqueOperacaoTipo; label: string }> = [
  { value: 'entrada', label: 'Entrada (compra/fornecedor)' },
  { value: 'saida', label: 'Saída (venda/cliente)' },
  { value: 'ajuste', label: 'Ajuste manual' },
  { value: 'transferencia', label: 'Transferência entre estoques' }
]

interface ItemDraft extends EstoqueOperacaoItem {
  preco_unitario: number
  quantidade: number
  valor_total: number
}

interface ProdutoDraftState {
  produto_id: string
  quantidade: number
  preco_unitario: number
}

interface EstoqueOperacaoFormProps {
  title?: string
  description?: string
  defaultTipo?: EstoqueOperacaoTipo
  allowTipoSwitch?: boolean
  initialData?: Partial<EstoqueOperacaoInput>
  onSubmit: (payload: EstoqueOperacaoInput) => void | Promise<void>
  onCancel: () => void
  loading?: boolean
  showStockSelection?: boolean
  includeStatusControl?: boolean
  participanteConfig?: {
    enableCliente?: boolean
    enableFornecedor?: boolean
    enableVendedor?: boolean
  }
  tipoOptions?: Array<{ value: EstoqueOperacaoTipo; label: string }>
}

const defaultParticipanteConfig = {
  enableCliente: true,
  enableFornecedor: true,
  enableVendedor: true
}

export default function EstoqueOperacaoForm({
  title = 'Operação de Estoque',
  description,
  defaultTipo = 'entrada',
  allowTipoSwitch = true,
  initialData,
  onSubmit,
  onCancel,
  loading = false,
  showStockSelection = false,
  includeStatusControl = false,
  participanteConfig = defaultParticipanteConfig,
  tipoOptions
}: EstoqueOperacaoFormProps) {
  const [tipo, setTipo] = useState<EstoqueOperacaoTipo>(initialData?.tipo || defaultTipo)
  const [itens, setItens] = useState<ItemDraft[]>(() =>
    initialData?.itens?.map((item) => ({
      produto_id: item.produto_id,
      produto_nome: item.produto_nome,
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario ?? 0,
      valor_total: item.valor_total ?? (item.quantidade * (item.preco_unitario ?? 0))
    })) ?? []
  )
  const [observacoes, setObservacoes] = useState(initialData?.observacoes ?? '')
  const [status, setStatus] = useState<NonNullable<EstoqueOperacaoInput['status']>>(initialData?.status || 'pendente')
  const [origemEstoqueId, setOrigemEstoqueId] = useState<number | undefined>(
    initialData?.origem_estoque_id ?? undefined
  )
  const [destinoEstoqueId, setDestinoEstoqueId] = useState<number | undefined>(
    initialData?.destino_estoque_id ?? undefined
  )
  const [participante, setParticipante] = useState<EstoqueOperacaoParticipante>({
    cliente_id: initialData?.participante?.cliente_id ?? null,
    fornecedor_id: initialData?.participante?.fornecedor_id ?? null,
    vendedor_id: initialData?.participante?.vendedor_id ?? null
  })
  const [produtoAtual, setProdutoAtual] = useState<ProdutoDraftState>({
    produto_id: '',
    quantidade: 1,
    preco_unitario: 0
  })

  const [produtos, setProdutos] = useState<Produto[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [estoques, setEstoques] = useState<Estoque[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const tipoSelectOptions = useMemo(
    () => tipoOptions ?? DEFAULT_TIPO_OPTIONS,
    [tipoOptions]
  )

  useEffect(() => {
    if (!tipoSelectOptions.some((option) => option.value === tipo)) {
      setTipo(tipoSelectOptions[0]?.value ?? defaultTipo)
    }
  }, [tipoSelectOptions, tipo, defaultTipo])

  useEffect(() => {
    const bootstrap = async () => {
      try {
        setLoadingData(true)
        const [produtosResponse, clientesResponse, fornecedoresResponse, vendedoresResponse, estoquesResponse] = await Promise.all([
          produtosService.getAll(1, 200),
          clientesService.getAll(1, 200),
          fornecedoresService.getAll(1, 200),
          vendedoresService.getAll(1, 200),
          showStockSelection ? estoquesService.getAll(true) : Promise.resolve({ success: true, data: [] })
        ])

        if (produtosResponse.success && produtosResponse.data) setProdutos(produtosResponse.data)
        if (clientesResponse.success && clientesResponse.data) setClientes(clientesResponse.data)
        if (fornecedoresResponse.success && fornecedoresResponse.data) setFornecedores(fornecedoresResponse.data)
        if (vendedoresResponse.success && vendedoresResponse.data) setVendedores(vendedoresResponse.data)
        if (showStockSelection && estoquesResponse.success && estoquesResponse.data) setEstoques(estoquesResponse.data)
      } finally {
        setLoadingData(false)
      }
    }

    void bootstrap()
  }, [showStockSelection])

  useEffect(() => {
    if (!allowTipoSwitch) return
    // Reset participantes incompatíveis ao trocar o tipo
    setParticipante((prev) => ({
      cliente_id: tipo === 'saida' ? prev.cliente_id ?? null : null,
      fornecedor_id: tipo === 'entrada' ? prev.fornecedor_id ?? null : null,
      vendedor_id: tipo === 'saida' ? prev.vendedor_id ?? null : null
    }))
  }, [tipo, allowTipoSwitch])

  const totalItens = itens.length
  const totalQuantidade = useMemo(() => itens.reduce((acc, item) => acc + item.quantidade, 0), [itens])
  const totalValor = useMemo(() => itens.reduce((acc, item) => acc + item.valor_total, 0), [itens])

  const atualizarValorProdutoAtual = (draft: ProdutoDraftState) => {
    const quantidadeValida = Math.max(0, draft.quantidade)
    const precoValido = Math.max(0, draft.preco_unitario)
    const produtoDetalhe = produtos.find((p) => String(p.id) === draft.produto_id)
    const precoDefault = tipo === 'saida' ? produtoDetalhe?.preco_venda : produtoDetalhe?.preco_custo
    const preco = precoValido || precoDefault || 0
    return {
      quantidade: quantidadeValida,
      preco_unitario: preco,
      valor_total: quantidadeValida * preco,
      produto_nome: produtoDetalhe?.nome ?? ''
    }
  }

  const handleAdicionarItem = () => {
    if (!produtoAtual.produto_id) return
    const produtoInfo = atualizarValorProdutoAtual(produtoAtual)
    const itemExisteIndex = itens.findIndex((item) => String(item.produto_id) === produtoAtual.produto_id)

    if (itemExisteIndex >= 0) {
      const copia = [...itens]
      const existente = copia[itemExisteIndex]
      const quantidade = existente.quantidade + produtoInfo.quantidade
      const precoUnitario = produtoInfo.preco_unitario || existente.preco_unitario
      copia[itemExisteIndex] = {
        ...existente,
        quantidade,
        preco_unitario: precoUnitario,
        valor_total: quantidade * precoUnitario
      }
      setItens(copia)
    } else {
      setItens((prev) => [
        ...prev,
        {
          produto_id: Number(produtoAtual.produto_id),
          produto_nome: produtoInfo.produto_nome,
          quantidade: produtoInfo.quantidade,
          preco_unitario: produtoInfo.preco_unitario,
          valor_total: produtoInfo.valor_total
        }
      ])
    }

    setProdutoAtual({ produto_id: '', quantidade: 1, preco_unitario: 0 })
  }

  const handleRemoverItem = (index: number) => {
    setItens((prev) => prev.filter((_, i) => i !== index))
  }

  const handleChangeItemQuantidade = (index: number, quantidade: number) => {
    setItens((prev) => {
      const copia = [...prev]
      const item = copia[index]
      const quantidadeAjustada = Math.max(0, quantidade)
      copia[index] = {
        ...item,
        quantidade: quantidadeAjustada,
        valor_total: quantidadeAjustada * item.preco_unitario
      }
      return copia
    })
  }

  const handleChangeItemPreco = (index: number, preco: number) => {
    setItens((prev) => {
      const copia = [...prev]
      const item = copia[index]
      const precoAjustado = Math.max(0, preco)
      copia[index] = {
        ...item,
        preco_unitario: precoAjustado,
        valor_total: precoAjustado * item.quantidade
      }
      return copia
    })
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const payload: EstoqueOperacaoInput = {
      tipo,
      origem_estoque_id: showStockSelection ? origemEstoqueId ?? null : undefined,
      destino_estoque_id: showStockSelection ? destinoEstoqueId ?? null : undefined,
      itens: itens.map((item) => ({
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario,
        valor_total: item.valor_total,
        produto_nome: item.produto_nome
      })),
      participante: participante,
      observacoes: observacoes || undefined,
      status: includeStatusControl ? status : undefined
    }

    onSubmit(payload)
  }

  if (loadingData) {
    return (
      <Card className="w-full max-w-3xl mx-auto">
        <CardContent className="flex items-center justify-center py-10 space-x-3">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-sm text-gray-600">Carregando dados da operação...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="space-y-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                {tipo === 'entrada' ? (
                  <TrendingUp className="h-5 w-5 text-green-600" />
                ) : tipo === 'saida' ? (
                  <TrendingDown className="h-5 w-5 text-red-600" />
                ) : (
                  <RefreshCcw className="h-5 w-5 text-amber-600" />
                )}
                <div>
                  <p className="text-sm font-medium text-gray-700">Tipo da Operação</p>
                  <p className="text-xs text-gray-500">Escolha o fluxo que mais se adequa ao contexto</p>
                </div>
              </div>
              {allowTipoSwitch && (
                <select
                  value={tipo}
                  onChange={(event) => setTipo(event.target.value as EstoqueOperacaoTipo)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm md:w-56"
                >
                    {tipoSelectOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                </select>
              )}
            </div>

            {includeStatusControl && (
              <div>
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={status}
                  onChange={(event) => setStatus(event.target.value as typeof status)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </section>

          {showStockSelection && (
            <section className="rounded-lg border border-dashed border-gray-200 p-4">
              <div className="flex items-center gap-2 pb-3">
                <Warehouse className="h-5 w-5 text-indigo-600" />
                <div>
                  <h3 className="text-sm font-semibold">Localização de Estoque</h3>
                  <p className="text-xs text-gray-500">Defina os estoques de origem e destino da movimentação</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="origem_estoque">Estoque de origem</Label>
                  <select
                    id="origem_estoque"
                    value={origemEstoqueId ?? ''}
                    onChange={(event) => setOrigemEstoqueId(event.target.value ? Number(event.target.value) : undefined)}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">Não definido</option>
                    {estoques.map((estoque) => (
                      <option key={estoque.id} value={estoque.id}>
                        {estoque.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="destino_estoque">Estoque de destino</Label>
                  <select
                    id="destino_estoque"
                    value={destinoEstoqueId ?? ''}
                    onChange={(event) => setDestinoEstoqueId(event.target.value ? Number(event.target.value) : undefined)}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">Não definido</option>
                    {estoques.map((estoque) => (
                      <option key={estoque.id} value={estoque.id}>
                        {estoque.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>
          )}

          <section className="rounded-lg border border-dashed border-gray-200 p-4">
            <div className="flex items-center gap-2 pb-3">
              <Users className="h-5 w-5 text-sky-600" />
              <div>
                <h3 className="text-sm font-semibold">Participantes da operação</h3>
                <p className="text-xs text-gray-500">Selecione os envolvidos conforme o tipo</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {tipo === 'entrada' && participanteConfig.enableFornecedor && (
                <div>
                  <Label htmlFor="fornecedor_id">Fornecedor</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-gray-500" />
                    <select
                      id="fornecedor_id"
                      value={participante.fornecedor_id ?? ''}
                      onChange={(event) =>
                        setParticipante((prev) => ({
                          ...prev,
                          fornecedor_id: event.target.value ? Number(event.target.value) : null
                        }))
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    >
                      <option value="">Selecione um fornecedor</option>
                      {fornecedores.map((fornecedor) => (
                        <option key={fornecedor.id} value={fornecedor.id}>
                          {fornecedor.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {tipo === 'saida' && participanteConfig.enableCliente && (
                <div>
                  <Label htmlFor="cliente_id">Cliente</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    <select
                      id="cliente_id"
                      value={participante.cliente_id ?? ''}
                      onChange={(event) =>
                        setParticipante((prev) => ({
                          ...prev,
                          cliente_id: event.target.value ? Number(event.target.value) : null
                        }))
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    >
                      <option value="">Selecione um cliente</option>
                      {clientes.map((cliente) => (
                        <option key={cliente.id} value={cliente.id}>
                          {cliente.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {tipo === 'saida' && participanteConfig.enableVendedor && (
                <div>
                  <Label htmlFor="vendedor_id">Vendedor</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-gray-500" />
                    <select
                      id="vendedor_id"
                      value={participante.vendedor_id ?? ''}
                      onChange={(event) =>
                        setParticipante((prev) => ({
                          ...prev,
                          vendedor_id: event.target.value ? Number(event.target.value) : null
                        }))
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    >
                      <option value="">Selecione um vendedor</option>
                      {vendedores.map((vendedor) => (
                        <option key={vendedor.id} value={vendedor.id}>
                          {vendedor.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="space-y-4">
            <div className="rounded-lg border border-dashed border-gray-200 p-4">
              <div className="flex items-center gap-2 pb-3">
                <Package className="h-5 w-5 text-purple-600" />
                <div>
                  <h3 className="text-sm font-semibold">Itens da operação</h3>
                  <p className="text-xs text-gray-500">Adicione produtos e ajuste quantidades/valores conforme necessário</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <div className="md:col-span-2">
                  <Label htmlFor="produto_id">Produto</Label>
                  <select
                    id="produto_id"
                    value={produtoAtual.produto_id}
                    onChange={(event) =>
                      setProdutoAtual((prev) => ({ ...prev, produto_id: event.target.value }))
                    }
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">Selecione um produto</option>
                    {produtos.map((produto) => (
                      <option key={produto.id} value={produto.id}>
                        {produto.nome} • estoque {produto.estoque}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="produto_quantidade">Quantidade</Label>
                  <Input
                    id="produto_quantidade"
                    type="number"
                    min={1}
                    value={produtoAtual.quantidade}
                    onChange={(event) =>
                      setProdutoAtual((prev) => ({
                        ...prev,
                        quantidade: Number(event.target.value)
                      }))
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="produto_preco">Preço unitário</Label>
                  <Input
                    id="produto_preco"
                    type="number"
                    min={0}
                    step="0.01"
                    value={produtoAtual.preco_unitario}
                    onChange={(event) =>
                      setProdutoAtual((prev) => ({
                        ...prev,
                        preco_unitario: Number(event.target.value)
                      }))
                    }
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-md bg-white px-3 py-2 text-sm shadow-sm">
                <span className="font-medium text-gray-600">
                  Total sugerido:{' '}
                  {formatCurrency(
                    Math.max(0, produtoAtual.quantidade) * Math.max(0, produtoAtual.preco_unitario)
                  )}
                </span>
                <Button
                  type="button"
                  onClick={handleAdicionarItem}
                  disabled={!produtoAtual.produto_id || produtoAtual.quantidade <= 0}
                >
                  Adicionar item
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-500">Produto</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500">Quantidade</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500">Preço unitário</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500">Subtotal</th>
                      <th className="px-4 py-2 text-right font-medium text-gray-500">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {itens.length === 0 ? (
                      <tr>
                        <td className="px-4 py-3 text-center text-sm text-gray-500" colSpan={5}>
                          Nenhum item adicionado ainda.
                        </td>
                      </tr>
                    ) : (
                      itens.map((item, index) => (
                        <tr key={`${item.produto_id}-${index}`}>
                          <td className="px-4 py-2">
                            <div className="font-medium text-gray-700">
                              {item.produto_nome || produtos.find((p) => p.id === item.produto_id)?.nome || 'Produto'}
                            </div>
                            <p className="text-xs text-gray-500">ID: {item.produto_id}</p>
                          </td>
                          <td className="px-4 py-2">
                            <Input
                              type="number"
                              min={0}
                              value={item.quantidade}
                              onChange={(event) => handleChangeItemQuantidade(index, Number(event.target.value))}
                            />
                          </td>
                          <td className="px-4 py-2">
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              value={item.preco_unitario}
                              onChange={(event) => handleChangeItemPreco(index, Number(event.target.value))}
                            />
                          </td>
                          <td className="px-4 py-2 font-medium text-gray-700">
                            {formatCurrency(item.valor_total)}
                          </td>
                          <td className="px-4 py-2 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleRemoverItem(index)}
                            >
                              Remover
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-dashed border-gray-200 p-4">
            <div className="flex items-center gap-2 pb-3">
              <ListChecks className="h-5 w-5 text-emerald-600" />
              <div>
                <h3 className="text-sm font-semibold">Resumo da operação</h3>
                <p className="text-xs text-gray-500">Visão geral dos itens adicionados</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-md border border-gray-200 p-3">
                <p className="text-xs uppercase text-gray-500">Itens</p>
                <p className="text-lg font-semibold text-gray-900">{totalItens}</p>
              </div>
              <div className="rounded-md border border-gray-200 p-3">
                <p className="text-xs uppercase text-gray-500">Quantidade total</p>
                <p className="text-lg font-semibold text-gray-900">{totalQuantidade}</p>
              </div>
              <div className="rounded-md border border-gray-200 p-3">
                <p className="text-xs uppercase text-gray-500">Valor total</p>
                <p className="text-lg font-semibold text-gray-900">{formatCurrency(totalValor)}</p>
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <textarea
              id="observacoes"
              value={observacoes}
              onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                setObservacoes(event.target.value)
              }
              placeholder="Anote detalhes relevantes para esta operação"
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </section>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || itens.length === 0}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {loading ? 'Salvando...' : 'Salvar operação'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
