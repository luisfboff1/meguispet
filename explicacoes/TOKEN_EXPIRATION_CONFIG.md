# Configuração de Expiração de Token (10 horas)

## Problema
Os tokens de autenticação não estavam expirando, permitindo que usuários permanecessem logados indefinidamente.

## Solução
Configurar a expiração de JWT para 10 horas (36000 segundos) no Supabase.

## Passos para Configurar no Supabase Dashboard

1. Acesse o Painel do Supabase: https://app.supabase.com
2. Selecione seu projeto MeguisPet
3. Navegue para **Authentication** > **Settings** (ou **Configurações**)
4. Na seção **JWT Settings** (Configurações JWT):
   - Localize o campo **JWT Expiry** (Expiração JWT)
   - Altere o valor para `36000` (segundos = 10 horas)
   - Clique em **Save** (Salvar)

## Configuração Atual do Código

O código já está configurado para:
- ✅ Auto-refresh de tokens antes da expiração (`autoRefreshToken: true`)
- ✅ Persistência de sessão no localStorage
- ✅ Detecção de tokens expirados na verificação de autenticação
- ✅ Logout automático quando token expira

### Arquivos Atualizados

1. **lib/supabase.ts**
   - Adicionado `autoRefreshToken: true` ao cliente browser
   - Configurações de auth explícitas

2. **hooks/useAuth.ts**
   - Listener para eventos de auth (TOKEN_REFRESHED, SIGNED_OUT)
   - Atualização automática do token quando refreshed
   - Logout automático em caso de token expirado (erro 401)

## Verificação

Para verificar se a expiração está funcionando:

1. Faça login no sistema
2. Verifique o localStorage no navegador (F12 > Application > Local Storage)
3. Procure pela chave `sb-{project-ref}-auth-token`
4. Dentro do objeto JSON, verifique o campo `expires_at` (timestamp Unix)
5. O token deve expirar 10 horas (36000 segundos) após o login

## Comportamento Esperado

- **Antes de 10 horas**: Token é automaticamente refreshed (renovado)
- **Após 10 horas**: 
  - Se o usuário estiver inativo: logout automático na próxima ação
  - Se o usuário estiver ativo: tentativa de refresh; se falhar, logout

## Notas Importantes

- A expiração de JWT é configurada no **Supabase Dashboard**, não no código
- O código apenas consome e valida os tokens gerados pelo Supabase
- Recomendamos **não usar valores menores que 1 hora** para evitar logouts frequentes
- O valor de 10 horas (36000 segundos) oferece um bom equilíbrio entre segurança e experiência do usuário

## Configurações Relacionadas

Se quiser alterar o comportamento de refresh:
- Refresh acontece automaticamente quando o token está próximo da expiração
- Por padrão, o Supabase tenta refresh quando faltam ~60 minutos para expirar
- Para customizar, ajuste as configurações de JWT no Supabase Dashboard

## Troubleshooting

### Token não expira
1. Verifique se a configuração foi salva no Supabase Dashboard
2. Limpe o localStorage do navegador
3. Faça logout e login novamente
4. Verifique o `expires_at` no token armazenado

### Logout muito frequente
1. Aumente o JWT Expiry no Supabase Dashboard
2. Verifique se há erros de rede impedindo o auto-refresh

### Usuários não são deslogados após expiração
1. Verifique se o middleware está ativo (`middleware.ts`)
2. Confirme que `checkAuth()` está sendo chamado ao carregar páginas protegidas
3. Verifique console do navegador por erros de auth
