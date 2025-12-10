/**
 * CNPJ/CPF Validator
 *
 * Utilitário para validação de documentos brasileiros (CNPJ e CPF)
 * com verificação de dígitos verificadores.
 *
 * @module lib/cnpj-validator
 */

/**
 * Remove formatação de documento (pontos, traços, barras)
 *
 * @param doc - Documento com ou sem formatação
 * @returns Documento apenas com dígitos
 *
 * @example
 * ```typescript
 * limparDocumento("40.950.139/0001-10") // "40950139000110"
 * limparDocumento("226.907.148-41")     // "22690714841"
 * ```
 */
export function limparDocumento(doc: string): string {
  return doc.replace(/[^\d]/g, '')
}

/**
 * Formata CNPJ no padrão XX.XXX.XXX/XXXX-XX
 *
 * @param cnpj - CNPJ apenas com dígitos
 * @returns CNPJ formatado
 *
 * @example
 * ```typescript
 * formatarCNPJ("40950139000110") // "40.950.139/0001-10"
 * ```
 */
export function formatarCNPJ(cnpj: string): string {
  cnpj = limparDocumento(cnpj)

  if (cnpj.length !== 14) {
    return cnpj
  }

  return cnpj.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5'
  )
}

/**
 * Formata CPF no padrão XXX.XXX.XXX-XX
 *
 * @param cpf - CPF apenas com dígitos
 * @returns CPF formatado
 *
 * @example
 * ```typescript
 * formatarCPF("22690714841") // "226.907.148-41"
 * ```
 */
export function formatarCPF(cpf: string): string {
  cpf = limparDocumento(cpf)

  if (cpf.length !== 11) {
    return cpf
  }

  return cpf.replace(
    /^(\d{3})(\d{3})(\d{3})(\d{2})$/,
    '$1.$2.$3-$4'
  )
}

/**
 * Formata documento (detecta automaticamente se é CPF ou CNPJ)
 *
 * @param doc - Documento com ou sem formatação
 * @returns Documento formatado
 *
 * @example
 * ```typescript
 * formatarDocumento("40950139000110")  // "40.950.139/0001-10"
 * formatarDocumento("22690714841")     // "226.907.148-41"
 * ```
 */
export function formatarDocumento(doc: string): string {
  const limpo = limparDocumento(doc)

  if (limpo.length === 11) {
    return formatarCPF(limpo)
  }

  if (limpo.length === 14) {
    return formatarCNPJ(limpo)
  }

  return doc
}

/**
 * Valida CNPJ verificando dígitos verificadores
 *
 * @param cnpj - CNPJ com ou sem formatação
 * @returns true se válido, false caso contrário
 *
 * @example
 * ```typescript
 * validarCNPJ("40.950.139/0001-10") // true
 * validarCNPJ("11.111.111/0001-11") // false (dígitos inválidos)
 * ```
 */
export function validarCNPJ(cnpj: string): boolean {
  cnpj = limparDocumento(cnpj)

  // Verifica se tem 14 dígitos
  if (cnpj.length !== 14) {
    return false
  }

  // Verifica se todos os dígitos são iguais (CNPJ inválido)
  if (/^(\d)\1+$/.test(cnpj)) {
    return false
  }

  // Calcula primeiro dígito verificador
  let soma = 0
  let peso = 2

  for (let i = 11; i >= 0; i--) {
    soma += parseInt(cnpj[i]) * peso
    peso = peso === 9 ? 2 : peso + 1
  }

  let digito1 = soma % 11 < 2 ? 0 : 11 - (soma % 11)

  if (parseInt(cnpj[12]) !== digito1) {
    return false
  }

  // Calcula segundo dígito verificador
  soma = 0
  peso = 2

  for (let i = 12; i >= 0; i--) {
    soma += parseInt(cnpj[i]) * peso
    peso = peso === 9 ? 2 : peso + 1
  }

  let digito2 = soma % 11 < 2 ? 0 : 11 - (soma % 11)

  return parseInt(cnpj[13]) === digito2
}

/**
 * Valida CPF verificando dígitos verificadores
 *
 * @param cpf - CPF com ou sem formatação
 * @returns true se válido, false caso contrário
 *
 * @example
 * ```typescript
 * validarCPF("226.907.148-41") // true
 * validarCPF("111.111.111-11") // false (dígitos inválidos)
 * ```
 */
export function validarCPF(cpf: string): boolean {
  cpf = limparDocumento(cpf)

  // Verifica se tem 11 dígitos
  if (cpf.length !== 11) {
    return false
  }

  // Verifica se todos os dígitos são iguais (CPF inválido)
  if (/^(\d)\1+$/.test(cpf)) {
    return false
  }

  // Calcula primeiro dígito verificador
  let soma = 0
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpf[i]) * (10 - i)
  }

  let digito1 = 11 - (soma % 11)
  if (digito1 >= 10) digito1 = 0

  if (parseInt(cpf[9]) !== digito1) {
    return false
  }

  // Calcula segundo dígito verificador
  soma = 0
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpf[i]) * (11 - i)
  }

  let digito2 = 11 - (soma % 11)
  if (digito2 >= 10) digito2 = 0

  return parseInt(cpf[10]) === digito2
}

/**
 * Valida documento (detecta automaticamente se é CPF ou CNPJ)
 *
 * @param doc - Documento com ou sem formatação
 * @returns true se válido, false caso contrário
 *
 * @example
 * ```typescript
 * validarDocumento("40.950.139/0001-10") // true (CNPJ)
 * validarDocumento("226.907.148-41")     // true (CPF)
 * validarDocumento("12345")              // false (tamanho inválido)
 * ```
 */
export function validarDocumento(doc: string): boolean {
  const limpo = limparDocumento(doc)

  if (limpo.length === 11) {
    return validarCPF(limpo)
  }

  if (limpo.length === 14) {
    return validarCNPJ(limpo)
  }

  return false
}

/**
 * Detecta o tipo do documento
 *
 * @param doc - Documento com ou sem formatação
 * @returns 'cpf', 'cnpj' ou 'invalido'
 *
 * @example
 * ```typescript
 * detectarTipoDocumento("40.950.139/0001-10") // "cnpj"
 * detectarTipoDocumento("226.907.148-41")     // "cpf"
 * detectarTipoDocumento("12345")              // "invalido"
 * ```
 */
export function detectarTipoDocumento(
  doc: string
): 'cpf' | 'cnpj' | 'invalido' {
  const limpo = limparDocumento(doc)

  if (limpo.length === 11) {
    return validarCPF(limpo) ? 'cpf' : 'invalido'
  }

  if (limpo.length === 14) {
    return validarCNPJ(limpo) ? 'cnpj' : 'invalido'
  }

  return 'invalido'
}

/**
 * Retorna mensagem de erro detalhada para documento inválido
 *
 * @param doc - Documento a validar
 * @returns Mensagem de erro ou null se válido
 *
 * @example
 * ```typescript
 * obterMensagemErro("111.111.111-11")
 * // "CPF inválido: todos os dígitos são iguais"
 *
 * obterMensagemErro("12345")
 * // "Documento inválido: deve ter 11 (CPF) ou 14 (CNPJ) dígitos"
 * ```
 */
export function obterMensagemErro(doc: string): string | null {
  const limpo = limparDocumento(doc)

  if (!limpo) {
    return 'Documento não informado'
  }

  if (limpo.length !== 11 && limpo.length !== 14) {
    return `Documento inválido: deve ter 11 (CPF) ou 14 (CNPJ) dígitos (encontrado: ${limpo.length})`
  }

  const tipo = limpo.length === 11 ? 'CPF' : 'CNPJ'

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(limpo)) {
    return `${tipo} inválido: todos os dígitos são iguais`
  }

  // Verifica dígitos verificadores
  const valido = limpo.length === 11 ? validarCPF(limpo) : validarCNPJ(limpo)

  if (!valido) {
    return `${tipo} inválido: dígitos verificadores incorretos`
  }

  return null
}

/**
 * Valida e retorna informações sobre o documento
 *
 * @param doc - Documento a validar
 * @returns Informações sobre o documento
 *
 * @example
 * ```typescript
 * validarDocumentoDetalhado("40.950.139/0001-10")
 * // {
 * //   valido: true,
 * //   tipo: "cnpj",
 * //   formatado: "40.950.139/0001-10",
 * //   limpo: "40950139000110",
 * //   erro: null
 * // }
 * ```
 */
export function validarDocumentoDetalhado(doc: string): {
  valido: boolean
  tipo: 'cpf' | 'cnpj' | 'invalido'
  formatado: string
  limpo: string
  erro: string | null
} {
  const limpo = limparDocumento(doc)
  const tipo = detectarTipoDocumento(doc)
  const valido = tipo !== 'invalido'
  const erro = obterMensagemErro(doc)
  const formatado = valido ? formatarDocumento(doc) : doc

  return {
    valido,
    tipo,
    formatado,
    limpo,
    erro
  }
}
