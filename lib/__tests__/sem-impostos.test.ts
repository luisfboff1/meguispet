/**
 * TESTE DO CÁLCULO SEM IMPOSTOS
 *
 * Este arquivo testa a funcionalidade de vendas sem impostos.
 * Quando sem_impostos = true, todos os impostos (IPI, ICMS, ST) devem ser zerados.
 */

import { calcularItemVenda, calcularItensVenda } from '@/services/vendaCalculations'

// ============================================================================
// TESTE 1: Item individual sem impostos
// ============================================================================
console.log('🧪 TESTE 1: Calcular item individual sem impostos')

const itemComImpostos = calcularItemVenda(
  100,    // preço unitário
  2,      // quantidade
  10,     // IPI alíquota
  18,     // ICMS alíquota
  83.63,  // ST/MVA alíquota
  0,      // desconto proporcional
  4,      // ICMS próprio alíquota
  false   // SEM IMPOSTOS = false (com impostos)
)

console.log('📊 Resultado COM impostos:')
console.log(`  - Subtotal Bruto: R$ ${itemComImpostos.subtotal_bruto}`)
console.log(`  - Subtotal Líquido: R$ ${itemComImpostos.subtotal_liquido}`)
console.log(`  - IPI: R$ ${itemComImpostos.ipi_valor}`)
console.log(`  - ICMS: R$ ${itemComImpostos.icms_valor}`)
console.log(`  - ST: R$ ${itemComImpostos.st_valor}`)
console.log(`  - Total: R$ ${itemComImpostos.total_item}`)

const itemSemImpostos = calcularItemVenda(
  100,    // preço unitário
  2,      // quantidade
  10,     // IPI alíquota (será ignorada)
  18,     // ICMS alíquota (será ignorada)
  83.63,  // ST/MVA alíquota (será ignorada)
  0,      // desconto proporcional
  4,      // ICMS próprio alíquota (será ignorada)
  true    // SEM IMPOSTOS = true
)

console.log('\n📊 Resultado SEM impostos:')
console.log(`  - Subtotal Bruto: R$ ${itemSemImpostos.subtotal_bruto}`)
console.log(`  - Subtotal Líquido: R$ ${itemSemImpostos.subtotal_liquido}`)
console.log(`  - IPI: R$ ${itemSemImpostos.ipi_valor}`)
console.log(`  - ICMS: R$ ${itemSemImpostos.icms_valor}`)
console.log(`  - ST: R$ ${itemSemImpostos.st_valor}`)
console.log(`  - Total: R$ ${itemSemImpostos.total_item}`)

// Verificações
const teste1Passou = 
  itemSemImpostos.ipi_valor === 0 &&
  itemSemImpostos.icms_valor === 0 &&
  itemSemImpostos.st_valor === 0 &&
  itemSemImpostos.total_item === itemSemImpostos.subtotal_liquido

if (teste1Passou) {
  console.log('✅ TESTE 1 PASSOU: Todos os impostos foram zerados corretamente')
} else {
  console.log('❌ TESTE 1 FALHOU: Impostos não foram zerados corretamente')
}

// ============================================================================
// TESTE 2: Múltiplos itens sem impostos
// ============================================================================
console.log('\n🧪 TESTE 2: Calcular múltiplos itens sem impostos')

const itens = [
  {
    produto_id: 1,
    produto_nome: 'Produto A',
    quantidade: 2,
    preco_unitario: 100,
    ipi_aliquota: 10,
    icms_aliquota: 18,
    st_aliquota: 83.63,
    icms_proprio_aliquota: 4
  },
  {
    produto_id: 2,
    produto_nome: 'Produto B',
    quantidade: 1,
    preco_unitario: 50,
    ipi_aliquota: 5,
    icms_aliquota: 18,
    st_aliquota: 50,
    icms_proprio_aliquota: 4
  }
]

const itensComImpostos = calcularItensVenda(itens, 10, false)
const itensSemImpostos = calcularItensVenda(itens, 10, true)

console.log('\n📊 Resultado COM impostos:')
const totalImpostosComImpostos = itensComImpostos.reduce((sum, item) => 
  sum + item.ipi_valor + item.st_valor, 0
)
console.log(`  - Total de impostos (IPI + ST): R$ ${totalImpostosComImpostos.toFixed(2)}`)
console.log(`  - Total geral: R$ ${itensComImpostos.reduce((sum, item) => sum + item.total_item, 0).toFixed(2)}`)

console.log('\n📊 Resultado SEM impostos:')
const totalImpostosSemImpostos = itensSemImpostos.reduce((sum, item) => 
  sum + item.ipi_valor + item.st_valor, 0
)
console.log(`  - Total de impostos (IPI + ST): R$ ${totalImpostosSemImpostos.toFixed(2)}`)
console.log(`  - Total geral: R$ ${itensSemImpostos.reduce((sum, item) => sum + item.total_item, 0).toFixed(2)}`)

// Verificações
const teste2Passou = itensSemImpostos.every(item => 
  item.ipi_valor === 0 && 
  item.icms_valor === 0 && 
  item.st_valor === 0
)

if (teste2Passou) {
  console.log('✅ TESTE 2 PASSOU: Todos os impostos foram zerados para todos os itens')
} else {
  console.log('❌ TESTE 2 FALHOU: Alguns itens ainda têm impostos')
}

// ============================================================================
// TESTE 3: Comparação de valores
// ============================================================================
console.log('\n🧪 TESTE 3: Comparar valores COM e SEM impostos')

const valorComImpostos = itensComImpostos.reduce((sum, item) => sum + item.total_item, 0)
const valorSemImpostos = itensSemImpostos.reduce((sum, item) => sum + item.total_item, 0)
const diferencaImpostos = valorComImpostos - valorSemImpostos

console.log(`\n💰 Análise financeira:`)
console.log(`  - Valor COM impostos: R$ ${valorComImpostos.toFixed(2)}`)
console.log(`  - Valor SEM impostos: R$ ${valorSemImpostos.toFixed(2)}`)
console.log(`  - Economia de impostos: R$ ${diferencaImpostos.toFixed(2)}`)

const teste3Passou = valorSemImpostos < valorComImpostos && diferencaImpostos > 0

if (teste3Passou) {
  console.log('✅ TESTE 3 PASSOU: Valor sem impostos é menor que com impostos')
} else {
  console.log('❌ TESTE 3 FALHOU: Valores não estão corretos')
}

// ============================================================================
// RESUMO DOS TESTES
// ============================================================================
console.log('\n' + '='.repeat(70))
console.log('📋 RESUMO DOS TESTES')
console.log('='.repeat(70))

const todosPassaram = teste1Passou && teste2Passou && teste3Passou

if (todosPassaram) {
  console.log('✅ TODOS OS TESTES PASSARAM!')
  console.log('A funcionalidade de vendas sem impostos está funcionando corretamente.')
} else {
  console.log('❌ ALGUNS TESTES FALHARAM')
  console.log(`  - Teste 1 (Item individual): ${teste1Passou ? '✅' : '❌'}`)
  console.log(`  - Teste 2 (Múltiplos itens): ${teste2Passou ? '✅' : '❌'}`)
  console.log(`  - Teste 3 (Comparação valores): ${teste3Passou ? '✅' : '❌'}`)
}

console.log('='.repeat(70))

// Para executar este teste:
// npx ts-node lib/__tests__/sem-impostos.test.ts
