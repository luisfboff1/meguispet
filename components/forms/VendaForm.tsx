import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollableContainer } from '@/components/ui/scrollable-container'
import { Loader2, Plus, Trash2, ShoppingCart, Settings, Calendar } from 'lucide-react'
import { clientesService, vendedoresService, produtosService, formasPagamentoService, estoquesService, condicoesPagamentoService } from '@/services/api'
import { impostosService } from '@/services/impostosService'
import { calcularItensVenda, calcularTotaisVenda, formatCurrency } from '@/services/vendaCalculations'
import AlertDialog from '@/components/ui/AlertDialog'
import VendaTabelaColunas from './VendaTabelaColunas'
import type {
  Venda,
  Cliente,
  Vendedor,
  Produto,
  VendaForm as VendaFormValues,
  VendaItemInput,
  VendaParcelaInput,
  OrigemVenda,
  FormaPagamentoRegistro,
  CondicaoPagamento,
  Estoque,
  ItemCalculado,
  TotaisVenda,
  VendaTabelaColunasVisiveis
} from '@/types'

interface ItemVenda {
  produto_id: number
  produto_nome: string
  quantidade: number
  preco_unitario: number
  ipi_aliquota: number
  icms_aliquota: number
  st_aliquota: number
  icms_proprio_aliquota?: number
}

interface VendaFormProps {
  venda?: Venda
  onSubmit: (venda: VendaFormValues) => Promise<void> | void
  onCancel: () => void
  loading?: boolean
  errorMessage?: string
}

interface VendaFormState {
  numero_venda: string
  cliente_id: string
  vendedor_id: string
  forma_pagamento_id: string
  condicao_pagamento_id: string
  origem_venda: OrigemVenda
  uf_destino: string
  estoque_id: string
  observacoes: string
  desconto: number
  data_pagamento?: string // Data de pagamento (also used as base for installment calculation)
  sem_impostos: boolean // Indica se a venda é sem impostos - DEPRECADO, usar sem_ipi e sem_st
  sem_ipi: boolean // Indica se a venda é sem IPI
  sem_st: boolean // Indica se a venda é sem ST
}

const getFormaPagamentoIdFromVenda = (dados?: Venda): string => {
  if (!dados) return ''
  if (dados.forma_pagamento_id) {
    return String(dados.forma_pagamento_id)
  }
  if (dados.forma_pagamento_detalhe?.id) {
    return String(dados.forma_pagamento_detalhe.id)
  }
  return ''
}

const getEstoqueIdFromVenda = (dados?: Venda): string => {
  if (!dados) return ''
  if (dados.estoque_id) {
    return String(dados.estoque_id)
  }
  if (dados.estoque?.id) {
    return String(dados.estoque.id)
  }
  return ''
}

// Função para gerar número de venda no formato YYYYMMDD-XXXX
const generateNumeroVenda = (): string => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `${year}${month}${day}-${random}`
}

export default function VendaForm({ venda, onSubmit, onCancel, loading = false, errorMessage }: VendaFormProps) {
  const [formData, setFormData] = useState<VendaFormState>({
    numero_venda: venda?.numero_venda || generateNumeroVenda(),
    cliente_id: venda?.cliente_id ? String(venda.cliente_id) : '',
    vendedor_id: venda?.vendedor_id ? String(venda.vendedor_id) : '',
    forma_pagamento_id: getFormaPagamentoIdFromVenda(venda),
    condicao_pagamento_id: venda?.condicao_pagamento_id ? String(venda.condicao_pagamento_id) : '',
    origem_venda: venda?.origem_venda || 'loja_fisica',
    uf_destino: venda?.uf_destino || 'SP',
    estoque_id: getEstoqueIdFromVenda(venda),
    observacoes: venda?.observacoes || '',
    desconto: venda?.desconto || 0,
    data_pagamento: new Date().toISOString().split('T')[0], // Default to today
    sem_impostos: venda?.sem_impostos || false, // DEPRECADO - manter para compatibilidade
    sem_ipi: venda?.sem_ipi || false, // Default: com IPI
    sem_st: venda?.sem_st || false // Default: com ST
  })

  const [itens, setItens] = useState<ItemVenda[]>([])
  const [itensCalculados, setItensCalculados] = useState<ItemCalculado[]>([])
  const [totais, setTotais] = useState<TotaisVenda | null>(null)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [formasPagamento, setFormasPagamento] = useState<FormaPagamentoRegistro[]>([])
  const [condicoesPagamento, setCondicoesPagamento] = useState<CondicaoPagamento[]>([])
  const [estoques, setEstoques] = useState<Estoque[]>([])
  const [loadingData, setLoadingData] = useState(false)
  const [alert, setAlert] = useState<{ title: string; message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null)
  const [mostrarConfiguracaoColunas, setMostrarConfiguracaoColunas] = useState(false)
  const [colunasVisiveis, setColunasVisiveis] = useState<VendaTabelaColunasVisiveis>({
    produto: true,
    quantidade: true,
    precoUnitario: true,
    subtotalBruto: true,
    descontoProporcional: false,
    subtotalLiquido: true,
    ipiAliquota: false,
    ipiValor: true,
    icmsAliquota: false,
    icmsValor: false,
    stAliquota: false, // Ocultar ST% por padrão
    stValor: true,
    totalItem: true,
    acoes: true
  })
  
  // Installments state
  const [usarParcelas, setUsarParcelas] = useState(false)
  const [numeroParcelas, setNumeroParcelas] = useState(1)
  const [primeiraParcela, setPrimeiraParcela] = useState<string>('')
  const [parcelas, setParcelas] = useState<VendaParcelaInput[]>([])

  // Load form data and items when venda prop changes
  // NOTE: We only depend on 'venda', not on 'produtos', to prevent duplicate items
  // when editing. Items are loaded from venda.itens which already includes product names.
  useEffect(() => {
    if (!venda) {
      setItens([])
      setFormData({
        numero_venda: generateNumeroVenda(),
        cliente_id: '',
        vendedor_id: '',
        forma_pagamento_id: '',
        condicao_pagamento_id: '',
        origem_venda: 'loja_fisica',
        uf_destino: 'SP',
        estoque_id: '',
        observacoes: '',
        desconto: 0,
        data_pagamento: new Date().toISOString().split('T')[0],
        sem_impostos: false,
        sem_ipi: false,
        sem_st: false
      })
      return
    }

    setFormData({
      numero_venda: venda.numero_venda || generateNumeroVenda(),
      cliente_id: venda.cliente_id ? String(venda.cliente_id) : '',
      vendedor_id: venda.vendedor_id ? String(venda.vendedor_id) : '',
      forma_pagamento_id: getFormaPagamentoIdFromVenda(venda),
      condicao_pagamento_id: venda.condicao_pagamento_id ? String(venda.condicao_pagamento_id) : '',
      origem_venda: venda.origem_venda,
      uf_destino: venda.uf_destino || 'SP',
      estoque_id: getEstoqueIdFromVenda(venda),
      observacoes: venda.observacoes || '',
      desconto: venda.desconto || 0,
      data_pagamento: venda.prazo_pagamento ? String(venda.prazo_pagamento) : new Date().toISOString().split('T')[0],
      sem_impostos: venda.sem_impostos || false,
      sem_ipi: venda.sem_ipi || false,
      sem_st: venda.sem_st || false
    })

    if (venda.itens?.length) {
      // Carregar itens com alíquotas de impostos SALVOS na venda
      // Se os valores estão salvos na venda (não nulos), usar eles  
      // Se são nulos/undefined, buscar do produto quando disponível
      const itensComImpostos = venda.itens.map(item => {
        // Se as alíquotas estão salvas na venda, usar elas diretamente
        if (item.ipi_aliquota != null || item.st_aliquota != null || item.icms_aliquota != null) {
          return {
            produto_id: item.produto_id,
            produto_nome: item.produto?.nome || '',
            quantidade: item.quantidade,
            preco_unitario: item.preco_unitario,
            // Usar valores salvos se não forem null, senão buscar do produto
            ipi_aliquota: item.ipi_aliquota ?? item.produto?.ipi ?? 0,
            icms_aliquota: item.icms_aliquota ?? item.produto?.icms ?? 0,
            st_aliquota: item.st_aliquota ?? item.produto?.st ?? 0,
            icms_proprio_aliquota: item.icms_proprio_aliquota ?? item.produto?.icms_proprio ?? 4
          }
        }
        
        // Se não há valores salvos, tentar buscar do produto incluído na consulta
        const produto = item.produto
        if (produto) {
          return {
            produto_id: item.produto_id,
            produto_nome: produto.nome || '',
            quantidade: item.quantidade,
            preco_unitario: item.preco_unitario,
            ipi_aliquota: produto.ipi ?? 0,
            icms_aliquota: produto.icms ?? 0,
            st_aliquota: produto.st ?? 0,
            icms_proprio_aliquota: produto.icms_proprio ?? 4
          }
        }
        
        // Fallback se produto não encontrado
        return {
          produto_id: item.produto_id,
          produto_nome: '',
          quantidade: item.quantidade,
          preco_unitario: item.preco_unitario,
          ipi_aliquota: 0,
          icms_aliquota: 0,
          st_aliquota: 0,
          icms_proprio_aliquota: 4
        }
      })
      setItens(itensComImpostos)
    } else {
      setItens([])
    }

    // Carregar parcelas se existirem
    if (venda.parcelas?.length) {
      setUsarParcelas(true)
      setParcelas(venda.parcelas.map(p => ({
        numero_parcela: p.numero_parcela,
        valor_parcela: p.valor_parcela,
        data_vencimento: p.data_vencimento.split('T')[0], // Converter para formato YYYY-MM-DD
        observacoes: p.observacoes || ''
      })))
      setNumeroParcelas(venda.parcelas.length)
    } else {
      setUsarParcelas(false)
      setParcelas([])
      setNumeroParcelas(1)
    }
  }, [venda])

  useEffect(() => {
    void loadData()
  }, [])

  // Recalcular itens e totais sempre que os itens, desconto ou configurações de impostos mudarem
  useEffect(() => {
    if (itens.length === 0) {
      setItensCalculados([])
      setTotais(null)
      return
    }

    const itensComDados = itens.filter(item => item.produto_id > 0 && item.quantidade > 0)
    if (itensComDados.length === 0) {
      setItensCalculados([])
      setTotais(null)
      return
    }

    const calculados = calcularItensVenda(itensComDados, formData.desconto, formData.sem_impostos, formData.sem_ipi, formData.sem_st)
    setItensCalculados(calculados)

    const totaisCalculados = calcularTotaisVenda(calculados, formData.desconto)
    setTotais(totaisCalculados)
  }, [itens, formData.desconto, formData.sem_impostos, formData.sem_ipi, formData.sem_st])

  const loadData = async () => {
    try {
      setLoadingData(true)
      const [clientesRes, vendedoresRes, produtosRes, formasPagamentoRes, condicoesPagamentoRes, estoquesRes] = await Promise.all([
        clientesService.getAll(1, 100),
        vendedoresService.getAll(1, 100),
        produtosService.getAll(1, 100),
        formasPagamentoService.getAll(true),
        condicoesPagamentoService.getAll(true),
        estoquesService.getAll(true)
      ])

      if (clientesRes.success && clientesRes.data) setClientes(clientesRes.data)
      if (vendedoresRes.success && vendedoresRes.data) setVendedores(vendedoresRes.data)
      if (produtosRes.success && produtosRes.data) setProdutos(produtosRes.data)
      if (formasPagamentoRes.success && formasPagamentoRes.data) setFormasPagamento(formasPagamentoRes.data)
      if (condicoesPagamentoRes.success && condicoesPagamentoRes.data) setCondicoesPagamento(condicoesPagamentoRes.data)
      if (estoquesRes.success && estoquesRes.data) setEstoques(estoquesRes.data)
    } catch (error) {
    } finally {
      setLoadingData(false)
    }
  }

  const addItem = () => {
    setItens(prevItens => ([
      ...prevItens,
      {
        produto_id: 0,
        produto_nome: '',
        quantidade: 1,
        preco_unitario: 0,
        ipi_aliquota: 0,
        icms_aliquota: 0,
        st_aliquota: 0
      }
    ]))
  }

  const removeItem = (index: number) => {
    setItens(itens.filter((_, i) => i !== index))
  }

  /**
   * Recalcula o ST de todos os itens quando o UF de destino muda
   * Busca o MVA correto para cada produto baseado no NCM e no novo UF
   * Usa Promise.all para melhor performance (chamadas paralelas)
   */
  const recalcularStTodosItens = async (novoUf: string) => {
    if (itens.length === 0) return

    try {
      const novosItens = await Promise.all(
        itens.map(async (item) => {
          // Só recalcula se o item tem um produto válido
          if (item.produto_id > 0) {
            const produto = produtos.find(p => p.id === item.produto_id)

            if (produto) {
              try {
                // Buscar configuração fiscal do produto
                const fiscalConfig = await impostosService.getByProdutoId(produto.id)

                if (fiscalConfig && fiscalConfig.ncm && novoUf) {
                  // Buscar MVA para o novo UF
                  const mvaData = await impostosService.getMVA(novoUf, fiscalConfig.ncm)

                  if (mvaData && mvaData.sujeito_st && mvaData.mva) {
                    // Produto tem ST para este UF - atualizar alíquota
                    return { ...item, st_aliquota: (mvaData.mva * 100) || 0 }
                  }
                }
              } catch (error) {
                console.error(`Erro ao recalcular ST do produto ${produto.nome}:`, error)
              }
            }
          }

          // Item sem ST ou erro no cálculo
          return { ...item, st_aliquota: 0 }
        })
      )

      setItens(novosItens)
    } catch (error) {
      console.error('Erro ao recalcular ST dos itens:', error)
    }
  }

  const updateItem = async <Key extends keyof ItemVenda>(index: number, field: Key, value: ItemVenda[Key]) => {
    const newItens = [...itens]
    newItens[index] = { ...newItens[index], [field]: value }

    if (field === 'produto_id') {
      const produto = produtos.find(p => p.id === value)
      if (produto) {
        const precoVenda = Number(produto.preco_venda) || 0
        newItens[index].produto_nome = produto.nome
        newItens[index].preco_unitario = precoVenda

        // Impostos vêm do produto
        newItens[index].ipi_aliquota = produto.ipi || 0
        newItens[index].icms_aliquota = produto.icms || 0
        newItens[index].icms_proprio_aliquota = produto.icms_proprio || 4 // Padrão 4%

        // ST (MVA) deve ser buscado da tabela MVA baseado no NCM do produto e UF de destino
        try {
          const fiscalConfig = await impostosService.getByProdutoId(produto.id)
          if (fiscalConfig && fiscalConfig.ncm && formData.uf_destino) {
            const mvaData = await impostosService.getMVA(formData.uf_destino, fiscalConfig.ncm)
            if (mvaData && mvaData.sujeito_st && mvaData.mva) {
              // Calcular ST baseado no MVA
              // ST% = MVA% (já vem da tabela em decimal, ex: 0.8363 = 83.63%)
              newItens[index].st_aliquota = (mvaData.mva * 100) || 0
            } else {
              newItens[index].st_aliquota = 0
              if (mvaData && !mvaData.sujeito_st) {
              }
            }
          } else {
            newItens[index].st_aliquota = 0
          }
        } catch (error) {
          newItens[index].st_aliquota = 0
        }

        // Verificar estoque disponível
        if (formData.estoque_id && produto.estoques) {
          const estoqueItem = produto.estoques.find(e => Number(e.estoque_id) === Number(formData.estoque_id))
          if (estoqueItem && estoqueItem.quantidade < newItens[index].quantidade) {
            setAlert({
              title: '⚠️ Atenção: Estoque Baixo',
              message: `O produto "${produto.nome}" tem apenas ${estoqueItem.quantidade} unidades disponíveis no estoque selecionado.`,
              type: 'warning',
            })
          }
        }
      }
    } else if (field === 'quantidade') {
      // Verificar estoque ao alterar quantidade
      if (formData.estoque_id && newItens[index].produto_id) {
        const produto = produtos.find(p => p.id === newItens[index].produto_id)
        if (produto && produto.estoques) {
          const qtd = Number(value) || 0
          const estoqueItem = produto.estoques.find(e => Number(e.estoque_id) === Number(formData.estoque_id))
          if (estoqueItem && estoqueItem.quantidade < qtd) {
            setAlert({
              title: '⚠️ Atenção: Estoque Insuficiente',
              message: `O produto "${produto.nome}" tem apenas ${estoqueItem.quantidade} unidades disponíveis no estoque selecionado. Você está tentando vender ${qtd} unidades.`,
              type: 'warning',
            })
          }
        }
      }
    }

    setItens(newItens)
  }

  // Function to generate installments automatically
  const gerarParcelas = () => {
    if (!totais || !numeroParcelas || numeroParcelas < 1) return

    const valorPorParcela = totais.total_geral / numeroParcelas
    const novasParcelas: VendaParcelaInput[] = []
    
    // Get first installment date or use today + 30 days
    const dataBase = primeiraParcela 
      ? new Date(primeiraParcela + 'T00:00:00')
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    for (let i = 0; i < numeroParcelas; i++) {
      const dataVencimento = new Date(dataBase)
      dataVencimento.setMonth(dataVencimento.getMonth() + i)
      
      novasParcelas.push({
        numero_parcela: i + 1,
        valor_parcela: Number(valorPorParcela.toFixed(2)),
        data_vencimento: dataVencimento.toISOString().split('T')[0]
      })
    }

    // Adjust last installment to account for rounding differences
    const totalParcelas = novasParcelas.reduce((sum, p) => sum + p.valor_parcela, 0)
    const diferenca = totais.total_geral - totalParcelas
    if (Math.abs(diferenca) > 0.01) {
      novasParcelas[novasParcelas.length - 1].valor_parcela += diferenca
      novasParcelas[novasParcelas.length - 1].valor_parcela = Number(novasParcelas[novasParcelas.length - 1].valor_parcela.toFixed(2))
    }

    setParcelas(novasParcelas)
  }

  // Generate installments based on payment terms
  const gerarParcelasPorCondicao = () => {
    if (!totais || !formData.condicao_pagamento_id) return
    
    const condicaoSelecionada = condicoesPagamento.find(
      c => String(c.id) === formData.condicao_pagamento_id
    )
    
    if (!condicaoSelecionada || !condicaoSelecionada.dias_parcelas.length) return

    const diasParcelas = condicaoSelecionada.dias_parcelas
    const valorPorParcela = totais.total_geral / diasParcelas.length
    const novasParcelas: VendaParcelaInput[] = []
    
    // Use data_pagamento as base date for calculation (default to today if not set)
    const dataBase = formData.data_pagamento
      ? new Date(formData.data_pagamento + 'T00:00:00')
      : new Date()

    diasParcelas.forEach((dias, index) => {
      const dataVencimento = new Date(dataBase)
      dataVencimento.setDate(dataVencimento.getDate() + dias)
      
      novasParcelas.push({
        numero_parcela: index + 1,
        valor_parcela: Number(valorPorParcela.toFixed(2)),
        data_vencimento: dataVencimento.toISOString().split('T')[0],
        observacoes: `Parcela ${index + 1}/${diasParcelas.length} - ${dias} dias`
      })
    })

    // Adjust last installment to account for rounding differences
    const totalParcelas = novasParcelas.reduce((sum, p) => sum + p.valor_parcela, 0)
    const diferenca = totais.total_geral - totalParcelas
    if (Math.abs(diferenca) > 0.01) {
      novasParcelas[novasParcelas.length - 1].valor_parcela += diferenca
      novasParcelas[novasParcelas.length - 1].valor_parcela = Number(novasParcelas[novasParcelas.length - 1].valor_parcela.toFixed(2))
    }

    setParcelas(novasParcelas)
    setUsarParcelas(true)
    setNumeroParcelas(diasParcelas.length)
  }

  // Update installment value
  const atualizarParcela = (index: number, field: keyof VendaParcelaInput, value: string | number) => {
    const novasParcelas = [...parcelas]
    novasParcelas[index] = {
      ...novasParcelas[index],
      [field]: value
    }
    setParcelas(novasParcelas)
  }

  // Effect to regenerate installments when number changes or when usarParcelas is enabled
  useEffect(() => {
    if (usarParcelas && numeroParcelas > 0 && totais && !formData.condicao_pagamento_id) {
      gerarParcelas()
    }
  }, [usarParcelas, numeroParcelas, primeiraParcela, totais?.total_geral])

  // Effect to generate installments based on payment terms
  useEffect(() => {
    if (formData.condicao_pagamento_id && totais) {
      gerarParcelasPorCondicao()
    }
  }, [formData.condicao_pagamento_id, formData.data_pagamento, totais?.total_geral])

  // Recalcular ST de todos os itens quando o UF de destino mudar
  useEffect(() => {
    if (itens.length > 0 && formData.uf_destino) {
      void recalcularStTodosItens(formData.uf_destino)
    }
  }, [formData.uf_destino])

  // Helper function to update tax exemption observations
  const updateTaxObservations = (currentObservacoes: string, semIpi: boolean, semSt: boolean): string => {
    // Remove existing tax notes
    let newObservacoes = currentObservacoes
      .replace(/\n*PEDIDO SEM IMPOSTOS\n*/g, '')
      .replace(/\n*SEM IPI \| SEM ST\n*/g, '')
      .replace(/\n*SEM ST \| SEM IPI\n*/g, '')
      .replace(/\n*SEM IPI\n*/g, '')
      .replace(/\n*SEM ST\n*/g, '')
      .trim()

    // Build notes based on selected flags
    const notes: string[] = []
    if (semIpi) notes.push('SEM IPI')
    if (semSt) notes.push('SEM ST')

    // Add new notes if any
    if (notes.length > 0) {
      newObservacoes = newObservacoes
        ? `${newObservacoes}\n\n${notes.join(' | ')}`
        : notes.join(' | ')
    }

    return newObservacoes
  }


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (itens.length === 0) {
      setAlert({
        title: '❌ Erro de Validação',
        message: 'Adicione pelo menos um item à venda antes de continuar.',
        type: 'error',
      })
      return
    }
    if (!formData.estoque_id) {
      setAlert({
        title: '❌ Erro de Validação',
        message: 'Selecione o estoque de origem da venda.',
        type: 'error',
      })
      return
    }
    if (!formData.forma_pagamento_id) {
      setAlert({
        title: '❌ Erro de Validação',
        message: 'Selecione a forma de pagamento.',
        type: 'error',
      })
      return
    }

    // Validate payment date when not using installments
    if (!usarParcelas && !formData.data_pagamento) {
      setAlert({
        title: '❌ Erro de Validação',
        message: 'Selecione a data de pagamento ou ative o parcelamento.',
        type: 'error',
      })
      return
    }

    const itensValidos = itens.every(item => item.produto_id > 0 && item.quantidade > 0 && item.preco_unitario > 0)
    if (!itensValidos) {
      setAlert({
        title: '❌ Erro de Validação',
        message: 'Verifique os itens da venda:\n- Todos os produtos devem estar selecionados\n- Quantidade e preço devem ser maiores que zero',
        type: 'error',
      })
      return
    }

    const formaSelecionada = formasPagamento.find(fp => String(fp.id) === formData.forma_pagamento_id)
    if (!formaSelecionada) {
      setAlert({
        title: '❌ Erro de Validação',
        message: 'Forma de pagamento inválida. Selecione uma forma de pagamento válida.',
        type: 'error',
      })
      return
    }

    const vendaData: VendaFormValues = {
      ...formData,
      cliente_id: formData.cliente_id ? Number(formData.cliente_id) : null,
      vendedor_id: formData.vendedor_id ? Number(formData.vendedor_id) : null,
      forma_pagamento_id: Number(formData.forma_pagamento_id),
      condicao_pagamento_id: formData.condicao_pagamento_id ? Number(formData.condicao_pagamento_id) : null,
      estoque_id: Number(formData.estoque_id),
      forma_pagamento: formaSelecionada.nome,
      data_pagamento: formData.data_pagamento,
      parcelas: usarParcelas ? parcelas : undefined,
      itens: itensCalculados.map(itemCalc => ({
        produto_id: itemCalc.produto_id,
        quantidade: itemCalc.quantidade,
        preco_unitario: itemCalc.preco_unitario,
        subtotal: itemCalc.subtotal_bruto,
        subtotal_bruto: itemCalc.subtotal_bruto,
        desconto_proporcional: itemCalc.desconto_proporcional,
        subtotal_liquido: itemCalc.subtotal_liquido,
        ipi_aliquota: itemCalc.ipi_aliquota,
        ipi_valor: itemCalc.ipi_valor,
        icms_aliquota: itemCalc.icms_aliquota,
        icms_valor: itemCalc.icms_valor,
        st_aliquota: itemCalc.st_aliquota,
        st_valor: itemCalc.st_valor,
        total_item: itemCalc.total_item
      }))
    }

    if (process.env.NODE_ENV === 'development') {
    }

    onSubmit(vendaData)
  }

  if (loadingData) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Carregando dados...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      {alert && (
        <AlertDialog
          title={alert.title}
          message={alert.message}
          type={alert.type}
          onClose={() => setAlert(null)}
        />
      )}

      <Card className="w-full max-w-[1400px] mx-auto max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="flex items-center">
            <ShoppingCart className="mr-2 h-5 w-5" />
            {venda ? 'Editar Venda' : 'Nova Venda'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {errorMessage ? (
            <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Número da Venda */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <Label htmlFor="numero_venda" className="text-sm font-medium text-blue-900">
              Número da Venda / Pedido
            </Label>
            <Input
              id="numero_venda"
              type="text"
              value={formData.numero_venda}
              onChange={(e) => setFormData(prev => ({ ...prev, numero_venda: e.target.value }))}
              placeholder="Ex: 20251022-0001"
              className="mt-1"
              required
            />
            <p className="text-xs text-blue-600 mt-1">
              Este número será usado para identificar a venda e emitir a NF-e
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="cliente_id">Cliente</Label>
              <select
                id="cliente_id"
                value={formData.cliente_id}
                onChange={(e) => {
                  const clienteId = e.target.value
                  setFormData(prev => {
                    const cliente = clientes.find(c => String(c.id) === clienteId)
                    let vendedorId = prev.vendedor_id
                    let ufDestino = prev.uf_destino

                    if (cliente) {
                      // Preencher vendedor padrão do cliente
                      if (cliente.vendedor_id || cliente.vendedor?.id) {
                        const vendedorPadrao = cliente.vendedor_id ?? cliente.vendedor?.id
                        vendedorId = vendedorPadrao ? String(vendedorPadrao) : prev.vendedor_id
                      }

                      // Preencher UF de destino a partir do estado do cliente
                      if (cliente.estado) {
                        ufDestino = cliente.estado
                      } else {
                        // Se cliente não tem estado cadastrado, usa SP como padrão
                        ufDestino = 'SP'
                      }
                    }

                    return { ...prev, cliente_id: clienteId, vendedor_id: vendedorId, uf_destino: ufDestino }
                  })
                }}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Selecione um cliente</option>
                {clientes.map(cliente => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="estoque_id">Estoque de Origem</Label>
              <select
                id="estoque_id"
                value={formData.estoque_id}
                onChange={(e) => setFormData(prev => ({ ...prev, estoque_id: e.target.value }))}
                className="w-full p-2 border rounded-md"
                required
              >
                <option value="">Selecione o estoque</option>
                {estoques.map(estoque => (
                  <option key={estoque.id} value={estoque.id}>{estoque.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="vendedor_id">Vendedor</Label>
              <select
                id="vendedor_id"
                value={formData.vendedor_id}
                onChange={(e) => setFormData(prev => ({ ...prev, vendedor_id: e.target.value }))}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Selecione um vendedor</option>
                {vendedores.map(vendedor => (
                  <option key={vendedor.id} value={vendedor.id}>
                    {vendedor.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="forma_pagamento">Forma de Pagamento</Label>
              <select
                id="forma_pagamento"
                value={formData.forma_pagamento_id}
                onChange={(e) => setFormData(prev => ({ ...prev, forma_pagamento_id: e.target.value }))}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Selecione</option>
                {formasPagamento.map(forma => (
                  <option key={forma.id} value={forma.id}>{forma.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="origem_venda">Origem da Venda</Label>
              <select
                id="origem_venda"
                value={formData.origem_venda}
                onChange={(e) => setFormData(prev => ({ ...prev, origem_venda: e.target.value as OrigemVenda }))}
                className="w-full p-2 border rounded-md"
              >
                <option value="loja_fisica">Loja Física</option>
                <option value="mercado_livre">Mercado Livre</option>
                <option value="shopee">Shopee</option>
                <option value="magazine_luiza">Magazine Luiza</option>
                <option value="americanas">Americanas</option>
                <option value="outros">Outros</option>
              </select>
            </div>
            <div>
              <Label htmlFor="uf_destino">
                UF de Destino
                {formData.cliente_id && (
                  <span className="text-xs text-blue-600 ml-2">
                    (do cadastro do cliente)
                  </span>
                )}
              </Label>
              <select
                id="uf_destino"
                value={formData.uf_destino}
                onChange={(e) => setFormData(prev => ({ ...prev, uf_destino: e.target.value }))}
                className="w-full p-2 border rounded-md"
                disabled={!!formData.cliente_id}
              >
                <option value="AC">AC - Acre</option>
                <option value="AL">AL - Alagoas</option>
                <option value="AP">AP - Amapá</option>
                <option value="AM">AM - Amazonas</option>
                <option value="BA">BA - Bahia</option>
                <option value="CE">CE - Ceará</option>
                <option value="DF">DF - Distrito Federal</option>
                <option value="ES">ES - Espírito Santo</option>
                <option value="GO">GO - Goiás</option>
                <option value="MA">MA - Maranhão</option>
                <option value="MT">MT - Mato Grosso</option>
                <option value="MS">MS - Mato Grosso do Sul</option>
                <option value="MG">MG - Minas Gerais</option>
                <option value="PA">PA - Pará</option>
                <option value="PB">PB - Paraíba</option>
                <option value="PR">PR - Paraná</option>
                <option value="PE">PE - Pernambuco</option>
                <option value="PI">PI - Piauí</option>
                <option value="RJ">RJ - Rio de Janeiro</option>
                <option value="RN">RN - Rio Grande do Norte</option>
                <option value="RS">RS - Rio Grande do Sul</option>
                <option value="RO">RO - Rondônia</option>
                <option value="RR">RR - Roraima</option>
                <option value="SC">SC - Santa Catarina</option>
                <option value="SP">SP - São Paulo</option>
                <option value="SE">SE - Sergipe</option>
                <option value="TO">TO - Tocantins</option>
              </select>
              {formData.cliente_id ? (
                <p className="text-xs text-blue-600 mt-1">
                  UF preenchido automaticamente a partir do cadastro do cliente
                </p>
              ) : (
                <p className="text-xs text-gray-500 mt-1">
                  Selecione um cliente para preencher automaticamente
                </p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Itens da Venda</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => setMostrarConfiguracaoColunas(!mostrarConfiguracaoColunas)}
                  size="sm"
                  variant="outline"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  {mostrarConfiguracaoColunas ? 'Ocultar' : 'Configurar'} Colunas
                </Button>
                <Button type="button" onClick={addItem} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Item
                </Button>
              </div>
            </div>

            {mostrarConfiguracaoColunas && (
              <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
                <VendaTabelaColunas
                  visibleColumns={colunasVisiveis}
                  onChange={setColunasVisiveis}
                />
              </div>
            )}

            <div className="border rounded-md overflow-hidden">
              <ScrollableContainer className="max-h-[400px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b sticky top-0 z-10">
                    <tr>
                      {colunasVisiveis.produto && <th className="text-left py-2 px-2 text-xs font-medium text-gray-700 min-w-[180px]">Produto</th>}
                      {colunasVisiveis.quantidade && <th className="text-right py-2 px-2 text-xs font-medium text-gray-700 w-16">Qtd</th>}
                      {colunasVisiveis.precoUnitario && <th className="text-right py-2 px-2 text-xs font-medium text-gray-700 w-24">Preço</th>}
                      {colunasVisiveis.subtotalBruto && <th className="text-right py-2 px-2 text-xs font-medium text-gray-700 w-24">Subtotal</th>}
                      {colunasVisiveis.descontoProporcional && <th className="text-right py-2 px-2 text-xs font-medium text-gray-700 w-24">Desc.</th>}
                      {colunasVisiveis.subtotalLiquido && <th className="text-right py-2 px-2 text-xs font-medium text-gray-700 w-24">Líquido</th>}
                      {colunasVisiveis.ipiAliquota && <th className="text-right py-2 px-2 text-xs font-medium text-gray-700 w-16">IPI%</th>}
                      {colunasVisiveis.ipiValor && <th className="text-right py-2 px-2 text-xs font-medium text-gray-700 w-20">IPI</th>}
                      {colunasVisiveis.icmsAliquota && <th className="text-right py-2 px-2 text-xs font-medium text-blue-700 w-16">ICMS%</th>}
                      {colunasVisiveis.icmsValor && <th className="text-right py-2 px-2 text-xs font-medium text-blue-700 w-20">ICMS</th>}
                      {colunasVisiveis.stAliquota && <th className="text-right py-2 px-2 text-xs font-medium text-gray-700 w-16">ST%</th>}
                      {colunasVisiveis.stValor && <th className="text-right py-2 px-2 text-xs font-medium text-gray-700 w-20">ST</th>}
                      {colunasVisiveis.totalItem && <th className="text-right py-2 px-2 text-xs font-medium text-gray-700 w-28">Total</th>}
                      {colunasVisiveis.acoes && <th className="text-center py-2 px-2 text-xs font-medium text-gray-700 w-12"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {itens.map((item, index) => {
                      const itemCalc = itensCalculados[index]
                      return (
                        <tr key={index} className="border-b last:border-b-0 hover:bg-gray-50">
                          {colunasVisiveis.produto && (
                            <td className="py-1.5 px-2">
                              <select
                                value={item.produto_id}
                                onChange={(e) => updateItem(index, 'produto_id', Number(e.target.value))}
                                className="w-full p-1 border rounded text-xs"
                              >
                                <option value={0}>Selecione</option>
                                {produtos.map(produto => (
                                  <option key={produto.id} value={produto.id}>
                                    {produto.nome}
                                  </option>
                                ))}
                              </select>
                            </td>
                          )}
                          {colunasVisiveis.quantidade && (
                            <td className="py-1.5 px-2">
                              <Input
                                type="number"
                                min="1"
                                value={item.quantidade}
                                onChange={(e) => updateItem(index, 'quantidade', Number(e.target.value))}
                                className="w-full text-xs p-1 text-right"
                              />
                            </td>
                          )}
                          {colunasVisiveis.precoUnitario && (
                            <td className="py-1.5 px-2">
                              <Input
                                type="number"
                                step="0.01"
                                value={item.preco_unitario}
                                onChange={(e) => updateItem(index, 'preco_unitario', Number(e.target.value))}
                                className="w-full text-xs p-1 text-right"
                              />
                            </td>
                          )}
                          {colunasVisiveis.subtotalBruto && itemCalc && (
                            <td className="py-1.5 px-2 text-right text-xs">{formatCurrency(itemCalc.subtotal_bruto)}</td>
                          )}
                          {colunasVisiveis.descontoProporcional && itemCalc && (
                            <td className="py-1.5 px-2 text-right text-xs text-red-600">-{formatCurrency(itemCalc.desconto_proporcional)}</td>
                          )}
                          {colunasVisiveis.subtotalLiquido && itemCalc && (
                            <td className="py-1.5 px-2 text-right text-xs font-medium">{formatCurrency(itemCalc.subtotal_liquido)}</td>
                          )}
                          {colunasVisiveis.ipiAliquota && (
                            <td className="py-1.5 px-2">
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                value={item.ipi_aliquota}
                                onChange={(e) => updateItem(index, 'ipi_aliquota', Number(e.target.value))}
                                className="w-full text-xs p-1 text-right"
                                title="IPI % - Editável"
                              />
                            </td>
                          )}
                          {colunasVisiveis.ipiValor && itemCalc && (
                            <td className="py-1.5 px-2 text-right text-xs">{formatCurrency(itemCalc.ipi_valor)}</td>
                          )}
                          {colunasVisiveis.icmsAliquota && (
                            <td className="py-1.5 px-2">
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                value={item.icms_aliquota}
                                onChange={(e) => updateItem(index, 'icms_aliquota', Number(e.target.value))}
                                className="w-full text-xs p-1 text-right text-blue-600"
                                title="ICMS % - Editável (Informativo)"
                              />
                            </td>
                          )}
                          {colunasVisiveis.icmsValor && itemCalc && (
                            <td className="py-1.5 px-2 text-right text-xs text-blue-600">{formatCurrency(itemCalc.icms_valor)}</td>
                          )}
                          {colunasVisiveis.stAliquota && (
                            <td className="py-1.5 px-2">
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                value={item.st_aliquota}
                                onChange={(e) => updateItem(index, 'st_aliquota', Number(e.target.value))}
                                className="w-full text-xs p-1 text-right"
                                title="ST % - Editável"
                              />
                            </td>
                          )}
                          {colunasVisiveis.stValor && itemCalc && (
                            <td className="py-1.5 px-2 text-right text-xs">{formatCurrency(itemCalc.st_valor)}</td>
                          )}
                          {colunasVisiveis.totalItem && itemCalc && (
                            <td className="py-1.5 px-2 text-right text-xs font-bold">{formatCurrency(itemCalc.total_item)}</td>
                          )}
                          {colunasVisiveis.acoes && (
                            <td className="py-1.5 px-2 text-center">
                              <Button
                                type="button"
                                onClick={() => removeItem(index)}
                                size="sm"
                                variant="ghost"
                                className="text-red-600 h-6 w-6 p-0"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {itens.length === 0 && (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    Nenhum item adicionado. Clique em &quot;Adicionar Item&quot; para começar.
                  </div>
                )}
              </ScrollableContainer>
            </div>
          </div>

          {/* Card de Resumo dos Totais */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Desconto e Prazo */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="desconto">Desconto Total (R$)</Label>
                <Input
                  id="desconto"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.desconto}
                  onChange={(e) => setFormData(prev => ({ ...prev, desconto: Number(e.target.value) }))}
                  placeholder="0,00"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Será distribuído proporcionalmente entre os produtos
                </p>
              </div>

              {/* Payment Date */}
              <div>
                <Label htmlFor="data_pagamento">
                  Data de Pagamento <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="data_pagamento"
                  type="date"
                  value={formData.data_pagamento || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, data_pagamento: e.target.value }))}
                  className="w-full"
                  required={!usarParcelas && !formData.condicao_pagamento_id}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.condicao_pagamento_id 
                    ? 'Data base para calcular os vencimentos das parcelas' 
                    : 'Data em que o pagamento será recebido'}
                </p>
              </div>

              {/* Payment Terms Selection */}
              <div className="pt-4 border-t">
                <Label htmlFor="condicao_pagamento_id">Condição de Pagamento</Label>
                <select
                  id="condicao_pagamento_id"
                  value={formData.condicao_pagamento_id}
                  onChange={(e) => {
                    const condicaoId = e.target.value
                    setFormData(prev => ({ ...prev, condicao_pagamento_id: condicaoId }))
                    // Clear manual installments configuration when selecting a payment term
                    if (condicaoId) {
                      setUsarParcelas(false)
                      setNumeroParcelas(1)
                      setPrimeiraParcela('')
                    }
                  }}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="">À Vista (padrão)</option>
                  {condicoesPagamento.map(condicao => (
                    <option key={condicao.id} value={condicao.id}>
                      {condicao.nome} - {condicao.dias_parcelas.length === 1 && condicao.dias_parcelas[0] === 0 
                        ? 'À Vista'
                        : `${condicao.dias_parcelas.length}x (${condicao.dias_parcelas.join(', ')} dias)`}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Sem condição = à vista. Com condição = parcelas calculadas a partir da data de pagamento
                </p>
              </div>

              {/* Installments Configuration - Manual */}
              <div className="pt-4 border-t">
                <div className="flex items-center space-x-2 mb-3">
                  <input
                    type="checkbox"
                    id="usar-parcelas"
                    checked={usarParcelas}
                    onChange={(e) => setUsarParcelas(e.target.checked)}
                    disabled={!!formData.condicao_pagamento_id}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <Label htmlFor="usar-parcelas" className={`cursor-pointer ${formData.condicao_pagamento_id ? 'text-gray-400' : ''}`}>
                    Parcelar pagamento (manual)
                  </Label>
                </div>
                {formData.condicao_pagamento_id && (
                  <p className="text-xs text-gray-500 ml-6 -mt-2 mb-3">
                    Desabilitado quando uma condição de pagamento está selecionada
                  </p>
                )}

                {usarParcelas && !formData.condicao_pagamento_id && (
                  <div className="space-y-3 pl-6">
                    <div>
                      <Label htmlFor="numero-parcelas">Número de Parcelas</Label>
                      <Input
                        id="numero-parcelas"
                        type="number"
                        min="1"
                        max="60"
                        value={numeroParcelas}
                        onChange={(e) => setNumeroParcelas(Number(e.target.value))}
                        placeholder="Ex: 3"
                      />
                    </div>
                    <div>
                      <Label htmlFor="primeira-parcela">Data da Primeira Parcela</Label>
                      <Input
                        id="primeira-parcela"
                        type="date"
                        value={primeiraParcela}
                        onChange={(e) => setPrimeiraParcela(e.target.value)}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Demais parcelas serão mensais após esta data
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Resumo dos Totais */}
            <div className="lg:col-span-2">
              <Label className="mb-2 block">Resumo da Venda</Label>
              {totais ? (
                <div className="space-y-3">
                  {/* Totais Principais */}
                  <div className="p-4 bg-gray-50 rounded-md space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Total Bruto:</span>
                      <span className="font-medium">{formatCurrency(totais.total_produtos_bruto)}</span>
                    </div>
                    {totais.desconto_total > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>Desconto:</span>
                        <span className="font-medium">-{formatCurrency(totais.desconto_total)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Subtotal Líquido:</span>
                      <span className="font-medium">{formatCurrency(totais.total_produtos_liquido)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span>IPI:</span>
                      <span className="font-medium">{formatCurrency(totais.total_ipi)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>ST:</span>
                      <span className="font-medium">{formatCurrency(totais.total_st)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t font-bold text-lg">
                      <span>TOTAL GERAL:</span>
                      <span className="text-green-600">{formatCurrency(totais.total_geral)}</span>
                    </div>
                  </div>

                  {/* ICMS - Informativo (não incluído no total) */}
                  {totais.total_icms > 0 && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <div className="flex items-start gap-2">
                        <div className="text-blue-600 text-sm flex-grow">
                          <div className="flex justify-between font-medium">
                            <span>ICMS (Informativo):</span>
                            <span>{formatCurrency(totais.total_icms)}</span>
                          </div>
                          <p className="text-xs mt-1 text-blue-600">
                            Este valor NÃO está incluído no total da venda. É apenas informativo para o cliente (pode ser creditado).
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-gray-50 rounded-md text-center text-gray-500 text-sm">
                  Adicione itens para visualizar o resumo
                </div>
              )}
            </div>
          </div>

          {/* Installments Table - Show generated installments */}
          {usarParcelas && parcelas.length > 0 && (
            <div className="space-y-2">
              <Label className="mb-2 block">Parcelas Geradas</Label>
              <div className="border rounded-md overflow-hidden">
                <ScrollableContainer className="max-h-[300px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b sticky top-0">
                      <tr>
                        <th className="text-left py-2 px-3 text-xs font-medium text-gray-700">Parcela</th>
                        <th className="text-right py-2 px-3 text-xs font-medium text-gray-700">Valor</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-gray-700">Vencimento</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-gray-700">Observações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parcelas.map((parcela, index) => (
                        <tr key={index} className="border-b last:border-b-0 hover:bg-gray-50">
                          <td className="py-2 px-3 text-sm font-medium">
                            {parcela.numero_parcela}/{parcelas.length}
                          </td>
                          <td className="py-2 px-3">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={parcela.valor_parcela}
                              onChange={(e) => atualizarParcela(index, 'valor_parcela', Number(e.target.value))}
                              className="w-full text-xs p-1 text-right"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <Input
                              type="date"
                              value={parcela.data_vencimento}
                              onChange={(e) => atualizarParcela(index, 'data_vencimento', e.target.value)}
                              className="w-full text-xs p-1"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <Input
                              type="text"
                              value={parcela.observacoes || ''}
                              onChange={(e) => atualizarParcela(index, 'observacoes', e.target.value)}
                              placeholder="Opcional"
                              className="w-full text-xs p-1"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t">
                      <tr>
                        <td className="py-2 px-3 text-xs font-bold">Total:</td>
                        <td className="py-2 px-3 text-xs font-bold text-right">
                          {formatCurrency(parcelas.reduce((sum, p) => sum + p.valor_parcela, 0))}
                        </td>
                        <td colSpan={2} className="py-2 px-3">
                          {totais && Math.abs(parcelas.reduce((sum, p) => sum + p.valor_parcela, 0) - totais.total_geral) > 0.01 && (
                            <span className="text-xs text-red-600">
                              ⚠️ Total das parcelas difere do valor da venda
                            </span>
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </ScrollableContainer>
              </div>
            </div>
          )}

          {/* Opções de Impostos */}
          <div className="border-t pt-4">
            <Label className="mb-3 block font-medium">Configuração de Impostos</Label>
            <div className="flex flex-wrap gap-6">
              {/* Sem IPI Option */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="sem-ipi"
                  checked={formData.sem_ipi}
                  onChange={(e) => {
                    const semIpi = e.target.checked
                    setFormData(prev => ({
                      ...prev,
                      sem_ipi: semIpi,
                      sem_impostos: semIpi && prev.sem_st,
                      observacoes: updateTaxObservations(prev.observacoes, semIpi, prev.sem_st)
                    }))
                  }}
                  className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
                <Label htmlFor="sem-ipi" className="cursor-pointer font-medium text-orange-700">
                  Sem IPI
                </Label>
              </div>

              {/* Sem ST Option */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="sem-st"
                  checked={formData.sem_st}
                  onChange={(e) => {
                    const semSt = e.target.checked
                    setFormData(prev => ({
                      ...prev,
                      sem_st: semSt,
                      sem_impostos: prev.sem_ipi && semSt,
                      observacoes: updateTaxObservations(prev.observacoes, prev.sem_ipi, semSt)
                    }))
                  }}
                  className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <Label htmlFor="sem-st" className="cursor-pointer font-medium text-purple-700">
                  Sem ST
                </Label>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Selecione os impostos que deseja remover do cálculo. IPI e ST podem ser removidos individualmente ou em conjunto.
            </p>
            {(formData.sem_ipi || formData.sem_st) && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-xs text-yellow-700">
                  ⚠️ Impostos desabilitados: {[formData.sem_ipi && 'IPI', formData.sem_st && 'ST'].filter(Boolean).join(' e ')}
                </p>
              </div>
            )}
          </div>

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

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || itens.length === 0}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Venda'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
    </>
  )
}
