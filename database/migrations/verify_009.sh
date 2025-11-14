#!/bin/bash

# ============================================================================
# Migration 009 Verification Script
# ============================================================================
# This script verifies that migration 009 was successfully applied
# Run this after applying the migration to ensure everything is correct
# ============================================================================

set -e

echo "🔍 Verificando Migration 009: origem_venda e uf_destino"
echo "========================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "database/migrations/009_add_vendas_origem_uf_columns.sql" ]; then
    echo -e "${RED}❌ Erro: Execute este script do diretório raiz do projeto${NC}"
    exit 1
fi

echo "📋 Checklist de Verificação:"
echo ""

# 1. Check if Supabase CLI is available
echo -n "1. Supabase CLI instalado... "
if command -v supabase &> /dev/null; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⚠ Não encontrado${NC}"
    echo "   Instale com: scoop install supabase (Windows) ou brew install dopplerhq/cli/doppler (macOS)"
fi

# 2. Check if we're linked to a project
echo -n "2. Projeto Supabase linkado... "
if [ -f ".git/config" ] && grep -q "supabase" .git/config 2>/dev/null; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⚠ Execute: supabase link --project-ref jhodhxvvhohygijqcxbo${NC}"
fi

# 3. Check migration file exists
echo -n "3. Arquivo de migration existe... "
if [ -f "database/migrations/009_add_vendas_origem_uf_columns.sql" ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}❌ Arquivo não encontrado${NC}"
    exit 1
fi

echo ""
echo "🗄️  Para verificar se a migration foi aplicada no banco de dados,"
echo "    execute as seguintes queries no Supabase Dashboard SQL Editor:"
echo ""
echo "-- 1. Verificar se as colunas existem"
echo "SELECT column_name, data_type, character_maximum_length"
echo "FROM information_schema.columns"
echo "WHERE table_name = 'vendas'"
echo "AND column_name IN ('origem_venda', 'uf_destino');"
echo ""
echo "-- 2. Verificar se os índices foram criados"
echo "SELECT indexname, indexdef"
echo "FROM pg_indexes"
echo "WHERE tablename = 'vendas'"
echo "AND indexname IN ('idx_vendas_origem', 'idx_vendas_uf_destino');"
echo ""
echo "-- 3. Verificar dados atualizados"
echo "SELECT origem_venda, uf_destino, COUNT(*) as quantidade"
echo "FROM vendas"
echo "GROUP BY origem_venda, uf_destino"
echo "ORDER BY quantidade DESC;"
echo ""
echo "✅ Resultados Esperados:"
echo "   - Query 1 deve retornar 2 linhas (origem_venda e uf_destino)"
echo "   - Query 2 deve retornar 2 linhas (2 índices)"
echo "   - Query 3 deve mostrar dados com origem_venda preenchida"
echo ""
echo "🚀 Para aplicar a migration (se ainda não foi aplicada):"
echo "   supabase db push"
echo ""
echo "📚 Para mais informações, consulte:"
echo "   - database/migrations/009_APPLY_INSTRUCTIONS.md"
echo "   - docs/04-features/relatorios/SITUACAO_ATUAL.md"
echo ""
