import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Package, TrendingUp, TrendingDown } from 'lucide-react'
import { produtosService, vendedoresService } from '@/services/api'
import type {
  Produto,
  Vendedor,
  AjusteEstoqueForm as AjusteEstoqueFormValues,
  AjusteEstoqueTipo
} from '@/types'

interface AjusteEstoqueFormProps {
  produto?: Produto
  onSubmit: (ajuste: AjusteEstoqueFormValues) => Promise<void> | void
  onCancel: () => void
  loading?: boolean
}

interface AjusteEstoqueFormState {
  produto_id: string
  tipo_ajuste: AjusteEstoqueTipo
  quantidade: number
  motivo: string
  observacoes: string
  vendedor_id: string
}

export default function AjusteEstoqueForm({ produto, onSubmit, onCancel, loading = false }: AjusteEstoqueFormProps) {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [loadingProdutos, setLoadingProdutos] = useState(false)
  const [loadingVendedores, setLoadingVendedores] = useState(false)
  const [formData, setFormData] = useState<AjusteEstoqueFormState>({
    produto_id: produto?.id ? String(produto.id) : '',
    tipo_ajuste: 'entrada',
    quantidade: 0,
    motivo: '',
    observacoes: '',
    vendedor_id: ''
  })

  useEffect(() => {
    loadProdutos()
    loadVendedores()
  }, [])

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      produto_id: produto?.id ? String(produto.id) : '',
    }))
  }, [produto])

  const loadProdutos = async () => {
    try {
      setLoadingProdutos(true)
      const response = await produtosService.getAll(1, 100)
      if (response.success && response.data) {
        setProdutos(response.data)
      }
    } catch (error) {
      console.error('Erro ao carregar produtos:', error)
    } finally {
      setLoadingProdutos(false)
    }
  }

  const loadVendedores = async () => {
    try {
      setLoadingVendedores(true)
      const response = await vendedoresService.getAll(1, 100)
      if (response.success && response.data) {
        setVendedores(response.data)
      }
    } catch (error) {
      console.error('Erro ao carregar vendedores:', error)
    } finally {
      setLoadingVendedores(false)
    }
  }

  const produtoSelecionado = produtos.find(p => p.id === Number(formData.produto_id))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const ajusteData: AjusteEstoqueFormValues = {
      produto_id: Number(formData.produto_id),
      tipo_ajuste: formData.tipo_ajuste,
      quantidade: formData.quantidade,
      motivo: formData.motivo,
      observacoes: formData.observacoes || undefined,
      vendedor_id: formData.vendedor_id ? Number(formData.vendedor_id) : undefined
    }

    onSubmit(ajusteData)
  }

  if (loadingProdutos) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Carregando produtos...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Package className="mr-2 h-5 w-5" />
          Ajustar Estoque
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Produto */}
          <div>
            <Label htmlFor="produto_id">Produto *</Label>
            <select
              id="produto_id"
              value={formData.produto_id}
              onChange={(e) => setFormData(prev => ({ ...prev, produto_id: e.target.value }))}
              className="w-full p-2 border rounded-md"
              required
            >
              <option value="">Selecione um produto</option>
              {produtos.map(produto => (
                <option key={produto.id} value={produto.id}>
                  {produto.nome} - Estoque: {produto.estoque}
                </option>
              ))}
            </select>
          </div>

          {/* Tipo de Ajuste */}
          <div>
            <Label htmlFor="tipo_ajuste">Tipo de Ajuste *</Label>
            <select
              id="tipo_ajuste"
              value={formData.tipo_ajuste}
              onChange={(e) => setFormData(prev => ({ ...prev, tipo_ajuste: e.target.value as AjusteEstoqueTipo }))}
              className="w-full p-2 border rounded-md"
            >
              <option value="entrada">Entrada de Mercadoria</option>
              <option value="saida">Saída de Mercadoria</option>
              <option value="inventario">Inventário (Ajuste Manual)</option>
            </select>
          </div>

          {/* Quantidade */}
          <div>
            <Label htmlFor="quantidade">Quantidade *</Label>
            <Input
              id="quantidade"
              type="number"
              min="1"
              value={formData.quantidade}
              onChange={(e) => setFormData(prev => ({ ...prev, quantidade: Number(e.target.value) }))}
              placeholder="Quantidade"
              required
            />
          </div>

          {/* Motivo */}
          <div>
            <Label htmlFor="motivo">Motivo *</Label>
            <select
              id="motivo"
              value={formData.motivo}
              onChange={(e) => setFormData(prev => ({ ...prev, motivo: e.target.value }))}
              className="w-full p-2 border rounded-md"
              required
            >
              <option value="">Selecione o motivo</option>
              <option value="compra">Compra de Mercadoria</option>
              <option value="devolucao">Devolução de Cliente</option>
              <option value="perda">Perda/Avaria</option>
              <option value="inventario">Inventário Físico</option>
              <option value="transferencia">Transferência</option>
              <option value="outros">Outros</option>
            </select>
          </div>

          {/* Vendedor - só aparece para saída */}
          {formData.tipo_ajuste === 'saida' && (
            <div>
              <Label htmlFor="vendedor_id">Vendedor Responsável</Label>
              <select
                id="vendedor_id"
                value={formData.vendedor_id}
                onChange={(e) => setFormData(prev => ({ ...prev, vendedor_id: e.target.value }))}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Selecione um vendedor (opcional)</option>
                {vendedores.map(vendedor => (
                  <option key={vendedor.id} value={vendedor.id}>
                    {vendedor.nome} - {vendedor.email}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Observações */}
          <div>
            <Label htmlFor="observacoes">Observações</Label>
            <textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
              placeholder="Observações adicionais"
              className="w-full p-2 border rounded-md h-20 resize-none"
            />
          </div>

          {/* Resumo do Ajuste */}
          {produtoSelecionado && (
            <div className="bg-gray-50 p-4 rounded-md">
              <h4 className="font-medium mb-2">Resumo do Ajuste:</h4>
              <div className="space-y-1 text-sm">
                <div><strong>Produto:</strong> {produtoSelecionado.nome}</div>
                <div><strong>Estoque Atual:</strong> {produtoSelecionado.estoque} unidades</div>
                <div><strong>Tipo:</strong> {
                  formData.tipo_ajuste === 'entrada' ? 'Entrada' :
                  formData.tipo_ajuste === 'saida' ? 'Saída' : 'Inventário'
                }</div>
                <div><strong>Quantidade:</strong> {formData.quantidade} unidades</div>
                <div className="font-medium text-lg">
                  <strong>Novo Estoque:</strong> {
                    formData.tipo_ajuste === 'entrada' ? 
                      produtoSelecionado.estoque + formData.quantidade :
                    formData.tipo_ajuste === 'saida' ?
                      produtoSelecionado.estoque - formData.quantidade :
                      formData.quantidade
                  } unidades
                </div>
              </div>
            </div>
          )}

          {/* Botões */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !formData.produto_id}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Ajustando...
                </>
              ) : (
                'Ajustar Estoque'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
