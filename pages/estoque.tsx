import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Plus,
  Search,
  Download,
  Edit,
  Package,
  AlertTriangle,
  TrendingUp,
  AlertCircle
} from 'lucide-react'
import { produtosService, movimentacoesService } from '@/services/api'
import type { Produto, EstoqueOperacaoInput, MovimentacaoForm } from '@/types'
import EstoqueOperacaoForm from '@/components/forms/EstoqueOperacaoForm'
import Toast from '@/components/ui/Toast'

export default function EstoquePage() {
  const router = useRouter()
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'low' | 'out' | 'ok'>('all')
  const [showAjusteForm, setShowAjusteForm] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null)

  useEffect(() => {
    loadProdutos()
  }, [router.asPath])

  const loadProdutos = async () => {
    try {
      setLoading(true)
      const response = await produtosService.getAll(1, 100) // Carregar mais produtos para estoque
      if (response.success && response.data) {
        setProdutos(response.data)
      }
    } catch (error) {
      console.error('Erro ao carregar produtos:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const handleAjustarEstoque = () => {
    setShowAjusteForm(true)
  }

  const convertToMovimentacaoPayload = (input: EstoqueOperacaoInput): MovimentacaoForm | null => {
    if (input.tipo === 'transferencia') {
      console.warn('Transferência entre estoques ainda não implementada no backend atual.')
      return null
    }

    const tipo_movimentacao: MovimentacaoForm['tipo_movimentacao'] =
      input.tipo === 'saida' ? 'saida' : 'entrada'

    return {
      tipo_movimentacao,
      fornecedor_id: input.participante?.fornecedor_id ?? undefined,
      cliente_id: input.participante?.cliente_id ?? undefined,
      vendedor_id: input.participante?.vendedor_id ?? undefined,
      observacoes: input.observacoes,
      produtos: input.itens.map((item) => ({
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario ?? 0,
        valor_total: item.valor_total ?? item.quantidade * (item.preco_unitario ?? 0),
        produto_nome: item.produto_nome
      }))
    }
  }

  const handleSalvarAjuste = async (ajusteData: EstoqueOperacaoInput) => {
    try {
      setFormLoading(true)
      const payload = convertToMovimentacaoPayload(ajusteData)
      if (!payload) {
        setToast({ message: 'Fluxo de transferência ainda não está disponível. Selecione outro tipo de operação.', type: 'error' })
        return
      }

      const response = await movimentacoesService.create(payload)
      if (!response.success) {
        setToast({ message: response.message || 'Falha ao registrar movimentação de estoque', type: 'error' })
        return
      }

      await loadProdutos()
      setShowAjusteForm(false)
      setToast({ message: 'Movimentação registrada com sucesso!', type: 'success' })
    } catch (error: unknown) {
      let msg = 'Não foi possível registrar a operação. Tente novamente mais tarde.'
      if (typeof error === 'object' && error !== null) {
        const errObj = error as { response?: { data?: { message?: string } }, message?: string }
        if (errObj.response?.data?.message) {
          msg = errObj.response.data.message
        } else if (typeof errObj.message === 'string') {
          msg = errObj.message
        }
      }
      setToast({ message: msg, type: 'error' })
      console.error('Erro ao ajustar estoque:', error)
    } finally {
      setFormLoading(false)
    }
  }

  const handleCancelarAjuste = () => {
    setShowAjusteForm(false)
  }

  const getStockStatus = (estoque: number) => {
    if (estoque === 0) return { 
      color: 'text-red-600', 
      bgColor: 'bg-red-100', 
      icon: AlertCircle, 
      text: 'Sem estoque',
      status: 'out'
    }
    if (estoque <= 5) return { 
      color: 'text-yellow-600', 
      bgColor: 'bg-yellow-100', 
      icon: AlertTriangle, 
      text: 'Estoque baixo',
      status: 'low'
    }
    return { 
      color: 'text-green-600', 
      bgColor: 'bg-green-100', 
      icon: Package, 
      text: 'Em estoque',
      status: 'ok'
    }
  }

  const filteredProdutos = produtos.filter(produto => {
    const matchesSearch = produto.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         produto.categoria?.toLowerCase().includes(searchTerm.toLowerCase())
    
    if (filterStatus === 'all') return matchesSearch
    if (filterStatus === 'out') return matchesSearch && produto.estoque === 0
    if (filterStatus === 'low') return matchesSearch && produto.estoque > 0 && produto.estoque <= 5
    if (filterStatus === 'ok') return matchesSearch && produto.estoque > 5
    
    return matchesSearch
  })

  const totalValue = produtos.reduce((sum, produto) => sum + (produto.preco_venda * produto.estoque), 0)
  const lowStockCount = produtos.filter(produto => produto.estoque > 0 && produto.estoque <= 5).length
  const outOfStockCount = produtos.filter(produto => produto.estoque === 0).length
  const inStockCount = produtos.filter(produto => produto.estoque > 5).length

  return (
    <div className="space-y-6">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Controle de Estoque</h1>
          <p className="text-gray-600">Monitore e gerencie seu estoque</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Button 
            className="bg-meguispet-primary hover:bg-meguispet-primary/90"
            onClick={handleAjustarEstoque}
          >
            <Plus className="mr-2 h-4 w-4" />
            Ajustar Estoque
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Relatório
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-meguispet-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
            <p className="text-xs text-muted-foreground">Em estoque</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estoque Baixo</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{lowStockCount}</div>
            <p className="text-xs text-muted-foreground">Produtos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sem Estoque</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{outOfStockCount}</div>
            <p className="text-xs text-muted-foreground">Produtos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Estoque</CardTitle>
            <Package className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{inStockCount}</div>
            <p className="text-xs text-muted-foreground">Produtos</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  placeholder="Buscar por nome ou categoria..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant={filterStatus === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('all')}
                size="sm"
              >
                Todos
              </Button>
              <Button 
                variant={filterStatus === 'low' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('low')}
                size="sm"
                className="text-yellow-600"
              >
                Baixo
              </Button>
              <Button 
                variant={filterStatus === 'out' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('out')}
                size="sm"
                className="text-red-600"
              >
                Sem estoque
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Produtos Table */}
      <Card>
        <CardHeader>
          <CardTitle>Produtos em Estoque</CardTitle>
          <CardDescription>
            {filteredProdutos.length} produto(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-meguispet-primary"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-900 whitespace-nowrap">Produto</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 whitespace-nowrap hidden md:table-cell">Categoria</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 whitespace-nowrap">Estoque</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 whitespace-nowrap hidden lg:table-cell">Preço</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 whitespace-nowrap hidden lg:table-cell">Valor Total</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 whitespace-nowrap">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 whitespace-nowrap">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProdutos.map((produto) => {
                    const stockStatus = getStockStatus(produto.estoque)
                    const StockIcon = stockStatus.icon
                    const totalValue = produto.preco_venda * produto.estoque
                    
                    return (
                      <tr key={produto.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-3 min-w-[180px]">
                            <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                              <Package className="h-4 w-4 text-gray-600" />
                            </div>
                            <div className="overflow-hidden">
                              <div className="font-medium text-gray-900 truncate">{produto.nome}</div>
                              <div className="text-sm text-gray-500">ID: #{produto.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900 hidden md:table-cell">
                          <span className="truncate block max-w-[150px]">{produto.categoria || 'N/A'}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium whitespace-nowrap">{produto.estoque}</span>
                            <StockIcon className={`h-4 w-4 ${stockStatus.color} flex-shrink-0`} />
                          </div>
                        </td>
                            <td className="py-3 px-4 text-sm text-gray-900 hidden lg:table-cell whitespace-nowrap">
                              {formatCurrency(produto.preco_venda)}
                            </td>
                            <td className="py-3 px-4 text-sm font-medium text-gray-900 hidden lg:table-cell whitespace-nowrap">
                              {formatCurrency(produto.preco_venda * produto.estoque)}
                            </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${stockStatus.bgColor} ${stockStatus.color}`}>
                            {stockStatus.text}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-2">
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-meguispet-primary hidden sm:inline-flex">
                              Ajustar
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {!loading && filteredProdutos.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Package className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum produto encontrado</h3>
            <p className="text-gray-600 text-center">
              {searchTerm ? 'Tente ajustar os filtros de busca' : 'Nenhum produto cadastrado ainda'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Formulário de Ajuste de Estoque */}
      {showAjusteForm && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-lg">
          <EstoqueOperacaoForm
            title="Ajustar estoque"
            description="Selecione os itens e o fluxo da movimentação para registrar a operação."
            defaultTipo="ajuste"
            tipoOptions={[
              { value: 'entrada', label: 'Entrada (reposição)' },
              { value: 'saida', label: 'Saída (baixa)' },
              { value: 'ajuste', label: 'Inventário/Ajuste manual' }
            ]}
            onSubmit={handleSalvarAjuste}
            onCancel={handleCancelarAjuste}
            loading={formLoading}
            includeStatusControl
            participanteConfig={{ enableCliente: true, enableFornecedor: true, enableVendedor: true }}
          />
        </div>
      )}
    </div>
  )
}
