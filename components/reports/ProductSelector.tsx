import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, Search, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { produtosService } from '@/services/api'
import type { Produto } from '@/types'

export interface ProductSelectorProps {
  value: number[] | 'todos'
  onChange: (value: number[] | 'todos') => void
  className?: string
}

export const ProductSelector: React.FC<ProductSelectorProps> = ({
  value,
  onChange,
  className,
}) => {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [mode, setMode] = useState<'todos' | 'selecionados'>(
    value === 'todos' ? 'todos' : 'selecionados'
  )

  useEffect(() => {
    loadProdutos()
  }, [])

  const loadProdutos = async () => {
    try {
      setLoading(true)
      const response = await produtosService.getAll(1, 1000) // Carregar todos
      if (response.data) {
        setProdutos(response.data)
      }
    } catch (error) {
      console.error('Erro ao carregar produtos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleModeChange = (newMode: 'todos' | 'selecionados') => {
    setMode(newMode)
    if (newMode === 'todos') {
      onChange('todos')
    } else {
      onChange([])
    }
  }

  const handleProductToggle = (produtoId: number) => {
    if (value === 'todos') return

    const currentIds = value as number[]
    const newIds = currentIds.includes(produtoId)
      ? currentIds.filter(id => id !== produtoId)
      : [...currentIds, produtoId]

    onChange(newIds)
  }

  const handleSelectAll = () => {
    const filteredIds = filteredProdutos.map(p => p.id)
    onChange(filteredIds)
  }

  const handleClearAll = () => {
    onChange([])
  }

  const filteredProdutos = produtos.filter(p =>
    p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.codigo_barras?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const selectedIds = value === 'todos' ? [] : value

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Seleção de Produtos</CardTitle>
          </div>
        </div>
        <CardDescription>
          Escolha quais produtos incluir na tabela de produtos do relatório
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Modo de seleção */}
        <div className="space-y-2">
          <label
            className={cn(
              'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
              mode === 'todos'
                ? 'bg-primary/5 border-primary/20'
                : 'hover:bg-muted/50'
            )}
          >
            <input
              type="radio"
              name="mode"
              value="todos"
              checked={mode === 'todos'}
              onChange={() => handleModeChange('todos')}
              className="mt-0.5 h-4 w-4"
            />
            <div className="flex-1">
              <div className="text-sm font-medium">Top 10 Produtos (Padrão)</div>
              <div className="text-xs text-muted-foreground">
                Mostrar os 10 produtos mais vendidos
              </div>
            </div>
          </label>

          <label
            className={cn(
              'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
              mode === 'selecionados'
                ? 'bg-primary/5 border-primary/20'
                : 'hover:bg-muted/50'
            )}
          >
            <input
              type="radio"
              name="mode"
              value="selecionados"
              checked={mode === 'selecionados'}
              onChange={() => handleModeChange('selecionados')}
              className="mt-0.5 h-4 w-4"
            />
            <div className="flex-1">
              <div className="text-sm font-medium">Produtos Específicos</div>
              <div className="text-xs text-muted-foreground">
                Escolher produtos manualmente
              </div>
            </div>
          </label>
        </div>

        {/* Lista de produtos (apenas se modo "selecionados" */}
        {mode === 'selecionados' && (
          <div className="space-y-3 border-t pt-4">
            {/* Barra de busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Botões de ação */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {selectedIds.length} produtos selecionados
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleSelectAll}
                  className="text-primary hover:underline"
                  disabled={loading}
                >
                  Marcar todos
                </button>
                <span className="text-muted-foreground">|</span>
                <button
                  onClick={handleClearAll}
                  className="text-muted-foreground hover:text-foreground hover:underline"
                  disabled={loading}
                >
                  Limpar
                </button>
              </div>
            </div>

            {/* Lista de produtos */}
            <div className="max-h-[400px] overflow-y-auto space-y-2 border rounded-lg p-2">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredProdutos.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Nenhum produto encontrado
                </div>
              ) : (
                filteredProdutos.map((produto) => (
                  <label
                    key={produto.id}
                    className={cn(
                      'flex items-start gap-3 p-2 rounded cursor-pointer transition-colors',
                      selectedIds.includes(produto.id)
                        ? 'bg-primary/5'
                        : 'hover:bg-muted/50'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(produto.id)}
                      onChange={() => handleProductToggle(produto.id)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {produto.nome}
                      </div>
                      {produto.codigo_barras && (
                        <div className="text-xs text-muted-foreground">
                          Código: {produto.codigo_barras}
                        </div>
                      )}
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ProductSelector
