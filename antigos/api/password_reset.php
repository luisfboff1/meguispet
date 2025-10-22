<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

switch ($method) {
    case 'POST':
        if ($action === 'request') {
            requestPasswordReset();
        } elseif ($action === 'reset') {
            resetPassword();
        }
        break;
    default:
        jsonResponse(['success' => false, 'error' => 'Método não permitido'], 405);
}

/**
 * Solicitar reset de senha
 */
function requestPasswordReset() {
    global $pdo;
    
    $input = json_decode(file_get_contents('php://input'), true);
    $email = $input['email'] ?? '';
    
    if (empty($email)) {
        jsonResponse(['success' => false, 'error' => 'Email é obrigatório'], 400);
    }
    
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonResponse(['success' => false, 'error' => 'Email inválido'], 400);
    }
    
    try {
        // Verificar se usuário existe
        $stmt = $pdo->prepare("SELECT id, nome FROM usuarios WHERE email = ? AND ativo = 1");
        $stmt->execute([$email]);
        $usuario = $stmt->fetch();
        
        if (!$usuario) {
            // Por segurança, retornar sucesso mesmo se usuário não existir
            jsonResponse([
                'success' => true,
                'message' => 'Se o email estiver cadastrado, você receberá instruções para redefinir sua senha'
            ]);
        }
        
        // Gerar token de reset
        $token = bin2hex(random_bytes(32));
        $expires_at = date('Y-m-d H:i:s', strtotime('+1 hour')); // Token válido por 1 hora
        
        // Salvar token no banco (criar tabela se não existir)
        $stmt = $pdo->prepare("
            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                id INT PRIMARY KEY AUTO_INCREMENT,
                usuario_id INT NOT NULL,
                token VARCHAR(64) NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                used BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_token (token),
                INDEX idx_usuario (usuario_id),
                INDEX idx_expires (expires_at)
            )
        ");
        $stmt->execute();
        
        // Inserir token
        $stmt = $pdo->prepare("
            INSERT INTO password_reset_tokens (usuario_id, token, expires_at)
            VALUES (?, ?, ?)
        ");
        $stmt->execute([$usuario['id'], $token, $expires_at]);
        
        // Enviar email (implementar conforme necessário)
        $reset_link = "https://" . $_SERVER['HTTP_HOST'] . "/reset-password?token=" . $token;
        
        // Por enquanto, apenas logar o link (implementar envio de email depois)
        error_log("Password reset link for {$email}: {$reset_link}");
        
        jsonResponse([
            'success' => true,
            'message' => 'Instruções para redefinir senha enviadas para seu email',
            'debug_link' => $reset_link // Remover em produção
        ]);
        
    } catch (Exception $e) {
        jsonResponse(['success' => false, 'error' => 'Erro ao processar solicitação'], 500);
    }
}

/**
 * Redefinir senha com token
 */
function resetPassword() {
    global $pdo;
    
    $input = json_decode(file_get_contents('php://input'), true);
    $token = $input['token'] ?? '';
    $nova_senha = $input['nova_senha'] ?? '';
    
    if (empty($token) || empty($nova_senha)) {
        jsonResponse(['success' => false, 'error' => 'Token e nova senha são obrigatórios'], 400);
    }
    
    try {
        // Verificar token válido
        $stmt = $pdo->prepare("
            SELECT prt.usuario_id, u.email, u.nome
            FROM password_reset_tokens prt
            JOIN usuarios u ON prt.usuario_id = u.id
            WHERE prt.token = ? 
            AND prt.expires_at > NOW() 
            AND prt.used = FALSE
        ");
        $stmt->execute([$token]);
        $token_data = $stmt->fetch();
        
        if (!$token_data) {
            jsonResponse(['success' => false, 'error' => 'Token inválido ou expirado'], 400);
        }
        
        // Hash da nova senha
        $password_hash = password_hash($nova_senha, PASSWORD_DEFAULT);
        
        // Atualizar senha do usuário
        $stmt = $pdo->prepare("
            UPDATE usuarios 
            SET password_hash = ?, updated_at = NOW()
            WHERE id = ?
        ");
        $stmt->execute([$password_hash, $token_data['usuario_id']]);
        
        // Marcar token como usado
        $stmt = $pdo->prepare("
            UPDATE password_reset_tokens 
            SET used = TRUE 
            WHERE token = ?
        ");
        $stmt->execute([$token]);
        
        jsonResponse([
            'success' => true,
            'message' => 'Senha redefinida com sucesso'
        ]);
        
    } catch (Exception $e) {
        jsonResponse(['success' => false, 'error' => 'Erro ao redefinir senha'], 500);
    }
}
?>
