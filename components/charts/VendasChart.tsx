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
  const maxVendas = Math.max(...data.map(d => d.vendas))
  const maxReceita = Math.max(...data.map(d => d.receita))

  return (
    <div className="h-64 w-full">
      <div className="flex items-end justify-between h-full space-x-2">
        {data.map((item, index) => (
          <div key={index} className="flex-1 flex flex-col items-center">
            {/* Gráfico de barras */}
            <div className="w-full flex flex-col items-center space-y-1">
              {/* Barra de vendas */}
              <div 
                className="w-full bg-meguispet-primary/20 rounded-t"
                style={{ 
                  height: `${(item.vendas / maxVendas) * 120}px`,
                  minHeight: '4px'
                }}
              >
                <div className="w-full h-full bg-meguispet-primary rounded-t"></div>
              </div>
              
              {/* Barra de receita */}
              <div 
                className="w-full bg-green-500/20 rounded-b"
                style={{ 
                  height: `${(item.receita / maxReceita) * 80}px`,
                  minHeight: '4px'
                }}
              >
                <div className="w-full h-full bg-green-500 rounded-b"></div>
              </div>
            </div>
            
            {/* Labels */}
            <div className="mt-2 text-center">
              <div className="text-xs text-gray-600 font-medium">
                {new Date(item.data).toLocaleDateString('pt-BR', { 
                  weekday: 'short',
                  day: '2-digit'
                })}
              </div>
              <div className="text-xs text-gray-500">
                {item.vendas} vendas
              </div>
              <div className="text-xs text-green-600 font-medium">
                R$ {item.receita.toFixed(0)}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Legenda */}
      <div className="flex justify-center space-x-4 mt-4">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-meguispet-primary rounded"></div>
          <span className="text-xs text-gray-600">Vendas</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span className="text-xs text-gray-600">Receita</span>
        </div>
      </div>
    </div>
  )
}
