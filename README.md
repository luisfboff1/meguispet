# 🚀 MeguisPet Next.js - Sistema de Gestão

Sistema de gestão profissional com **Next.js + TypeScript + Shadcn/ui** para hospedagem no Hostinger.

## ✨ Características

- ✅ **Layout Global Automático** - Não precisa configurar página por página
- ✅ **TypeScript Profissional** - Tipos seguros em todo o sistema
- ✅ **Shadcn/ui Components** - Componentes modernos e acessíveis
- ✅ **SSG para Hostinger** - Export estático compatível
- ✅ **Deploy Automático** - GitHub Actions para Hostinger
- ✅ **APIs PHP Compatíveis** - Mantém suas APIs existentes

## 🏗️ Arquitetura

```
┌─────────────────────────────────────┐
│      FRONTEND (Next.js SSG)         │
├─────────────────────────────────────┤
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
NEXT_PUBLIC_API_URL=https://gestao.meguispet.com/api
API_BASE_URL=https://gestao.meguispet.com/api

# Banco (seus atuais)
DB_HOST=localhost
DB_NAME=u123456_meguispet  
DB_USER=u123456_admin
DB_PASSWORD=sua_senha

# Outros (seus atuais)
JWT_SECRET=seu_jwt_secret
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

<Button variant="meguispet">Botão Personalizado</Button>
<Card>...</Card>
```

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
npm install
npm run dev
```

Acesse: `http://localhost:3000`

## ⚡ Build Cache & Performance

### 🚀 Scripts Otimizados

```bash
# Desenvolvimento com Turbo (mais rápido)
npm run dev:turbo

# Build otimizado
npm run build

# Build com análise de bundle
npm run build:analyze

# Limpeza de cache
npm run clean
npm run clean:build
```

### 📦 Cache Configurado

- ✅ **Webpack Build Worker**: Builds paralelos mais rápidos
- ✅ **CSS Optimization**: Otimização automática de CSS
- ✅ **Module Cache**: Cache de dependências Node.js
- ✅ **Image Cache**: Otimização automática de imagens
- ✅ **Console Cleanup**: Remove console.log em produção

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
