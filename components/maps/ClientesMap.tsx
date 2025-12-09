'use client'

import React, { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { MapPin, Phone, Mail, User } from 'lucide-react'
import type { ClienteMapMarker } from '@/pages/api/clientes/map-data'

// Fix Leaflet default icon issue with webpack
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png'

const DefaultIcon = L.icon({
  iconRetinaUrl: iconRetina.src,
  iconUrl: icon.src,
  shadowUrl: iconShadow.src,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

L.Marker.prototype.options.icon = DefaultIcon

interface ClientesMapProps {
  markers: ClienteMapMarker[]
  onMarkerClick?: (cliente: ClienteMapMarker) => void
  initialCenter?: [number, number]
  initialZoom?: number
  selectedClienteId?: number | null
  resetView?: boolean
}

// Component to fit bounds when markers change
function MapBoundsUpdater({
  markers,
  resetView
}: {
  markers: ClienteMapMarker[]
  resetView?: boolean
}) {
  const map = useMap()

  useEffect(() => {
    if (markers.length > 0) {
      const bounds = L.latLngBounds(
        markers.map(m => [m.latitude, m.longitude] as [number, number])
      )
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 })

      // Force map to invalidate size to ensure proper rendering
      setTimeout(() => {
        map.invalidateSize()
      }, 100)
    }
  }, [markers, map])

  // Reset view when resetView changes to true
  useEffect(() => {
    if (resetView && markers.length > 0) {
      const bounds = L.latLngBounds(
        markers.map(m => [m.latitude, m.longitude] as [number, number])
      )
      map.fitBounds(bounds, {
        padding: [50, 50],
        maxZoom: 12,
        animate: true,
        duration: 0.5
      })
    }
  }, [resetView, markers, map])

  return null
}

// Component to zoom to selected cliente
function SelectedClienteZoom({
  selectedClienteId,
  markers
}: {
  selectedClienteId: number | null
  markers: ClienteMapMarker[]
}) {
  const map = useMap()

  useEffect(() => {
    if (selectedClienteId) {
      const cliente = markers.find(m => m.id === selectedClienteId)
      if (cliente) {
        map.setView([cliente.latitude, cliente.longitude], 15, {
          animate: true,
          duration: 0.5
        })
      }
    }
  }, [selectedClienteId, markers, map])

  return null
}

export default function ClientesMap({
  markers,
  onMarkerClick,
  initialCenter = [-15.7942, -47.8822], // Centro do Brasil (Brasília)
  initialZoom = 5, // Zoom mais afastado para ver o país todo
  selectedClienteId = null,
  resetView = false,
}: ClientesMapProps) {
  // Criar ícones customizados por tipo
  const createCustomIcon = (tipo: ClienteMapMarker['tipo']) => {
    const color = tipo === 'cliente' ? '#10b981' : tipo === 'fornecedor' ? '#3b82f6' : '#8b5cf6'
    
    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          background-color: ${color};
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        "></div>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
      popupAnchor: [0, -10],
    })
  }

  if (markers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[600px] bg-gray-50 rounded-lg">
        <MapPin className="h-12 w-12 text-gray-400 mb-4" />
        <p className="text-gray-600 text-center">
          Nenhum cliente com localização disponível
        </p>
      </div>
    )
  }

  return (
    <div className="relative w-full h-[600px] rounded-lg overflow-hidden shadow-lg">
      <MapContainer
        center={initialCenter}
        zoom={initialZoom}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        {/* Tiles do OpenStreetMap */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Auto-fit bounds to markers */}
        <MapBoundsUpdater markers={markers} resetView={resetView} />

        {/* Zoom to selected cliente */}
        <SelectedClienteZoom selectedClienteId={selectedClienteId} markers={markers} />

        {/* Markers */}
        {markers.map(marker => (
          <Marker
            key={marker.id}
            position={[marker.latitude, marker.longitude]}
            icon={createCustomIcon(marker.tipo)}
            eventHandlers={{
              click: () => onMarkerClick?.(marker),
            }}
          >
            <Popup>
                <div className="p-2 min-w-[200px]">
                  <h3 className="font-semibold text-lg mb-2">{marker.nome}</h3>
                  <div className="space-y-1 text-sm">
                    {marker.cidade && marker.estado && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span>{marker.cidade}, {marker.estado}</span>
                      </div>
                    )}
                    {marker.telefone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <span>{marker.telefone}</span>
                      </div>
                    )}
                    {marker.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <span className="text-xs">{marker.email}</span>
                      </div>
                    )}
                    {marker.vendedor_nome && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span>Vendedor: {marker.vendedor_nome}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 z-[1000] bg-white p-3 rounded-lg shadow-lg">
        <div className="text-sm space-y-1">
          <div className="font-semibold mb-2">Legenda</div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Cliente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span>Fornecedor</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
            <span>Ambos</span>
          </div>
        </div>
      </div>
    </div>
  )
}
