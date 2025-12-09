import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Map,
  MapPin,
  Users,
  AlertCircle,
  TrendingUp,
  Loader2,
  XCircle,
  Target,
  Navigation,
  Building2,
  ChevronRight,
  List,
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

interface GeocodeError {
  id: number
  nome: string
  error: string
}

export default function MapaClientesPage() {
  const [markers, setMarkers] = useState<ClienteMapMarker[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<MapStats | null>(null)
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null)
  const [geocoding, setGeocoding] = useState(false)
  const [geocodeErrors, setGeocodeErrors] = useState<GeocodeError[]>([])
  const [showErrorDialog, setShowErrorDialog] = useState(false)
  const [selectedCliente, setSelectedCliente] = useState<ClienteMapMarker | null>(null)
  const [showClienteList, setShowClienteList] = useState(false)
  const [resetMapView, setResetMapView] = useState(false)

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
    setSelectedCliente(cliente)
    setShowClienteList(true)
  }

  const handleClienteSelect = (cliente: ClienteMapMarker) => {
    if (selectedCliente?.id === cliente.id) {
      // Desselecionar se clicar no mesmo cliente
      setSelectedCliente(null)
      setResetMapView(true)
      setTimeout(() => setResetMapView(false), 100)
    } else {
      // Selecionar novo cliente
      setSelectedCliente(cliente)
      setResetMapView(false)
    }
  }

  const getPrecisionBadge = (precision: string) => {
    switch (precision) {
      case 'exact':
        return {
          label: 'Endereço Exato',
          icon: Target,
          color: 'bg-green-100 text-green-800 border-green-300'
        }
      case 'street':
        return {
          label: 'Rua',
          icon: Navigation,
          color: 'bg-blue-100 text-blue-800 border-blue-300'
        }
      case 'city':
        return {
          label: 'Cidade',
          icon: Building2,
          color: 'bg-yellow-100 text-yellow-800 border-yellow-300'
        }
      default:
        return {
          label: 'Aproximado',
          icon: MapPin,
          color: 'bg-gray-100 text-gray-800 border-gray-300'
        }
    }
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
        const { successful, failed, skipped, processed, errors } = response.data.data

        let message = `Geocodificação concluída: ${successful} sucesso(s)`
        if (failed > 0) message += `, ${failed} falha(s)`
        if (skipped > 0) message += `, ${skipped} ignorado(s)`
        message += ` de ${processed} processado(s).`

        // Save errors for detailed view
        if (errors && errors.length > 0) {
          setGeocodeErrors(errors)
          message += ' Clique em "Ver Detalhes" para mais informações.'
        }

        setToast({
          message,
          type: successful > 0 ? 'success' : (failed > 0 ? 'error' : 'info'),
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

      {/* Error Dialog */}
      {showErrorDialog && geocodeErrors.length > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <CardHeader className="flex-shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  Erros de Geocodificação
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowErrorDialog(false)}
                >
                  ✕
                </Button>
              </div>
              <CardDescription>
                {geocodeErrors.length} cliente(s) não puderam ser geocodificados
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-y-auto">
              <div className="space-y-3">
                {geocodeErrors.map((err) => (
                  <div key={err.id} className="border rounded-lg p-3 bg-red-50 border-red-200">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900">
                          {err.nome} <span className="text-gray-500">(ID: {err.id})</span>
                        </p>
                        <p className="text-sm text-red-600 mt-1">{err.error}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
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

        <div className="flex gap-2">
          {geocodeErrors.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setShowErrorDialog(true)}
              className="border-red-300 text-red-700 hover:bg-red-50"
            >
              <AlertCircle className="mr-2 h-4 w-4" />
              Ver Detalhes dos Erros ({geocodeErrors.length})
            </Button>
          )}

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

      {/* Mapa + Lista */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Mapa */}
        <Card className={`${showClienteList ? 'lg:col-span-2' : 'lg:col-span-3'} transition-all duration-300`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Localização dos Clientes</CardTitle>
                <CardDescription>
                  Mapa interativo com a distribuição geográfica dos clientes
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowClienteList(!showClienteList)}
                className="flex items-center gap-2"
              >
                <List className="h-4 w-4" />
                {showClienteList ? 'Ocultar' : 'Mostrar'} Lista
              </Button>
            </div>
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
                  selectedClienteId={selectedCliente?.id || null}
                  resetView={resetMapView}
                />
              </>
            )}
          </CardContent>
        </Card>

        {/* Lista de Clientes */}
        {showClienteList && (
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Clientes no Mapa</CardTitle>
              <CardDescription>
                {markers.length} cliente(s) geocodificado(s)
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[600px] overflow-y-auto">
                {markers.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Nenhum cliente geocodificado</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {markers.map((cliente) => {
                      const precision = getPrecisionBadge(cliente.precision)
                      const PrecisionIcon = precision.icon
                      const isSelected = selectedCliente?.id === cliente.id

                      return (
                        <button
                          key={cliente.id}
                          onClick={() => handleClienteSelect(cliente)}
                          className={`w-full p-3 text-left hover:bg-gray-50 transition-colors ${
                            isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <ChevronRight className={`h-5 w-5 mt-0.5 flex-shrink-0 transition-transform ${
                              isSelected ? 'rotate-90 text-blue-600' : 'text-gray-400'
                            }`} />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{cliente.nome}</p>
                              {cliente.cidade && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {cliente.cidade}/{cliente.estado}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${precision.color}`}
                                >
                                  <PrecisionIcon className="h-3 w-3 mr-1" />
                                  {precision.label}
                                </Badge>
                              </div>
                            </div>
                          </div>

                          {/* Detalhes expandidos */}
                          {isSelected && (
                            <div className="mt-2 pt-2 border-t space-y-1 text-xs text-muted-foreground">
                              {cliente.telefone && (
                                <p>📞 {cliente.telefone}</p>
                              )}
                              {cliente.email && (
                                <p className="truncate">✉️ {cliente.email}</p>
                              )}
                              {cliente.vendedor_nome && (
                                <p>👤 {cliente.vendedor_nome}</p>
                              )}
                              <p className="text-gray-400">
                                📍 {cliente.latitude.toFixed(6)}, {cliente.longitude.toFixed(6)}
                              </p>
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
