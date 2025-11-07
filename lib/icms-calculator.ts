// ============================================================================
// ICMS-ST CALCULATOR
// ============================================================================
// Utility functions for ICMS-ST tax calculations
// Based on Brazilian tax legislation
// ============================================================================

import type { CalculoImpostoInput, CalculoImpostoResult } from '@/types'

/**
 * Calculates ICMS-ST (Imposto sobre Circulação de Mercadorias e Serviços - Substituição Tributária)
 *
 * Formula breakdown:
 * 1. Base ST = (Valor mercadoria + Frete + Despesas) × (1 + MVA)
 * 2. ICMS Próprio = (Valor mercadoria + Frete + Despesas) × Alíquota ICMS
 * 3. ICMS-ST Total = Base ST × Alíquota ICMS
 * 4. ICMS-ST a Recolher = ICMS-ST Total - ICMS Próprio
 *
 * @example
 * ```typescript
 * const result = calcularICMSST({
 *   valor_mercadoria: 1000,
 *   frete: 100,
 *   outras_despesas: 0,
 *   mva: 0.40, // 40%
 *   aliquota_icms: 0.18 // 18%
 * })
 *
 * // Result:
 * // base_calculo_st: 1540.00
 * // icms_proprio: 198.00
 * // icms_st_total: 277.20
 * // icms_st_recolher: 79.20
 * ```
 */
export function calcularICMSST(input: CalculoImpostoInput): CalculoImpostoResult {
  const {
    valor_mercadoria,
    frete,
    outras_despesas,
    mva,
    aliquota_icms
  } = input

  // Step 1: Calculate base value (valor + frete + despesas)
  const valorBase = valor_mercadoria + frete + outras_despesas

  // Step 2: Calculate ST base (base × (1 + MVA))
  const base_calculo_st = valorBase * (1 + mva)

  // Step 3: Calculate own ICMS (base × aliquota)
  const icms_proprio = valorBase * aliquota_icms

  // Step 4: Calculate total ICMS-ST (base ST × aliquota)
  const icms_st_total = base_calculo_st * aliquota_icms

  // Step 5: Calculate ICMS-ST to collect (total - own)
  const icms_st_recolher = icms_st_total - icms_proprio

  return {
    base_calculo_st: roundToTwoDecimals(base_calculo_st),
    icms_proprio: roundToTwoDecimals(icms_proprio),
    icms_st_total: roundToTwoDecimals(icms_st_total),
    icms_st_recolher: roundToTwoDecimals(icms_st_recolher),
    mva_aplicado: mva,
    aliquota_icms: aliquota_icms
  }
}

/**
 * Calculates ICMS-ST for multiple products and returns consolidated totals
 */
export function calcularICMSSTVendaCompleta(
  itens: Array<{
    valor: number
    quantidade: number
    frete_unitario?: number
    outras_despesas_unitario?: number
    mva: number
    aliquota_icms: number
  }>
): {
  total_base_calculo_st: number
  total_icms_proprio: number
  total_icms_st: number
  total_icms_recolher: number
  itens_calculados: CalculoImpostoResult[]
} {
  const itens_calculados = itens.map(item => {
    const valor_total = item.valor * item.quantidade
    const frete_total = (item.frete_unitario || 0) * item.quantidade
    const despesas_total = (item.outras_despesas_unitario || 0) * item.quantidade

    return calcularICMSST({
      valor_mercadoria: valor_total,
      frete: frete_total,
      outras_despesas: despesas_total,
      mva: item.mva,
      aliquota_icms: item.aliquota_icms
    })
  })

  const totals = itens_calculados.reduce(
    (acc, item) => ({
      total_base_calculo_st: acc.total_base_calculo_st + item.base_calculo_st,
      total_icms_proprio: acc.total_icms_proprio + item.icms_proprio,
      total_icms_st: acc.total_icms_st + item.icms_st_total,
      total_icms_recolher: acc.total_icms_recolher + item.icms_st_recolher
    }),
    {
      total_base_calculo_st: 0,
      total_icms_proprio: 0,
      total_icms_st: 0,
      total_icms_recolher: 0
    }
  )

  return {
    ...totals,
    total_base_calculo_st: roundToTwoDecimals(totals.total_base_calculo_st),
    total_icms_proprio: roundToTwoDecimals(totals.total_icms_proprio),
    total_icms_st: roundToTwoDecimals(totals.total_icms_st),
    total_icms_recolher: roundToTwoDecimals(totals.total_icms_recolher),
    itens_calculados
  }
}

/**
 * Checks if a UF (state) and NCM are subject to ICMS-ST
 */
export function isSujeitoST(uf: string, ncm: string, tabelaMva?: { sujeito_st: boolean }): boolean {
  if (tabelaMva) {
    return tabelaMva.sujeito_st
  }

  // Default: states that typically don't have ST for NCM 2309
  const ufsSemST = ['BA', 'GO', 'RN', 'RO', 'SC']
  return !ufsSemST.includes(uf.toUpperCase())
}

/**
 * Formats percentage for display (0.18 -> "18%")
 */
export function formatPercentage(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-'
  return `${(value * 100).toFixed(2)}%`
}

/**
 * Formats currency for display
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

/**
 * Rounds to 2 decimal places (for currency)
 */
function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Gets MVA value from tabela_mva or manual override
 */
export function getMVAValue(
  tabelaMva: { mva: number | null } | null | undefined,
  mva_manual: number | null | undefined
): number {
  // Priority 1: Manual override
  if (mva_manual !== null && mva_manual !== undefined) {
    return mva_manual
  }

  // Priority 2: From tabela_mva
  if (tabelaMva?.mva !== null && tabelaMva?.mva !== undefined) {
    return tabelaMva.mva
  }

  // Default: 0 (no MVA)
  return 0
}

/**
 * Gets aliquota ICMS value from tabela_mva or manual override
 */
export function getAliquotaICMS(
  tabelaMva: { aliquota_efetiva: number | null; aliquota_interna: number | null } | null | undefined,
  aliquota_manual: number | null | undefined
): number {
  // Priority 1: Manual override
  if (aliquota_manual !== null && aliquota_manual !== undefined) {
    return aliquota_manual
  }

  // Priority 2: Alíquota efetiva from tabela_mva
  if (tabelaMva?.aliquota_efetiva !== null && tabelaMva?.aliquota_efetiva !== undefined) {
    return tabelaMva.aliquota_efetiva
  }

  // Priority 3: Alíquota interna from tabela_mva
  if (tabelaMva?.aliquota_interna !== null && tabelaMva?.aliquota_interna !== undefined) {
    return tabelaMva.aliquota_interna
  }

  // Default: 18% (most common in Brazil)
  return 0.18
}
