# Progresso da Implementação ICMS-ST - MeguisPet

## ✅ Fase 1: Banco de Dados (COMPLETO)

### Arquivos Criados:
- ✅ `database/migrations/002_icms_st_schema.sql` - Schema completo das tabelas
- ✅ `database/migrations/003_icms_st_seed_data.sql` - Dados de todos os estados brasileiros

### Tabelas Criadas:
1. **tabela_mva** - Tabela de MVA e alíquotas por UF e NCM
   - Índices para performance (uf, ncm, ativo, uf+ncm)
   - Trigger para updated_at
   - Constraint UNIQUE em (uf, ncm)
   - RLS habilitado com policies

2. **impostos_produto** - Configuração fiscal por produto
   - Relacionamento com produtos (CASCADE DELETE)
   - Relacionamento com tabela_mva
   - Campos para override manual (mva_manual, aliquota_icms_manual)
   - Índices para performance
   - RLS habilitado com policies

3. **vendas_impostos** - Impostos calculados por venda
   - Relacionamento com vendas (CASCADE DELETE)
   - Totalizadores de impostos
   - Opções de exibição no PDF
   - Constraint UNIQUE em venda_id
   - RLS habilitado com policies

4. **vendas_itens** - Campos adicionados:
   - base_calculo_st
   - icms_proprio
   - icms_st_total
   - icms_st_recolher
   - mva_aplicado
   - aliquota_icms

### Seed Data:
- ✅ 27 estados brasileiros populados com dados reais de MVA para NCM 2309 (rações pet)
- Estados com ST: AC, AL, AM, AP, CE, DF, ES, MA, MG, MS, MT, PA, PB, PE, PI, PR, RJ, RR, RS, SE, SP, TO
- Estados SEM ST: BA, GO, RN, RO, SC

---

## ✅ Fase 2: TypeScript Types (COMPLETO)

### Arquivo Atualizado:
- ✅ `types/index.ts` - Adicionados 7 interfaces novas

### Interfaces Criadas:
1. **TabelaMva** - Representa registro da tabela MVA
2. **TabelaMvaForm** - Form data para criar/editar MVA
3. **ImpostoProduto** - Configuração fiscal de produto
4. **ImpostoProdutoForm** - Form data para impostos de produto
5. **VendaImposto** - Impostos calculados de uma venda
6. **VendaImpostoForm** - Form data para impostos de venda
7. **CalculoImpostoInput** - Input para cálculo de impostos
8. **CalculoImpostoResult** - Resultado do cálculo de impostos

### Interface Atualizada:
- **ItemVenda** - Adicionados 6 campos opcionais de impostos

---

## ✅ Fase 3: Utilitários de Cálculo (COMPLETO)

### Arquivo Criado:
- ✅ `lib/icms-calculator.ts` - Biblioteca completa de cálculos ICMS-ST

### Funções Implementadas:

1. **calcularICMSST()** - Cálculo principal de ICMS-ST
   - Formula: Base ST = (Valor + Frete + Despesas) × (1 + MVA)
   - Retorna: base_calculo_st, icms_proprio, icms_st_total, icms_st_recolher

2. **calcularICMSSTVendaCompleta()** - Cálculo para múltiplos itens
   - Processa array de itens
   - Retorna totalizadores consolidados
   - Retorna cálculos individuais por item

3. **isSujeitoST()** - Verifica se UF/NCM está sujeito a ST
   - Usa tabela_mva se disponível
   - Fallback para estados conhecidos

4. **getMVAValue()** - Obtém MVA com prioridade
   - Prioridade 1: mva_manual
   - Prioridade 2: tabela_mva.mva
   - Fallback: 0

5. **getAliquotaICMS()** - Obtém alíquota ICMS com prioridade
   - Prioridade 1: aliquota_manual
   - Prioridade 2: tabela_mva.aliquota_efetiva
   - Prioridade 3: tabela_mva.aliquota_interna
   - Fallback: 0.18 (18%)

6. **formatPercentage()** - Formata percentual (0.18 → "18%")
7. **formatCurrency()** - Formata moeda (1000 → "R$ 1.000,00")

### Exemplo de Uso:
```typescript
const result = calcularICMSST({
  valor_mercadoria: 1000,
  frete: 100,
  outras_despesas: 0,
  mva: 0.40,
  aliquota_icms: 0.18
})
// Retorna: base_calculo_st: 1540.00, icms_st_recolher: 79.20
```

---

## 📋 Próximas Fases (Pendentes)

### Fase 4: Services API
- [ ] `services/tabelaMvaService.ts` - CRUD de tabela MVA
- [ ] `services/impostosService.ts` - CRUD de impostos por produto
- [ ] `services/vendasImpostosService.ts` - CRUD de impostos de vendas

### Fase 5: Componentes UI
- [ ] `components/icms/TabelaMvaList.tsx` - Listagem de MVA
- [ ] `components/icms/ImpostoProdutoCard.tsx` - Card de impostos do produto
- [ ] `components/icms/CalculadoraICMS.tsx` - Calculadora visual

### Fase 6: Forms
- [ ] `components/forms/ImpostoProdutoForm.tsx` - Form de configuração fiscal
- [ ] Integrar com `ProdutoForm.tsx` existente

### Fase 7: Integração com Vendas
- [ ] Adicionar cálculo automático de impostos ao criar venda
- [ ] Salvar impostos calculados em `vendas_impostos`
- [ ] Atualizar `vendas_itens` com valores individuais

### Fase 8: Modal Preview
- [ ] Adicionar toggle de impostos no `VendaPDFPreviewModal.tsx`
- [ ] Exibir informações fiscais na pré-visualização

### Fase 9: Geração de PDF
- [ ] Atualizar `lib/pdf-generator.ts` para incluir impostos
- [ ] Adicionar seção fiscal opcional no PDF

### Fase 10: Testes
- [ ] Testes unitários dos cálculos
- [ ] Testes de integração com vendas
- [ ] Validação com casos reais

---

## 📊 Status Geral

- **Banco de Dados**: ✅ 100%
- **TypeScript Types**: ✅ 100%
- **Calculadora ICMS**: ✅ 100%
- **Services**: ⏳ 0%
- **UI Components**: ⏳ 0%
- **Forms**: ⏳ 0%
- **Integração Vendas**: ⏳ 0%
- **PDF Generator**: ⏳ 0%
- **Testes**: ⏳ 0%

**Progresso Total**: 30% ✅

---

## 🚀 Para Continuar

### Executar Migrations no Supabase:
```sql
-- Execute no SQL Editor do Supabase:
-- 1. Copiar conteúdo de 002_icms_st_schema.sql
-- 2. Executar
-- 3. Copiar conteúdo de 003_icms_st_seed_data.sql
-- 4. Executar
```

### Próximo Passo:
Implementar os services (tabelaMvaService, impostosService, vendasImpostosService) para comunicação com o Supabase.

---

**Última Atualização**: 2025-01-07
