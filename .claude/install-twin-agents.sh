#!/bin/bash
# Script de instalação dos Twin Agents para novos projetos
# Autor: Luis Fernando Boff
# Uso: bash install-twin-agents.sh

set -e

echo "🚀 Instalando Twin Development Workflow..."
echo ""

# Detectar sistema operacional
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    CLAUDE_DIR="$APPDATA/claude-code"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    CLAUDE_DIR="$HOME/Library/Application Support/claude-code"
else
    CLAUDE_DIR="$HOME/.config/claude-code"
fi

echo "📁 Diretório de configuração: $CLAUDE_DIR"
echo ""

# Criar diretórios se não existirem
mkdir -p "$CLAUDE_DIR/agents"
mkdir -p "$CLAUDE_DIR/commands"
mkdir -p ".claude/agents"
mkdir -p ".claude/commands"

# Copiar agentes globais para o projeto local
if [ -d "$CLAUDE_DIR/agents" ] && [ "$(ls -A $CLAUDE_DIR/agents)" ]; then
    echo "✅ Copiando agentes para o projeto local..."
    cp "$CLAUDE_DIR/agents/"*.md ".claude/agents/" 2>/dev/null || true
fi

# Copiar comandos globais para o projeto local
if [ -d "$CLAUDE_DIR/commands" ] && [ "$(ls -A $CLAUDE_DIR/commands)" ]; then
    echo "✅ Copiando comandos para o projeto local..."
    cp "$CLAUDE_DIR/commands/"*.md ".claude/commands/" 2>/dev/null || true
fi

# Verificar instalação
AGENT_COUNT=$(ls -1 .claude/agents/*.md 2>/dev/null | wc -l)
COMMAND_COUNT=$(ls -1 .claude/commands/*.md 2>/dev/null | wc -l)

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Instalação Concluída!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Resumo:"
echo "   • Agentes instalados: $AGENT_COUNT"
echo "   • Comandos instalados: $COMMAND_COUNT"
echo ""
echo "📚 Agentes Disponíveis:"
if [ -d ".claude/agents" ]; then
    for agent in .claude/agents/*.md; do
        if [ -f "$agent" ]; then
            name=$(basename "$agent" .md)
            echo "   • $name"
        fi
    done
fi
echo ""
echo "🎯 Comandos Disponíveis:"
if [ -d ".claude/commands" ]; then
    for cmd in .claude/commands/*.md; do
        if [ -f "$cmd" ]; then
            name=$(basename "$cmd" .md)
            echo "   • /$name"
        fi
    done
fi
echo ""
echo "🚀 Como usar:"
echo "   1. Certifique-se que o Claude Code está aberto"
echo "   2. Execute: /twin-workflow \"sua tarefa aqui\""
echo "   3. Revise o plano gerado"
echo "   4. Digite 'ok' ou 'continue' para executar"
echo ""
echo "📖 Documentação: Veja CLAUDE.md no projeto"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
