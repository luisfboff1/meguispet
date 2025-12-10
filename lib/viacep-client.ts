/**
 * ViaCEP Client
 *
 * Cliente para API ViaCEP (https://viacep.com.br) com cache em memória.
 * Suporta busca de CEP por cidade e estado.
 *
 * @module lib/viacep-client
 */

/**
 * Resultado retornado pela API ViaCEP
 */
export interface ViaCEPResult {
  cep: string
  logradouro: string
  complemento: string
  bairro: string
  localidade: string
  uf: string
  ibge: string
  gia?: string
  ddd: string
  siafi?: string
  erro?: boolean
}

/**
 * Resultado processado com informações adicionais
 */
export interface CEPInfo {
  cep: string
  logradouro: string
  bairro: string
  cidade: string
  uf: string
  endereco: string // Endereço completo formatado
  aproximado: boolean // Se é CEP aproximado (centro da cidade)
  ddd: string
}

/**
 * Cache em memória para armazenar resultados de buscas
 * Chave: `${uf}-${cidade}` → Array<ViaCEPResult>
 */
const cepCache = new Map<string, ViaCEPResult[]>()

/**
 * TTL do cache em milissegundos (30 minutos)
 */
const CACHE_TTL = 30 * 60 * 1000

/**
 * Timestamp da última limpeza do cache
 */
let lastCacheCleanup = Date.now()

/**
 * Normaliza nome da cidade para busca
 * Remove acentos e caracteres especiais
 *
 * @param cidade - Nome da cidade
 * @returns Cidade normalizada
 *
 * @example
 * ```typescript
 * normalizarCidade("São Paulo")      // "Sao Paulo"
 * normalizarCidade("CAXIAS DO SUL")  // "Caxias Do Sul"
 * ```
 */
export function normalizarCidade(cidade: string): string {
  return cidade
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .split(' ')
    .map(palavra =>
      palavra.charAt(0).toUpperCase() +
      palavra.slice(1).toLowerCase()
    )
    .join(' ')
    .trim()
}

/**
 * Gera chave para o cache
 *
 * @param uf - Sigla do estado
 * @param cidade - Nome da cidade
 * @returns Chave do cache
 */
function gerarChaveCache(uf: string, cidade: string): string {
  return `${uf.toUpperCase()}-${normalizarCidade(cidade)}`
}

/**
 * Limpa cache expirado (mais antigo que CACHE_TTL)
 */
function limparCacheExpirado(): void {
  const agora = Date.now()

  // Limpar apenas uma vez a cada 10 minutos
  if (agora - lastCacheCleanup < 10 * 60 * 1000) {
    return
  }

  // Limpar todo o cache se passou do TTL
  if (agora - lastCacheCleanup > CACHE_TTL) {
    cepCache.clear()
    lastCacheCleanup = agora
  }
}

/**
 * Busca CEP pelo endereço (cidade + UF)
 * Retorna o primeiro resultado (geralmente centro da cidade)
 *
 * @param uf - Sigla do estado (ex: "RS", "SP")
 * @param cidade - Nome da cidade (ex: "Caxias do Sul")
 * @param logradouro - Logradouro opcional para busca mais específica (padrão: "Centro")
 * @returns Informações do CEP ou null se não encontrado
 *
 * @example
 * ```typescript
 * const cep = await buscarCEPPorCidade("RS", "Caxias do Sul")
 * // {
 * //   cep: "95020-000",
 * //   endereco: "Rua Sinimbu, Centro - Caxias do Sul/RS",
 * //   aproximado: true,
 * //   ...
 * // }
 * ```
 */
export async function buscarCEPPorCidade(
  uf: string,
  cidade: string,
  logradouro: string = 'Centro'
): Promise<CEPInfo | null> {
  try {
    // Limpar cache expirado antes de buscar
    limparCacheExpirado()

    // Normalizar parâmetros
    uf = uf.toUpperCase()
    const cidadeNormalizada = normalizarCidade(cidade)
    const chaveCache = gerarChaveCache(uf, cidadeNormalizada)

    // Verificar cache
    if (cepCache.has(chaveCache)) {
      const resultados = cepCache.get(chaveCache)!
      if (resultados.length > 0) {
        return processarResultado(resultados[0], true)
      }
    }

    // Fazer requisição à API
    const cidadeEncoded = encodeURIComponent(cidadeNormalizada)
    const logradouroEncoded = encodeURIComponent(logradouro)
    const url = `https://viacep.com.br/ws/${uf}/${cidadeEncoded}/${logradouroEncoded}/json/`

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MeguisPet/1.0',
      },
      signal: AbortSignal.timeout(5000) // Timeout de 5 segundos
    })

    if (!response.ok) {
      console.error(`ViaCEP: Erro HTTP ${response.status}`)
      return null
    }

    const data = await response.json()

    // ViaCEP retorna array ou objeto com "erro": true
    if (Array.isArray(data)) {
      if (data.length === 0) {
        return null
      }

      // Armazenar no cache
      cepCache.set(chaveCache, data)

      // Retornar primeiro resultado
      return processarResultado(data[0], true)
    }

    if (data.erro) {
      return null
    }

    // Resultado único
    const resultadoUnico = data as ViaCEPResult
    cepCache.set(chaveCache, [resultadoUnico])

    return processarResultado(resultadoUnico, true)

  } catch (error) {
    if (error instanceof Error) {
      console.error(`ViaCEP: Erro ao buscar CEP:`, error.message)
    }
    return null
  }
}

/**
 * Busca CEP exato (sem aproximação)
 *
 * @param cep - CEP a buscar (com ou sem formatação)
 * @returns Informações do CEP ou null se não encontrado
 *
 * @example
 * ```typescript
 * const info = await buscarCEPExato("95020-000")
 * // {
 * //   cep: "95020-000",
 * //   endereco: "Rua Sinimbu, Centro - Caxias do Sul/RS",
 * //   aproximado: false,
 * //   ...
 * // }
 * ```
 */
export async function buscarCEPExato(cep: string): Promise<CEPInfo | null> {
  try {
    // Remove formatação
    const cepLimpo = cep.replace(/\D/g, '')

    if (cepLimpo.length !== 8) {
      return null
    }

    const url = `https://viacep.com.br/ws/${cepLimpo}/json/`

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MeguisPet/1.0',
      },
      signal: AbortSignal.timeout(5000)
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()

    if (data.erro) {
      return null
    }

    return processarResultado(data, false)

  } catch (error) {
    if (error instanceof Error) {
      console.error(`ViaCEP: Erro ao buscar CEP exato:`, error.message)
    }
    return null
  }
}

/**
 * Processa resultado da API ViaCEP para formato interno
 *
 * @param resultado - Resultado da API
 * @param aproximado - Se é CEP aproximado
 * @returns CEPInfo processado
 */
function processarResultado(
  resultado: ViaCEPResult,
  aproximado: boolean
): CEPInfo {
  const endereco = montarEndereco(resultado)

  return {
    cep: resultado.cep,
    logradouro: resultado.logradouro || '',
    bairro: resultado.bairro || '',
    cidade: resultado.localidade,
    uf: resultado.uf,
    endereco,
    aproximado,
    ddd: resultado.ddd || ''
  }
}

/**
 * Monta endereço completo formatado
 *
 * @param resultado - Resultado da API ViaCEP
 * @returns Endereço formatado
 *
 * @example
 * ```typescript
 * montarEndereco({
 *   logradouro: "Rua Sinimbu",
 *   bairro: "Centro",
 *   localidade: "Caxias do Sul",
 *   uf: "RS",
 *   ...
 * })
 * // "Rua Sinimbu, Centro - Caxias do Sul/RS"
 * ```
 */
export function montarEndereco(resultado: ViaCEPResult): string {
  const partes: string[] = []

  if (resultado.logradouro) {
    partes.push(resultado.logradouro)
  }

  if (resultado.bairro) {
    partes.push(resultado.bairro)
  }

  const logradouroBairro = partes.join(', ')
  const cidadeUF = `${resultado.localidade}/${resultado.uf}`

  if (logradouroBairro) {
    return `${logradouroBairro} - ${cidadeUF}`
  }

  return cidadeUF
}

/**
 * Busca múltiplos CEPs em lote (otimizado com cache)
 *
 * @param cidades - Array de { uf, cidade }
 * @returns Map com resultados (chave: "UF-Cidade")
 *
 * @example
 * ```typescript
 * const resultados = await buscarCEPsEmLote([
 *   { uf: "RS", cidade: "Caxias do Sul" },
 *   { uf: "SP", cidade: "São Paulo" },
 * ])
 *
 * // Map {
 * //   "RS-Caxias do Sul" => CEPInfo,
 * //   "SP-São Paulo" => CEPInfo
 * // }
 * ```
 */
export async function buscarCEPsEmLote(
  cidades: Array<{ uf: string; cidade: string }>
): Promise<Map<string, CEPInfo>> {
  const resultados = new Map<string, CEPInfo>()

  // Buscar em paralelo com limite de 5 requisições simultâneas
  const BATCH_SIZE = 5

  for (let i = 0; i < cidades.length; i += BATCH_SIZE) {
    const batch = cidades.slice(i, i + BATCH_SIZE)

    const promises = batch.map(async ({ uf, cidade }) => {
      const chave = gerarChaveCache(uf, cidade)
      const cepInfo = await buscarCEPPorCidade(uf, cidade)

      if (cepInfo) {
        resultados.set(chave, cepInfo)
      }

      return { chave, cepInfo }
    })

    await Promise.all(promises)

    // Pequeno delay entre batches para não sobrecarregar a API
    if (i + BATCH_SIZE < cidades.length) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  return resultados
}

/**
 * Obtém estatísticas do cache
 *
 * @returns Estatísticas do cache
 */
export function obterEstatisticasCache(): {
  tamanho: number
  chaves: string[]
  ultimaLimpeza: Date
} {
  return {
    tamanho: cepCache.size,
    chaves: Array.from(cepCache.keys()),
    ultimaLimpeza: new Date(lastCacheCleanup)
  }
}

/**
 * Limpa todo o cache manualmente
 */
export function limparCache(): void {
  cepCache.clear()
  lastCacheCleanup = Date.now()
}

/**
 * Formata CEP no padrão XXXXX-XXX
 *
 * @param cep - CEP sem formatação
 * @returns CEP formatado
 *
 * @example
 * ```typescript
 * formatarCEP("95020000")  // "95020-000"
 * ```
 */
export function formatarCEP(cep: string): string {
  const cepLimpo = cep.replace(/\D/g, '')

  if (cepLimpo.length !== 8) {
    return cep
  }

  return cepLimpo.replace(/^(\d{5})(\d{3})$/, '$1-$2')
}
