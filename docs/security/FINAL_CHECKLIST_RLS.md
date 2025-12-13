# Checklist Final - Testes Pós RLS

**Data**: 2025-12-13
**Status**: Aguardando testes
**Versão**: Após hotfixes 022 + usuarios.ts

## 🎯 O que Mudou

### Migrações Aplicadas:
- ✅ **020**: RLS habilitado em 9 tabelas + 36 políticas
- ✅ **021**: Views sem SECURITY DEFINER
- ✅ **022**: Fix circular dependency em usuarios RLS
- ✅ **Hotfix**: pages/api/usuarios.ts usa service role para admin

### Políticas RLS Ativas:
| Tabela | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| `usuarios` | Own record | Service role | Own record | Service role |
| `formas_pagamento` | All auth | admin/gerente | admin/gerente | admin |
| `fornecedores` | All auth | admin/gerente/estoque | admin/gerente/estoque | admin |
| `movimentacoes_itens` | All auth | admin/gerente/estoque | admin/gerente/estoque | admin |
| `historico_precos` | All auth | admin/gerente/estoque | - | admin |
| `categorias_financeiras` | All auth | admin/gerente/financeiro | admin/gerente/financeiro | admin |
| `transacoes_recorrentes` | All auth | admin/gerente/financeiro | admin/gerente/financeiro | admin |
| `relatorios_templates` | All auth | admin/gerente | admin/gerente | admin |
| `venda_parcelas` | All auth | admin/gerente/vendedor/financeiro | admin/gerente/financeiro | admin/gerente |

## ✅ Checklist de Testes Críticos

### 1. Autenticação (CRÍTICO)

#### Login
- [ ] Admin consegue fazer login
- [ ] Gerente consegue fazer login
- [ ] Vendedor consegue fazer login
- [ ] Financeiro consegue fazer login
- [ ] Estoque consegue fazer login
- [ ] Login com credenciais inválidas retorna erro correto
- [ ] Não há redirect loop infinito

#### Logout
- [ ] Logout funciona para todos os roles
- [ ] Após logout, não consegue acessar páginas protegidas
- [ ] Limpar cookies e fazer login novamente funciona

#### Sessão
- [ ] Dashboard carrega sem erros
- [ ] Middleware não bloqueia usuários autenticados
- [ ] Token refresh funciona automaticamente

### 2. Gestão de Usuários (CRÍTICO)

#### Como Admin
- [ ] ✅ **TESTADO**: Consegue listar todos os usuários
- [ ] Consegue criar novo usuário (via signup)
- [ ] Consegue editar qualquer usuário
- [ ] Consegue desativar usuário
- [ ] Consegue ver detalhes de qualquer usuário

#### Como Gerente
- [ ] Consegue listar todos os usuários
- [ ] Consegue editar usuários (não admins?)
- [ ] NÃO consegue criar usuários (deve usar signup)

#### Como Vendedor
- [ ] Consegue ver próprio perfil
- [ ] Consegue editar próprio perfil
- [ ] NÃO consegue ver lista de todos usuários
- [ ] NÃO consegue editar outros usuários

### 3. Vendedores (CRÍTICO)

#### Como Admin
- [ ] ✅ **TESTADO**: Consegue criar vendedor
- [ ] Consegue criar usuário para vendedor
- [ ] Consegue vincular vendedor a usuário existente
- [ ] Consegue editar vendedor
- [ ] Consegue desativar vendedor
- [ ] Consegue ver todos vendedores

#### Como Gerente
- [ ] Consegue criar vendedor
- [ ] Consegue editar vendedor
- [ ] Consegue ver todos vendedores

#### Como Vendedor
- [ ] Consegue ver próprios dados
- [ ] Consegue editar próprio cadastro (?)
- [ ] Consegue ver próprias vendas

### 4. Formas de Pagamento

#### Como Admin
- [ ] Consegue listar formas de pagamento
- [ ] Consegue criar forma de pagamento
- [ ] Consegue editar forma de pagamento
- [ ] Consegue deletar forma de pagamento

#### Como Gerente
- [ ] Consegue listar formas de pagamento
- [ ] Consegue criar forma de pagamento
- [ ] Consegue editar forma de pagamento
- [ ] NÃO consegue deletar forma de pagamento

#### Como Vendedor
- [ ] Consegue listar formas de pagamento (para usar em vendas)
- [ ] NÃO consegue criar/editar/deletar

### 5. Fornecedores

#### Como Admin/Gerente/Estoque
- [ ] Consegue listar fornecedores
- [ ] Consegue criar fornecedor
- [ ] Consegue editar fornecedor
- [ ] Admin consegue deletar fornecedor

#### Como Vendedor/Financeiro
- [ ] Consegue listar fornecedores
- [ ] NÃO consegue criar/editar/deletar

### 6. Produtos e Estoque

#### Produtos
- [ ] Admin/Gerente/Estoque consegue criar produto
- [ ] Admin/Gerente/Estoque consegue editar produto
- [ ] Admin consegue deletar produto
- [ ] Todos conseguem listar produtos

#### Movimentações de Estoque
- [ ] Admin/Gerente/Estoque consegue criar movimentação
- [ ] Admin/Gerente/Estoque consegue criar itens de movimentação
- [ ] Admin/Gerente/Estoque consegue editar movimentação
- [ ] Todos conseguem listar movimentações

#### Histórico de Preços
- [ ] Todos conseguem ver histórico de preços
- [ ] Histórico é criado automaticamente ao alterar preço
- [ ] Admin consegue deletar histórico (se necessário)

### 7. Categorias Financeiras

#### Como Admin/Gerente/Financeiro
- [ ] Consegue listar categorias
- [ ] Consegue criar categoria
- [ ] Consegue editar categoria
- [ ] Admin consegue deletar categoria

#### Como Vendedor/Estoque
- [ ] Consegue listar categorias
- [ ] NÃO consegue criar/editar/deletar

### 8. Transações Recorrentes

#### Como Admin/Gerente/Financeiro
- [ ] Consegue listar transações recorrentes
- [ ] Consegue criar transação recorrente
- [ ] Consegue editar transação recorrente
- [ ] Admin consegue deletar transação recorrente

#### Como Vendedor/Estoque
- [ ] Consegue listar transações recorrentes (?)
- [ ] NÃO consegue criar/editar/deletar

### 9. Vendas e Parcelas

#### Vendas
- [ ] Vendedor consegue criar venda
- [ ] Vendedor consegue ver próprias vendas
- [ ] Admin/Gerente consegue ver todas as vendas
- [ ] Admin/Gerente consegue editar vendas
- [ ] Admin/Gerente consegue deletar vendas

#### Parcelas de Venda
- [ ] Admin/Gerente/Vendedor/Financeiro consegue criar parcelas ao criar venda
- [ ] Admin/Gerente/Financeiro consegue editar parcelas (marcar como pago)
- [ ] Todos conseguem ver parcelas
- [ ] Admin/Gerente consegue deletar parcelas

### 10. Dashboard e Relatórios

#### Dashboard
- [ ] ✅ **TESTADO**: Dashboard carrega para todos os roles
- [ ] Métricas são calculadas corretamente
- [ ] Gráficos aparecem sem erros
- [ ] Dados são filtrados por role (vendedor vê só suas vendas?)

#### Relatórios
- [ ] Admin/Gerente consegue gerar relatórios
- [ ] Templates de relatórios podem ser criados
- [ ] Exportação funciona

### 11. Clientes

#### Como Admin/Gerente/Vendedor
- [ ] Consegue listar clientes
- [ ] Consegue criar cliente
- [ ] Consegue editar cliente
- [ ] Consegue importar clientes
- [ ] Admin consegue deletar cliente

#### Como Financeiro/Estoque
- [ ] Consegue listar clientes (para buscar em vendas/movimentações)
- [ ] NÃO consegue criar/editar/deletar

## 🚨 Pontos de Atenção Especial

### 1. Queries que podem Falhar com RLS

**Verificar se estes endpoints funcionam:**
```bash
# Listar todos os endpoints que usam tabelas com RLS
grep -r "from('usuarios'" pages/api --include="*.ts"
grep -r "from('formas_pagamento'" pages/api --include="*.ts"
grep -r "from('fornecedores'" pages/api --include="*.ts"
grep -r "from('categorias_financeiras'" pages/api --include="*.ts"
grep -r "from('transacoes_recorrentes'" pages/api --include="*.ts"
grep -r "from('venda_parcelas'" pages/api --include="*.ts"
```

### 2. Operações que Devem Usar Service Role

**Estes endpoints DEVEM usar service role:**
- ✅ `pages/api/usuarios.ts` - GET/PUT/DELETE (após hotfix)
- ✅ `pages/api/auth/signup.ts` - POST (já usa)
- ✅ `pages/api/vendedores/[id]/create-usuario.ts` - POST (após hotfix)

**Verificar se estes também precisam:**
- `pages/api/usuarios/[id].ts` - pode precisar de service role
- `pages/api/usuarios/update-password.ts` - pode precisar de service role

### 3. Subqueries Perigosas

**Procurar por políticas RLS com subqueries:**
```sql
-- ❌ EVITAR: Subqueries que consultam a mesma tabela
USING (
  EXISTS (
    SELECT 1 FROM mesma_tabela  -- CIRCULAR!
    WHERE ...
  )
)

-- ✅ USAR: Políticas simples
USING (
  campo = auth.uid()
)
```

## 📊 Testes de Performance

### Queries Lentas
- [ ] Dashboard carrega em < 2s
- [ ] Listagem de vendas carrega em < 1s
- [ ] Listagem de produtos carrega em < 1s
- [ ] Listagem de usuários (admin) carrega em < 1s

### RLS Overhead
- [ ] RLS não adiciona > 100ms às queries
- [ ] Queries complexas não timeout
- [ ] Joins com RLS funcionam

## 🔍 Testes de Segurança

### Escalação de Privilégios
- [ ] Vendedor NÃO consegue acessar `/api/usuarios?page=1` (deve retornar 403)
- [ ] Vendedor NÃO consegue editar outro usuário via API
- [ ] Vendedor NÃO consegue deletar nada via API
- [ ] Financeiro NÃO consegue criar fornecedores via API

### Bypass de RLS
- [ ] Usuário comum NÃO consegue ver dados de outros usuários
- [ ] Chamadas diretas à API respeitam RLS
- [ ] Service role só é usado após check de permissões

### Token e Sessão
- [ ] Token expirado redireciona para login
- [ ] Token inválido retorna 401
- [ ] Refresh token funciona automaticamente
- [ ] Cookies httpOnly não são acessíveis via JS

## 🎓 Testes de Regressão

### Funcionalidades Existentes
- [ ] Importação de clientes funciona
- [ ] Geocoding de endereços funciona
- [ ] Mapa de clientes funciona
- [ ] Geração de PDFs funciona
- [ ] Exportação de relatórios funciona
- [ ] Busca de produtos funciona
- [ ] Filtros de vendas funcionam

### Triggers e Functions
- [ ] Trigger de sincronização vendedor↔usuario funciona
- [ ] Função de calcular preço médio funciona
- [ ] Trigger de histórico de preços funciona
- [ ] Atualização automática de `updated_at` funciona

## 📝 Como Usar Este Checklist

### Teste Rápido (15 min)
1. ✅ Login como admin
2. ✅ Listar usuários
3. ✅ Criar vendedor
4. ✅ Criar usuário para vendedor
5. ✅ Dashboard carrega
6. ✅ CRUD básico de 3 tabelas

### Teste Completo (1-2 horas)
1. Percorrer TODOS os checkboxes acima
2. Testar com TODOS os roles (admin, gerente, vendedor, financeiro, estoque)
3. Testar operações negadas (403/401)
4. Verificar logs de erro no console
5. Verificar performance

### Teste de Regressão (30 min)
1. Testar funcionalidades que existiam antes
2. Verificar se nada quebrou
3. Comparar com versão anterior

## 🐛 Se Encontrar Erro

### 1. Documentar
- Qual operação?
- Qual role?
- Mensagem de erro?
- Reproduz sempre?

### 2. Verificar
- Console do navegador (F12)
- Network tab (requisição falhou?)
- Response da API (qual erro?)

### 3. Corrigir
- É problema de RLS? → Verificar política
- É problema de permissão? → Verificar service role
- É circular dependency? → Simplificar política

## ✅ Status Atual

**Testes Completados**:
- ✅ Login funciona
- ✅ Dashboard carrega
- ✅ Admin lista usuários
- ✅ Criar vendedor funciona

**Testes Pendentes**:
- ⏳ Todos os outros itens acima

**Erros Conhecidos**:
- ❌ Nenhum (após hotfixes)

---

**Última atualização**: 2025-12-13
**Responsável**: Luisf + Claude
**Status**: Aguardando testes completos
