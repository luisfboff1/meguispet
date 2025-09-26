<?php
// 🧪 TESTE DAS APIs - Verificar se estão funcionando
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "=== TESTE DAS APIs ===\n";

try {
    require_once __DIR__ . '/config.php';
    require_once __DIR__ . '/jwt_helper.php';
    
    // Autenticação
    $auth = require_auth();
    echo "✅ Usuário autenticado: {$auth['email']}\n";
    
    $conn = getDbConnection();
    
    // 1. Testar API de vendas
    echo "\n1. TESTANDO API DE VENDAS:\n";
    $_GET['page'] = 1;
    $_GET['limit'] = 5;
    $_SERVER['REQUEST_METHOD'] = 'GET';
    
    ob_start();
    include __DIR__ . '/vendas.php';
    $vendas_output = ob_get_clean();
    
    $vendas_data = json_decode($vendas_output, true);
    if ($vendas_data && $vendas_data['success']) {
        echo "✅ API de vendas funcionando\n";
        echo "Total vendas retornadas: " . count($vendas_data['data']) . "\n";
        if (count($vendas_data['data']) > 0) {
            $primeira_venda = $vendas_data['data'][0];
            echo "Primeira venda: ID {$primeira_venda['id']}, Cliente: {$primeira_venda['cliente']['nome']}\n";
        }
    } else {
        echo "❌ API de vendas com problema\n";
        echo "Resposta: $vendas_output\n";
    }
    
    // 2. Testar API de métricas
    echo "\n2. TESTANDO API DE MÉTRICAS:\n";
    ob_start();
    include __DIR__ . '/dashboard/metrics.php';
    $metrics_output = ob_get_clean();
    
    $metrics_data = json_decode($metrics_output, true);
    if ($metrics_data && $metrics_data['success']) {
        echo "✅ API de métricas funcionando\n";
        echo "Métricas retornadas: " . count($metrics_data['data']) . "\n";
        foreach ($metrics_data['data'] as $metric) {
            echo "  - {$metric['title']}: {$metric['value']}\n";
        }
    } else {
        echo "❌ API de métricas com problema\n";
        echo "Resposta: $metrics_output\n";
    }
    
    // 3. Testar API de produtos top
    echo "\n3. TESTANDO API DE PRODUTOS TOP:\n";
    ob_start();
    include __DIR__ . '/dashboard/top-products.php';
    $products_output = ob_get_clean();
    
    $products_data = json_decode($products_output, true);
    if ($products_data && $products_data['success']) {
        echo "✅ API de produtos top funcionando\n";
        echo "Produtos retornados: " . count($products_data['data']) . "\n";
    } else {
        echo "❌ API de produtos top com problema\n";
        echo "Resposta: $products_output\n";
    }
    
    echo "\n=== TESTE COMPLETO ===\n";
    
} catch (Exception $e) {
    echo "\n❌ ERRO: " . $e->getMessage() . "\n";
    echo "Arquivo: " . $e->getFile() . "\n";
    echo "Linha: " . $e->getLine() . "\n";
}
?>
