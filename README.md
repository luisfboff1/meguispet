# 🚀 MeguisPet Next.js - Sistema de Gestão

Sistema de gestão profissional com **Next.js + TypeScript + Shadcn/ui** para hospedagem no Hostinger.

Agora com **animações suaves em todas as seções** e **modais ainda mais acessíveis**, entregando uma experiência refinada sem perder performance.

## ✨ Características

- ✅ **Edge Middleware** - Autenticação otimizada no Edge runtime com latência mínima
- ✅ **Layout Global Automático** - Não precisa configurar página por página
- ✅ **TypeScript Profissional** - Tipos seguros em todo o sistema
- ✅ **Shadcn/ui Components** - Componentes modernos e acessíveis
- ✅ **Animações Framer Motion** - Cards animam automaticamente respeitando *prefers-reduced-motion*
- ✅ **Modais Acessíveis** - Foco preso, retorno ao elemento anterior e tecla *Esc* out-of-the-box
- ✅ **SSG para Hostinger** - Export estático compatível
- ✅ **Deploy Automático** - GitHub Actions para Hostinger
✅ **APIs Node.js (Next API routes)** - O projeto agora usa rotas de API em Node/Next.js
│      BACKEND (Node + Postgres/DB)   │
├─────────────────────────────────────┤
│   Rotas de API em Next.js (Node)    │
- O projeto não depende de APIs PHP; use rotas de API Node ou um backend separado
# Build otimizado (SSG)
│      FRONTEND (Next.js SSG)         │
-- Buildar Next.js (SSG) e publicar artefatos
│  Shadcn/ui + Tailwind + TypeScript  │
└─────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│      BACKEND (PHP + MySQL)          │
├─────────────────────────────────────┤
│   Suas APIs existentes mantidas     │
└─────────────────────────────────────┘
```

## 🚀 Deploy Automático

### 1. Configure os Secrets no GitHub

```bash
# Deploy
FTP_SERVER=ftp.seudominio.com
FTP_USERNAME=seu_usuario
FTP_PASSWORD=sua_senha

# URLs
NEXT_PUBLIC_API_URL=/api
API_BASE_URL=https://gestao.meguispet.com/api
NEXT_PRIVATE_API_PROXY_TARGET=https://gestao.meguispet.com/api

# Supabase (for authentication and database)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Banco (para queries legadas, migrar para Supabase)
DB_HOST=localhost
DB_NAME=u123456_meguispet  
DB_USER=u123456_admin
DB_PASSWORD=sua_senha

# SMTP (para notificações)
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
# ... etc
```

### 2. Faça o Push

```bash
git add .
git commit -m "Deploy inicial Next.js"
git push origin main
```

### 3. ✅ Deploy Automático!

O GitHub Actions vai:
- Instalar dependências
- Buildar Next.js (SSG)
- Copiar suas APIs PHP
- Fazer deploy no Hostinger

## 🧩 Como Usar

### Criar Nova Página (Layout Automático)
```typescript
// pages/minha-pagina.tsx
export default function MinhaPagina() {
  return (
    <div>
      <h1>Minha Página</h1>
      {/* Layout aplicado automaticamente! */}
    </div>
  )
}
```

### Componentes Prontos
```typescript
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { AnimatedCard } from '@/components/ui/animated-card'

<Button variant="meguispet">Botão Personalizado</Button>
<Card>Card padrão com animação automática</Card>
<AnimatedCard>
  <CardHeader>
    <CardTitle>Card com gradiente e hover elevado</CardTitle>
  </CardHeader>
  <CardContent>Ideal para destaques e dashboards</CardContent>
</AnimatedCard>
```

### 🎬 Polimento de UI & Acessibilidade

- Cards usam Framer Motion em toda a aplicação, com hover sutil e entrada suave
- Modais bloqueiam o foco dentro da janela, retornam o foco ao fechar e respeitam *prefers-reduced-motion*
- Botões e inputs mantêm padrão Shadcn + tema MeguisPet
- É possível desativar a animação passando `animated={false}` para `Card` quando necessário (ex.: skeletons)

## 📱 Funcionalidades

- **Dashboard** - Métricas e visão geral
- **Vendas** - Gestão de vendas e pedidos  
- **Produtos** - Cadastro de produtos
- **Estoque** - Controle de estoque
- **Clientes** - Base de clientes
- **Vendedores** - Gestão de vendedores
- **Financeiro** - Controle financeiro
- **Relatórios** - Análises e relatórios
- **Usuários** - Gestão de usuários

## 🔧 Desenvolvimento Local

```bash
pnpm install
pnpm dev
```

Acesse: `http://localhost:3000`

## ⚡ Build Cache & Performance

### 🚀 Scripts Otimizados

```bash
# Build otimizado (SSG + cópia da API PHP)
pnpm build

# Build com análise de bundle
pnpm build:analyze

# Limpeza de cache
pnpm clean
pnpm clean:build
```

### 🗂️ Export estático e arquivos JSON

Este projeto usa `output: 'export'` no `next.config.js`, gerando HTML estático em `dist/` e, para cada rota, um arquivo JSON em `dist/_next/data/<buildId>/<rota>.json` extraído do `__NEXT_DATA__` do HTML. Exemplos:

- Página: `dist/login/index.html`
- Dados: `dist/_next/data/<buildId>/login.json`

Observações importantes:

- Páginas sem `getStaticProps` continuam tendo um JSON correspondente (conteúdo deriva do `__NEXT_DATA__`), útil para compatibilidade com clientes que esperam `_next/data`.
- Como usamos export estático, `getServerSideProps` não é suportado; use `getStaticProps`/client-side fetch.
- Imagens Next estão com `images.unoptimized = true` para funcionar em hospedagem estática.

### 👀 Preview local do build

Para servir o resultado estático de `dist/` localmente (sem Node server do Next):

```bash
pnpm preview
```

Isso inicia um servidor estático simples apontando para `dist/`.

### 🎨 Tailwind sem DaisyUI

- ⛔ **DaisyUI removido**: eliminamos o plugin para evitar seletores incompatíveis com o parser da pipeline de build.
- 🎯 **Tailwind 4 + Shadcn/ui**: toda a camada visual agora usa utilitários do Tailwind e componentes Shadcn personalizados.
- 🧱 **Tema MeguisPet**: cores, espaçamentos e variações continuam disponíveis via tokens (`bg-meguispet`, `text-meguispet` etc.).
- 🧪 **CSS limpo**: builds sem warnings nem regras ignoradas, facilitando depuração e inspeção de estilos.

### 📦 Cache Configurado

- ✅ **Webpack Build Worker**: Builds paralelos mais rápidos
- ✅ **CSS Optimization**: Otimização automática de CSS
- ✅ **Module Cache**: Cache de dependências Node.js
- ✅ **Image Cache**: Otimização automática de imagens
- ✅ **Console Cleanup**: Remove console.log em produção
- ✅ **outputFileTracingRoot configurado**: Evita avisos de múltiplos lockfiles em Windows/OneDrive

### 🎯 Benefícios

- ⚡ **Desenvolvimento mais rápido** com hot reload otimizado
- 🔄 **Builds incrementais** - só recompila o que mudou
- 💾 **Cache inteligente** - evita reprocessamento desnecessário
- 🚀 **Deploy mais rápido** - menos tempo de build
- 💰 **Menos CPU** - otimização de recursos

## 🌐 Produção

- **Frontend**: `https://gestao.meguispet.com`
- **APIs**: `https://gestao.meguispet.com/api`

---

**Arquitetura melhorada implementada com sucesso! 🎉**
