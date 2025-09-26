<?php
// 🔍 DEBUG SIMPLES - Verificar dados
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "=== DEBUG SIMPLES ===\n";

try {
    require_once __DIR__ . '/config.php';
    require_once __DIR__ . '/jwt_helper.php';
    
    // Autenticação
    $auth = require_auth();
    echo "✅ Usuário autenticado: {$auth['email']}\n";
    
    $conn = getDbConnection();
    
    // 1. Verificar vendas
    echo "\n1. VENDAS:\n";
    $stmt = $conn->query("SELECT COUNT(*) as total FROM vendas");
    $total_vendas = $stmt->fetchColumn();
    echo "Total vendas: $total_vendas\n";
    
    if ($total_vendas > 0) {
        $stmt = $conn->query("SELECT id, numero_venda, valor_total, status, data_venda FROM vendas LIMIT 3");
        $vendas = $stmt->fetchAll();
        foreach ($vendas as $v) {
            echo "  - ID: {$v['id']}, Número: {$v['numero_venda']}, Total: R$ {$v['valor_total']}, Status: {$v['status']}\n";
        }
    }
    
    // 2. Verificar clientes
    echo "\n2. CLIENTES:\n";
    $stmt = $conn->query("SELECT COUNT(*) as total FROM clientes_fornecedores");
    $total_clientes = $stmt->fetchColumn();
    echo "Total clientes: $total_clientes\n";
    
    // 3. Verificar vendedores
    echo "\n3. VENDEDORES:\n";
    $stmt = $conn->query("SELECT COUNT(*) as total FROM vendedores");
    $total_vendedores = $stmt->fetchColumn();
    echo "Total vendedores: $total_vendedores\n";
    
    // 4. Verificar produtos
    echo "\n4. PRODUTOS:\n";
    $stmt = $conn->query("SELECT COUNT(*) as total FROM produtos");
    $total_produtos = $stmt->fetchColumn();
    echo "Total produtos: $total_produtos\n";
    
    // 5. Testar JOIN vendas + clientes
    echo "\n5. JOIN VENDAS + CLIENTES:\n";
    $stmt = $conn->query("
        SELECT v.id, v.numero_venda, v.valor_total, c.nome as cliente_nome
        FROM vendas v 
        LEFT JOIN clientes_fornecedores c ON v.cliente_id = c.id 
        LIMIT 3
    ");
    $vendas_join = $stmt->fetchAll();
    echo "Vendas com JOIN: " . count($vendas_join) . "\n";
    foreach ($vendas_join as $v) {
        echo "  - ID: {$v['id']}, Cliente: {$v['cliente_nome']}, Total: R$ {$v['valor_total']}\n";
    }
    
    echo "\n=== DEBUG COMPLETO ===\n";
    
} catch (Exception $e) {
    echo "\n❌ ERRO: " . $e->getMessage() . "\n";
    echo "Arquivo: " . $e->getFile() . "\n";
    echo "Linha: " . $e->getLine() . "\n";
}
?>
