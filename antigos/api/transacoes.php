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
            // Verificar se é para buscar métricas
            if (isset($_GET['metricas'])) {
                // Métricas financeiras
                $mes_atual = date('Y-m');
                
                // Receitas do mês
                $sql = "SELECT COALESCE(SUM(valor), 0) as receita 
                        FROM transacoes 
                        WHERE tipo = 'receita' 
                        AND DATE_FORMAT(data_transacao, '%Y-%m') = ?";
                $stmt = $conn->prepare($sql);
                $stmt->execute([$mes_atual]);
                $receita = $stmt->fetchColumn();
                
                // Despesas do mês
                $sql = "SELECT COALESCE(SUM(valor), 0) as despesa 
                        FROM transacoes 
                        WHERE tipo = 'despesa' 
                        AND DATE_FORMAT(data_transacao, '%Y-%m') = ?";
                $stmt = $conn->prepare($sql);
                $stmt->execute([$mes_atual]);
                $despesa = $stmt->fetchColumn();
                
                $lucro = $receita - $despesa;
                $margem = $receita > 0 ? ($lucro / $receita) * 100 : 0;
                
                // Transações recentes
                $sql = "SELECT * FROM transacoes 
                        ORDER BY data_transacao DESC, id DESC 
                        LIMIT 5";
                $stmt = $conn->prepare($sql);
                $stmt->execute();
                $transacoes_recentes = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                // Gráfico de receitas vs despesas (últimos 6 meses)
                $sql = "SELECT 
                            DATE_FORMAT(data_transacao, '%Y-%m') as mes,
                            COALESCE(SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END), 0) as receitas,
                            COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END), 0) as despesas
                        FROM transacoes 
                        WHERE data_transacao >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
                        GROUP BY DATE_FORMAT(data_transacao, '%Y-%m')
                        ORDER BY mes ASC";
                $stmt = $conn->prepare($sql);
                $stmt->execute();
                $grafico_mensal = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                jsonResponse(true, [
                    'receita' => (float)$receita,
                    'despesas' => (float)$despesa,
                    'lucro' => (float)$lucro,
                    'margem' => round($margem, 2),
                    'transacoes_recentes' => $transacoes_recentes,
                    'grafico_mensal' => $grafico_mensal
                ]);
                exit;
            }
            
            // Listar transações
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
            
            $sql .= " ORDER BY data_transacao DESC, id DESC LIMIT " . (int)$limit . " OFFSET " . (int)$offset;
            
            $stmt = $conn->prepare($sql);
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
            
            $countStmt = $conn->prepare($countSql);
            $countStmt->execute($countParams);
            $total = $countStmt->fetchColumn();
            
            jsonResponse(true, $transacoes, '', '', [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'pages' => ceil($total / $limit)
            ]);
            break;
        
        case 'POST':
            // Criar transação
            $input = json_decode(file_get_contents('php://input'), true);
            
            $required = ['tipo', 'valor', 'descricao', 'categoria'];
            foreach ($required as $field) {
                if (!isset($input[$field]) || empty($input[$field])) {
                    jsonResponse(false, null, "Campo obrigatório: $field");
                }
            }
            
            $sql = "INSERT INTO transacoes (tipo, valor, descricao, categoria, data_transacao, observacoes, created_at) 
                    VALUES (?, ?, ?, ?, ?, ?, NOW())";
            
            $stmt = $conn->prepare($sql);
            $stmt->execute([
                $input['tipo'],
                $input['valor'],
                $input['descricao'],
                $input['categoria'],
                $input['data_transacao'] ?? date('Y-m-d'),
                $input['observacoes'] ?? ''
            ]);
            
            $id = $conn->lastInsertId();
            
            jsonResponse(true, ['id' => $id], 'Transação criada com sucesso');
            break;
            
        case 'PUT':
            // Atualizar transação
            $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$id) {
                jsonResponse(false, null, 'ID da transação é obrigatório');
            }
            
            $sql = "UPDATE transacoes SET 
                    tipo = ?, 
                    valor = ?, 
                    descricao = ?, 
                    categoria = ?, 
                    data_transacao = ?, 
                    observacoes = ?,
                    updated_at = NOW()
                    WHERE id = ?";
            
            $stmt = $conn->prepare($sql);
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
                jsonResponse(true, null, 'Transação atualizada com sucesso');
            } else {
                jsonResponse(false, null, 'Transação não encontrada');
            }
            break;
            
        case 'DELETE':
            // Excluir transação
            $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
            
            if (!$id) {
                jsonResponse(false, null, 'ID da transação é obrigatório');
            }
            
            $sql = "DELETE FROM transacoes WHERE id = ?";
            $stmt = $conn->prepare($sql);
            $stmt->execute([$id]);
            
            if ($stmt->rowCount() > 0) {
                jsonResponse(true, null, 'Transação excluída com sucesso');
            } else {
                jsonResponse(false, null, 'Transação não encontrada');
            }
            break;
            
        default:
            jsonResponse(false, null, 'Método não permitido');
            break;
    }
    
} catch (Exception $e) {
    jsonResponse(false, null, 'Erro interno do servidor: ' . $e->getMessage());
}
?>
