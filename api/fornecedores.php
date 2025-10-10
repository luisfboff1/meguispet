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

require_once 'config.php';
require_once 'jwt_helper.php';

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
            
            // Se encontrou um ID, buscar fornecedor específico
            if ($id) {
                $sql = "SELECT * FROM fornecedores WHERE id = :id AND ativo = 1";
                $stmt = $conn->prepare($sql);
                $stmt->execute([':id' => $id]);
                $fornecedor = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($fornecedor) {
                    echo json_encode([
                        'success' => true,
                        'data' => [
                            'id' => (int)$fornecedor['id'],
                            'nome' => $fornecedor['nome'],
                            'nome_fantasia' => $fornecedor['nome_fantasia'],
                            'cnpj' => $fornecedor['cnpj'],
                            'inscricao_estadual' => $fornecedor['inscricao_estadual'],
                            'email' => $fornecedor['email'],
                            'telefone' => $fornecedor['telefone'],
                            'endereco' => $fornecedor['endereco'],
                            'cidade' => $fornecedor['cidade'],
                            'estado' => $fornecedor['estado'],
                            'cep' => $fornecedor['cep'],
                            'observacoes' => $fornecedor['observacoes'],
                            'ativo' => (bool)$fornecedor['ativo'],
                            'created_at' => $fornecedor['created_at'],
                            'updated_at' => $fornecedor['updated_at']
                        ]
                    ]);
                } else {
                    http_response_code(404);
                    echo json_encode([
                        'success' => false,
                        'message' => 'Fornecedor não encontrado'
                    ]);
                }
                exit();
            }
            
            // Se não é busca por ID, listar fornecedores
            $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
            $search = isset($_GET['search']) ? $_GET['search'] : '';
            
            $offset = ($page - 1) * $limit;
            
            $whereClause = "WHERE ativo = 1";
            $params = [];
            
            if (!empty($search)) {
                $whereClause .= " AND (nome LIKE :search OR nome_fantasia LIKE :search OR cnpj LIKE :search)";
                $params[':search'] = "%$search%";
            }
            
            $countQuery = "SELECT COUNT(*) FROM fornecedores $whereClause";
            $countStmt = $conn->prepare($countQuery);
            $countStmt->execute($params);
            $total = $countStmt->fetchColumn();
            
            $query = "SELECT * FROM fornecedores $whereClause ORDER BY nome ASC LIMIT :limit OFFSET :offset";
            $stmt = $conn->prepare($query);
            
            // Bind parameters
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();
            
            $fornecedores = [];
            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $fornecedores[] = [
                    'id' => (int)$row['id'],
                    'nome' => $row['nome'],
                    'nome_fantasia' => $row['nome_fantasia'],
                    'cnpj' => $row['cnpj'],
                    'inscricao_estadual' => $row['inscricao_estadual'],
                    'email' => $row['email'],
                    'telefone' => $row['telefone'],
                    'endereco' => $row['endereco'],
                    'cidade' => $row['cidade'],
                    'estado' => $row['estado'],
                    'cep' => $row['cep'],
                    'observacoes' => $row['observacoes'],
                    'ativo' => (bool)$row['ativo'],
                    'created_at' => $row['created_at'],
                    'updated_at' => $row['updated_at']
                ];
            }
            
            echo json_encode([
                'success' => true,
                'data' => $fornecedores,
                'pagination' => [
                    'page' => $page,
                    'limit' => $limit,
                    'total' => (int)$total,
                    'pages' => ceil($total / $limit)
                ]
            ]);
            break;
            
        case 'POST':
            // POST /fornecedores - Criar novo
            $input = json_decode(file_get_contents('php://input'), true);
            
            $requiredFields = ['nome'];
            foreach ($requiredFields as $field) {
                if (!isset($input[$field]) || empty($input[$field])) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'message' => "Campo '$field' é obrigatório"]);
                    exit();
                }
            }
            
            $query = "INSERT INTO fornecedores (nome, nome_fantasia, cnpj, inscricao_estadual, email, telefone, endereco, cidade, estado, cep, observacoes, ativo) 
                     VALUES (:nome, :nome_fantasia, :cnpj, :inscricao_estadual, :email, :telefone, :endereco, :cidade, :estado, :cep, :observacoes, :ativo)";
            
            $stmt = $conn->prepare($query);
            $stmt->execute([
                ':nome' => $input['nome'],
                ':nome_fantasia' => $input['nome_fantasia'] ?? null,
                ':cnpj' => $input['cnpj'] ?? null,
                ':inscricao_estadual' => $input['inscricao_estadual'] ?? null,
                ':email' => $input['email'] ?? null,
                ':telefone' => $input['telefone'] ?? null,
                ':endereco' => $input['endereco'] ?? null,
                ':cidade' => $input['cidade'] ?? null,
                ':estado' => $input['estado'] ?? null,
                ':cep' => $input['cep'] ?? null,
                ':observacoes' => $input['observacoes'] ?? null,
                ':ativo' => $input['ativo'] ?? true
            ]);
            
            $id = $conn->lastInsertId();
            
            // Buscar o fornecedor criado
            $selectQuery = "SELECT * FROM fornecedores WHERE id = :id";
            $selectStmt = $conn->prepare($selectQuery);
            $selectStmt->execute([':id' => $id]);
            $row = $selectStmt->fetch(PDO::FETCH_ASSOC);
            
            echo json_encode([
                'success' => true,
                'data' => [
                    'id' => (int)$row['id'],
                    'nome' => $row['nome'],
                    'nome_fantasia' => $row['nome_fantasia'],
                    'cnpj' => $row['cnpj'],
                    'inscricao_estadual' => $row['inscricao_estadual'],
                    'email' => $row['email'],
                    'telefone' => $row['telefone'],
                    'endereco' => $row['endereco'],
                    'cidade' => $row['cidade'],
                    'estado' => $row['estado'],
                    'cep' => $row['cep'],
                    'observacoes' => $row['observacoes'],
                    'ativo' => (bool)$row['ativo'],
                    'created_at' => $row['created_at'],
                    'updated_at' => $row['updated_at']
                ],
                'message' => 'Fornecedor criado com sucesso'
            ]);
            break;
            
        case 'PUT':
            // PUT /fornecedores/{id} - Atualizar
            $path = $_SERVER['PATH_INFO'] ?? '';
            $pathParts = explode('/', trim($path, '/'));
            
            if (empty($pathParts[0])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'ID do fornecedor é obrigatório']);
                exit();
            }
            
            $id = (int)$pathParts[0];
            $input = json_decode(file_get_contents('php://input'), true);
            
            // Verificar se o fornecedor existe
            $checkQuery = "SELECT id FROM fornecedores WHERE id = :id AND ativo = 1";
            $checkStmt = $conn->prepare($checkQuery);
            $checkStmt->execute([':id' => $id]);
            
            if (!$checkStmt->fetch()) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Fornecedor não encontrado']);
                exit();
            }
            
            $updateFields = [];
            $params = [':id' => $id];
            
            $allowedFields = ['nome', 'nome_fantasia', 'cnpj', 'inscricao_estadual', 'email', 'telefone', 'endereco', 'cidade', 'estado', 'cep', 'observacoes', 'ativo'];
            
            foreach ($allowedFields as $field) {
                if (isset($input[$field])) {
                    $updateFields[] = "$field = :$field";
                    $params[":$field"] = $input[$field];
                }
            }
            
            if (empty($updateFields)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Nenhum campo para atualizar']);
                exit();
            }
            
            $query = "UPDATE fornecedores SET " . implode(', ', $updateFields) . ", updated_at = CURRENT_TIMESTAMP WHERE id = :id";
            $stmt = $conn->prepare($query);
            $stmt->execute($params);
            
            // Buscar o fornecedor atualizado
            $selectQuery = "SELECT * FROM fornecedores WHERE id = :id";
            $selectStmt = $conn->prepare($selectQuery);
            $selectStmt->execute([':id' => $id]);
            $row = $selectStmt->fetch(PDO::FETCH_ASSOC);
            
            echo json_encode([
                'success' => true,
                'data' => [
                    'id' => (int)$row['id'],
                    'nome' => $row['nome'],
                    'nome_fantasia' => $row['nome_fantasia'],
                    'cnpj' => $row['cnpj'],
                    'inscricao_estadual' => $row['inscricao_estadual'],
                    'email' => $row['email'],
                    'telefone' => $row['telefone'],
                    'endereco' => $row['endereco'],
                    'cidade' => $row['cidade'],
                    'estado' => $row['estado'],
                    'cep' => $row['cep'],
                    'observacoes' => $row['observacoes'],
                    'ativo' => (bool)$row['ativo'],
                    'created_at' => $row['created_at'],
                    'updated_at' => $row['updated_at']
                ],
                'message' => 'Fornecedor atualizado com sucesso'
            ]);
            break;
            
        case 'DELETE':
            // DELETE /fornecedores/{id} - Soft delete
            $path = $_SERVER['PATH_INFO'] ?? '';
            $pathParts = explode('/', trim($path, '/'));
            
            if (empty($pathParts[0])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'ID do fornecedor é obrigatório']);
                exit();
            }
            
            $id = (int)$pathParts[0];
            
            $query = "UPDATE fornecedores SET ativo = false, updated_at = CURRENT_TIMESTAMP WHERE id = :id AND ativo = true";
            $stmt = $conn->prepare($query);
            $stmt->execute([':id' => $id]);
            
            if ($stmt->rowCount() > 0) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Fornecedor removido com sucesso'
                ]);
            } else {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Fornecedor não encontrado']);
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
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erro interno do servidor: ' . $e->getMessage()
    ]);
}
?>