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

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/jwt_helper.php';

// Middleware de autenticação
$auth = require_auth();

try {
    $conn = getDbConnection();
    $method = $_SERVER['REQUEST_METHOD'];
    
    switch ($method) {
        case 'GET':
            // Verificar se é busca por ID (PATH_INFO ou query parameter)
            $id = null;
            
            // Tentar PATH_INFO primeiro
            $path = $_SERVER['PATH_INFO'] ?? '';
            $pathParts = explode('/', trim($path, '/'));
            if (!empty($pathParts[0]) && is_numeric($pathParts[0])) {
                $id = (int)$pathParts[0];
            }
            
            // Se não encontrou no PATH_INFO, tentar query parameter
            if (!$id && isset($_GET['id']) && is_numeric($_GET['id'])) {
                $id = (int)$_GET['id'];
            }
            
            // Se encontrou um ID, buscar produto específico
            if ($id) {
                $sql = "SELECT * FROM produtos WHERE id = :id";
                $stmt = $conn->prepare($sql);
                $stmt->execute([':id' => $id]);
                $produto = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($produto) {
                    echo json_encode([
                        'success' => true,
                        'data' => [
                            'id' => (int)$produto['id'],
                            'nome' => $produto['nome'],
                            'descricao' => $produto['descricao'],
                            'preco_venda' => (float)$produto['preco_venda'],
                            'preco_custo' => (float)$produto['preco_custo'],
                            'estoque' => (int)$produto['estoque'],
                            'estoque_minimo' => (int)$produto['estoque_minimo'],
                            'categoria' => $produto['categoria'],
                            'codigo_barras' => $produto['codigo_barras'],
                            'ativo' => (bool)$produto['ativo'],
                            'created_at' => $produto['created_at'],
                            'updated_at' => $produto['updated_at']
                        ]
                    ]);
                } else {
                    http_response_code(404);
                    echo json_encode([
                        'success' => false,
                        'message' => 'Produto não encontrado'
                    ]);
                }
                exit();
            }
            
            // Se não é busca por ID, listar produtos
            $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
            $search = isset($_GET['search']) ? $_GET['search'] : '';
            $categoria = isset($_GET['categoria']) ? $_GET['categoria'] : '';
            $estoque_baixo = isset($_GET['estoque_baixo']) ? $_GET['estoque_baixo'] : '';
            
            $offset = ($page - 1) * $limit;
            
            $where = "WHERE 1=1";
            $params = [];
            
            if (!empty($search)) {
                $where .= " AND (nome LIKE :search OR descricao LIKE :search OR codigo_barras LIKE :search)";
                $params[':search'] = "%$search%";
            }
            
            if (!empty($categoria)) {
                $where .= " AND categoria = :categoria";
                $params[':categoria'] = $categoria;
            }
            
            if ($estoque_baixo === 'true') {
                $where .= " AND estoque <= estoque_minimo";
            }
            
            // Contar total
            $countSql = "SELECT COUNT(*) as total FROM produtos $where";
            $countStmt = $conn->prepare($countSql);
            $countStmt->execute($params);
            $total = $countStmt->fetch()['total'];
            
            // Buscar produtos
            $sql = "SELECT * FROM produtos $where ORDER BY nome ASC LIMIT :limit OFFSET :offset";
            $stmt = $conn->prepare($sql);
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            
            $stmt->execute();
            
            $produtos = $stmt->fetchAll();
            
            echo json_encode([
                'success' => true,
                'data' => $produtos,
                'pagination' => [
                    'page' => $page,
                    'limit' => $limit,
                    'total' => $total,
                    'pages' => ceil($total / $limit)
                ]
            ]);
            break;
            
        case 'POST':
            // Criar produto
            $data = json_decode(file_get_contents('php://input'), true);
            
            $required = ['nome', 'preco_venda', 'estoque'];
            foreach ($required as $field) {
                if (!isset($data[$field]) || $data[$field] === '') {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'message' => "Campo $field é obrigatório"]);
                    exit();
                }
            }
            
            // Se preco_custo não for fornecido, usar 70% do preço de venda como padrão
            $preco_custo = $data['preco_custo'] ?? ($data['preco_venda'] * 0.7);
            
            // Validar código de barras único (se fornecido)
            if (!empty($data['codigo_barras'])) {
                $checkSql = "SELECT COUNT(*) FROM produtos WHERE codigo_barras = :codigo_barras";
                $checkStmt = $conn->prepare($checkSql);
                $checkStmt->execute([':codigo_barras' => $data['codigo_barras']]);
                $exists = $checkStmt->fetchColumn();
                
                if ($exists > 0) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'message' => 'Código de barras já existe. Use um código único.'
                    ]);
                    exit();
                }
            }
            
            $sql = "INSERT INTO produtos (nome, descricao, preco_venda, preco_custo, estoque, estoque_minimo, categoria, codigo_barras) 
                    VALUES (:nome, :descricao, :preco_venda, :preco_custo, :estoque, :estoque_minimo, :categoria, :codigo_barras)";
            
            $stmt = $conn->prepare($sql);
            $stmt->execute([
                ':nome' => $data['nome'],
                ':descricao' => $data['descricao'] ?? null,
                ':preco_venda' => $data['preco_venda'],
                ':preco_custo' => $preco_custo,
                ':estoque' => $data['estoque'],
                ':estoque_minimo' => $data['estoque_minimo'] ?? 5,
                ':categoria' => $data['categoria'] ?? null,
                ':codigo_barras' => $data['codigo_barras'] ?? null
            ]);
            
            $produto_id = $conn->lastInsertId();
            
            echo json_encode([
                'success' => true,
                'message' => 'Produto criado com sucesso',
                'data' => ['id' => $produto_id]
            ]);
            break;
            
        case 'PUT':
            // Atualizar produto
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (empty($data['id'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'ID do produto é obrigatório']);
                exit();
            }
            
            // Validar código de barras único (se fornecido)
            if (!empty($data['codigo_barras'])) {
                $checkSql = "SELECT COUNT(*) FROM produtos WHERE codigo_barras = :codigo_barras AND id != :id";
                $checkStmt = $conn->prepare($checkSql);
                $checkStmt->execute([
                    ':codigo_barras' => $data['codigo_barras'],
                    ':id' => $data['id']
                ]);
                $exists = $checkStmt->fetchColumn();
                
                if ($exists > 0) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'message' => 'Código de barras já existe. Use um código único.'
                    ]);
                    exit();
                }
            }
            
            $sql = "UPDATE produtos SET 
                    nome = :nome, descricao = :descricao, preco_venda = :preco_venda, 
                    preco_custo = :preco_custo, estoque = :estoque, estoque_minimo = :estoque_minimo, 
                    categoria = :categoria, codigo_barras = :codigo_barras,
                    updated_at = CURRENT_TIMESTAMP
                    WHERE id = :id";
            
            $stmt = $conn->prepare($sql);
            $result = $stmt->execute([
                ':id' => $data['id'],
                ':nome' => $data['nome'],
                ':descricao' => $data['descricao'] ?? null,
                ':preco_venda' => $data['preco_venda'],
                ':preco_custo' => $data['preco_custo'] ?? ($data['preco_venda'] * 0.7),
                ':estoque' => $data['estoque'],
                ':estoque_minimo' => $data['estoque_minimo'] ?? 5,
                ':categoria' => $data['categoria'] ?? null,
                ':codigo_barras' => $data['codigo_barras'] ?? null
            ]);
            
            if ($result && $stmt->rowCount() > 0) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Produto atualizado com sucesso'
                ]);
            } else {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Produto não encontrado']);
            }
            break;
            
        case 'DELETE':
            // Deletar produto (soft delete)
            $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
            
            if (!$id) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'ID do produto é obrigatório']);
                exit();
            }
            
            $sql = "UPDATE produtos SET ativo = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = :id";
            $stmt = $conn->prepare($sql);
            $result = $stmt->execute([':id' => $id]);
            
            if ($result && $stmt->rowCount() > 0) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Produto removido com sucesso'
                ]);
            } else {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Produto não encontrado']);
            }
            break;
            
        default:
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método não permitido']);
    }
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erro no servidor: ' . $e->getMessage()
    ]);
}
?>
