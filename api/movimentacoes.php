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
            // Listar movimentações
            $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
            $tipo = isset($_GET['tipo']) ? $_GET['tipo'] : '';
            $status = isset($_GET['status']) ? $_GET['status'] : '';
            
            $offset = ($page - 1) * $limit;
            
            $where = "WHERE 1=1";
            $params = [];
            $paramCount = 1;
            
            if (!empty($tipo)) {
                $where .= " AND tipo = ?";
                $params[] = $tipo;
                $paramCount++;
            }
            
            if (!empty($status)) {
                $where .= " AND status = ?";
                $params[] = $status;
                $paramCount++;
            }
            
            // Contar total
            $countSql = "SELECT COUNT(*) as total FROM movimentacoes_estoque $where";
            $countStmt = $conn->prepare($countSql);
            $countStmt->execute($params);
            $total = $countStmt->fetch()['total'];
            
            // Buscar movimentações
            $sql = "SELECT m.*, f.nome as fornecedor_nome 
                    FROM movimentacoes_estoque m 
                    LEFT JOIN fornecedores f ON m.fornecedor_id = f.id 
                    $where 
                    ORDER BY m.created_at DESC 
                    LIMIT ? OFFSET ?";
            
            $params[] = $limit;
            $params[] = $offset;
            
            $stmt = $conn->prepare($sql);
            $stmt->execute($params);
            $movimentacoes = $stmt->fetchAll();
            
            echo json_encode([
                'success' => true,
                'data' => $movimentacoes,
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
