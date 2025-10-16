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
                $sql = "SELECT p.*, COALESCE(SUM(pe.quantidade), 0) AS estoque_total
                        FROM produtos p
                        LEFT JOIN produtos_estoques pe ON pe.produto_id = p.id
                        WHERE p.id = :id
                        GROUP BY p.id";
                $stmt = $conn->prepare($sql);
                $stmt->execute([':id' => $id]);
                $produto = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($produto) {
                    $estoquesStmt = $conn->prepare("SELECT pe.estoque_id, e.nome AS estoque_nome, pe.quantidade
                                                     FROM produtos_estoques pe
                                                     INNER JOIN estoques e ON e.id = pe.estoque_id
                                                     WHERE pe.produto_id = :produto_id
                                                     ORDER BY e.nome ASC");
                    $estoquesStmt->execute([':produto_id' => $produto['id']]);
                    $estoques = $estoquesStmt->fetchAll(PDO::FETCH_ASSOC);

                    $estoquesFormatados = array_map(static function(array $estoque) {
                        return [
                            'estoque_id' => (int)$estoque['estoque_id'],
                            'estoque_nome' => $estoque['estoque_nome'],
                            'quantidade' => (int)$estoque['quantidade']
                        ];
                    }, $estoques);

                    echo json_encode([
                        'success' => true,
                        'data' => [
                            'id' => (int)$produto['id'],
                            'nome' => $produto['nome'],
                            'descricao' => $produto['descricao'],
                            'preco_venda' => (float)$produto['preco_venda'],
                            'preco_custo' => (float)$produto['preco_custo'],
                            'estoque' => (int)$produto['estoque_total'],
                            'estoque_total' => (int)$produto['estoque_total'],
                            'estoque_minimo' => (int)$produto['estoque_minimo'],
                            'categoria' => $produto['categoria'],
                            'codigo_barras' => $produto['codigo_barras'],
                            'ativo' => (bool)$produto['ativo'],
                            'created_at' => $produto['created_at'],
                            'updated_at' => $produto['updated_at'],
                            'estoques' => $estoquesFormatados
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
            $having = '';
            
            if (!empty($search)) {
                $where .= " AND (nome LIKE :search OR descricao LIKE :search OR codigo_barras LIKE :search)";
                $params[':search'] = "%$search%";
            }
            
            if (!empty($categoria)) {
                $where .= " AND categoria = :categoria";
                $params[':categoria'] = $categoria;
            }
            
            if ($estoque_baixo === 'true') {
                $having = "\nHAVING estoque_total <= p.estoque_minimo";
            }

            $baseSelect = "SELECT p.*, COALESCE(SUM(pe.quantidade), 0) AS estoque_total
                           FROM produtos p
                           LEFT JOIN produtos_estoques pe ON pe.produto_id = p.id
                           $where
                           GROUP BY p.id";

            // Contar total usando subconsulta para aplicar GROUP BY e HAVING
            $countSql = "SELECT COUNT(*) as total FROM ($baseSelect $having) sub";
            $countStmt = $conn->prepare($countSql);
            foreach ($params as $key => $value) {
                $countStmt->bindValue($key, $value);
            }
            $countStmt->execute();
            $total = $countStmt->fetch()['total'];

            // Buscar produtos com total de estoque agregado
        $sql = "$baseSelect
            $having
                    ORDER BY p.nome ASC
                    LIMIT :limit OFFSET :offset";

            $stmt = $conn->prepare($sql);
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();
            $produtos = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $produtoIds = array_map(static fn(array $produto) => (int)$produto['id'], $produtos);
            $estoquesMap = [];

            if (count($produtoIds) > 0) {
                $placeholders = implode(',', array_fill(0, count($produtoIds), '?'));
                $estoquesStmt = $conn->prepare("SELECT pe.produto_id, pe.estoque_id, pe.quantidade, e.nome AS estoque_nome
                                                 FROM produtos_estoques pe
                                                 INNER JOIN estoques e ON e.id = pe.estoque_id
                                                 WHERE pe.produto_id IN ($placeholders)
                                                 ORDER BY e.nome ASC");
                $estoquesStmt->execute($produtoIds);
                while ($estoque = $estoquesStmt->fetch(PDO::FETCH_ASSOC)) {
                    $produtoId = (int)$estoque['produto_id'];
                    if (!isset($estoquesMap[$produtoId])) {
                        $estoquesMap[$produtoId] = [];
                    }
                    $estoquesMap[$produtoId][] = [
                        'estoque_id' => (int)$estoque['estoque_id'],
                        'estoque_nome' => $estoque['estoque_nome'],
                        'quantidade' => (int)$estoque['quantidade']
                    ];
                }
            }
            
            echo json_encode([
                'success' => true,
                'data' => array_map(static function(array $produto) use ($estoquesMap) {
                    $produtoId = (int)$produto['id'];
                    return [
                        'id' => $produtoId,
                        'nome' => $produto['nome'],
                        'descricao' => $produto['descricao'],
                        'preco_venda' => (float)$produto['preco_venda'],
                        'preco_custo' => (float)$produto['preco_custo'],
                        'estoque' => (int)$produto['estoque_total'],
                        'estoque_total' => (int)$produto['estoque_total'],
                        'estoque_minimo' => (int)$produto['estoque_minimo'],
                        'categoria' => $produto['categoria'],
                        'codigo_barras' => $produto['codigo_barras'],
                        'ativo' => (bool)$produto['ativo'],
                        'created_at' => $produto['created_at'],
                        'updated_at' => $produto['updated_at'],
                        'estoques' => $estoquesMap[$produtoId] ?? []
                    ];
                }, $produtos),
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
            
            $required = ['nome', 'preco_venda'];
            foreach ($required as $field) {
                if (!isset($data[$field]) || $data[$field] === '') {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'message' => "Campo $field é obrigatório"]);
                    exit();
                }
            }
            
            // Se preco_custo não for fornecido, usar 70% do preço de venda como padrão
            $preco_custo = $data['preco_custo'] ?? ($data['preco_venda'] * 0.7);

            // Normalizar estoques recebidos
            $estoquesPayload = isset($data['estoques']) && is_array($data['estoques']) ? $data['estoques'] : [];
            $estoquesNormalizados = [];
            foreach ($estoquesPayload as $item) {
                if (!isset($item['estoque_id'])) {
                    continue;
                }
                $estoqueId = (int)$item['estoque_id'];
                $quantidade = isset($item['quantidade']) ? (int)$item['quantidade'] : 0;
                if ($estoqueId <= 0 || $quantidade < 0) {
                    continue;
                }
                $estoquesNormalizados[$estoqueId] = $quantidade;
            }

            if (empty($estoquesNormalizados) && isset($data['estoque'])) {
                $defaultStmt = $conn->query("SELECT id FROM estoques WHERE ativo = 1 ORDER BY id ASC LIMIT 1");
                $defaultEstoqueId = $defaultStmt ? (int)$defaultStmt->fetchColumn() : 0;
                if ($defaultEstoqueId > 0) {
                    $estoquesNormalizados[$defaultEstoqueId] = (int)$data['estoque'];
                }
            }

            if (empty($estoquesNormalizados)) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'Informe ao menos um estoque válido para o produto'
                ]);
                exit();
            }
            
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

            $conn->beginTransaction();

            try {
                $sql = "INSERT INTO produtos (nome, descricao, preco_venda, preco_custo, estoque_minimo, categoria, codigo_barras) 
                        VALUES (:nome, :descricao, :preco_venda, :preco_custo, :estoque_minimo, :categoria, :codigo_barras)";
                
                $stmt = $conn->prepare($sql);
                $stmt->execute([
                    ':nome' => $data['nome'],
                    ':descricao' => $data['descricao'] ?? null,
                    ':preco_venda' => $data['preco_venda'],
                    ':preco_custo' => $preco_custo,
                    ':estoque_minimo' => $data['estoque_minimo'] ?? 5,
                    ':categoria' => $data['categoria'] ?? null,
                    ':codigo_barras' => $data['codigo_barras'] ?? null
                ]);

                $produto_id = (int)$conn->lastInsertId();

                $estoqueInsert = $conn->prepare("INSERT INTO produtos_estoques (produto_id, estoque_id, quantidade)
                                                 VALUES (:produto_id, :estoque_id, :quantidade)
                                                 ON DUPLICATE KEY UPDATE quantidade = VALUES(quantidade), updated_at = CURRENT_TIMESTAMP");

                foreach ($estoquesNormalizados as $estoqueId => $quantidade) {
                    $estoqueInsert->execute([
                        ':produto_id' => $produto_id,
                        ':estoque_id' => $estoqueId,
                        ':quantidade' => $quantidade
                    ]);
                }

                $totalEstoqueStmt = $conn->prepare("UPDATE produtos SET estoque = (
                        SELECT COALESCE(SUM(pe.quantidade), 0)
                        FROM produtos_estoques pe
                        WHERE pe.produto_id = :produto_id
                    )
                    WHERE id = :produto_id");
                $totalEstoqueStmt->execute([':produto_id' => $produto_id]);

                $conn->commit();

                echo json_encode([
                    'success' => true,
                    'message' => 'Produto criado com sucesso',
                    'data' => ['id' => $produto_id]
                ]);
            } catch (Exception $e) {
                $conn->rollBack();
                throw $e;
            }
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
            
            $conn->beginTransaction();

            try {
                $sql = "UPDATE produtos SET 
                        nome = :nome, descricao = :descricao, preco_venda = :preco_venda, 
                        preco_custo = :preco_custo, estoque_minimo = :estoque_minimo, 
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
                    ':estoque_minimo' => $data['estoque_minimo'] ?? 5,
                    ':categoria' => $data['categoria'] ?? null,
                    ':codigo_barras' => $data['codigo_barras'] ?? null
                ]);

                if (!$result) {
                    throw new Exception('Erro ao atualizar produto');
                }

                $estoquesPayload = isset($data['estoques']) && is_array($data['estoques']) ? $data['estoques'] : [];
                $estoqueInsert = $conn->prepare("INSERT INTO produtos_estoques (produto_id, estoque_id, quantidade)
                                                 VALUES (:produto_id, :estoque_id, :quantidade)
                                                 ON DUPLICATE KEY UPDATE quantidade = VALUES(quantidade), updated_at = CURRENT_TIMESTAMP");
                $estoqueDelete = $conn->prepare("DELETE FROM produtos_estoques WHERE produto_id = :produto_id AND estoque_id = :estoque_id");

                if (!empty($estoquesPayload)) {
                    $estoqueIdsRecebidos = [];
                    foreach ($estoquesPayload as $estoqueData) {
                        if (!isset($estoqueData['estoque_id'])) {
                            continue;
                        }
                        $estoqueId = (int)$estoqueData['estoque_id'];
                        $quantidade = isset($estoqueData['quantidade']) ? (int)$estoqueData['quantidade'] : 0;
                        $estoqueIdsRecebidos[] = $estoqueId;

                        if ($quantidade > 0) {
                            $estoqueInsert->execute([
                                ':produto_id' => $data['id'],
                                ':estoque_id' => $estoqueId,
                                ':quantidade' => $quantidade
                            ]);
                        } else {
                            $estoqueDelete->execute([
                                ':produto_id' => $data['id'],
                                ':estoque_id' => $estoqueId
                            ]);
                        }
                    }

                    if (!empty($estoqueIdsRecebidos)) {
                        $placeholders = implode(',', array_fill(0, count($estoqueIdsRecebidos), '?'));
                        $cleanupSql = "DELETE FROM produtos_estoques WHERE produto_id = ? AND estoque_id NOT IN ($placeholders)";
                        $cleanupStmt = $conn->prepare($cleanupSql);
                        $cleanupStmt->execute(array_merge([$data['id']], $estoqueIdsRecebidos));
                    }
                }

                $totalEstoqueStmt = $conn->prepare("UPDATE produtos SET estoque = (
                        SELECT COALESCE(SUM(pe.quantidade), 0)
                        FROM produtos_estoques pe
                        WHERE pe.produto_id = :produto_id
                    )
                    WHERE id = :produto_id");
                $totalEstoqueStmt->execute([':produto_id' => $data['id']]);

                $conn->commit();

                if ($stmt->rowCount() > 0) {
                    echo json_encode([
                        'success' => true,
                        'message' => 'Produto atualizado com sucesso'
                    ]);
                } else {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'message' => 'Produto não encontrado']);
                }
            } catch (Exception $e) {
                $conn->rollBack();
                throw $e;
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
