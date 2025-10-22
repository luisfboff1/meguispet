<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$result = [
    'success' => false,
    'checks' => [
        'envFile' => false,
        'envVars' => [
            'DB_HOST' => false,
            'DB_NAME' => false,
            'DB_USER' => false,
            'DB_PASSWORD' => false,
            'JWT_SECRET' => false,
        ],
        'dbConnection' => false,
    ],
    'message' => '',
];

$envPath = __DIR__ . '/.env';
if (file_exists($envPath)) {
    $result['checks']['envFile'] = true;
    $env_content = file_get_contents($envPath);
    $env_lines = explode("\n", $env_content);
    $env = [];
    foreach ($env_lines as $line) {
        $line = trim($line);
        if (!empty($line) && strpos($line, '=') !== false && strpos($line, '#') !== 0) {
            list($key, $value) = explode('=', $line, 2);
            $env[trim($key)] = trim($value);
        }
    }

    foreach ($result['checks']['envVars'] as $k => $_) {
        $result['checks']['envVars'][$k] = isset($env[$k]) && $env[$k] !== '';
    }

    // Testar conexão ao banco de dados (sem expor detalhes sensíveis)
    $host = $env['DB_HOST'] ?? '';
    $dbname = $env['DB_NAME'] ?? '';
    $username = $env['DB_USER'] ?? '';
    $password = $env['DB_PASSWORD'] ?? '';

    if ($host && $dbname && $username && $password) {
        try {
            $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $pdo->query('SELECT 1');
            $result['checks']['dbConnection'] = true;
        } catch (Exception $e) {
            $result['checks']['dbConnection'] = false;
            $result['message'] = 'Falha na conexão com o banco: ' . $e->getMessage();
        }
    } else {
        $result['message'] = 'Variáveis de ambiente do banco ausentes.';
    }
} else {
    $result['message'] = 'Arquivo .env não encontrado em api/';
}

// Sucesso geral é quando .env está ok e conexão ao DB funcionou
$result['success'] = $result['checks']['envFile']
    && !in_array(false, $result['checks']['envVars'], true)
    && $result['checks']['dbConnection'] === true;

echo json_encode($result);
exit();
