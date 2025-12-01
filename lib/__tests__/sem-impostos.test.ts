/**
 * TESTE DO CÁLCULO SEM IMPOSTOS
 *
 * Este arquivo testa a funcionalidade de vendas sem impostos.
 * - sem_impostos = true: todos os impostos (IPI, ICMS, ST) são zerados (DEPRECADO)
 * - sem_ipi = true: apenas IPI é zerado
 * - sem_st = true: apenas ST é zerado
 */

import { calcularItemVenda, calcularItensVenda } from '@/services/vendaCalculations'

// ============================================================================
// TESTE 1: Item individual sem impostos (modo legado)
// ============================================================================

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

const itemSemImpostos = calcularItemVenda(
  100,    // preço unitário
  2,      // quantidade
  10,     // IPI alíquota (será ignorada)
  18,     // ICMS alíquota (será ignorada)
  83.63,  // ST/MVA alíquota (será ignorada)
  0,      // desconto proporcional
  4,      // ICMS próprio alíquota (será ignorada)
  true    // SEM IMPOSTOS = true (modo legado)
)

// Verificações
const teste1Passou =
  itemSemImpostos.ipi_valor === 0 &&
  itemSemImpostos.icms_valor === 0 &&
  itemSemImpostos.st_valor === 0 &&
  itemSemImpostos.total_item === itemSemImpostos.subtotal_liquido

// ============================================================================
// TESTE 2: Múltiplos itens sem impostos (modo legado)
// ============================================================================

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

// Verificações
const teste2Passou = itensSemImpostos.every(item =>
  item.ipi_valor === 0 &&
  item.icms_valor === 0 &&
  item.st_valor === 0
)

// ============================================================================
// TESTE 3: Comparação de valores
// ============================================================================

const valorComImpostos = itensComImpostos.reduce((sum, item) => sum + item.total_item, 0)
const valorSemImpostos = itensSemImpostos.reduce((sum, item) => sum + item.total_item, 0)
const diferencaImpostos = valorComImpostos - valorSemImpostos

const teste3Passou = valorSemImpostos < valorComImpostos && diferencaImpostos > 0

// ============================================================================
// TESTE 4: Sem IPI apenas (nova funcionalidade)
// ============================================================================

const itemSemIpiApenas = calcularItemVenda(
  100,    // preço unitário
  2,      // quantidade
  10,     // IPI alíquota (será ignorada)
  18,     // ICMS alíquota (calculada normalmente)
  83.63,  // ST/MVA alíquota (calculada normalmente)
  0,      // desconto proporcional
  4,      // ICMS próprio alíquota
  false,  // SEM IMPOSTOS = false
  true,   // SEM IPI = true
  false   // SEM ST = false
)

const teste4Passou =
  itemSemIpiApenas.ipi_valor === 0 &&
  itemSemIpiApenas.st_valor > 0 &&
  itemSemIpiApenas.icms_valor > 0

// ============================================================================
// TESTE 5: Sem ST apenas (nova funcionalidade)
// ============================================================================

const itemSemStApenas = calcularItemVenda(
  100,    // preço unitário
  2,      // quantidade
  10,     // IPI alíquota (calculada normalmente)
  18,     // ICMS alíquota (calculada normalmente)
  83.63,  // ST/MVA alíquota (será ignorada)
  0,      // desconto proporcional
  4,      // ICMS próprio alíquota
  false,  // SEM IMPOSTOS = false
  false,  // SEM IPI = false
  true    // SEM ST = true
)

const teste5Passou =
  itemSemStApenas.ipi_valor > 0 &&
  itemSemStApenas.st_valor === 0 &&
  itemSemStApenas.icms_valor > 0

// ============================================================================
// TESTE 6: Sem IPI e Sem ST juntos (nova funcionalidade)
// ============================================================================

const itemSemIpiESt = calcularItemVenda(
  100,    // preço unitário
  2,      // quantidade
  10,     // IPI alíquota (será ignorada)
  18,     // ICMS alíquota (calculada normalmente)
  83.63,  // ST/MVA alíquota (será ignorada)
  0,      // desconto proporcional
  4,      // ICMS próprio alíquota
  false,  // SEM IMPOSTOS = false
  true,   // SEM IPI = true
  true    // SEM ST = true
)

const teste6Passou =
  itemSemIpiESt.ipi_valor === 0 &&
  itemSemIpiESt.st_valor === 0 &&
  itemSemIpiESt.icms_valor > 0 && // ICMS é sempre calculado (informativo)
  itemSemIpiESt.total_item === itemSemIpiESt.subtotal_liquido

// ============================================================================
// TESTE 7: Múltiplos itens com configurações individuais (nova funcionalidade)
// ============================================================================

const itensSemIpiApenas = calcularItensVenda(itens, 10, false, true, false)
const itensSemStApenas = calcularItensVenda(itens, 10, false, false, true)
const itensSemIpiESt = calcularItensVenda(itens, 10, false, true, true)

const teste7Passou =
  // Sem IPI apenas: IPI = 0, ST > 0
  itensSemIpiApenas.every(item => item.ipi_valor === 0 && item.st_valor > 0) &&
  // Sem ST apenas: IPI > 0, ST = 0
  itensSemStApenas.every(item => item.ipi_valor > 0 && item.st_valor === 0) &&
  // Sem IPI e ST: ambos = 0
  itensSemIpiESt.every(item => item.ipi_valor === 0 && item.st_valor === 0)

// ============================================================================
// RESUMO DOS TESTES
// ============================================================================

const todosPassaram = teste1Passou && teste2Passou && teste3Passou && teste4Passou && teste5Passou && teste6Passou && teste7Passou

// Export test results for potential use
export { teste1Passou, teste2Passou, teste3Passou, teste4Passou, teste5Passou, teste6Passou, teste7Passou, todosPassaram }

// Para executar este teste:
// npx ts-node lib/__tests__/sem-impostos.test.ts
