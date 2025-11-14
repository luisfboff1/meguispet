import React, { useState, useEffect, useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Calendar,
  PieChart,
  Edit,
  Trash2,
  Eye,
  Tag,
  Repeat,
  Settings
} from 'lucide-react'
import { transacoesService, categoriasFinanceirasService, transacoesRecorrentesService } from '@/services/api'
import { TransacaoForm } from '@/components/forms/TransacaoForm'
import { CategoriaFinanceiraForm } from '@/components/forms/CategoriaFinanceiraForm'
import { TransacaoRecorrenteForm } from '@/components/forms/TransacaoRecorrenteForm'
import { FinanceiroChart, PizzaChart } from '@/components/charts/FinanceiroChart'
import { DataTable, SortableHeader } from '@/components/ui/data-table'
import { 
  TransacaoFinanceira, 
  TransacaoForm as TransacaoFormType, 
  FinanceiroMetrics, 
  CategoriaFinanceira,
  CategoriaFinanceiraForm as CategoriaFormType,
  TransacaoRecorrente,
  TransacaoRecorrenteForm as TransacaoRecorrenteFormType
} from '@/types'

export default function FinanceiroPage() {
  const [loading, setLoading] = useState(false)
  const [metrics, setMetrics] = useState<FinanceiroMetrics | null>(null)
  const [transacoes, setTransacoes] = useState<TransacaoFinanceira[]>([])
  const [categorias, setCategorias] = useState<CategoriaFinanceira[]>([])
  const [transacoesRecorrentes, setTransacoesRecorrentes] = useState<TransacaoRecorrente[]>([])
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'transacoes' | 'categorias' | 'recorrentes'>('transacoes')
  
  // Transaction form state
  const [showTransacaoForm, setShowTransacaoForm] = useState(false)
  const [editingTransacao, setEditingTransacao] = useState<TransacaoFinanceira | null>(null)
  
  // Category form state
  const [showCategoriaForm, setShowCategoriaForm] = useState(false)
  const [editingCategoria, setEditingCategoria] = useState<CategoriaFinanceira | null>(null)
  
  // Recurring transaction form state
  const [showRecorrenteForm, setShowRecorrenteForm] = useState(false)
  const [editingRecorrente, setEditingRecorrente] = useState<TransacaoRecorrente | null>(null)
  
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTipo, setFilterTipo] = useState('')

  useEffect(() => {
    loadFinancialData()
    loadCategorias()
    loadTransacoesRecorrentes()
  }, [])

  const loadFinancialData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Carregar métricas e transações
      const [metricsResponse, transacoesResponse] = await Promise.all([
        transacoesService.getMetricas(),
        transacoesService.getAll(1, 50)
      ])
      
      if (metricsResponse.success && metricsResponse.data) {
        setMetrics(metricsResponse.data)
      }
      
      if (transacoesResponse.success && transacoesResponse.data) {
        setTransacoes(transacoesResponse.data)
      }
    } catch (error) {
      console.error('Erro ao carregar dados financeiros:', error)
      setError('Erro ao carregar dados financeiros')
    } finally {
      setLoading(false)
    }
  }

  const loadCategorias = async () => {
    try {
      const response = await categoriasFinanceirasService.getAll()
      if (response.success && response.data) {
        setCategorias(response.data)
      }
    } catch (error) {
      console.error('Erro ao carregar categorias:', error)
    }
  }

  const loadTransacoesRecorrentes = async () => {
    try {
      const response = await transacoesRecorrentesService.getAll()
      if (response.success && response.data) {
        setTransacoesRecorrentes(response.data)
      }
    } catch (error) {
      console.error('Erro ao carregar transações recorrentes:', error)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const handleCreateTransacao = async (data: TransacaoFormType) => {
    try {
      setLoading(true)
      const response = await transacoesService.create(data)
      
      if (response.success) {
        setShowTransacaoForm(false)
        setEditingTransacao(null)
        await loadFinancialData()
      } else {
        setError(response.message || 'Erro ao criar transação')
      }
    } catch (error) {
      setError('Erro ao criar transação')
    } finally {
      setLoading(false)
    }
  }

  const handleEditTransacao = async (data: TransacaoFormType) => {
    if (!editingTransacao) return
    
    try {
      setLoading(true)
      const response = await transacoesService.update(editingTransacao.id, data)
      
      if (response.success) {
        setShowTransacaoForm(false)
        setEditingTransacao(null)
        await loadFinancialData()
      } else {
        setError(response.message || 'Erro ao atualizar transação')
      }
    } catch (error) {
      setError('Erro ao atualizar transação')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTransacao = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta transação?')) return
    
    try {
      setLoading(true)
      const response = await transacoesService.delete(id)
      
      if (response.success) {
        await loadFinancialData()
      } else {
        setError(response.message || 'Erro ao excluir transação')
      }
    } catch (error) {
      setError('Erro ao excluir transação')
    } finally {
      setLoading(false)
    }
  }

  // Category handlers
  const handleCreateCategoria = async (data: CategoriaFormType) => {
    try {
      setLoading(true)
      const response = await categoriasFinanceirasService.create(data)
      
      if (response.success) {
        setShowCategoriaForm(false)
        setEditingCategoria(null)
        await loadCategorias()
      } else {
        setError(response.message || 'Erro ao criar categoria')
      }
    } catch (error) {
      setError('Erro ao criar categoria')
    } finally {
      setLoading(false)
    }
  }

  const handleEditCategoria = async (data: CategoriaFormType) => {
    if (!editingCategoria) return
    
    try {
      setLoading(true)
      const response = await categoriasFinanceirasService.update(editingCategoria.id, data)
      
      if (response.success) {
        setShowCategoriaForm(false)
        setEditingCategoria(null)
        await loadCategorias()
      } else {
        setError(response.message || 'Erro ao atualizar categoria')
      }
    } catch (error) {
      setError('Erro ao atualizar categoria')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCategoria = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta categoria?')) return
    
    try {
      setLoading(true)
      const response = await categoriasFinanceirasService.delete(id)
      
      if (response.success) {
        await loadCategorias()
      } else {
        setError(response.message || 'Erro ao excluir categoria')
      }
    } catch (error) {
      setError('Erro ao excluir categoria')
    } finally {
      setLoading(false)
    }
  }

  // Recurring transaction handlers
  const handleCreateRecorrente = async (data: TransacaoRecorrenteFormType) => {
    try {
      setLoading(true)
      const response = await transacoesRecorrentesService.create(data)
      
      if (response.success) {
        setShowRecorrenteForm(false)
        setEditingRecorrente(null)
        await loadTransacoesRecorrentes()
      } else {
        setError(response.message || 'Erro ao criar transação recorrente')
      }
    } catch (error) {
      setError('Erro ao criar transação recorrente')
    } finally {
      setLoading(false)
    }
  }

  const handleEditRecorrente = async (data: TransacaoRecorrenteFormType) => {
    if (!editingRecorrente) return
    
    try {
      setLoading(true)
      const response = await transacoesRecorrentesService.update(editingRecorrente.id, data)
      
      if (response.success) {
        setShowRecorrenteForm(false)
        setEditingRecorrente(null)
        await loadTransacoesRecorrentes()
      } else {
        setError(response.message || 'Erro ao atualizar transação recorrente')
      }
    } catch (error) {
      setError('Erro ao atualizar transação recorrente')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteRecorrente = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta transação recorrente?')) return
    
    try {
      setLoading(true)
      const response = await transacoesRecorrentesService.delete(id)
      
      if (response.success) {
        await loadTransacoesRecorrentes()
      } else {
        setError(response.message || 'Erro ao excluir transação recorrente')
      }
    } catch (error) {
      setError('Erro ao excluir transação recorrente')
    } finally {
      setLoading(false)
    }
  }

  const handleGerarRecorrentes = async () => {
    try {
      setLoading(true)
      const response = await transacoesRecorrentesService.gerarTransacoes()
      
      if (response.success) {
        await loadFinancialData()
        alert('Transações recorrentes geradas com sucesso!')
      } else {
        setError(response.message || 'Erro ao gerar transações recorrentes')
      }
    } catch (error) {
      setError('Erro ao gerar transações recorrentes')
    } finally {
      setLoading(false)
    }
  }

  const filteredTransacoes = transacoes.filter(transacao => {
    const matchesSearch = transacao.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transacao.categoria.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTipo = !filterTipo || transacao.tipo === filterTipo
    return matchesSearch && matchesTipo
  })

  // Column definitions for categorias table
  const categoriasColumns = useMemo<ColumnDef<CategoriaFinanceira>[]>(() => {
    return [
    {
      accessorKey: "nome",
      header: ({ column }) => <SortableHeader column={column}>Categoria</SortableHeader>,
      cell: ({ row }) => (
        <div className="flex items-center space-x-3 min-w-[180px]">
          <div
            className="w-4 h-4 rounded-full flex-shrink-0"
            style={{ backgroundColor: row.original.cor }}
          />
          <span className="font-medium text-gray-900 dark:text-white truncate">
            {row.original.nome}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "tipo",
      header: ({ column }) => <SortableHeader column={column}>Tipo</SortableHeader>,
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            row.original.tipo === 'receita' ? 'bg-green-500' : 'bg-red-500'
          }`}></div>
          <span className={`text-sm font-medium capitalize ${
            row.original.tipo === 'receita' ? 'text-green-600' : 'text-red-600'
          }`}>
            {row.original.tipo}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "descricao",
      header: ({ column }) => <SortableHeader column={column}>Descrição</SortableHeader>,
      cell: ({ row }) => (
        <div className="min-w-[200px] max-w-[300px]">
          {row.original.descricao ? (
            <span
              className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 break-words"
              title={row.original.descricao}
            >
              {row.original.descricao}
            </span>
          ) : (
            <span className="text-sm text-gray-400">-</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "ativo",
      header: ({ column }) => <SortableHeader column={column}>Status</SortableHeader>,
      cell: ({ row }) => (
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
          row.original.ativo
            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
        }`}>
          {row.original.ativo ? 'Ativa' : 'Inativa'}
        </span>
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
            onClick={() => {
              setEditingCategoria(row.original)
              setShowCategoriaForm(true)
            }}
            title="Editar"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteCategoria(row.original.id)}
            title="Excluir"
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]
  }, [])

  // Column definitions for transacoes table
  const transacoesColumns = useMemo<ColumnDef<TransacaoFinanceira>[]>(() => {
    return [
    {
      accessorKey: "data_transacao",
      header: ({ column }) => <SortableHeader column={column}>Data</SortableHeader>,
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-600">
            {new Date(row.original.data_transacao).toLocaleDateString('pt-BR')}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "tipo",
      header: ({ column }) => <SortableHeader column={column}>Tipo</SortableHeader>,
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            row.original.tipo === 'receita' ? 'bg-green-500' : 'bg-red-500'
          }`}></div>
          <span className={`text-sm font-medium ${
            row.original.tipo === 'receita' ? 'text-green-600' : 'text-red-600'
          }`}>
            {row.original.tipo === 'receita' ? 'Receita' : 'Despesa'}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "categoria",
      header: ({ column }) => <SortableHeader column={column}>Categoria</SortableHeader>,
      cell: ({ row }) => {
        const categoria = row.original.categoria_detalhe || { nome: row.original.categoria, cor: '#6B7280' }
        return (
          <span 
            className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium text-white truncate max-w-[150px]"
            style={{ backgroundColor: categoria.cor }}
            title={categoria.nome}
          >
            {categoria.nome}
          </span>
        )
      },
    },
    {
      accessorKey: "descricao",
      header: ({ column }) => <SortableHeader column={column}>Descrição</SortableHeader>,
      cell: ({ row }) => (
        <div className="min-w-[180px] max-w-[300px]">
          <span 
            className="text-sm text-gray-900 dark:text-gray-100 line-clamp-2 break-words"
            title={row.original.descricao}
          >
            {row.original.descricao}
          </span>
          {row.original.venda_id && (
            <span className="text-xs text-blue-600 dark:text-blue-400 block mt-1">
              📦 Venda #{row.original.venda_id}
              {row.original.venda_parcela_id && (
                <span className="ml-1">• Parcela</span>
              )}
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "valor",
      header: ({ column }) => <SortableHeader column={column}>Valor</SortableHeader>,
      cell: ({ row }) => (
        <span className={`text-sm font-bold ${
          row.original.tipo === 'receita' ? 'text-green-600' : 'text-red-600'
        }`}>
          {row.original.tipo === 'receita' ? '+' : '-'}{formatCurrency(row.original.valor)}
        </span>
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
            onClick={() => {
              setEditingTransacao(row.original)
              setShowTransacaoForm(true)
            }}
            title="Editar"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteTransacao(row.original.id)}
            title="Excluir"
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]
  }, [])

  const handleExportarRelatorio = () => {
    if (filteredTransacoes.length === 0) {
      alert('Não há transações para exportar')
      return
    }

    // Gerar CSV
    const headers = ['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor']
    const rows = filteredTransacoes.map(t => [
      new Date(t.data_transacao).toLocaleDateString('pt-BR'),
      t.tipo === 'receita' ? 'Receita' : 'Despesa',
      t.categoria,
      t.descricao,
      formatCurrency(t.valor)
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    // Download do arquivo
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `relatorio_financeiro_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Financeiro</h1>
          <p className="text-gray-600 dark:text-gray-400">Controle financeiro e relatórios</p>
          {error && (
            <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-md">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Button 
            className="bg-meguispet-primary hover:bg-meguispet-primary/90"
            onClick={() => {
              setEditingTransacao(null)
              setShowTransacaoForm(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova Transação
          </Button>
          <Button 
            variant="outline"
            onClick={handleExportarRelatorio}
          >
            <Download className="mr-2 h-4 w-4" />
            Relatório
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {loading ? 'Carregando...' : metrics ? formatCurrency(metrics.receita) : 'R$ 0,00'}
            </div>
            <p className="text-xs text-muted-foreground">Este mês</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {loading ? 'Carregando...' : metrics ? formatCurrency(metrics.despesas) : 'R$ 0,00'}
            </div>
            <p className="text-xs text-muted-foreground">Este mês</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lucro Líquido</CardTitle>
            <DollarSign className="h-4 w-4 text-meguispet-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? 'Carregando...' : metrics ? formatCurrency(metrics.lucro) : 'R$ 0,00'}
            </div>
            <p className="text-xs text-muted-foreground">Este mês</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Margem</CardTitle>
            <PieChart className="h-4 w-4 text-meguispet-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? 'Carregando...' : metrics ? `${metrics.margem}%` : '0%'}
            </div>
            <p className="text-xs text-muted-foreground">Margem de lucro</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different sections */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab('transacoes')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'transacoes'
                ? 'border-meguispet-primary text-meguispet-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <DollarSign className="inline-block h-5 w-5 mr-2 -mt-1" />
            Transações
          </button>
          <button
            onClick={() => setActiveTab('categorias')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'categorias'
                ? 'border-meguispet-primary text-meguispet-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <Tag className="inline-block h-5 w-5 mr-2 -mt-1" />
            Categorias
          </button>
          <button
            onClick={() => setActiveTab('recorrentes')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'recorrentes'
                ? 'border-meguispet-primary text-meguispet-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <Repeat className="inline-block h-5 w-5 mr-2 -mt-1" />
            Recorrentes
          </button>
        </nav>
      </div>

      {/* Transacoes Tab Content */}
      {activeTab === 'transacoes' && (
        <div className="space-y-6">

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {metrics?.grafico_mensal ? (
          <FinanceiroChart
            data={metrics.grafico_mensal}
            title="Receitas vs Despesas"
            description="Últimos 6 meses"
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Receitas vs Despesas</CardTitle>
              <CardDescription>Últimos 6 meses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-center">
                  <PieChart className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">Carregando dados...</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {metrics ? (
          <PizzaChart
            data={{
              receita: metrics.receita || 0,
              despesas: metrics.despesas || 0
            }}
            title="Distribuição Financeira"
            description="Receitas vs Despesas do mês"
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Distribuição Financeira</CardTitle>
              <CardDescription>Receitas vs Despesas do mês</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">Carregando dados...</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Transações Recentes</CardTitle>
              <CardDescription>Últimas movimentações financeiras</CardDescription>
            </div>
            
            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar transações..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <select
                value={filterTipo}
                onChange={(e) => setFilterTipo(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Todos os tipos</option>
                <option value="receita">Receitas</option>
                <option value="despesa">Despesas</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-500">Carregando transações...</p>
            </div>
          ) : filteredTransacoes.length > 0 ? (
            <DataTable 
              columns={transacoesColumns} 
              data={filteredTransacoes}
              enableColumnResizing={true}
              enableSorting={true}
              enableColumnVisibility={true}
              mobileVisibleColumns={['descricao', 'tipo', 'valor', 'data', 'acoes']}
            />
          ) : (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Nenhuma transação encontrada
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {searchTerm || filterTipo 
                  ? 'Nenhuma transação corresponde aos filtros aplicados'
                  : 'As transações financeiras aparecerão aqui quando forem registradas'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
          <CardDescription>Operações financeiras comuns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              className="h-20 flex flex-col"
              onClick={() => {
                setEditingTransacao(null)
                setShowTransacaoForm(true)
              }}
            >
              <DollarSign className="h-6 w-6 mb-2" />
              <span>Nova Receita</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col"
              onClick={() => {
                setEditingTransacao(null)
                setShowTransacaoForm(true)
              }}
            >
              <TrendingDown className="h-6 w-6 mb-2" />
              <span>Nova Despesa</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col"
              onClick={handleExportarRelatorio}
            >
              <Calendar className="h-6 w-6 mb-2" />
              <span>Relatório Mensal</span>
            </Button>
          </div>
        </CardContent>
      </Card>

        </div>
      )}

      {/* Categorias Tab Content */}
      {activeTab === 'categorias' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>Categorias Financeiras</CardTitle>
                  <CardDescription>Gerenciar categorias de receitas e despesas</CardDescription>
                </div>
                <Button 
                  className="bg-meguispet-primary hover:bg-meguispet-primary/90"
                  onClick={() => {
                    setEditingCategoria(null)
                    setShowCategoriaForm(true)
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Categoria
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-gray-500">Carregando categorias...</p>
                </div>
              ) : categorias.length > 0 ? (
                <DataTable
                  columns={categoriasColumns}
                  data={categorias}
                  enableColumnResizing={true}
                  enableSorting={true}
                  enableColumnVisibility={true}
                  mobileVisibleColumns={['nome', 'tipo', 'ativo', 'acoes']}
                />
              ) : (
                <div className="text-center py-12">
                  <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Nenhuma categoria cadastrada
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Crie categorias para organizar melhor suas transações financeiras
                  </p>
                  <Button
                    onClick={() => {
                      setEditingCategoria(null)
                      setShowCategoriaForm(true)
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Criar Primeira Categoria
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Transações Recorrentes Tab Content */}
      {activeTab === 'recorrentes' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>Transações Recorrentes</CardTitle>
                  <CardDescription>Gerenciar transações que se repetem automaticamente</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    onClick={handleGerarRecorrentes}
                    disabled={loading}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Gerar Pendentes
                  </Button>
                  <Button 
                    className="bg-meguispet-primary hover:bg-meguispet-primary/90"
                    onClick={() => {
                      setEditingRecorrente(null)
                      setShowRecorrenteForm(true)
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Recorrente
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {transacoesRecorrentes.length > 0 ? (
                <div className="space-y-4">
                  {transacoesRecorrentes.map((recorrente) => (
                    <div
                      key={recorrente.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`w-3 h-3 rounded-full ${
                              recorrente.tipo === 'receita' ? 'bg-green-500' : 'bg-red-500'
                            }`} />
                            <h3 className="font-medium text-gray-900 dark:text-white">
                              {recorrente.descricao}
                            </h3>
                            <span className={`text-sm font-bold ${
                              recorrente.tipo === 'receita' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {recorrente.tipo === 'receita' ? '+' : '-'}
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(recorrente.valor)}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <div>
                              <span className="font-medium">Frequência:</span> {recorrente.frequencia}
                            </div>
                            {recorrente.categoria && (
                              <div>
                                <span className="font-medium">Categoria:</span> {recorrente.categoria.nome}
                              </div>
                            )}
                            <div>
                              <span className="font-medium">Próxima:</span>{' '}
                              {new Date(recorrente.proxima_geracao).toLocaleDateString('pt-BR')}
                            </div>
                            <div>
                              <span className="font-medium">Início:</span>{' '}
                              {new Date(recorrente.data_inicio).toLocaleDateString('pt-BR')}
                            </div>
                            {recorrente.data_fim && (
                              <div>
                                <span className="font-medium">Fim:</span>{' '}
                                {new Date(recorrente.data_fim).toLocaleDateString('pt-BR')}
                              </div>
                            )}
                            <div>
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                                recorrente.ativo 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                              }`}>
                                {recorrente.ativo ? 'Ativa' : 'Inativa'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingRecorrente(recorrente)
                              setShowRecorrenteForm(true)
                            }}
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteRecorrente(recorrente.id)}
                            title="Excluir"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Repeat className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Nenhuma transação recorrente cadastrada
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Crie transações recorrentes para automatizar pagamentos e recebimentos regulares
                  </p>
                  <Button 
                    onClick={() => {
                      setEditingRecorrente(null)
                      setShowRecorrenteForm(true)
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Criar Primeira Transação Recorrente
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal do Formulário de Transação */}
      {showTransacaoForm && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-lg">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <TransacaoForm
              initialData={editingTransacao ? {
                tipo: editingTransacao.tipo,
                valor: editingTransacao.valor,
                descricao: editingTransacao.descricao,
                categoria: editingTransacao.categoria,
                categoria_id: editingTransacao.categoria_id,
                venda_id: editingTransacao.venda_id,
                data_transacao: editingTransacao.data_transacao,
                observacoes: editingTransacao.observacoes || ''
              } : undefined}
              onSubmit={editingTransacao ? handleEditTransacao : handleCreateTransacao}
              onCancel={() => {
                setShowTransacaoForm(false)
                setEditingTransacao(null)
              }}
              loading={loading}
              title={editingTransacao ? 'Editar Transação' : 'Nova Transação'}
            />
          </div>
        </div>
      )}

      {/* Modal do Formulário de Categoria */}
      {showCategoriaForm && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-lg">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <CategoriaFinanceiraForm
              initialData={editingCategoria ? {
                nome: editingCategoria.nome,
                tipo: editingCategoria.tipo,
                cor: editingCategoria.cor,
                icone: editingCategoria.icone,
                descricao: editingCategoria.descricao,
                ativo: editingCategoria.ativo,
                ordem: editingCategoria.ordem
              } : undefined}
              onSubmit={editingCategoria ? handleEditCategoria : handleCreateCategoria}
              onCancel={() => {
                setShowCategoriaForm(false)
                setEditingCategoria(null)
              }}
              loading={loading}
              title={editingCategoria ? 'Editar Categoria' : 'Nova Categoria'}
            />
          </div>
        </div>
      )}

      {/* Modal do Formulário de Transação Recorrente */}
      {showRecorrenteForm && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-lg">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <TransacaoRecorrenteForm
              initialData={editingRecorrente ? {
                tipo: editingRecorrente.tipo,
                categoria_id: editingRecorrente.categoria_id,
                descricao: editingRecorrente.descricao,
                valor: editingRecorrente.valor,
                frequencia: editingRecorrente.frequencia,
                dia_vencimento: editingRecorrente.dia_vencimento,
                data_inicio: editingRecorrente.data_inicio,
                data_fim: editingRecorrente.data_fim,
                observacoes: editingRecorrente.observacoes,
                ativo: editingRecorrente.ativo
              } : undefined}
              onSubmit={editingRecorrente ? handleEditRecorrente : handleCreateRecorrente}
              onCancel={() => {
                setShowRecorrenteForm(false)
                setEditingRecorrente(null)
              }}
              loading={loading}
              title={editingRecorrente ? 'Editar Transação Recorrente' : 'Nova Transação Recorrente'}
            />
          </div>
        </div>
      )}
    </div>
  )
}
