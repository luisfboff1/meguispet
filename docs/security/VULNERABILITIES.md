# Relatório de Vulnerabilidades de Segurança - MeguisPet

**Data da Análise:** 18 de Novembro de 2025
**Analista:** Equipe de Segurança
**Escopo:** Autenticação, Autorização, Isolamento de Dados, Proteção contra Ataques

---

## Índice
1. [Vulnerabilidades Críticas](#vulnerabilidades-críticas)
2. [Vulnerabilidades Altas](#vulnerabilidades-altas)
3. [Vulnerabilidades Médias](#vulnerabilidades-médias)
4. [Vulnerabilidades Baixas](#vulnerabilidades-baixas)
5. [Observações Gerais](#observações-gerais)

---

## Vulnerabilidades Críticas

### 🔴 VULN-001: Row Level Security (RLS) Não Implementado nas Tabelas Principais

**Severidade:** CRÍTICA
**CVSS Score:** 9.1 (Critical)
**CWE:** CWE-639 (Authorization Bypass Through User-Controlled Key)

**Descrição:**
As tabelas principais do banco de dados (`clientes_fornecedores`, `produtos`, `vendas`, `transacoes`, etc.) não possuem Row Level Security (RLS) habilitado. O RLS está apenas comentado no schema principal (`supabase_schema.sql`, linhas 466-473).

**Impacto:**
- **Vazamento de dados entre tenants:** Sem RLS, qualquer usuário autenticado pode potencialmente acessar dados de outros usuários/empresas se houver falha na camada de aplicação
- **Bypass de autorização:** Um atacante que consiga explorar uma vulnerabilidade na API pode acessar todos os registros do banco
- **Falta de defesa em profundidade:** A segurança depende 100% da camada de aplicação

**Localização:**
```sql
-- database/migrations/supabase_schema.sql:466-473
-- =====================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- =====================================================
-- Note: Enable RLS in Supabase dashboard for production
-- Policies should be configured based on your auth requirements

-- Example RLS policies (commented out - configure as needed):
-- ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can view their own data" ON usuarios FOR SELECT USING (auth.uid() = id::text);
```

**Evidência:**
- Apenas tabelas `feedback_tickets`, `feedback_anexos`, `feedback_comentarios`, `tabela_mva`, `impostos_produto`, `vendas_impostos` possuem RLS habilitado
- Tabela `usuarios` possui RLS apenas no arquivo `migration_supabase_auth.sql`, mas não está confirmado se foi aplicado em produção

**Prova de Conceito (PoC):**
```typescript
// Cenário: Usuário A tenta acessar dados do Cliente B
// Sem RLS, a query retorna dados de todos os clientes
const { data: clientes } = await supabase
  .from('clientes_fornecedores')
  .select('*')
// Retorna TODOS os clientes, não apenas os do usuário autenticado
```

**Recomendação:**
1. **URGENTE:** Habilitar RLS em todas as tabelas principais
2. Criar políticas de acesso baseadas em `auth.uid()` e role do usuário
3. Implementar isolamento por tenant se o sistema for multi-tenant
4. Testar políticas RLS antes de deploy em produção

**Prioridade:** P0 (Crítico - Implementar imediatamente)

---

### 🔴 VULN-002: Uso de Service Role Key sem Isolamento

**Severidade:** CRÍTICA
**CVSS Score:** 8.5 (High)
**CWE:** CWE-269 (Improper Privilege Management)

**Descrição:**
O código utiliza `getSupabaseServiceRole()` que usa a Service Role Key, que bypassa todas as políticas RLS. Isso é usado em operações de leitura/escrita sem validação adequada de tenant/usuário.

**Impacto:**
- Service Role Key tem acesso completo ao banco, ignorando RLS
- Se um endpoint usar incorretamente `getSupabaseServiceRole()` ao invés de `getSupabaseServerAuth()`, pode expor dados de todos os usuários
- Violação de princípio de menor privilégio

**Localização:**
```typescript
// lib/supabase-auth.ts:14-28
export const getSupabaseServiceRole = (): SupabaseClient => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  // ...
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};
```

**Evidência:**
- `getUserProfile()` (lib/supabase-auth.ts:109) usa Service Role como fallback
- Múltiplos endpoints usam `getSupabase()` (lib/supabase.ts) sem contexto de usuário

**Recomendação:**
1. Limitar uso de Service Role apenas para operações administrativas específicas
2. Sempre usar `getSupabaseServerAuth()` em endpoints de API com contexto de usuário
3. Adicionar comentários de alerta onde Service Role é usado
4. Implementar auditoria de uso de Service Role

**Prioridade:** P0 (Crítico)

---

### 🔴 VULN-003: Falta de Validação e Sanitização de Inputs

**Severidade:** CRÍTICA
**CVSS Score:** 8.2 (High)
**CWE:** CWE-20 (Improper Input Validation)

**Descrição:**
Os endpoints de API não possuem validação sistemática de inputs. Os dados recebidos do cliente são inseridos diretamente no banco de dados sem sanitização ou validação de tipo/formato.

**Impacto:**
- **SQL Injection (mitigado parcialmente pelo Supabase):** Embora o Supabase use parametrização, inputs não validados podem causar comportamento inesperado
- **XSS (Cross-Site Scripting):** Dados maliciosos podem ser armazenados e executados no frontend
- **Business Logic Bypass:** Validações de negócio podem ser contornadas
- **Data Integrity Issues:** Dados inválidos podem corromper o banco

**Localização:**
```typescript
// pages/api/clientes.ts:65-99 (exemplo)
if (method === 'POST') {
  const { nome, tipo, email, telefone, endereco, cidade, estado, cep, documento, observacoes, vendedor_id } = req.body;

  if (!nome || !tipo) {
    return res.status(400).json({
      success: false,
      message: 'Campos nome e tipo são obrigatórios',
    });
  }

  // PROBLEMA: Nenhuma validação de formato, tamanho, ou sanitização
  const { data, error } = await supabase
    .from('clientes_fornecedores')
    .insert({
      nome, // Não valida tamanho máximo, caracteres especiais, etc.
      tipo, // Não valida se é um dos valores permitidos
      email: email || null, // Não valida formato de email
      telefone: telefone || null, // Não valida formato de telefone
      // ...
    })
}
```

**Evidência:**
- Nenhum uso de bibliotecas de validação (Zod, Yup, Joi, etc.)
- Campos de texto livre podem conter scripts maliciosos
- Campos numéricos podem receber strings
- Campos de data/hora não são validados

**Exemplos de Ataques Possíveis:**

1. **XSS via campo de texto:**
```json
POST /api/clientes
{
  "nome": "<script>alert('XSS')</script>",
  "tipo": "cliente"
}
```

2. **Business Logic Bypass:**
```json
POST /api/produtos
{
  "preco": -100,  // Preço negativo não é validado
  "estoque": -50  // Estoque negativo
}
```

**Recomendação:**
1. **URGENTE:** Implementar validação com biblioteca como Zod em todos os endpoints
2. Sanitizar inputs HTML/SQL antes de armazenar
3. Validar tipos, formatos, ranges e tamanhos
4. Implementar whitelist de valores permitidos para enums
5. Validar constraints de negócio (preços > 0, etc.)

**Prioridade:** P0 (Crítico)

---

## Vulnerabilidades Altas

### 🟠 VULN-004: Ausência de Rate Limiting

**Severidade:** ALTA
**CVSS Score:** 7.5 (High)
**CWE:** CWE-770 (Allocation of Resources Without Limits or Throttling)

**Descrição:**
Não há implementação de rate limiting em nenhum endpoint da API. Isso permite ataques de força bruta, DDoS de camada de aplicação, e abuso de recursos.

**Impacto:**
- **Brute Force em Login:** Atacante pode tentar milhares de combinações de senha
- **Credential Stuffing:** Teste automatizado de credenciais vazadas
- **DoS (Denial of Service):** Sobrecarga da API com requisições excessivas
- **Scraping:** Extração automatizada de dados
- **Resource Exhaustion:** Consumo excessivo de recursos do Supabase

**Localização:**
- Todos os endpoints em `pages/api/**/*.ts`
- Especialmente crítico: `/api/auth` (login), `/api/auth/signup`

**Evidência:**
```typescript
// pages/api/auth.ts - Sem rate limiting
const handleLogin = async (req: NextApiRequest, res: NextApiResponse) => {
  const { email, password } = req.body;
  // Nenhuma verificação de tentativas anteriores
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  // ...
}
```

**Prova de Conceito (PoC):**
```bash
# Brute force attack - 1000 tentativas em segundos
for i in {1..1000}; do
  curl -X POST https://gestao.meguispet.com/api/auth \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@meguispet.com","password":"pass'$i'"}'
done
```

**Recomendação:**
1. Implementar rate limiting por IP usando middleware (ex: `express-rate-limit` ou Vercel Edge Config)
2. Limites sugeridos:
   - Login: 5 tentativas/15 minutos por IP
   - Signup: 3 tentativas/hora por IP
   - APIs gerais: 100 requisições/minuto por IP
   - APIs pesadas: 20 requisições/minuto por IP
3. Implementar CAPTCHA após 3 tentativas falhas de login
4. Adicionar logging de tentativas bloqueadas

**Prioridade:** P1 (Alto - Implementar em 1-2 semanas)

---

### 🟠 VULN-005: Proteção CSRF Ausente

**Severidade:** ALTA
**CVSS Score:** 7.1 (High)
**CWE:** CWE-352 (Cross-Site Request Forgery)

**Descrição:**
A aplicação não possui proteção CSRF (Cross-Site Request Forgery). Embora use tokens JWT, não há validação de origem de requisições state-changing (POST, PUT, DELETE).

**Impacto:**
- Atacante pode forçar usuário autenticado a executar ações não intencionais
- Criação/edição/exclusão de dados sem consentimento do usuário
- Transferências financeiras não autorizadas (se houver funcionalidade de pagamento)

**Localização:**
- Todos os endpoints POST/PUT/DELETE em `pages/api/**/*.ts`
- Cookies configurados com `SameSite=Lax` (middleware cookies e useAuth.ts:7)

**Evidência:**
```typescript
// useAuth.ts:7 - SameSite=Lax permite CSRF em navegação top-level
const COOKIE_BASE = 'Path=/; SameSite=Lax'
```

**Prova de Conceito (PoC):**
```html
<!-- Site malicioso evil.com -->
<form action="https://gestao.meguispet.com/api/clientes" method="POST">
  <input type="hidden" name="nome" value="Cliente Malicioso" />
  <input type="hidden" name="tipo" value="cliente" />
</form>
<script>document.forms[0].submit();</script>
```

**Recomendação:**
1. **Opção 1 (Recomendado):** Mudar cookies para `SameSite=Strict`
2. **Opção 2:** Implementar CSRF tokens em formulários
3. **Opção 3:** Validar header `Origin` ou `Referer` em requisições state-changing
4. Adicionar Double Submit Cookie pattern

**Prioridade:** P1 (Alto)

---

### 🟠 VULN-006: Headers de Segurança Insuficientes

**Severidade:** ALTA
**CVSS Score:** 6.8 (Medium-High)
**CWE:** CWE-693 (Protection Mechanism Failure)

**Descrição:**
A configuração de headers de segurança no `next.config.js` é mínima e não inclui proteções essenciais contra ataques modernos.

**Impacto:**
- **Ausência de CSP:** Permite execução de scripts inline maliciosos (XSS)
- **Ausência de HSTS:** Conexões podem ser downgrade para HTTP
- **Clickjacking parcial:** `X-Frame-Options: SAMEORIGIN` protege apenas parcialmente
- **MIME Sniffing:** Navegador pode interpretar arquivos incorretamente

**Localização:**
```javascript
// next.config.js:74-91
async headers() {
  return [
    {
      source: '/:path*',
      headers: [
        {
          key: 'X-DNS-Prefetch-Control',
          value: 'on'
        },
        {
          key: 'X-Frame-Options',
          value: 'SAMEORIGIN'
        },
      ],
    },
  ]
}
```

**Headers Ausentes:**
- `Content-Security-Policy` (CSP)
- `Strict-Transport-Security` (HSTS)
- `X-Content-Type-Options`
- `X-XSS-Protection`
- `Referrer-Policy`
- `Permissions-Policy`

**Recomendação:**
1. Adicionar CSP completo (ver ACTION_PLAN.md para configuração)
2. Adicionar HSTS com `max-age=31536000; includeSubDomains; preload`
3. Adicionar `X-Content-Type-Options: nosniff`
4. Adicionar `Referrer-Policy: strict-origin-when-cross-origin`
5. Adicionar `Permissions-Policy` para controlar features do navegador

**Prioridade:** P1 (Alto)

---

### 🟠 VULN-007: Falta de Isolamento Multi-Tenant

**Severidade:** ALTA
**CVSS Score:** 8.3 (High) - Se o sistema for multi-tenant
**CWE:** CWE-284 (Improper Access Control)

**Descrição:**
O sistema não possui mecanismo de isolamento entre diferentes empresas/organizações (tenants). Não há campo de `tenant_id` ou `empresa_id` nas tabelas principais.

**Impacto:**
- **Se o sistema é/será multi-tenant:** Vazamento de dados entre diferentes empresas
- **Violação LGPD:** Dados de diferentes organizações misturados
- **Compliance:** Não atende requisitos de auditoria/certificação (ISO 27001, SOC 2)

**Localização:**
- Schema do banco: tabelas sem campo de tenant (`clientes_fornecedores`, `produtos`, `vendas`, etc.)
- Middleware de autenticação não verifica tenant
- APIs não filtram por tenant

**Recomendação:**
1. **Se o sistema é multi-tenant:** Adicionar campo `tenant_id` em todas as tabelas
2. Modificar RLS policies para incluir filtro por tenant
3. Adicionar `tenant_id` no token JWT
4. Implementar validação de tenant em todos os endpoints
5. Criar testes de isolamento entre tenants

**Prioridade:** P1 (Alto) - Se multi-tenant, senão P2 (Médio) para preparação futura

---

## Vulnerabilidades Médias

### 🟡 VULN-008: Logs e Auditoria Insuficientes

**Severidade:** MÉDIA
**CVSS Score:** 5.9 (Medium)
**CWE:** CWE-778 (Insufficient Logging)

**Descrição:**
O sistema não possui logging sistemático de eventos de segurança. Não há auditoria de ações críticas (login, logout, modificações de dados sensíveis).

**Impacto:**
- **Falta de rastreabilidade:** Impossível investigar incidentes de segurança
- **Compliance:** Não atende requisitos LGPD Art. 46 (auditoria)
- **Forense digital:** Sem evidências para análise pós-incidente
- **Detecção tardia:** Ataques não são detectados em tempo real

**Localização:**
- Nenhum sistema de logging estruturado implementado
- Console.log removido em produção (next.config.js:30)

**Evidência:**
```typescript
// pages/api/auth.ts - Sem logging de tentativas de login
const handleLogin = async (req: NextApiRequest, res: NextApiResponse) => {
  const { email, password } = req.body;
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  // Não há log de: IP, timestamp, sucesso/falha, user-agent
}
```

**Recomendação:**
1. Implementar logging com biblioteca como Winston ou Pino
2. Registrar eventos críticos:
   - Login/logout (sucesso e falha)
   - Criação/edição/exclusão de registros
   - Mudanças de permissões
   - Acessos negados
3. Incluir: timestamp, user_id, IP, action, resource, result
4. Integrar com serviço de monitoramento (Sentry, LogRocket, Datadog)
5. Configurar alertas para atividades suspeitas

**Prioridade:** P2 (Médio)

---

### 🟡 VULN-009: Token JWT sem Configuração de Expiração Explícita

**Severidade:** MÉDIA
**CVSS Score:** 5.5 (Medium)
**CWE:** CWE-613 (Insufficient Session Expiration)

**Descrição:**
A configuração de expiração dos tokens JWT não está explicitamente definida no código. Depende das configurações padrão do Supabase.

**Impacto:**
- Tokens podem ter vida útil muito longa (risco de replay attack)
- Sessões podem não expirar adequadamente após logout
- Token roubado pode ser usado por tempo indeterminado

**Localização:**
```typescript
// lib/supabase.ts:36-57 - Comentário menciona 10 horas, mas não há configuração
/**
 * Token Configuration:
 * - JWT expiration is configured in Supabase dashboard (recommended: 10 hours = 36000 seconds)
 * - Auto-refresh is enabled to refresh tokens before expiration
 */
```

**Evidência:**
- Configuração de expiração está no Supabase dashboard, não versionada no código
- Sem validação de tempo de inatividade (idle timeout)
- Refresh token pode ter vida ilimitada

**Recomendação:**
1. Documentar configuração de JWT no Supabase dashboard
2. Implementar timeout de inatividade (30 minutos)
3. Rotação automática de tokens a cada hora
4. Implementar blacklist de tokens invalidados (logout)
5. Adicionar validação de "last activity" timestamp

**Prioridade:** P2 (Médio)

---

### 🟡 VULN-010: Cookies sem Flags de Segurança Adequados

**Severidade:** MÉDIA
**CVSS Score:** 5.3 (Medium)
**CWE:** CWE-614 (Sensitive Cookie Without 'Secure' Flag in HTTPS Session)

**Descrição:**
Os cookies de autenticação são configurados com flags mínimos de segurança. O flag `Secure` é condicional e `SameSite` é `Lax` ao invés de `Strict`.

**Impacto:**
- **MITM em HTTP:** Cookie pode ser interceptado se houver downgrade para HTTP
- **CSRF facilitado:** `SameSite=Lax` permite envio em navegação top-level
- **Session Fixation:** Sem flag `HttpOnly` em alguns lugares

**Localização:**
```typescript
// useAuth.ts:7-15
const COOKIE_BASE = 'Path=/; SameSite=Lax'

const getCookieSuffix = () =>
  typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : ''

const setTokenCookie = (value: string) => {
  if (typeof document === 'undefined') return
  const maxAge = 60 * 60 * 24 * 7 // 7 dias - PROBLEMA: Muito longo
  document.cookie = `token=${value}; Max-Age=${maxAge}; ${COOKIE_BASE}${getCookieSuffix()}`
}
```

**Recomendação:**
1. Mudar `SameSite` para `Strict`
2. Sempre usar `Secure` flag (forçar HTTPS)
3. Reduzir Max-Age para 1 hora (depender de refresh)
4. Garantir `HttpOnly` em todos os cookies de auth
5. Adicionar flag `__Host-` prefix para cookies críticos

**Prioridade:** P2 (Médio)

---

## Vulnerabilidades Baixas

### 🟢 VULN-011: Informações Sensíveis em Mensagens de Erro

**Severidade:** BAIXA
**CVSS Score:** 3.7 (Low)
**CWE:** CWE-209 (Generation of Error Message Containing Sensitive Information)

**Descrição:**
Algumas mensagens de erro retornam informações detalhadas que podem auxiliar atacantes (stack traces, detalhes de queries, etc.).

**Impacto:**
- **Information Disclosure:** Estrutura do banco de dados revelada
- **Facilitação de ataques:** Atacante obtém informações sobre tecnologias usadas

**Localização:**
```typescript
// pages/api/clientes.ts:180-185
catch (error) {
  return res.status(500).json({
    success: false,
    message: 'Erro interno do servidor',
    error: error instanceof Error ? error.message : 'Unknown error', // PROBLEMA: Expõe detalhes
  });
}
```

**Recomendação:**
1. Remover campo `error` das respostas em produção
2. Usar mensagens genéricas para usuários
3. Registrar erros detalhados apenas nos logs
4. Implementar error boundary no frontend

**Prioridade:** P3 (Baixo)

---

### 🟢 VULN-012: Ausência de Limites de Upload de Arquivos

**Severidade:** BAIXA
**CVSS Score:** 4.1 (Low)
**CWE:** CWE-400 (Uncontrolled Resource Consumption)

**Descrição:**
Não há validação de tamanho máximo de arquivos em uploads (se houver funcionalidade de upload).

**Impacto:**
- DoS via upload de arquivos enormes
- Consumo excessivo de storage
- Aumento de custos de infraestrutura

**Recomendação:**
1. Limitar tamanho de uploads (ex: 10MB para imagens, 50MB para documentos)
2. Validar tipo de arquivo (whitelist de extensões)
3. Scan de malware em uploads
4. Implementar storage quota por usuário

**Prioridade:** P3 (Baixo) - Só se houver funcionalidade de upload

---

## Observações Gerais

### Pontos Positivos
- ✅ Middleware de autenticação no Edge Runtime (baixa latência)
- ✅ Uso de Supabase Auth (JWT bem implementado)
- ✅ Cookies HttpOnly em alguns lugares
- ✅ Verificação de usuário ativo antes de autenticar
- ✅ RBAC básico implementado (role-based access control)

### Recomendações Gerais de Segurança
1. **Implementar defesa em profundidade:** Múltiplas camadas de proteção
2. **Princípio do menor privilégio:** Limitar permissões ao mínimo necessário
3. **Fail securely:** Em caso de erro, negar acesso
4. **Security by default:** Configurações seguras por padrão
5. **Auditoria contínua:** Revisões periódicas de segurança

### Próximos Passos
1. Revisar e priorizar vulnerabilidades (ver ACTION_PLAN.md)
2. Implementar correções por ordem de prioridade
3. Testar correções em ambiente de staging
4. Realizar pentesting após correções
5. Estabelecer programa de bug bounty

---

**Última atualização:** 18/11/2025
**Próxima revisão:** 18/12/2025 (30 dias)
