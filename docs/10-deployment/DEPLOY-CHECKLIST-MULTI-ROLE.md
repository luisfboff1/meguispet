# ✅ Checklist de Deploy Seguro - Sistema Multi-Role

**Data:** 30/11/2025
**Versão:** 2.1
**Risco:** 🟢 BAIXO (com este checklist)

---

## 🎯 Objetivo

Fazer deploy do sistema multi-role sem crashar a produção atual.

## 📊 Análise de Risco

### ✅ O que NÃO vai quebrar:

1. **Middleware:** Agora é backward compatible
   - Detecta automaticamente se banco tem novos campos
   - Se não tiver, funciona no modo antigo
   - Se tiver, ativa sistema de permissões

2. **APIs novas:** São endpoints novos, não afetam existentes
   - `/api/usuarios/me` - novo
   - `/api/usuarios/[id]` - novo
   - `/api/vendas` (index) - novo
   - `/api/clientes/my` - novo
   - `/api/vendedores/by-usuario/[id]` - novo
   - `/api/vendedores/[id]/link-usuario` - novo
   - `/api/vendedores/[id]/unlink-usuario` - novo
   - `/api/vendedores/[id]/create-usuario` - novo

3. **Types:** Apenas adicionam campos opcionais, não quebram código existente

4. **Store:** Apenas persiste campos novos se existirem

### ⚠️ Pontos de Atenção:

1. **Migration precisa rodar sem erros**
   - Se falhar, rollback automático do PostgreSQL
   - Sistema continua no schema antigo

2. **Usuários existentes precisam de permissões**
   - Trigger aplica automaticamente ao fazer UPDATE
   - Admin precisa rodar script de atualização em massa

---

## 🚀 Plano de Deploy em 3 Etapas

### **ETAPA 1: Deploy do Código (SEGURO)**

#### 1.1. Commit e push para GitHub

```bash
git add .
git commit -m "feat: implement multi-role system with backward compatibility

- Add granular permission system
- Update middleware with backward compatibility
- Create 9 new API endpoints
- Add user-vendor linking system

BREAKING: Requires database migration to enable new features
SAFE: Works with old schema until migration is run"

git push origin master
```

#### 1.2. Vercel faz deploy automático

- ✅ Código novo sobe para produção
- ✅ Middleware funciona no "modo antigo"
- ✅ APIs novas ficam disponíveis (mas retornam 404 se campos não existem)
- ✅ Sistema atual continua funcionando normalmente

**Resultado:** Produção funcionando normal, com código novo mas schema antigo.

---

### **ETAPA 2: Executar Migrations no Banco**

#### 2.1. Backup do banco (OBRIGATÓRIO)

```bash
# Via Supabase Dashboard
1. Vai em Database → Backups
2. Clica em "Create backup"
3. Espera concluir antes de prosseguir
```

OU via psql:

```bash
pg_dump -h [SUPABASE_HOST] -U postgres -d postgres -F c -b -v -f backup_pre_migration_$(date +%Y%m%d_%H%M%S).dump
```

#### 2.2. Testar migration em desenvolvimento (RECOMENDADO)

```bash
# Clone banco de prod para dev
# Execute migration em dev primeiro
# Teste tudo funcionando
```

#### 2.3. Executar migrations em produção

**Via Supabase Dashboard (RECOMENDADO):**

1. Acessa SQL Editor no Supabase Dashboard
2. Abre o arquivo `database/migrations/20250129_add_user_roles.sql`
3. Copia todo o conteúdo
4. Cola no SQL Editor
5. Clica em "Run"
6. Verifica se executou sem erros

**Via psql:**

```bash
psql -h [SUPABASE_HOST] -U postgres -d postgres -f database/migrations/20250129_add_user_roles.sql
```

#### 2.4. Verificar se migration funcionou

```sql
-- Verificar se colunas foram criadas
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'usuarios'
AND column_name IN ('tipo_usuario', 'roles', 'permissoes', 'permissoes_custom', 'vendedor_id');

-- Deve retornar 5 linhas (5 colunas novas)

-- Verificar se trigger existe
SELECT trigger_name FROM information_schema.triggers
WHERE trigger_name = 'apply_default_permissions';

-- Deve retornar 1 linha

-- Verificar se funções foram criadas
SELECT routine_name FROM information_schema.routines
WHERE routine_name LIKE '%permission%';

-- Deve retornar várias funções
```

#### 2.5. Aplicar permissões em usuários existentes

```sql
-- Atualizar todos os usuários para aplicar permissões via trigger
-- Isso força o trigger a calcular permissões baseado no role atual
UPDATE usuarios
SET updated_at = NOW()
WHERE ativo = true;

-- Verificar se permissoes foram aplicadas
SELECT
  id,
  nome,
  role,
  tipo_usuario,
  permissoes->>'dashboard' as tem_dashboard,
  permissoes->>'vendas' as tem_vendas
FROM usuarios
LIMIT 5;

-- Todos devem ter permissoes preenchidas
```

**Resultado:** Banco atualizado, middleware detecta automaticamente e ativa sistema de permissões.

---

### **ETAPA 3: Validação e Monitoramento**

#### 3.1. Testar login e acesso

1. Fazer login com usuário admin
2. Verificar se consegue acessar todas as rotas
3. Fazer login com usuário não-admin (se tiver)
4. Verificar se rotas são bloqueadas corretamente

#### 3.2. Verificar logs do Vercel

```
Procurar por:
✅ "Using old schema" - NÃO deve aparecer mais (significa que detectou schema novo)
✅ Headers X-User-Id, X-User-Role sendo setados
❌ Erros 500 ou crashes
❌ Redirecionamentos infinitos para /login
```

#### 3.3. Testar novas APIs

```bash
# Testar GET /api/usuarios/me
curl https://gestao.meguispet.com/api/usuarios/me \
  -H "Cookie: [cookie_da_sessao]"

# Deve retornar dados do usuário com permissoes
```

#### 3.4. Monitorar por 1 hora

- Ver se usuários conseguem fazer login
- Ver se não há erros no console
- Ver se rotas funcionam normalmente

---

## 🆘 Plano de Rollback

### Se algo der errado:

#### Opção 1: Rollback do código (rápido)

```bash
# Reverter commit no GitHub
git revert HEAD
git push origin master

# Vercel faz deploy automático da versão anterior
```

#### Opção 2: Rollback da migration (mais demorado)

```sql
-- Remover colunas novas
ALTER TABLE usuarios
  DROP COLUMN IF EXISTS tipo_usuario,
  DROP COLUMN IF EXISTS roles,
  DROP COLUMN IF EXISTS permissoes,
  DROP COLUMN IF EXISTS permissoes_custom,
  DROP COLUMN IF EXISTS vendedor_id,
  DROP COLUMN IF EXISTS departamento;

-- Remover trigger
DROP TRIGGER IF EXISTS apply_default_permissions ON usuarios;

-- Remover funções
DROP FUNCTION IF EXISTS merge_all_permissions CASCADE;
DROP FUNCTION IF EXISTS get_vendedor_permissions CASCADE;
DROP FUNCTION IF EXISTS get_financeiro_permissions CASCADE;
DROP FUNCTION IF EXISTS get_gerente_permissions CASCADE;
```

#### Opção 3: Restaurar backup

```bash
# Via Supabase Dashboard
1. Vai em Database → Backups
2. Seleciona backup anterior
3. Clica em "Restore"
```

---

## ✅ Checklist de Validação Pós-Deploy

- [ ] Middleware não está logando "⚠️ User not found"
- [ ] Middleware está logando detecção de schema novo
- [ ] Usuários conseguem fazer login normalmente
- [ ] Admin consegue acessar /usuarios e /configuracoes
- [ ] Não-admin é bloqueado de /usuarios e /configuracoes
- [ ] API `/api/usuarios/me` retorna dados completos
- [ ] Headers X-User-Id, X-User-Role, X-Vendedor-Id aparecem nas requests
- [ ] Sem erros 500 nos logs do Vercel
- [ ] Sem redirecionamentos infinitos
- [ ] Permissões foram aplicadas em todos os usuários (query acima)

---

## 📝 Notas Importantes

### O que muda para o usuário final:

**ANTES da migration:**
- Sistema funciona normalmente
- Todos têm acesso a tudo
- Sem controle de permissões

**DEPOIS da migration:**
- Sistema continua funcionando
- Admin tem acesso a tudo
- Não-admin é bloqueado de rotas admin-only (/usuarios, /configuracoes)
- Permissões granulares ativas

### O que NÃO está implementado ainda:

- [ ] Dashboards personalizados por role
- [ ] Sidebar com links condicionais
- [ ] Páginas de gerenciamento de permissões
- [ ] UI para vincular vendedor ↔ usuario

**Isso significa:** Sistema está pronto para receber novas features, mas usuários ainda não vão ver diferença visual (apenas bloqueios de acesso).

---

## 🎯 Próximos Passos Após Deploy

1. Validar tudo funcionando
2. Implementar Fase 4 (Dashboards personalizados)
3. Implementar Fase 5 (UI/UX com PermissionGate)
4. Treinar usuários no novo sistema

---

**Dúvidas?** Verifique:
- `docs/04-features/MULTI-ROLE-PERMISSIONS.md` - Documentação técnica
- `docs/04-features/IMPLEMENTACAO-MULTI-ROLE.md` - Guia de implementação
- `docs/04-features/individual/PLANO-DASHBOARD-PERSONALIZADO.md` - Plano completo
