# ⚠️ DEPRECATED - CONFIGURAÇÃO DE SECRETS - MEGUISPET ADMIN (Legacy)

> **IMPORTANTE**: Este documento contém configurações do sistema de autenticação JWT customizado que foi **REMOVIDO**.
> 
> **Novo Sistema**: O projeto agora usa **Supabase Auth** para autenticação.
> 
> **JWT_SECRET não é mais necessário** - Use as variáveis do Supabase listadas abaixo.

---

## 📋 **LISTA DE SECRETS NECESSÁRIOS** (ATUALIZADO)

### **Como configurar no GitHub:**
1. Acesse: `https://github.com/luisfboff1/meguispet/settings/secrets/actions`
2. Clique em "New repository secret"
3. Adicione cada secret abaixo:

---

## 🔐 **SUPABASE (Autenticação e Banco de Dados)**
```
NEXT_PUBLIC_SUPABASE_URL=https://[seu-projeto].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[sua-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[sua-service-role-key]
```

## 🗄️ **BANCO DE DADOS MYSQL (Legacy - Migrar para Supabase)**
```
DB_HOST=localhost
DB_NAME=u818487728_gestao
DB_USER=u818487728_gestao
DB_PASSWORD=[SUA_SENHA_MYSQL]
```

## ~~🔑 **AUTENTICAÇÃO JWT**~~ (REMOVIDO)
```
# JWT_SECRET=[SEU_JWT_SECRET_AQUI]  # NÃO MAIS USADO
```

## 📧 **CONFIGURAÇÕES SMTP (EMAIL)**
```
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_USER=noreply@meguispet.com
SMTP_PASS=[SUA_SENHA_SMTP]
SMTP_FROM_NAME=Megui's Pet Admin
SMTP_FROM_EMAIL=noreply@meguispet.com
```

## 🚀 **DEPLOY FTP**
```
FTP_SERVER=ftp.hostinger.com
FTP_USERNAME=[SEU_USUARIO_FTP]
FTP_PASSWORD=[SUA_SENHA_FTP]
```

## 🤖 **GROQ API (MEGUISBOT AGENTE)**
```
GROQ_API_KEY=[SUA_API_KEY_GROQ]
GROQ_MODEL=llama3-8b-8192
```

---

## ⚠️ **IMPORTANTE**

- **NUNCA** commite secrets no código
- **SEMPRE** use GitHub Secrets para dados sensíveis
- **MANTENHA** os secrets atualizados
- **TESTE** após cada mudança de secret

---

## 🎯 **PRÓXIMOS PASSOS**

1. ✅ Adicionar todos os secrets no GitHub
2. ✅ Fazer commit e push para testar deploy
3. ✅ Testar funcionalidades básicas
4. ✅ Implementar MeguisBot com Groq
5. ✅ Testar reconhecimento de voz

---

**✅ COM TODOS OS SECRETS CONFIGURADOS, O SISTEMA ESTARÁ 100% FUNCIONAL!**
