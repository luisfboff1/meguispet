# Implementação: Criação de Usuários e Expiração de Token

## Resumo das Alterações

Este documento descreve as mudanças implementadas para resolver os dois problemas principais:
1. Adicionar funcionalidade de criação de usuários na página /usuarios
2. Configurar expiração de token de autenticação para 10 horas

---

## 1. Página de Usuários - Funcionalidade de Criação

### Componentes Criados

#### `components/forms/UsuarioForm.tsx`
Novo formulário completo para criação de usuários com:

**Campos:**
- Nome Completo (obrigatório)
- Email (obrigatório, com validação)
- Senha (obrigatório, mínimo 6 caracteres)
- Função/Role (seleção entre Admin e Convidado)

**Permissões (checkboxes):**
- Clientes
- Produtos
- Vendas
- Estoque
- Financeiro
- Relatórios
- Configurações

**Funcionalidades:**
- Validação de formulário no client-side
- Botões "Selecionar Todas" e "Limpar" permissões
- Estado de loading durante submit
- Mensagens de erro inline nos campos
- Estilização consistente com design system do projeto

### Sistema de Notificações Toast

#### `components/ui/use-toast.tsx`
Provider e hook para gerenciamento global de notificações:
```typescript
const { toast } = useToast()

toast({
  title: 'Sucesso',
  description: 'Usuário criado com sucesso',
  variant: 'default' | 'destructive'
})
```

#### `components/ui/toaster.tsx`
Componente de renderização de toasts:
- Posicionado no canto inferior direito
- Auto-dismiss após 3.5 segundos
- Suporte para múltiplos toasts simultâneos
- Variantes success (verde) e error (vermelho)
- Animação de entrada/saída

### Sistema de Modais Atualizado

#### `store/modal.ts`
Adicionado novo tipo de modal:
```typescript
type ModalId = 'cliente' | 'produto' | 'venda' | 'movimentacao' | 'usuario' | 'generic'
```

#### `components/modals/modal-host.tsx`
- Novo case para modal 'usuario'
- Renderiza `UsuarioForm` com handlers apropriados
- Integração com sistema de fechamento e callbacks

### Página de Usuários Atualizada

#### `pages/usuarios.tsx`
**Funcionalidade Adicionada:**

1. **Hook useModal**: Para abrir modal de criação
2. **Hook useToast**: Para notificações de sucesso/erro
3. **Função `handleCreateUser`**:
   - Chama `authService.signup()` para criar usuário no Supabase Auth
   - Atualiza permissões na tabela `usuarios` via `usuariosService.update()`
   - Mostra notificação de sucesso/erro
   - Recarrega lista de usuários após sucesso
4. **Botão "Novo Usuário"**:
   - Agora funcional, abre o modal
   - onClick chama `openCreateUserModal()`

### Fluxo de Criação de Usuário

```
1. Admin clica "Novo Usuário"
   ↓
2. Modal abre com UsuarioForm
   ↓
3. Admin preenche dados e seleciona permissões
   ↓
4. Submit → handleCreateUser()
   ↓
5. authService.signup() cria usuário no Supabase Auth
   ↓
6. usuariosService.update() salva permissões
   ↓
7. Toast de sucesso aparece
   ↓
8. Lista de usuários é recarregada
   ↓
9. Modal fecha automaticamente
```

---

## 2. Expiração de Token (10 horas)

### Alterações no Código

#### `lib/supabase.ts`
Atualizado `getSupabaseBrowser()` com configuração explícita de auth:
```typescript
return createBrowserClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,     // Refresh automático antes de expirar
    persistSession: true,        // Persiste sessão no localStorage
    detectSessionInUrl: true,    // Detecta redirects de auth
  },
});
```

**O que isso faz:**
- `autoRefreshToken: true` → Supabase automaticamente renova o token antes de expirar
- `persistSession: true` → Mantém sessão salva entre reloads
- `detectSessionInUrl: true` → Melhora compatibilidade com OAuth

### Documentação Criada

#### `TOKEN_EXPIRATION_CONFIG.md`
Guia completo para configurar expiração de token no Supabase Dashboard:

**Passos:**
1. Acessar Painel do Supabase
2. Ir em Authentication > Settings
3. Localizar "JWT Settings"
4. Alterar "JWT Expiry" para `36000` (10 horas em segundos)
5. Salvar

**Comportamento Esperado:**
- **Antes de 10 horas**: Token é automaticamente refreshed
- **Após 10 horas**: 
  - Usuário inativo → logout na próxima ação
  - Usuário ativo → tentativa de refresh; se falhar, logout

### Verificação de Token

O sistema já possui verificação de token em:

1. **`hooks/useAuth.ts`**:
   - Listener para eventos `TOKEN_REFRESHED` e `SIGNED_OUT`
   - Atualização automática do token no state
   - Logout automático em caso de erro 401

2. **`middleware.ts`**:
   - Verifica token em rotas protegidas
   - Redireciona para /login se token inválido/expirado

---

## Arquivos Modificados

### Novos Arquivos
- ✅ `components/forms/UsuarioForm.tsx` - Formulário de criação de usuário
- ✅ `components/ui/use-toast.tsx` - Provider e hook de toast
- ✅ `components/ui/toaster.tsx` - Componente de renderização de toasts
- ✅ `TOKEN_EXPIRATION_CONFIG.md` - Documentação de configuração

### Arquivos Modificados
- ✅ `pages/usuarios.tsx` - Adicionada funcionalidade de criação
- ✅ `pages/_app.tsx` - Adicionado ToastProvider e Toaster
- ✅ `store/modal.ts` - Adicionado tipo 'usuario'
- ✅ `components/modals/modal-host.tsx` - Adicionado case para modal usuario
- ✅ `lib/supabase.ts` - Configuração de auth atualizada

---

## Testes Recomendados

### 1. Criação de Usuário
- [ ] Abrir página /usuarios
- [ ] Clicar em "Novo Usuário"
- [ ] Preencher formulário com dados válidos
- [ ] Selecionar role e permissões
- [ ] Submeter formulário
- [ ] Verificar toast de sucesso
- [ ] Confirmar novo usuário aparece na lista

### 2. Validações
- [ ] Tentar criar sem nome → erro inline
- [ ] Tentar criar com email inválido → erro inline
- [ ] Tentar criar com senha < 6 chars → erro inline
- [ ] Submeter formulário incompleto → erros aparecem

### 3. Permissões
- [ ] Clicar "Selecionar Todas" → todos checkboxes marcados
- [ ] Clicar "Limpar" → todos checkboxes desmarcados
- [ ] Marcar/desmarcar individualmente → funciona

### 4. Toasts
- [ ] Criar usuário com sucesso → toast verde aparece
- [ ] Tentar criar usuário com email duplicado → toast vermelho
- [ ] Toast desaparece após 3.5 segundos
- [ ] Botão X fecha toast manualmente

### 5. Expiração de Token (requer config no Supabase)
- [ ] Configurar JWT expiry para 36000s no dashboard
- [ ] Fazer login
- [ ] Verificar `expires_at` no localStorage
- [ ] Aguardar 10 horas (ou alterar para 1 minuto para teste)
- [ ] Verificar logout automático

---

## Notas de Implementação

### Decisões Técnicas

1. **Native HTML elements vs Shadcn components**:
   - Usado `<select>` e `<input type="checkbox">` nativos
   - Mantém consistência com outros formulários do projeto
   - Evita dependências extras de Shadcn/Radix

2. **Toast Provider Pattern**:
   - Context API para estado global
   - Evita prop drilling
   - Permite uso do toast em qualquer componente

3. **Separação de Responsabilidades**:
   - `authService.signup()` → Criação no Supabase Auth
   - `usuariosService.update()` → Atualização de permissões
   - Permite rollback se uma operação falhar

4. **Token Expiration**:
   - Configuração no Supabase (não hardcoded)
   - Permite alteração sem deploy de código
   - Auto-refresh gerenciado pelo Supabase SDK

### Limitações Conhecidas

1. **Token Expiry Config**:
   - Requer acesso ao Supabase Dashboard
   - Não pode ser configurado via código
   - Valor padrão do Supabase é 1 hora

2. **Permissões**:
   - Estrutura é definida no formulário
   - Se novos módulos forem adicionados, precisa atualizar UsuarioForm
   - Considerar buscar permissões disponíveis de uma API

3. **Email Único**:
   - Supabase Auth impede emails duplicados
   - Erro retornado do backend em caso de duplicação
   - Toast exibe mensagem de erro

---

## Segurança

### Validações Implementadas

1. **Client-side**:
   - Email regex validation
   - Senha mínimo 6 caracteres
   - Campos obrigatórios

2. **Server-side** (já existente em `/api/auth/signup`):
   - Email regex validation
   - Senha mínimo 6 caracteres
   - Campos obrigatórios
   - Rollback se criação de perfil falhar

3. **Token Security**:
   - JWT assinado pelo Supabase
   - Auto-refresh antes de expirar
   - Logout em caso de token inválido

---

## Próximos Passos

1. **Configurar Supabase Dashboard**:
   - Seguir `TOKEN_EXPIRATION_CONFIG.md`
   - Definir JWT expiry para 36000 segundos

2. **Testes Manuais**:
   - Executar suite de testes recomendados
   - Verificar fluxo completo de criação

3. **Melhorias Futuras** (opcional):
   - Edição de usuários existentes
   - Desativação de usuários
   - Histórico de login/ações
   - Permissões mais granulares
   - Busca e filtros na lista de usuários
