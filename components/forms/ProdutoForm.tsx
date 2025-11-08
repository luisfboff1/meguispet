import React, { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Loader2, Package, FileText } from 'lucide-react'
import type { Produto, ProdutoEstoqueInput, ProdutoForm as ProdutoFormValues, ImpostoProduto, ImpostoProdutoForm as ImpostoProdutoFormValues } from '@/types'
import ProdutoEstoqueDistribution from './ProdutoEstoqueDistribution'
import ImpostoProdutoForm from './ImpostoProdutoForm'
import { impostosService } from '@/services/impostosService'

interface ProdutoFormProps {
  produto?: Produto
  onSubmit: (produto: ProdutoFormValues) => Promise<void> | void
  onCancel: () => void
  loading?: boolean
}

export default function ProdutoForm({ produto, onSubmit, onCancel, loading = false }: ProdutoFormProps) {
  const [activeTab, setActiveTab] = useState('dados-basicos')
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

  const [estoquesDistribuidos, setEstoquesDistribuidos] = useState<ProdutoEstoqueInput[]>(() =>
    produto?.estoques?.map((item) => ({
      estoque_id: item.estoque_id,
      quantidade: item.quantidade
    })) ?? []
  )

  const [impostoProduto, setImpostoProduto] = useState<ImpostoProduto | null>(null)
  const [impostoFormData, setImpostoFormData] = useState<ImpostoProdutoFormValues | null>(null)
  const [loadingImposto, setLoadingImposto] = useState(false)
  const [savingImposto, setSavingImposto] = useState(false)

  useEffect(() => {
    setEstoquesDistribuidos(
      produto?.estoques?.map((item) => ({
        estoque_id: item.estoque_id,
        quantidade: item.quantidade
      })) ?? []
    )
  }, [produto])

  useEffect(() => {
    if (produto?.id) {
      loadImpostoConfig(produto.id)
    }
  }, [produto?.id])

  const loadImpostoConfig = async (produtoId: number) => {
    setLoadingImposto(true)
    try {
      const config = await impostosService.getByProdutoId(produtoId)
      setImpostoProduto(config)
    } catch (error) {
      console.error('[ProdutoForm] Error loading imposto config:', error)
    } finally {
      setLoadingImposto(false)
    }
  }

  const totalEstoque = useMemo(
    () =>
      estoquesDistribuidos.reduce((total, item) => total + Number(item.quantidade || 0), 0),
    [estoquesDistribuidos]
  )

  useEffect(() => {
    setFormData(prev => ({ ...prev, estoque: totalEstoque }))
  }, [totalEstoque])

  const handleImpostoSubmit = async (impostoData: ImpostoProdutoFormValues) => {
    setImpostoFormData(impostoData)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Validação: exigir ao menos uma quantidade em estoques distribuidos
    if (!estoquesDistribuidos || estoquesDistribuidos.length === 0 || totalEstoque <= 0) {
      window.alert('Informe ao menos uma quantidade positiva em um dos estoques antes de salvar o produto.')
      return
    }

    const payload = {
      ...formData,
      estoque: totalEstoque,
      estoques: estoquesDistribuidos
    }
    // Debug: print payload before sending
    console.log('[produto-form] submit payload', payload)

    try {
      await onSubmit(payload)

      if (impostoFormData && produto?.id) {
        setSavingImposto(true)
        try {
          await impostosService.upsert(impostoFormData)
          console.log('[produto-form] Imposto config saved successfully')
        } catch (error) {
          console.error('[produto-form] Error saving imposto config:', error)
          window.alert('Produto salvo, mas houve erro ao salvar configuração fiscal.')
        } finally {
          setSavingImposto(false)
        }
      }
    } catch (error) {
      console.error('[produto-form] Error saving product:', error)
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Package className="mr-2 h-5 w-5" />
          {produto ? 'Editar Produto' : 'Novo Produto'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="dados-basicos" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Dados Básicos
            </TabsTrigger>
            <TabsTrigger value="configuracao-fiscal" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Configuração Fiscal
              {impostoFormData && <span className="ml-1 text-xs text-green-600">●</span>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dados-basicos">
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
            <ProdutoEstoqueDistribution
              initialValue={estoquesDistribuidos}
              onChange={setEstoquesDistribuidos}
            />
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
            <Button type="submit" disabled={loading || savingImposto}>
              {loading || savingImposto ? (
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
          </TabsContent>

          <TabsContent value="configuracao-fiscal">
            {produto?.id ? (
              loadingImposto ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-500">Carregando configuração fiscal...</span>
                </div>
              ) : (
                <ImpostoProdutoForm
                  produtoId={produto.id}
                  produtoNome={formData.nome}
                  imposto={impostoProduto || undefined}
                  onSubmit={handleImpostoSubmit}
                  onCancel={() => setActiveTab('dados-basicos')}
                  loading={savingImposto}
                />
              )
            ) : (
              <div className="p-6 text-center text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p className="font-medium">Salve o produto primeiro</p>
                <p className="text-sm mt-1">
                  A configuração fiscal estará disponível após salvar os dados básicos do produto.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveTab('dados-basicos')}
                  className="mt-4"
                >
                  Voltar para Dados Básicos
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
