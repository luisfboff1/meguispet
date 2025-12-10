# ⚡ Ativação Rápida - Dashboards Personalizados

**Guia de 5 minutos para ativar os dashboards em produção**

---

## 📋 Pré-requisitos

Antes de ativar, confirme que:
- ✅ Migrations do banco executadas (3 migrations - 30/11/2025)
- ✅ Sistema de permissões funcionando (88% do plano completo)
- ✅ Hook `usePermissions` implementado
- ✅ Código dos dashboards commitado no repositório

---

## 🚀 Ativação em 3 Passos

### **Passo 1: Testar Localmente (5min)**

```bash
# 1. Adicionar ao .env.local
echo "NEXT_PUBLIC_CUSTOM_DASHBOARDS=true" >> .env.local

# 2. Reiniciar servidor
pnpm dev:local

# 3. Testar no browser
# - Login como admin → deve ver AdminDashboard
# - Login como vendedor → deve ver VendedorDashboard
# - Verificar sidebar (vendedor não vê "Financeiro")
```

**✅ Se funcionou localmente, prosseguir para Passo 2**

---

### **Passo 2: Ativar em Staging (10min)**

```bash
# 1. Commit e push
git add .
git commit -m "feat: Enable personalized dashboards with feature flag"
git push origin main

# 2. No Vercel Dashboard (Staging):
# Settings → Environment Variables → Add
NEXT_PUBLIC_CUSTOM_DASHBOARDS=true

# 3. Redeployar
# (Vercel faz automático ou trigger manual deploy)

# 4. Validar em staging
# URL: https://staging.gestao.meguispet.com/dashboard
```

**Testar:**
- ✅ Admin dashboard carrega
- ✅ Vendedor vê só suas vendas
- ✅ Sidebar filtra menus corretamente
- ✅ Sem erros no console

**✅ Se passou em staging, prosseguir para Passo 3**

---

### **Passo 3: Ativar em Produção (5min)**

```bash
# No Vercel Dashboard (Produção):
# Settings → Environment Variables → Add
NEXT_PUBLIC_CUSTOM_DASHBOARDS=true

# Redeployar (trigger rebuild)

# Validar em produção
# URL: https://gestao.meguispet.com/dashboard
```

**Monitorar por 1 hora:**
- ✅ Logs de erro (deve estar vazio)
- ✅ Tempo de carregamento (< 2s)
- ✅ Feedback de usuários

---

## 🔄 Rollback (se necessário)

Se algo der errado:

```bash
# No Vercel Dashboard:
NEXT_PUBLIC_CUSTOM_DASHBOARDS=false  # ⬅️ Desativar

# Redeployar
```

✅ **Sistema volta ao dashboard genérico anterior (zero impacto)**

---

## 🧪 Testes Críticos

Antes de considerar "ativado", validar:

| Teste | Esperado | Status |
|-------|----------|--------|
| Admin acessa /dashboard | Ver AdminDashboard completo | ⬜ |
| Vendedor acessa /dashboard | Ver VendedorDashboard | ⬜ |
| Vendedor tenta acessar /financeiro | Redirecionar para /dashboard | ⬜ |
| Vendedor vê sidebar | NÃO ver "Financeiro" ou "Usuários" | ⬜ |
| Financeiro acessa /dashboard | Ver FinanceiroDashboard | ⬜ |
| Gerente acessa /dashboard | Ver GerenteDashboard com ranking | ⬜ |
| Vendedor consulta API /vendas/my | Retornar APENAS suas vendas | ⬜ |
| Dashboard carrega | < 2 segundos | ⬜ |

---

## 📞 Suporte

Se encontrar problemas:

1. **Verificar logs:**
   ```bash
   # Vercel Dashboard → Deployments → Logs
   # Procurar por erros relacionados a "Dashboard" ou "permissions"
   ```

2. **Desativar feature flag temporariamente**
   ```bash
   NEXT_PUBLIC_CUSTOM_DASHBOARDS=false
   ```

3. **Consultar troubleshooting:**
   - Ver `IMPLEMENTACAO-DASHBOARDS-PERSONALIZADOS.md` seção "Troubleshooting"

---

## ✅ Checklist Pós-Ativação

Após 24h de ativação:

- [ ] Nenhum erro crítico nos logs
- [ ] Feedback positivo de 80%+ dos usuários
- [ ] Performance mantida (< 2s)
- [ ] Métricas corretas (vendedor vê só suas vendas)
- [ ] Sidebar funcionando corretamente
- [ ] Nenhum vazamento de dados

---

## 🎉 Pronto!

Se todos os testes passaram, o sistema está funcionando corretamente!

**Próximo passo:** Coletar feedback dos usuários e fazer ajustes finos.

---

**Tempo Total de Ativação:** 20 minutos
**Risco:** Baixo (feature flag permite rollback instantâneo)
**Impacto:** Alto (melhora significativa na UX por role)
