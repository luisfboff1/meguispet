import React, { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Package } from 'lucide-react'
import type { Produto, ProdutoEstoqueInput, ProdutoForm as ProdutoFormValues, ImpostoProduto, ImpostoProdutoForm as ImpostoProdutoFormValues } from '@/types'
import ProdutoEstoqueDistribution from './ProdutoEstoqueDistribution'
import { impostosService } from '@/services/impostosService'

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
    ativo: produto?.ativo ?? true,
    // Impostos
    ipi: produto?.ipi || 0,
    icms: produto?.icms || 0
  })

  const [estoquesDistribuidos, setEstoquesDistribuidos] = useState<ProdutoEstoqueInput[]>(() =>
    produto?.estoques?.map((item) => ({
      estoque_id: item.estoque_id,
      quantidade: item.quantidade
    })) ?? []
  )

  // Fiscal configuration fields
  const [fiscalData, setFiscalData] = useState<ImpostoProdutoFormValues>({
    produto_id: produto?.id || 0,
    ncm: '',
    cest: '',
    origem_mercadoria: 0,
    mva_manual: null,
    aliquota_icms_manual: null,
    frete_padrao: 0,
    outras_despesas: 0,
    ativo: true
  })

  const [loadingFiscal, setLoadingFiscal] = useState(false)
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
      loadFiscalConfig(produto.id)
    }
  }, [produto?.id])

  const loadFiscalConfig = async (produtoId: number) => {
    setLoadingFiscal(true)
    try {
      const config = await impostosService.getByProdutoId(produtoId)
      if (config) {
        setFiscalData({
          produto_id: config.produto_id,
          ncm: config.ncm || '',
          cest: config.cest || '',
          origem_mercadoria: config.origem_mercadoria ?? 0,
          mva_manual: config.mva_manual ?? null,
          aliquota_icms_manual: config.aliquota_icms_manual ?? null,
          frete_padrao: config.frete_padrao || 0,
          outras_despesas: config.outras_despesas || 0,
          ativo: config.ativo ?? true
        })
      }
    } catch (error) {
      console.error('[ProdutoForm] Error loading fiscal config:', error)
    } finally {
      setLoadingFiscal(false)
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

      // Save fiscal configuration if produto exists (edit mode)
      if (produto?.id) {
        setSavingImposto(true)
        try {
          const fiscalPayload = {
            ...fiscalData,
            produto_id: produto.id
          }
          await impostosService.upsert(fiscalPayload)
          console.log('[produto-form] Fiscal config saved successfully')
        } catch (error) {
          console.error('[produto-form] Error saving fiscal config:', error)
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

          {/* Informações Fiscais */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Informações Fiscais</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ncm">NCM *</Label>
                <Input
                  id="ncm"
                  type="text"
                  value={fiscalData.ncm}
                  onChange={(e) => setFiscalData(prev => ({ ...prev, ncm: e.target.value }))}
                  placeholder="Ex: 2309"
                  maxLength={8}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Código NCM do produto (8 dígitos)
                </p>
              </div>

              <div>
                <Label htmlFor="cest">CEST</Label>
                <Input
                  id="cest"
                  type="text"
                  value={fiscalData.cest}
                  onChange={(e) => setFiscalData(prev => ({ ...prev, cest: e.target.value }))}
                  placeholder="Ex: 1700100"
                  maxLength={7}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Código Especificador (7 dígitos)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="origem">Origem da Mercadoria *</Label>
                <select
                  id="origem"
                  value={fiscalData.origem_mercadoria}
                  onChange={(e) => setFiscalData(prev => ({ ...prev, origem_mercadoria: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={0}>0 - Nacional</option>
                  <option value={1}>1 - Estrangeira - Importação direta</option>
                  <option value={2}>2 - Estrangeira - Adquirida no mercado interno</option>
                </select>
              </div>

              <div>
                <Label htmlFor="ipi">IPI (%)</Label>
                <Input
                  id="ipi"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.ipi}
                  onChange={(e) => setFormData(prev => ({ ...prev, ipi: Math.min(100, Math.max(0, Number(e.target.value))) }))}
                  placeholder="0,00"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Alíquota de IPI do produto
                </p>
              </div>

              <div>
                <Label htmlFor="icms">ICMS (%) - Informativo</Label>
                <Input
                  id="icms"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.icms}
                  onChange={(e) => setFormData(prev => ({ ...prev, icms: Math.min(100, Math.max(0, Number(e.target.value))) }))}
                  placeholder="0,00"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Não entra no total (informativo)
                </p>
              </div>
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
      </CardContent>
    </Card>
  )
}
