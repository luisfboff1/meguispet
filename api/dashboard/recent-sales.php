<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../jwt_helper.php';

// Middleware de autenticação
$auth = require_auth();

try {
    $conn = getDbConnection();
    
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
    
    // Vendas recentes com informações do cliente e vendedor
    $sql = "SELECT v.*, 
                   c.nome as cliente_nome, c.email as cliente_email,
                   vd.nome as vendedor_nome
            FROM vendas v
            LEFT JOIN clientes_fornecedores c ON v.cliente_id = c.id
            LEFT JOIN vendedores vd ON v.vendedor_id = vd.id
            WHERE v.status != 'cancelado'
            ORDER BY v.data_venda DESC 
            LIMIT :limit";
    
    $stmt = $conn->prepare($sql);
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->execute();
    
    $vendas = $stmt->fetchAll();
    
    // Formatar dados para o frontend
    $vendas_formatadas = [];
    foreach ($vendas as $venda) {
        $vendas_formatadas[] = [
            'id' => $venda['id'],
            'numero_venda' => $venda['numero_venda'],
            'cliente_nome' => $venda['cliente_nome'] ?? 'Cliente não informado',
            'vendedor_nome' => $venda['vendedor_nome'] ?? 'Vendedor não informado',
            'valor_final' => (float)$venda['valor_final'],
            'status' => $venda['status'],
            'forma_pagamento' => $venda['forma_pagamento'],
            'origem_venda' => $venda['origem_venda'],
            'data_venda' => $venda['data_venda']
        ];
    }
    
    echo json_encode([
        'success' => true,
        'data' => $vendas_formatadas
    ]);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erro no servidor: ' . $e->getMessage()
    ]);
}
?>
