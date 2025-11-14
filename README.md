# 🚀 MeguisPet Next.js - Sistema de Gestão

Sistema de gestão profissional com **Next.js + TypeScript + Shadcn/ui** hospedado na **Vercel**.

Agora com **animações suaves em todas as seções**, **modais ainda mais acessíveis** e **otimizações de performance** para carregamento ultra-rápido.

## 📚 Documentação

- **[ARQUITETURA.md](./ARQUITETURA.md)** - 📊 Documentação completa da arquitetura do sistema com diagramas Mermaid detalhados
- **[CLAUDE.md](./CLAUDE.md)** - Guia para desenvolvimento com Claude Code
- **[DOPPLER_SETUP.md](./DOPPLER_SETUP.md)** - Configuração de variáveis de ambiente

## ✨ Características

- ✅ **Edge Middleware** - Autenticação otimizada no Edge runtime com latência mínima
- ✅ **Performance Otimizada** - Carregamento 70-80% mais rápido com caching e queries paralelas
- ✅ **Layout Global Automático** - Não precisa configurar página por página
- ✅ **TypeScript Profissional** - Tipos seguros em todo o sistema
- ✅ **Shadcn/ui Components** - Componentes modernos e acessíveis
- ✅ **Animações Framer Motion** - Cards animam automaticamente respeitando *prefers-reduced-motion*
- ✅ **Modais Acessíveis** - Foco preso, retorno ao elemento anterior e tecla *Esc* out-of-the-box
- ✅ **Deploy Vercel** - SSR otimizado com Edge Middleware
- ✅ **Supabase Backend** - PostgreSQL com autenticação JWT e real-time
- ✅ **Doppler Integration** - Gerenciamento seguro de variáveis de ambiente

## 🔐 Gerenciamento de Variáveis (Doppler)

Este projeto usa **Doppler** para gerenciamento centralizado e seguro de variáveis de ambiente.

### Quick Start
```bash
# 1. Instale o Doppler CLI
# Windows (PowerShell como Admin): scoop install doppler
# macOS: brew install dopplerhq/cli/doppler
# Linux: veja DOPPLER_SETUP.md

# 2. Autentique-se
doppler login

# 3. Projeto já está pré-configurado! ✅
# O arquivo .doppler.yaml já aponta para o projeto 'meguispet'
# Apenas verifique se está tudo OK:
pnpm doppler:check

# 4. Rode o projeto (variáveis injetadas automaticamente)
pnpm dev
```

**Nota**: O projeto já vem configurado para usar o projeto Doppler `meguispet` no ambiente `dev`. Não precisa rodar `doppler setup` manualmente!

**Documentação completa**: Veja `DOPPLER_SETUP.md` para instruções detalhadas, troubleshooting e integração com Vercel.

**Fallback sem Doppler**: Use `pnpm dev:local` para rodar com `.env.local` (veja `.env.example` para template).

## 🚀 Deploy na Vercel

### 1. Configure as Variáveis de Ambiente na Vercel

Acesse o dashboard da Vercel e configure:

```bash
# Supabase (obrigatório)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# API (opcional, padrão é /api)
NEXT_PUBLIC_API_URL=/api
```

### 2. Deploy

```bash
git add .
git commit -m "Update feature"
git push origin master
```

### 3. ✅ Deploy Automático!

A Vercel automaticamente:
- Detecta o push no branch `master`
- Instala dependências com pnpm
- Executa `pnpm build` (SSR mode)
- Faz deploy com Edge Middleware ativo
- URL de produção: `https://gestao.meguispet.com` (ou URL da Vercel)

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

### 🚀 Performance Optimizations

The system includes several performance optimizations for fast page loading:

- **Parallel API Loading** - Dashboard loads all data simultaneously (~70% faster)
- **Server-Side Caching** - 5-minute cache for expensive queries (~90% less DB load)
- **Database Indexes** - Composite indexes for common queries (~50-80% faster)
- **Query Optimization** - Parallel database queries and result limiting

For detailed information, see [PERFORMANCE_GUIDE.md](./PERFORMANCE_GUIDE.md)

### 📊 Applying Performance Indexes

To apply the database performance indexes:

```bash
# View the migration instructions
./scripts/apply-performance-indexes.sh

# Or manually apply via Supabase Dashboard:
# 1. Go to SQL Editor in Supabase Dashboard
# 2. Copy contents of database/performance_indexes.sql
# 3. Execute the SQL
```

### 🚀 Scripts Disponíveis

```bash
# Build otimizado (SSR)
pnpm build

# Build com análise de bundle
pnpm build:analyze

# Limpeza de cache
pnpm clean
pnpm clean:build
```

### 👀 Preview local do build

Para testar o build de produção localmente:

```bash
pnpm build
pnpm start
```

Isso inicia o servidor Next.js em modo produção (SSR) em `http://localhost:3000`.

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

- **URL**: `https://gestao.meguispet.com` (Vercel)
- **Backend**: Supabase (PostgreSQL + Auth)
- **Edge Middleware**: Proteção de rotas via Vercel Edge Network

---

**Sistema em produção na Vercel com Supabase! 🎉**
