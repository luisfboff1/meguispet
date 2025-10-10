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

try {
    $conn = getDbConnection();
    
    switch ($method) {
        case 'GET':
            // Listar vendas
            $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
            $search = isset($_GET['search']) ? $_GET['search'] : '';
            $status = isset($_GET['status']) ? $_GET['status'] : '';
            $data_inicio = isset($_GET['data_inicio']) ? $_GET['data_inicio'] : '';
            $data_fim = isset($_GET['data_fim']) ? $_GET['data_fim'] : '';
            
            $offset = ($page - 1) * $limit;
            
            $where = "WHERE 1=1";
            $params = [];
            
            if (!empty($search)) {
                $where .= " AND (numero_venda LIKE :search OR observacoes LIKE :search)";
                $params[':search'] = "%$search%";
            }
            
            if (!empty($status)) {
                $where .= " AND status = :status";
                $params[':status'] = $status;
            }
            
            if (!empty($data_inicio)) {
                $where .= " AND DATE(data_venda) >= :data_inicio";
                $params[':data_inicio'] = $data_inicio;
            }
            
            if (!empty($data_fim)) {
                $where .= " AND DATE(data_venda) <= :data_fim";
                $params[':data_fim'] = $data_fim;
            }
            
            // Contar total
            $countSql = "SELECT COUNT(*) as total FROM vendas $where";
            $countStmt = $conn->prepare($countSql);
            $countStmt->execute($params);
            $total = $countStmt->fetch()['total'];
            
            // Buscar vendas com relacionamentos
            $sql = "SELECT v.*, 
                           c.nome as cliente_nome, c.email as cliente_email,
                           vd.nome as vendedor_nome, vd.email as vendedor_email
                    FROM vendas v
                    LEFT JOIN clientes_fornecedores c ON v.cliente_id = c.id
                    LEFT JOIN vendedores vd ON v.vendedor_id = vd.id
                    $where 
                    ORDER BY v.data_venda DESC 
                    LIMIT :limit OFFSET :offset";
            
            $stmt = $conn->prepare($sql);
            
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();
            
            $vendas = $stmt->fetchAll();
            
            // Transformar dados para estrutura esperada pelo frontend
            $vendasFormatted = array_map(function($venda) {
                return [
                    'id' => $venda['id'],
                    'numero_venda' => $venda['numero_venda'],
                    'valor_total' => $venda['valor_total'],
                    'valor_final' => $venda['valor_final'],
                    'desconto' => $venda['desconto'],
                    'status' => $venda['status'],
                    'forma_pagamento' => $venda['forma_pagamento'],
                    'origem_venda' => $venda['origem_venda'],
                    'observacoes' => $venda['observacoes'],
                    'created_at' => $venda['data_venda'],
                    'updated_at' => $venda['updated_at'],
                    'cliente' => $venda['cliente_nome'] ? [
                        'id' => $venda['cliente_id'],
                        'nome' => $venda['cliente_nome'],
                        'email' => $venda['cliente_email']
                    ] : null,
                    'vendedor' => $venda['vendedor_nome'] ? [
                        'id' => $venda['vendedor_id'],
                        'nome' => $venda['vendedor_nome'],
                        'email' => $venda['vendedor_email']
                    ] : null
                ];
            }, $vendas);
            
            echo json_encode([
                'success' => true,
                'data' => $vendasFormatted,
                'pagination' => [
                    'page' => $page,
                    'limit' => $limit,
                    'total' => $total,
                    'pages' => ceil($total / $limit)
                ]
            ]);
            break;
            
        case 'POST':
            // Criar venda
            $data = json_decode(file_get_contents('php://input'), true);
            
            $required = ['itens'];
            foreach ($required as $field) {
                if (empty($data[$field])) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'message' => "Campo $field é obrigatório"]);
                    exit();
                }
            }
            
            $conn->beginTransaction();
            
            try {
                // Gerar número da venda
                $numero_venda = 'VEN' . date('Ymd') . str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT);
                
                // Calcular totais
                $valor_total = 0;
                foreach ($data['itens'] as $item) {
                    $valor_total += $item['quantidade'] * $item['preco_unitario'];
                }
                
                $desconto = $data['desconto'] ?? 0;
                $valor_final = $valor_total - $desconto;
                
                // Inserir venda
                $sql = "INSERT INTO vendas (numero_venda, cliente_id, vendedor_id, valor_total, desconto, valor_final, status, forma_pagamento, origem_venda, observacoes) 
                        VALUES (:numero_venda, :cliente_id, :vendedor_id, :valor_total, :desconto, :valor_final, :status, :forma_pagamento, :origem_venda, :observacoes)";
                
                $stmt = $conn->prepare($sql);
                $stmt->execute([
                    ':numero_venda' => $numero_venda,
                    ':cliente_id' => $data['cliente_id'] ?? null,
                    ':vendedor_id' => $data['vendedor_id'] ?? null,
                    ':valor_total' => $valor_total,
                    ':desconto' => $desconto,
                    ':valor_final' => $valor_final,
                    ':status' => $data['status'] ?? 'pendente',
                    ':forma_pagamento' => $data['forma_pagamento'] ?? 'dinheiro',
                    ':origem_venda' => $data['origem_venda'] ?? 'loja_fisica',
                    ':observacoes' => $data['observacoes'] ?? null
                ]);
                
                $venda_id = $conn->lastInsertId();
                
                // Inserir itens da venda
                foreach ($data['itens'] as $item) {
                    $subtotal = $item['quantidade'] * $item['preco_unitario'];
                    
                    $sql = "INSERT INTO itens_venda (venda_id, produto_id, quantidade, preco_unitario, subtotal) 
                            VALUES (:venda_id, :produto_id, :quantidade, :preco_unitario, :subtotal)";
                    
                    $stmt = $conn->prepare($sql);
                    $stmt->execute([
                        ':venda_id' => $venda_id,
                        ':produto_id' => $item['produto_id'],
                        ':quantidade' => $item['quantidade'],
                        ':preco_unitario' => $item['preco_unitario'],
                        ':subtotal' => $subtotal
                    ]);
                    
                    // Atualizar estoque
                    $sql = "UPDATE produtos SET estoque = estoque - :quantidade WHERE id = :produto_id";
                    $stmt = $conn->prepare($sql);
                    $stmt->execute([
                        ':quantidade' => $item['quantidade'],
                        ':produto_id' => $item['produto_id']
                    ]);
                }
                
                $conn->commit();
                
                echo json_encode([
                    'success' => true,
                    'message' => 'Venda criada com sucesso',
                    'data' => [
                        'id' => $venda_id,
                        'numero_venda' => $numero_venda
                    ]
                ]);
                
            } catch (Exception $e) {
                $conn->rollBack();
                throw $e;
            }
            break;
            
        case 'PUT':
            // Atualizar status da venda
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (empty($data['id']) || empty($data['status'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'ID e status são obrigatórios']);
                exit();
            }
            
            $sql = "UPDATE vendas SET status = :status, updated_at = CURRENT_TIMESTAMP WHERE id = :id";
            $stmt = $conn->prepare($sql);
            $result = $stmt->execute([
                ':id' => $data['id'],
                ':status' => $data['status']
            ]);
            
            if ($result && $stmt->rowCount() > 0) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Status da venda atualizado com sucesso'
                ]);
            } else {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Venda não encontrada']);
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
