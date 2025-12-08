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
    } = req.body

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
      console.error('Erro ao buscar clientes:', error)
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
        // Pular se não tem CEP
        if (!cliente.cep) {
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
        console.error(`Erro ao geocodificar cliente ${cliente.id}:`, error)
        failed++
        details.push({
          cliente_id: cliente.id,
          cliente_nome: cliente.nome,
          status: 'failed',
          message: error instanceof Error ? error.message : 'Erro desconhecido',
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
    console.error('Erro no endpoint geocode:', error)
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
    })
  }
}

export default withSupabaseAuth(handler)
