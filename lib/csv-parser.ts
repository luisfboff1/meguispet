/**
 * CSV Parser
 *
 * Utilitário para parsing de arquivos CSV/TXT com separador configurável.
 * Suporta diferentes encodings e formatos de linha (CRLF, LF).
 *
 * @module lib/csv-parser
 */

export interface CSVRow {
  [key: string]: string
}

export interface CSVParseResult {
  headers: string[]
  rows: CSVRow[]
  totalLines: number
  emptyLines: number
}

export interface CSVParseOptions {
  delimiter?: string
  skipEmptyLines?: boolean
  trimValues?: boolean
  normalizeHeaders?: boolean
}

/**
 * Parseia conteúdo CSV/TXT em um array de objetos
 *
 * @param content - Conteúdo do arquivo em string
 * @param options - Opções de parsing
 * @returns Resultado do parsing com headers e rows
 *
 * @example
 * ```typescript
 * const content = "Nome;CNPJ;Cidade\nEmpresa A;12345678000100;São Paulo"
 * const result = parseCSV(content, { delimiter: ';' })
 * // result.rows[0] = { Nome: "Empresa A", CNPJ: "12345678000100", Cidade: "São Paulo" }
 * ```
 */
export function parseCSV(
  content: string,
  options: CSVParseOptions = {}
): CSVParseResult {
  const {
    delimiter = ';',
    skipEmptyLines = true,
    trimValues = true,
    normalizeHeaders = true
  } = options

  // Dividir em linhas (suporta CRLF e LF)
  const allLines = content.split(/\r?\n/)

  // Filtrar linhas vazias se necessário
  const lines = skipEmptyLines
    ? allLines.filter(line => line.trim().length > 0)
    : allLines

  if (lines.length < 1) {
    throw new Error('Arquivo vazio ou sem dados')
  }

  if (lines.length < 2) {
    throw new Error('Arquivo deve conter pelo menos um header e uma linha de dados')
  }

  // Primeira linha é o header
  let headers = lines[0].split(delimiter)

  if (trimValues) {
    headers = headers.map(h => h.trim())
  }

  if (normalizeHeaders) {
    headers = headers.map(h => normalizeHeaderName(h))
  }

  // Filtrar headers vazios e manter índices válidos
  // Isso permite lidar com CSVs que têm colunas vazias no final (trailing semicolons)
  const validColumnIndices: number[] = []
  const filteredHeaders: string[] = []

  headers.forEach((header, index) => {
    if (header) {
      validColumnIndices.push(index)
      filteredHeaders.push(header)
    }
  })

  // Se não há headers válidos, erro
  if (filteredHeaders.length === 0) {
    throw new Error('Header contém apenas campos vazios')
  }

  headers = filteredHeaders

  // Parsear linhas de dados
  const rows: CSVRow[] = []
  const emptyLines = allLines.length - lines.length

  for (let i = 1; i < lines.length; i++) {
    const lineNumber = i + 1
    const allValues = lines[i].split(delimiter)

    // Extrair apenas valores das colunas válidas
    const values = validColumnIndices.map(idx =>
      idx < allValues.length ? allValues[idx] : ''
    )

    // Validar número de colunas (agora usando filteredHeaders)
    if (values.length !== headers.length) {
      console.warn(
        `Linha ${lineNumber}: esperado ${headers.length} colunas, encontrado ${values.length}`
      )
      // Preencher com valores vazios se necessário
      while (values.length < headers.length) {
        values.push('')
      }
    }

    const row: CSVRow = {}
    headers.forEach((header, index) => {
      let value = values[index] || ''

      if (trimValues) {
        value = value.trim()
      }

      // Remover aspas vazias '' que às vezes aparecem em CSVs
      if (value === "''" || value === '""') {
        value = ''
      }

      row[header] = value
    })

    rows.push(row)
  }

  return {
    headers,
    rows,
    totalLines: lines.length,
    emptyLines
  }
}

/**
 * Normaliza nome do header para formato consistente
 * Remove acentos, converte para lowercase, remove espaços extras
 *
 * @param header - Nome do header original
 * @returns Header normalizado
 *
 * @example
 * ```typescript
 * normalizeHeaderName("Razão Social") // "razao_social"
 * normalizeHeaderName("CNPJ/CPF")     // "cnpj_cpf"
 * ```
 */
export function normalizeHeaderName(header: string): string {
  return header
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/\//g, '_') // Substitui / por _
    .replace(/\s+/g, '_') // Substitui espaços por _
    .replace(/[^\w_]/g, '') // Remove caracteres especiais
    .trim()
}

/**
 * Detecta automaticamente o delimitador mais provável do CSV
 *
 * @param content - Conteúdo do arquivo
 * @returns Delimitador detectado (;, ,, ou \t)
 *
 * @example
 * ```typescript
 * const content = "Nome;CNPJ\nEmpresa A;12345"
 * detectDelimiter(content) // ";"
 * ```
 */
export function detectDelimiter(content: string): string {
  const firstLine = content.split(/\r?\n/)[0]

  const delimiters = [';', ',', '\t', '|']
  const counts = delimiters.map(d => ({
    delimiter: d,
    count: (firstLine.match(new RegExp(`\\${d}`, 'g')) || []).length
  }))

  // Ordenar por contagem (maior primeiro)
  counts.sort((a, b) => b.count - a.count)

  // Retornar o delimitador com maior contagem (ou ; como padrão)
  return counts[0].count > 0 ? counts[0].delimiter : ';'
}

/**
 * Valida se o arquivo tem estrutura CSV válida
 *
 * @param content - Conteúdo do arquivo
 * @param delimiter - Delimitador esperado
 * @returns true se válido, false caso contrário
 */
export function validateCSVStructure(
  content: string,
  delimiter: string = ';'
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!content || content.trim().length === 0) {
    errors.push('Arquivo vazio')
    return { valid: false, errors }
  }

  const lines = content.split(/\r?\n/).filter(l => l.trim())

  if (lines.length < 2) {
    errors.push('Arquivo deve conter pelo menos header e uma linha de dados')
    return { valid: false, errors }
  }

  const headerColumnsCount = lines[0].split(delimiter).length

  if (headerColumnsCount < 2) {
    errors.push(`Delimitador '${delimiter}' não encontrado no header. Verifique o separador.`)
    return { valid: false, errors }
  }

  // Validar que todas as linhas têm o mesmo número de colunas
  for (let i = 1; i < Math.min(10, lines.length); i++) {
    const columnsCount = lines[i].split(delimiter).length
    if (columnsCount !== headerColumnsCount) {
      errors.push(
        `Linha ${i + 1}: número de colunas diferente do header (${columnsCount} vs ${headerColumnsCount})`
      )
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Converte array de objetos de volta para CSV
 * Útil para exportar relatórios
 *
 * @param data - Array de objetos
 * @param delimiter - Delimitador a usar
 * @returns String CSV
 */
export function arrayToCSV(
  data: Record<string, any>[],
  delimiter: string = ';'
): string {
  if (data.length === 0) {
    return ''
  }

  // Extrair headers das chaves do primeiro objeto
  const headers = Object.keys(data[0])

  // Linha de header
  const headerLine = headers.join(delimiter)

  // Linhas de dados
  const dataLines = data.map(row => {
    return headers.map(header => {
      const value = row[header]

      // Se o valor contém o delimitador, envolver em aspas
      if (typeof value === 'string' && value.includes(delimiter)) {
        return `"${value}"`
      }

      return value ?? ''
    }).join(delimiter)
  })

  return [headerLine, ...dataLines].join('\n')
}
