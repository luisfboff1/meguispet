# 🗺️ Plano de Implementação: Mapa Interativo de Localização de Clientes

**Data de Criação:** 2025-12-08  
**Solicitante:** Usuário  
**Status:** Em Planejamento  
**Prioridade:** Alta  

---

## 📋 Sumário Executivo

### Objetivo
Criar um sistema de visualização geográfica interativo que exiba a localização dos clientes em um mapa real, permitindo zoom, navegação e visualização tipo "mapa de calor" para análise de distribuição geográfica de clientes.

### Benefícios
- 📍 **Análise Geográfica:** Visualizar distribuição de clientes por região
- 🎯 **Planejamento Estratégico:** Identificar áreas com maior/menor concentração de clientes
- 🚗 **Otimização de Rotas:** Facilitar planejamento de visitas e entregas
- 📊 **Insights de Negócio:** Identificar oportunidades de expansão geográfica
- 👥 **Gestão de Vendedores:** Visualizar territórios e distribuição de clientes por vendedor

---

## 🏗️ Arquitetura da Solução

### Escolha da Tecnologia de Mapas

Recomendação: **Leaflet.js + React-Leaflet**

**Justificativa:**
- ✅ Open Source e gratuito (sem custos de API como Google Maps)
- ✅ Leve e performático (38kb minificado)
- ✅ Excelente integração com React via react-leaflet
- ✅ Suporta heatmaps via plugin leaflet.heat
- ✅ Altamente customizável
- ✅ Funciona offline com tiles em cache
- ✅ Suporte a clustering de marcadores
- ✅ Boa documentação e comunidade ativa

**Alternativas Consideradas:**
- **Google Maps:** Requer API key paga ($200/mês após free tier)
- **Mapbox:** Melhor visual mas pago após 50k requests/mês
- **OpenLayers:** Mais complexo e pesado (não justificado para este caso)

### Stack Técnica

```
Frontend:
├── react-leaflet (^4.2.1)          # Componente React para Leaflet
├── leaflet (^1.9.4)                # Biblioteca de mapas
├── leaflet.heat (^0.2.0)           # Plugin de heatmap
├── leaflet.markercluster (^1.5.3)  # Plugin de clustering
└── @types/leaflet (^1.9.8)         # Types TypeScript

Backend:
├── Geocoding API (nominatim.org)   # Conversão endereço → lat/lng (GRÁTIS)
└── PostgreSQL PostGIS (opcional)   # Queries geográficas avançadas

Database:
├── latitude: DECIMAL(10, 8)        # Precisão de ~1cm
├── longitude: DECIMAL(11, 8)       # Precisão de ~1cm
└── geocoded_at: TIMESTAMP          # Cache de geocodificação
```

---

## 📊 Schema de Banco de Dados

### Migration: Adicionar Campos Geográficos

```sql
-- database/migrations/017_add_geolocation_to_clientes.sql

-- Adicionar campos de geolocalização à tabela clientes_fornecedores
ALTER TABLE clientes_fornecedores 
ADD COLUMN latitude DECIMAL(10, 8),
ADD COLUMN longitude DECIMAL(11, 8),
ADD COLUMN geocoded_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN geocoding_source VARCHAR(50) DEFAULT 'manual', -- 'manual', 'api', 'cep'
ADD COLUMN geocoding_precision VARCHAR(20) DEFAULT 'address'; -- 'exact', 'street', 'city', 'approximate'

-- Criar índice para queries geográficas eficientes
CREATE INDEX idx_clientes_lat_lng ON clientes_fornecedores (latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Criar índice para filtrar clientes geocodificados
CREATE INDEX idx_clientes_geocoded ON clientes_fornecedores (geocoded_at)
WHERE geocoded_at IS NOT NULL;

-- Comentários para documentação
COMMENT ON COLUMN clientes_fornecedores.latitude IS 'Latitude em decimal degrees (WGS84)';
COMMENT ON COLUMN clientes_fornecedores.longitude IS 'Longitude em decimal degrees (WGS84)';
COMMENT ON COLUMN clientes_fornecedores.geocoded_at IS 'Timestamp da última geocodificação bem-sucedida';
COMMENT ON COLUMN clientes_fornecedores.geocoding_source IS 'Origem da geocodificação (manual, api, cep)';
COMMENT ON COLUMN clientes_fornecedores.geocoding_precision IS 'Precisão da geocodificação (exact, street, city, approximate)';
```

### Atualização do Type Cliente

```typescript
// types/index.ts - Adicionar campos ao interface Cliente

export interface Cliente {
  id: number
  nome: string
  tipo: 'cliente' | 'fornecedor' | 'ambos'
  email?: string
  telefone?: string
  endereco?: string
  cidade?: string
  estado?: string
  cep?: string
  bairro?: string
  documento?: string
  inscricao_estadual?: string
  observacoes?: string
  vendedor_id?: number | null
  vendedor?: Vendedor | null
  ativo: boolean
  created_at: string
  updated_at: string
  
  // 🆕 NOVOS CAMPOS - Geolocalização
  latitude?: number | null
  longitude?: number | null
  geocoded_at?: string | null
  geocoding_source?: 'manual' | 'api' | 'cep'
  geocoding_precision?: 'exact' | 'street' | 'city' | 'approximate'
}
```

---

## 🔌 Backend: APIs e Serviços

### 1. Serviço de Geocodificação

```typescript
// services/geocoding.ts

import axios from 'axios'

export interface GeocodingResult {
  latitude: number
  longitude: number
  precision: 'exact' | 'street' | 'city' | 'approximate'
  source: 'nominatim' | 'viacep'
  display_name: string
}

export class GeocodingService {
  // Nominatim (OpenStreetMap) - GRÁTIS, mas rate limit 1 req/sec
  private static readonly NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
  
  /**
   * Geocodifica um endereço completo
   * Uso: quando cliente tem endereço, cidade e estado
   */
  static async geocodeAddress(
    endereco: string,
    cidade: string,
    estado: string,
    cep?: string
  ): Promise<GeocodingResult | null> {
    try {
      // Construir query de endereço completo
      const query = `${endereco}, ${cidade}, ${estado}, Brasil`
      
      const response = await axios.get(this.NOMINATIM_URL, {
        params: {
          q: query,
          format: 'json',
          limit: 1,
          addressdetails: 1,
          countrycodes: 'br',
        },
        headers: {
          'User-Agent': 'MeguisPet-GeoMap/1.0', // Obrigatório por Nominatim
        },
        timeout: 5000,
      })

      if (response.data && response.data.length > 0) {
        const result = response.data[0]
        
        // Determinar precisão baseado no tipo de resultado
        let precision: GeocodingResult['precision'] = 'approximate'
        if (result.class === 'building' || result.type === 'house') {
          precision = 'exact'
        } else if (result.class === 'highway' || result.type === 'road') {
          precision = 'street'
        } else if (result.class === 'place' && result.type === 'city') {
          precision = 'city'
        }

        return {
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon),
          precision,
          source: 'nominatim',
          display_name: result.display_name,
        }
      }

      return null
    } catch (error) {
      console.error('Erro ao geocodificar endereço:', error)
      return null
    }
  }

  /**
   * Geocodifica apenas por CEP
   * Uso: quando não temos endereço completo
   * Precisão menor (geralmente centroide do bairro)
   */
  static async geocodeByCEP(cep: string): Promise<GeocodingResult | null> {
    try {
      // ViaCEP retorna dados mas não tem lat/lng
      // Precisamos usar o endereço retornado e geocodificar
      const viaCepResponse = await axios.get(`https://viacep.com.br/ws/${cep}/json/`)
      
      if (viaCepResponse.data && !viaCepResponse.data.erro) {
        const { logradouro, localidade, uf } = viaCepResponse.data
        
        // Usar endereço do CEP para geocodificar
        const query = `${logradouro}, ${localidade}, ${uf}, Brasil`
        
        const nominatimResponse = await axios.get(this.NOMINATIM_URL, {
          params: {
            q: query,
            format: 'json',
            limit: 1,
            countrycodes: 'br',
          },
          headers: {
            'User-Agent': 'MeguisPet-GeoMap/1.0',
          },
          timeout: 5000,
        })

        if (nominatimResponse.data && nominatimResponse.data.length > 0) {
          const result = nominatimResponse.data[0]
          
          return {
            latitude: parseFloat(result.lat),
            longitude: parseFloat(result.lon),
            precision: 'street', // CEP geralmente dá precisão de rua
            source: 'viacep',
            display_name: result.display_name,
          }
        }
      }

      return null
    } catch (error) {
      console.error('Erro ao geocodificar por CEP:', error)
      return null
    }
  }

  /**
   * Geocodifica com fallback
   * Tenta endereço completo primeiro, depois CEP
   */
  static async geocodeWithFallback(cliente: {
    endereco?: string
    cidade?: string
    estado?: string
    cep?: string
  }): Promise<GeocodingResult | null> {
    // Tentar endereço completo primeiro
    if (cliente.endereco && cliente.cidade && cliente.estado) {
      const result = await this.geocodeAddress(
        cliente.endereco,
        cliente.cidade,
        cliente.estado,
        cliente.cep
      )
      
      if (result) return result
    }

    // Fallback: tentar apenas CEP
    if (cliente.cep) {
      return await this.geocodeByCEP(cliente.cep.replace(/\D/g, ''))
    }

    return null
  }

  /**
   * Rate limiter para respeitar limites do Nominatim (1 req/sec)
   */
  private static lastRequestTime = 0
  
  static async waitForRateLimit(): Promise<void> {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime
    const minInterval = 1000 // 1 segundo

    if (timeSinceLastRequest < minInterval) {
      await new Promise(resolve => setTimeout(resolve, minInterval - timeSinceLastRequest))
    }

    this.lastRequestTime = Date.now()
  }
}
```

### 2. API Endpoint: Obter Dados do Mapa

```typescript
// pages/api/clientes/map-data.ts

import type { NextApiRequest, NextApiResponse } from 'next'
import { createSupabaseServerClient } from '@/lib/supabase'
import { verifyAuth } from '@/lib/jwt-utils'

export interface ClienteMapMarker {
  id: number
  nome: string
  latitude: number
  longitude: number
  tipo: 'cliente' | 'fornecedor' | 'ambos'
  cidade?: string
  estado?: string
  vendedor_id?: number | null
  vendedor_nome?: string
  telefone?: string
  email?: string
  precision: string
}

export interface MapDataResponse {
  success: boolean
  data?: ClienteMapMarker[]
  stats?: {
    total_clientes: number
    clientes_geocodificados: number
    clientes_pendentes: number
    porcentagem_cobertura: number
  }
  message?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MapDataResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Método não permitido' })
  }

  try {
    // Verificar autenticação
    const { supabase, user } = await verifyAuth(req, res)
    if (!user) {
      return res.status(401).json({ success: false, message: 'Não autenticado' })
    }

    // Parâmetros de filtro
    const { 
      vendedor_id, 
      tipo, 
      estado,
      include_stats 
    } = req.query

    // Query base - apenas clientes com coordenadas
    let query = supabase
      .from('clientes_fornecedores')
      .select(`
        id,
        nome,
        latitude,
        longitude,
        tipo,
        cidade,
        estado,
        telefone,
        email,
        vendedor_id,
        geocoding_precision,
        vendedor:vendedor_id (
          id,
          nome
        )
      `)
      .eq('ativo', true)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)

    // Aplicar filtros
    if (vendedor_id) {
      query = query.eq('vendedor_id', vendedor_id)
    }

    if (tipo && tipo !== 'todos') {
      if (tipo === 'cliente') {
        query = query.in('tipo', ['cliente', 'ambos'])
      } else if (tipo === 'fornecedor') {
        query = query.in('tipo', ['fornecedor', 'ambos'])
      }
    }

    if (estado) {
      query = query.eq('estado', estado)
    }

    const { data: clientes, error } = await query

    if (error) {
      console.error('Erro ao buscar dados do mapa:', error)
      return res.status(500).json({ 
        success: false, 
        message: 'Erro ao buscar dados do mapa' 
      })
    }

    // Transformar dados para formato do mapa
    const markers: ClienteMapMarker[] = clientes.map(cliente => ({
      id: cliente.id,
      nome: cliente.nome,
      latitude: cliente.latitude!,
      longitude: cliente.longitude!,
      tipo: cliente.tipo,
      cidade: cliente.cidade,
      estado: cliente.estado,
      vendedor_id: cliente.vendedor_id,
      vendedor_nome: cliente.vendedor?.nome,
      telefone: cliente.telefone,
      email: cliente.email,
      precision: cliente.geocoding_precision || 'approximate',
    }))

    // Calcular estatísticas se solicitado
    let stats = undefined
    if (include_stats === 'true') {
      const { count: totalClientes } = await supabase
        .from('clientes_fornecedores')
        .select('*', { count: 'exact', head: true })
        .eq('ativo', true)

      const { count: clientesGeocoded } = await supabase
        .from('clientes_fornecedores')
        .select('*', { count: 'exact', head: true })
        .eq('ativo', true)
        .not('latitude', 'is', null)

      stats = {
        total_clientes: totalClientes || 0,
        clientes_geocodificados: clientesGeocoded || 0,
        clientes_pendentes: (totalClientes || 0) - (clientesGeocoded || 0),
        porcentagem_cobertura: totalClientes ? 
          Math.round((clientesGeocoded! / totalClientes) * 100) : 0,
      }
    }

    return res.status(200).json({
      success: true,
      data: markers,
      stats,
    })

  } catch (error) {
    console.error('Erro no endpoint map-data:', error)
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
    })
  }
}
```

### 3. API Endpoint: Geocodificar Clientes

```typescript
// pages/api/clientes/geocode.ts

import type { NextApiRequest, NextApiResponse } from 'next'
import { createSupabaseServerClient } from '@/lib/supabase'
import { verifyAuth } from '@/lib/jwt-utils'
import { GeocodingService } from '@/services/geocoding'

interface GeocodeResponse {
  success: boolean
  data?: {
    processed: number
    successful: number
    failed: number
    details: Array<{
      cliente_id: number
      cliente_nome: string
      status: 'success' | 'failed' | 'skipped'
      message?: string
    }>
  }
  message?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GeocodeResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método não permitido' })
  }

  try {
    // Verificar autenticação e permissões
    const { supabase, user } = await verifyAuth(req, res)
    if (!user) {
      return res.status(401).json({ success: false, message: 'Não autenticado' })
    }

    // Parâmetros
    const { 
      cliente_ids,  // Array de IDs específicos (opcional)
      force,        // Forçar re-geocodificação mesmo se já tem coordenadas
      batch_size = 10  // Processar em lotes para não sobrecarregar
    } = req.body

    // Query para buscar clientes sem geocodificação
    let query = supabase
      .from('clientes_fornecedores')
      .select('id, nome, endereco, cidade, estado, cep, latitude, longitude')
      .eq('ativo', true)

    // Filtrar por IDs específicos se fornecido
    if (cliente_ids && Array.isArray(cliente_ids) && cliente_ids.length > 0) {
      query = query.in('id', cliente_ids)
    } else if (!force) {
      // Se não é força, buscar apenas sem coordenadas
      query = query.or('latitude.is.null,longitude.is.null')
    }

    // Limitar batch
    query = query.limit(batch_size)

    const { data: clientes, error } = await query

    if (error) {
      return res.status(500).json({ 
        success: false, 
        message: 'Erro ao buscar clientes' 
      })
    }

    if (!clientes || clientes.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          processed: 0,
          successful: 0,
          failed: 0,
          details: [],
        },
        message: 'Nenhum cliente para geocodificar',
      })
    }

    // Processar geocodificação
    let successful = 0
    let failed = 0
    const details: GeocodeResponse['data']['details'] = []

    for (const cliente of clientes) {
      try {
        // Respeitar rate limit (1 req/sec para Nominatim)
        await GeocodingService.waitForRateLimit()

        // Tentar geocodificar
        const result = await GeocodingService.geocodeWithFallback(cliente)

        if (result) {
          // Atualizar no banco
          const { error: updateError } = await supabase
            .from('clientes_fornecedores')
            .update({
              latitude: result.latitude,
              longitude: result.longitude,
              geocoded_at: new Date().toISOString(),
              geocoding_source: result.source,
              geocoding_precision: result.precision,
            })
            .eq('id', cliente.id)

          if (updateError) {
            throw updateError
          }

          successful++
          details.push({
            cliente_id: cliente.id,
            cliente_nome: cliente.nome,
            status: 'success',
            message: `Geocodificado com precisão ${result.precision}`,
          })
        } else {
          failed++
          details.push({
            cliente_id: cliente.id,
            cliente_nome: cliente.nome,
            status: 'failed',
            message: 'Não foi possível geocodificar o endereço',
          })
        }
      } catch (error) {
        failed++
        details.push({
          cliente_id: cliente.id,
          cliente_nome: cliente.nome,
          status: 'failed',
          message: `Erro: ${error.message}`,
        })
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        processed: clientes.length,
        successful,
        failed,
        details,
      },
    })

  } catch (error) {
    console.error('Erro no endpoint geocode:', error)
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
    })
  }
}
```

---

## 🎨 Frontend: Componentes

### 1. Componente Principal do Mapa

```typescript
// components/maps/ClientesMap.tsx

import React, { useEffect, useState, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import { HeatmapLayer } from 'react-leaflet-heatmap-layer-v3'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.heat'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Loader2, 
  MapIcon, 
  Layers, 
  User,
  Phone,
  Mail,
  MapPin
} from 'lucide-react'
import type { ClienteMapMarker } from '@/pages/api/clientes/map-data'

// Fix do ícone padrão do Leaflet (bug conhecido)
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

const DefaultIcon = L.icon({
  iconUrl: icon.src,
  shadowUrl: iconShadow.src,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

L.Marker.prototype.options.icon = DefaultIcon

interface ClientesMapProps {
  markers: ClienteMapMarker[]
  loading?: boolean
  onMarkerClick?: (cliente: ClienteMapMarker) => void
  initialCenter?: [number, number]
  initialZoom?: number
  showHeatmap?: boolean
  showClusters?: boolean
}

export default function ClientesMap({
  markers,
  loading = false,
  onMarkerClick,
  initialCenter = [-15.7942, -47.8822], // Centro do Brasil (Brasília)
  initialZoom = 5,
  showHeatmap = false,
  showClusters = true,
}: ClientesMapProps) {
  const [viewMode, setViewMode] = useState<'markers' | 'heatmap'>('markers')

  // Preparar dados para heatmap
  const heatmapPoints = useMemo(() => {
    return markers.map(marker => ({
      lat: marker.latitude,
      lng: marker.longitude,
      intensity: 1, // Pode ser ajustado baseado em métricas (ex: valor de vendas)
    }))
  }, [markers])

  // Calcular centro baseado nos marcadores
  const mapCenter = useMemo(() => {
    if (markers.length === 0) return initialCenter

    const avgLat = markers.reduce((sum, m) => sum + m.latitude, 0) / markers.length
    const avgLng = markers.reduce((sum, m) => sum + m.longitude, 0) / markers.length

    return [avgLat, avgLng] as [number, number]
  }, [markers, initialCenter])

  // Criar ícones customizados por tipo
  const createCustomIcon = (tipo: ClienteMapMarker['tipo']) => {
    const color = tipo === 'cliente' ? '#10b981' : tipo === 'fornecedor' ? '#3b82f6' : '#8b5cf6'
    
    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          background-color: ${color};
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        "></div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <Loader2 className="h-8 w-8 animate-spin text-meguispet" />
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Controles do Mapa */}
      <div className="absolute top-4 right-4 z-[1000] space-y-2">
        <Card className="p-2">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={viewMode === 'markers' ? 'default' : 'outline'}
              onClick={() => setViewMode('markers')}
            >
              <MapPin className="h-4 w-4 mr-2" />
              Marcadores
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'heatmap' ? 'default' : 'outline'}
              onClick={() => setViewMode('heatmap')}
            >
              <Layers className="h-4 w-4 mr-2" />
              Heatmap
            </Button>
          </div>
        </Card>

        <Card className="p-3">
          <div className="text-sm space-y-1">
            <div className="font-semibold">Legenda</div>
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
        </Card>
      </div>

      {/* Mapa */}
      <MapContainer
        center={mapCenter}
        zoom={initialZoom}
        style={{ height: '600px', width: '100%', borderRadius: '0.5rem' }}
        className="z-0"
      >
        {/* Tiles do OpenStreetMap */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Modo Marcadores */}
        {viewMode === 'markers' && (
          showClusters ? (
            <MarkerClusterGroup>
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
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-500" />
                          <span>{marker.cidade}, {marker.estado}</span>
                        </div>
                        {marker.telefone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-gray-500" />
                            <span>{marker.telefone}</span>
                          </div>
                        )}
                        {marker.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-gray-500" />
                            <span>{marker.email}</span>
                          </div>
                        )}
                        {marker.vendedor_nome && (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-500" />
                            <span>Vendedor: {marker.vendedor_nome}</span>
                          </div>
                        )}
                        <div className="mt-2 pt-2 border-t">
                          <span className="text-xs text-gray-500">
                            Precisão: {marker.precision}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MarkerClusterGroup>
          ) : (
            markers.map(marker => (
              <Marker
                key={marker.id}
                position={[marker.latitude, marker.longitude]}
                icon={createCustomIcon(marker.tipo)}
                eventHandlers={{
                  click: () => onMarkerClick?.(marker),
                }}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-semibold">{marker.nome}</h3>
                    <p className="text-sm">{marker.cidade}, {marker.estado}</p>
                  </div>
                </Popup>
              </Marker>
            ))
          )
        )}

        {/* Modo Heatmap */}
        {viewMode === 'heatmap' && showHeatmap && (
          <HeatmapLayer
            points={heatmapPoints}
            longitudeExtractor={p => p.lng}
            latitudeExtractor={p => p.lat}
            intensityExtractor={p => p.intensity}
            radius={25}
            blur={15}
            max={1.0}
            gradient={{
              0.0: 'blue',
              0.5: 'lime',
              0.7: 'yellow',
              1.0: 'red',
            }}
          />
        )}
      </MapContainer>
    </div>
  )
}
```

### 2. Página do Mapa de Clientes

```typescript
// pages/mapa-clientes.tsx

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Map,
  MapPin,
  Filter,
  Download,
  RefreshCw,
  Users,
  TrendingUp,
  AlertCircle,
} from 'lucide-react'
import ClientesMap from '@/components/maps/ClientesMap'
import Toast from '@/components/ui/Toast'
import axios from 'axios'
import type { ClienteMapMarker } from '@/pages/api/clientes/map-data'

export default function MapaClientesPage() {
  const [markers, setMarkers] = useState<ClienteMapMarker[]>([])
  const [loading, setLoading] = useState(true)
  const [vendedorFiltro, setVendedorFiltro] = useState<string>('todos')
  const [estadoFiltro, setEstadoFiltro] = useState<string>('todos')
  const [tipoFiltro, setTipoFiltro] = useState<string>('todos')
  const [stats, setStats] = useState<any>(null)
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null)
  const [geocodingInProgress, setGeocodingInProgress] = useState(false)

  useEffect(() => {
    loadMapData()
  }, [vendedorFiltro, estadoFiltro, tipoFiltro])

  const loadMapData = async () => {
    try {
      setLoading(true)

      const params = new URLSearchParams({
        include_stats: 'true',
      })

      if (vendedorFiltro !== 'todos') {
        params.append('vendedor_id', vendedorFiltro)
      }

      if (estadoFiltro !== 'todos') {
        params.append('estado', estadoFiltro)
      }

      if (tipoFiltro !== 'todos') {
        params.append('tipo', tipoFiltro)
      }

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

  const handleGeocodeClientes = async () => {
    try {
      setGeocodingInProgress(true)
      setToast({
        message: 'Iniciando geocodificação de clientes...',
        type: 'info',
      })

      const response = await axios.post('/api/clientes/geocode', {
        batch_size: 10,
        force: false,
      })

      if (response.data.success) {
        const { successful, failed, processed } = response.data.data
        setToast({
          message: `Geocodificação concluída: ${successful} sucessos, ${failed} falhas de ${processed} processados`,
          type: 'success',
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
      setToast({
        message: 'Erro ao geocodificar clientes',
        type: 'error',
      })
    } finally {
      setGeocodingInProgress(false)
    }
  }

  const handleMarkerClick = (cliente: ClienteMapMarker) => {
    console.log('Cliente clicado:', cliente)
    // Pode abrir modal de detalhes do cliente aqui
  }

  const handleExportarMapa = () => {
    // Implementar exportação de dados do mapa (CSV, PDF, etc)
    setToast({
      message: 'Funcionalidade de exportação em desenvolvimento',
      type: 'info',
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Map className="h-8 w-8 text-meguispet" />
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

      {/* Filtros e Ações */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtros
              </CardTitle>
              <CardDescription>Filtre a visualização do mapa</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGeocodeClientes}
                disabled={geocodingInProgress}
              >
                {geocodingInProgress ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Geocodificando...
                  </>
                ) : (
                  <>
                    <MapPin className="mr-2 h-4 w-4" />
                    Geocodificar Pendentes
                  </>
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportarMapa}>
                <Download className="mr-2 h-4 w-4" />
                Exportar
              </Button>
              <Button variant="outline" size="sm" onClick={loadMapData}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Atualizar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium mb-2 block">Tipo</label>
              <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="cliente">Clientes</SelectItem>
                  <SelectItem value="fornecedor">Fornecedores</SelectItem>
                  <SelectItem value="ambos">Ambos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Estado</label>
              <Select value={estadoFiltro} onValueChange={setEstadoFiltro}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Estados</SelectItem>
                  <SelectItem value="SP">São Paulo</SelectItem>
                  <SelectItem value="RJ">Rio de Janeiro</SelectItem>
                  <SelectItem value="MG">Minas Gerais</SelectItem>
                  {/* Adicionar todos os estados */}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Vendedor</label>
              <Select value={vendedorFiltro} onValueChange={setVendedorFiltro}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o vendedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Vendedores</SelectItem>
                  {/* Carregar vendedores dinamicamente */}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mapa */}
      <Card>
        <CardContent className="p-0">
          <ClientesMap
            markers={markers}
            loading={loading}
            onMarkerClick={handleMarkerClick}
            showHeatmap={true}
            showClusters={true}
          />
        </CardContent>
      </Card>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}
```

---

## 📦 Instalação de Dependências

```bash
# Instalar bibliotecas de mapa
pnpm add leaflet@^1.9.4 react-leaflet@^4.2.1
pnpm add leaflet.heat@^0.2.0 react-leaflet-heatmap-layer-v3
pnpm add react-leaflet-cluster

# Instalar tipos TypeScript
pnpm add -D @types/leaflet @types/leaflet.heat

# Geocoding API (já incluído no Node.js via axios)
# Nominatim é serviço gratuito, sem necessidade de API key
```

### package.json - Adicionar Scripts

```json
{
  "scripts": {
    "geocode:clientes": "node scripts/geocode-all-clientes.js",
    "map:dev": "pnpm dev"
  }
}
```

---

## 🚀 Roteiro de Implementação

### Fase 1: Setup Database (1-2 horas)
1. ✅ Criar migration `017_add_geolocation_to_clientes.sql`
2. ✅ Executar migration no Supabase Dashboard
3. ✅ Atualizar type `Cliente` em `types/index.ts`
4. ✅ Testar inserção manual de coordenadas

### Fase 2: Backend APIs (3-4 horas)
5. ✅ Criar serviço `services/geocoding.ts`
6. ✅ Implementar endpoint `/api/clientes/map-data.ts`
7. ✅ Implementar endpoint `/api/clientes/geocode.ts`
8. ✅ Testar APIs com Postman/Insomnia

### Fase 3: Frontend Mapa (4-5 horas)
9. ✅ Instalar dependências do Leaflet
10. ✅ Criar componente `ClientesMap.tsx`
11. ✅ Implementar marcadores básicos
12. ✅ Adicionar popup com informações
13. ✅ Implementar clustering
14. ✅ Adicionar modo heatmap

### Fase 4: Página do Mapa (2-3 horas)
15. ✅ Criar página `pages/mapa-clientes.tsx`
16. ✅ Implementar estatísticas
17. ✅ Adicionar filtros (vendedor, estado, tipo)
18. ✅ Integrar com componente do mapa
19. ✅ Implementar geocodificação em batch

### Fase 5: Integração e Polimento (2-3 horas)
20. ✅ Adicionar link no menu lateral (Sidebar)
21. ✅ Criar script de geocodificação em massa
22. ✅ Adicionar loading states e error handling
23. ✅ Testar responsividade mobile
24. ✅ Adicionar ícones customizados por tipo de cliente

### Fase 6: Testes e Documentação (1-2 horas)
25. ✅ Testar com dados reais
26. ✅ Otimizar performance (lazy loading, memoização)
27. ✅ Documentar uso no README
28. ✅ Atualizar ARQUITETURA.md

---

## 🔒 Considerações de Segurança

### Rate Limiting
- **Nominatim:** Máximo 1 requisição por segundo
- Implementar fila de geocodificação para processar em lote
- Adicionar retry logic com exponential backoff

### Privacidade de Dados
- Não expor endereços completos no tooltip do mapa
- Apenas mostrar cidade/estado para usuários sem permissão
- Coordenadas precisas apenas para admin/gerente

### Performance
- Cache de coordenadas no banco (campo `geocoded_at`)
- Não re-geocodificar se já existe coordenada válida
- Implementar paginação/limite no carregamento de marcadores
- Usar clustering para grandes volumes (>1000 marcadores)

---

## 📊 Métricas de Sucesso

### KPIs
- **Cobertura de Geocodificação:** >80% dos clientes ativos
- **Tempo de Carregamento:** <3 segundos para 1000 marcadores
- **Taxa de Erro de Geocodificação:** <10%
- **Adoção pelos Usuários:** >50% acessam o mapa mensalmente

### Monitoramento
- Logs de erros de geocodificação
- Análise de clientes sem coordenadas
- Métricas de uso da página do mapa
- Feedback de usuários sobre precisão

---

## 🎯 Próximos Passos (Futuro)

### Melhorias Futuras
1. **Análise Geoespacial Avançada**
   - Raio de atendimento por vendedor
   - Análise de densidade por região
   - Identificação de regiões desatendidas

2. **Integração com Rotas**
   - Calcular rotas otimizadas para visitas
   - Integração com Google Directions API
   - Planejamento de agenda de vendedores

3. **Territórios de Vendedores**
   - Desenhar polígonos de território no mapa
   - Atribuição automática de clientes por região
   - Alertas de conflito de território

4. **Dashboard Geográfico**
   - Métricas de vendas por região
   - Heatmap de receita
   - Comparação temporal (mês a mês)

5. **Export Avançado**
   - Exportar mapa como imagem (PNG/PDF)
   - Relatório geográfico em Excel
   - Integração com apresentações (PowerPoint)

---

## 📚 Referências

### Documentação
- [Leaflet.js Documentation](https://leafletjs.com/)
- [React-Leaflet Documentation](https://react-leaflet.js.org/)
- [Nominatim API Documentation](https://nominatim.org/release-docs/latest/api/Search/)
- [OpenStreetMap Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/)

### Tutoriais
- [React-Leaflet Tutorial](https://react-leaflet.js.org/docs/start-introduction/)
- [Leaflet Heatmap Plugin](https://github.com/Leaflet/Leaflet.heat)
- [Marker Clustering in Leaflet](https://github.com/Leaflet/Leaflet.markercluster)

---

## ✅ Checklist de Aceitação

Antes de considerar a feature completa, verificar:

- [ ] Migration executada com sucesso no Supabase
- [ ] Campos de geolocalização adicionados ao type Cliente
- [ ] Serviço de geocodificação funcional e testado
- [ ] Endpoint `/api/clientes/map-data` retornando dados corretos
- [ ] Endpoint `/api/clientes/geocode` processando clientes
- [ ] Mapa renderizando marcadores corretamente
- [ ] Clustering funcionando para muitos marcadores
- [ ] Modo heatmap exibindo densidade
- [ ] Filtros por vendedor/estado/tipo funcionando
- [ ] Popup com informações do cliente completo
- [ ] Estatísticas de cobertura sendo calculadas
- [ ] Link no menu de navegação adicionado
- [ ] Responsividade mobile testada e funcional
- [ ] Loading states e error handling implementados
- [ ] Performance aceitável (<3s para 1000 marcadores)
- [ ] Documentação atualizada (README + ARQUITETURA.md)
- [ ] Testes realizados com dados reais
- [ ] Aprovação do usuário/stakeholder

---

## 🎉 Conclusão

Este plano detalha uma implementação completa e escalável de um sistema de mapa interativo de clientes para o MeguisPet. A solução utiliza tecnologias open source (Leaflet), serviços gratuitos de geocodificação (Nominatim), e se integra perfeitamente com a arquitetura existente do sistema (Next.js + Supabase).

**Tempo Estimado Total:** 15-20 horas de desenvolvimento

**Custo:** $0 (todas as tecnologias são gratuitas)

**Impacto:** Alto - Nova funcionalidade de análise geográfica que agrega valor significativo ao negócio

---

**Próxima Ação:** Revisar este plano com o stakeholder e iniciar implementação pela Fase 1 (Setup Database).
