import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  ArrowLeft, 
  Edit, 
  Package, 
  DollarSign, 
  TrendingUp, 
  Calendar,
  History,
  AlertTriangle
} from 'lucide-react'
import { produtosService } from '@/services/api'
import { Produto } from '@/types'

interface HistoricoPreco {
  id: number
  preco_venda: number
  preco_custo: number
  data_alteracao: string
  tipo_alteracao: 'manual' | 'automatico' | 'movimentacao'
  observacao?: string
  // Campos adicionais da API
  preco_venda_anterior?: number
  preco_custo_anterior?: number
  diferenca_preco_venda?: number
  diferenca_preco_custo?: number
  percentual_mudanca_venda?: number
  percentual_mudanca_custo?: number
}

interface HistoricoPrecoApiItem {
  id: number
  preco_venda_novo: number
  preco_custo_novo: number
  created_at: string
  tipo_alteracao: 'manual' | 'automatico' | 'movimentacao'
  observacao?: string
  preco_venda_anterior?: number
  preco_custo_anterior?: number
  diferenca_preco_venda?: number
  diferenca_preco_custo?: number
  percentual_mudanca_venda?: number
  percentual_mudanca_custo?: number
}

const isHistoricoPrecoApiItem = (value: unknown): value is HistoricoPrecoApiItem => {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<HistoricoPrecoApiItem>
  return (
    typeof item.id === 'number' &&
    typeof item.preco_venda_novo === 'number' &&
    typeof item.preco_custo_novo === 'number' &&
    typeof item.created_at === 'string' &&
    typeof item.tipo_alteracao === 'string'
  )
}

export default function ProdutoDetalhes() {
  const router = useRouter()
  const { id } = router.query
  
  const [produto, setProduto] = useState<Produto | null>(null)
  const [historicoPrecos, setHistoricoPrecos] = useState<HistoricoPreco[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showEditForm, setShowEditForm] = useState(false)
  const [editData, setEditData] = useState({
    nome: '',
    descricao: '',
    preco_venda: 0,
    preco_custo: 0,
    estoque: 0,
    estoque_minimo: 0,
    categoria: '',
    codigo_barras: '',
    ativo: true
  })

  useEffect(() => {
    if (id) {
      loadProduto()
      loadHistoricoPrecos()
    }
  }, [id])

  const loadProduto = async () => {
    try {
      setLoading(true)
      const response = await produtosService.getById(Number(id))
      if (response.success && response.data) {
        setProduto(response.data)
        setEditData({
          nome: response.data.nome,
          descricao: response.data.descricao || '',
          preco_venda: response.data.preco_venda,
          preco_custo: response.data.preco_custo,
          estoque: response.data.estoque,
          estoque_minimo: response.data.estoque_minimo,
          categoria: response.data.categoria || '',
          codigo_barras: response.data.codigo_barras || '',
          ativo: response.data.ativo
        })
      } else {
        setError('Produto não encontrado')
      }
    } catch (err) {
      setError('Erro ao carregar produto')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadHistoricoPrecos = async () => {
    try {
      if (!id) return
      
      const response = await fetch(`/api/historico-precos.php?produto_id=${id}&limit=20`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('📦 Dados do histórico:', data)
        if (data.success && Array.isArray(data.data)) {
          const historicoMapeado = data.data
            .filter(isHistoricoPrecoApiItem)
            .map((item: HistoricoPrecoApiItem) => ({
              id: item.id,
              preco_venda: item.preco_venda_novo,
              preco_custo: item.preco_custo_novo,
              data_alteracao: item.created_at,
              tipo_alteracao: item.tipo_alteracao,
              observacao: item.observacao,
              preco_venda_anterior: item.preco_venda_anterior,
              preco_custo_anterior: item.preco_custo_anterior,
              diferenca_preco_venda: item.diferenca_preco_venda,
              diferenca_preco_custo: item.diferenca_preco_custo,
              percentual_mudanca_venda: item.percentual_mudanca_venda,
              percentual_mudanca_custo: item.percentual_mudanca_custo
            }))
          setHistoricoPrecos(historicoMapeado)
        } else {
          // Se não há histórico, manter array vazio
          setHistoricoPrecos([])
        }
      } else {
        console.error('Erro ao carregar histórico de preços:', response.statusText)
        setHistoricoPrecos([])
      }
    } catch (err) {
      console.error('Erro ao carregar histórico de preços:', err)
      setHistoricoPrecos([])
    }
  }

  const handleSaveEdit = async () => {
    try {
      setLoading(true)
      const response = await produtosService.update(Number(id), editData)
      if (response.success && response.data) {
        setProduto(response.data)
        setShowEditForm(false)
        await loadProduto()
      } else {
        setError('Erro ao atualizar produto')
      }
    } catch (err) {
      setError('Erro ao atualizar produto')
      console.error(err)
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusEstoque = () => {
    if (!produto) return { text: '', color: '', bgColor: '' }
    
    if (produto.estoque === 0) {
      return { text: 'Sem Estoque', color: 'text-red-600', bgColor: 'bg-red-100' }
    } else if (produto.estoque <= produto.estoque_minimo) {
      return { text: 'Estoque Baixo', color: 'text-yellow-600', bgColor: 'bg-yellow-100' }
    } else {
      return { text: 'Em Estoque', color: 'text-green-600', bgColor: 'bg-green-100' }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando produto...</p>
        </div>
      </div>
    )
  }

  if (error || !produto) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <Button 
            onClick={() => router.back()}
            variant="outline"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </div>
        
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {error || 'Produto não encontrado'}
            </h2>
            <p className="text-gray-600">
              O produto que você está procurando não foi encontrado ou houve um erro ao carregá-lo.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const statusEstoque = getStatusEstoque()
  const margemLucro = produto.preco_venda - produto.preco_custo
  const margemPercentual = produto.preco_custo > 0 ? ((margemLucro / produto.preco_custo) * 100) : 0

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button 
            onClick={() => router.back()}
            variant="outline"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{produto.nome}</h1>
            <p className="text-gray-600">{produto.categoria || 'Sem categoria'}</p>
          </div>
        </div>
        
        <Button 
          onClick={() => setShowEditForm(true)}
          className="flex items-center gap-2"
        >
          <Edit className="h-4 w-4" />
          Editar Produto
        </Button>
      </div>

      {/* Cards de Informações */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Preço de Venda</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(produto.preco_venda)}
            </div>
            <p className="text-xs text-muted-foreground">Preço ao cliente</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Preço de Custo</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(produto.preco_custo)}
            </div>
            <p className="text-xs text-muted-foreground">Preço médio ponderado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Margem de Lucro</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(margemLucro)}
            </div>
            <p className="text-xs text-muted-foreground">
              {margemPercentual.toFixed(1)}% de margem
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estoque Atual</CardTitle>
            <Package className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {produto.estoque}
            </div>
            <p className="text-xs text-muted-foreground">
              Mínimo: {produto.estoque_minimo}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Informações Detalhadas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Informações do Produto</CardTitle>
            <CardDescription>Detalhes gerais do produto</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="font-medium">Nome:</span>
              <span>{produto.nome}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="font-medium">Descrição:</span>
              <span className="text-right max-w-xs">{produto.descricao || 'Sem descrição'}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="font-medium">Código de Barras:</span>
              <span>{produto.codigo_barras || 'Não informado'}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="font-medium">Categoria:</span>
              <span>{produto.categoria || 'Não categorizado'}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="font-medium">Status:</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusEstoque.bgColor} ${statusEstoque.color}`}>
                {statusEstoque.text}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="font-medium">Ativo:</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${produto.ativo ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                {produto.ativo ? 'Sim' : 'Não'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Valores e Estoque</CardTitle>
            <CardDescription>Cálculos financeiros e estoque</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="font-medium">Valor Total Venda:</span>
              <span className="font-semibold text-green-600">
                {formatCurrency(produto.preco_venda * produto.estoque)}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="font-medium">Valor Total Custo:</span>
              <span className="font-semibold text-blue-600">
                {formatCurrency(produto.preco_custo * produto.estoque)}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="font-medium">Lucro Total Potencial:</span>
              <span className="font-semibold text-purple-600">
                {formatCurrency(margemLucro * produto.estoque)}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="font-medium">Criado em:</span>
              <span>{formatDate(produto.created_at)}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="font-medium">Atualizado em:</span>
              <span>{formatDate(produto.updated_at)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Histórico de Preços */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Preços
          </CardTitle>
          <CardDescription>Evolução dos preços ao longo do tempo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {historicoPrecos.map((historico) => (
              <div key={historico.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-green-600">
                          Venda: {formatCurrency(historico.preco_venda)}
                        </span>
                        {historico.diferenca_preco_venda !== undefined && historico.diferenca_preco_venda !== 0 && (
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            historico.diferenca_preco_venda > 0 
                              ? 'bg-red-100 text-red-600' 
                              : 'bg-green-100 text-green-600'
                          }`}>
                            {historico.diferenca_preco_venda > 0 ? '+' : ''}{formatCurrency(historico.diferenca_preco_venda)}
                            {historico.percentual_mudanca_venda && ` (${historico.percentual_mudanca_venda > 0 ? '+' : ''}${historico.percentual_mudanca_venda}%)`}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-blue-600">
                          Custo: {formatCurrency(historico.preco_custo)}
                        </span>
                        {historico.diferenca_preco_custo !== undefined && historico.diferenca_preco_custo !== 0 && (
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            historico.diferenca_preco_custo > 0 
                              ? 'bg-red-100 text-red-600' 
                              : 'bg-green-100 text-green-600'
                          }`}>
                            {historico.diferenca_preco_custo > 0 ? '+' : ''}{formatCurrency(historico.diferenca_preco_custo)}
                            {historico.percentual_mudanca_custo && ` (${historico.percentual_mudanca_custo > 0 ? '+' : ''}${historico.percentual_mudanca_custo}%)`}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      historico.tipo_alteracao === 'manual' 
                        ? 'bg-blue-100 text-blue-600' 
                        : historico.tipo_alteracao === 'automatico'
                        ? 'bg-green-100 text-green-600'
                        : 'bg-orange-100 text-orange-600'
                    }`}>
                      {historico.tipo_alteracao === 'manual' ? 'Manual' : 
                       historico.tipo_alteracao === 'automatico' ? 'Automático' : 'Movimentação'}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {formatDate(historico.data_alteracao)}
                  </span>
                </div>
                {historico.observacao && (
                  <p className="text-sm text-gray-600">{historico.observacao}</p>
                )}
              </div>
            ))}
            
            {historicoPrecos.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <History className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Nenhum histórico de preços encontrado</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal de Edição */}
      {showEditForm && (
          <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-lg">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Editar Produto</CardTitle>
              <CardDescription>Atualize as informações do produto</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nome *</label>
                <Input
                  value={editData.nome}
                  onChange={(e) => setEditData(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Nome do produto"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Descrição</label>
                <Input
                  value={editData.descricao}
                  onChange={(e) => setEditData(prev => ({ ...prev, descricao: e.target.value }))}
                  placeholder="Descrição do produto"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Preço de Venda (R$) *</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editData.preco_venda}
                    onChange={(e) => setEditData(prev => ({ ...prev, preco_venda: Number(e.target.value) }))}
                    placeholder="0,00"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Preço de Custo (R$)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editData.preco_custo}
                    onChange={(e) => setEditData(prev => ({ ...prev, preco_custo: Number(e.target.value) }))}
                    placeholder="0,00"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Estoque *</label>
                  <Input
                    type="number"
                    value={editData.estoque}
                    onChange={(e) => setEditData(prev => ({ ...prev, estoque: Number(e.target.value) }))}
                    placeholder="0"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Estoque Mínimo</label>
                  <Input
                    type="number"
                    value={editData.estoque_minimo}
                    onChange={(e) => setEditData(prev => ({ ...prev, estoque_minimo: Number(e.target.value) }))}
                    placeholder="0"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Categoria</label>
                  <Input
                    value={editData.categoria}
                    onChange={(e) => setEditData(prev => ({ ...prev, categoria: e.target.value }))}
                    placeholder="Categoria"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Código de Barras</label>
                  <Input
                    value={editData.codigo_barras}
                    onChange={(e) => setEditData(prev => ({ ...prev, codigo_barras: e.target.value }))}
                    placeholder="Código de barras"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="ativo"
                  checked={editData.ativo}
                  onChange={(e) => setEditData(prev => ({ ...prev, ativo: e.target.checked }))}
                />
                <label htmlFor="ativo" className="text-sm font-medium">Produto ativo</label>
              </div>
            </CardContent>
            
            <div className="flex justify-end gap-2 p-6 pt-0">
              <Button 
                variant="outline" 
                onClick={() => setShowEditForm(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSaveEdit}
                disabled={loading}
              >
                {loading ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
