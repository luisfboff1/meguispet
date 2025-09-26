<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/jwt_helper.php';

$method = $_SERVER['REQUEST_METHOD'];

// Middleware de autenticação
$auth = require_auth();

try {
    $conn = getDbConnection();
    
    switch ($method) {
        case 'GET':
            // Listar produtos
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
            
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
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
            
            $required = ['nome', 'preco', 'estoque'];
            foreach ($required as $field) {
                if (!isset($data[$field]) || $data[$field] === '') {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'message' => "Campo $field é obrigatório"]);
                    exit();
                }
            }
            
            $sql = "INSERT INTO produtos (nome, descricao, preco, estoque, estoque_minimo, categoria, codigo_barras) 
                    VALUES (:nome, :descricao, :preco, :estoque, :estoque_minimo, :categoria, :codigo_barras)";
            
            $stmt = $conn->prepare($sql);
            $stmt->execute([
                ':nome' => $data['nome'],
                ':descricao' => $data['descricao'] ?? null,
                ':preco' => $data['preco'],
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
            
            $sql = "UPDATE produtos SET 
                    nome = :nome, descricao = :descricao, preco = :preco, 
                    estoque = :estoque, estoque_minimo = :estoque_minimo, 
                    categoria = :categoria, codigo_barras = :codigo_barras,
                    updated_at = CURRENT_TIMESTAMP
                    WHERE id = :id";
            
            $stmt = $conn->prepare($sql);
            $result = $stmt->execute([
                ':id' => $data['id'],
                ':nome' => $data['nome'],
                ':descricao' => $data['descricao'] ?? null,
                ':preco' => $data['preco'],
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
