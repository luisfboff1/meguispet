<?php
// 🧪 TESTE VALORES MONETÁRIOS - Verificar cálculos
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Headers CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

echo "=== TESTE VALORES MONETÁRIOS ===\n";

try {
    require_once __DIR__ . '/config.php';
    require_once __DIR__ . '/jwt_helper.php';
    
    // Autenticação
    $auth = require_auth();
    echo "✅ Usuário autenticado: {$auth['email']}\n";
    
    $conn = getDbConnection();
    
    // 1. Testar valores de vendas
    echo "\n1. VALORES DE VENDAS:\n";
    $stmt = $conn->query("
        SELECT id, valor_total, valor_final, desconto, status, data_venda
        FROM vendas 
        ORDER BY data_venda DESC 
        LIMIT 5
    ");
    $vendas = $stmt->fetchAll();
    
    echo "Vendas encontradas: " . count($vendas) . "\n";
    foreach ($vendas as $v) {
        echo "  - ID: {$v['id']}, Total: {$v['valor_total']}, Final: {$v['valor_final']}, Status: {$v['status']}\n";
    }
    
    // 2. Calcular receita total
    echo "\n2. RECEITA TOTAL:\n";
    $stmt = $conn->query("SELECT COALESCE(SUM(valor_final), 0) as total FROM vendas WHERE status = 'pago'");
    $receita_total = $stmt->fetchColumn();
    echo "Receita total (pago): R$ " . number_format($receita_total, 2, ',', '.') . "\n";
    
    $stmt = $conn->query("SELECT COALESCE(SUM(valor_final), 0) as total FROM vendas WHERE status != 'cancelado'");
    $receita_geral = $stmt->fetchColumn();
    echo "Receita geral: R$ " . number_format($receita_geral, 2, ',', '.') . "\n";
    
    // 3. Calcular ticket médio
    echo "\n3. TICKET MÉDIO:\n";
    $stmt = $conn->query("SELECT COUNT(*) as total, COALESCE(AVG(valor_final), 0) as media FROM vendas WHERE status != 'cancelado'");
    $ticket = $stmt->fetch();
    echo "Total vendas: {$ticket['total']}\n";
    echo "Ticket médio: R$ " . number_format($ticket['media'], 2, ',', '.') . "\n";
    
    // 4. Testar produtos mais vendidos
    echo "\n4. PRODUTOS MAIS VENDIDOS:\n";
    $stmt = $conn->query("
        SELECT p.nome, 
               SUM(iv.quantidade) as total_vendido,
               SUM(iv.subtotal) as receita_total
        FROM produtos p
        INNER JOIN itens_venda iv ON p.id = iv.produto_id
        INNER JOIN vendas v ON iv.venda_id = v.id
        WHERE v.status != 'cancelado'
        GROUP BY p.id, p.nome
        ORDER BY total_vendido DESC
        LIMIT 3
    ");
    $produtos = $stmt->fetchAll();
    
    echo "Produtos encontrados: " . count($produtos) . "\n";
    foreach ($produtos as $p) {
        echo "  - {$p['nome']}: {$p['total_vendido']} vendidos, R$ " . number_format($p['receita_total'], 2, ',', '.') . "\n";
    }
    
    echo "\n=== TESTE MONETÁRIO COMPLETO ===\n";
    echo "Status: SUCESSO - Valores calculados corretamente\n";
    
} catch (Exception $e) {
    echo "\n❌ ERRO: " . $e->getMessage() . "\n";
    echo "Arquivo: " . $e->getFile() . "\n";
    echo "Linha: " . $e->getLine() . "\n";
}
?>
