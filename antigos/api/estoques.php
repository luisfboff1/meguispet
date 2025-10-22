<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/jwt_helper.php';

$auth = require_auth();
$method = $_SERVER['REQUEST_METHOD'];

try {
    $conn = getDbConnection();

    switch ($method) {
        case 'GET':
            $onlyActive = isset($_GET['active']) ? (int)$_GET['active'] === 1 : false;
            $sql = 'SELECT * FROM estoques';
            if ($onlyActive) {
                $sql .= ' WHERE ativo = 1';
            }
            $sql .= ' ORDER BY nome';
            $stmt = $conn->query($sql);
            $data = $stmt->fetchAll();
            echo json_encode(['success' => true, 'data' => $data]);
            break;

        case 'POST':
            $payload = json_decode(file_get_contents('php://input'), true);
            if (empty($payload['nome'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Nome é obrigatório']);
                exit();
            }
            $sql = 'INSERT INTO estoques (nome, descricao, ativo) VALUES (:nome, :descricao, :ativo)';
            $stmt = $conn->prepare($sql);
            $stmt->execute([
                ':nome' => $payload['nome'],
                ':descricao' => $payload['descricao'] ?? null,
                ':ativo' => isset($payload['ativo']) ? (int)$payload['ativo'] : 1
            ]);
            echo json_encode([
                'success' => true,
                'message' => 'Estoque criado com sucesso',
                'data' => ['id' => $conn->lastInsertId()]
            ]);
            break;

        case 'PUT':
            $payload = json_decode(file_get_contents('php://input'), true);
            if (empty($payload['id'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'ID é obrigatório']);
                exit();
            }
            $sql = 'UPDATE estoques SET nome = :nome, descricao = :descricao, ativo = :ativo, updated_at = CURRENT_TIMESTAMP WHERE id = :id';
            $stmt = $conn->prepare($sql);
            $stmt->execute([
                ':id' => $payload['id'],
                ':nome' => $payload['nome'] ?? null,
                ':descricao' => $payload['descricao'] ?? null,
                ':ativo' => isset($payload['ativo']) ? (int)$payload['ativo'] : 1
            ]);
            echo json_encode(['success' => true, 'message' => 'Estoque atualizado com sucesso']);
            break;

        case 'DELETE':
            parse_str(file_get_contents('php://input'), $payload);
            if (empty($payload['id'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'ID é obrigatório']);
                exit();
            }
            $stmt = $conn->prepare('DELETE FROM estoques WHERE id = :id');
            $stmt->execute([':id' => $payload['id']]);
            echo json_encode(['success' => true, 'message' => 'Estoque excluído com sucesso']);
            break;

        default:
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método não permitido']);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erro no servidor: ' . $e->getMessage()]);
}
?>
