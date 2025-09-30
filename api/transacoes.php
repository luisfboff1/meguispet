<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once 'config.php';
require_once 'jwt_helper.php';

class TransacoesAPI {
    private $pdo;
    
    public function __construct() {
        $this->pdo = Database::getInstance()->getConnection();
    }
    
    // GET - Listar transações
    public function listar() {
        try {
            $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
            $tipo = isset($_GET['tipo']) ? $_GET['tipo'] : '';
            $data_inicio = isset($_GET['data_inicio']) ? $_GET['data_inicio'] : '';
            $data_fim = isset($_GET['data_fim']) ? $_GET['data_fim'] : '';
            
            $offset = ($page - 1) * $limit;
            
            $sql = "SELECT * FROM transacoes WHERE 1=1";
            $params = [];
            
            if (!empty($tipo)) {
                $sql .= " AND tipo = ?";
                $params[] = $tipo;
            }
            
            if (!empty($data_inicio)) {
                $sql .= " AND data_transacao >= ?";
                $params[] = $data_inicio;
            }
            
            if (!empty($data_fim)) {
                $sql .= " AND data_transacao <= ?";
                $params[] = $data_fim;
            }
            
            $sql .= " ORDER BY data_transacao DESC, id DESC LIMIT ? OFFSET ?";
            $params[] = $limit;
            $params[] = $offset;
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            $transacoes = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Contar total para paginação
            $countSql = "SELECT COUNT(*) FROM transacoes WHERE 1=1";
            $countParams = [];
            
            if (!empty($tipo)) {
                $countSql .= " AND tipo = ?";
                $countParams[] = $tipo;
            }
            
            if (!empty($data_inicio)) {
                $countSql .= " AND data_transacao >= ?";
                $countParams[] = $data_inicio;
            }
            
            if (!empty($data_fim)) {
                $countSql .= " AND data_transacao <= ?";
                $countParams[] = $data_fim;
            }
            
            $countStmt = $this->pdo->prepare($countSql);
            $countStmt->execute($countParams);
            $total = $countStmt->fetchColumn();
            
            echo json_encode([
                'success' => true,
                'data' => $transacoes,
                'pagination' => [
                    'page' => $page,
                    'limit' => $limit,
                    'total' => $total,
                    'pages' => ceil($total / $limit)
                ]
            ]);
            
        } catch (Exception $e) {
            echo json_encode([
                'success' => false,
                'message' => 'Erro ao listar transações: ' . $e->getMessage()
            ]);
        }
    }
    
    // GET - Buscar transação por ID
    public function buscar($id) {
        try {
            $sql = "SELECT * FROM transacoes WHERE id = ?";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$id]);
            $transacao = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($transacao) {
                echo json_encode([
                    'success' => true,
                    'data' => $transacao
                ]);
            } else {
                echo json_encode([
                    'success' => false,
                    'message' => 'Transação não encontrada'
                ]);
            }
            
        } catch (Exception $e) {
            echo json_encode([
                'success' => false,
                'message' => 'Erro ao buscar transação: ' . $e->getMessage()
            ]);
        }
    }
    
    // POST - Criar transação
    public function criar() {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            
            $required = ['tipo', 'valor', 'descricao', 'categoria'];
            foreach ($required as $field) {
                if (!isset($input[$field]) || empty($input[$field])) {
                    throw new Exception("Campo obrigatório: $field");
                }
            }
            
            $sql = "INSERT INTO transacoes (tipo, valor, descricao, categoria, data_transacao, observacoes, created_at) 
                    VALUES (?, ?, ?, ?, ?, ?, NOW())";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                $input['tipo'],
                $input['valor'],
                $input['descricao'],
                $input['categoria'],
                $input['data_transacao'] ?? date('Y-m-d'),
                $input['observacoes'] ?? ''
            ]);
            
            $id = $this->pdo->lastInsertId();
            
            echo json_encode([
                'success' => true,
                'message' => 'Transação criada com sucesso',
                'data' => ['id' => $id]
            ]);
            
        } catch (Exception $e) {
            echo json_encode([
                'success' => false,
                'message' => 'Erro ao criar transação: ' . $e->getMessage()
            ]);
        }
    }
    
    // PUT - Atualizar transação
    public function atualizar($id) {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            
            $sql = "UPDATE transacoes SET 
                    tipo = ?, 
                    valor = ?, 
                    descricao = ?, 
                    categoria = ?, 
                    data_transacao = ?, 
                    observacoes = ?,
                    updated_at = NOW()
                    WHERE id = ?";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                $input['tipo'],
                $input['valor'],
                $input['descricao'],
                $input['categoria'],
                $input['data_transacao'],
                $input['observacoes'] ?? '',
                $id
            ]);
            
            if ($stmt->rowCount() > 0) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Transação atualizada com sucesso'
                ]);
            } else {
                echo json_encode([
                    'success' => false,
                    'message' => 'Transação não encontrada'
                ]);
            }
            
        } catch (Exception $e) {
            echo json_encode([
                'success' => false,
                'message' => 'Erro ao atualizar transação: ' . $e->getMessage()
            ]);
        }
    }
    
    // DELETE - Excluir transação
    public function excluir($id) {
        try {
            $sql = "DELETE FROM transacoes WHERE id = ?";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$id]);
            
            if ($stmt->rowCount() > 0) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Transação excluída com sucesso'
                ]);
            } else {
                echo json_encode([
                    'success' => false,
                    'message' => 'Transação não encontrada'
                ]);
            }
            
        } catch (Exception $e) {
            echo json_encode([
                'success' => false,
                'message' => 'Erro ao excluir transação: ' . $e->getMessage()
            ]);
        }
    }
    
    // GET - Métricas financeiras
    public function metricas() {
        try {
            $mes_atual = date('Y-m');
            
            // Receitas do mês
            $sql = "SELECT COALESCE(SUM(valor), 0) as receita 
                    FROM transacoes 
                    WHERE tipo = 'receita' 
                    AND DATE_FORMAT(data_transacao, '%Y-%m') = ?";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$mes_atual]);
            $receita = $stmt->fetchColumn();
            
            // Despesas do mês
            $sql = "SELECT COALESCE(SUM(valor), 0) as despesa 
                    FROM transacoes 
                    WHERE tipo = 'despesa' 
                    AND DATE_FORMAT(data_transacao, '%Y-%m') = ?";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$mes_atual]);
            $despesa = $stmt->fetchColumn();
            
            $lucro = $receita - $despesa;
            $margem = $receita > 0 ? ($lucro / $receita) * 100 : 0;
            
            // Transações recentes
            $sql = "SELECT * FROM transacoes 
                    ORDER BY data_transacao DESC, id DESC 
                    LIMIT 5";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute();
            $transacoes_recentes = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Gráfico de receitas vs despesas (últimos 6 meses)
            $sql = "SELECT 
                        DATE_FORMAT(data_transacao, '%Y-%m') as mes,
                        SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END) as receitas,
                        SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END) as despesas
                    FROM transacoes 
                    WHERE data_transacao >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
                    GROUP BY DATE_FORMAT(data_transacao, '%Y-%m')
                    ORDER BY mes DESC";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute();
            $grafico_mensal = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                'success' => true,
                'data' => [
                    'receita' => (float)$receita,
                    'despesas' => (float)$despesa,
                    'lucro' => (float)$lucro,
                    'margem' => round($margem, 2),
                    'transacoes_recentes' => $transacoes_recentes,
                    'grafico_mensal' => $grafico_mensal
                ]
            ]);
            
        } catch (Exception $e) {
            echo json_encode([
                'success' => false,
                'message' => 'Erro ao buscar métricas: ' . $e->getMessage()
            ]);
        }
    }
}

// Verificar autenticação
$headers = getallheaders();
$token = isset($headers['Authorization']) ? str_replace('Bearer ', '', $headers['Authorization']) : null;

if (!$token || !JWT::validate($token)) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Token inválido']);
    exit;
}

// Roteamento
$method = $_SERVER['REQUEST_METHOD'];
$path = $_SERVER['REQUEST_URI'];
$path = parse_url($path, PHP_URL_PATH);
$path = str_replace('/api/transacoes', '', $path);

$api = new TransacoesAPI();

if ($method === 'GET') {
    if (empty($path) || $path === '/') {
        $api->listar();
    } elseif ($path === '/metricas') {
        $api->metricas();
    } else {
        $id = trim($path, '/');
        if (is_numeric($id)) {
            $api->buscar($id);
        } else {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Endpoint não encontrado']);
        }
    }
} elseif ($method === 'POST') {
    $api->criar();
} elseif ($method === 'PUT') {
    $id = trim($path, '/');
    if (is_numeric($id)) {
        $api->atualizar($id);
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID inválido']);
    }
} elseif ($method === 'DELETE') {
    $id = trim($path, '/');
    if (is_numeric($id)) {
        $api->excluir($id);
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID inválido']);
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido']);
}
?>
