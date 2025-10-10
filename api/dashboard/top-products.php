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
    
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
    $periodo = isset($_GET['periodo']) ? $_GET['periodo'] : '30'; // dias
    
    // Produtos mais vendidos no período
    $sql = "SELECT p.id, p.nome, p.preco_venda, p.estoque,
                   SUM(iv.quantidade) as total_vendido,
                   SUM(iv.subtotal) as receita_total,
                   COUNT(DISTINCT v.id) as total_vendas
            FROM produtos p
            INNER JOIN itens_venda iv ON p.id = iv.produto_id
            INNER JOIN vendas v ON iv.venda_id = v.id
            WHERE v.status != 'cancelado'
            AND v.data_venda >= DATE_SUB(CURRENT_DATE(), INTERVAL :periodo DAY)
            AND p.ativo = TRUE
            GROUP BY p.id, p.nome, p.preco_venda, p.estoque
            ORDER BY total_vendido DESC
            LIMIT :limit";
    
    $stmt = $conn->prepare($sql);
    $stmt->bindValue(':periodo', $periodo, PDO::PARAM_INT);
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->execute();
    
    $produtos = $stmt->fetchAll();
    
    // Formatar dados para o frontend
    $produtos_formatados = [];
    foreach ($produtos as $produto) {
        $produtos_formatados[] = [
            'id' => (int)$produto['id'],
            'nome' => $produto['nome'],
            'preco' => (float)$produto['preco_venda'], // Mantém 'preco' para compatibilidade com frontend
            'preco_venda' => (float)$produto['preco_venda'],
            'estoque' => (int)$produto['estoque'],
            'vendas' => (int)$produto['total_vendido'],
            'receita' => (float)$produto['receita_total'],
            'total_vendas' => (int)$produto['total_vendas']
        ];
    }
    
    echo json_encode([
        'success' => true,
        'data' => $produtos_formatados
    ]);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erro no servidor: ' . $e->getMessage()
    ]);
}
?>
