import React, { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Package } from 'lucide-react'
import type { Estoque, Produto, ProdutoForm as ProdutoFormValues } from '@/types'
import { estoquesService } from '@/services/api'

interface ProdutoFormProps {
  produto?: Produto
  onSubmit: (produto: ProdutoFormValues) => Promise<void> | void
  onCancel: () => void
  loading?: boolean
}

export default function ProdutoForm({ produto, onSubmit, onCancel, loading = false }: ProdutoFormProps) {
  const [formData, setFormData] = useState<ProdutoFormValues>({
    nome: produto?.nome || '',
    descricao: produto?.descricao || '',
    preco_venda: produto?.preco_venda || 0,
    preco_custo: produto?.preco_custo,
    estoque: produto?.estoque || 0,
    estoque_minimo: produto?.estoque_minimo || 0,
    categoria: produto?.categoria || '',
    codigo_barras: produto?.codigo_barras || '',
    ativo: produto?.ativo ?? true
  })

  const [estoquesDisponiveis, setEstoquesDisponiveis] = useState<Estoque[]>([])
  const [estoqueQuantidades, setEstoqueQuantidades] = useState<Record<number, number>>({})
  const [estoquesLoading, setEstoquesLoading] = useState(false)
  const [estoquesErro, setEstoquesErro] = useState<string | null>(null)

  useEffect(() => {
    const carregarEstoques = async () => {
      try {
        setEstoquesLoading(true)
        setEstoquesErro(null)
        const response = await estoquesService.getAll(true)
        if (response.success && response.data) {
          setEstoquesDisponiveis(response.data)
        } else {
          setEstoquesErro(response.message || 'Não foi possível carregar os estoques')
        }
      } catch (error) {
        console.error('Erro ao carregar estoques:', error)
        setEstoquesErro('Erro ao carregar estoques')
      } finally {
        setEstoquesLoading(false)
      }
    }

    carregarEstoques()
  }, [])

  useEffect(() => {
    if (estoquesDisponiveis.length === 0) return

    const quantidadesIniciais: Record<number, number> = {}
    estoquesDisponiveis.forEach(estoque => {
      const registro = produto?.estoques?.find(item => item.estoque_id === estoque.id)
      quantidadesIniciais[estoque.id] = registro ? registro.quantidade : 0
    })

    setEstoqueQuantidades(quantidadesIniciais)
  }, [estoquesDisponiveis, produto])

  const totalEstoque = useMemo(() => {
    return Object.values(estoqueQuantidades).reduce((total, quantidade) => total + quantidade, 0)
  }, [estoqueQuantidades])

  useEffect(() => {
    setFormData(prev => ({ ...prev, estoque: totalEstoque }))
  }, [totalEstoque])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const estoquesPayload = Object.entries(estoqueQuantidades).map(([estoqueId, quantidade]) => ({
      estoque_id: Number(estoqueId),
      quantidade
    }))

    onSubmit({
      ...formData,
      estoque: totalEstoque,
      estoques: estoquesPayload
    })
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Package className="mr-2 h-5 w-5" />
          {produto ? 'Editar Produto' : 'Novo Produto'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome do Produto */}
          <div>
            <Label htmlFor="nome">Nome do Produto *</Label>
            <Input
              id="nome"
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
              placeholder="Nome do produto"
              required
            />
          </div>

          {/* Descrição */}
          <div>
            <Label htmlFor="descricao">Descrição</Label>
            <textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
              placeholder="Descrição do produto"
              className="w-full p-2 border rounded-md h-20 resize-none"
            />
          </div>

          {/* Preços e Categoria */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="preco_venda">Preço de Venda (R$) *</Label>
              <Input
                id="preco_venda"
                type="number"
                step="0.01"
                min="0"
                value={formData.preco_venda}
                onChange={(e) => setFormData(prev => ({ ...prev, preco_venda: Number(e.target.value) }))}
                placeholder="0,00"
                required
              />
            </div>

            <div>
              <Label htmlFor="preco_custo">Preço de Custo (R$)</Label>
              <Input
                id="preco_custo"
                type="number"
                step="0.01"
                min="0"
                value={formData.preco_custo ?? ''}
                onChange={(e) => setFormData(prev => ({ ...prev, preco_custo: e.target.value ? Number(e.target.value) : undefined }))}
                placeholder="0,00"
              />
              <p className="text-xs text-gray-500 mt-1">
                Deixe vazio para calcular automaticamente (70% do preço de venda)
              </p>
            </div>

            <div>
              <Label htmlFor="categoria">Categoria</Label>
              <Input
                id="categoria"
                type="text"
                value={formData.categoria}
                onChange={(e) => setFormData(prev => ({ ...prev, categoria: e.target.value }))}
                placeholder="Ex: Ração, Brinquedo, Medicamento"
              />
            </div>
          </div>

          {/* Estoque */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="estoque">Quantidade Total (calculada)</Label>
              <Input
                id="estoque"
                type="number"
                min="0"
                value={totalEstoque}
                readOnly
                placeholder="0"
              />
            </div>

            <div>
              <Label htmlFor="estoque_minimo">Estoque Mínimo *</Label>
              <Input
                id="estoque_minimo"
                type="number"
                min="0"
                value={formData.estoque_minimo}
                onChange={(e) => setFormData(prev => ({ ...prev, estoque_minimo: Number(e.target.value) }))}
                placeholder="0"
                required
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label>Distribuição por Estoque</Label>
            {estoquesLoading && estoquesDisponiveis.length === 0 ? (
              <div className="flex items-center text-sm text-gray-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando estoques...
              </div>
            ) : estoquesErro ? (
              <p className="text-sm text-red-600">{estoquesErro}</p>
            ) : (
              <div className="space-y-2">
                {estoquesDisponiveis.map(estoque => (
                  <div key={estoque.id} className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                    <div>
                      <p className="text-sm font-medium">{estoque.nome}</p>
                      {estoque.descricao ? (
                        <p className="text-xs text-gray-500">{estoque.descricao}</p>
                      ) : null}
                    </div>
                    <Input
                      type="number"
                      min="0"
                      value={estoqueQuantidades[estoque.id] ?? 0}
                      onChange={(e) => {
                        const valor = Number(e.target.value)
                        setEstoqueQuantidades(prev => ({
                          ...prev,
                          [estoque.id]: Number.isNaN(valor) ? 0 : Math.max(0, Math.floor(valor))
                        }))
                      }}
                      placeholder="0"
                    />
                  </div>
                ))}
                {estoquesDisponiveis.length === 0 ? (
                  <p className="text-sm text-gray-500">Nenhum estoque cadastrado. Cadastre estoques antes de registrar produtos.</p>
                ) : (
                  <p className="text-xs text-gray-500">O total acima é atualizado automaticamente somando todas as quantidades informadas.</p>
                )}
              </div>
            )}
          </div>

          {/* Código de Barras */}
          <div>
            <Label htmlFor="codigo_barras">Código de Barras</Label>
            <Input
              id="codigo_barras"
              type="text"
              value={formData.codigo_barras}
              onChange={(e) => setFormData(prev => ({ ...prev, codigo_barras: e.target.value }))}
              placeholder="Código de barras do produto"
            />
          </div>

          {/* Status Ativo */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="ativo"
              checked={formData.ativo}
              onChange={(e) => setFormData(prev => ({ ...prev, ativo: e.target.checked }))}
              className="rounded"
            />
            <Label htmlFor="ativo">Produto ativo</Label>
          </div>

          {/* Botões */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Produto'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
