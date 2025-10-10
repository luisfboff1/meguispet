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

$method = $_SERVER['REQUEST_METHOD'];

// Middleware de autenticação
$auth = require_auth();

// Verificar se é admin (apenas admins podem gerenciar usuários)
// Corrigido: usar 'role' em vez de 'user_role' (conforme payload do JWT)
if (!isset($auth['role']) || $auth['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'message' => 'Acesso negado. Apenas administradores podem gerenciar usuários.'
    ]);
    exit();
}

try {
    $conn = getDbConnection();
    
    switch ($method) {
        case 'GET':
            // Listar usuários
            $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
            $search = isset($_GET['search']) ? $_GET['search'] : '';
            $role = isset($_GET['role']) ? $_GET['role'] : '';
            
            $offset = ($page - 1) * $limit;
            
            $where = "WHERE 1=1";
            $params = [];
            
            if (!empty($search)) {
                $where .= " AND (nome LIKE :search OR email LIKE :search)";
                $params[':search'] = "%$search%";
            }
            
            if (!empty($role)) {
                $where .= " AND role = :role";
                $params[':role'] = $role;
            }
            
            // Contar total
            $countSql = "SELECT COUNT(*) as total FROM usuarios $where";
            $countStmt = $conn->prepare($countSql);
            $countStmt->execute($params);
            $total = $countStmt->fetch()['total'];
            
            // Buscar usuários (sem password_hash)
            $sql = "SELECT id, nome, email, role, permissoes, ativo, created_at, updated_at 
                    FROM usuarios $where ORDER BY nome ASC LIMIT :limit OFFSET :offset";
            $stmt = $conn->prepare($sql);
            
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();
            
            $usuarios = $stmt->fetchAll();
            
            // Decodificar permissoes JSON
            foreach ($usuarios as &$usuario) {
                if (isset($usuario['permissoes']) && is_string($usuario['permissoes'])) {
                    $usuario['permissoes'] = json_decode($usuario['permissoes'], true);
                }
            }
            
            echo json_encode([
                'success' => true,
                'data' => $usuarios,
                'pagination' => [
                    'page' => $page,
                    'limit' => $limit,
                    'total' => $total,
                    'pages' => ceil($total / $limit)
                ]
            ]);
            break;
            
        case 'POST':
            // Criar usuário
            $data = json_decode(file_get_contents('php://input'), true);
            
            $required = ['nome', 'email', 'password', 'role'];
            foreach ($required as $field) {
                if (empty($data[$field])) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'message' => "Campo $field é obrigatório"]);
                    exit();
                }
            }
            
            // Verificar se email já existe
            $checkSql = "SELECT id FROM usuarios WHERE email = :email";
            $checkStmt = $conn->prepare($checkSql);
            $checkStmt->execute([':email' => $data['email']]);
            if ($checkStmt->fetch()) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Email já cadastrado']);
                exit();
            }
            
            // Hash da senha
            $password_hash = password_hash($data['password'], PASSWORD_DEFAULT);
            
            // Permissões padrão
            $permissoes = isset($data['permissoes']) ? $data['permissoes'] : [];
            $permissoes_json = json_encode($permissoes);
            
            $sql = "INSERT INTO usuarios (nome, email, password_hash, role, permissoes) 
                    VALUES (:nome, :email, :password_hash, :role, :permissoes)";
            
            $stmt = $conn->prepare($sql);
            $stmt->execute([
                ':nome' => $data['nome'],
                ':email' => $data['email'],
                ':password_hash' => $password_hash,
                ':role' => $data['role'],
                ':permissoes' => $permissoes_json
            ]);
            
            $usuario_id = $conn->lastInsertId();
            
            echo json_encode([
                'success' => true,
                'message' => 'Usuário criado com sucesso',
                'data' => ['id' => $usuario_id]
            ]);
            break;
            
        case 'PUT':
            // Atualizar usuário
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (empty($data['id'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'ID do usuário é obrigatório']);
                exit();
            }
            
            // Verificar se email já existe (excluindo o próprio usuário)
            if (!empty($data['email'])) {
                $checkSql = "SELECT id FROM usuarios WHERE email = :email AND id != :id";
                $checkStmt = $conn->prepare($checkSql);
                $checkStmt->execute([':email' => $data['email'], ':id' => $data['id']]);
                if ($checkStmt->fetch()) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'message' => 'Email já cadastrado']);
                    exit();
                }
            }
            
            $sql = "UPDATE usuarios SET 
                    nome = :nome, email = :email, role = :role, permissoes = :permissoes,
                    updated_at = CURRENT_TIMESTAMP";
            
            $params = [
                ':id' => $data['id'],
                ':nome' => $data['nome'],
                ':email' => $data['email'],
                ':role' => $data['role'],
                ':permissoes' => json_encode($data['permissoes'] ?? [])
            ];
            
            // Atualizar senha se fornecida
            if (!empty($data['password'])) {
                $sql .= ", password_hash = :password_hash";
                $params[':password_hash'] = password_hash($data['password'], PASSWORD_DEFAULT);
            }
            
            $sql .= " WHERE id = :id";
            
            $stmt = $conn->prepare($sql);
            $result = $stmt->execute($params);
            
            if ($result && $stmt->rowCount() > 0) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Usuário atualizado com sucesso'
                ]);
            } else {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Usuário não encontrado']);
            }
            break;
            
        case 'DELETE':
            // Deletar usuário (soft delete)
            $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
            
            if (!$id) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'ID do usuário é obrigatório']);
                exit();
            }
            
            // Não permitir deletar a si mesmo
            if ($id == $auth['user_id']) {
                http_response_code(400);
                echo json_encode([
                    'success' => false, 
                    'message' => 'Não é possível remover seu próprio usuário'
                ]);
                exit();
            }
            
            $sql = "UPDATE usuarios SET ativo = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = :id";
            $stmt = $conn->prepare($sql);
            $result = $stmt->execute([':id' => $id]);
            
            if ($result && $stmt->rowCount() > 0) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Usuário removido com sucesso'
                ]);
            } else {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Usuário não encontrado']);
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
