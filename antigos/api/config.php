<?php
// 🔧 CONFIGURAÇÃO DO BANCO DE DADOS - MEGUISPET
// Configurações centralizadas para todas as APIs

// Carregar variáveis de ambiente
if (file_exists(__DIR__ . '/.env')) {
    $env_content = file_get_contents(__DIR__ . '/.env');
    $env_lines = explode("\n", $env_content);
    
    foreach ($env_lines as $line) {
        $line = trim($line);
        if (!empty($line) && strpos($line, '=') !== false && strpos($line, '#') !== 0) {
            list($key, $value) = explode('=', $line, 2);
            $_ENV[trim($key)] = trim($value);
        }
    }
}

// Configurações do banco de dados (apenas variáveis de ambiente)
$host = $_ENV['DB_HOST'] ?? '';
$dbname = $_ENV['DB_NAME'] ?? '';
$username = $_ENV['DB_USER'] ?? '';
$password = $_ENV['DB_PASSWORD'] ?? '';

// Configurações JWT
$jwt_secret = $_ENV['JWT_SECRET'] ?? '';
define('JWT_SECRET', $jwt_secret);

// Verificar se as variáveis de ambiente estão configuradas
if (empty($host) || empty($dbname) || empty($username) || empty($password) || empty($jwt_secret)) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Variáveis de ambiente não configuradas',
        'error' => 'Environment variables not set'
    ]);
    exit();
}

// Configurações CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Função para conectar ao banco (reuso + persistente)
function getDbConnection() {
    static $pdo = null; // reuso dentro do mesmo request
    global $host, $dbname, $username, $password;

    if ($pdo instanceof PDO) {
        return $pdo;
    }

    try {
        $dsn = "mysql:host=$host;dbname=$dbname;charset=utf8mb4";
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            // Conexões persistentes reduzem novas conexões por hora (útil em hospedagem compartilhada)
            PDO::ATTR_PERSISTENT => true,
            // Evita emulação para maior segurança/compatibilidade
            PDO::ATTR_EMULATE_PREPARES => false,
        ];

        $pdo = new PDO($dsn, $username, $password, $options);
        return $pdo;
    } catch (PDOException $e) {
        $msg = $e->getMessage();
        // Mensagem amigável quando estourar limite de conexões por hora (1226)
        if (strpos($msg, '1226') !== false || stripos($msg, 'max_connections_per_hour') !== false) {
            $human = "O usuário do banco excedeu o limite de conexões por hora do provedor. Aguarde a janela horária renovar, reduza o número de requisições ou atualize o plano.";
        } else {
            $human = 'Erro de conexão com o banco de dados';
        }

        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => $human,
            'error' => $msg
        ]);
        exit();
    }
}

// Função para retornar resposta JSON
function jsonResponse($success, $data = null, $message = '', $error = null) {
    $response = ['success' => $success];
    
    if ($data !== null) {
        $response['data'] = $data;
    }
    
    if ($message) {
        $response['message'] = $message;
    }
    
    if ($error) {
        $response['error'] = $error;
    }
    
    header('Content-Type: application/json');
    echo json_encode($response);
    exit();
}

// Função para verificar token JWT
function verifyJWT($token) {
    global $jwt_secret;
    
    if (!$token) {
        return false;
    }
    
    try {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return false;
        }
        
        $header = json_decode(base64_decode($parts[0]), true);
        $payload = json_decode(base64_decode($parts[1]), true);
        $signature = $parts[2];
        
        // Verificar se o token não expirou
        if (isset($payload['exp']) && $payload['exp'] < time()) {
            return false;
        }
        
        // Verificar assinatura (simplificado)
        $expectedSignature = base64_encode(hash_hmac('sha256', $parts[0] . '.' . $parts[1], $jwt_secret, true));
        
        if ($signature !== $expectedSignature) {
            return false;
        }
        
        return $payload;
    } catch (Exception $e) {
        return false;
    }
}

?>
