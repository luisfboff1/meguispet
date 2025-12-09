import type { NextApiResponse } from 'next'
import { withSupabaseAuth, AuthenticatedRequest } from '@/lib/supabase-middleware'
import { GeocodingService } from '@/services/geocoding'

interface GeocodeRequest {
  cliente_ids?: number[]
  force?: boolean
  batch_size?: number
}

interface GeocodeResponse {
  success: boolean
  data?: {
    processed: number
    successful: number
    failed: number
    skipped: number
    errors: Array<{ id: number; error: string }>
  }
  message?: string
}

const handler = async (
  req: AuthenticatedRequest,
  res: NextApiResponse<GeocodeResponse>
) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método não permitido' })
  }

  try {
    const supabase = req.supabaseClient
    const {
      cliente_ids,
      batch_size = 20,
      force = false,
    } = (req.body || {}) as GeocodeRequest

    const limit = Math.min(batch_size, 100)

    // Build query
    let query = supabase
      .from('clientes_fornecedores')
      .select('id, nome, cep, latitude, longitude')
      .eq('ativo', true)
      .not('cep', 'is', null)

    if (!force) {
      query = query.is('latitude', null)
    }

    if (cliente_ids && cliente_ids.length > 0) {
      query = query.in('id', cliente_ids)
    }

    query = query.limit(limit)

    const { data: clientes, error } = await query

    if (error) {
      // Gracefully handle missing columns
      if (error.code === '42703') {
        return res.status(500).json({
          success: false,
          message: 'Execute a migration 018_add_geolocation_to_clientes.sql primeiro'
        })
      }
      
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
          errors: [],
        },
        message: 'Nenhum cliente encontrado para geocodificar'
      })
    }

    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      errors: [] as Array<{ id: number; error: string }>
    }

    for (const cliente of clientes) {
      try {
        if (!cliente.cep) {
          results.skipped++
          continue
        }

        const result = await GeocodingService.geocodeFromCEP(cliente.cep)

        if (result && result.latitude && result.longitude) {
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
            results.failed++
            results.errors.push({ id: cliente.id, error: 'Erro ao salvar' })
          } else {
            results.successful++
          }
        } else {
          results.failed++
          results.errors.push({ id: cliente.id, error: 'Não foi possível geocodificar' })
        }

        results.processed++

        // Rate limit: 1 req/sec
        if (results.processed < clientes.length) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }

      } catch (error) {
        results.failed++
        results.errors.push({ id: cliente.id, error: 'Erro ao processar' })
        results.processed++
      }
    }

    return res.status(200).json({
      success: true,
      data: results,
      message: `Processados ${results.processed} clientes`
    })

  } catch (error) {
    console.error('[Geocode] Error:', error)
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Erro interno'
    })
  }
}

export default withSupabaseAuth(handler)
