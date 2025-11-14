# 🚀 Deploy e Migrações

Documentação de deploy, migrações e configurações de produção do MeguisPet.

---

## 📋 Documentação

### 🔄 Migrações
- **[Migration Vercel/Supabase](./MIGRATION_VERCEL_SUPABASE.md)** - Migração completa de Hostinger/PHP/MariaDB para Vercel/Next.js/Supabase
- **[Migration Edge Middleware](./MIGRATION_EDGE_MIDDLEWARE.md)** - Guia de migração para Edge Runtime
- **[Migration Summary](./MIGRATION_SUMMARY.md)** - Resumo da migração de segurança (JWT → Supabase Auth)

### ⚙️ Configurações
- **[Middleware Edge](./MIDDLEWARE_EDGE.md)** - Configuração do Next.js Edge Middleware com Supabase Auth
- **[Token Expiration Config](./TOKEN_EXPIRATION_CONFIG.md)** - Configuração de expiração de token (10 horas)

---

## 🎯 Stack de Produção

### Hospedagem
- **Frontend + Backend**: Vercel
- **Banco de Dados**: Supabase (PostgreSQL)
- **Autenticação**: Supabase Auth
- **Variáveis de Ambiente**: Doppler

### URLs
- **Produção**: https://gestao.meguispet.com
- **Staging**: (configure se necessário)
- **Supabase Dashboard**: https://supabase.com/dashboard

---

## 🚀 Deploy

### Deploy Automático (CI/CD)

#### Vercel
- ✅ Deploy automático em push para `main`
- ✅ Preview deploys para PRs
- ✅ Rollback automático em caso de erro

#### Configuração
1. Conecte repositório no Vercel
2. Configure variáveis de ambiente
3. Push para `main` dispara deploy

### Deploy Manual

#### Via CLI
```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy de produção
vercel --prod

# Deploy de preview
vercel
```

#### Via Git
```bash
# Commit suas mudanças
git add .
git commit -m "feat: nova funcionalidade"

# Push para main
git push origin main

# Vercel faz deploy automaticamente
```

---

## 🔧 Variáveis de Ambiente

### Produção (Vercel)

Configure no Dashboard do Vercel:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Doppler (opcional)
DOPPLER_TOKEN=your_doppler_token

# Next.js
NEXT_PUBLIC_API_URL=/api
```

### Doppler Integration

```bash
# Conectar Vercel com Doppler
doppler setup --project meguispet --config prd

# Sync automático de variáveis
doppler integration create vercel
```

---

## 🗄️ Database Migrations

### Supabase Migrations

#### Criar Migration
```bash
# Via SQL
supabase migration new add_new_column

# Edite o arquivo em supabase/migrations/
```

#### Aplicar Migrations
```bash
# Localmente
supabase db push

# Produção (automático via Dashboard)
# Ou via CLI:
supabase db push --project-ref your-project-ref
```

#### Rollback
```bash
# Criar migration de rollback
supabase migration new rollback_previous_change

# Aplicar rollback
supabase db push
```

---

## 📊 Monitoramento

### Vercel Analytics
- ✅ Performance metrics
- ✅ Core Web Vitals
- ✅ Visitor analytics

### Supabase Monitoring
- ✅ Database metrics
- ✅ API usage
- ✅ Auth analytics

### Logs
```bash
# Ver logs em tempo real
vercel logs --follow

# Ver logs de função específica
vercel logs api/vendas

# Ver logs de produção
vercel logs --prod
```

---

## 🔒 Segurança

### Checklist de Produção
- [x] HTTPS habilitado (Vercel)
- [x] Variáveis de ambiente seguras
- [x] Row Level Security (RLS) no Supabase
- [x] Validação server-side
- [x] Rate limiting (considerar)
- [x] CORS configurado
- [x] Tokens com expiração

### Headers de Segurança
```javascript
// next.config.js
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  }
];
```

---

## 🔄 Rollback

### Via Vercel Dashboard
1. Acesse o projeto no Vercel
2. Vá em "Deployments"
3. Encontre o deploy anterior estável
4. Clique em "..." → "Promote to Production"

### Via CLI
```bash
# Listar deployments
vercel ls

# Promover deployment específico
vercel promote [deployment-url]
```

---

## 🎯 Performance em Produção

### Edge Network
- ✅ CDN global (Vercel Edge)
- ✅ Cache automático de assets
- ✅ Compression automática (Brotli/Gzip)

### Otimizações
- ✅ Imagens otimizadas (Next/Image)
- ✅ Code splitting automático
- ✅ Server Components
- ✅ API Routes em Edge (quando possível)

### Métricas Alvo
- First Contentful Paint: < 1.8s
- Largest Contentful Paint: < 2.5s
- Time to Interactive: < 3.8s
- Cumulative Layout Shift: < 0.1

---

## 🔗 Links Relacionados

- [Setup](../01-setup/) - Configuração inicial
- [API](../05-api/) - Autenticação e APIs
- [Development](../06-development/) - Desenvolvimento local

---

## 📞 Suporte

### Em caso de problemas:
1. Verifique logs no Vercel
2. Verifique métricas no Supabase
3. Teste em ambiente local
4. Rollback se necessário

---

[⬅️ Voltar para Documentação](../README.md)
