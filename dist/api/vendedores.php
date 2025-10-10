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
            // Listar vendedores
            $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
            $search = isset($_GET['search']) ? $_GET['search'] : '';
            
            $offset = ($page - 1) * $limit;
            
            $where = "WHERE 1=1";
            $params = [];
            
            if (!empty($search)) {
                $where .= " AND (nome LIKE :search OR email LIKE :search OR cpf LIKE :search)";
                $params[':search'] = "%$search%";
            }
            
            // Contar total
            $countSql = "SELECT COUNT(*) as total FROM vendedores $where";
            $countStmt = $conn->prepare($countSql);
            $countStmt->execute($params);
            $total = $countStmt->fetch()['total'];
            
            // Buscar vendedores
            $sql = "SELECT * FROM vendedores $where ORDER BY nome ASC LIMIT :limit OFFSET :offset";
            $stmt = $conn->prepare($sql);
            
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();
            
            $vendedores = $stmt->fetchAll();
            
            echo json_encode([
                'success' => true,
                'data' => $vendedores,
                'pagination' => [
                    'page' => $page,
                    'limit' => $limit,
                    'total' => $total,
                    'pages' => ceil($total / $limit)
                ]
            ]);
            break;
            
        case 'POST':
            // Criar vendedor
            $data = json_decode(file_get_contents('php://input'), true);
            
            $required = ['nome'];
            foreach ($required as $field) {
                if (empty($data[$field])) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'message' => "Campo $field é obrigatório"]);
                    exit();
                }
            }
            
            // Verificar se CPF já existe
            if (!empty($data['cpf'])) {
                $checkSql = "SELECT id FROM vendedores WHERE cpf = :cpf AND ativo = TRUE";
                $checkStmt = $conn->prepare($checkSql);
                $checkStmt->execute([':cpf' => $data['cpf']]);
                if ($checkStmt->fetch()) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'message' => 'CPF já cadastrado']);
                    exit();
                }
            }
            
            $sql = "INSERT INTO vendedores (nome, email, telefone, cpf, comissao) 
                    VALUES (:nome, :email, :telefone, :cpf, :comissao)";
            
            $stmt = $conn->prepare($sql);
            $stmt->execute([
                ':nome' => $data['nome'],
                ':email' => $data['email'] ?? null,
                ':telefone' => $data['telefone'] ?? null,
                ':cpf' => $data['cpf'] ?? null,
                ':comissao' => $data['comissao'] ?? 0.00
            ]);
            
            $vendedor_id = $conn->lastInsertId();
            
            echo json_encode([
                'success' => true,
                'message' => 'Vendedor criado com sucesso',
                'data' => ['id' => $vendedor_id]
            ]);
            break;
            
        case 'PUT':
            // Atualizar vendedor
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (empty($data['id'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'ID do vendedor é obrigatório']);
                exit();
            }
            
            // Verificar se CPF já existe (excluindo o próprio vendedor)
            if (!empty($data['cpf'])) {
                $checkSql = "SELECT id FROM vendedores WHERE cpf = :cpf AND id != :id AND ativo = TRUE";
                $checkStmt = $conn->prepare($checkSql);
                $checkStmt->execute([':cpf' => $data['cpf'], ':id' => $data['id']]);
                if ($checkStmt->fetch()) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'message' => 'CPF já cadastrado']);
                    exit();
                }
            }
            
            $sql = "UPDATE vendedores SET 
                    nome = :nome, email = :email, telefone = :telefone, 
                    cpf = :cpf, comissao = :comissao, updated_at = CURRENT_TIMESTAMP
                    WHERE id = :id";
            
            $stmt = $conn->prepare($sql);
            $result = $stmt->execute([
                ':id' => $data['id'],
                ':nome' => $data['nome'],
                ':email' => $data['email'] ?? null,
                ':telefone' => $data['telefone'] ?? null,
                ':cpf' => $data['cpf'] ?? null,
                ':comissao' => $data['comissao'] ?? 0.00
            ]);
            
            if ($result && $stmt->rowCount() > 0) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Vendedor atualizado com sucesso'
                ]);
            } else {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Vendedor não encontrado']);
            }
            break;
            
        case 'DELETE':
            // Deletar vendedor (soft delete)
            $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
            
            if (!$id) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'ID do vendedor é obrigatório']);
                exit();
            }
            
            // Verificar se vendedor tem vendas
            $checkSql = "SELECT COUNT(*) as total FROM vendas WHERE vendedor_id = :id";
            $checkStmt = $conn->prepare($checkSql);
            $checkStmt->execute([':id' => $id]);
            $hasVendas = $checkStmt->fetch()['total'] > 0;
            
            if ($hasVendas) {
                http_response_code(400);
                echo json_encode([
                    'success' => false, 
                    'message' => 'Não é possível remover vendedor que possui vendas associadas'
                ]);
                exit();
            }
            
            $sql = "UPDATE vendedores SET ativo = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = :id";
            $stmt = $conn->prepare($sql);
            $result = $stmt->execute([':id' => $id]);
            
            if ($result && $stmt->rowCount() > 0) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Vendedor removido com sucesso'
                ]);
            } else {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Vendedor não encontrado']);
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
