<?php
header('Content-Type: application/json');
require_once 'config.php';

$email = 'flboff@gmail.com';
$newPassword = 'Cacau@20';

try {
    // Gerar novo hash
    $newHash = password_hash($newPassword, PASSWORD_DEFAULT);
    
    // Atualizar no banco
    $stmt = $pdo->prepare("UPDATE usuarios SET password_hash = ? WHERE email = ?");
    $result = $stmt->execute([$newHash, $email]);
    
    if ($result) {
        // Testar se funcionou
        $testValid = password_verify($newPassword, $newHash);
        
        echo json_encode([
            'success' => true,
            'message' => 'Senha resetada com sucesso',
            'email' => $email,
            'password_test' => $testValid ? 'VÁLIDA' : 'INVÁLIDA'
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'error' => 'Erro ao atualizar senha'
        ]);
    }
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
