# Lessons Learned - RLS Implementation Mistakes

**Data**: 2025-12-13
**Severidade**: CRÍTICA
**Impacto**: Production down, redirect loops, login impossível

## 🚨 Incidente: Circular Dependency in usuarios RLS Policy

### O Problema

Migration 020 criou uma política RLS na tabela `usuarios` com dependência circular:

```sql
-- ❌ POLÍTICA QUEBRADA (Migration 020)
CREATE POLICY "Users read own record" ON usuarios
  FOR SELECT
  USING (
    supabase_user_id::text = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM usuarios u  -- ← CIRCULAR DEPENDENCY!
      WHERE u.supabase_user_id::text = auth.uid()::text
      AND u.tipo_usuario IN ('admin', 'gerente')
      AND u.ativo = true
    )
  );
```

### Por Que Quebrou

1. **Usuário tenta fazer login**
2. **Login bem-sucedido**, obtém JWT token
3. **App tenta ler dados do usuário** de `usuarios` table
4. **RLS policy é avaliada**:
   - Primeira condição: `supabase_user_id = auth.uid()` ✅ OK
   - Segunda condição: `OR EXISTS (SELECT FROM usuarios...)`
   - **Para executar o subquery**, precisa **ler usuarios novamente**
   - **Para ler usuarios**, precisa **avaliar RLS policy**
   - **LOOP INFINITO** 🔄

### Sintomas em Produção

- ✅ Login funciona (JWT é criado)
- ❌ Redirect loop infinito (middleware não consegue ler usuario)
- ❌ "Credenciais inválidas" após limpar cookies
- ❌ App completamente inacessível

### A Correção (Migration 022)

```sql
-- ✅ POLÍTICA CORRIGIDA
CREATE POLICY "Users read own record" ON usuarios
  FOR SELECT
  USING (
    supabase_user_id::text = auth.uid()::text  -- SEM SUBQUERY!
  );

-- Admin operations use service role (bypasses RLS)
-- Application checks permissions BEFORE using service role
```

## 📋 Checklist: Como Evitar Esse Erro

### ✅ Antes de Aplicar RLS Policies

- [ ] **1. Verificar dependências circulares**
  - Política consulta a mesma tabela que está protegendo?
  - Subqueries podem criar loops infinitos?

- [ ] **2. Testar fluxo de autenticação completo**
  - Login funciona?
  - Middleware consegue ler dados do usuário?
  - Logout funciona?

- [ ] **3. Testar com diferentes roles**
  - Admin consegue fazer tudo?
  - Usuário comum consegue ler apenas próprios dados?
  - Vendedor tem acesso correto?

- [ ] **4. Simular queries críticas**
  ```sql
  -- Simular como um usuário autenticado
  SET SESSION "request.jwt.claim.sub" = 'user-uuid-here';

  -- Testar se consegue ler próprio registro
  SELECT * FROM usuarios WHERE supabase_user_id = 'user-uuid-here';
  ```

- [ ] **5. Verificar service role operations**
  - Operações admin usam service role?
  - Service role bypassa RLS corretamente?

### ✅ Durante Code Review

- [ ] **1. RLS policies são simples?**
  - Evite subqueries complexas
  - Evite JOINs quando possível
  - Prefira lógica na aplicação

- [ ] **2. Tabelas críticas têm atenção especial?**
  - `usuarios` - CRÍTICO para autenticação
  - `auth.*` - Gerenciado pelo Supabase
  - Tabelas que middleware/proxy consulta

- [ ] **3. Há testes automatizados?**
  - Testes de integração para login
  - Testes de RLS policies
  - Testes de permissões por role

### ✅ Antes de Deploy para Produção

- [ ] **1. Testar em ambiente de staging primeiro**
  - Nunca aplicar RLS direto em produção
  - Simular carga real
  - Testar todos os fluxos críticos

- [ ] **2. Plano de rollback preparado**
  - Ter script de rollback pronto
  - Saber como reverter rapidamente
  - Documentar passos de emergência

- [ ] **3. Monitoramento ativo**
  - Checar logs durante deploy
  - Monitorar rate de erros
  - Ter alerta para redirect loops

## 🎓 Princípios de RLS Seguros

### 1. Keep It Simple

```sql
-- ✅ BOM: Simples, sem dependências
CREATE POLICY "simple_select" ON my_table
  FOR SELECT
  USING (user_id = auth.uid());

-- ❌ RUIM: Complexo, com subqueries
CREATE POLICY "complex_select" ON my_table
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM other_table  -- Evite isso!
      WHERE ...
    )
  );
```

### 2. Avoid Self-Referencing Subqueries

```sql
-- ❌ NUNCA FAÇA ISSO!
CREATE POLICY "self_reference" ON usuarios
  USING (
    EXISTS (
      SELECT 1 FROM usuarios  -- ← Mesma tabela = CIRCULAR!
      WHERE ...
    )
  );

-- ✅ FAÇA ISSO:
CREATE POLICY "simple_policy" ON usuarios
  USING (supabase_user_id = auth.uid());

-- Admin operations: use service role in application
```

### 3. Push Complex Logic to Application Layer

```sql
-- ❌ RLS não é o lugar para lógica complexa
CREATE POLICY "complex_business_logic" ON vendas
  USING (
    (user_role = 'admin')
    OR (user_role = 'gerente' AND created_at > NOW() - INTERVAL '30 days')
    OR (user_role = 'vendedor' AND vendedor_id = current_user_vendedor_id)
    OR ...  -- Muito complexo!
  );

-- ✅ RLS simples + lógica na aplicação
CREATE POLICY "simple_rls" ON vendas
  USING (user_id = auth.uid());

-- Application checks:
// if (userRole === 'admin') return allSales;
// if (userRole === 'gerente') return recentSales;
// if (userRole === 'vendedor') return ownSales;
```

### 4. Service Role for Admin Operations

```typescript
// ✅ Pattern correto
const checkUserIsAdmin = async (userId: string) => {
  const supabase = getSupabaseServerAuth(req, res);
  const { data } = await supabase
    .from('usuarios')
    .select('tipo_usuario')
    .eq('supabase_user_id', userId)
    .single();

  return data?.tipo_usuario === 'admin';
};

if (await checkUserIsAdmin(userId)) {
  // Use service role for admin operation
  const adminClient = getSupabaseServiceRole();
  await adminClient.from('usuarios').insert(...);
}
```

## 🔄 Processo de Correção Emergencial

### 1. Identificação (5 min)
- Usuário reporta problema
- Verificar logs de erro
- Identificar RLS como causa

### 2. Análise Rápida (10 min)
- Revisar política RLS suspeita
- Identificar dependência circular
- Confirmar hipótese com query de teste

### 3. Correção (15 min)
- Criar migration de hotfix
- Remover lógica circular
- Simplificar política

### 4. Deploy (5 min)
- Executar migration em produção
- Verificar que login funciona
- Confirmar que redirect loop parou

### 5. Validação (10 min)
- Testar login com diferentes roles
- Verificar operações admin
- Confirmar que tudo voltou ao normal

**Tempo total de recovery**: ~45 minutos

## 📊 Impacto

- **Duração do incidente**: X minutos (desde deploy até correção)
- **Usuários afetados**: 100% (sistema inacessível)
- **Data loss**: Nenhum (views não armazenam dados)
- **Recovery**: Completo após migration 022

## ✅ Melhorias Implementadas

1. ✅ RLS policies simplificadas (sem circular dependencies)
2. ✅ Documentação de lessons learned
3. ✅ Checklist de validação de RLS
4. ✅ Processo de emergency hotfix documentado
5. ⏳ TODO: Adicionar testes automatizados de RLS
6. ⏳ TODO: Implementar staging environment

## 🎯 Ação para o Futuro

**NUNCA MAIS**:
- ❌ Aplicar RLS direto em produção sem testar
- ❌ Criar subqueries que consultam a mesma tabela
- ❌ Assumir que "deve funcionar" sem validar

**SEMPRE**:
- ✅ Testar RLS policies em staging primeiro
- ✅ Simular fluxo de autenticação completo
- ✅ Ter plano de rollback pronto
- ✅ Manter RLS policies simples
- ✅ Usar service role para operações admin

---

**Última atualização**: 2025-12-13
**Status**: RESOLVIDO (Migration 022)
**Severity**: CRÍTICA
**Probability of recurrence**: BAIXA (com checklist implementado)
