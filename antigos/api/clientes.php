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
            // Listar clientes
            $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
            $search = isset($_GET['search']) ? $_GET['search'] : '';
            $tipo = isset($_GET['tipo']) ? $_GET['tipo'] : '';
            
            $offset = ($page - 1) * $limit;
            
            $where = "WHERE 1=1";
            $params = [];
            
            if (!empty($search)) {
                $where .= " AND (nome LIKE :search OR email LIKE :search OR documento LIKE :search)";
                $params[':search'] = "%$search%";
            }
            
            if (!empty($tipo)) {
                $where .= " AND tipo = :tipo";
                $params[':tipo'] = $tipo;
            }
            
            // Contar total
            $countSql = "SELECT COUNT(*) as total FROM clientes_fornecedores $where";
            $countStmt = $conn->prepare($countSql);
            $countStmt->execute($params);
            $total = $countStmt->fetch()['total'];
            
            // Buscar clientes
        $sql = "SELECT c.*, v.id AS vendedor_rel_id, v.nome AS vendedor_rel_nome
            FROM clientes_fornecedores c
            LEFT JOIN vendedores v ON c.vendedor_id = v.id
            $where
            ORDER BY c.nome ASC LIMIT :limit OFFSET :offset";
            $stmt = $conn->prepare($sql);
            
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();
            
            $clientes = $stmt->fetchAll();

            $clientes = array_map(function ($cliente) {
                if ($cliente['vendedor_rel_id']) {
                    $cliente['vendedor'] = [
                        'id' => (int)$cliente['vendedor_rel_id'],
                        'nome' => $cliente['vendedor_rel_nome']
                    ];
                } else {
                    $cliente['vendedor'] = null;
                }
                unset($cliente['vendedor_rel_id'], $cliente['vendedor_rel_nome']);
                return $cliente;
            }, $clientes);
            
            echo json_encode([
                'success' => true,
                'data' => $clientes,
                'pagination' => [
                    'page' => $page,
                    'limit' => $limit,
                    'total' => $total,
                    'pages' => ceil($total / $limit)
                ]
            ]);
            break;
            
        case 'POST':
            // Criar cliente
            $data = json_decode(file_get_contents('php://input'), true);
            
            $required = ['nome', 'tipo'];
            foreach ($required as $field) {
                if (empty($data[$field])) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'message' => "Campo $field é obrigatório"]);
                    exit();
                }
            }
            
        $sql = "INSERT INTO clientes_fornecedores (nome, tipo, email, telefone, endereco, cidade, estado, cep, documento, observacoes, vendedor_id) 
            VALUES (:nome, :tipo, :email, :telefone, :endereco, :cidade, :estado, :cep, :documento, :observacoes, :vendedor_id)";
            
            $stmt = $conn->prepare($sql);
            $stmt->execute([
                ':nome' => $data['nome'],
                ':tipo' => $data['tipo'],
                ':email' => $data['email'] ?? null,
                ':telefone' => $data['telefone'] ?? null,
                ':endereco' => $data['endereco'] ?? null,
                ':cidade' => $data['cidade'] ?? null,
                ':estado' => $data['estado'] ?? null,
                ':cep' => $data['cep'] ?? null,
                ':documento' => $data['documento'] ?? null,
                ':observacoes' => $data['observacoes'] ?? null,
                ':vendedor_id' => $data['vendedor_id'] ?? null
            ]);
            
            $cliente_id = $conn->lastInsertId();
            
            echo json_encode([
                'success' => true,
                'message' => 'Cliente criado com sucesso',
                'data' => ['id' => $cliente_id]
            ]);
            break;
            
        case 'PUT':
            // Atualizar cliente
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (empty($data['id'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'ID do cliente é obrigatório']);
                exit();
            }
            
        $sql = "UPDATE clientes_fornecedores SET 
                    nome = :nome, tipo = :tipo, email = :email, telefone = :telefone, 
                    endereco = :endereco, cidade = :cidade, estado = :estado, 
            cep = :cep, documento = :documento, observacoes = :observacoes,
            vendedor_id = :vendedor_id,
                    updated_at = CURRENT_TIMESTAMP
                    WHERE id = :id";
            
            $stmt = $conn->prepare($sql);
            $result = $stmt->execute([
                ':id' => $data['id'],
                ':nome' => $data['nome'],
                ':tipo' => $data['tipo'],
                ':email' => $data['email'] ?? null,
                ':telefone' => $data['telefone'] ?? null,
                ':endereco' => $data['endereco'] ?? null,
                ':cidade' => $data['cidade'] ?? null,
                ':estado' => $data['estado'] ?? null,
                ':cep' => $data['cep'] ?? null,
                ':documento' => $data['documento'] ?? null,
                ':observacoes' => $data['observacoes'] ?? null,
                ':vendedor_id' => $data['vendedor_id'] ?? null
            ]);
            
            if ($result && $stmt->rowCount() > 0) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Cliente atualizado com sucesso'
                ]);
            } else {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Cliente não encontrado']);
            }
            break;
            
        case 'DELETE':
            // Deletar cliente (soft delete)
            $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
            
            if (!$id) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'ID do cliente é obrigatório']);
                exit();
            }
            
            $sql = "UPDATE clientes_fornecedores SET ativo = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = :id";
            $stmt = $conn->prepare($sql);
            $result = $stmt->execute([':id' => $id]);
            
            if ($result && $stmt->rowCount() > 0) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Cliente removido com sucesso'
                ]);
            } else {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Cliente não encontrado']);
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
