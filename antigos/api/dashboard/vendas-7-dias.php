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
    
    // Buscar vendas dos últimos 7 dias
    $sql = "SELECT 
                DATE(data_venda) as data,
                COUNT(*) as vendas,
                COALESCE(SUM(CAST(valor_final AS DECIMAL(10,2))), 0) as receita
            FROM vendas 
            WHERE data_venda >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            AND status != 'cancelado'
            GROUP BY DATE(data_venda)
            ORDER BY data_venda ASC";
    
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $resultados = $stmt->fetchAll();
    
    // Preencher dias sem vendas com zeros
    $dados = [];
    for ($i = 6; $i >= 0; $i--) {
        $data = date('Y-m-d', strtotime("-$i days"));
        $encontrado = false;
        
        foreach ($resultados as $resultado) {
            if ($resultado['data'] === $data) {
                $dados[] = [
                    'data' => $data,
                    'vendas' => (int)$resultado['vendas'],
                    'receita' => (float)$resultado['receita']
                ];
                $encontrado = true;
                break;
            }
        }
        
        if (!$encontrado) {
            $dados[] = [
                'data' => $data,
                'vendas' => 0,
                'receita' => 0
            ];
        }
    }
    
    echo json_encode([
        'success' => true,
        'data' => $dados
    ]);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erro no servidor: ' . $e->getMessage()
    ]);
}
?>
