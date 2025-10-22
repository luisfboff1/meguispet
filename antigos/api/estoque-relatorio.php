<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'config.php';
require_once 'jwt_helper.php';

try {
    $headers = getallheaders();
    $token = isset($headers['Authorization']) ? str_replace('Bearer ', '', $headers['Authorization']) : null;
    
    if (!$token || !validateJWT($token)) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Token inválido']);
        exit();
    }

    $method = $_SERVER['REQUEST_METHOD'];

    if ($method !== 'GET') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Método não permitido']);
        exit();
    }

    // Parâmetros de filtro
    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
    $search = isset($_GET['search']) ? $_GET['search'] : '';
    $categoria = isset($_GET['categoria']) ? $_GET['categoria'] : '';
    $status_estoque = isset($_GET['status_estoque']) ? $_GET['status_estoque'] : '';
    $ordenar_por = isset($_GET['ordenar_por']) ? $_GET['ordenar_por'] : 'nome';
    $ordem = isset($_GET['ordem']) ? $_GET['ordem'] : 'ASC';

    $offset = ($page - 1) * $limit;

    // Construir WHERE clause
    $whereClause = "WHERE 1=1";
    $params = [];
    $paramCount = 1;

    if (!empty($search)) {
        $whereClause .= " AND (nome ILIKE $" . $paramCount . " OR categoria ILIKE $" . $paramCount . " OR codigo_barras ILIKE $" . $paramCount . ")";
        $params[] = "%$search%";
        $paramCount++;
    }

    if (!empty($categoria)) {
        $whereClause .= " AND categoria = $" . $paramCount;
        $params[] = $categoria;
        $paramCount++;
    }

    if (!empty($status_estoque)) {
        switch ($status_estoque) {
            case 'sem_estoque':
                $whereClause .= " AND estoque = 0";
                break;
            case 'estoque_baixo':
                $whereClause .= " AND estoque > 0 AND estoque <= estoque_minimo";
                break;
            case 'estoque_ok':
                $whereClause .= " AND estoque > estoque_minimo";
                break;
        }
    }

    // Validar ordenação
    $allowedSortFields = ['nome', 'categoria', 'estoque', 'preco_venda', 'preco_custo', 'valor_total_custo', 'valor_total_venda', 'margem_lucro', 'margem_percentual'];
    if (!in_array($ordenar_por, $allowedSortFields)) {
        $ordenar_por = 'nome';
    }
    
    $allowedOrders = ['ASC', 'DESC'];
    if (!in_array(strtoupper($ordem), $allowedOrders)) {
        $ordem = 'ASC';
    }

    // Contar total
    $countQuery = "SELECT COUNT(*) FROM estoque_com_valores $whereClause";
    $countStmt = $conn->prepare($countQuery);
    $countStmt->execute($params);
    $total = $countStmt->fetchColumn();

    // Buscar dados
    $query = "SELECT * FROM estoque_com_valores 
              $whereClause 
              ORDER BY $ordenar_por $ordem 
              LIMIT $limit OFFSET $offset";
    
    $stmt = $conn->prepare($query);
    $stmt->execute($params);
    $result = $stmt->fetchAll();

    $produtos = [];
    foreach ($result as $row) {
        $produtos[] = [
            'id' => (int)$row['id'],
            'nome' => $row['nome'],
            'descricao' => $row['descricao'],
            'categoria' => $row['categoria'],
            'codigo_barras' => $row['codigo_barras'],
            'estoque' => (int)$row['estoque'],
            'estoque_minimo' => (int)$row['estoque_minimo'],
            'preco_venda' => (float)$row['preco_venda'],
            'preco_custo' => (float)$row['preco_custo'],
            'valor_total_custo' => (float)$row['valor_total_custo'],
            'valor_total_venda' => (float)$row['valor_total_venda'],
            'margem_lucro' => (float)$row['margem_lucro'],
            'margem_percentual' => (float)$row['margem_percentual'],
            'status_estoque' => $row['status_estoque'],
            'ativo' => (bool)$row['ativo'],
            'created_at' => $row['created_at'],
            'updated_at' => $row['updated_at']
        ];
    }

    // Calcular totais gerais
    $totalsQuery = "SELECT 
        SUM(valor_total_custo) as total_custo,
        SUM(valor_total_venda) as total_venda,
        SUM(margem_lucro) as total_margem,
        COUNT(*) as total_produtos,
        SUM(CASE WHEN status_estoque = 'sem_estoque' THEN 1 ELSE 0 END) as produtos_sem_estoque,
        SUM(CASE WHEN status_estoque = 'estoque_baixo' THEN 1 ELSE 0 END) as produtos_estoque_baixo,
        SUM(CASE WHEN status_estoque = 'estoque_ok' THEN 1 ELSE 0 END) as produtos_estoque_ok
    FROM estoque_com_valores $whereClause";
    
    $totalsStmt = $conn->prepare($totalsQuery);
    $totalsStmt->execute($params);
    $totals = $totalsStmt->fetch();

    // Buscar categorias disponíveis
    $categoriesQuery = "SELECT DISTINCT categoria FROM produtos WHERE categoria IS NOT NULL AND categoria != '' AND ativo = true ORDER BY categoria";
    $categoriesStmt = $conn->prepare($categoriesQuery);
    $categoriesStmt->execute();
    $categorias = $categoriesStmt->fetchAll(PDO::FETCH_COLUMN);

    echo json_encode([
        'success' => true,
        'data' => $produtos,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => (int)$total,
            'pages' => ceil($total / $limit)
        ],
        'totals' => [
            'total_custo' => (float)($totals['total_custo'] ?? 0),
            'total_venda' => (float)($totals['total_venda'] ?? 0),
            'total_margem' => (float)($totals['total_margem'] ?? 0),
            'total_produtos' => (int)($totals['total_produtos'] ?? 0),
            'produtos_sem_estoque' => (int)($totals['produtos_sem_estoque'] ?? 0),
            'produtos_estoque_baixo' => (int)($totals['produtos_estoque_baixo'] ?? 0),
            'produtos_estoque_ok' => (int)($totals['produtos_estoque_ok'] ?? 0)
        ],
        'filters' => [
            'categorias' => $categorias,
            'status_estoque_options' => [
                ['value' => '', 'label' => 'Todos'],
                ['value' => 'sem_estoque', 'label' => 'Sem estoque'],
                ['value' => 'estoque_baixo', 'label' => 'Estoque baixo'],
                ['value' => 'estoque_ok', 'label' => 'Estoque OK']
            ]
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erro interno do servidor',
        'error' => $e->getMessage()
    ]);
}
?>
