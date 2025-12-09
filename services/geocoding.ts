/**
 * Geocoding Service
 * Combines BrasilAPI (for CEP validation) and Nominatim (for lat/lng lookup)
 */

import axios from 'axios'

export interface GeocodingResult {
  latitude: number
  longitude: number
  precision: 'exact' | 'street' | 'city' | 'approximate'
  source: 'nominatim' | 'brasilapi'
  display_name: string
}

export interface BrasilAPIResponse {
  cep: string
  state: string
  city: string
  neighborhood: string
  street: string
  service: string
}

export class GeocodingService {
  // Nominatim (OpenStreetMap) - Free, but rate limit 1 req/sec
  private static readonly NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
  
  // BrasilAPI - Free CEP API
  private static readonly BRASILAPI_URL = 'https://brasilapi.com.br/api/cep/v1'

  /**
   * Geocode using address components from BrasilAPI CEP lookup + Nominatim
   */
  static async geocodeFromCEP(cep: string): Promise<GeocodingResult | null> {
    try {
      // First, get address from BrasilAPI
      const cleanCep = cep.replace(/\D/g, '')
      console.log(`[Geocoding] Buscando CEP ${cleanCep} no BrasilAPI...`)

      const brasilApiResponse = await axios.get<BrasilAPIResponse>(
        `${this.BRASILAPI_URL}/${cleanCep}`,
        { timeout: 10000 }  // Increased from 5s to 10s
      )

      if (!brasilApiResponse.data) {
        console.error(`[Geocoding] BrasilAPI não retornou dados para CEP ${cleanCep}`)
        return null
      }

      const { street, neighborhood, city, state } = brasilApiResponse.data
      console.log(`[Geocoding] Endereço encontrado: ${street}, ${neighborhood}, ${city}/${state}`)

      // Build query for Nominatim
      const addressParts = [street, neighborhood, city, state, 'Brasil'].filter(Boolean)
      const query = addressParts.join(', ')
      console.log(`[Geocoding] Buscando no Nominatim: "${query}"`)

      // Wait for rate limit
      await this.waitForRateLimit()

      // Get coordinates from Nominatim
      const nominatimResponse = await axios.get(this.NOMINATIM_URL, {
        params: {
          q: query,
          format: 'json',
          limit: 1,
          addressdetails: 1,
          countrycodes: 'br',
        },
        headers: {
          'User-Agent': 'MeguisPet-App/1.0',
        },
        timeout: 15000,  // Increased from 5s to 15s for public API
      })

      console.log(`[Geocoding] Nominatim retornou ${nominatimResponse.data?.length || 0} resultado(s)`)

      if (nominatimResponse.data && nominatimResponse.data.length > 0) {
        const result = nominatimResponse.data[0]
        
        // Validate coordinates
        const lat = parseFloat(result.lat)
        const lon = parseFloat(result.lon)
        
        if (isNaN(lat) || isNaN(lon)) {
          console.error('Invalid coordinates received from Nominatim')
          return null
        }
        
        if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
          console.error('Coordinates out of valid range')
          return null
        }
        
        // Determine precision based on result type
        let precision: GeocodingResult['precision'] = 'approximate'
        if (result.class === 'building' || result.type === 'house') {
          precision = 'exact'
        } else if (result.class === 'highway' || result.type === 'road') {
          precision = 'street'
        } else if (result.class === 'place' && result.type === 'city') {
          precision = 'city'
        }

        return {
          latitude: lat,
          longitude: lon,
          precision,
          source: 'brasilapi',
          display_name: result.display_name,
        }
      }

      // If full address not found, try just city + state (fallback)
      console.log(`[Geocoding] Endereço completo não encontrado, tentando apenas cidade...`)
      const cityQuery = `${city}, ${state}, Brasil`

      await this.waitForRateLimit()

      const cityResponse = await axios.get(this.NOMINATIM_URL, {
        params: {
          q: cityQuery,
          format: 'json',
          limit: 1,
          addressdetails: 1,
          countrycodes: 'br',
        },
        headers: {
          'User-Agent': 'MeguisPet-App/1.0',
        },
        timeout: 15000,
      })

      if (cityResponse.data && cityResponse.data.length > 0) {
        const result = cityResponse.data[0]
        const lat = parseFloat(result.lat)
        const lon = parseFloat(result.lon)

        if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
          console.log(`[Geocoding] ✅ Coordenadas da cidade encontradas: ${lat}, ${lon}`)
          return {
            latitude: lat,
            longitude: lon,
            precision: 'city',
            source: 'brasilapi',
            display_name: result.display_name,
          }
        }
      }

      console.error(`[Geocoding] ❌ Nenhuma coordenada encontrada para ${city}/${state}`)
      return null
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          console.error('Error geocoding from CEP: Timeout exceeded')
        } else if (error.response) {
          console.error('Error geocoding from CEP: API error', error.response.status)
        } else {
          console.error('Error geocoding from CEP: Network error')
        }
      } else {
        console.error('Error geocoding from CEP:', error)
      }
      return null
    }
  }

  /**
   * Geocode using full address
   */
  static async geocodeAddress(
    endereco: string,
    cidade: string,
    estado: string,
    cep?: string
  ): Promise<GeocodingResult | null> {
    try {
      // Build query
      const addressParts = [endereco, cidade, estado, 'Brasil'].filter(Boolean)
      const query = addressParts.join(', ')

      // Wait for rate limit
      await this.waitForRateLimit()

      const response = await axios.get(this.NOMINATIM_URL, {
        params: {
          q: query,
          format: 'json',
          limit: 1,
          addressdetails: 1,
          countrycodes: 'br',
        },
        headers: {
          'User-Agent': 'MeguisPet-App/1.0',
        },
        timeout: 15000,  // Increased from 5s to 15s for public API
      })

      if (response.data && response.data.length > 0) {
        const result = response.data[0]
        
        // Validate coordinates
        const lat = parseFloat(result.lat)
        const lon = parseFloat(result.lon)
        
        if (isNaN(lat) || isNaN(lon)) {
          console.error('Invalid coordinates received from Nominatim')
          return null
        }
        
        if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
          console.error('Coordinates out of valid range')
          return null
        }
        
        // Determine precision
        let precision: GeocodingResult['precision'] = 'approximate'
        if (result.class === 'building' || result.type === 'house') {
          precision = 'exact'
        } else if (result.class === 'highway' || result.type === 'road') {
          precision = 'street'
        } else if (result.class === 'place' && result.type === 'city') {
          precision = 'city'
        }

        return {
          latitude: lat,
          longitude: lon,
          precision,
          source: 'nominatim',
          display_name: result.display_name,
        }
      }

      return null
    } catch (error) {
      console.error('Error geocoding address:', error)
      return null
    }
  }

  /**
   * Geocode with fallback strategy
   * 1. Try CEP first (most reliable for Brazil)
   * 2. Fallback to full address if CEP fails
   */
  static async geocodeWithFallback(data: {
    endereco?: string
    cidade?: string
    estado?: string
    cep?: string
  }): Promise<GeocodingResult | null> {
    // Try CEP first (more reliable for Brazil)
    if (data.cep) {
      const result = await this.geocodeFromCEP(data.cep)
      if (result) return result
    }

    // Fallback to address
    if (data.endereco && data.cidade && data.estado) {
      return await this.geocodeAddress(
        data.endereco,
        data.cidade,
        data.estado,
        data.cep
      )
    }

    return null
  }

  /**
   * Rate limiter for Nominatim (1 req/sec)
   */
  private static lastRequestTime = 0
  
  static async waitForRateLimit(): Promise<void> {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime
    const minInterval = 1000 // 1 second

    if (timeSinceLastRequest < minInterval) {
      await new Promise(resolve => 
        setTimeout(resolve, minInterval - timeSinceLastRequest)
      )
    }

    this.lastRequestTime = Date.now()
  }
}
