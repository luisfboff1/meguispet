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

- [Arquitetura Web Completa](./02-architecture/ARQUITETURA_WEB_COMPLETA.md) - Guia completo sobre arquitetura web
- [Diagramas de Interligações](./02-architecture/DIAGRAMAS_INTERLIGACOES.md) - Diagramas visuais
- [Mapa de Interligações](./02-architecture/MAPA_INTERLIGACOES_SISTEMA.md) - Mapa detalhado
- [Redesign de Formulários](./02-architecture/FORMULARIOS_REDESIGN.md) - Unificação de formulários

### 🗄️ [03 - Database](./03-database/)
Estrutura do banco de dados, schema, migrations e otimizações.

- [Schema](./03-database/schema.md) - Schema completo das tabelas
- [Instruções MariaDB](./03-database/INSTRUCOES_MARIADB.md) - Setup MariaDB/MySQL (legacy)

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
- [Plano ICMS-ST Completo](./04-features/impostos/plano_icms_st_completo.md)
- [Progresso ICMS-ST](./04-features/impostos/ICMS_ST_PROGRESSO.md)

#### 🛒 [Vendas](./04-features/vendas/)
Gestão de vendas e pedidos.

- [README](./04-features/vendas/README.md) - Documentação completa

#### 📦 [Estoque](./04-features/estoque/)
Controle de estoque multi-loja.

- [README](./04-features/estoque/README.md) - Documentação completa

#### 💬 [Feedback](./04-features/feedback/)
Sistema de feedback e suporte.

- [README](./04-features/feedback/README.md) - Documentação completa

#### 📄 [PDF](./04-features/pdf/)
Sistema de geração de pedidos em PDF.

- [README](./04-features/pdf/README.md) - Documentação completa

### 🔌 [05 - API](./05-api/)
Documentação de APIs e integrações.

- [Supabase Auth](./05-api/SUPABASE_AUTH.md) - Sistema de autenticação atual
- [Auth Migration Guide](./05-api/AUTH_MIGRATION_GUIDE.md) - Guia de migração
- [Implementation Summary](./05-api/IMPLEMENTATION_USUARIOS_TOKEN.md) - Usuários e tokens

### 👨‍💻 [06 - Development](./06-development/)
Guias para desenvolvedores.

- [Comandos de Referência](./06-development/COMANDOS_REFERENCIA.md) - Lista completa de comandos
- [Performance Guide](./06-development/PERFORMANCE_GUIDE.md) - Otimização de performance
- [Bug Fixes](./06-development/bugfixes/) - Correções de bugs

### 🚀 [07 - Deployment](./07-deployment/)
Deploy e operações de produção.

- [Migration Vercel/Supabase](./07-deployment/MIGRATION_VERCEL_SUPABASE.md) - Migração completa
- [Migration Edge Middleware](./07-deployment/MIGRATION_EDGE_MIDDLEWARE.md) - Edge Runtime
- [Middleware Edge](./07-deployment/MIDDLEWARE_EDGE.md) - Configuração do middleware

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

**Última atualização:** 2025-11-14
**Versão:** 2.0.0

---

## 📦 Migração da Pasta `explicacoes/`

> **Nota:** Toda a documentação anteriormente na pasta `explicacoes/` foi reorganizada e movida para a estrutura `docs/` de acordo com a categorização acima. A pasta `explicacoes/` será mantida temporariamente como backup.
