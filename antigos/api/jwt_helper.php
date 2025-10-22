<?php
// 🔐 JWT HELPER - MEGUISPET
// Funções para geração e validação de tokens JWT

/**
 * Gera um token JWT
 */
function generate_jwt($payload) {
    $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
    
    // Adicionar expiração se não existir
    if (!isset($payload['exp'])) {
        $payload['exp'] = time() + (24 * 60 * 60); // 24 horas
    }
    
    $payload = json_encode($payload);
    
    $base64Header = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
    $base64Payload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload));
    
    $signature = hash_hmac('sha256', $base64Header . "." . $base64Payload, JWT_SECRET, true);
    $base64Signature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
    
    return $base64Header . "." . $base64Payload . "." . $base64Signature;
}

/**
 * Valida um token JWT
 */
function validate_jwt($token) {
    $parts = explode('.', $token);
    
    if (count($parts) !== 3) {
        return false;
    }
    
    list($base64Header, $base64Payload, $base64Signature) = $parts;
    
    $signature = hash_hmac('sha256', $base64Header . "." . $base64Payload, JWT_SECRET, true);
    $expectedSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
    
    if (!hash_equals($expectedSignature, $base64Signature)) {
        return false;
    }
    
    $payload = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $base64Payload)), true);
    
    // Verificar se o token não expirou
    if (isset($payload['exp']) && $payload['exp'] < time()) {
        return false;
    }
    
    return $payload;
}

/**
 * Extrai o token do header Authorization
 */
function get_token_from_header() {
    // Tentar getallheaders() primeiro
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
        if (isset($headers['Authorization'])) {
            $auth = $headers['Authorization'];
        } elseif (isset($headers['authorization'])) {
            $auth = $headers['authorization'];
        } else {
            $auth = null;
        }
    } else {
        // Fallback para $_SERVER
        $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? null;
    }
    
    if (!$auth || strpos($auth, 'Bearer ') !== 0) {
        return null;
    }
    
    return substr($auth, 7);
}

/**
 * Middleware de autenticação
 */
function require_auth() {
    $token = get_token_from_header();
    
    if (!$token) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'message' => 'Token de acesso não fornecido'
        ]);
        exit();
    }
    
    $payload = validate_jwt($token);
    
    if (!$payload) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'message' => 'Token inválido ou expirado'
        ]);
        exit();
    }
    
    return $payload;
}
?>
