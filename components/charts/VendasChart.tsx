import React from 'react'

interface VendasChartProps {
  data: Array<{
    data: string
    vendas: number
    receita: number
  }>
  loading?: boolean
}

export default function VendasChart({ data, loading = false }: VendasChartProps) {
  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-meguispet-primary"></div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <p>Nenhum dado de vendas disponível</p>
      </div>
    )
  }

  // Encontrar o valor máximo para normalizar o gráfico
  const maxVendas = Math.max(...data.map(d => d.vendas), 0)
  const maxReceita = Math.max(...data.map(d => d.receita), 0)
  const safeMaxVendas = maxVendas > 0 ? maxVendas : 1
  const safeMaxReceita = maxReceita > 0 ? maxReceita : 1

  return (
    <div className="flex h-64 w-full flex-col">
      <div className="relative flex-1 overflow-visible">
        <div className="absolute inset-0 flex items-end gap-3">
          {data.map((item, index) => {
            const vendasHeight = Math.round((item.vendas / safeMaxVendas) * 160)
            const receitaHeight = Math.round((item.receita / safeMaxReceita) * 120)

            return (
              <div key={index} className="flex w-full flex-1 flex-col items-center gap-2">
                <div className="flex w-full items-end justify-center gap-1">
                  <div
                    className="relative flex w-6 flex-col items-center justify-end rounded-full bg-meguispet-primary/15 text-[10px] text-meguispet-primary"
                    style={{ height: Math.max(vendasHeight, item.vendas > 0 ? 4 : 0) }}
                    aria-label={`Vendas em ${item.data}: ${item.vendas}`}
                  >
                    {item.vendas > 0 && (
                      <span className="absolute -top-6 rounded-full bg-white/90 px-1.5 py-0.5 text-[10px] font-medium shadow-sm">
                        {item.vendas}
                      </span>
                    )}
                    <div className="w-full flex-1 rounded-full bg-meguispet-primary" />
                  </div>
                  <div
                    className="relative flex w-6 flex-col items-center justify-end rounded-full bg-emerald-500/15 text-[10px] text-emerald-600"
                    style={{ height: Math.max(receitaHeight, item.receita > 0 ? 4 : 0) }}
                    aria-label={`Receita em ${item.data}: R$ ${item.receita.toFixed(2)}`}
                  >
                    {item.receita > 0 && (
                      <span className="absolute -top-6 rounded-full bg-white/90 px-1.5 py-0.5 text-[10px] font-medium shadow-sm">
                        R$ {item.receita.toFixed(0)}
                      </span>
                    )}
                    <div className="w-full flex-1 rounded-full bg-emerald-500" />
                  </div>
                </div>
                <div className="text-center text-xs text-gray-600">
                  <div className="font-medium uppercase tracking-wide text-gray-700">
                    {new Date(item.data).toLocaleDateString('pt-BR', {
                      weekday: 'short'
                    })}
                  </div>
                  <div className="text-[11px] text-gray-500">
                    {new Date(item.data).toLocaleDateString('pt-BR', { day: '2-digit' })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Legenda */}
      <div className="mt-5 flex justify-center gap-6 text-xs text-gray-600">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-meguispet-primary" />
          Vendas
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-emerald-500" />
          Receita
        </div>
      </div>
    </div>
  )
}
