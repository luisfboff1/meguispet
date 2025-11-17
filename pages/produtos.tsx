import React, { useState, useEffect, useCallback } from 'react'
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
  AlertTriangle
} from 'lucide-react'
import { produtosService } from '@/services/api'
import type { Produto, ProdutoForm as ProdutoFormValues } from '@/types'
import { useModal } from '@/hooks/useModal'

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const { open: openModal, close: closeModal, setData: setModalData } = useModal()

  const loadProdutos = useCallback(async () => {
    try {
      setLoading(true)
      const response = await produtosService.getAll(currentPage, 10)
      if (response.success && response.data) {
        setProdutos(response.data)
      }
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }, [currentPage])

  useEffect(() => {
    loadProdutos()
  }, [loadProdutos])

  const filteredProdutos = produtos.filter(produto =>
    produto.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    produto.categoria?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const getStockStatus = (estoque: number) => {
    if (estoque === 0) return { color: 'text-red-600', icon: AlertTriangle, text: 'Sem estoque' }
    if (estoque <= 5) return { color: 'text-yellow-600', icon: AlertTriangle, text: 'Estoque baixo' }
    return { color: 'text-green-600', icon: Package, text: 'Em estoque' }
  }

  type ProdutoModalPayload = {
    produto?: Produto
    loading?: boolean
    onSubmit: (values: ProdutoFormValues) => Promise<void> | void
    onCancel?: () => void
  }

  const updateProdutoModalLoading = useCallback(
    (loadingState: boolean) => {
  setModalData((current: unknown) => {
        if (!current || typeof current !== 'object') {
          return current
        }
        return {
          ...(current as ProdutoModalPayload),
          loading: loadingState
        }
      })
    },
    [setModalData]
  )

  const openProdutoModal = useCallback(
    (produto?: Produto) => {
      openModal('produto', {
        produto,
        loading: false,
        onCancel: () => updateProdutoModalLoading(false),
            onSubmit: async (formValues: ProdutoFormValues) => {
          updateProdutoModalLoading(true)
          try {
            // Debug: log payload before sending to API
            if (produto) {
              const response = await produtosService.update(produto.id, formValues)
              if (response.success) {
                await loadProdutos()
                closeModal()
              }
            } else {
              const response = await produtosService.create(formValues)
              if (response.success) {
                await loadProdutos()
                closeModal()
              } else {
                // show backend message for debugging
                window.alert('Erro ao criar produto: ' + (response.message || response.error || 'não especificado'))
              }
            }
          } catch (error) {
          } finally {
            updateProdutoModalLoading(false)
          }
        }
      } satisfies ProdutoModalPayload)
    },
    [closeModal, loadProdutos, openModal, updateProdutoModalLoading]
  )

  const totalValue = produtos.reduce((sum, produto) => sum + (produto.preco_venda * produto.estoque), 0)
  const lowStockProducts = produtos.filter(produto => produto.estoque <= 5).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produtos</h1>
          <p className="text-gray-600">Gerencie seu catálogo de produtos</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Button 
            className="bg-meguispet-primary hover:bg-meguispet-primary/90"
            onClick={() => openProdutoModal()}
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Produto
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-meguispet-primary" />
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
            <div className="text-2xl font-bold text-yellow-600">{lowStockProducts}</div>
            <p className="text-xs text-muted-foreground">Produtos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categorias</CardTitle>
            <TrendingUp className="h-4 w-4 text-meguispet-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(produtos.map(p => p.categoria)).size}
            </div>
            <p className="text-xs text-muted-foreground">Diferentes</p>
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
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openProdutoModal(produto)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Preço:</span>
                    <span className="font-semibold text-lg">{formatCurrency(produto.preco_venda)}</span>
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


                  <div className="pt-2">
                    <Button 
                      variant="outline" 
                      className="w-full"
                      disabled={produto.estoque === 0}
                    >
                      {produto.estoque === 0 ? 'Sem estoque' : 'Adicionar ao carrinho'}
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
    </div>
  )
}
