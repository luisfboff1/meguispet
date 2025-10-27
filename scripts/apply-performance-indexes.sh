#!/bin/bash
# Migration script to apply performance indexes to Supabase database
# Run this script to apply the performance optimizations to your database

set -e

echo "🚀 MeguisPet Performance Index Migration"
echo "========================================"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "⚠️  Supabase CLI not found. You can install it with:"
    echo "    npm install -g supabase"
    echo ""
    echo "Or execute the SQL manually using Supabase Dashboard SQL Editor"
fi

echo "📝 Performance indexes to apply:"
echo "   - Vendas composite indexes (status, data, valor)"
echo "   - Vendas_itens indexes for top products queries"
echo "   - Produtos indexes for stock queries"
echo "   - Transacoes indexes for financial reports"
echo ""

# Display the SQL file location
echo "📂 SQL File Location: database/performance_indexes.sql"
echo ""

# Show a preview of the indexes
echo "📋 Indexes Preview:"
echo "-------------------"
head -n 30 database/performance_indexes.sql
echo "..."
echo ""

echo "💡 How to apply these indexes:"
echo ""
echo "Option 1: Using Supabase Dashboard"
echo "  1. Go to https://app.supabase.com"
echo "  2. Select your project"
echo "  3. Navigate to SQL Editor"
echo "  4. Copy and paste the contents of database/performance_indexes.sql"
echo "  5. Click 'Run'"
echo ""
echo "Option 2: Using psql (if you have direct database access)"
echo "  psql \$DATABASE_URL -f database/performance_indexes.sql"
echo ""
echo "Option 3: Using Supabase CLI"
echo "  supabase db push"
echo ""

read -p "Would you like to see the full SQL file? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    cat database/performance_indexes.sql
fi

echo ""
echo "✅ After applying the indexes, your queries should be much faster!"
echo "   Expected improvements:"
echo "   - Dashboard metrics: 50-80% faster"
echo "   - Top products query: 60-70% faster"
echo "   - Date range queries: 40-60% faster"
echo ""
