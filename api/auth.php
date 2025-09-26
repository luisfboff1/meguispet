<?php
// 🔐 API DE AUTENTICAÇÃO - MEGUISPET
// Login, logout e verificação de token

require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'POST':
        handleLogin();
        break;
    case 'GET':
        handleGetProfile();
        break;
    default:
        jsonResponse(false, null, 'Método não permitido', 'Method not allowed');
        break;
}

function handleLogin() {
    // Verificar se é JSON
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        jsonResponse(false, null, 'Dados inválidos', 'Invalid JSON');
    }
    
    $email = $input['email'] ?? '';
    $password = $input['password'] ?? '';
    
    if (empty($email) || empty($password)) {
        jsonResponse(false, null, 'Email e senha são obrigatórios', 'Missing credentials');
    }
    
    try {
        $pdo = getDatabaseConnection();
        
        // Buscar usuário no banco
        $stmt = $pdo->prepare("SELECT id, nome, email, password_hash, role, permissoes, ativo FROM usuarios WHERE email = ? AND ativo = 1");
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        
        if (!$user) {
            jsonResponse(false, null, 'Credenciais inválidas', 'Invalid credentials');
        }
        
        // Verificar senha
        if (!password_verify($password, $user['password_hash'])) {
            jsonResponse(false, null, 'Credenciais inválidas', 'Invalid credentials');
        }
        
        // Gerar token JWT
        $token = generate_jwt([
            'id' => $user['id'],
            'email' => $user['email'],
            'role' => $user['role']
        ]);
        
        // Retornar dados do usuário (sem senha)
        unset($user['password_hash']);
        
        jsonResponse(true, [
            'token' => $token,
            'user' => $user
        ], 'Login realizado com sucesso');
        
    } catch (Exception $e) {
        jsonResponse(false, null, 'Erro interno do servidor', $e->getMessage());
    }
}

function handleGetProfile() {
    // Verificar token
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? '';
    
    if (!$authHeader || !str_starts_with($authHeader, 'Bearer ')) {
        jsonResponse(false, null, 'Token não fornecido', 'No token provided');
    }
    
    $token = substr($authHeader, 7);
    $payload = verifyJWT($token);
    
    if (!$payload) {
        jsonResponse(false, null, 'Token inválido ou expirado', 'Invalid token');
    }
    
    try {
        $pdo = getDatabaseConnection();
        
        // Buscar dados do usuário
        $stmt = $pdo->prepare("SELECT id, nome, email, role, permissoes, ativo FROM usuarios WHERE id = ?");
        $stmt->execute([$payload['id']]);
        $user = $stmt->fetch();
        
        if (!$user) {
            jsonResponse(false, null, 'Usuário não encontrado', 'User not found');
        }
        
        jsonResponse(true, $user, 'Perfil carregado com sucesso');
        
    } catch (Exception $e) {
        jsonResponse(false, null, 'Erro interno do servidor', $e->getMessage());
    }
}
?>
