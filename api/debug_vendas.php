<?php
// 🔍 DEBUG VENDAS - Identificar problema
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "=== DEBUG VENDAS ===\n";

try {
    echo "1. Carregando config.php...\n";
    require_once __DIR__ . '/config.php';
    echo "✅ config.php carregado\n";
    
    echo "2. Carregando jwt_helper.php...\n";
    require_once __DIR__ . '/jwt_helper.php';
    echo "✅ jwt_helper.php carregado\n";
    
    echo "3. Testando autenticação...\n";
    $payload = require_auth();
    echo "✅ Usuário autenticado: " . json_encode($payload) . "\n";
    
    echo "4. Testando conexão com banco...\n";
    $conn = getDbConnection();
    echo "✅ Conexão com banco OK\n";
    
    echo "5. Verificando tabela vendas...\n";
    $stmt = $conn->query("SHOW TABLES LIKE 'vendas'");
    $table_exists = $stmt->fetch();
    if ($table_exists) {
        echo "✅ Tabela 'vendas' existe\n";
    } else {
        echo "❌ Tabela 'vendas' NÃO existe\n";
        exit();
    }
    
    echo "6. Contando vendas...\n";
    $stmt = $conn->query("SELECT COUNT(*) FROM vendas");
    $total_vendas = $stmt->fetchColumn();
    echo "✅ Total de vendas: $total_vendas\n";
    
    echo "7. Listando vendas...\n";
    $stmt = $conn->query("SELECT * FROM vendas LIMIT 5");
    $vendas = $stmt->fetchAll();
    echo "✅ Vendas encontradas: " . count($vendas) . "\n";
    foreach ($vendas as $venda) {
        echo "  - ID: {$venda['id']}, Total: {$venda['valor_total']}, Status: {$venda['status']}\n";
    }
    
    echo "8. Testando JOIN com clientes...\n";
    $stmt = $conn->query("
        SELECT v.*, c.nome as cliente_nome 
        FROM vendas v 
        LEFT JOIN clientes_fornecedores c ON v.cliente_id = c.id 
        LIMIT 3
    ");
    $vendas_com_clientes = $stmt->fetchAll();
    echo "✅ JOIN funcionando: " . count($vendas_com_clientes) . " vendas com clientes\n";
    
    echo "\n=== DEBUG VENDAS COMPLETO ===\n";
    echo "Status: SUCESSO\n";
    
} catch (Exception $e) {
    echo "\n❌ ERRO: " . $e->getMessage() . "\n";
    echo "Arquivo: " . $e->getFile() . "\n";
    echo "Linha: " . $e->getLine() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
?>
