<?php
// Arquivo de teste para verificar se as APIs estão funcionando

// Testar API de produtos
echo "=== TESTE API PRODUTOS ===\n";
$produtos_url = "https://gestao.meguispet.com/api/produtos.php?page=1&limit=5";
$response = file_get_contents($produtos_url);
echo "Produtos: " . substr($response, 0, 200) . "...\n\n";

// Testar API de movimentações
echo "=== TESTE API MOVIMENTAÇÕES ===\n";
$mov_url = "https://gestao.meguispet.com/api/movimentacoes.php?page=1&limit=5";
$response = file_get_contents($mov_url);
echo "Movimentações: " . substr($response, 0, 200) . "...\n\n";

// Testar API de fornecedores
echo "=== TESTE API FORNECEDORES ===\n";
$fornecedores_url = "https://gestao.meguispet.com/api/fornecedores.php?page=1&limit=5";
$response = file_get_contents($fornecedores_url);
echo "Fornecedores: " . substr($response, 0, 200) . "...\n\n";

echo "=== TESTES CONCLUÍDOS ===\n";
?>
