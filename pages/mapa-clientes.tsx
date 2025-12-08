import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Map,
  MapPin,
  Users,
  AlertCircle,
  TrendingUp,
  Loader2,
} from 'lucide-react'
import Toast from '@/components/ui/Toast'
import axios from 'axios'
import type { ClienteMapMarker } from '@/pages/api/clientes/map-data'

// Dynamically import map component to avoid SSR issues with Leaflet
const ClientesMap = dynamic(
  () => import('@/components/maps/ClientesMap'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[600px] bg-gray-50 rounded-lg">
        <Loader2 className="h-8 w-8 animate-spin text-meguispet-primary" />
      </div>
    )
  }
)

interface MapStats {
  total_clientes: number
  clientes_geocodificados: number
  clientes_pendentes: number
  porcentagem_cobertura: number
}

export default function MapaClientesPage() {
  const [markers, setMarkers] = useState<ClienteMapMarker[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<MapStats | null>(null)
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null)

  useEffect(() => {
    loadMapData()
  }, [])

  const loadMapData = async () => {
    try {
      setLoading(true)

      const params = new URLSearchParams({
        include_stats: 'true',
      })

      const response = await axios.get(`/api/clientes/map-data?${params.toString()}`)

      if (response.data.success) {
        setMarkers(response.data.data || [])
        setStats(response.data.stats)
      } else {
        setToast({
          message: response.data.message || 'Erro ao carregar dados do mapa',
          type: 'error',
        })
      }
    } catch (error) {
      console.error('Erro ao carregar mapa:', error)
      setToast({
        message: 'Erro ao carregar dados do mapa',
        type: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleMarkerClick = (cliente: ClienteMapMarker) => {
    console.log('Cliente clicado:', cliente)
    // Pode abrir modal de detalhes do cliente aqui
  }

  return (
    <div className="space-y-6">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Map className="h-8 w-8 text-meguispet-primary" />
          Mapa de Clientes
        </h1>
        <p className="text-muted-foreground">
          Visualização geográfica da distribuição de clientes
        </p>
      </div>

      {/* Estatísticas */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_clientes}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Geocodificados</CardTitle>
              <MapPin className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.clientes_geocodificados}</div>
              <p className="text-xs text-muted-foreground">
                {stats.porcentagem_cobertura}% de cobertura
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.clientes_pendentes}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">No Mapa</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{markers.length}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Mapa */}
      <Card>
        <CardHeader>
          <CardTitle>Localização dos Clientes</CardTitle>
          <CardDescription>
            Mapa interativo com a distribuição geográfica dos clientes
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ClientesMap
            markers={markers}
            loading={loading}
            onMarkerClick={handleMarkerClick}
          />
        </CardContent>
      </Card>
    </div>
  )
}
