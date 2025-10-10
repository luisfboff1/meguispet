# 🔐 **CONFIGURAÇÃO DE SECRETS - MEGUISPET ADMIN**

## 📋 **LISTA DE SECRETS NECESSÁRIOS**

### **Como configurar no GitHub:**
1. Acesse: `https://github.com/luisfboff1/meguispet/settings/secrets/actions`
2. Clique em "New repository secret"
3. Adicione cada secret abaixo:

---

## 🗄️ **BANCO DE DADOS MYSQL**
```
DB_HOST=localhost
DB_NAME=u818487728_gestao
DB_USER=u818487728_gestao
DB_PASSWORD=[SUA_SENHA_MYSQL]
```

## 🔑 **AUTENTICAÇÃO JWT**
```
JWT_SECRET=[SEU_JWT_SECRET_AQUI]
```

## 📧 **CONFIGURAÇÕES SMTP (EMAIL)**
```
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_USER=noreply@meguispet.com
SMTP_PASS=Meguis@2025
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
