import type { NextApiResponse } from 'next'
import { withSupabaseAuth, AuthenticatedRequest } from '@/lib/supabase-middleware'

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

const handler = async (
  req: AuthenticatedRequest,
  res: NextApiResponse<MapDataResponse>
) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Método não permitido' })
  }

  try {
    const supabase = req.supabaseClient

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
        vendedor:vendedores (
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
      // If columns don't exist, return empty data instead of error
      if (error.code === '42703' || error.message?.includes('column')) {
        return res.status(200).json({
          success: true,
          data: [],
          stats: include_stats === 'true' ? {
            total_clientes: 0,
            clientes_geocodificados: 0,
            clientes_pendentes: 0,
            porcentagem_cobertura: 0,
          } : undefined,
        })
      }
      
      console.error('[MapData] Error fetching clients:', error)
      return res.status(500).json({ 
        success: false, 
        message: 'Erro ao buscar dados do mapa'
      })
    }

    // Transformar dados para formato do mapa
    const markers: ClienteMapMarker[] = (clientes || []).map(cliente => {
      // Handle vendedor relation properly
      const vendedor = Array.isArray(cliente.vendedor) 
        ? cliente.vendedor[0] 
        : cliente.vendedor
      
      return {
        id: cliente.id,
        nome: cliente.nome,
        latitude: cliente.latitude!,
        longitude: cliente.longitude!,
        tipo: cliente.tipo,
        cidade: cliente.cidade,
        estado: cliente.estado,
        vendedor_id: cliente.vendedor_id,
        vendedor_nome: vendedor?.nome,
        telefone: cliente.telefone,
        email: cliente.email,
        precision: cliente.geocoding_precision || 'approximate',
      }
    })

    // Calcular estatísticas se solicitado
    let stats = undefined
    if (include_stats === 'true') {
      try {
        const { count: totalClientes } = await supabase
          .from('clientes_fornecedores')
          .select('*', { count: 'exact', head: true })
          .eq('ativo', true)

        const { count: clientesGeocoded } = await supabase
          .from('clientes_fornecedores')
          .select('*', { count: 'exact', head: true })
          .eq('ativo', true)
          .not('latitude', 'is', null)

        const total = totalClientes || 0
        const geocoded = clientesGeocoded || 0

        stats = {
          total_clientes: total,
          clientes_geocodificados: geocoded,
          clientes_pendentes: total - geocoded,
          porcentagem_cobertura: total > 0 ? Math.round((geocoded / total) * 100) : 0,
        }
      } catch (statsError) {
        // If stats fail (e.g., missing columns), just skip them
        stats = undefined
      }
    }

    return res.status(200).json({
      success: true,
      data: markers,
      stats,
    })

  } catch (error) {
    console.error('[MapData] Unhandled error:', error)
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
    })
  }
}

export default withSupabaseAuth(handler)
