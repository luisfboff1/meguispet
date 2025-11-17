/**
 * TESTE DO CÁLCULO DE ST (Substituição Tributária)
 *
 * Este arquivo testa o cálculo correto de ST conforme a fórmula:
 * 1. Base ST = Valor Líquido × (1 + MVA/100)
 * 2. ICMS ST = Base ST × Alíquota Interna (18%)
 * 3. ICMS Próprio = Valor Líquido × ICMS Próprio % (4%)
 * 4. ST Final = ICMS ST - ICMS Próprio
 * 5. IPI = Valor Líquido × IPI %
 * 6. Valor Final = Valor Líquido + ST Final + IPI
 */

// Mock do teste - calcular manualmente conforme a fórmula
function calcularSTCorreto(
  valorLiquido: number,
  mva: number,
  icmsProprioAliquota: number = 4,
  aliquotaSTInterna: number = 18,
  ipiAliquota: number = 0
) {
  let baseST = 0
  let icmsST = 0
  let icmsProprio = 0
  let stFinal = 0

  // Só calcular ST se MVA > 0
  if (mva > 0) {
    // 1. Base ST = Valor Líquido × (1 + MVA/100)
    baseST = valorLiquido * (1 + mva / 100)

    // 2. ICMS ST = Base ST × Alíquota Interna
    icmsST = baseST * (aliquotaSTInterna / 100)

    // 3. ICMS Próprio = Valor Líquido × ICMS Próprio %
    icmsProprio = valorLiquido * (icmsProprioAliquota / 100)

    // 4. ST Final = ICMS ST - ICMS Próprio
    stFinal = icmsST - icmsProprio
  }

  // 5. IPI = Valor Líquido × IPI %
  const ipi = valorLiquido * (ipiAliquota / 100)

  // 6. Valor Final = Valor Líquido + ST Final + IPI
  const valorFinal = valorLiquido + stFinal + ipi

  return {
    valorLiquido,
    mva,
    baseST: Number(baseST.toFixed(2)),
    aliquotaSTInterna,
    icmsST: Number(icmsST.toFixed(2)),
    icmsProprioAliquota,
    icmsProprio: Number(icmsProprio.toFixed(2)),
    stFinal: Number(stFinal.toFixed(2)),
    ipiAliquota,
    ipi: Number(ipi.toFixed(2)),
    valorFinal: Number(valorFinal.toFixed(2))
  }
}

// ============================================================================
// TESTE COM EXEMPLO FORNECIDO
// ============================================================================


const exemplo = calcularSTCorreto(
  2500,    // Valor Líquido
  83.63,   // MVA
  4,       // ICMS Próprio
  18,      // Alíquota ST Interna
  10       // IPI
)




const diferenca = Math.abs(3476.33 - exemplo.valorFinal)
const passou = diferenca <= 0.02 // Margem de erro de arredondamento

if (!passou) {
} else if (diferenca > 0) {
}

// ============================================================================
// TESTE COM PRODUTO SEM ST (MVA = 0)
// ============================================================================


const semST = calcularSTCorreto(
  1000,    // Valor Líquido
  0,       // MVA = 0 (sem ST)
  4,       // ICMS Próprio
  18,      // Alíquota ST Interna
  10       // IPI
)


const passoSemST = semST.stFinal === 0 && semST.valorFinal === 1100

// ============================================================================
// TESTE COM DIFERENTES MVAs
// ============================================================================


const mvas = [30, 50, 70, 100]
mvas.forEach(mva => {
  const resultado = calcularSTCorreto(1000, mva, 4, 18, 0)
})


// Para executar este teste:
// npx ts-node lib/__tests__/st-calculation.test.ts
