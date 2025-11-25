# Análise de Problemas Após Implementação RLS

**Data:** 25 de Novembro de 2025
**Status:** Análise Completa - AGUARDANDO APROVAÇÃO PARA APLICAR CORREÇÕES
**Prioridade:** ALTA

---

## 📋 Resumo Executivo

Após a implementação das políticas RLS (Row Level Security), foram identificados dois problemas principais:

1. **CSP bloqueando requisições para BrasilAPI** (busca de CNPJ)
2. **Possível erro 500 na API de clientes** (causa a ser confirmada em produção)

---

## 🔴 PROBLEMA 1: Content Security Policy Bloqueando BrasilAPI

### Descrição do Erro

```
Connecting to 'https://brasilapi.com.br/api/cnpj/v1/93015006000113' violates
the following Content Security Policy directive:
"connect-src 'self' https://*.supabase.co wss://*.supabase.co"
```

### Causa Raiz

O Content Security Policy (CSP) configurado em `next.config.js:117-127` está bloqueando requisições para a BrasilAPI.

**Configuração Atual:**
```javascript
// next.config.js:123
"connect-src 'self' https://*.supabase.co wss://*.supabase.co",
```

**Código que faz a requisição:**
```typescript
// services/cnpj.ts:30
const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`)
```

**Onde é usado:**
- `components/forms/PessoaForm.tsx:9` - Importa `cnpjService`
- `components/forms/PessoaForm.tsx` - Usa `cnpjService.buscarCNPJ()` quando `enableDocumentoLookup={true}`

### Impacto

- **Severidade:** MÉDIA
- **Usuários Afetados:** Todos que tentam cadastrar cliente/fornecedor com busca automática de CNPJ
- **Funcionalidade Perdida:** Auto-preenchimento de dados da empresa via CNPJ
- **Workaround:** Usuário pode digitar manualmente os dados

### Solução Proposta

Adicionar `https://brasilapi.com.br` ao CSP `connect-src`:

```javascript
// next.config.js:123
"connect-src 'self' https://*.supabase.co wss://*.supabase.co https://brasilapi.com.br",
```

**Justificativa de Segurança:**
- BrasilAPI é uma API governamental oficial e confiável
- Usada apenas para consulta pública de CNPJ (dados públicos)
- Não envia dados sensíveis do usuário
- Requisição é feita de forma explícita pelo usuário ao buscar CNPJ

**Alternativas Consideradas:**

1. **Proxy via API Next.js** (mais seguro, mas mais complexo):
   ```typescript
   // pages/api/cnpj/[cnpj].ts
   export default async function handler(req, res) {
     const { cnpj } = req.query
     const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`)
     const data = await response.json()
     return res.json(data)
   }
   ```
   **Prós:** Mantém CSP restrito, controle total sobre requisições
   **Contras:** Adiciona latência, mais código para manter

2. **Desabilitar busca de CNPJ** (mais simples, mas remove funcionalidade):
   ```typescript
   // components/forms/PessoaForm.tsx
   enableDocumentoLookup={false}
   ```
   **Prós:** Nenhuma mudança no CSP necessária
   **Contras:** Remove funcionalidade útil para o usuário

**Recomendação:** Solução 1 (adicionar domínio ao CSP) - mais simples e mantém a funcionalidade

---

## 🟡 PROBLEMA 2: Possível Erro 500 na API de Clientes

### Descrição do Erro

```
Failed to load resource: the server responded with a status of 500 ()
```

**Endpoint:** `POST /api/clientes`
**Local:** `pages/api/clientes.ts`

### Possíveis Causas

#### Causa 1: Validação Zod Muito Restritiva

O schema de validação em `lib/validations/cliente.schema.ts` pode estar rejeitando dados válidos:

**Validações Potencialmente Problemáticas:**

1. **Telefone (linha 40-43):**
   ```typescript
   telefone: z.string()
     .regex(PHONE_REGEX, 'Telefone inválido. Formato: (XX) XXXXX-XXXX')
     .optional()
     .or(z.literal(''))
   ```
   **Regex:** `/^\(\d{2}\)\s?\d{4,5}-?\d{4}$/`
   **Problema:** Exige formato exato, pode falhar com variações de formatação

2. **CEP (linha 69-72):**
   ```typescript
   cep: z.string()
     .regex(CEP_REGEX, 'CEP inválido. Formato: XXXXX-XXX')
     .optional()
     .or(z.literal(''))
   ```
   **Regex:** `/^\d{5}-?\d{3}$/`
   **Problema:** Se o frontend enviar CEP sem formatação, pode falhar

3. **Nome (linha 28-32):**
   ```typescript
   nome: z.string()
     .min(3, 'Nome deve ter no mínimo 3 caracteres')
     .max(255, 'Nome deve ter no máximo 255 caracteres')
     .regex(/^[a-zA-ZÀ-ÿ\s.'-]+$/, 'Nome deve conter apenas letras e espaços')
     .trim()
   ```
   **Problema:** Não permite números ou caracteres especiais (ex: "Pet Shop 123")

4. **Estado (linha 63-67):**
   ```typescript
   estado: z.string()
     .length(2, 'Estado deve ter 2 caracteres (UF)')
     .toUpperCase()
     .optional()
     .or(z.literal(''))
   ```
   **Problema:** Se o valor vier como `null` ou `undefined`, pode falhar

#### Causa 2: Problema com Contexto de Usuário RLS

Embora o código esteja usando `req.supabaseClient` corretamente, pode haver um problema se:

1. O token JWT expirou durante a requisição
2. O middleware não está anexando corretamente o `supabaseClient`
3. A sessão foi invalidada

**Verificação necessária em `lib/supabase-middleware.ts`:**
```typescript
// Garantir que o cliente está sendo criado com o token do usuário
const supabaseClient = createClient(...)
req.supabaseClient = supabaseClient // Deve estar presente
```

#### Causa 3: Campos Obrigatórios Ausentes

O banco de dados pode ter campos `NOT NULL` que não estão sendo enviados:

**Campos potencialmente problemáticos:**
- `created_at` - Deveria ter `DEFAULT now()`
- `updated_at` - Deveria ter `DEFAULT now()`
- `ativo` - Deveria ter `DEFAULT true`

### Impacto

- **Severidade:** ALTA (bloqueia cadastro de clientes)
- **Usuários Afetados:** Todos que tentam cadastrar clientes/fornecedores
- **Funcionalidade Perdida:** Cadastro de novos clientes/fornecedores
- **Workaround:** Nenhum disponível

### Soluções Propostas

#### Solução 1: Relaxar Validações Zod (Recomendado)

**Arquivo:** `lib/validations/cliente.schema.ts`

**Mudanças:**

1. **Telefone - Aceitar vários formatos:**
   ```typescript
   telefone: z.string()
     .refine((phone) => {
       if (!phone || phone === '') return true; // Optional
       const cleanPhone = phone.replace(/\D/g, '');
       return cleanPhone.length >= 10 && cleanPhone.length <= 11;
     }, 'Telefone deve ter 10 ou 11 dígitos')
     .optional()
     .or(z.literal(''))
   ```

2. **CEP - Aceitar com ou sem hífen:**
   ```typescript
   cep: z.string()
     .refine((cep) => {
       if (!cep || cep === '') return true; // Optional
       const cleanCep = cep.replace(/\D/g, '');
       return cleanCep.length === 8;
     }, 'CEP deve ter 8 dígitos')
     .optional()
     .or(z.literal(''))
   ```

3. **Nome - Permitir números e mais caracteres:**
   ```typescript
   nome: z.string()
     .min(3, 'Nome deve ter no mínimo 3 caracteres')
     .max(255, 'Nome deve ter no máximo 255 caracteres')
     .regex(/^[a-zA-ZÀ-ÿ0-9\s.'\-&()]+$/, 'Nome contém caracteres inválidos')
     .trim()
   ```

4. **Estado - Tratar valores vazios corretamente:**
   ```typescript
   estado: z.string()
     .refine((estado) => {
       if (!estado || estado === '') return true; // Optional
       return estado.length === 2;
     }, 'Estado deve ter 2 caracteres (UF)')
     .transform((val) => val ? val.toUpperCase() : val)
     .optional()
   ```

**Justificativa:**
- Mantém segurança contra injeção
- Mais tolerante a variações de formato
- Melhor UX (não rejeita dados válidos)
- Alinhado com comportamento do frontend

#### Solução 2: Adicionar Melhor Tratamento de Erros

**Arquivo:** `pages/api/clientes.ts`

Melhorar o logging para identificar a causa exata:

```typescript
} catch (error) {
  console.error('[API /clientes] Error:', error);

  // Se for erro de validação Zod, retornar detalhes
  if (error instanceof z.ZodError) {
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos',
      errors: error.errors, // Detalhes dos campos inválidos
    });
  }

  // Se for erro do Supabase, retornar detalhes
  if (error && typeof error === 'object' && 'code' in error) {
    return res.status(500).json({
      success: false,
      message: 'Erro no banco de dados',
      error: error.message,
      code: error.code,
    });
  }

  return res.status(500).json({
    success: false,
    message: 'Erro interno do servidor',
    error: error instanceof Error ? error.message : 'Unknown error',
  });
}
```

**Justificativa:**
- Permite debugar o erro exato
- Diferencia entre erro de validação, BD e outros
- Mantém segurança (não expõe stack trace)

#### Solução 3: Verificar Middleware de Autenticação

**Arquivo:** `lib/supabase-middleware.ts`

Adicionar logging para confirmar que o cliente está sendo anexado:

```typescript
export function withSupabaseAuth(handler: Function) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      // ... código existente ...

      // Criar cliente Supabase com contexto do usuário
      const supabaseClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        }
      )

      // IMPORTANTE: Anexar ao request
      req.supabaseClient = supabaseClient

      // Log para debug (remover em produção)
      console.log('[withSupabaseAuth] Client attached, user:', req.user.email)

      // ... resto do código ...
    }
  }
}
```

---

## 🎯 Plano de Ação Recomendado

### Passo 1: Corrigir CSP (Baixo Risco) ✅

1. Atualizar `next.config.js` linha 123
2. Testar busca de CNPJ no formulário de cliente
3. Verificar que não há outros bloqueios CSP

**Arquivos afetados:**
- `next.config.js`

**Tempo estimado:** 5 minutos
**Risco:** Baixo (apenas adiciona domínio confiável)

### Passo 2: Melhorar Tratamento de Erros (Baixo Risco) ✅

1. Atualizar `pages/api/clientes.ts` com melhor logging
2. Testar cadastro de cliente e verificar logs
3. Identificar causa exata do erro 500

**Arquivos afetados:**
- `pages/api/clientes.ts`

**Tempo estimado:** 10 minutos
**Risco:** Baixo (apenas melhora logging)

### Passo 3: Testar e Identificar Causa do Erro 500 ⚠️

1. Com logging melhorado, tentar cadastrar cliente
2. Verificar console do servidor
3. Identificar se é erro de validação, RLS ou outro

**Tempo estimado:** 15 minutos
**Risco:** Nenhum (apenas investigação)

### Passo 4: Aplicar Correção Específica (Depende da Causa) ⚠️

**Se for validação Zod:**
- Aplicar Solução 1 (relaxar validações)
- Testar todos os campos do formulário
- Verificar que validação ainda previne injeção

**Se for RLS:**
- Verificar middleware de autenticação
- Verificar políticas RLS no banco
- Testar com diferentes usuários

**Se for campos obrigatórios:**
- Verificar schema da tabela
- Adicionar valores default se necessário

**Tempo estimado:** 20-40 minutos
**Risco:** Médio (depende da mudança necessária)

---

## 🔍 Como Testar Após Correções

### Teste 1: CSP e BrasilAPI

1. Login no sistema
2. Ir para Clientes → Novo Cliente
3. Digitar um CNPJ válido (ex: 93.015.006/0001-13)
4. Clicar no botão de busca CNPJ
5. **Esperado:** Dados da empresa preenchem automaticamente
6. **Verificar:** Nenhum erro CSP no console do navegador

### Teste 2: Cadastro de Cliente

1. Login no sistema
2. Ir para Clientes → Novo Cliente
3. Preencher formulário com dados válidos:
   - Nome: "Pet Shop ABC 123"
   - Tipo: Cliente
   - Telefone: "(11) 98765-4321" (com formatação)
   - CEP: "01310-100" (com hífen)
4. Salvar
5. **Esperado:** Cliente criado com sucesso
6. **Verificar:** Nenhum erro 500, cliente aparece na listagem

### Teste 3: Cadastro com Campos Opcionais Vazios

1. Login no sistema
2. Ir para Clientes → Novo Cliente
3. Preencher apenas campos obrigatórios:
   - Nome: "Cliente Teste"
   - Tipo: Cliente
4. Deixar todos os outros campos vazios
5. Salvar
6. **Esperado:** Cliente criado com sucesso
7. **Verificar:** Campos opcionais salvos como NULL

---

## 📊 Análise de Risco

### Mudança no CSP

**Risco de Segurança:** 🟢 BAIXO
- BrasilAPI é oficial e confiável
- Apenas consulta de dados públicos
- Não compromete dados do usuário

**Risco de Quebra:** 🟢 BAIXO
- Mudança isolada
- Não afeta funcionalidade existente
- Fácil reverter se necessário

### Mudança nas Validações

**Risco de Segurança:** 🟡 MÉDIO
- Pode relaxar validações demais se não for cuidadoso
- Regex ainda previne injeção XSS/SQL
- Mantém limite de caracteres

**Risco de Quebra:** 🟢 BAIXO
- Torna validação mais permissiva
- Não quebra dados existentes
- Melhora UX

---

## 📝 Checklist de Implementação

### Antes de Aplicar Correções

- [ ] Backup do banco de dados
- [ ] Anotar configuração atual do CSP
- [ ] Anotar validações atuais
- [ ] Criar branch de desenvolvimento

### Durante Implementação

- [ ] Aplicar correção do CSP
- [ ] Aplicar melhor tratamento de erros
- [ ] Testar localmente cada mudança
- [ ] Verificar que build compila sem erros
- [ ] Testar todos os cenários de teste

### Após Implementação

- [ ] Verificar que testes passam
- [ ] Verificar que não há regressões
- [ ] Documentar mudanças no CHANGELOG
- [ ] Criar PR com descrição detalhada
- [ ] Solicitar code review

---

## 🚨 Rollback Plan

Se algo der errado:

### Reverter CSP
```javascript
// next.config.js:123 (versão original)
"connect-src 'self' https://*.supabase.co wss://*.supabase.co",
```

### Reverter Validações
```bash
git checkout HEAD -- lib/validations/cliente.schema.ts
```

### Reverter API
```bash
git checkout HEAD -- pages/api/clientes.ts
```

---

## 📞 Suporte

Se encontrar problemas durante a implementação:

1. Verificar logs do servidor (`npm run dev:local`)
2. Verificar console do navegador (F12)
3. Verificar logs do Supabase (Dashboard → Database → Logs)
4. Revisar esta documentação
5. Procurar por erros similares no GitHub Issues

---

**Preparado por:** Claude Code
**Data:** 25/11/2025
**Status:** AGUARDANDO APROVAÇÃO
**Próximos Passos:** Revisar análise e aprovar correções
