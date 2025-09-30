<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
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
    $path = $_SERVER['PATH_INFO'] ?? '';
    $pathParts = explode('/', trim($path, '/'));

    switch ($method) {
        case 'GET':
            if (empty($pathParts[0])) {
                // GET /fornecedores - Listar todos
                $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
                $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
                $search = isset($_GET['search']) ? $_GET['search'] : '';
                
                $offset = ($page - 1) * $limit;
                
                $whereClause = "WHERE ativo = 1";
                $params = [];
                
                if (!empty($search)) {
                    $whereClause .= " AND (nome ILIKE $1 OR nome_fantasia ILIKE $1 OR cnpj ILIKE $1)";
                    $params[] = "%$search%";
                }
                
                $countQuery = "SELECT COUNT(*) FROM fornecedores $whereClause";
                $countResult = pg_query_params($pdo, $countQuery, $params);
                $total = pg_fetch_result($countResult, 0, 0);
                
                $query = "SELECT * FROM fornecedores $whereClause ORDER BY nome ASC LIMIT $limit OFFSET $offset";
                $result = pg_query_params($pdo, $query, $params);
                
                $fornecedores = [];
                while ($row = pg_fetch_assoc($result)) {
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
                        'ativo' => $row['ativo'] === 't',
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
            } else {
                // GET /fornecedores/{id} - Buscar por ID
                $id = (int)$pathParts[0];
                $query = "SELECT * FROM fornecedores WHERE id = $1 AND ativo = 1";
                $result = pg_query_params($pdo, $query, [$id]);
                
                if ($row = pg_fetch_assoc($result)) {
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
                            'ativo' => $row['ativo'] === 't',
                            'created_at' => $row['created_at'],
                            'updated_at' => $row['updated_at']
                        ]
                    ]);
                } else {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'message' => 'Fornecedor não encontrado']);
                }
            }
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
            
            $query = "INSERT INTO fornecedores (nome, nome_fantasia, cnpj, inscricao_estadual, email, telefone, endereco, cidade, estado, cep, observacoes, ativo) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *";
            $params = [
                $input['nome'],
                $input['nome_fantasia'] ?? null,
                $input['cnpj'] ?? null,
                $input['inscricao_estadual'] ?? null,
                $input['email'] ?? null,
                $input['telefone'] ?? null,
                $input['endereco'] ?? null,
                $input['cidade'] ?? null,
                $input['estado'] ?? null,
                $input['cep'] ?? null,
                $input['observacoes'] ?? null,
                $input['ativo'] ?? true
            ];
            
            $result = pg_query_params($pdo, $query, $params);
            $row = pg_fetch_assoc($result);
            
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
                    'ativo' => $row['ativo'] === 't',
                    'created_at' => $row['created_at'],
                    'updated_at' => $row['updated_at']
                ],
                'message' => 'Fornecedor criado com sucesso'
            ]);
            break;
            
        case 'PUT':
            // PUT /fornecedores/{id} - Atualizar
            if (empty($pathParts[0])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'ID do fornecedor é obrigatório']);
                exit();
            }
            
            $id = (int)$pathParts[0];
            $input = json_decode(file_get_contents('php://input'), true);
            
            // Verificar se o fornecedor existe
            $checkQuery = "SELECT id FROM fornecedores WHERE id = $1 AND ativo = 1";
            $checkResult = pg_query_params($pdo, $checkQuery, [$id]);
            
            if (!pg_fetch_assoc($checkResult)) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Fornecedor não encontrado']);
                exit();
            }
            
            $updateFields = [];
            $params = [];
            $paramCount = 1;
            
            $allowedFields = ['nome', 'nome_fantasia', 'cnpj', 'inscricao_estadual', 'email', 'telefone', 'endereco', 'cidade', 'estado', 'cep', 'observacoes', 'ativo'];
            
            foreach ($allowedFields as $field) {
                if (isset($input[$field])) {
                    $updateFields[] = "$field = $$paramCount";
                    $params[] = $input[$field];
                    $paramCount++;
                }
            }
            
            if (empty($updateFields)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Nenhum campo para atualizar']);
                exit();
            }
            
            $params[] = $id; // ID para WHERE
            $query = "UPDATE fornecedores SET " . implode(', ', $updateFields) . ", updated_at = CURRENT_TIMESTAMP WHERE id = $" . $paramCount . " RETURNING *";
            
            $result = pg_query_params($pdo, $query, $params);
            $row = pg_fetch_assoc($result);
            
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
                    'ativo' => $row['ativo'] === 't',
                    'created_at' => $row['created_at'],
                    'updated_at' => $row['updated_at']
                ],
                'message' => 'Fornecedor atualizado com sucesso'
            ]);
            break;
            
        case 'DELETE':
            // DELETE /fornecedores/{id} - Soft delete
            if (empty($pathParts[0])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'ID do fornecedor é obrigatório']);
                exit();
            }
            
            $id = (int)$pathParts[0];
            
            $query = "UPDATE fornecedores SET ativo = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND ativo = true";
            $result = pg_query_params($pdo, $query, [$id]);
            
            if (pg_affected_rows($result) > 0) {
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
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erro interno do servidor',
        'error' => $e->getMessage()
    ]);
}
?>
