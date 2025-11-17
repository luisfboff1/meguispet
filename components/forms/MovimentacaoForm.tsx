import React, { useMemo } from 'react'
import EstoqueOperacaoForm from './EstoqueOperacaoForm'
import type {
  EstoqueOperacaoInput,
  EstoqueOperacaoTipo,
  MovimentacaoForm as MovimentacaoFormValues,
  MovimentacaoEstoque,
  Produto
} from '@/types'

const MOVIMENTACAO_TIPO_OPTIONS: Array<{ value: EstoqueOperacaoTipo; label: string }> = [
  { value: 'entrada', label: 'Entrada (compra de fornecedor)' },
  { value: 'saida', label: 'Saída (venda para cliente)' }
]

type MovimentacaoEdicao = MovimentacaoEstoque & { produtos?: string }

interface MovimentacaoFormProps {
  produto?: Produto
  editingData?: MovimentacaoEdicao
  loading?: boolean
  onSubmit: (values: MovimentacaoFormValues) => Promise<void> | void
  onCancel: () => void
}

const mapEditingItemsToEstoque = (editingData?: MovimentacaoEdicao) => {
  if (!editingData) return []

  if (editingData.produtos) {
    try {
      const parsed = JSON.parse(editingData.produtos) as Array<{
        produto_id: number
        quantidade: number
        preco_unitario: number
        valor_total?: number
        produto_nome?: string
      }>
      return parsed.map((item) => ({
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario,
        valor_total: item.valor_total ?? item.quantidade * item.preco_unitario,
        produto_nome: item.produto_nome
      }))
    } catch (error) {
    }
  }

  if (editingData.itens?.length) {
    return editingData.itens.map((item) => ({
      produto_id: item.produto_id,
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario,
      valor_total: item.subtotal,
      produto_nome: item.produto?.nome
    }))
  }

  return []
}

const buildInitialData = (
  produto?: Produto,
  editingData?: MovimentacaoEdicao
): Partial<EstoqueOperacaoInput> | undefined => {
  const editingItems = mapEditingItemsToEstoque(editingData)

  const presetItems = editingItems.length > 0
    ? editingItems
    : produto
    ? [{
        produto_id: produto.id,
        quantidade: 1,
        preco_unitario: produto.preco_venda ?? produto.preco_custo ?? 0,
        valor_total: produto.preco_venda ?? produto.preco_custo ?? 0,
        produto_nome: produto.nome
      }]
    : []

  const participante = editingData
    ? {
        cliente_id: editingData.cliente_id ?? null,
        fornecedor_id: editingData.fornecedor_id ?? null,
        vendedor_id: editingData.vendedor_id ?? null
      }
    : undefined

  const tipo = editingData?.tipo ?? (produto ? 'saida' : 'entrada')
  const observacoes = editingData?.observacoes ?? undefined

  if (presetItems.length === 0 && !participante && !observacoes && !editingData?.tipo) {
    return undefined
  }

  return {
    tipo,
    itens: presetItems,
    participante,
    observacoes
  }
}

const convertToMovimentacaoPayload = (input: EstoqueOperacaoInput): MovimentacaoFormValues | null => {
  if (input.itens.length === 0) {
    if (typeof window !== 'undefined') {
      window.alert('Adicione ao menos um item antes de salvar a movimentação.')
    }
    return null
  }

  if (input.tipo === 'transferencia') {
    if (typeof window !== 'undefined') {
      window.alert('Transferência entre estoques ainda não está disponível neste fluxo.')
    }
    return null
  }

  const tipo_movimentacao: MovimentacaoFormValues['tipo_movimentacao'] =
    input.tipo === 'saida' ? 'saida' : 'entrada'

  const produtos = input.itens.map((item) => ({
    produto_id: item.produto_id,
    quantidade: item.quantidade,
    preco_unitario: item.preco_unitario ?? 0,
    valor_total: item.valor_total ?? item.quantidade * (item.preco_unitario ?? 0),
    produto_nome: item.produto_nome
  }))

  const base: MovimentacaoFormValues = {
    tipo_movimentacao,
    observacoes: input.observacoes,
    produtos
  }

  if (tipo_movimentacao === 'entrada') {
    const fornecedorId = input.participante?.fornecedor_id ?? undefined
    if (!fornecedorId) {
      if (typeof window !== 'undefined') {
        window.alert('Selecione um fornecedor para registrar a entrada.')
      }
      return null
    }
    return {
      ...base,
      fornecedor_id: fornecedorId
    }
  }

  const clienteId = input.participante?.cliente_id ?? undefined
  if (!clienteId) {
    if (typeof window !== 'undefined') {
      window.alert('Selecione um cliente para registrar a saída.')
    }
    return null
  }

  return {
    ...base,
    cliente_id: clienteId,
    vendedor_id: input.participante?.vendedor_id ?? undefined
  }
}

export default function MovimentacaoForm({
  produto,
  onSubmit,
  onCancel,
  loading = false,
  editingData
}: MovimentacaoFormProps) {
  const defaultTipo: EstoqueOperacaoTipo = editingData?.tipo === 'saida' ? 'saida' : 'entrada'

  const initialData = useMemo(
    () => buildInitialData(produto, editingData),
    [produto, editingData]
  )

  const handleSubmit = async (payload: EstoqueOperacaoInput) => {
    const movimentacao = convertToMovimentacaoPayload(payload)
    if (!movimentacao) return
    await onSubmit(movimentacao)
  }

  return (
    <EstoqueOperacaoForm
      title={editingData ? 'Editar movimentação de estoque' : 'Nova movimentação de estoque'}
      description="Selecione o fluxo, participantes e itens para registrar a movimentação."
      defaultTipo={defaultTipo}
      initialData={initialData}
      allowTipoSwitch
      onSubmit={handleSubmit}
      onCancel={onCancel}
      loading={loading}
      participanteConfig={{ enableCliente: true, enableFornecedor: true, enableVendedor: true }}
      tipoOptions={MOVIMENTACAO_TIPO_OPTIONS}
    />
  )
}
