# 💬 Sistema de Feedback

Documentação do sistema de feedback e suporte do MeguisPet.

---

## 📋 Documentação

### 📖 Principal
- **[Feedback System Docs](./FEEDBACK_SYSTEM_DOCS.md)** - Documentação completa do sistema de feedback

### 🎨 Interface
- **[UI Guide](./FEEDBACK_SYSTEM_UI_GUIDE.md)** - Guia visual da interface do sistema

### ✅ Implementação
- **[Implementation Complete](./FEEDBACK_IMPLEMENTATION_COMPLETE.md)** - Resumo da implementação completa

---

## 🎯 Funcionalidades

### ✅ Para Usuários

#### Criar Tickets
- ✅ Tipos: Bug, Melhoria, Nova Feature, Outro
- ✅ Níveis de prioridade (Baixa, Média, Alta, Crítica)
- ✅ Título e descrição detalhada
- ✅ Upload de screenshots e anexos
- ✅ Colar imagens diretamente (Ctrl+V)

#### Acompanhar Tickets
- ✅ Visualização em Kanban board
- ✅ Status: Backlog → Em Progresso → Em Teste → Concluído
- ✅ Ver detalhes e comentários
- ✅ Rastrear progresso

### ✅ Para Administradores

#### Gestão de Tickets
- ✅ Kanban board com drag-and-drop
- ✅ Mover tickets entre colunas
- ✅ Atualizar status automaticamente
- ✅ Histórico completo de alterações

#### Organização
- ✅ Filtrar por tipo e prioridade
- ✅ Buscar tickets
- ✅ Ver anexos e comentários
- ✅ Adicionar notas internas

---

## 🚀 Como Usar

### Enviar Feedback (Usuário)
1. Acesse a página de Feedback
2. Clique em "Novo Feedback"
3. Escolha o tipo (Bug, Melhoria, etc)
4. Defina a prioridade
5. Escreva título e descrição
6. Anexe screenshots se necessário
7. Envie o feedback

### Gerenciar Tickets (Admin)
1. Acesse o Kanban board
2. Arraste tickets entre colunas:
   - **Backlog**: Tickets novos
   - **Em Progresso**: Em desenvolvimento
   - **Em Teste**: Sendo testado
   - **Concluído**: Finalizado
3. Clique no ticket para ver detalhes
4. Adicione comentários se necessário

---

## 📊 Estrutura do Banco de Dados

### Tabela: `feedbacks`
```sql
- id (PK)
- tipo (Bug, Melhoria, Nova Feature, Outro)
- prioridade (Baixa, Média, Alta, Crítica)
- titulo
- descricao
- status (Backlog, Em Progresso, Em Teste, Concluído)
- usuario_id (FK)
- anexos (JSON com URLs)
- created_at
- updated_at
```

---

## 🎨 Interface

### Kanban Board
```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│   BACKLOG    │ EM PROGRESSO │   EM TESTE   │  CONCLUÍDO   │
├──────────────┼──────────────┼──────────────┼──────────────┤
│ [Ticket 1]   │ [Ticket 3]   │ [Ticket 5]   │ [Ticket 7]   │
│ [Ticket 2]   │ [Ticket 4]   │ [Ticket 6]   │ [Ticket 8]   │
│              │              │              │              │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

### Card do Ticket
- **Header**: Tipo + Prioridade (com cores)
- **Título**: Nome do ticket
- **Descrição**: Detalhes resumidos
- **Footer**: Data + Autor

---

## 🔗 Links Relacionados

- [Development](../../06-development/) - Guias de desenvolvimento
- [Database](../../03-database/) - Schema completo

---

[⬅️ Voltar para Features](../README.md)
