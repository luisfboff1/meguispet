import React, { useState, useEffect } from 'react'
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
  Eye
} from 'lucide-react'
import { transacoesService } from '@/services/api'
import { TransacaoForm } from '@/components/forms/TransacaoForm'
import { FinanceiroChart, PizzaChart } from '@/components/charts/FinanceiroChart'
import { TransacaoFinanceira, TransacaoForm as TransacaoFormType, FinanceiroMetrics } from '@/types'

export default function FinanceiroPage() {
  const [loading, setLoading] = useState(false)
  const [metrics, setMetrics] = useState<FinanceiroMetrics | null>(null)
  const [transacoes, setTransacoes] = useState<TransacaoFinanceira[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingTransacao, setEditingTransacao] = useState<TransacaoFinanceira | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTipo, setFilterTipo] = useState('')

  useEffect(() => {
    loadFinancialData()
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
        setShowForm(false)
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
        setShowForm(false)
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

  const filteredTransacoes = transacoes.filter(transacao => {
    const matchesSearch = transacao.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transacao.categoria.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTipo = !filterTipo || transacao.tipo === filterTipo
    return matchesSearch && matchesTipo
  })

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
              setShowForm(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova Transação
          </Button>
          <Button 
            variant="outline"
            onClick={() => alert('Relatório em desenvolvimento')}
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
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-500">Carregando transações...</p>
              </div>
            ) : filteredTransacoes.length > 0 ? (
              <div className="space-y-3">
                {filteredTransacoes.map((transacao) => (
                  <div
                    key={transacao.id}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`w-3 h-3 rounded-full ${
                        transacao.tipo === 'receita' ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {transacao.descricao}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {transacao.categoria} • {new Date(transacao.data_transacao).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className={`font-bold ${
                        transacao.tipo === 'receita' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transacao.tipo === 'receita' ? '+' : '-'}{formatCurrency(transacao.valor)}
                      </span>
                      
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingTransacao(transacao)
                            setShowForm(true)
                          }}
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTransacao(transacao.id)}
                          title="Excluir"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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
          </div>
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
                setShowForm(true)
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
                setShowForm(true)
              }}
            >
              <TrendingDown className="h-6 w-6 mb-2" />
              <span>Nova Despesa</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col"
              onClick={() => alert('Relatório Mensal - Em desenvolvimento')}
            >
              <Calendar className="h-6 w-6 mb-2" />
              <span>Relatório Mensal</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modal do Formulário */}
      {showForm && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-lg">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <TransacaoForm
              initialData={editingTransacao ? {
                tipo: editingTransacao.tipo,
                valor: editingTransacao.valor,
                descricao: editingTransacao.descricao,
                categoria: editingTransacao.categoria,
                data_transacao: editingTransacao.data_transacao,
                observacoes: editingTransacao.observacoes || ''
              } : undefined}
              onSubmit={editingTransacao ? handleEditTransacao : handleCreateTransacao}
              onCancel={() => {
                setShowForm(false)
                setEditingTransacao(null)
              }}
              loading={loading}
              title={editingTransacao ? 'Editar Transação' : 'Nova Transação'}
            />
          </div>
        </div>
      )}
    </div>
  )
}
