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
  const [geocoding, setGeocoding] = useState(false)

  useEffect(() => {
    loadMapData()
  }, [])

  const loadMapData = async () => {
    try {
      console.log('🗺️ [Mapa] Iniciando carregamento dos dados do mapa...')
      setLoading(true)

      const params = new URLSearchParams({
        include_stats: 'true',
      })

      console.log('🗺️ [Mapa] Chamando API:', `/api/clientes/map-data?${params.toString()}`)
      const response = await axios.get(`/api/clientes/map-data?${params.toString()}`)
      console.log('🗺️ [Mapa] Resposta da API recebida:', response.status)
      console.log('🗺️ [Mapa] Dados recebidos:', {
        success: response.data.success,
        markers_count: response.data.data?.length || 0,
        stats: response.data.stats
      })

      if (response.data.success) {
        console.log('🗺️ [Mapa] Setando markers:', response.data.data?.length || 0, 'marcadores')
        setMarkers(response.data.data || [])
        console.log('🗺️ [Mapa] Setando stats:', response.data.stats)
        setStats(response.data.stats)
        
        // If no markers but stats show clients, they need geocoding
        if ((!response.data.data || response.data.data.length === 0) && response.data.stats && response.data.stats.total_clientes > 0) {
          console.log('🗺️ [Mapa] Clientes sem coordenadas detectados')
          setToast({
            message: `${response.data.stats.total_clientes} cliente(s) encontrado(s), mas nenhum com coordenadas. Use o botão "Geocodificar" para adicionar coordenadas.`,
            type: 'info',
          })
        }
        console.log('🗺️ [Mapa] ✅ Dados carregados com sucesso!')
      } else {
        console.error('🗺️ [Mapa] ❌ API retornou success=false:', response.data.message)
        setToast({
          message: response.data.message || 'Erro ao carregar dados do mapa',
          type: 'error',
        })
      }
    } catch (error) {
      console.error('🗺️ [Mapa] ❌ Erro ao carregar mapa:', error)
      if (axios.isAxiosError(error) && error.response) {
        console.error('🗺️ [Mapa] Detalhes do erro HTTP:', {
          status: error.response.status,
          data: error.response.data
        })
        setToast({
          message: error.response.data?.message || 'Erro ao carregar dados do mapa. Verifique se a migração do banco foi aplicada.',
          type: 'error',
        })
      } else {
        console.error('🗺️ [Mapa] Erro de rede ou desconhecido:', error)
        setToast({
          message: 'Erro ao carregar dados do mapa. Verifique a conexão.',
          type: 'error',
        })
      }
    } finally {
      console.log('🗺️ [Mapa] Finalizando loading (setLoading(false))')
      setLoading(false)
    }
  }

  const handleMarkerClick = (cliente: ClienteMapMarker) => {
    console.log('Cliente clicado:', cliente)
    // Pode abrir modal de detalhes do cliente aqui
  }

  const handleGeocodeClientes = async () => {
    if (!confirm('Deseja geocodificar os clientes pendentes? Isso pode levar alguns minutos dependendo da quantidade.')) {
      return
    }

    try {
      setGeocoding(true)
      setToast({
        message: 'Geocodificando clientes... Por favor, aguarde.',
        type: 'info',
      })

      const response = await axios.post('/api/clientes/geocode', {
        batch_size: 50,
        force: false,
      })

      if (response.data.success) {
        const { successful, failed, skipped, processed } = response.data.data
        
        let message = `Geocodificação concluída: ${successful} sucesso(s)`
        if (failed > 0) message += `, ${failed} falha(s)`
        if (skipped > 0) message += `, ${skipped} ignorado(s)`
        message += ` de ${processed} processado(s).`
        
        setToast({
          message,
          type: successful > 0 ? 'success' : 'info',
        })
        
        // Recarregar dados do mapa
        await loadMapData()
      } else {
        setToast({
          message: response.data.message || 'Erro ao geocodificar clientes',
          type: 'error',
        })
      }
    } catch (error) {
      console.error('Erro ao geocodificar:', error)
      if (axios.isAxiosError(error) && error.response) {
        setToast({
          message: error.response.data?.message || 'Erro ao geocodificar. Verifique se a migração do banco foi aplicada.',
          type: 'error',
        })
      } else {
        setToast({
          message: 'Erro ao geocodificar clientes. Verifique a conexão.',
          type: 'error',
        })
      }
    } finally {
      setGeocoding(false)
    }
  }

  return (
    <div className="space-y-6">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Map className="h-8 w-8 text-meguispet-primary" />
            Mapa de Clientes
          </h1>
          <p className="text-muted-foreground">
            Visualização geográfica da distribuição de clientes
          </p>
        </div>
        
        {stats && stats.clientes_pendentes > 0 && (
          <Button 
            onClick={handleGeocodeClientes}
            disabled={geocoding}
            className="bg-meguispet-primary hover:bg-meguispet-primary/90"
          >
            {geocoding ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Geocodificando...
              </>
            ) : (
              <>
                <MapPin className="mr-2 h-4 w-4" />
                Geocodificar Pendentes ({stats.clientes_pendentes})
              </>
            )}
          </Button>
        )}
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
          {loading ? (
            <div className="flex items-center justify-center h-[600px] bg-gray-50 rounded-lg">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-meguispet-primary mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Carregando dados do mapa...</p>
              </div>
            </div>
          ) : (
            <>
              {console.log('🗺️ [Mapa] Renderizando componente ClientesMap com', markers.length, 'marcadores')}
              <ClientesMap
                markers={markers}
                onMarkerClick={handleMarkerClick}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
