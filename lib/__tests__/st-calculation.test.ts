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

console.log('\n🧪 TESTE DE CÁLCULO DE ST\n')
console.log('=' .repeat(80))

const exemplo = calcularSTCorreto(
  2500,    // Valor Líquido
  83.63,   // MVA
  4,       // ICMS Próprio
  18,      // Alíquota ST Interna
  10       // IPI
)

console.log('\n📊 Exemplo Fornecido pelo Usuário:')
console.log('   Valor Líquido: R$ 2.500,00')
console.log('   MVA: 83,63%')
console.log('   IPI: 10%')
console.log('   ICMS Próprio: 4%')
console.log('   Alíquota ST (interna): 18%')

console.log('\n📐 Cálculo:')
console.log(`   1. Base ST = 2.500 × (1 + 0,8363) = 2.500 × 1,8363 = R$ ${exemplo.baseST}`)
console.log(`   2. ICMS ST = ${exemplo.baseST} × 18% = R$ ${exemplo.icmsST}`)
console.log(`   3. ICMS Próprio = 2.500 × 4% = R$ ${exemplo.icmsProprio}`)
console.log(`   4. ST Final = ${exemplo.icmsST} - ${exemplo.icmsProprio} = R$ ${exemplo.stFinal}`)
console.log(`   5. IPI = 2.500 × 10% = R$ ${exemplo.ipi}`)
console.log(`   6. Valor Final = 2.500 + ${exemplo.stFinal} + ${exemplo.ipi} = R$ ${exemplo.valorFinal}`)

console.log('\n✅ Resultado Esperado: R$ 3.476,33')
console.log(`✅ Resultado Calculado: R$ ${exemplo.valorFinal}`)

const diferenca = Math.abs(3476.33 - exemplo.valorFinal)
const passou = diferenca <= 0.02 // Margem de erro de arredondamento
console.log(`\n${passou ? '✅ TESTE PASSOU!' : '❌ TESTE FALHOU!'}`)

if (!passou) {
  console.log(`   Esperado: R$ 3.476,33`)
  console.log(`   Obtido: R$ ${exemplo.valorFinal}`)
  console.log(`   Diferença: R$ ${diferenca.toFixed(2)}`)
} else if (diferenca > 0) {
  console.log(`   ℹ️  Diferença de arredondamento: R$ ${diferenca.toFixed(2)} (dentro da margem aceitável)`)
}

// ============================================================================
// TESTE COM PRODUTO SEM ST (MVA = 0)
// ============================================================================

console.log('\n' + '='.repeat(80))
console.log('\n📊 Teste: Produto SEM ST (MVA = 0)')

const semST = calcularSTCorreto(
  1000,    // Valor Líquido
  0,       // MVA = 0 (sem ST)
  4,       // ICMS Próprio
  18,      // Alíquota ST Interna
  10       // IPI
)

console.log(`   Base ST: R$ ${semST.baseST} (deve ser igual ao valor líquido)`)
console.log(`   ST Final: R$ ${semST.stFinal} (deve ser 0)`)
console.log(`   IPI: R$ ${semST.ipi}`)
console.log(`   Valor Final: R$ ${semST.valorFinal} (deve ser valor líquido + IPI apenas)`)

const passoSemST = semST.stFinal === 0 && semST.valorFinal === 1100
console.log(`\n${passoSemST ? '✅ TESTE PASSOU!' : '❌ TESTE FALHOU!'}`)

// ============================================================================
// TESTE COM DIFERENTES MVAs
// ============================================================================

console.log('\n' + '='.repeat(80))
console.log('\n📊 Teste: Diferentes MVAs\n')

const mvas = [30, 50, 70, 100]
mvas.forEach(mva => {
  const resultado = calcularSTCorreto(1000, mva, 4, 18, 0)
  console.log(`   MVA ${mva}%: Base ST = R$ ${resultado.baseST}, ST Final = R$ ${resultado.stFinal}`)
})

console.log('\n' + '='.repeat(80))
console.log('\n✅ Todos os testes de validação do cálculo foram executados!\n')

// Para executar este teste:
// npx ts-node lib/__tests__/st-calculation.test.ts
