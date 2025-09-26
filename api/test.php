<?php
// 🧪 TESTE DE CONEXÃO - MEGUISPET
// Verificar se as APIs estão funcionando

require_once 'config.php';

try {
    // Testar conexão com banco
    $pdo = getDbConnection();
    
    // Testar query simples
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM usuarios");
    $result = $stmt->fetch();
    
    jsonResponse(true, [
        'message' => 'API funcionando!',
        'database' => 'Conectado com sucesso',
        'usuarios_total' => $result['total'],
        'timestamp' => date('Y-m-d H:i:s')
    ], 'Sistema operacional');
    
} catch (Exception $e) {
    jsonResponse(false, null, 'Erro de conexão', $e->getMessage());
}
?>
