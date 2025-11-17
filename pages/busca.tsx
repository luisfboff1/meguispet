import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Search,
  ShoppingCart,
  Users,
  Package
} from 'lucide-react'
import { vendasService, clientesService, produtosService } from '@/services/api'
import type { Cliente, Produto, Venda } from '@/types'

type SearchResult =
  | {
      type: 'venda'
      id: number
      title: string
      description: string
      icon: typeof ShoppingCart
      data: Venda
    }
  | {
      type: 'cliente'
      id: number
      title: string
      description: string
      icon: typeof Users
      data: Cliente
    }
  | {
      type: 'produto'
      id: number
      title: string
      description: string
      icon: typeof Package
      data: Produto
    }

export default function BuscaPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const { q } = router.query
    if (q && typeof q === 'string') {
      setSearchTerm(q)
      performSearch(q)
    }
  }, [router.query])

  const performSearch = async (term: string) => {
    if (!term.trim()) return

    try {
      setLoading(true)
  const accumulatedResults: SearchResult[] = []

      // Buscar vendas
      try {
        const vendasResponse = await vendasService.getAll(1, 50)
        if (vendasResponse.success && vendasResponse.data) {
          const vendasFiltradas = vendasResponse.data.filter((venda) =>
            venda.cliente?.nome?.toLowerCase().includes(term.toLowerCase()) ||
            venda.vendedor?.nome?.toLowerCase().includes(term.toLowerCase()) ||
            venda.numero_venda?.toLowerCase().includes(term.toLowerCase())
          )

          vendasFiltradas.forEach((venda) => {
            accumulatedResults.push({
              type: 'venda',
              id: venda.id,
              title: `Venda #${venda.numero_venda}`,
              description: `Cliente: ${venda.cliente?.nome || 'N/A'} | Total: R$ ${venda.valor_final}`,
              icon: ShoppingCart,
              data: venda
            })
          })
        }
      } catch (error) {
      }

      // Buscar clientes
      try {
        const clientesResponse = await clientesService.getAll(1, 50)
        if (clientesResponse.success && clientesResponse.data) {
          const clientesFiltrados = clientesResponse.data.filter((cliente) =>
            cliente.nome?.toLowerCase().includes(term.toLowerCase()) ||
            cliente.email?.toLowerCase().includes(term.toLowerCase()) ||
            cliente.telefone?.includes(term)
          )

          clientesFiltrados.forEach((cliente) => {
            accumulatedResults.push({
              type: 'cliente',
              id: cliente.id,
              title: cliente.nome,
              description: `${cliente.email || 'Sem email'} | ${cliente.telefone || 'Sem telefone'}`,
              icon: Users,
              data: cliente
            })
          })
        }
      } catch (error) {
      }

      // Buscar produtos
      try {
        const produtosResponse = await produtosService.getAll(1, 50)
        if (produtosResponse.success && produtosResponse.data) {
          const produtosFiltrados = produtosResponse.data.filter((produto) =>
            produto.nome?.toLowerCase().includes(term.toLowerCase()) ||
            produto.categoria?.toLowerCase().includes(term.toLowerCase())
          )

          produtosFiltrados.forEach((produto) => {
            accumulatedResults.push({
              type: 'produto',
              id: produto.id,
              title: produto.nome,
              description: `${produto.categoria || 'Sem categoria'} | Estoque: ${produto.estoque} | R$ ${produto.preco_venda}`,
              icon: Package,
              data: produto
            })
          })
        }
      } catch (error) {
      }

  setResults(accumulatedResults)
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchTerm.trim()) {
      router.push(`/busca?q=${encodeURIComponent(searchTerm)}`)
    }
  }

  const handleResultClick = (result: SearchResult) => {
    switch (result.type) {
      case 'venda':
        router.push('/vendas')
        break
      case 'cliente':
        router.push('/clientes')
        break
      case 'produto':
        router.push('/produtos')
        break
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Busca</h1>
          <p className="text-gray-600">Resultados para: &quot;{searchTerm}&quot;</p>
        </div>
      </div>

      {/* Barra de busca */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <Input
                placeholder="Buscar vendas, clientes, produtos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit">
              <Search className="mr-2 h-4 w-4" />
              Buscar
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Resultados */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-meguispet-primary"></div>
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {results.length} resultado(s) encontrado(s)
          </h2>
          <div className="grid gap-4">
            {results.map((result, index) => {
              const IconComponent = result.icon
              return (
                <Card 
                  key={`${result.type}-${result.id}-${index}`}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleResultClick(result)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-4">
                      <div className="shrink-0">
                        <IconComponent className="h-6 w-6 text-meguispet-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900">
                          {result.title}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {result.description}
                        </p>
                        <div className="flex items-center space-x-4 mt-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-meguispet-primary/10 text-meguispet-primary">
                            {result.type === 'venda' ? 'Venda' : 
                             result.type === 'cliente' ? 'Cliente' : 'Produto'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      ) : searchTerm ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Search className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum resultado encontrado</h3>
            <p className="text-gray-600 text-center">
              Tente usar termos diferentes ou verifique a ortografia
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Search className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Digite algo para buscar</h3>
            <p className="text-gray-600 text-center">
              Use a barra de busca acima para encontrar vendas, clientes ou produtos
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
