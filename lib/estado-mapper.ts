/**
 * Estado Mapper
 *
 * Utilitário para conversão entre nome completo e sigla (UF) dos estados brasileiros.
 * Suporta normalização de acentos e variações de nomes.
 *
 * @module lib/estado-mapper
 */

/**
 * Mapa completo de estados brasileiros
 * Nome completo (normalizado) → UF
 */
const ESTADOS_MAP: Record<string, string> = {
  // Região Norte
  'ACRE': 'AC',
  'AMAPA': 'AP',
  'AMAZONAS': 'AM',
  'PARA': 'PA',
  'RONDONIA': 'RO',
  'RORAIMA': 'RR',
  'TOCANTINS': 'TO',

  // Região Nordeste
  'ALAGOAS': 'AL',
  'BAHIA': 'BA',
  'CEARA': 'CE',
  'MARANHAO': 'MA',
  'PARAIBA': 'PB',
  'PERNAMBUCO': 'PE',
  'PIAUI': 'PI',
  'RIO GRANDE DO NORTE': 'RN',
  'SERGIPE': 'SE',

  // Região Centro-Oeste
  'DISTRITO FEDERAL': 'DF',
  'GOIAS': 'GO',
  'MATO GROSSO': 'MT',
  'MATO GROSSO DO SUL': 'MS',

  // Região Sudeste
  'ESPIRITO SANTO': 'ES',
  'MINAS GERAIS': 'MG',
  'RIO DE JANEIRO': 'RJ',
  'SAO PAULO': 'SP',

  // Região Sul
  'PARANA': 'PR',
  'RIO GRANDE DO SUL': 'RS',
  'SANTA CATARINA': 'SC'
}

/**
 * Mapa reverso: UF → Nome completo
 */
const UF_TO_ESTADO_MAP: Record<string, string> = {
  'AC': 'Acre',
  'AL': 'Alagoas',
  'AP': 'Amapá',
  'AM': 'Amazonas',
  'BA': 'Bahia',
  'CE': 'Ceará',
  'DF': 'Distrito Federal',
  'ES': 'Espírito Santo',
  'GO': 'Goiás',
  'MA': 'Maranhão',
  'MT': 'Mato Grosso',
  'MS': 'Mato Grosso do Sul',
  'MG': 'Minas Gerais',
  'PA': 'Pará',
  'PB': 'Paraíba',
  'PR': 'Paraná',
  'PE': 'Pernambuco',
  'PI': 'Piauí',
  'RJ': 'Rio de Janeiro',
  'RN': 'Rio Grande do Norte',
  'RS': 'Rio Grande do Sul',
  'RO': 'Rondônia',
  'RR': 'Roraima',
  'SC': 'Santa Catarina',
  'SP': 'São Paulo',
  'SE': 'Sergipe',
  'TO': 'Tocantins'
}

/**
 * Lista de todas as UFs válidas
 */
export const UFS_VALIDAS = Object.keys(UF_TO_ESTADO_MAP)

/**
 * Lista de todos os estados válidos (nome completo)
 */
export const ESTADOS_VALIDOS = Object.values(UF_TO_ESTADO_MAP)

/**
 * Normaliza string removendo acentos e convertendo para maiúsculas
 *
 * @param texto - Texto a normalizar
 * @returns Texto normalizado
 *
 * @example
 * ```typescript
 * normalizarTexto("São Paulo")  // "SAO PAULO"
 * normalizarTexto("Paraná")     // "PARANA"
 * ```
 */
export function normalizarTexto(texto: string): string {
  return texto
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .trim()
}

/**
 * Converte nome do estado (completo ou sigla) para UF
 *
 * @param estado - Nome completo ou sigla do estado
 * @returns UF (sigla) ou null se não encontrado
 *
 * @example
 * ```typescript
 * converterParaUF("Rio Grande do Sul")  // "RS"
 * converterParaUF("RIO GRANDE DO SUL")  // "RS"
 * converterParaUF("RS")                 // "RS"
 * converterParaUF("São Paulo")          // "SP"
 * converterParaUF("Estado Inválido")    // null
 * ```
 */
export function converterParaUF(estado: string): string | null {
  if (!estado) return null

  const normalizado = normalizarTexto(estado)

  // Se já é uma UF válida, retornar diretamente
  if (UFS_VALIDAS.includes(normalizado)) {
    return normalizado
  }

  // Buscar no mapa de estados
  return ESTADOS_MAP[normalizado] || null
}

/**
 * Converte UF para nome completo do estado
 *
 * @param uf - Sigla do estado (UF)
 * @returns Nome completo ou null se não encontrado
 *
 * @example
 * ```typescript
 * converterParaNome("RS")  // "Rio Grande do Sul"
 * converterParaNome("SP")  // "São Paulo"
 * converterParaNome("XX")  // null
 * ```
 */
export function converterParaNome(uf: string): string | null {
  if (!uf) return null

  const normalizado = normalizarTexto(uf)
  return UF_TO_ESTADO_MAP[normalizado] || null
}

/**
 * Valida se um estado (nome ou UF) é válido
 *
 * @param estado - Nome completo ou sigla
 * @returns true se válido, false caso contrário
 *
 * @example
 * ```typescript
 * validarEstado("Rio Grande do Sul")  // true
 * validarEstado("RS")                 // true
 * validarEstado("Estado Inválido")    // false
 * ```
 */
export function validarEstado(estado: string): boolean {
  return converterParaUF(estado) !== null
}

/**
 * Obtém informações completas sobre um estado
 *
 * @param estado - Nome completo ou sigla
 * @returns Informações do estado ou null se não encontrado
 *
 * @example
 * ```typescript
 * obterInfoEstado("RS")
 * // {
 * //   uf: "RS",
 * //   nome: "Rio Grande do Sul",
 * //   regiao: "Sul",
 * //   valido: true
 * // }
 * ```
 */
export function obterInfoEstado(estado: string): {
  uf: string
  nome: string
  regiao: string
  valido: boolean
} | null {
  const uf = converterParaUF(estado)

  if (!uf) {
    return null
  }

  const nome = converterParaNome(uf)!
  const regiao = obterRegiao(uf)

  return {
    uf,
    nome,
    regiao,
    valido: true
  }
}

/**
 * Obtém a região do estado
 *
 * @param uf - Sigla do estado
 * @returns Nome da região
 *
 * @example
 * ```typescript
 * obterRegiao("RS")  // "Sul"
 * obterRegiao("SP")  // "Sudeste"
 * ```
 */
export function obterRegiao(uf: string): string {
  const normalizado = normalizarTexto(uf)

  const regioes: Record<string, string[]> = {
    'Norte': ['AC', 'AP', 'AM', 'PA', 'RO', 'RR', 'TO'],
    'Nordeste': ['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'],
    'Centro-Oeste': ['DF', 'GO', 'MT', 'MS'],
    'Sudeste': ['ES', 'MG', 'RJ', 'SP'],
    'Sul': ['PR', 'RS', 'SC']
  }

  for (const [regiao, ufs] of Object.entries(regioes)) {
    if (ufs.includes(normalizado)) {
      return regiao
    }
  }

  return 'Desconhecida'
}

/**
 * Lista todos os estados de uma região
 *
 * @param regiao - Nome da região
 * @returns Array de objetos { uf, nome }
 *
 * @example
 * ```typescript
 * listarEstadosPorRegiao("Sul")
 * // [
 * //   { uf: "PR", nome: "Paraná" },
 * //   { uf: "RS", nome: "Rio Grande do Sul" },
 * //   { uf: "SC", nome: "Santa Catarina" }
 * // ]
 * ```
 */
export function listarEstadosPorRegiao(regiao: string): Array<{ uf: string; nome: string }> {
  const regioes: Record<string, string[]> = {
    'Norte': ['AC', 'AP', 'AM', 'PA', 'RO', 'RR', 'TO'],
    'Nordeste': ['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'],
    'Centro-Oeste': ['DF', 'GO', 'MT', 'MS'],
    'Sudeste': ['ES', 'MG', 'RJ', 'SP'],
    'Sul': ['PR', 'RS', 'SC']
  }

  const ufs = regioes[regiao] || []

  return ufs.map(uf => ({
    uf,
    nome: converterParaNome(uf)!
  }))
}

/**
 * Sugere correção para estado digitado incorretamente
 * Usa distância de Levenshtein simplificada
 *
 * @param estadoDigitado - Estado digitado (possivelmente com erro)
 * @returns Array de sugestões ordenadas por similaridade
 *
 * @example
 * ```typescript
 * sugerirCorrecao("Rio Grande do Sol")
 * // ["Rio Grande do Sul", "Rio Grande do Norte"]
 *
 * sugerirCorrecao("Sao Paolo")
 * // ["São Paulo"]
 * ```
 */
export function sugerirCorrecao(estadoDigitado: string): string[] {
  const normalizado = normalizarTexto(estadoDigitado)

  const sugestoes: Array<{ estado: string; distancia: number }> = []

  // Verificar todos os estados
  for (const [estado, uf] of Object.entries(ESTADOS_MAP)) {
    const distancia = calcularDistanciaSimples(normalizado, estado)

    if (distancia <= 3) {
      // Tolerância de 3 caracteres
      sugestoes.push({
        estado: converterParaNome(uf)!,
        distancia
      })
    }
  }

  // Ordenar por distância (mais similar primeiro)
  sugestoes.sort((a, b) => a.distancia - b.distancia)

  return sugestoes.slice(0, 3).map(s => s.estado)
}

/**
 * Calcula distância simples entre duas strings
 * (quantidade de caracteres diferentes)
 *
 * @param str1 - Primeira string
 * @param str2 - Segunda string
 * @returns Distância (número de diferenças)
 */
function calcularDistanciaSimples(str1: string, str2: string): number {
  let distancia = Math.abs(str1.length - str2.length)

  const minLen = Math.min(str1.length, str2.length)

  for (let i = 0; i < minLen; i++) {
    if (str1[i] !== str2[i]) {
      distancia++
    }
  }

  return distancia
}

/**
 * Capitaliza nome do estado (primeira letra de cada palavra maiúscula)
 *
 * @param estado - Nome do estado
 * @returns Nome capitalizado
 *
 * @example
 * ```typescript
 * capitalizarEstado("RIO GRANDE DO SUL")  // "Rio Grande do Sul"
 * capitalizarEstado("são paulo")          // "São Paulo"
 * ```
 */
export function capitalizarEstado(estado: string): string {
  // Lista de palavras que não devem ser capitalizadas (exceto no início)
  const preposicoes = ['de', 'do', 'da', 'dos', 'das']

  return estado
    .toLowerCase()
    .split(' ')
    .map((palavra, index) => {
      // Primeira palavra sempre capitaliza
      if (index === 0) {
        return palavra.charAt(0).toUpperCase() + palavra.slice(1)
      }

      // Preposições permanecem minúsculas
      if (preposicoes.includes(palavra)) {
        return palavra
      }

      // Demais palavras capitalizam
      return palavra.charAt(0).toUpperCase() + palavra.slice(1)
    })
    .join(' ')
}
