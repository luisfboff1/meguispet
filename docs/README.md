# 📚 Documentação MeguisPet

Bem-vindo à documentação completa do sistema MeguisPet - Sistema de Gestão para Pet Shop.

---

## 📂 Estrutura da Documentação

### ⚙️ [01 - Setup](./01-setup/)
Configuração inicial do projeto, instalação de dependências e ferramentas.

- [Doppler Setup](./01-setup/doppler-setup.md) - Configuração do Doppler para variáveis de ambiente
- [Doppler Migration](./01-setup/doppler-migration.md) - Migração para Doppler
- [Supabase CLI](./01-setup/supabase-cli.md) - Instalação da CLI do Supabase
- [Agents Config](./01-setup/agents-config.md) - Configuração de agentes Claude Code
- [Setup Complete](./01-setup/setup-complete.md) - Checklist de setup completo

### 🏗️ [02 - Architecture](./02-architecture/)
Arquitetura do sistema, stack tecnológico e padrões de código.

- Tech Stack
- Folder Structure
- Design Patterns
- State Management

### 🗄️ [03 - Database](./03-database/)
Estrutura do banco de dados, schema, migrations e otimizações.

- [Schema](./03-database/schema.md) - Schema completo das tabelas
- [Migrations](./03-database/migrations/) - Histórico de migrations
- Relationships
- Indexes

### ✨ [04 - Features](./04-features/)
Documentação detalhada de cada funcionalidade do sistema.

#### 📊 [Relatórios](./04-features/relatorios/)
Sistema completo de relatórios customizáveis.

- [Plano Geral](./04-features/relatorios/00-plano-geral.md)
- [Fase 1 - Estrutura](./04-features/relatorios/01-fase-estrutura.md) ✅
- [Fase 2 - Vendas](./04-features/relatorios/02-fase-vendas.md) ✅
- [Fase 3 - Produtos](./04-features/relatorios/03-fase-produtos.md) ✅
- [Resumo](./04-features/relatorios/resumo-implementacao.md)

#### 💰 [Impostos](./04-features/impostos/)
Sistema de cálculo de impostos (IPI, ICMS, ST).

- [Plano IPI/ST](./04-features/impostos/plano-ipi-st.md)

#### 🛒 [Vendas](./04-features/vendas/)
Gestão de vendas e pedidos.

#### 📦 [Estoque](./04-features/estoque/)
Controle de estoque multi-loja.

#### 💬 [Feedback](./04-features/feedback/)
Sistema de feedback e suporte.

### 🔌 [05 - API](./05-api/)
Documentação de APIs e integrações.

- Authentication
- Endpoints
- Webhooks

### 👨‍💻 [06 - Development](./06-development/)
Guias para desenvolvedores.

- Getting Started
- Coding Standards
- Testing
- Debugging

### 🚀 [07 - Deployment](./07-deployment/)
Deploy e operações de produção.

- Vercel Deploy
- Database Deploy
- CI/CD
- Monitoring

---

## 🚀 Quick Start

1. **Setup Inicial**: Comece por [01-setup](./01-setup/)
2. **Entenda a Arquitetura**: Leia [02-architecture](./02-architecture/)
3. **Configure o Banco**: Veja [03-database](./03-database/)
4. **Desenvolva Features**: Consulte [04-features](./04-features/)

---

## 🔗 Links Úteis

- [README Principal](../README.md)
- [CLAUDE.md](../CLAUDE.md) - Instruções para Claude Code
- [Repositório GitHub](https://github.com/seu-usuario/meguispet)
- [Deploy Produção](https://gestao.meguispet.com)

---

## 📝 Como Contribuir

Para adicionar ou atualizar documentação:

1. Siga a estrutura de pastas existente
2. Use nomenclatura em kebab-case
3. Adicione links no README da pasta correspondente
4. Mantenha documentos concisos e objetivos

---

**Última atualização:** 2025-01-14
**Versão:** 1.0.0
