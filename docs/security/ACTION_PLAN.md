# Plano de Ação de Segurança - MeguisPet

**Data de Criação:** 18 de Novembro de 2025
**Status:** Aguardando Aprovação
**Responsável:** Equipe de Desenvolvimento

---

## Índice
1. [Visão Geral](#visão-geral)
2. [Prioridades e Cronograma](#prioridades-e-cronograma)
3. [Fase 1: Correções Críticas (P0)](#fase-1-correções-críticas-p0)
4. [Fase 2: Melhorias de Alta Prioridade (P1)](#fase-2-melhorias-de-alta-prioridade-p1)
5. [Fase 3: Melhorias Médias (P2)](#fase-3-melhorias-médias-p2)
6. [Fase 4: Melhorias Baixas (P3)](#fase-4-melhorias-baixas-p3)
7. [Testes e Validação](#testes-e-validação)
8. [Métricas de Sucesso](#métricas-de-sucesso)
9. [Recursos Necessários](#recursos-necessários)

---

## Visão Geral

Este plano de ação visa corrigir as vulnerabilidades identificadas no [Relatório de Vulnerabilidades](./VULNERABILITIES.md) e implementar melhorias de segurança de forma estruturada e priorizada.

### Objetivo
Elevar o nível de segurança do MeguisPet de **6.5/10** para **9.0/10** em 3 meses.

### Abordagem
- **Fase 1 (P0):** Correções críticas - 2 semanas
- **Fase 2 (P1):** Melhorias de alta prioridade - 4 semanas
- **Fase 3 (P2):** Melhorias médias - 4 semanas
- **Fase 4 (P3):** Melhorias baixas - Ongoing

---

## Prioridades e Cronograma

| Prioridade | Vulnerabilidades | Prazo | Status |
|------------|------------------|-------|--------|
| **P0 - Crítico** | VULN-001, VULN-002, VULN-003 | 2 semanas | 🔴 Pendente |
| **P1 - Alto** | VULN-004, VULN-005, VULN-006, VULN-007 | 4 semanas | 🔴 Pendente |
| **P2 - Médio** | VULN-008, VULN-009, VULN-010 | 4 semanas | 🔴 Pendente |
| **P3 - Baixo** | VULN-011, VULN-012 | Ongoing | 🔴 Pendente |

### Cronograma Visual

```
Semana 1-2:  [████████████████] P0: Correções Críticas
Semana 3-6:  [████████████████████████████] P1: Alta Prioridade
Semana 7-10: [████████████████████████████] P2: Média Prioridade
Semana 11+:  [----ongoing----] P3: Baixa Prioridade
```

---

## Fase 1: Correções Críticas (P0)

**Prazo:** 2 semanas
**Objetivo:** Eliminar vulnerabilidades críticas que podem levar a vazamento de dados

### 1.1 VULN-001: Implementar Row Level Security (RLS)

**Tempo estimado:** 5-7 dias
**Complexidade:** Alta
**Risco de Breaking Changes:** Médio

#### Tarefas

**1.1.1 Análise e Planejamento (1 dia)**
- [ ] Mapear todas as tabelas que precisam de RLS
- [ ] Definir políticas de acesso por tabela
- [ ] Identificar relacionamentos entre tabelas
- [ ] Planejar políticas para diferentes roles (admin, user, etc.)

**1.1.2 Criar Script de Migração (1 dia)**
- [ ] Criar arquivo `database/migrations/014_enable_rls.sql`
- [ ] Habilitar RLS em todas as tabelas principais
- [ ] Criar políticas de SELECT, INSERT, UPDATE, DELETE

**Exemplo de Implementação:**

```sql
-- database/migrations/014_enable_rls.sql

-- =====================================================
-- ENABLE ROW LEVEL SECURITY ON ALL MAIN TABLES
-- =====================================================

-- 1. CLIENTES_FORNECEDORES
ALTER TABLE clientes_fornecedores ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view/edit their own records
CREATE POLICY "Users view own clients" ON clientes_fornecedores
  FOR SELECT
  USING (auth.uid()::text IN (
    SELECT supabase_user_id::text FROM usuarios WHERE ativo = true
  ));

CREATE POLICY "Users insert own clients" ON clientes_fornecedores
  FOR INSERT
  WITH CHECK (auth.uid()::text IN (
    SELECT supabase_user_id::text FROM usuarios WHERE ativo = true
  ));

CREATE POLICY "Users update own clients" ON clientes_fornecedores
  FOR UPDATE
  USING (auth.uid()::text IN (
    SELECT supabase_user_id::text FROM usuarios WHERE ativo = true
  ));

-- Policy: Admins have full access
CREATE POLICY "Admins have full access to clients" ON clientes_fornecedores
  FOR ALL
  USING (
    auth.uid()::text IN (
      SELECT supabase_user_id::text
      FROM usuarios
      WHERE role = 'admin' AND ativo = true
    )
  );

-- 2. PRODUTOS
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users view products" ON produtos
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins manage products" ON produtos
  FOR ALL
  USING (
    auth.uid()::text IN (
      SELECT supabase_user_id::text
      FROM usuarios
      WHERE role IN ('admin', 'manager') AND ativo = true
    )
  );

-- 3. VENDAS
ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;

-- Users can only view their own sales
CREATE POLICY "Users view own sales" ON vendas
  FOR SELECT
  USING (
    vendedor_id IN (
      SELECT v.id FROM vendedores v
      JOIN usuarios u ON u.id = v.usuario_id -- Assumindo relacionamento
      WHERE u.supabase_user_id::text = auth.uid()::text
    )
  );

-- Admins view all sales
CREATE POLICY "Admins view all sales" ON vendas
  FOR SELECT
  USING (
    auth.uid()::text IN (
      SELECT supabase_user_id::text
      FROM usuarios
      WHERE role IN ('admin', 'manager') AND ativo = true
    )
  );

-- Continue for other tables: transacoes, movimentacoes_estoque, etc.
```

**1.1.3 Testar em Ambiente de Dev (2 dias)**
- [ ] Aplicar migração em dev
- [ ] Testar acesso como diferentes roles (admin, user)
- [ ] Verificar que users não veem dados de outros users
- [ ] Verificar que admins veem todos os dados
- [ ] Testar inserção, atualização, exclusão

**1.1.4 Atualizar Código da Aplicação (1-2 dias)**
- [ ] Revisar uso de `getSupabaseServiceRole()` - substituir por `getSupabaseServerAuth()` onde apropriado
- [ ] Garantir que todas as queries respeitam RLS
- [ ] Atualizar testes automatizados

**1.1.5 Deploy em Staging e Testes (1 dia)**
- [ ] Deploy em staging
- [ ] Testes de QA
- [ ] Testes de penetração básicos
- [ ] Performance testing

**1.1.6 Deploy em Produção (1 dia)**
- [ ] Backup completo do banco antes do deploy
- [ ] Aplicar migração em produção (maintenance window)
- [ ] Monitorar logs por 24h
- [ ] Rollback plan preparado

#### Critérios de Sucesso
- ✅ RLS habilitado em todas as tabelas principais
- ✅ Políticas testadas para todos os roles
- ✅ Nenhum vazamento de dados entre usuários
- ✅ Performance não degradou (< 10% de aumento de latência)

---

### 1.2 VULN-002: Minimizar Uso de Service Role Key

**Tempo estimado:** 2-3 dias
**Complexidade:** Média
**Risco de Breaking Changes:** Baixo

#### Tarefas

**1.2.1 Auditoria de Uso (1 dia)**
- [ ] Grep por `getSupabaseServiceRole()` no codebase
- [ ] Grep por `SUPABASE_SERVICE_ROLE_KEY` no codebase
- [ ] Documentar onde e por que está sendo usado
- [ ] Identificar usos desnecessários

```bash
# Script de auditoria
grep -r "getSupabaseServiceRole" .
grep -r "SUPABASE_SERVICE_ROLE_KEY" .
```

**1.2.2 Refatorar Código (1-2 dias)**
- [ ] Substituir `getSupabaseServiceRole()` por `getSupabaseServerAuth()` onde possível
- [ ] Adicionar comentários de alerta onde Service Role é necessário
- [ ] Criar função wrapper `getSupabaseServiceRoleAdmin()` com logging

**Exemplo de Refatoração:**

```typescript
// lib/supabase-auth.ts

/**
 * ⚠️ WARNING: This function bypasses RLS!
 * Only use for admin operations where you need full database access.
 * Always validate permissions before calling this function.
 *
 * Logs all usage for security auditing.
 */
export const getSupabaseServiceRoleAdmin = (
  reason: string, // Required: explain why service role is needed
  userId?: number
): SupabaseClient => {
  // Log usage for security audit
  console.warn('[SECURITY] Service Role accessed:', {
    reason,
    userId,
    timestamp: new Date().toISOString(),
    stack: new Error().stack
  });

  return getSupabaseServiceRole();
};

// Refatorar getUserProfile para usar contexto de usuário
export const getUserProfile = async (
  email: string,
  supabase: SupabaseClient // ✅ Recebe client autenticado ao invés de usar Service Role
): Promise<AppUserProfile | null> => {
  const { data, error } = await supabase
    .from('usuarios')
    .select('id, nome, email, role, permissoes, ativo')
    .eq('email', email)
    .eq('ativo', true)
    .single();

  if (error || !data) {
    return null;
  }

  return data as AppUserProfile;
};
```

**1.2.3 Testes (1 dia)**
- [ ] Testar todas as funcionalidades afetadas
- [ ] Verificar que RLS ainda está sendo respeitado
- [ ] Code review

#### Critérios de Sucesso
- ✅ Service Role usado apenas em operações administrativas específicas
- ✅ Todos os usos de Service Role documentados e logados
- ✅ Nenhuma regressão de funcionalidade

---

### 1.3 VULN-003: Implementar Validação e Sanitização de Inputs

**Tempo estimado:** 5-7 dias
**Complexidade:** Alta
**Risco de Breaking Changes:** Baixo

#### Tarefas

**1.3.1 Escolher e Configurar Biblioteca de Validação (1 dia)**
- [ ] Instalar Zod: `pnpm add zod`
- [ ] Criar estrutura de schemas em `lib/validations/`
- [ ] Configurar error handling padrão

```bash
pnpm add zod
mkdir lib/validations
```

**1.3.2 Criar Schemas de Validação (2 dias)**
- [ ] Criar schema para cada entidade (Cliente, Produto, Venda, etc.)
- [ ] Definir validações de negócio (preços > 0, emails válidos, etc.)

**Exemplo de Implementação:**

```typescript
// lib/validations/cliente.schema.ts
import { z } from 'zod';

export const clienteSchema = z.object({
  nome: z.string()
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .max(255, 'Nome deve ter no máximo 255 caracteres')
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Nome deve conter apenas letras'),

  tipo: z.enum(['cliente', 'fornecedor', 'ambos'], {
    errorMap: () => ({ message: 'Tipo inválido' })
  }),

  email: z.string()
    .email('Email inválido')
    .max(255)
    .optional()
    .or(z.literal('')),

  telefone: z.string()
    .regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, 'Telefone inválido. Formato: (XX) XXXXX-XXXX')
    .optional()
    .or(z.literal('')),

  documento: z.string()
    .refine((doc) => {
      if (!doc) return true; // Optional
      // CPF: 11 dígitos, CNPJ: 14 dígitos
      const digitsOnly = doc.replace(/\D/g, '');
      return digitsOnly.length === 11 || digitsOnly.length === 14;
    }, 'CPF/CNPJ inválido')
    .optional(),

  cep: z.string()
    .regex(/^\d{5}-?\d{3}$/, 'CEP inválido')
    .optional()
    .or(z.literal('')),

  vendedor_id: z.number().int().positive().optional(),

  observacoes: z.string()
    .max(1000, 'Observações devem ter no máximo 1000 caracteres')
    .optional()
});

export const clienteCreateSchema = clienteSchema;
export const clienteUpdateSchema = clienteSchema.partial().extend({
  id: z.number().int().positive()
});

export type ClienteInput = z.infer<typeof clienteSchema>;
```

```typescript
// lib/validations/produto.schema.ts
import { z } from 'zod';

export const produtoSchema = z.object({
  nome: z.string()
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .max(255, 'Nome deve ter no máximo 255 caracteres'),

  descricao: z.string()
    .max(2000, 'Descrição deve ter no máximo 2000 caracteres')
    .optional(),

  preco: z.number()
    .nonnegative('Preço deve ser maior ou igual a zero')
    .max(999999.99, 'Preço máximo excedido'),

  preco_venda: z.number()
    .nonnegative('Preço de venda deve ser maior ou igual a zero')
    .max(999999.99, 'Preço de venda máximo excedido'),

  preco_custo: z.number()
    .nonnegative('Preço de custo deve ser maior ou igual a zero')
    .max(999999.99, 'Preço de custo máximo excedido'),

  estoque: z.number()
    .int('Estoque deve ser um número inteiro')
    .nonnegative('Estoque não pode ser negativo')
    .max(999999, 'Estoque máximo excedido'),

  estoque_minimo: z.number()
    .int('Estoque mínimo deve ser um número inteiro')
    .nonnegative('Estoque mínimo não pode ser negativo')
    .max(999999, 'Estoque mínimo máximo excedido'),

  categoria: z.string()
    .max(100, 'Categoria deve ter no máximo 100 caracteres')
    .optional(),

  codigo_barras: z.string()
    .max(50, 'Código de barras deve ter no máximo 50 caracteres')
    .optional()
}).refine((data) => {
  // Business rule: preço de venda deve ser >= preço de custo
  return data.preco_venda >= data.preco_custo;
}, {
  message: 'Preço de venda deve ser maior ou igual ao preço de custo',
  path: ['preco_venda']
});

export type ProdutoInput = z.infer<typeof produtoSchema>;
```

**1.3.3 Criar Middleware de Validação (1 dia)**
- [ ] Criar helper `withValidation()` para validar payloads
- [ ] Integrar com error handling

```typescript
// lib/api/withValidation.ts
import { NextApiResponse } from 'next';
import { ZodSchema, ZodError } from 'zod';
import { AuthenticatedRequest } from '@/lib/supabase-middleware';

export const withValidation = <T>(
  schema: ZodSchema<T>,
  handler: (req: AuthenticatedRequest, res: NextApiResponse, validatedData: T) => Promise<void>
) => {
  return async (req: AuthenticatedRequest, res: NextApiResponse) => {
    try {
      // Validate request body
      const validatedData = schema.parse(req.body);

      // Call handler with validated data
      return handler(req, res, validatedData);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }

      throw error; // Re-throw unexpected errors
    }
  };
};
```

**1.3.4 Aplicar Validação em Endpoints (2-3 dias)**
- [ ] Atualizar endpoint `/api/clientes` com validação
- [ ] Atualizar endpoint `/api/produtos` com validação
- [ ] Atualizar endpoint `/api/vendas` com validação
- [ ] Atualizar demais endpoints

**Exemplo de Uso:**

```typescript
// pages/api/clientes.ts
import { withSupabaseAuth, AuthenticatedRequest } from '@/lib/supabase-middleware';
import { withValidation } from '@/lib/api/withValidation';
import { clienteCreateSchema, clienteUpdateSchema } from '@/lib/validations/cliente.schema';

const handlePost = withValidation(
  clienteCreateSchema,
  async (req: AuthenticatedRequest, res: NextApiResponse, validatedData) => {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('clientes_fornecedores')
      .insert(validatedData)
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({
      success: true,
      message: 'Cliente criado com sucesso',
      data,
    });
  }
);

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const { method } = req;

  if (method === 'POST') {
    return handlePost(req, res);
  }
  // ... outros métodos
};

export default withSupabaseAuth(handler);
```

**1.3.5 Adicionar Sanitização de HTML (1 dia)**
- [ ] Instalar `isomorphic-dompurify`: `pnpm add isomorphic-dompurify`
- [ ] Criar helper de sanitização
- [ ] Aplicar em campos de texto livre

```typescript
// lib/sanitization.ts
import DOMPurify from 'isomorphic-dompurify';

export const sanitizeHTML = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [], // Strip all HTML
    ALLOWED_ATTR: []
  });
};

export const sanitizeInput = (input: any): any => {
  if (typeof input === 'string') {
    return sanitizeHTML(input);
  }
  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }
  if (typeof input === 'object' && input !== null) {
    return Object.fromEntries(
      Object.entries(input).map(([key, value]) => [key, sanitizeInput(value)])
    );
  }
  return input;
};
```

**1.3.6 Testes (1 dia)**
- [ ] Testes unitários para schemas
- [ ] Testes de integração para endpoints
- [ ] Testes com payloads maliciosos (XSS, SQL injection attempts)

#### Critérios de Sucesso
- ✅ Todos os endpoints de escrita validam inputs
- ✅ Mensagens de erro claras e úteis
- ✅ XSS não é possível via inputs
- ✅ Business rules enforced (preços > 0, etc.)

---

## Fase 2: Melhorias de Alta Prioridade (P1)

**Prazo:** 4 semanas (após Fase 1)
**Objetivo:** Adicionar proteções contra ataques comuns

### 2.1 VULN-004: Implementar Rate Limiting

**Tempo estimado:** 3-5 dias
**Complexidade:** Média

#### Opção 1: Vercel Edge Config + KV (Recomendado para Vercel)

```typescript
// lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Login: 5 tentativas / 15 minutos
export const loginRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '15 m'),
  analytics: true,
  prefix: '@upstash/ratelimit/login',
});

// Signup: 3 tentativas / hora
export const signupRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '1 h'),
  analytics: true,
  prefix: '@upstash/ratelimit/signup',
});

// APIs gerais: 100 requisições / minuto
export const generalRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'),
  analytics: true,
  prefix: '@upstash/ratelimit/general',
});

// Helper para aplicar rate limit
export const withRateLimit = (
  rateLimit: Ratelimit,
  identifier: (req: NextApiRequest) => string
) => {
  return (handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>) => {
    return async (req: NextApiRequest, res: NextApiResponse) => {
      const id = identifier(req);
      const { success, limit, reset, remaining } = await rateLimit.limit(id);

      res.setHeader('X-RateLimit-Limit', limit.toString());
      res.setHeader('X-RateLimit-Remaining', remaining.toString());
      res.setHeader('X-RateLimit-Reset', reset.toString());

      if (!success) {
        return res.status(429).json({
          success: false,
          message: 'Muitas requisições. Tente novamente mais tarde.',
          retryAfter: reset - Date.now()
        });
      }

      return handler(req, res);
    };
  };
};
```

**Uso:**

```typescript
// pages/api/auth.ts
import { withRateLimit, loginRateLimit } from '@/lib/rate-limit';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  // ... lógica de login
};

export default withRateLimit(
  loginRateLimit,
  (req) => req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown'
)(handler);
```

#### Tarefas
- [ ] Criar conta no Upstash (Redis serverless)
- [ ] Configurar variáveis de ambiente
- [ ] Implementar rate limiter
- [ ] Aplicar em endpoints críticos (auth, signup, APIs)
- [ ] Adicionar CAPTCHA após N tentativas falhas
- [ ] Testes de carga

---

### 2.2 VULN-005: Implementar Proteção CSRF

**Tempo estimado:** 2-3 dias
**Complexidade:** Média

#### Solução: Migrar para SameSite=Strict

**Implementação mais simples e eficaz:**

```typescript
// useAuth.ts:7 - Atualizar
const COOKIE_BASE = 'Path=/; SameSite=Strict' // ✅ Era Lax, agora Strict

// lib/supabase-auth.ts:64 - Atualizar
res.setHeader('Set-Cookie', `${name}=${value}; Path=${options?.path || '/'}; HttpOnly; Secure; SameSite=Strict; ${options?.maxAge ? `Max-Age=${options.maxAge}` : ''}`);
```

#### Alternativa: Double Submit Cookie Pattern

```typescript
// lib/csrf.ts
import { randomBytes } from 'crypto';

export const generateCSRFToken = (): string => {
  return randomBytes(32).toString('hex');
};

export const verifyCSRFToken = (req: NextApiRequest): boolean => {
  const tokenFromHeader = req.headers['x-csrf-token'] as string;
  const tokenFromCookie = req.cookies['csrf_token'];

  return tokenFromHeader === tokenFromCookie && Boolean(tokenFromHeader);
};

export const withCSRFProtection = (
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) => {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // Only check CSRF for state-changing methods
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method || '')) {
      if (!verifyCSRFToken(req)) {
        return res.status(403).json({
          success: false,
          message: 'CSRF token inválido'
        });
      }
    }

    return handler(req, res);
  };
};
```

#### Tarefas
- [ ] Implementar SameSite=Strict (mais simples)
- [ ] OU implementar Double Submit Cookie
- [ ] Testar com diferentes navegadores
- [ ] Atualizar frontend para enviar CSRF token (se necessário)

---

### 2.3 VULN-006: Melhorar Headers de Segurança

**Tempo estimado:** 1-2 dias
**Complexidade:** Baixa

```javascript
// next.config.js:74-91 - Atualizar
async headers() {
  return [
    {
      source: '/:path*',
      headers: [
        // DNS Prefetch
        {
          key: 'X-DNS-Prefetch-Control',
          value: 'on'
        },
        // Clickjacking Protection
        {
          key: 'X-Frame-Options',
          value: 'DENY' // ✅ Mudado de SAMEORIGIN para DENY (mais seguro)
        },
        // ✅ NOVO: MIME Type Sniffing Protection
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff'
        },
        // ✅ NOVO: XSS Protection (legacy, mas ainda útil)
        {
          key: 'X-XSS-Protection',
          value: '1; mode=block'
        },
        // ✅ NOVO: Referrer Policy
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin'
        },
        // ✅ NOVO: Permissions Policy (desabilita features desnecessárias)
        {
          key: 'Permissions-Policy',
          value: 'geolocation=(), microphone=(), camera=(), payment=()'
        },
        // ✅ NOVO: HSTS (Strict Transport Security)
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=31536000; includeSubDomains; preload'
        },
        // ✅ NOVO: Content Security Policy
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live", // Ajustar conforme necessário
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https: blob:",
            "font-src 'self' data:",
            "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://vercel.live",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "upgrade-insecure-requests"
          ].join('; ')
        }
      ],
    },
  ]
}
```

**IMPORTANTE: CSP pode quebrar funcionalidades que usam inline scripts/styles. Teste cuidadosamente!**

#### Tarefas
- [ ] Adicionar todos os headers acima
- [ ] Testar em dev com CSP strict
- [ ] Ajustar CSP para permitir recursos necessários
- [ ] Testar em staging
- [ ] Deploy gradual em produção

---

### 2.4 VULN-007: Implementar Isolamento Multi-Tenant (Se Aplicável)

**Tempo estimado:** 5-7 dias (se multi-tenant)
**Complexidade:** Alta

**⚠️ Pular se o sistema for single-tenant**

#### Tarefas (se multi-tenant)
- [ ] Adicionar campo `tenant_id` UUID em todas as tabelas
- [ ] Criar tabela `tenants` (id, nome, ativo, created_at)
- [ ] Atualizar RLS policies para incluir tenant_id
- [ ] Adicionar tenant_id no JWT payload
- [ ] Middleware para extrair tenant_id do token
- [ ] Atualizar todas as queries para filtrar por tenant_id
- [ ] Testes de isolamento entre tenants

---

## Fase 3: Melhorias Médias (P2)

**Prazo:** 4 semanas (após Fase 2)

### 3.1 VULN-008: Implementar Logging e Auditoria

**Tempo estimado:** 5-7 dias

```typescript
// lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
});

// Security event logger
export const securityLogger = {
  loginAttempt: (email: string, success: boolean, ip: string) => {
    logger.info({
      event: 'login_attempt',
      email,
      success,
      ip,
      timestamp: new Date().toISOString()
    });
  },

  loginSuccess: (userId: number, email: string, ip: string) => {
    logger.info({
      event: 'login_success',
      userId,
      email,
      ip,
      timestamp: new Date().toISOString()
    });
  },

  loginFailure: (email: string, reason: string, ip: string) => {
    logger.warn({
      event: 'login_failure',
      email,
      reason,
      ip,
      timestamp: new Date().toISOString()
    });
  },

  logout: (userId: number, email: string) => {
    logger.info({
      event: 'logout',
      userId,
      email,
      timestamp: new Date().toISOString()
    });
  },

  accessDenied: (userId: number, resource: string, action: string) => {
    logger.warn({
      event: 'access_denied',
      userId,
      resource,
      action,
      timestamp: new Date().toISOString()
    });
  }
};
```

#### Tarefas
- [ ] Instalar biblioteca de logging (Pino)
- [ ] Criar logger de segurança
- [ ] Adicionar logging em auth endpoints
- [ ] Adicionar logging em operações críticas (delete, update)
- [ ] Integrar com serviço de monitoring (Sentry/Datadog)
- [ ] Criar dashboard de eventos de segurança

---

### 3.2 VULN-009: Configurar Expiração de Tokens

**Tempo estimado:** 2-3 dias

#### Tarefas
- [ ] Documentar configuração JWT no Supabase dashboard
- [ ] Configurar JWT expiration = 1 hora
- [ ] Configurar Refresh token = 7 dias
- [ ] Implementar idle timeout (30 minutos)
- [ ] Implementar token blacklist para logout
- [ ] Testes de sessão

---

### 3.3 VULN-010: Melhorar Configuração de Cookies

**Tempo estimado:** 1-2 dias

```typescript
// Configuração ideal de cookies
const COOKIE_CONFIG = {
  path: '/',
  httpOnly: true,
  secure: true, // Sempre true (force HTTPS)
  sameSite: 'Strict' as const,
  maxAge: 60 * 60, // 1 hora (forçar refresh)
  domain: process.env.NODE_ENV === 'production' ? '.meguispet.com' : undefined
};
```

#### Tarefas
- [ ] Atualizar configuração de cookies
- [ ] Usar `__Host-` prefix para cookies críticos
- [ ] Reduzir Max-Age para 1 hora
- [ ] Forçar Secure flag sempre
- [ ] Testes cross-browser

---

## Fase 4: Melhorias Baixas (P3)

**Prazo:** Ongoing

### 4.1 VULN-011: Sanitizar Mensagens de Erro

**Tempo estimado:** 1-2 dias

```typescript
// lib/error-handler.ts
export const sanitizeErrorForClient = (error: any): string => {
  if (process.env.NODE_ENV === 'production') {
    // Em produção, retornar mensagem genérica
    return 'Ocorreu um erro inesperado. Por favor, tente novamente.';
  }

  // Em dev, pode mostrar detalhes
  return error instanceof Error ? error.message : 'Unknown error';
};
```

---

### 4.2 VULN-012: Limitar Upload de Arquivos

**Tempo estimado:** 1-2 dias (se houver funcionalidade de upload)

```typescript
// lib/upload-validation.ts
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export const validateUpload = (file: File): { valid: boolean; error?: string } => {
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'Arquivo muito grande. Máximo: 10MB' };
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: 'Tipo de arquivo não permitido' };
  }

  return { valid: true };
};
```

---

## Testes e Validação

### Testes de Segurança a Realizar

#### 1. Testes Automatizados
- [ ] Unit tests para validações
- [ ] Integration tests para auth flow
- [ ] E2E tests para user journeys críticos

#### 2. Testes Manuais de Segurança
- [ ] **SQL Injection:** Tentar injetar SQL em todos os inputs
- [ ] **XSS:** Tentar injetar scripts em campos de texto
- [ ] **CSRF:** Tentar forçar ações de outro site
- [ ] **Auth Bypass:** Tentar acessar recursos sem auth
- [ ] **RLS Bypass:** Tentar acessar dados de outro usuário
- [ ] **Privilege Escalation:** Tentar executar ações de admin como user

#### 3. Ferramentas de Scanning
- [ ] OWASP ZAP scan
- [ ] Nikto web scanner
- [ ] Nuclei vulnerability scanner
- [ ] npm audit / pnpm audit

#### 4. Penetration Testing (Opcional)
- [ ] Contratar pentester externo
- [ ] Bug bounty program

---

## Métricas de Sucesso

### KPIs de Segurança

| Métrica | Valor Atual | Meta | Status |
|---------|-------------|------|--------|
| Security Score | 6.5/10 | 9.0/10 | 🔴 |
| Vulnerabilidades Críticas | 3 | 0 | 🔴 |
| Vulnerabilidades Altas | 4 | 0 | 🔴 |
| Cobertura de Testes | 40% | 80% | 🔴 |
| MTTR (Mean Time to Remediate) | - | < 48h | - |
| Logs de Segurança | Não | Sim | 🔴 |
| RLS Habilitado | Não | Sim | 🔴 |

### Validação de Conclusão

Antes de considerar este plano concluído, verificar:

- ✅ Todas as vulnerabilidades P0 corrigidas
- ✅ Todas as vulnerabilidades P1 corrigidas
- ✅ RLS habilitado e testado
- ✅ Rate limiting implementado
- ✅ Validação de inputs em todos os endpoints
- ✅ Headers de segurança configurados
- ✅ Logging de eventos de segurança
- ✅ Scan de vulnerabilidades limpo (0 críticas, 0 altas)
- ✅ Pentest realizado (se possível)
- ✅ Documentação atualizada

---

## Recursos Necessários

### Ferramentas e Serviços

| Recurso | Custo Estimado | Necessidade |
|---------|----------------|-------------|
| Upstash Redis (Rate limiting) | $10-30/mês | Essencial |
| Sentry (Monitoring) | $26-80/mês | Recomendado |
| Penetration Testing | $2000-5000 | Opcional |
| Security Training | $500-1000 | Recomendado |

### Equipe

- 1 Desenvolvedor Full-Stack (principal)
- 1 Desenvolvedor Backend (suporte)
- 1 QA Engineer (testes)
- 1 DevOps Engineer (deploy, monitoring)

### Tempo Total Estimado

- **Fase 1 (P0):** 2 semanas
- **Fase 2 (P1):** 4 semanas
- **Fase 3 (P2):** 4 semanas
- **Fase 4 (P3):** Ongoing

**Total:** ~10 semanas para completar P0, P1 e P2

---

## Próximos Passos Imediatos

1. ✅ **Aprovação deste plano** pela equipe de gestão
2. 🔴 **Criar backup completo** do banco de dados
3. 🔴 **Iniciar Fase 1** - Implementar RLS
4. 🔴 **Setup de ambiente de staging** para testes
5. 🔴 **Agendar reuniões semanais** de revisão de progresso

---

**Última atualização:** 18/11/2025
**Responsável:** Equipe de Desenvolvimento MeguisPet
**Status:** 🔴 Aguardando Aprovação
