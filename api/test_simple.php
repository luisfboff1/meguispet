<?php
// 🧪 TESTE SIMPLES - Verificar se APIs estão funcionando
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Headers CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

echo "=== TESTE SIMPLES DAS APIs ===\n";

try {
    require_once __DIR__ . '/config.php';
    require_once __DIR__ . '/jwt_helper.php';
    
    // Autenticação
    $auth = require_auth();
    echo "✅ Usuário autenticado: {$auth['email']}\n";
    
    $conn = getDbConnection();
    
    // 1. Contar vendas
    $stmt = $conn->query("SELECT COUNT(*) as total FROM vendas");
    $total_vendas = $stmt->fetchColumn();
    echo "Total vendas no banco: $total_vendas\n";
    
    // 2. Testar query de vendas com JOIN
    $stmt = $conn->query("
        SELECT v.id, v.numero_venda, v.valor_final, v.status, v.data_venda,
               c.nome as cliente_nome,
               vd.nome as vendedor_nome
        FROM vendas v
        LEFT JOIN clientes_fornecedores c ON v.cliente_id = c.id
        LEFT JOIN vendedores vd ON v.vendedor_id = vd.id
        ORDER BY v.data_venda DESC
        LIMIT 3
    ");
    $vendas = $stmt->fetchAll();
    
    echo "Vendas com JOIN: " . count($vendas) . "\n";
    foreach ($vendas as $v) {
        echo "  - ID: {$v['id']}, Cliente: {$v['cliente_nome']}, Total: R$ {$v['valor_final']}\n";
    }
    
    // 3. Testar métricas
    $stmt = $conn->query("SELECT COUNT(*) as total FROM vendas WHERE status != 'cancelado'");
    $vendas_ativas = $stmt->fetchColumn();
    
    $stmt = $conn->query("SELECT COALESCE(SUM(valor_final), 0) as total FROM vendas WHERE status = 'pago'");
    $receita_total = $stmt->fetchColumn();
    
    echo "Vendas ativas: $vendas_ativas\n";
    echo "Receita total: R$ $receita_total\n";
    
    echo "\n=== TESTE CONCLUÍDO ===\n";
    echo "Status: SUCESSO - APIs devem estar funcionando\n";
    
} catch (Exception $e) {
    echo "\n❌ ERRO: " . $e->getMessage() . "\n";
    echo "Arquivo: " . $e->getFile() . "\n";
    echo "Linha: " . $e->getLine() . "\n";
}
?>
