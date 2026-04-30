$files = @(
  'pages/financeiro.tsx',
  'pages/produtos-estoque.tsx',
  'pages/integracoes/bling.tsx',
  'pages/usuarios.tsx',
  'pages/clientes.tsx',
  'pages/vendas.tsx',
  'pages/emergency-logout.tsx',
  'pages/dashboard.tsx',
  'pages/produto-detalhes.tsx',
  'pages/produtos.tsx',
  'components/forms/ProdutoForm.tsx',
  'components/forms/UsuarioPermissoesForm.tsx',
  'components/forms/FeedbackForm.tsx',
  'components/forms/TransacaoForm.tsx',
  'components/forms/UsuarioForm.tsx',
  'components/forms/VendedorForm.tsx',
  'components/forms/ImpostoProdutoForm.tsx',
  'components/forms/VendaForm.tsx',
  'components/agente/ChartRenderer.tsx',
  'components/agente/SqlQueryPanel.tsx',
  'components/icms/CalculadoraICMS.tsx',
  'components/layout/main-layout.tsx',
  'components/ui/data-table.tsx',
  'components/ui/animated-card.tsx',
  'components/ui/badge.tsx',
  'components/vendas/VendaImpostosCard.tsx',
  'components/forms/EstoqueOperacaoForm.tsx',
  'components/forms/TransacaoRecorrenteForm.tsx',
  'components/import/ImportPreviewTable.tsx'
)

$compMap = [ordered]@{
  '\bbg-white\s+dark:bg-gray-(?:800|900|950)\b' = 'bg-card'
  '\bbg-gray-50\s+dark:bg-gray-(?:800|900|950)\b' = 'bg-muted'
  '\bbg-gray-100\s+dark:bg-gray-(?:700|800|900)\b' = 'bg-muted'
  '\btext-gray-900\s+dark:text-white\b' = 'text-foreground'
  '\btext-gray-900\s+dark:text-gray-(?:50|100|200)\b' = 'text-foreground'
  '\btext-gray-800\s+dark:text-gray-(?:100|200)\b' = 'text-foreground'
  '\btext-gray-700\s+dark:text-gray-(?:200|300)\b' = 'text-foreground'
  '\btext-gray-600\s+dark:text-gray-(?:300|400)\b' = 'text-muted-foreground'
  '\btext-gray-500\s+dark:text-gray-(?:300|400|500)\b' = 'text-muted-foreground'
  '\btext-gray-400\s+dark:text-gray-(?:400|500|600)\b' = 'text-muted-foreground'
  '\bborder-gray-200\s+dark:border-gray-(?:700|800)\b' = 'border-border'
  '\bborder-gray-300\s+dark:border-gray-(?:600|700)\b' = 'border-input'
  '\bhover:bg-gray-50\s+dark:hover:bg-gray-(?:700|800|900)\b' = 'hover:bg-muted'
  '\bhover:bg-gray-100\s+dark:hover:bg-gray-(?:700|800)\b' = 'hover:bg-muted'
  '\bdivide-gray-200\s+dark:divide-gray-(?:700|800)\b' = 'divide-border'
}

$simpleMap = [ordered]@{
  '\bbg-gray-50\b' = 'bg-muted'
  '\bbg-gray-100\b' = 'bg-muted'
  '\bbg-gray-200\b' = 'bg-muted'
  '\btext-gray-400\b' = 'text-muted-foreground'
  '\btext-gray-500\b' = 'text-muted-foreground'
  '\btext-gray-600\b' = 'text-muted-foreground'
  '\btext-gray-700\b' = 'text-foreground'
  '\btext-gray-800\b' = 'text-foreground'
  '\btext-gray-900\b' = 'text-foreground'
  '\bborder-gray-200\b' = 'border-border'
  '\bborder-gray-300\b' = 'border-input'
  '\bhover:bg-gray-50\b' = 'hover:bg-muted'
  '\bhover:bg-gray-100\b' = 'hover:bg-muted'
  '\bdivide-gray-200\b' = 'divide-border'
  '\bbg-white(?![/\w-])' = 'bg-card'
}

$total = 0
foreach ($f in $files) {
  if (-not (Test-Path $f)) { Write-Host "skip $f"; continue }
  $orig = Get-Content $f -Raw
  $content = $orig
  foreach ($k in $compMap.Keys) { $content = [regex]::Replace($content, $k, $compMap[$k]) }
  foreach ($k in $simpleMap.Keys) { $content = [regex]::Replace($content, $k, $simpleMap[$k]) }
  if ($content -ne $orig) {
    Set-Content -Path $f -Value $content -NoNewline
    Write-Host "modified: $f"
    $total++
  }
}
Write-Host "Files modified: $total"
