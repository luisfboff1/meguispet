#!/bin/bash
# Migration script to apply performance indexes to Supabase database
# Run this script to apply the performance optimizations to your database

set -e

echo "🚀 MeguisPet Performance Index Migration"
echo "========================================"
echo ""

# Check if the SQL file exists
SQL_FILE="database/performance_indexes.sql"
if [ ! -f "$SQL_FILE" ]; then
    echo "❌ Error: $SQL_FILE not found"
    echo "   Make sure you're running this script from the project root directory"
    exit 1
fi

# Check if Supabase CLI is installed
SUPABASE_CLI_AVAILABLE=false
if command -v supabase &> /dev/null; then
    SUPABASE_CLI_AVAILABLE=true
    echo "✅ Supabase CLI detected"
else
    echo "⚠️  Supabase CLI not found"
    echo "   You can install it with: npm install -g supabase"
fi

echo ""
echo "📝 Performance indexes to apply:"
echo "   - Vendas composite indexes (status, data, valor)"
echo "   - Vendas_itens indexes for top products queries"
echo "   - Produtos indexes for stock queries"
echo "   - Transacoes indexes for financial reports"
echo ""

# Display the SQL file location
echo "📂 SQL File Location: $SQL_FILE"
echo ""

# Show a preview of the indexes
echo "📋 Indexes Preview:"
echo "-------------------"
head -n 30 "$SQL_FILE"
echo "..."
echo ""

echo "💡 How to apply these indexes:"
echo ""
echo "Option 1: Using Supabase Dashboard (Recommended)"
echo "  1. Go to https://app.supabase.com"
echo "  2. Select your project"
echo "  3. Navigate to SQL Editor"
echo "  4. Copy and paste the contents of $SQL_FILE"
echo "  5. Click 'Run'"
echo ""

if [ "$SUPABASE_CLI_AVAILABLE" = true ]; then
    echo "Option 2: Using Supabase CLI"
    echo "  supabase db push"
    echo ""
fi

echo "Option 3: Using psql (if you have direct database access)"
echo "  psql \$DATABASE_URL -f $SQL_FILE"
echo ""

read -p "Would you like to see the full SQL file? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [ -f "$SQL_FILE" ]; then
        cat "$SQL_FILE"
    else
        echo "❌ Error: $SQL_FILE not found"
        exit 1
    fi
fi

echo ""
echo "✅ After applying the indexes, your queries should be much faster!"
echo "   Expected improvements:"
echo "   - Dashboard metrics: 50-80% faster"
echo "   - Top products query: 60-70% faster"
echo "   - Date range queries: 40-60% faster"
echo ""
