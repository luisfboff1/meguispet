# ⚡ TESTE AGORA - Dashboards Personalizados

**Feature flag ATIVADA no Doppler DEV!**

✅ `NEXT_PUBLIC_CUSTOM_DASHBOARDS=true` configurado

---

## 🚀 Iniciar Teste (2 minutos)

### **Passo 1: Reiniciar Servidor**

```bash
# Parar servidor atual (Ctrl+C se estiver rodando)

# Iniciar com Doppler
pnpm dev
```

**✅ Esperado:** No terminal deve aparecer as variáveis sendo carregadas do Doppler

---

### **Passo 2: Verificar Variável**

Abra o DevTools do navegador (F12) e no Console digite:

```javascript
// Verificar se feature flag está ativa
console.log(process.env.NEXT_PUBLIC_CUSTOM_DASHBOARDS)
// Deve retornar: "true"
```

---

### **Passo 3: Testar Dashboards**

#### **Como Admin:**
1. Login: admin@meguispet.com
2. Ir para: `/dashboard`
3. **✅ Esperado:** Ver `AdminDashboard` com welcome card "Olá, [Nome]! 👋"

#### **Como Vendedor:**
1. Login: vendedor@meguispet.com (se existir)
2. Ir para: `/dashboard`
3. **✅ Esperado:** Ver `VendedorDashboard` com métricas pessoais

#### **Como Financeiro:**
1. Login: financeiro@meguispet.com (se existir)
2. Ir para: `/dashboard`
3. **✅ Esperado:** Ver `FinanceiroDashboard` com todas as vendas

---

### **Passo 4: Testar Sidebar**

#### **Como Vendedor:**
1. Abrir sidebar
2. **✅ Esperado:** NÃO ver "Financeiro", "Usuários"
3. **✅ Esperado:** Ver "Dashboard", "Vendas", "Clientes", "Produtos"

#### **Como Financeiro:**
1. Abrir sidebar
2. **✅ Esperado:** NÃO ver "Usuários"
3. **✅ Esperado:** Ver "Dashboard", "Vendas", "Clientes", "Financeiro"

#### **Como Admin:**
1. Abrir sidebar
2. **✅ Esperado:** Ver TODOS os itens

---

### **Passo 5: Testar Segurança**

#### **Teste 1: Vendedor tentando acessar Financeiro**
```bash
# Como vendedor, digitar na URL:
http://localhost:3000/financeiro

# ✅ ESPERADO: Redirecionar para /dashboard com erro
```

#### **Teste 2: Vendedor vendo apenas suas vendas**
```bash
# Como vendedor, abrir DevTools → Network
# Ir para /vendas
# Verificar chamada API: /api/vendas/my

# ✅ ESPERADO: Retornar apenas vendas com vendedor_id do usuário
```

---

## ✅ Checklist de Validação

Use este checklist durante o teste:

- [ ] Servidor inicia sem erros
- [ ] Feature flag está `true` no console
- [ ] Admin vê AdminDashboard
- [ ] Vendedor vê VendedorDashboard
- [ ] Financeiro vê FinanceiroDashboard
- [ ] Sidebar filtra menus por role
- [ ] Vendedor não acessa /financeiro
- [ ] Vendedor vê apenas suas vendas
- [ ] Welcome cards personalizadas aparecem
- [ ] Métricas calculam corretamente
- [ ] Gráficos renderizam
- [ ] Sem erros no console

---

## 🐛 Se algo não funcionar

### Problema: Dashboard não mudou
**Solução:**
```bash
# 1. Limpar cache do Next.js
pnpm clean

# 2. Reiniciar servidor
pnpm dev

# 3. Hard refresh no browser (Ctrl+Shift+R)
```

### Problema: Variável não está carregando
**Solução:**
```bash
# Verificar se Doppler está ativo
doppler setup --project meguispet --config dev

# Ver todas as variáveis
doppler secrets --project meguispet --config dev
```

### Problema: "Cannot read property 'userRole' of undefined"
**Solução:**
```bash
# Verificar se usuário tem permissões no banco
# Executar migration se necessário
```

---

## 📞 Suporte Rápido

Se encontrar problemas:

1. **Ver console do browser** (F12 → Console)
2. **Ver logs do servidor** (terminal onde rodou `pnpm dev`)
3. **Verificar DevTools → Network** (chamadas API)

---

## 🎉 Se tudo funcionar

**Próximo passo:** Deploy em staging!

```bash
# Commit
git add .
git commit -m "feat: Enable custom dashboards with feature flag"
git push

# Deploy automático para staging/produção
```

---

**Data:** 10/12/2025
**Status:** ✅ Pronto para Teste Local
