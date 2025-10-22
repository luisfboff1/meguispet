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
            // GET /historico-precos - Listar histórico de preços
            $produto_id = isset($_GET['produto_id']) ? (int)$_GET['produto_id'] : null;
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
            $tipo_alteracao = isset($_GET['tipo_alteracao']) ? $_GET['tipo_alteracao'] : '';
            
            if (!$produto_id) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'produto_id é obrigatório']);
                exit();
            }
            
            $whereClause = "WHERE hp.produto_id = :produto_id";
            $params = [':produto_id' => $produto_id];
            
            if (!empty($tipo_alteracao)) {
                $whereClause .= " AND hp.tipo_alteracao = :tipo_alteracao";
                $params[':tipo_alteracao'] = $tipo_alteracao;
            }
            
            $query = "SELECT 
                        hp.id,
                        hp.produto_id,
                        p.nome as produto_nome,
                        p.categoria,
                        hp.preco_venda_anterior,
                        hp.preco_venda_novo,
                        hp.preco_custo_anterior,
                        hp.preco_custo_novo,
                        hp.tipo_alteracao,
                        hp.observacao,
                        hp.usuario_id,
                        hp.created_at,
                        -- Calcular diferenças
                        (hp.preco_venda_novo - hp.preco_venda_anterior) as diferenca_preco_venda,
                        (hp.preco_custo_novo - hp.preco_custo_anterior) as diferenca_preco_custo,
                        -- Calcular percentuais de mudança
                        CASE 
                            WHEN hp.preco_venda_anterior > 0 THEN 
                                ROUND(((hp.preco_venda_novo - hp.preco_venda_anterior) / hp.preco_venda_anterior) * 100, 2)
                            ELSE 0 
                        END as percentual_mudanca_venda,
                        CASE 
                            WHEN hp.preco_custo_anterior > 0 THEN 
                                ROUND(((hp.preco_custo_novo - hp.preco_custo_anterior) / hp.preco_custo_anterior) * 100, 2)
                            ELSE 0 
                        END as percentual_mudanca_custo
                      FROM historico_precos hp
                      JOIN produtos p ON hp.produto_id = p.id
                      $whereClause
                      ORDER BY hp.created_at DESC
                      LIMIT :limit";
            
            $stmt = $conn->prepare($query);
            
            // Bind parameters
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->execute();
            
            $historico = [];
            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $historico[] = [
                    'id' => (int)$row['id'],
                    'produto_id' => (int)$row['produto_id'],
                    'produto_nome' => $row['produto_nome'],
                    'categoria' => $row['categoria'],
                    'preco_venda_anterior' => (float)$row['preco_venda_anterior'],
                    'preco_venda_novo' => (float)$row['preco_venda_novo'],
                    'preco_custo_anterior' => (float)$row['preco_custo_anterior'],
                    'preco_custo_novo' => (float)$row['preco_custo_novo'],
                    'tipo_alteracao' => $row['tipo_alteracao'],
                    'observacao' => $row['observacao'],
                    'usuario_id' => $row['usuario_id'] ? (int)$row['usuario_id'] : null,
                    'created_at' => $row['created_at'],
                    'diferenca_preco_venda' => (float)$row['diferenca_preco_venda'],
                    'diferenca_preco_custo' => (float)$row['diferenca_preco_custo'],
                    'percentual_mudanca_venda' => (float)$row['percentual_mudanca_venda'],
                    'percentual_mudanca_custo' => (float)$row['percentual_mudanca_custo']
                ];
            }
            
            echo json_encode([
                'success' => true,
                'data' => $historico,
                'total' => count($historico)
            ]);
            break;
            
        case 'POST':
            // POST /historico-precos - Criar entrada manual no histórico
            $input = json_decode(file_get_contents('php://input'), true);
            
            $requiredFields = ['produto_id', 'preco_venda_novo', 'preco_custo_novo'];
            foreach ($requiredFields as $field) {
                if (!isset($input[$field])) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'message' => "Campo '$field' é obrigatório"]);
                    exit();
                }
            }
            
            // Buscar preços atuais do produto
            $produtoQuery = "SELECT preco_venda, preco_custo FROM produtos WHERE id = :produto_id";
            $produtoStmt = $conn->prepare($produtoQuery);
            $produtoStmt->execute([':produto_id' => $input['produto_id']]);
            $produtoAtual = $produtoStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$produtoAtual) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Produto não encontrado']);
                exit();
            }
            
            // Inserir no histórico
            $insertQuery = "INSERT INTO historico_precos (
                produto_id,
                preco_venda_anterior,
                preco_venda_novo,
                preco_custo_anterior,
                preco_custo_novo,
                tipo_alteracao,
                observacao,
                usuario_id
            ) VALUES (
                :produto_id,
                :preco_venda_anterior,
                :preco_venda_novo,
                :preco_custo_anterior,
                :preco_custo_novo,
                :tipo_alteracao,
                :observacao,
                :usuario_id
            )";
            
            $insertStmt = $conn->prepare($insertQuery);
            $insertStmt->execute([
                ':produto_id' => $input['produto_id'],
                ':preco_venda_anterior' => $produtoAtual['preco_venda'],
                ':preco_venda_novo' => $input['preco_venda_novo'],
                ':preco_custo_anterior' => $produtoAtual['preco_custo'],
                ':preco_custo_novo' => $input['preco_custo_novo'],
                ':tipo_alteracao' => $input['tipo_alteracao'] ?? 'manual',
                ':observacao' => $input['observacao'] ?? 'Alteração manual de preços',
                ':usuario_id' => $input['usuario_id'] ?? null
            ]);
            
            $id = $conn->lastInsertId();
            
            echo json_encode([
                'success' => true,
                'data' => ['id' => $id],
                'message' => 'Histórico de preços criado com sucesso'
            ]);
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
