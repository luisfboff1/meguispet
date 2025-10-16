import React, { useState, useEffect, useMemo } from 'react'
import { isAxiosError } from 'axios'
import { useRouter } from 'next/router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Edit, 
  Trash2,
  Package,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  AlertCircle,
  Truck,
  ArrowUpCircle,
  ArrowDownCircle,
  Settings,
  ShoppingCart,
  X
} from 'lucide-react'
import { produtosService, fornecedoresService, movimentacoesService, estoquesService } from '@/services/api'
import type {
  Produto,
  Fornecedor,
  MovimentacaoEstoque,
  MovimentacaoForm as MovimentacaoFormValues,
  ProdutoForm as ProdutoFormValues,
  FornecedorForm as FornecedorFormValues,
  Estoque
} from '@/types'
import ProdutoForm from '@/components/forms/ProdutoForm'
import FornecedorForm from '@/components/forms/FornecedorForm'
import MovimentacaoForm from '@/components/forms/MovimentacaoForm'

export default function ProdutosEstoquePage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'produtos' | 'estoque' | 'movimentacoes' | 'fornecedores'>('produtos')
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [estoques, setEstoques] = useState<Estoque[]>([])
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoEstoque[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'low' | 'out' | 'ok'>('all')
  const [estoqueFilter, setEstoqueFilter] = useState<number | 'all'>('all')
  
  // Estados para formulários
  const [showProdutoForm, setShowProdutoForm] = useState(false)
  const [showFornecedorForm, setShowFornecedorForm] = useState(false)
  const [showMovimentacaoForm, setShowMovimentacaoForm] = useState(false)
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null)
  const [editingFornecedor, setEditingFornecedor] = useState<Fornecedor | null>(null)
  const [editingMovimentacao, setEditingMovimentacao] = useState<MovimentacaoEstoque | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  
  // Estados para modal de detalhes
  const [showMovimentacaoDetails, setShowMovimentacaoDetails] = useState(false)
  const [selectedMovimentacao, setSelectedMovimentacao] = useState<MovimentacaoEstoque | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Carregar produtos
      const produtosResponse = await produtosService.getAll(1, 100)
      if (produtosResponse.success && produtosResponse.data) {
        setProdutos(produtosResponse.data)
      }

      // Carregar estoques
      try {
        const estoquesResponse = await estoquesService.getAll(true)
        if (estoquesResponse.success && estoquesResponse.data) {
          setEstoques(estoquesResponse.data)
        }
      } catch (error) {
        console.error('Erro ao carregar estoques:', error)
      }
      
      // Carregar fornecedores
      try {
        console.log('🔄 Carregando fornecedores...')
        const fornecedoresResponse = await fornecedoresService.getAll(1, 100)
        console.log('📦 Resposta fornecedores:', fornecedoresResponse)
        if (fornecedoresResponse.success && fornecedoresResponse.data) {
          console.log('✅ Fornecedores carregados:', fornecedoresResponse.data.length, 'fornecedores')
          console.log('📋 Lista de fornecedores:', fornecedoresResponse.data)
          setFornecedores(fornecedoresResponse.data)
        } else {
          console.warn('⚠️ Fornecedores não carregados:', fornecedoresResponse)
        }
      } catch (error) {
        console.error('❌ Erro ao carregar fornecedores:', error)
        console.error('🔍 Detalhes do erro:', {
          message: error instanceof Error ? error.message : 'Erro desconhecido',
          stack: error instanceof Error ? error.stack : undefined,
          response: isAxiosError(error) ? error.response?.data : undefined
        })
      }
      
      // Carregar movimentações
      try {
        const movimentacoesResponse = await movimentacoesService.getAll(1, 100)
        if (movimentacoesResponse.success && movimentacoesResponse.data) {
          setMovimentacoes(movimentacoesResponse.data)
        }
      } catch (error) {
        console.error('Erro ao carregar movimentações:', error)
      }
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
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

  const normalizedSearch = searchTerm.trim().toLowerCase()

  const filteredProdutos = produtos.filter(produto => {
    const nomeMatch = produto.nome.toLowerCase().includes(normalizedSearch)
    const categoriaMatch = produto.categoria ? produto.categoria.toLowerCase().includes(normalizedSearch) : false
    const matchesSearch = normalizedSearch.length === 0 ? true : (nomeMatch || categoriaMatch)

    const matchesEstoque = estoqueFilter === 'all'
      ? true
      : Array.isArray(produto.estoques)
        ? produto.estoques.some(item => Number(item.estoque_id) === Number(estoqueFilter))
        : false

    if (!matchesSearch || !matchesEstoque) return false

    if (filterStatus === 'all') return true
    if (filterStatus === 'out') return produto.estoque === 0
    if (filterStatus === 'low') return produto.estoque > 0 && produto.estoque <= 5
    if (filterStatus === 'ok') return produto.estoque > 5

    return true
  })

  // Handlers para produtos
  const handleNovoProduto = () => {
    setEditingProduto(null)
    setShowProdutoForm(true)
  }

  const handleEditarProduto = (produto: Produto) => {
    setEditingProduto(produto)
    setShowProdutoForm(true)
  }

  const handleSalvarProduto = async (produtoData: ProdutoFormValues) => {
    try {
      setFormLoading(true)
      
      if (editingProduto) {
        const response = await produtosService.update(editingProduto.id, produtoData)
        if (response.success) {
          await loadData()
          setShowProdutoForm(false)
          setEditingProduto(null)
        }
      } else {
        const response = await produtosService.create(produtoData)
        if (response.success) {
          await loadData()
          setShowProdutoForm(false)
        }
      }
    } catch (error) {
      console.error('Erro ao salvar produto:', error)
    } finally {
      setFormLoading(false)
    }
  }

  // Handlers para fornecedores
  const handleNovoFornecedor = () => {
    setEditingFornecedor(null)
    setShowFornecedorForm(true)
  }

  const handleEditarFornecedor = (fornecedor: Fornecedor) => {
    setEditingFornecedor(fornecedor)
    setShowFornecedorForm(true)
  }

  const handleExcluirFornecedor = async (fornecedor: Fornecedor) => {
    if (confirm(`Tem certeza que deseja excluir o fornecedor "${fornecedor.nome}"?`)) {
      try {
        setFormLoading(true)
        const response = await fornecedoresService.delete(fornecedor.id)
        if (response.success) {
          await loadData() // Recarregar dados
          console.log('✅ Fornecedor excluído com sucesso')
        } else {
          console.error('❌ Erro ao excluir fornecedor:', response.message)
          alert('Erro ao excluir fornecedor: ' + response.message)
        }
      } catch (error) {
        console.error('❌ Erro ao excluir fornecedor:', error)
        alert('Erro ao excluir fornecedor')
      } finally {
        setFormLoading(false)
      }
    }
  }

  const handleSalvarFornecedor = async (fornecedorData: FornecedorFormValues) => {
    try {
      setFormLoading(true)
      
      if (editingFornecedor) {
        const response = await fornecedoresService.update(editingFornecedor.id, fornecedorData)
        if (response.success) {
          await loadData()
          setShowFornecedorForm(false)
          setEditingFornecedor(null)
        }
      } else {
        const response = await fornecedoresService.create(fornecedorData)
        if (response.success) {
          await loadData()
          setShowFornecedorForm(false)
        }
      }
    } catch (error) {
      console.error('Erro ao salvar fornecedor:', error)
    } finally {
      setFormLoading(false)
    }
  }

  // Handlers para movimentações
  const handleNovaMovimentacao = () => {
    setShowMovimentacaoForm(true)
  }

  const handleSalvarMovimentacao = async (movimentacaoData: MovimentacaoFormValues) => {
    try {
      setFormLoading(true)
      const response = await movimentacoesService.create(movimentacaoData)
      if (response.success) {
        await loadData()
        setShowMovimentacaoForm(false)
      }
    } catch (error) {
      console.error('Erro ao salvar movimentação:', error)
    } finally {
      setFormLoading(false)
    }
  }

  const handleEditarMovimentacao = async (movimentacao: MovimentacaoEstoque) => {
    try {
      console.log('✏️ Editando movimentação:', movimentacao.id)
      // Buscar detalhes completos da movimentação
      const response = await movimentacoesService.getById(movimentacao.id)
      console.log('📦 Dados para edição:', response)
      
      if (response.success && response.data) {
        console.log('✅ Carregando dados para edição:', response.data)
        setEditingMovimentacao(response.data)
        setShowMovimentacaoForm(true)
      } else {
        console.error('❌ Erro ao carregar dados:', response)
        alert('Erro ao carregar dados para edição')
      }
    } catch (error) {
      console.error('❌ Erro ao carregar dados para edição:', error)
      alert('Erro ao carregar dados para edição')
    }
  }

  const handleVerDetalhesMovimentacao = async (movimentacao: MovimentacaoEstoque) => {
    try {
      console.log('🔍 Buscando detalhes da movimentação:', movimentacao.id)
      // Buscar detalhes completos da movimentação
      const response = await movimentacoesService.getById(movimentacao.id)
      console.log('📦 Resposta da API:', response)
      
      if (response.success && response.data) {
        console.log('✅ Dados carregados:', response.data)
        console.log('📋 Itens encontrados:', response.data.itens?.length || 0)
        setSelectedMovimentacao(response.data)
        setShowMovimentacaoDetails(true)
      } else {
        console.error('❌ Erro na resposta:', response)
        alert('Erro ao carregar detalhes da movimentação')
      }
    } catch (error) {
      console.error('❌ Erro ao carregar detalhes:', error)
      alert('Erro ao carregar detalhes da movimentação')
    }
  }

  const handleExcluirMovimentacao = async (movimentacao: MovimentacaoEstoque) => {
    if (confirm(`Tem certeza que deseja excluir a movimentação #${movimentacao.id}?`)) {
      try {
        setFormLoading(true)
        // TODO: Implementar exclusão quando a API estiver pronta
        alert('Funcionalidade de exclusão será implementada em breve')
      } catch (error) {
        console.error('❌ Erro ao excluir movimentação:', error)
        alert('Erro ao excluir movimentação')
      } finally {
        setFormLoading(false)
      }
    }
  }

  const handleConfirmarMovimentacao = async (movimentacao: MovimentacaoEstoque) => {
    if (confirm(`Confirmar a movimentação #${movimentacao.id}?\n\nIsso irá atualizar o estoque dos produtos.`)) {
      try {
        setFormLoading(true)
        const response = await movimentacoesService.updateStatus(movimentacao.id, 'confirmado')
        if (response.success) {
          await loadData() // Recarregar dados para atualizar estoque
          console.log('✅ Movimentação confirmada e estoque atualizado')
          alert('Movimentação confirmada! Estoque atualizado com sucesso.')
        } else {
          console.error('❌ Erro ao confirmar movimentação:', response.message)
          alert('Erro ao confirmar movimentação: ' + response.message)
        }
      } catch (error) {
        console.error('❌ Erro ao confirmar movimentação:', error)
        alert('Erro ao confirmar movimentação')
      } finally {
        setFormLoading(false)
      }
    }
  }

  const handleCancelarForm = () => {
    setShowProdutoForm(false)
    setShowFornecedorForm(false)
    setShowMovimentacaoForm(false)
    setEditingProduto(null)
    setEditingFornecedor(null)
  }

  // Estatísticas
  const totalValue = produtos.reduce((sum, produto) => sum + (produto.preco_venda * produto.estoque), 0)
  const totalCusto = produtos.reduce((sum, produto) => sum + (produto.preco_custo * produto.estoque), 0)
  const totalMargem = totalValue - totalCusto
  const lowStockCount = produtos.filter(produto => produto.estoque > 0 && produto.estoque <= 5).length
  const outOfStockCount = produtos.filter(produto => produto.estoque === 0).length
  const inStockCount = produtos.filter(produto => produto.estoque > 5).length

  const estoqueById = useMemo(() => {
    return estoques.reduce<Record<number, Estoque>>((acc, estoque) => {
      acc[estoque.id] = estoque
      return acc
    }, {})
  }, [estoques])

  const describeProdutoEstoques = (produto: Produto) => {
    if (Array.isArray(produto.estoques) && produto.estoques.length > 0) {
      return produto.estoques
        .map((item) => {
          const nome = item.estoque_nome ?? estoqueById[item.estoque_id]?.nome ?? 'Estoque não identificado'
          return typeof item.quantidade === 'number' ? `${nome} (${item.quantidade})` : nome
        })
        .join(', ')
    }

    const estoqueId = typeof produto.estoque_id === 'number'
      ? produto.estoque_id
      : produto.estoque_id
        ? Number(produto.estoque_id)
        : null

    if (estoqueId !== null && !Number.isNaN(estoqueId) && estoqueById[estoqueId]) {
      return estoqueById[estoqueId].nome
    }

    return 'Estoque não vinculado'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produtos & Estoque</h1>
          <p className="text-gray-600">Gerencie produtos, estoque e movimentações</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          {activeTab === 'produtos' && (
            <>
              <Button 
                className="bg-meguispet-primary hover:bg-meguispet-primary/90"
                onClick={handleNovoProduto}
              >
                <Plus className="mr-2 h-4 w-4" />
                Novo Produto
              </Button>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Exportar
              </Button>
            </>
          )}
          {activeTab === 'estoque' && (
            <>
              <Button 
                className="bg-meguispet-primary hover:bg-meguispet-primary/90"
                onClick={handleNovaMovimentacao}
              >
                <Truck className="mr-2 h-4 w-4" />
                Nova Movimentação
              </Button>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Relatório
              </Button>
            </>
          )}
          {activeTab === 'fornecedores' && (
            <Button 
              className="bg-meguispet-primary hover:bg-meguispet-primary/90"
              onClick={handleNovoFornecedor}
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo Fornecedor
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('produtos')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'produtos'
                ? 'border-meguispet-primary text-meguispet-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Package className="inline mr-2 h-4 w-4" />
            Produtos
          </button>
          <button
            onClick={() => setActiveTab('estoque')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'estoque'
                ? 'border-meguispet-primary text-meguispet-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Settings className="inline mr-2 h-4 w-4" />
            Estoque
          </button>
          <button
            onClick={() => setActiveTab('movimentacoes')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'movimentacoes'
                ? 'border-meguispet-primary text-meguispet-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Truck className="inline mr-2 h-4 w-4" />
            Movimentações
          </button>
          <button
            onClick={() => setActiveTab('fornecedores')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'fornecedores'
                ? 'border-meguispet-primary text-meguispet-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <ShoppingCart className="inline mr-2 h-4 w-4" />
            Fornecedores
          </button>
        </nav>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Produtos</CardTitle>
            <Package className="h-4 w-4 text-meguispet-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{produtos.length}</div>
            <p className="text-xs text-muted-foreground">Cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total Venda</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalValue)}</div>
            <p className="text-xs text-muted-foreground">Preço de venda</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total Custo</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalCusto)}</div>
            <p className="text-xs text-muted-foreground">Preço de custo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Margem de Lucro</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{formatCurrency(totalMargem)}</div>
            <p className="text-xs text-muted-foreground">
              {totalCusto > 0 ? `${((totalMargem / totalCusto) * 100).toFixed(1)}%` : '0%'}
            </p>
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
      </div>

      {/* Conteúdo das Tabs */}
      {activeTab === 'produtos' && (
        <>
          {/* Filtros */}
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
                <div className="w-full sm:w-64">
                  <label className="block text-sm font-medium text-gray-600 mb-1">Filtrar por estoque</label>
                  <select
                    value={estoqueFilter === 'all' ? '' : String(estoqueFilter)}
                    onChange={(e) => {
                      const value = e.target.value
                      setEstoqueFilter(value ? Number(value) : 'all')
                    }}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-meguispet-primary focus:outline-none"
                  >
                    <option value="">Todos os estoques</option>
                    {estoques.map(estoque => (
                      <option key={estoque.id} value={estoque.id}>{estoque.nome}</option>
                    ))}
                  </select>
                </div>
                <Button variant="outline">
                  <Filter className="mr-2 h-4 w-4" />
                  Filtros
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Produtos Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {loading ? (
              <div className="col-span-full flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-meguispet-primary"></div>
              </div>
            ) : (
              filteredProdutos.map((produto) => {
                const stockStatus = getStockStatus(produto.estoque)
                const StockIcon = stockStatus.icon
                
                return (
                  <Card key={produto.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg line-clamp-2">{produto.nome}</CardTitle>
                          <CardDescription className="mt-1">
                            {produto.categoria}
                          </CardDescription>
                        </div>
                        <div className="flex space-x-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => router.push(`/produto-detalhes?id=${produto.id}`)}
                            title="Ver detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleEditarProduto(produto)}
                            title="Editar produto"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Preço Venda:</span>
                        <span className="font-semibold text-lg text-green-600">{formatCurrency(produto.preco_venda)}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Preço Custo:</span>
                        <span className="font-semibold text-sm text-blue-600">{formatCurrency(produto.preco_custo)}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Margem:</span>
                        <span className="font-semibold text-sm text-purple-600">
                          {formatCurrency(produto.preco_venda - produto.preco_custo)} 
                          ({produto.preco_custo > 0 ? `${(((produto.preco_venda - produto.preco_custo) / produto.preco_custo) * 100).toFixed(1)}%` : '0%'})
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Estoque:</span>
                        <div className="flex items-center space-x-2">
                          <StockIcon className={`h-4 w-4 ${stockStatus.color}`} />
                          <span className={`text-sm font-medium ${stockStatus.color}`}>
                            {produto.estoque} {stockStatus.text}
                          </span>
                        </div>
                      </div>

                      <div>
                        <span className="text-sm text-gray-600 block">Local do estoque:</span>
                        <span className="text-sm font-medium text-gray-900 block text-right">{describeProdutoEstoques(produto)}</span>
                      </div>

                      <div className="pt-2">
                        <Button 
                          variant="outline" 
                          className="w-full"
                          disabled={produto.estoque === 0}
                        >
                          {produto.estoque === 0 ? 'Sem estoque' : 'Ver detalhes'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>

          {!loading && filteredProdutos.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Package className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum produto encontrado</h3>
                <p className="text-gray-600 text-center">
                  {searchTerm ? 'Tente ajustar os filtros de busca' : 'Comece adicionando seu primeiro produto'}
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {activeTab === 'estoque' && (
        <>
          {/* Filtros */}
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
                <div className="w-full sm:w-64">
                  <label className="block text-sm font-medium text-gray-600 mb-1">Estoque</label>
                  <select
                    value={estoqueFilter === 'all' ? '' : String(estoqueFilter)}
                    onChange={(e) => {
                      const value = e.target.value
                      setEstoqueFilter(value ? Number(value) : 'all')
                    }}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-meguispet-primary focus:outline-none"
                  >
                    <option value="">Todos os estoques</option>
                    {estoques.map(estoque => (
                      <option key={estoque.id} value={estoque.id}>{estoque.nome}</option>
                    ))}
                  </select>
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
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Produto</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Categoria</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Estoque</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Local</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Preço Venda</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Preço Custo</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Valor Total Venda</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Valor Total Custo</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Margem</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProdutos.map((produto) => {
                        const stockStatus = getStockStatus(produto.estoque)
                        const StockIcon = stockStatus.icon
                        const totalValueVenda = produto.preco_venda * produto.estoque
                        const totalValueCusto = produto.preco_custo * produto.estoque
                        const margemLucro = totalValueVenda - totalValueCusto
                        const margemPercentual = produto.preco_custo > 0 ? ((produto.preco_venda - produto.preco_custo) / produto.preco_custo) * 100 : 0
                        
                        return (
                          <tr key={produto.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                                  <Package className="h-4 w-4 text-gray-600" />
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900">{produto.nome}</div>
                                  <div className="text-sm text-gray-500">ID: #{produto.id}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-900">{produto.categoria || 'N/A'}</td>
                            <td className="py-3 px-4">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium">{produto.estoque}</span>
                                <StockIcon className={`h-4 w-4 ${stockStatus.color}`} />
                              </div>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-900">
                              {describeProdutoEstoques(produto)}
                            </td>
                            <td className="py-3 px-4 text-sm text-green-600 font-medium">
                              {formatCurrency(produto.preco_venda)}
                            </td>
                            <td className="py-3 px-4 text-sm text-blue-600 font-medium">
                              {formatCurrency(produto.preco_custo)}
                            </td>
                            <td className="py-3 px-4 text-sm font-medium text-green-600">
                              {formatCurrency(totalValueVenda)}
                            </td>
                            <td className="py-3 px-4 text-sm font-medium text-blue-600">
                              {formatCurrency(totalValueCusto)}
                            </td>
                            <td className="py-3 px-4 text-sm font-medium text-purple-600">
                              {formatCurrency(margemLucro)}
                              <br />
                              <span className="text-xs">({margemPercentual.toFixed(1)}%)</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${stockStatus.bgColor} ${stockStatus.color}`}>
                                {stockStatus.text}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex space-x-2">
                                <Button variant="ghost" size="sm" onClick={() => handleEditarProduto(produto)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" className="text-meguispet-primary">
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
        </>
      )}

      {activeTab === 'movimentacoes' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Movimentações ({movimentacoes.length})
                </CardTitle>
                <CardDescription>
                  Gerencie as movimentações de entrada e saída do estoque
                </CardDescription>
              </div>
              <Button 
                className="bg-meguispet-primary hover:bg-meguispet-primary/90"
                onClick={handleNovaMovimentacao}
              >
                <Plus className="mr-2 h-4 w-4" />
                Nova Movimentação
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-gray-500">Carregando movimentações...</div>
              </div>
            ) : movimentacoes.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-gray-900">ID</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Tipo</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Fornecedor</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Data</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Total</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimentacoes.map((movimentacao) => (
                      <tr key={movimentacao.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center">
                              <Truck className="h-4 w-4 text-green-600" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">#{movimentacao.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            movimentacao.tipo === 'entrada' 
                              ? 'bg-green-100 text-green-800' 
                              : movimentacao.tipo === 'saida'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {movimentacao.tipo === 'entrada' ? 'Entrada' : 
                             movimentacao.tipo === 'saida' ? 'Saída' : 'Ajuste'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900">
                          {movimentacao.fornecedor?.nome || 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900">
                          {new Date(movimentacao.data_movimentacao).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            movimentacao.status === 'confirmado' 
                              ? 'bg-green-100 text-green-800' 
                              : movimentacao.status === 'pendente'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {movimentacao.status === 'confirmado' ? 'Confirmada' : 
                             movimentacao.status === 'pendente' ? 'Pendente' : 'Cancelada'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm font-medium text-gray-900">
                          {formatCurrency(movimentacao.valor_total || 0)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleVerDetalhesMovimentacao(movimentacao)}
                              title="Ver detalhes"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {movimentacao.status === 'pendente' && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-green-600 hover:text-green-700"
                                onClick={() => handleConfirmarMovimentacao(movimentacao)}
                                disabled={formLoading}
                                title="Confirmar movimentação (atualiza estoque)"
                              >
                                <ArrowUpCircle className="h-4 w-4" />
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleEditarMovimentacao(movimentacao)}
                              title="Editar movimentação"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleExcluirMovimentacao(movimentacao)}
                              disabled={formLoading}
                              title="Excluir movimentação"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <Truck className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma movimentação encontrada</h3>
                <p className="text-gray-600 text-center mb-4">
                  Crie sua primeira movimentação para começar
                </p>
                <Button 
                  className="bg-meguispet-primary hover:bg-meguispet-primary/90"
                  onClick={handleNovaMovimentacao}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Movimentação
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'fornecedores' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Fornecedores ({fornecedores.length})
                </CardTitle>
                <CardDescription>
                  Gerencie seus fornecedores e parceiros comerciais
                </CardDescription>
              </div>
              <Button 
                className="bg-meguispet-primary hover:bg-meguispet-primary/90"
                onClick={handleNovoFornecedor}
              >
                <Plus className="mr-2 h-4 w-4" />
                Novo Fornecedor
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-gray-500">Carregando fornecedores...</div>
              </div>
            ) : fornecedores.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Fornecedor</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">CNPJ</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Email</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Telefone</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Cidade</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fornecedores.map((fornecedor) => (
                      <tr key={fornecedor.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                              <ShoppingCart className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{fornecedor.nome}</div>
                              {fornecedor.nome_fantasia && (
                                <div className="text-sm text-gray-500">{fornecedor.nome_fantasia}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900">
                          {fornecedor.cnpj || 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900">
                          {fornecedor.email || 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900">
                          {fornecedor.telefone || 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900">
                          {fornecedor.cidade && fornecedor.estado 
                            ? `${fornecedor.cidade}/${fornecedor.estado}` 
                            : 'N/A'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleEditarFornecedor(fornecedor)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleExcluirFornecedor(fornecedor)}
                              disabled={formLoading}
                              title="Excluir fornecedor"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <ShoppingCart className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum fornecedor encontrado</h3>
                <p className="text-gray-600 text-center mb-4">
                  Cadastre seu primeiro fornecedor para começar
                </p>
                <Button 
                  className="bg-meguispet-primary hover:bg-meguispet-primary/90"
                  onClick={handleNovoFornecedor}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Fornecedor
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Formulários Modais */}
      {showProdutoForm && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-lg">
          <ProdutoForm
            produto={editingProduto || undefined}
            onSubmit={handleSalvarProduto}
            onCancel={handleCancelarForm}
            loading={formLoading}
          />
        </div>
      )}

      {showFornecedorForm && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-lg">
          <FornecedorForm
            fornecedor={editingFornecedor || undefined}
            onSubmit={handleSalvarFornecedor}
            onCancel={handleCancelarForm}
            loading={formLoading}
          />
        </div>
      )}

      {showMovimentacaoForm && (
        <div className="modal-overlay fixed inset-0 z-[9999] flex items-center justify-center p-4 backdrop-blur-lg">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <MovimentacaoForm
              onSubmit={handleSalvarMovimentacao}
              onCancel={handleCancelarForm}
              loading={formLoading}
              editingData={editingMovimentacao ?? undefined}
            />
          </div>
        </div>
      )}

      {/* Modal de Detalhes da Movimentação */}
      {showMovimentacaoDetails && selectedMovimentacao && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-lg">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Detalhes da Movimentação #{selectedMovimentacao.id}
                </h2>
                <button
                  onClick={() => setShowMovimentacaoDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Informações Gerais */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-700 mb-2">Tipo</h3>
                  <span className={`inline-flex px-2 py-1 text-sm font-medium rounded-full ${
                    selectedMovimentacao.tipo === 'entrada' 
                      ? 'bg-green-100 text-green-800' 
                      : selectedMovimentacao.tipo === 'saida'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {selectedMovimentacao.tipo === 'entrada' ? 'Entrada' : 
                     selectedMovimentacao.tipo === 'saida' ? 'Saída' : 'Ajuste'}
                  </span>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-700 mb-2">Status</h3>
                  <span className={`inline-flex px-2 py-1 text-sm font-medium rounded-full ${
                    selectedMovimentacao.status === 'confirmado' 
                      ? 'bg-green-100 text-green-800' 
                      : selectedMovimentacao.status === 'pendente'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedMovimentacao.status === 'confirmado' ? 'Confirmada' : 
                     selectedMovimentacao.status === 'pendente' ? 'Pendente' : 'Cancelada'}
                  </span>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-700 mb-2">Data</h3>
                  <p className="text-gray-900">
                    {selectedMovimentacao.data_movimentacao ? 
                      new Date(selectedMovimentacao.data_movimentacao).toLocaleDateString('pt-BR') : 
                      'Data não informada'
                    }
                  </p>
                </div>
              </div>

              {/* Fornecedor e Condições */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-700 mb-2">Fornecedor</h3>
                  <p className="text-gray-900">
                    {selectedMovimentacao.fornecedor?.nome || 'N/A'}
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-700 mb-2">Condição de Pagamento</h3>
                  <p className="text-gray-900">
                    {selectedMovimentacao.condicao_pagamento}
                  </p>
                </div>
              </div>

              {/* Produtos */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-700 mb-4">Produtos</h3>
                {selectedMovimentacao.itens && selectedMovimentacao.itens.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Produto
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Quantidade
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Preço Unitário
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Subtotal
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedMovimentacao.itens.map((item) => (
                          <tr key={item.id}>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {item.produto?.nome || 'Produto não encontrado'}
                                </div>
                                <div className="text-sm text-gray-500">
                                  Código: {item.produto?.codigo_barras || 'N/A'}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                              {item.quantidade}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                              }).format(item.preco_unitario)}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                              }).format(item.subtotal)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500">Nenhum produto encontrado</p>
                )}
              </div>

              {/* Valor Total */}
              <div className="bg-blue-50 p-4 rounded-lg mb-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-gray-700">Valor Total:</h3>
                  <span className="text-2xl font-bold text-blue-900">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(selectedMovimentacao.valor_total || 0)}
                  </span>
                </div>
              </div>

              {/* Observações */}
              {selectedMovimentacao.observacoes && (
                <div className="mb-4">
                  <h3 className="font-semibold text-gray-700 mb-2">Observações</h3>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">
                    {selectedMovimentacao.observacoes}
                  </p>
                </div>
              )}

              {/* Botões de Ação */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowMovimentacaoDetails(false)}
                >
                  Fechar
                </Button>
                {selectedMovimentacao.status === 'pendente' && (
                  <Button
                    onClick={() => {
                      setShowMovimentacaoDetails(false)
                      handleConfirmarMovimentacao(selectedMovimentacao)
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <ArrowUpCircle className="h-4 w-4 mr-2" />
                    Confirmar Movimentação
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
