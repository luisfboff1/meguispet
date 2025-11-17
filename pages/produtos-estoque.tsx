import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/router'
import { ColumnDef } from '@tanstack/react-table'
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
  X
} from 'lucide-react'
import { produtosService, movimentacoesService, estoquesService } from '@/services/api'
import AlertDialog from '@/components/ui/AlertDialog'
import type {
  Produto,
  MovimentacaoEstoque,
  MovimentacaoForm as MovimentacaoFormValues,
  ProdutoForm as ProdutoFormValues,
  Estoque
} from '@/types'
import ProdutoForm from '@/components/forms/ProdutoForm'
import MovimentacaoForm from '@/components/forms/MovimentacaoForm'
import { DataTable, SortableHeader } from '@/components/ui/data-table'

// Helper function to format currency
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

// Helper function to get stock quantity by location name
const getStockByLocation = (produto: Produto, locationName: string): number => {
  if (!produto.estoques || !Array.isArray(produto.estoques)) {
    return 0
  }
  
  const stockItem = produto.estoques.find((item) => {
    // Access the nested estoque.nome property or fallback to estoque_nome for backwards compatibility
    const nome = item.estoque?.nome || item.estoque_nome || ''
    const nomeLower = nome.toLowerCase()
    const locationLower = locationName.toLowerCase()
    
    // Match by location abbreviation or full name
    // RS -> "Rio Grande do Sul" or names containing "RS"
    // SP -> "São Paulo" or names containing "SP"
    if (locationLower === 'rs') {
      return nomeLower.includes('rio grande do sul') || nomeLower.includes(' rs')
    }
    if (locationLower === 'sp') {
      return nomeLower.includes('são paulo') || nomeLower.includes('sao paulo') || nomeLower.includes(' sp')
    }
    
    // Default: case-insensitive substring match
    return nomeLower.includes(locationLower)
  })
  
  return stockItem ? Number(stockItem.quantidade || 0) : 0
}

export default function ProdutosEstoquePage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'produtos' | 'estoque' | 'movimentacoes'>('produtos')
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [estoques, setEstoques] = useState<Estoque[]>([])
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoEstoque[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'low' | 'out' | 'ok'>('all')
  const [estoqueFilter, setEstoqueFilter] = useState<number | 'all'>('all')
  
  // Estados para formulários
  const [showProdutoForm, setShowProdutoForm] = useState(false)
  const [showMovimentacaoForm, setShowMovimentacaoForm] = useState(false)
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null)
  const [editingMovimentacao, setEditingMovimentacao] = useState<MovimentacaoEstoque | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const [alertDialog, setAlertDialog] = useState<{ title: string; message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null)
  
  // Estados para modal de detalhes
  const [showMovimentacaoDetails, setShowMovimentacaoDetails] = useState(false)
  const [selectedMovimentacao, setSelectedMovimentacao] = useState<MovimentacaoEstoque | null>(null)

  // Handlers para produtos
  const handleNovoProduto = () => {
    setEditingProduto(null)
    setShowProdutoForm(true)
  }

  const handleEditarProduto = (produto: Produto) => {
    setEditingProduto(produto)
    setShowProdutoForm(true)
  }

  // Column definitions for products table
  const productColumns = useMemo<ColumnDef<Produto>[]>(() => {
    return [
    {
      accessorKey: "nome",
      header: ({ column }) => <SortableHeader column={column}>Produto</SortableHeader>,
      cell: ({ row }) => (
        <div className="flex items-center space-x-3 min-w-[200px]">
          <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
            <Package className="h-4 w-4 text-gray-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">{row.original.nome}</div>
            <div className="text-sm text-gray-500">{row.original.categoria || 'N/A'}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "preco_venda",
      header: ({ column }) => <SortableHeader column={column}>Preço Venda</SortableHeader>,
      cell: ({ row }) => (
        <div className="text-green-600 font-medium">
          {formatCurrency(row.original.preco_venda)}
        </div>
      ),
    },
    {
      accessorKey: "preco_custo",
      header: ({ column }) => <SortableHeader column={column}>Preço Custo</SortableHeader>,
      cell: ({ row }) => (
        <div className="text-blue-600 font-medium">
          {formatCurrency(row.original.preco_custo)}
        </div>
      ),
    },
    {
      id: "margem",
      header: ({ column }) => <SortableHeader column={column}>Margem</SortableHeader>,
      accessorFn: (row) => row.preco_venda - row.preco_custo,
      cell: ({ row }) => {
        const margem = row.original.preco_venda - row.original.preco_custo
        const margemPercentual = row.original.preco_custo > 0 
          ? ((margem / row.original.preco_custo) * 100).toFixed(1)
          : '0'
        return (
          <div className="text-purple-600 font-medium">
            {formatCurrency(margem)}
            <br />
            <span className="text-xs">({margemPercentual}%)</span>
          </div>
        )
      },
    },
    {
      id: "estoque_rs",
      header: ({ column }) => <SortableHeader column={column}>Estoque (RS)</SortableHeader>,
      accessorFn: (row) => getStockByLocation(row, 'RS'),
      cell: ({ row }) => (
        <div className="text-center font-medium">
          {getStockByLocation(row.original, 'RS')}
        </div>
      ),
    },
    {
      id: "estoque_sp",
      header: ({ column }) => <SortableHeader column={column}>Estoque (SP)</SortableHeader>,
      accessorFn: (row) => getStockByLocation(row, 'SP'),
      cell: ({ row }) => (
        <div className="text-center font-medium">
          {getStockByLocation(row.original, 'SP')}
        </div>
      ),
    },
    {
      accessorKey: "estoque",
      header: ({ column }) => <SortableHeader column={column}>Estoque Total</SortableHeader>,
      cell: ({ row }) => (
        <div className="text-center font-bold text-gray-900">
          {row.original.estoque}
        </div>
      ),
    },
    {
      id: "acoes",
      header: "Ações",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => handleEditarProduto(row.original)}
            title="Editar produto"
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]
  }, [])

  // Column definitions for estoque (stock) table
  const estoqueColumns = useMemo<ColumnDef<Produto>[]>(() => {
    return [
    {
      accessorKey: "nome",
      header: ({ column }) => <SortableHeader column={column}>Produto</SortableHeader>,
      cell: ({ row }) => (
        <div className="flex items-center space-x-3 min-w-[200px]">
          <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
            <Package className="h-4 w-4 text-gray-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">{row.original.nome}</div>
            <div className="text-sm text-gray-500">ID: #{row.original.id}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "categoria",
      header: ({ column }) => <SortableHeader column={column}>Categoria</SortableHeader>,
      cell: ({ row }) => (
        <div className="text-sm text-gray-900">{row.original.categoria || 'N/A'}</div>
      ),
    },
    {
      accessorKey: "estoque",
      header: ({ column }) => <SortableHeader column={column}>Estoque</SortableHeader>,
      cell: ({ row }) => {
        const stockStatus = getStockStatus(row.original.estoque)
        const StockIcon = stockStatus.icon
        return (
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">{row.original.estoque}</span>
            <StockIcon className={`h-4 w-4 ${stockStatus.color}`} />
          </div>
        )
      },
    },
    {
      id: "local",
      header: ({ column }) => <SortableHeader column={column}>Local</SortableHeader>,
      cell: ({ row }) => (
        <div className="text-sm text-gray-900">
          {describeProdutoEstoques(row.original)}
        </div>
      ),
    },
    {
      accessorKey: "preco_venda",
      header: ({ column }) => <SortableHeader column={column}>Preço Venda</SortableHeader>,
      cell: ({ row }) => (
        <div className="text-sm text-green-600 font-medium">
          {formatCurrency(row.original.preco_venda)}
        </div>
      ),
    },
    {
      accessorKey: "preco_custo",
      header: ({ column }) => <SortableHeader column={column}>Preço Custo</SortableHeader>,
      cell: ({ row }) => (
        <div className="text-sm text-blue-600 font-medium">
          {formatCurrency(row.original.preco_custo)}
        </div>
      ),
    },
    {
      id: "valor_total_venda",
      header: ({ column }) => <SortableHeader column={column}>Valor Total Venda</SortableHeader>,
      accessorFn: (row) => row.preco_venda * row.estoque,
      cell: ({ row }) => {
        const totalValueVenda = row.original.preco_venda * row.original.estoque
        return (
          <div className="text-sm font-medium text-green-600">
            {formatCurrency(totalValueVenda)}
          </div>
        )
      },
    },
    {
      id: "valor_total_custo",
      header: ({ column }) => <SortableHeader column={column}>Valor Total Custo</SortableHeader>,
      accessorFn: (row) => row.preco_custo * row.estoque,
      cell: ({ row }) => {
        const totalValueCusto = row.original.preco_custo * row.original.estoque
        return (
          <div className="text-sm font-medium text-blue-600">
            {formatCurrency(totalValueCusto)}
          </div>
        )
      },
    },
    {
      id: "margem",
      header: ({ column }) => <SortableHeader column={column}>Margem</SortableHeader>,
      accessorFn: (row) => (row.preco_venda - row.preco_custo) * row.estoque,
      cell: ({ row }) => {
        const totalValueVenda = row.original.preco_venda * row.original.estoque
        const totalValueCusto = row.original.preco_custo * row.original.estoque
        const margemLucro = totalValueVenda - totalValueCusto
        const margemPercentual = row.original.preco_custo > 0 
          ? ((row.original.preco_venda - row.original.preco_custo) / row.original.preco_custo) * 100 
          : 0
        return (
          <div className="text-sm font-medium text-purple-600">
            {formatCurrency(margemLucro)}
            <br />
            <span className="text-xs">({margemPercentual.toFixed(1)}%)</span>
          </div>
        )
      },
    },
    {
      id: "status",
      header: ({ column }) => <SortableHeader column={column}>Status</SortableHeader>,
      cell: ({ row }) => {
        const stockStatus = getStockStatus(row.original.estoque)
        return (
          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${stockStatus.bgColor} ${stockStatus.color}`}>
            {stockStatus.text}
          </span>
        )
      },
    },
    {
      id: "acoes",
      header: "Ações",
      cell: ({ row }) => (
        <div className="flex space-x-2">
          <Button variant="ghost" size="sm" onClick={() => handleEditarProduto(row.original)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-meguispet-primary">
            Ajustar
          </Button>
        </div>
      ),
    },
  ]
  }, [])

  // Column definitions for movimentacoes (movements) table
  const movimentacoesColumns = useMemo<ColumnDef<MovimentacaoEstoque>[]>(() => {
    return [
    {
      accessorKey: "id",
      header: ({ column }) => <SortableHeader column={column}>ID</SortableHeader>,
      cell: ({ row }) => (
        <div className="flex items-center space-x-3 min-w-[120px]">
          <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center flex-shrink-0">
            <Truck className="h-4 w-4 text-green-600" />
          </div>
          <div className="font-medium text-gray-900">#{row.original.id}</div>
        </div>
      ),
    },
    {
      accessorKey: "tipo",
      header: ({ column }) => <SortableHeader column={column}>Tipo</SortableHeader>,
      cell: ({ row }) => (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
          row.original.tipo === 'entrada' 
            ? 'bg-green-100 text-green-800' 
            : row.original.tipo === 'saida'
            ? 'bg-red-100 text-red-800'
            : 'bg-yellow-100 text-yellow-800'
        }`}>
          {row.original.tipo === 'entrada' ? 'Entrada' : 
           row.original.tipo === 'saida' ? 'Saída' : 'Ajuste'}
        </span>
      ),
    },
    {
      id: "fornecedor",
      header: "Fornecedor",
      accessorFn: (row) => row.fornecedor?.nome || 'N/A',
      cell: ({ row }) => (
        <div className="text-sm text-gray-900">
          {row.original.fornecedor?.nome || 'N/A'}
        </div>
      ),
    },
    {
      accessorKey: "data_movimentacao",
      header: ({ column }) => <SortableHeader column={column}>Data</SortableHeader>,
      cell: ({ row }) => (
        <div className="text-sm text-gray-900">
          {new Date(row.original.data_movimentacao).toLocaleDateString('pt-BR')}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => <SortableHeader column={column}>Status</SortableHeader>,
      cell: ({ row }) => (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
          row.original.status === 'confirmado' 
            ? 'bg-green-100 text-green-800' 
            : row.original.status === 'pendente'
            ? 'bg-yellow-100 text-yellow-800'
            : 'bg-gray-100 text-gray-800'
        }`}>
          {row.original.status === 'confirmado' ? 'Confirmada' : 
           row.original.status === 'pendente' ? 'Pendente' : 'Cancelada'}
        </span>
      ),
    },
    {
      accessorKey: "valor_total",
      header: ({ column }) => <SortableHeader column={column}>Total</SortableHeader>,
      cell: ({ row }) => (
        <div className="text-sm font-medium text-gray-900">
          {formatCurrency(row.original.valor_total || 0)}
        </div>
      ),
    },
    {
      id: "acoes",
      header: "Ações",
      cell: ({ row }) => (
        <div className="flex space-x-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleVerDetalhesMovimentacao(row.original)}
            title="Ver detalhes"
          >
            <Eye className="h-4 w-4" />
          </Button>
          {row.original.status === 'pendente' && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-green-600 hover:text-green-700"
              onClick={() => handleConfirmarMovimentacao(row.original)}
              disabled={formLoading}
              title="Confirmar movimentação (atualiza estoque)"
            >
              <ArrowUpCircle className="h-4 w-4" />
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleEditarMovimentacao(row.original)}
            title="Editar movimentação"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-red-600 hover:text-red-700"
            onClick={() => handleExcluirMovimentacao(row.original)}
            disabled={formLoading}
            title="Excluir movimentação"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]
  }, [formLoading])

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
        // Debug: inspect the first product's estoques shape
        if (process.env.NODE_ENV === 'development' && produtosResponse.data.length) {
        }
      }

      // Carregar estoques
      try {
        const estoquesResponse = await estoquesService.getAll(true)
        if (estoquesResponse.success && estoquesResponse.data) {
          setEstoques(estoquesResponse.data)
        }
      } catch (error) {
      }
      
      // Carregar movimentações
      try {
        const movimentacoesResponse = await movimentacoesService.getAll(1, 100)
        if (movimentacoesResponse.success && movimentacoesResponse.data) {
          setMovimentacoes(movimentacoesResponse.data)
        }
      } catch (error) {
      }
      
    } catch (error) {
    } finally {
      setLoading(false)
    }
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

  const handleSalvarProduto = async (produtoData: ProdutoFormValues) => {
    try {
      setFormLoading(true)

      if (editingProduto) {
        const response = await produtosService.update(editingProduto.id, produtoData)
        if (response.success) {
          await loadData()
          setShowProdutoForm(false)
          setEditingProduto(null)
          setAlertDialog({
            title: '✅ Produto Atualizado',
            message: `O produto "${produtoData.nome}" foi atualizado com sucesso! O estoque foi distribuído conforme configurado.`,
            type: 'success',
          })
        } else {
          setAlertDialog({
            title: '❌ Erro ao Atualizar Produto',
            message: response.message || 'Não foi possível atualizar o produto. Tente novamente.',
            type: 'error',
          })
        }
      } else {
        const response = await produtosService.create(produtoData)
        if (response.success) {
          await loadData()
          setShowProdutoForm(false)
          setAlertDialog({
            title: '✅ Produto Cadastrado',
            message: `O produto "${produtoData.nome}" foi cadastrado com sucesso! O estoque foi distribuído nos locais selecionados.`,
            type: 'success',
          })
        } else {
          setAlertDialog({
            title: '❌ Erro ao Cadastrar Produto',
            message: response.message || 'Não foi possível cadastrar o produto. Verifique os dados e tente novamente.',
            type: 'error',
          })
        }
      }
    } catch (error) {
      setAlertDialog({
        title: '❌ Erro Inesperado',
        message: 'Ocorreu um erro ao salvar o produto. Tente novamente mais tarde.',
        type: 'error',
      })
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
    } finally {
      setFormLoading(false)
    }
  }

  const handleEditarMovimentacao = async (movimentacao: MovimentacaoEstoque) => {
    try {
      // Buscar detalhes completos da movimentação
      const response = await movimentacoesService.getById(movimentacao.id)
      
      if (response.success && response.data) {
        setEditingMovimentacao(response.data)
        setShowMovimentacaoForm(true)
      } else {
        alert('Erro ao carregar dados para edição')
      }
    } catch (error) {
      alert('Erro ao carregar dados para edição')
    }
  }

  const handleVerDetalhesMovimentacao = async (movimentacao: MovimentacaoEstoque) => {
    try {
      // Buscar detalhes completos da movimentação
      const response = await movimentacoesService.getById(movimentacao.id)
      
      if (response.success && response.data) {
        setSelectedMovimentacao(response.data)
        setShowMovimentacaoDetails(true)
      } else {
        alert('Erro ao carregar detalhes da movimentação')
      }
    } catch (error) {
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
          alert('Movimentação confirmada! Estoque atualizado com sucesso.')
        } else {
          alert('Erro ao confirmar movimentação: ' + response.message)
        }
      } catch (error) {
        alert('Erro ao confirmar movimentação')
      } finally {
        setFormLoading(false)
      }
    }
  }

  const handleCancelarForm = () => {
    setShowProdutoForm(false)
    setShowMovimentacaoForm(false)
    setEditingProduto(null)
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
    // Verificar se o produto tem estoques
    if (!produto.estoques || !Array.isArray(produto.estoques) || produto.estoques.length === 0) {
      return 'Nenhum estoque vinculado'
    }

    // Mapear estoques para exibição
    const estoquesFormatados = produto.estoques.map((item: { estoque_id?: number; estoqueId?: number; estoque?: { id?: number; nome?: string }; quantidade?: number }) => {
      // Extrair estoque_id
      const estoqueId = item.estoque_id || item.estoqueId || (item.estoque?.id)

      // Extrair nome do estoque
      let nomeEstoque = 'Estoque não identificado'
      if (item.estoque && typeof item.estoque === 'object' && item.estoque.nome) {
        nomeEstoque = item.estoque.nome
      } else if (estoqueId) {
        const estoqueEncontrado = estoques.find(e => Number(e.id) === Number(estoqueId))
        nomeEstoque = estoqueEncontrado?.nome || `Estoque #${estoqueId}`
      }

      // Extrair quantidade
      const quantidade = Number(item.quantidade || 0)

      return { nome: nomeEstoque, quantidade }
    })

    // Agrupar por nome e somar quantidades
    const agrupado = estoquesFormatados.reduce((acc: Record<string, number>, item) => {
      if (!acc[item.nome]) {
        acc[item.nome] = 0
      }
      acc[item.nome] += item.quantidade
      return acc
    }, {})

    // Formatar para exibição
    const resultado = Object.entries(agrupado)
      .map(([nome, qtd]) => `${nome} (${qtd})`)
      .join(', ')

    return resultado || 'Estoque não vinculado'
  }

  return (
    <div className="space-y-6">
      {alertDialog && (
        <AlertDialog
          title={alertDialog.title}
          message={alertDialog.message}
          type={alertDialog.type}
          onClose={() => setAlertDialog(null)}
        />
      )}
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
        </nav>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4 md:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium truncate pr-2">Total Produtos</CardTitle>
            <Package className="h-4 w-4 text-meguispet-primary flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold whitespace-nowrap">{produtos.length}</div>
            <p className="text-xs text-muted-foreground truncate">Cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium truncate pr-2">Valor Total Venda</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600 flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 whitespace-nowrap">{formatCurrency(totalValue)}</div>
            <p className="text-xs text-muted-foreground truncate">Preço de venda</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium truncate pr-2">Valor Total Custo</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600 flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 whitespace-nowrap">{formatCurrency(totalCusto)}</div>
            <p className="text-xs text-muted-foreground truncate">Preço de custo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium truncate pr-2">Margem de Lucro</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600 flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600 whitespace-nowrap">{formatCurrency(totalMargem)}</div>
            <p className="text-xs text-muted-foreground truncate">
              {totalCusto > 0 ? `${((totalMargem / totalCusto) * 100).toFixed(1)}%` : '0%'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium truncate pr-2">Estoque Baixo</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600 whitespace-nowrap">{lowStockCount}</div>
            <p className="text-xs text-muted-foreground truncate">Produtos</p>
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

          {/* Produtos Table */}
          {loading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-meguispet-primary"></div>
              </CardContent>
            </Card>
          ) : filteredProdutos.length > 0 ? (
            <DataTable 
              columns={productColumns} 
              data={filteredProdutos}
              enableColumnResizing={true}
              enableSorting={true}
              enableColumnVisibility={true}
              mobileVisibleColumns={['nome', 'preco_venda', 'estoque_total', 'acoes']}
            />
          ) : (
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

          {/* Estoque Table */}
          {loading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-meguispet-primary"></div>
              </CardContent>
            </Card>
          ) : filteredProdutos.length > 0 ? (
            <DataTable 
              columns={estoqueColumns} 
              data={filteredProdutos}
              enableColumnResizing={true}
              enableSorting={true}
              enableColumnVisibility={true}
              mobileVisibleColumns={['nome', 'estoque_total', 'acoes']}
            />
          ) : (
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
        <>
          {loading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-gray-500">Carregando movimentações...</div>
              </CardContent>
            </Card>
          ) : movimentacoes.length > 0 ? (
            <DataTable 
              columns={movimentacoesColumns} 
              data={movimentacoes}
              enableColumnResizing={true}
              enableSorting={true}
              enableColumnVisibility={true}
              mobileVisibleColumns={['tipo_movimentacao', 'valor_total', 'created_at', 'acoes']}
            />
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
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
              </CardContent>
            </Card>
          )}
        </>
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
