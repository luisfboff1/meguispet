import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import type { Estoque, ProdutoEstoqueInput } from '@/types'
import { estoquesService } from '@/services/api'

interface ProdutoEstoqueDistributionProps {
  initialValue?: ProdutoEstoqueInput[]
  onChange: (value: ProdutoEstoqueInput[]) => void
}

export default function ProdutoEstoqueDistribution({ initialValue, onChange }: ProdutoEstoqueDistributionProps) {
  const [estoquesDisponiveis, setEstoquesDisponiveis] = useState<Estoque[]>([])
  const [quantidades, setQuantidades] = useState<Record<number, number>>({})
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const syncWithInitial = useCallback(
    (estoques: Estoque[], valores?: ProdutoEstoqueInput[]) => {
      const mapa: Record<number, number> = {}
      estoques.forEach((estoque) => {
        const registro = valores?.find((item) => Number(item.estoque_id) === Number(estoque.id))
        mapa[estoque.id] = registro ? Number(registro.quantidade) : 0
      })
      setQuantidades(mapa)
    },
    []
  )

  useEffect(() => {
    const carregarEstoques = async () => {
      try {
        setLoading(true)
        setErro(null)
        const response = await estoquesService.getAll(true)
        if (response.success && response.data) {
          setEstoquesDisponiveis(response.data)
          syncWithInitial(response.data, initialValue)
        } else {
          setErro(response.message || 'Não foi possível carregar os estoques')
        }
      } catch (error) {
        console.error('Erro ao carregar estoques:', error)
        setErro('Erro ao carregar estoques')
      } finally {
        setLoading(false)
      }
    }

    void carregarEstoques()
  }, [initialValue, syncWithInitial])

  useEffect(() => {
    if (!initialValue || initialValue.length === 0) return
    if (estoquesDisponiveis.length === 0) return
    syncWithInitial(estoquesDisponiveis, initialValue)
  }, [initialValue, estoquesDisponiveis, syncWithInitial])

  useEffect(() => {
    const payload = Object.entries(quantidades).map(([estoqueId, quantidade]) => ({
      estoque_id: Number(estoqueId),
      quantidade: Number(quantidade) || 0
    }))
    onChange(payload)
  }, [quantidades, onChange])

  const totalDistribuido = useMemo(
    () => Object.values(quantidades).reduce((acc, valor) => acc + (Number(valor) || 0), 0),
    [quantidades]
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Label>Distribuição por Estoque</Label>
          <p className="text-xs text-gray-500">Total alocado: {totalDistribuido}</p>
        </div>
      </div>
      {loading && estoquesDisponiveis.length === 0 ? (
        <div className="flex items-center text-sm text-gray-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando estoques...
        </div>
      ) : erro ? (
        <p className="text-sm text-red-600">{erro}</p>
      ) : (
        <div className="space-y-2">
          {estoquesDisponiveis.map((estoque) => (
            <div key={estoque.id} className="grid grid-cols-1 gap-2 md:grid-cols-2 md:items-center">
              <div>
                <p className="text-sm font-medium">{estoque.nome}</p>
                {estoque.descricao ? <p className="text-xs text-gray-500">{estoque.descricao}</p> : null}
              </div>
              <Input
                type="number"
                min="0"
                value={quantidades[estoque.id] ?? 0}
                onChange={(event) => {
                  const valor = Number(event.target.value)
                  setQuantidades((prev) => ({
                    ...prev,
                    [estoque.id]: Number.isNaN(valor) ? 0 : Math.max(0, Math.floor(valor))
                  }))
                }}
                placeholder="0"
              />
            </div>
          ))}
          {estoquesDisponiveis.length === 0 ? (
            <p className="text-sm text-gray-500">
              Nenhum estoque cadastrado. Cadastre estoques antes de distribuir os itens.
            </p>
          ) : (
            <p className="text-xs text-gray-500">O total é recalculado automaticamente ao atualizar as quantidades.</p>
          )}
        </div>
      )}
    </div>
  )
}
