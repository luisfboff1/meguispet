<?php
// Headers CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

// Responder a requisições OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../jwt_helper.php';

// Middleware de autenticação
$auth = require_auth();

try {
    $conn = getDbConnection();
    
    // Métricas gerais
    $metrics = [];
    
    // Total de vendas
    $sql = "SELECT COUNT(*) as total FROM vendas WHERE status != 'cancelado'";
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $metrics['total_vendas'] = $stmt->fetch()['total'];
    
    // Vendas do mês atual
    $sql = "SELECT COUNT(*) as total FROM vendas 
            WHERE status != 'cancelado' 
            AND MONTH(data_venda) = MONTH(CURRENT_DATE()) 
            AND YEAR(data_venda) = YEAR(CURRENT_DATE())";
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $metrics['vendas_mes'] = $stmt->fetch()['total'];
    
    // Receita total
    $sql = "SELECT COALESCE(SUM(CAST(valor_final AS DECIMAL(10,2))), 0) as total FROM vendas WHERE status = 'pago'";
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $metrics['receita_total'] = (float)$stmt->fetch()['total'];
    
    // Receita do mês
    $sql = "SELECT COALESCE(SUM(CAST(valor_final AS DECIMAL(10,2))), 0) as total FROM vendas 
            WHERE status = 'pago' 
            AND MONTH(data_venda) = MONTH(CURRENT_DATE()) 
            AND YEAR(data_venda) = YEAR(CURRENT_DATE())";
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $metrics['receita_mes'] = (float)$stmt->fetch()['total'];
    
    // Total de clientes
    $sql = "SELECT COUNT(*) as total FROM clientes_fornecedores WHERE ativo = TRUE";
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $metrics['total_clientes'] = $stmt->fetch()['total'];
    
    // Total de produtos
    $sql = "SELECT COUNT(*) as total FROM produtos WHERE ativo = TRUE";
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $metrics['total_produtos'] = $stmt->fetch()['total'];
    
    // Produtos com estoque baixo
    $sql = "SELECT COUNT(*) as total FROM produtos WHERE estoque <= estoque_minimo AND ativo = TRUE";
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $metrics['produtos_estoque_baixo'] = $stmt->fetch()['total'];
    
    // Vendas pendentes
    $sql = "SELECT COUNT(*) as total FROM vendas WHERE status = 'pendente'";
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $metrics['vendas_pendentes'] = $stmt->fetch()['total'];
    
    // Comparação com mês anterior
    $sql = "SELECT COALESCE(SUM(valor_final), 0) as total FROM vendas 
            WHERE status = 'pago' 
            AND MONTH(data_venda) = MONTH(CURRENT_DATE() - INTERVAL 1 MONTH) 
            AND YEAR(data_venda) = YEAR(CURRENT_DATE() - INTERVAL 1 MONTH)";
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $receita_mes_anterior = (float)$stmt->fetch()['total'];
    
    if ($receita_mes_anterior > 0) {
        $metrics['crescimento_receita'] = round((($metrics['receita_mes'] - $receita_mes_anterior) / $receita_mes_anterior) * 100, 2);
    } else {
        $metrics['crescimento_receita'] = $metrics['receita_mes'] > 0 ? 100 : 0;
    }
    
    // Transformar métricas para formato esperado pelo frontend
    $metricsFormatted = [
        [
            'title' => 'Total de Vendas',
            'value' => $metrics['total_vendas'],
            'change' => '+12%',
            'changeType' => 'positive',
            'icon' => 'ShoppingCart'
        ],
        [
            'title' => 'Receita Total',
            'value' => 'R$ ' . number_format((float)$metrics['receita_total'], 2, ',', '.'),
            'change' => '+8%',
            'changeType' => 'positive',
            'icon' => 'DollarSign'
        ],
        [
            'title' => 'Total de Clientes',
            'value' => $metrics['total_clientes'],
            'change' => '+5%',
            'changeType' => 'positive',
            'icon' => 'Users'
        ],
        [
            'title' => 'Produtos em Estoque',
            'value' => $metrics['total_produtos'],
            'change' => $metrics['produtos_estoque_baixo'] > 0 ? '-2%' : '+0%',
            'changeType' => $metrics['produtos_estoque_baixo'] > 0 ? 'negative' : 'positive',
            'icon' => 'Package'
        ]
    ];
    
    echo json_encode([
        'success' => true,
        'data' => $metricsFormatted
    ]);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erro no servidor: ' . $e->getMessage()
    ]);
}
?>
