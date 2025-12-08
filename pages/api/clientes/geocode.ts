import type { NextApiResponse } from 'next'
import { withSupabaseAuth, AuthenticatedRequest } from '@/lib/supabase-middleware'
import { GeocodingService } from '@/services/geocoding'

interface GeocodeResponse {
  success: boolean
  data?: {
    processed: number
    successful: number
    failed: number
    skipped: number
    details: Array<{
      cliente_id: number
      cliente_nome: string
      status: 'success' | 'failed' | 'skipped'
      message?: string
    }>
  }
  message?: string
}

/**
 * Batch geocoding endpoint for existing clients
 * 
 * @endpoint POST /api/clientes/geocode
 * @body {
 *   cliente_ids?: number[] - Optional array of specific client IDs to geocode
 *   force?: boolean - Force re-geocoding even if coordinates exist (default: false)
 *   batch_size?: number - Maximum number of clients to process (default: 10)
 * }
 * @returns {GeocodeResponse} - Results with processed count and details
 */
const handler = async (
  req: AuthenticatedRequest,
  res: NextApiResponse<GeocodeResponse>
) => {
  const isDev = process.env.NODE_ENV === 'development'
  
  // Log all requests to help debug
  console.log('[Geocode] Request received:', {
    method: req.method,
    hasBody: !!req.body,
    env: process.env.NODE_ENV
  })
  
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método não permitido' })
  }

  try {
    const supabase = req.supabaseClient

    // Parâmetros
    const { 
      cliente_ids,  // Array de IDs específicos (opcional)
      force = false,        // Forçar re-geocodificação mesmo se já tem coordenadas
      batch_size = 10  // Processar em lotes para não sobrecarregar
    } = req.body || {}

    console.log('[Geocode] Parameters:', { 
      cliente_ids, 
      force, 
      batch_size,
      has_body: !!req.body 
    })

    // First, check if the geolocation columns exist by trying a simple query
    const { error: checkError } = await supabase
      .from('clientes_fornecedores')
      .select('latitude, longitude')
      .limit(1)

    if (checkError) {
      console.error('[Geocode] Database schema check failed:', checkError)
      
      // Check if it's a column not found error
      if (checkError.message?.includes('column') || checkError.code === '42703') {
        return res.status(500).json({
          success: false,
          message: 'A migração do banco de dados ainda não foi aplicada. Execute a migration 018_add_geolocation_to_clientes.sql no Supabase primeiro.'
        })
      }
      
      return res.status(500).json({
        success: false,
        message: isDev ? `Erro ao verificar schema: ${checkError.message}` : 'Erro ao acessar banco de dados'
      })
    }

    console.log('[Geocode] Database schema check passed')

    // Query para buscar clientes sem geocodificação ou com IDs específicos
    let query = supabase
      .from('clientes_fornecedores')
      .select('id, nome, endereco, cidade, estado, cep, bairro, latitude, longitude')
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
      console.error('[Geocode] Error fetching clients:', error)
      return res.status(500).json({ 
        success: false, 
        message: isDev ? 'Erro ao buscar clientes: ' + error.message : 'Erro ao buscar clientes'
      })
    }

    console.log('[Geocode] Found clients:', clientes?.length || 0)

    if (!clientes || clientes.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          processed: 0,
          successful: 0,
          failed: 0,
          skipped: 0,
          details: [],
        },
        message: 'Nenhum cliente para geocodificar',
      })
    }

    // Processar geocodificação
    let successful = 0
    let failed = 0
    let skipped = 0
    const details: Array<{
      cliente_id: number
      cliente_nome: string
      status: 'success' | 'failed' | 'skipped'
      message?: string
    }> = []

    for (const cliente of clientes) {
      try {
        console.log('[Geocode] Processing client:', cliente.id, cliente.nome)
        
        // Pular se não tem CEP
        if (!cliente.cep) {
          console.log('[Geocode] Skipping - no CEP:', cliente.id)
          skipped++
          details.push({
            cliente_id: cliente.id,
            cliente_nome: cliente.nome,
            status: 'skipped',
            message: 'CEP não informado',
          })
          continue
        }

        // Respeitar rate limit (1 req/sec para Nominatim) - apenas quando vai fazer chamada
        await GeocodingService.waitForRateLimit()

        // Tentar geocodificar
        console.log('[Geocode] Calling geocoding service for:', cliente.id)
        const result = await GeocodingService.geocodeWithFallback(cliente)
        console.log('[Geocode] Geocoding result:', result ? 'success' : 'failed')

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
            console.error('[Geocode] Update error:', updateError)
            throw updateError
          }

          successful++
          details.push({
            cliente_id: cliente.id,
            cliente_nome: cliente.nome,
            status: 'success',
            message: `Geocodificado com precisão ${result.precision}`,
          })
          console.log('[Geocode] Successfully geocoded:', cliente.id)
        } else {
          console.log('[Geocode] Geocoding returned null:', cliente.id)
          failed++
          details.push({
            cliente_id: cliente.id,
            cliente_nome: cliente.nome,
            status: 'failed',
            message: 'Não foi possível geocodificar o endereço',
          })
        }
      } catch (error) {
        console.error(`[Geocode] Error processing client ${cliente.id}:`, error)
        failed++
        details.push({
          cliente_id: cliente.id,
          cliente_nome: cliente.nome,
          status: 'failed',
          message: 'Erro ao processar cliente',
        })
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        processed: clientes.length,
        successful,
        failed,
        skipped,
        details,
      },
    })

  } catch (error) {
    console.error('[Geocode] Unhandled error in endpoint:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('[Geocode] Error details:', errorMessage)
    
    return res.status(500).json({
      success: false,
      message: isDev ? errorMessage : 'Erro interno do servidor',
    })
  }
}

export default withSupabaseAuth(handler)
