# Documentação — MeguisPet

Documentação interna do MeguisPet (sistema de gestão para pet shop). Código de
runtime fica em `pages/`, `components/`, `lib/`, `services/`; `docs/` guarda
contexto, decisões, guias e referências.

## Estrutura

| Pasta | Conteúdo |
|---|---|
| [`01-setup/`](01-setup/) | Setup inicial: Doppler, Supabase CLI, agentes Claude Code. |
| [`02-architecture/`](02-architecture/) | Arquitetura, diagramas, padrões. Ver [ARQUITETURA.md](02-architecture/ARQUITETURA.md). |
| [`03-database/`](03-database/) | Schema e modelagem do banco. (Fluxo operacional de migrations: [`/database/README.md`](../database/README.md).) |
| [`04-features/`](04-features/) | Implementação de funcionalidades (relatórios, vendas, estoque, impostos, PDF, mapa). |
| [`05-guides/`](05-guides/) | Guias de uso e tutoriais. |
| [`06-fixes/`](06-fixes/) | Correções pontuais e hotfixes. |
| [`07-changelog/`](07-changelog/) | Histórico de mudanças e resumos de implementação. |
| [`08-development/`](08-development/) | Ferramentas de dev, performance, template de projeto, arquitetura do agente. |
| [`09-api/`](09-api/) | APIs internas, autenticação Supabase, secrets. |
| [`10-deployment/`](10-deployment/) | Deploy (Vercel) e operações de produção. |
| [`agente/`](agente/) | Agente Megui: arquitetura, tabelas, joins, configuração, GPT-5, timing. |
| [`bling/`](bling/) | Integração com o Bling ERP. |
| [`nfe/`](nfe/) | Integração NF-e. |
| [`performance/`](performance/) | Otimizações de performance. |
| [`security/`](security/) | Auditorias de RLS, vulnerabilidades e plano de ação. |
| [`debug/`](debug/), [`fixes/`](fixes/), [`misc/`](misc/) | Notas de debug, correções soltas e material diverso. |

## Destaques

- **Banco / migrations**: [`/database/README.md`](../database/README.md) — fluxo de
  migrations com histórico, journal JSON e backup.
- **Agente Megui**: [`agente/ARQUITETURA.md`](agente/ARQUITETURA.md), [`agente/TABELAS.md`](agente/TABELAS.md), [`agente/CONFIGURACAO.md`](agente/CONFIGURACAO.md).
- **Segurança**: [`security/`](security/) — auditorias de RLS e checklist.
- **Arquitetura geral**: [`02-architecture/ARQUITETURA.md`](02-architecture/ARQUITETURA.md).

## Convenções

- Evite arquivos soltos na raiz de `docs/`; prefira uma subpasta temática.
- Ao mover um documento referenciado, atualize o link no mesmo commit.
- Nomeie em kebab-case ou mantenha o padrão da pasta.
- **Nunca** coloque tokens, senhas, connection strings ou dumps em `docs/` (nem
  no resto do repo — ele é público). Segredos vão para o Doppler.

## Links

- [README principal](../README.md)
- [CLAUDE.md](../CLAUDE.md) — instruções para Claude Code
- [AGENTS.md](../AGENTS.md) — workflow para agentes (migrations, dev server)
- Produção: https://gestao.meguispet.com
