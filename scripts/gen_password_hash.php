<?php
// Gera um hash bcrypt compatível com password_hash/password_verify do PHP
// Uso: php gen_password_hash.php senha [cost]
if (php_sapi_name() !== 'cli') {
    echo "Execute este script via CLI: php gen_password_hash.php senha [cost]\n";
    exit(1);
}

$pw = $argv[1] ?? null;
$cost = isset($argv[2]) ? (int)$argv[2] : 12;

if (!$pw) {
    echo "Uso: php gen_password_hash.php senha [cost]\n";
    echo "Exemplo: php gen_password_hash.php password 12\n";
    exit(1);
}

if ($cost < 4 || $cost > 20) {
    echo "Cost inválido, usando 12 como padrão.\n";
    $cost = 12;
}

$options = ['cost' => $cost];
$hash = password_hash($pw, PASSWORD_BCRYPT, $options);

if ($hash === false) {
    fwrite(STDERR, "Erro ao gerar o hash\n");
    exit(1);
}

echo "Password: {$pw}\n";
echo "Cost: {$cost}\n";
echo "Hash: {$hash}\n";

// Exemplo de verificação (para copiar/colar em código PHP)
echo "\nExemplo de verificação em PHP:\n";
echo "if (password_verify(\"").$pw.\"\", '".$hash."') { echo 'OK'; } else { echo 'INVALID'; }\n";

// Exemplo SQL para atualizar usuário (substitua usuario_id)
echo "\nExemplo SQL:\n";
echo "UPDATE usuarios SET senha = '" . addslashes($hash) . "' WHERE id = <usuario_id>;\n";

exit(0);
