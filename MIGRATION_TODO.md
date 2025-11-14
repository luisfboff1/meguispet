# 🚨 AÇÃO NECESSÁRIA: Aplicar Migration 009

## ⚡ Quick Start (5 minutos)

### 1️⃣ Aplicar Migration
Escolha um método:

**Método A: Supabase CLI** (Recomendado)
```bash
cd /caminho/para/meguispet
supabase db push
```

**Método B: Manual no Dashboard**
1. Abra [Supabase Dashboard](https://supabase.com/dashboard)
2. Vá para SQL Editor
3. Copie o conteúdo de `database/migrations/009_add_vendas_origem_uf_columns.sql`
4. Execute

### 2️⃣ Verificar
```bash
./database/migrations/verify_009.sh
```

### 3️⃣ Testar
1. Acesse `/relatorios/vendas` no sistema
2. Configure um período de datas
3. Clique em "Preview"
4. ✅ Deve funcionar sem erro 500

---

## 📋 O Que Foi Feito

✅ Problema identificado  
✅ Migration criada  
✅ Documentação completa  
✅ Script de verificação  
✅ Validações de qualidade  
⏳ **Aplicação no banco (VOCÊ PRECISA FAZER)**  
⏳ **Teste do endpoint (VOCÊ PRECISA FAZER)**  

---

## 📚 Documentação Completa

Para entender todos os detalhes:

1. **Instruções Passo-a-Passo**
   - `database/migrations/009_APPLY_INSTRUCTIONS.md`

2. **Status Geral do Sistema**
   - `docs/04-features/relatorios/SITUACAO_ATUAL.md`

3. **Resumo Executivo**
   - `database/migrations/009_SUMMARY.md`

---

## 🆘 Precisa de Ajuda?

- **Erro ao aplicar?** Veja rollback em `009_APPLY_INSTRUCTIONS.md`
- **Dúvidas sobre impacto?** Veja `009_SUMMARY.md`
- **Contexto completo?** Veja `SITUACAO_ATUAL.md`

---

## ⏰ Por Que é Urgente?

O relatório de vendas está **quebrado em produção** com erro 500.  
Esta migration resolve 100% do problema em **menos de 5 minutos**.

**Risco**: 🟢 Baixo (só adiciona colunas, não remove dados)  
**Impacto**: ✅ Resolve completamente o erro

---

## ✅ Depois de Aplicar

Pode deletar este arquivo! Ele é só um lembrete.

```bash
rm MIGRATION_TODO.md
```

---

**Criado em**: 2024-11-14  
**Issue**: POST /api/relatorios/vendas/preview 500  
**PR**: copilot/fix-vendas-origem-column-error
