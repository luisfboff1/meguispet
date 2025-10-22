# Script de instalação dos Twin Agents para novos projetos (Windows PowerShell)
# Autor: Luis Fernando Boff
# Uso: .\install-twin-agents.ps1

Write-Host "🚀 Instalando Twin Development Workflow..." -ForegroundColor Cyan
Write-Host ""

$CLAUDE_DIR = "$env:APPDATA\claude-code"

Write-Host "📁 Diretório de configuração: $CLAUDE_DIR" -ForegroundColor Yellow
Write-Host ""

# Criar diretórios se não existirem
New-Item -ItemType Directory -Force -Path "$CLAUDE_DIR\agents" | Out-Null
New-Item -ItemType Directory -Force -Path "$CLAUDE_DIR\commands" | Out-Null
New-Item -ItemType Directory -Force -Path ".claude\agents" | Out-Null
New-Item -ItemType Directory -Force -Path ".claude\commands" | Out-Null

# Copiar agentes globais para o projeto local
if (Test-Path "$CLAUDE_DIR\agents") {
    $agentFiles = Get-ChildItem -Path "$CLAUDE_DIR\agents" -Filter "*.md" -ErrorAction SilentlyContinue
    if ($agentFiles) {
        Write-Host "✅ Copiando agentes para o projeto local..." -ForegroundColor Green
        Copy-Item -Path "$CLAUDE_DIR\agents\*.md" -Destination ".claude\agents\" -Force -ErrorAction SilentlyContinue
    }
}

# Copiar comandos globais para o projeto local
if (Test-Path "$CLAUDE_DIR\commands") {
    $commandFiles = Get-ChildItem -Path "$CLAUDE_DIR\commands" -Filter "*.md" -ErrorAction SilentlyContinue
    if ($commandFiles) {
        Write-Host "✅ Copiando comandos para o projeto local..." -ForegroundColor Green
        Copy-Item -Path "$CLAUDE_DIR\commands\*.md" -Destination ".claude\commands\" -Force -ErrorAction SilentlyContinue
    }
}

# Verificar instalação
$AGENT_COUNT = (Get-ChildItem -Path ".claude\agents" -Filter "*.md" -ErrorAction SilentlyContinue).Count
$COMMAND_COUNT = (Get-ChildItem -Path ".claude\commands" -Filter "*.md" -ErrorAction SilentlyContinue).Count

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✅ Instalação Concluída!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 Resumo:" -ForegroundColor Yellow
Write-Host "   • Agentes instalados: $AGENT_COUNT"
Write-Host "   • Comandos instalados: $COMMAND_COUNT"
Write-Host ""
Write-Host "📚 Agentes Disponíveis:" -ForegroundColor Yellow
if (Test-Path ".claude\agents") {
    Get-ChildItem -Path ".claude\agents" -Filter "*.md" | ForEach-Object {
        $name = $_.BaseName
        Write-Host "   • $name" -ForegroundColor White
    }
}
Write-Host ""
Write-Host "🎯 Comandos Disponíveis:" -ForegroundColor Yellow
if (Test-Path ".claude\commands") {
    Get-ChildItem -Path ".claude\commands" -Filter "*.md" | ForEach-Object {
        $name = $_.BaseName
        Write-Host "   • /$name" -ForegroundColor White
    }
}
Write-Host ""
Write-Host "🚀 Como usar:" -ForegroundColor Cyan
Write-Host "   1. Certifique-se que o Claude Code está aberto"
Write-Host "   2. Execute: /twin-workflow `"sua tarefa aqui`""
Write-Host "   3. Revise o plano gerado"
Write-Host "   4. Digite 'ok' ou 'continue' para executar"
Write-Host ""
Write-Host "📖 Documentação: Veja CLAUDE.md no projeto" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
