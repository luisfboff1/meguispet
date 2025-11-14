# 🏗️ Arquitetura do Sistema

Documentação da arquitetura, padrões de design e estrutura do projeto MeguisPet.

---

## 📋 Conteúdo

### 📐 Arquitetura Geral
- **[Arquitetura Web Completa](./ARQUITETURA_WEB_COMPLETA.md)** - Guia completo sobre arquitetura web, conceitos fundamentais, e stack tecnológica

### 📊 Diagramas e Mapas
- **[Diagramas de Interligações](./DIAGRAMAS_INTERLIGACOES.md)** - Diagramas visuais das interligações do sistema
- **[Mapa de Interligações](./MAPA_INTERLIGACOES_SISTEMA.md)** - Mapa detalhado de todas as interligações entre componentes

### 🎨 Design e UI/UX
- **[Redesign de Formulários](./FORMULARIOS_REDESIGN.md)** - Plano de unificação e simplificação de formulários

---

## 🎯 Visão Geral

### Stack Tecnológica
- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js 15 (App Router)
- **Database**: PostgreSQL (Supabase)
- **Auth**: Supabase Auth
- **Deploy**: Vercel

### Padrões de Arquitetura
- Server Components e Client Components
- API Routes (Next.js)
- Edge Middleware para autenticação
- Gestão de estado com Context API
- Validação com schemas

### Estrutura de Pastas
```
meguispet/
├── components/     # Componentes React reutilizáveis
├── pages/          # Páginas Next.js (rotas)
├── lib/            # Bibliotecas e utilidades
├── services/       # Serviços e lógica de negócio
├── hooks/          # Custom React hooks
├── types/          # Definições TypeScript
├── styles/         # Estilos globais
└── public/         # Assets estáticos
```

---

## 🔗 Links Relacionados

- [Setup](../01-setup/) - Configuração inicial do projeto
- [Database](../03-database/) - Estrutura do banco de dados
- [Features](../04-features/) - Funcionalidades implementadas
- [API](../05-api/) - Documentação de APIs
- [Development](../06-development/) - Guias de desenvolvimento

---

[⬅️ Voltar para Documentação](../README.md)
