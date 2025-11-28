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
  true    // SEM IMPOSTOS = true
)

// Verificações
const teste1Passou =
  itemSemImpostos.ipi_valor === 0 &&
  itemSemImpostos.icms_valor === 0 &&
  itemSemImpostos.st_valor === 0 &&
  itemSemImpostos.total_item === itemSemImpostos.subtotal_liquido

// ============================================================================
// TESTE 2: Múltiplos itens sem impostos
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
// RESUMO DOS TESTES
// ============================================================================

const todosPassaram = teste1Passou && teste2Passou && teste3Passou

// Export test results for potential use
export { teste1Passou, teste2Passou, teste3Passou, todosPassaram }

// Para executar este teste:
// npx ts-node lib/__tests__/sem-impostos.test.ts
