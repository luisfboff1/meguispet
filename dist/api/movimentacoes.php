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
    
    // Verificar se as tabelas existem
    try {
        $tableCheck = $conn->query("SHOW TABLES LIKE 'movimentacoes_estoque'");
        if ($tableCheck->rowCount() == 0) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Tabelas de movimentações não foram criadas. Execute o script SQL primeiro.',
                'error' => 'Tabela movimentacoes_estoque não encontrada'
            ]);
            exit();
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Erro ao verificar tabelas: ' . $e->getMessage(),
            'error' => $e->getMessage()
        ]);
        exit();
    }
    
    switch ($method) {
        case 'GET':
            // Verificar se é busca por ID específico (PATH_INFO)
            $pathInfo = $_SERVER['PATH_INFO'] ?? '';
            if (!empty($pathInfo)) {
                $id = trim($pathInfo, '/');
                if (is_numeric($id)) {
                    // Buscar movimentação específica por ID
                    try {
                        $stmt = $conn->prepare("
                            SELECT 
                                m.*,
                                f.nome as fornecedor_nome,
                                f.cnpj as fornecedor_cnpj,
                                f.telefone as fornecedor_telefone,
                                f.email as fornecedor_email
                            FROM movimentacoes_estoque m
                            LEFT JOIN fornecedores f ON m.fornecedor_id = f.id
                            WHERE m.id = ?
                        ");
                        $stmt->execute([$id]);
                        $movimentacao = $stmt->fetch(PDO::FETCH_ASSOC);
                        
                        if (!$movimentacao) {
                            http_response_code(404);
                            echo json_encode([
                                'success' => false,
                                'message' => 'Movimentação não encontrada'
                            ]);
                            exit();
                        }
                        
                        // Debug log
                        error_log("Movimentação encontrada: " . json_encode($movimentacao));
                        
                        // Buscar itens da movimentação
                        $itemsStmt = $conn->prepare("
                            SELECT 
                                mi.*,
                                p.nome as produto_nome,
                                p.codigo_barras as produto_codigo_barras,
                                p.estoque as produto_estoque,
                                p.preco_venda as produto_preco_venda,
                                p.preco_custo as produto_preco_custo
                            FROM movimentacoes_itens mi
                            LEFT JOIN produtos p ON mi.produto_id = p.id
                            WHERE mi.movimentacao_id = ?
                        ");
                        $itemsStmt->execute([$id]);
                        $itens = $itemsStmt->fetchAll();
                        
                        // Formatar resposta
                        $movimentacao['fornecedor'] = $movimentacao['fornecedor_nome'] ? [
                            'id' => $movimentacao['fornecedor_id'],
                            'nome' => $movimentacao['fornecedor_nome'],
                            'cnpj' => $movimentacao['fornecedor_cnpj'],
                            'telefone' => $movimentacao['fornecedor_telefone'],
                            'email' => $movimentacao['fornecedor_email']
                        ] : null;
                        
                        $movimentacao['itens'] = array_map(function($item) {
                            return [
                                'id' => $item['id'],
                                'movimentacao_id' => $item['movimentacao_id'],
                                'produto_id' => $item['produto_id'],
                                'quantidade' => $item['quantidade'],
                                'preco_unitario' => $item['preco_unitario'],
                                'subtotal' => $item['subtotal'],
                                'produto' => $item['produto_nome'] ? [
                                    'id' => $item['produto_id'],
                                    'nome' => $item['produto_nome'],
                                    'codigo_barras' => $item['produto_codigo_barras'],
                                    'estoque' => $item['produto_estoque'],
                                    'preco_venda' => $item['produto_preco_venda'],
                                    'preco_custo' => $item['produto_preco_custo']
                                ] : null
                            ];
                        }, $itens);
                        
                        // Limpar campos desnecessários
                        unset($movimentacao['fornecedor_nome'], $movimentacao['fornecedor_cnpj'], 
                              $movimentacao['fornecedor_telefone'], $movimentacao['fornecedor_email']);
                        
                        echo json_encode([
                            'success' => true,
                            'data' => $movimentacao
                        ]);
                        exit();
                        
                    } catch (Exception $e) {
                        http_response_code(500);
                        echo json_encode([
                            'success' => false,
                            'message' => 'Erro ao buscar movimentação: ' . $e->getMessage()
                        ]);
                        exit();
                    }
                }
            }
            
            // Listar movimentações (lógica original)
            $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
            $tipo = isset($_GET['tipo']) ? $_GET['tipo'] : '';
            $status = isset($_GET['status']) ? $_GET['status'] : '';
            
            $offset = ($page - 1) * $limit;
            
            $where = "WHERE 1=1";
            $params = [];
            
            if (!empty($tipo)) {
                $where .= " AND tipo = :tipo";
                $params[':tipo'] = $tipo;
            }
            
            if (!empty($status)) {
                $where .= " AND status = :status";
                $params[':status'] = $status;
            }
            
            // Contar total
            try {
                $countSql = "SELECT COUNT(*) as total FROM movimentacoes_estoque $where";
                $countStmt = $conn->prepare($countSql);
                $countStmt->execute($params);
                $total = $countStmt->fetch()['total'];
            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'message' => 'Erro ao contar movimentações: ' . $e->getMessage(),
                    'error' => $e->getMessage()
                ]);
                exit();
            }
            
            // Buscar movimentações
            try {
                $sql = "SELECT m.*, f.nome as fornecedor_nome 
                        FROM movimentacoes_estoque m 
                        LEFT JOIN fornecedores f ON m.fornecedor_id = f.id 
                        $where 
                        ORDER BY m.created_at DESC 
                        LIMIT :limit OFFSET :offset";
                
                $stmt = $conn->prepare($sql);
                
                // Bind dos parâmetros de filtro
                foreach ($params as $key => $value) {
                    $stmt->bindValue($key, $value);
                }
                
                // Bind dos parâmetros de paginação como inteiros
                $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
                $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
                
                $stmt->execute();
                $movimentacoes = $stmt->fetchAll(PDO::FETCH_ASSOC);
            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'message' => 'Erro ao buscar movimentações: ' . $e->getMessage(),
                    'error' => $e->getMessage()
                ]);
                exit();
            }
            
            // Formatar dados das movimentações
            $movimentacoesFormatadas = [];
            foreach ($movimentacoes as $mov) {
                $movimentacoesFormatadas[] = [
                    'id' => (int)$mov['id'],
                    'tipo' => $mov['tipo'],
                    'fornecedor_id' => $mov['fornecedor_id'] ? (int)$mov['fornecedor_id'] : null,
                    'fornecedor_nome' => $mov['fornecedor_nome'],
                    'numero_pedido' => $mov['numero_pedido'],
                    'data_movimentacao' => $mov['data_movimentacao'],
                    'valor_total' => (float)$mov['valor_total'],
                    'condicao_pagamento' => $mov['condicao_pagamento'],
                    'status' => $mov['status'],
                    'observacoes' => $mov['observacoes'],
                    'created_at' => $mov['created_at'],
                    'updated_at' => $mov['updated_at']
                ];
            }

            echo json_encode([
                'success' => true,
                'data' => $movimentacoesFormatadas,
                'pagination' => [
                    'page' => $page,
                    'limit' => $limit,
                    'total' => $total,
                    'pages' => ceil($total / $limit)
                ]
            ]);
            break;
            
        case 'POST':
            // Criar movimentação
            $data = json_decode(file_get_contents('php://input'), true);
            
            $required = ['tipo', 'data_movimentacao', 'itens'];
            foreach ($required as $field) {
                if (!isset($data[$field]) || empty($data[$field])) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'message' => "Campo $field é obrigatório"]);
                    exit();
                }
            }
            
            // Validar itens
            if (!is_array($data['itens']) || count($data['itens']) === 0) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Pelo menos um item é obrigatório']);
                exit();
            }
            
            foreach ($data['itens'] as $index => $item) {
                if (!isset($item['produto_id']) || !isset($item['quantidade']) || !isset($item['preco_unitario'])) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'message' => "Item $index: produto_id, quantidade e preco_unitario são obrigatórios"]);
                    exit();
                }
                
                if ($item['quantidade'] <= 0) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'message' => "Item $index: quantidade deve ser maior que zero"]);
                    exit();
                }
                
                if ($item['preco_unitario'] < 0) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'message' => "Item $index: preço unitário não pode ser negativo"]);
                    exit();
                }
            }
            
            // Calcular valor total
            $valor_total = 0;
            foreach ($data['itens'] as $item) {
                $valor_total += $item['quantidade'] * $item['preco_unitario'];
            }
            
            $conn->beginTransaction();
            
            try {
                // Inserir movimentação
                $sql = "INSERT INTO movimentacoes_estoque (
                    tipo, fornecedor_id, numero_pedido, data_movimentacao, 
                    valor_total, condicao_pagamento, status, observacoes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
                
                $stmt = $conn->prepare($sql);
                $stmt->execute([
                    $data['tipo'],
                    $data['fornecedor_id'] ?? null,
                    $data['numero_pedido'] ?? null,
                    $data['data_movimentacao'],
                    $valor_total,
                    $data['condicao_pagamento'] ?? 'avista',
                    $data['status'] ?? 'pendente',
                    $data['observacoes'] ?? null
                ]);
                
                $movimentacao_id = $conn->lastInsertId();
                
                // Inserir itens
                foreach ($data['itens'] as $item) {
                    $itemSql = "INSERT INTO movimentacoes_itens (
                        movimentacao_id, produto_id, quantidade, preco_unitario, subtotal
                    ) VALUES (?, ?, ?, ?, ?)";
                    
                    $itemStmt = $conn->prepare($itemSql);
                    $itemStmt->execute([
                        $movimentacao_id,
                        $item['produto_id'],
                        $item['quantidade'],
                        $item['preco_unitario'],
                        $item['quantidade'] * $item['preco_unitario']
                    ]);
                    
                    // Atualizar estoque e preço médio se status for confirmado
                    if (($data['status'] ?? 'pendente') === 'confirmado') {
                        $updateStmt = $conn->prepare("CALL atualizar_estoque_preco_medio(?, ?, ?, ?)");
                        $updateStmt->execute([
                            $item['produto_id'],
                            $item['quantidade'],
                            $item['preco_unitario'],
                            $data['tipo']
                        ]);
                    }
                }
                
                $conn->commit();
                
                echo json_encode([
                    'success' => true,
                    'data' => ['id' => $movimentacao_id],
                    'message' => 'Movimentação criada com sucesso'
                ]);
                
            } catch (Exception $e) {
                $conn->rollBack();
                throw $e;
            }
            break;
            
        case 'PUT':
            // Atualizar status da movimentação
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (empty($data['id']) || empty($data['status'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'ID e status são obrigatórios']);
                exit();
            }
            
            $conn->beginTransaction();
            
            try {
                // Buscar movimentação atual
                $getStmt = $conn->prepare("SELECT * FROM movimentacoes_estoque WHERE id = ?");
                $getStmt->execute([$data['id']]);
                $movimentacao = $getStmt->fetch();
                
                if (!$movimentacao) {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'message' => 'Movimentação não encontrada']);
                    exit();
                }
                
                // Atualizar status
                $updateStmt = $conn->prepare("UPDATE movimentacoes_estoque SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
                $updateStmt->execute([$data['status'], $data['id']]);
                
                // Se mudou para confirmado, atualizar estoque
                if ($data['status'] === 'confirmado' && $movimentacao['status'] !== 'confirmado') {
                    // Buscar itens da movimentação
                    $itemsStmt = $conn->prepare("SELECT * FROM movimentacoes_itens WHERE movimentacao_id = ?");
                    $itemsStmt->execute([$data['id']]);
                    $itens = $itemsStmt->fetchAll();
                    
                    // Atualizar estoque para cada item
                    foreach ($itens as $item) {
                        $stockStmt = $conn->prepare("CALL atualizar_estoque_preco_medio(?, ?, ?, ?)");
                        $stockStmt->execute([
                            $item['produto_id'],
                            $item['quantidade'],
                            $item['preco_unitario'],
                            $movimentacao['tipo']
                        ]);
                    }
                }
                
                $conn->commit();
                
                echo json_encode([
                    'success' => true,
                    'message' => 'Status atualizado com sucesso'
                ]);
                
            } catch (Exception $e) {
                $conn->rollBack();
                throw $e;
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
