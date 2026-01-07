import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Filter, X } from 'lucide-react'
import type { ReportType, ReportFilters } from '@/types/reports'
import { vendedoresService } from '@/services/api'
import type { Vendedor } from '@/types'

export interface FilterPanelProps {
  tipo: ReportType
  filters: Partial<ReportFilters>
  onChange: (filters: Partial<ReportFilters>) => void
  onClear: () => void
  className?: string
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  tipo,
  filters,
  onChange,
  onClear,
  className,
}) => {
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [loadingVendedores, setLoadingVendedores] = useState(false)

  // Buscar vendedores quando o filtro é para vendas
  useEffect(() => {
    if (tipo === 'vendas') {
      setLoadingVendedores(true)
      vendedoresService.getAll(1, 999)
        .then(response => {
          setVendedores(response.data || [])
        })
        .catch(error => {
          console.error('Erro ao buscar vendedores:', error)
        })
        .finally(() => {
          setLoadingVendedores(false)
        })
    }
  }, [tipo])

  const renderVendasFilters = () => (
    <>
      <div className="space-y-2">
        <label htmlFor="status-vendas" className="text-sm font-medium">
          Status
        </label>
        <select
          id="status-vendas"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          value={filters.status?.[0] || ''}
          onChange={(e) => {
            const value = e.target.value
            onChange({
              ...filters,
              status: value ? [value as 'pendente' | 'pago' | 'cancelado'] : undefined,
            })
          }}
        >
          <option value="">Todos</option>
          <option value="pago">Pagas</option>
          <option value="pendente">Pendentes</option>
          <option value="cancelado">Canceladas</option>
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="origem" className="text-sm font-medium">
          Origem
        </label>
        <select
          id="origem"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          value={filters.origem?.[0] || ''}
          onChange={(e) => {
            const value = e.target.value
            onChange({
              ...filters,
              origem: value ? [value] : undefined,
            })
          }}
        >
          <option value="">Todas</option>
          <option value="loja_fisica">Loja Física</option>
          <option value="mercado_livre">Mercado Livre</option>
          <option value="online">Online</option>
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="uf-destino" className="text-sm font-medium">
          UF Destino
        </label>
        <input
          id="uf-destino"
          type="text"
          placeholder="Ex: SP, RJ, MG..."
          maxLength={2}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          value={filters.ufDestino?.[0] || ''}
          onChange={(e) => {
            const value = e.target.value.toUpperCase()
            onChange({
              ...filters,
              ufDestino: value ? [value] : undefined,
            })
          }}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="vendedor" className="text-sm font-medium">
          Vendedor
        </label>
        <select
          id="vendedor"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          value={filters.vendedorIds?.[0] || ''}
          onChange={(e) => {
            const value = e.target.value
            onChange({
              ...filters,
              vendedorIds: value ? [parseInt(value)] : undefined,
            })
          }}
          disabled={loadingVendedores}
        >
          <option value="">Todos os Vendedores</option>
          {vendedores.map(vendedor => (
            <option key={vendedor.id} value={vendedor.id}>
              {vendedor.nome}
            </option>
          ))}
        </select>
        {loadingVendedores && (
          <p className="text-xs text-muted-foreground">Carregando vendedores...</p>
        )}
      </div>
    </>
  )

  const renderProdutosFilters = () => (
    <>
      <div className="space-y-2">
        <label htmlFor="produto-status" className="text-sm font-medium">
          Status do Produto
        </label>
        <select
          id="produto-status"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          value={filters.produtoStatus || 'todos'}
          onChange={(e) => {
            const value = e.target.value as 'ativo' | 'inativo' | 'todos'
            onChange({
              ...filters,
              produtoStatus: value,
            })
          }}
        >
          <option value="todos">Todos</option>
          <option value="ativo">Ativos</option>
          <option value="inativo">Inativos</option>
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="estoque-status" className="text-sm font-medium">
          Status do Estoque
        </label>
        <select
          id="estoque-status"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          value={filters.estoqueStatus || 'todos'}
          onChange={(e) => {
            const value = e.target.value as 'todos' | 'baixo' | 'zerado'
            onChange({
              ...filters,
              estoqueStatus: value,
            })
          }}
        >
          <option value="todos">Todos</option>
          <option value="baixo">Estoque Baixo</option>
          <option value="zerado">Estoque Zerado</option>
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="categoria" className="text-sm font-medium">
          Categoria
        </label>
        <input
          id="categoria"
          type="text"
          placeholder="Filtrar por categoria..."
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          value={filters.categorias?.[0] || ''}
          onChange={(e) => {
            const value = e.target.value
            onChange({
              ...filters,
              categorias: value ? [value] : undefined,
            })
          }}
        />
      </div>
    </>
  )

  const renderClientesFilters = () => (
    <>
      <div className="space-y-2">
        <label htmlFor="tipo-cliente" className="text-sm font-medium">
          Tipo de Cliente
        </label>
        <select
          id="tipo-cliente"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          value={filters.tipoCliente || 'todos'}
          onChange={(e) => {
            const value = e.target.value as 'pf' | 'pj' | 'todos'
            onChange({
              ...filters,
              tipoCliente: value,
            })
          }}
        >
          <option value="todos">Todos</option>
          <option value="pf">Pessoa Física</option>
          <option value="pj">Pessoa Jurídica</option>
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="cliente-status" className="text-sm font-medium">
          Status do Cliente
        </label>
        <select
          id="cliente-status"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          value={filters.clienteStatus || 'todos'}
          onChange={(e) => {
            const value = e.target.value as 'ativo' | 'inativo' | 'todos'
            onChange({
              ...filters,
              clienteStatus: value,
            })
          }}
        >
          <option value="todos">Todos</option>
          <option value="ativo">Ativos</option>
          <option value="inativo">Inativos</option>
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="estado-cliente" className="text-sm font-medium">
          Estado
        </label>
        <input
          id="estado-cliente"
          type="text"
          placeholder="Ex: SP, RJ, MG..."
          maxLength={2}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          value={filters.estado?.[0] || ''}
          onChange={(e) => {
            const value = e.target.value.toUpperCase()
            onChange({
              ...filters,
              estado: value ? [value] : undefined,
            })
          }}
        />
      </div>
    </>
  )

  const renderFinanceiroFilters = () => (
    <>
      <div className="space-y-2">
        <label htmlFor="tipo-transacao" className="text-sm font-medium">
          Tipo de Transação
        </label>
        <select
          id="tipo-transacao"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          value={filters.tipoTransacao || 'todas'}
          onChange={(e) => {
            const value = e.target.value as 'receita' | 'despesa' | 'todas'
            onChange({
              ...filters,
              tipoTransacao: value,
            })
          }}
        >
          <option value="todas">Todas</option>
          <option value="receita">Receitas</option>
          <option value="despesa">Despesas</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.ocultarComprasMercadorias !== false}
            onChange={(e) => {
              onChange({
                ...filters,
                ocultarComprasMercadorias: e.target.checked,
              })
            }}
            className="mt-0.5 h-4 w-4 rounded border-input"
          />
          <div className="flex-1">
            <div className="text-sm font-medium">Ocultar Compras de Mercadorias</div>
            <div className="text-xs text-muted-foreground">
              Não incluir "Compras de Mercadorias" nas despesas e deduções do DRE
            </div>
          </div>
        </label>
      </div>
    </>
  )

  const renderFilters = () => {
    switch (tipo) {
      case 'vendas':
        return renderVendasFilters()
      case 'produtos':
        return renderProdutosFilters()
      case 'clientes':
        return renderClientesFilters()
      case 'financeiro':
        return renderFinanceiroFilters()
      default:
        return null
    }
  }

  const hasActiveFilters = Object.keys(filters).some((key) => {
    if (key === 'periodo') return false
    const value = filters[key as keyof typeof filters]
    return value !== undefined && value !== 'todos'
  })

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Filtros</CardTitle>
          </div>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="h-8 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Limpar
            </Button>
          )}
        </div>
        <CardDescription>
          Refine os resultados do relatório
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {renderFilters()}
      </CardContent>
    </Card>
  )
}

export default FilterPanel
