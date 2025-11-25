# Migração - Adicionar Campo Inscrição Estadual

**Data:** 25 de Novembro de 2025
**Migração:** 016_add_inscricao_estadual_to_clientes.sql
**Status:** ⏳ PENDENTE EXECUÇÃO NO SUPABASE

---

## 📋 Problema

O campo `inscricao_estadual` está no código mas **não existe no banco de dados**, causando erro:

```
Could not find the 'inscricao_estadual' column of 'clientes_fornecedores' in the schema cache
```

---

## ✅ Solução

Executar a migração 016 no Supabase para adicionar a coluna.

---

## 🚀 Como Executar

### Opção 1: Via Dashboard do Supabase (Recomendado)

1. **Acesse o Supabase Dashboard:**
   - Vá para: https://supabase.com/dashboard
   - Selecione seu projeto

2. **Abra o SQL Editor:**
   - Menu lateral → "SQL Editor"
   - Clique em "New query"

3. **Cole e Execute o SQL:**

\`\`\`sql
-- =====================================================
-- Migration 016: Add inscricao_estadual to clientes_fornecedores
-- Description: Add state registration field to customer/supplier table
-- Date: 2025-11-20
-- =====================================================

-- Add inscricao_estadual column to clientes_fornecedores table
ALTER TABLE clientes_fornecedores
ADD COLUMN IF NOT EXISTS inscricao_estadual VARCHAR(50);

-- Add comment to explain the field
COMMENT ON COLUMN clientes_fornecedores.inscricao_estadual IS 'Inscrição Estadual (State Registration) - can be used by both clients and suppliers';

-- Create index for faster lookups if needed
CREATE INDEX IF NOT EXISTS idx_clientes_fornecedores_inscricao_estadual
ON clientes_fornecedores(inscricao_estadual)
WHERE inscricao_estadual IS NOT NULL;

-- Verify the column was added
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'clientes_fornecedores'
        AND column_name = 'inscricao_estadual'
    ) THEN
        RAISE NOTICE '✓ Column inscricao_estadual successfully added to clientes_fornecedores';
    ELSE
        RAISE EXCEPTION '✗ Failed to add column inscricao_estadual to clientes_fornecedores';
    END IF;
END $$;
\`\`\`

4. **Clique em "Run"**

5. **Verifique o Resultado:**
   - Deve aparecer: `✓ Column inscricao_estadual successfully added to clientes_fornecedores`

---

### Opção 2: Via CLI do Supabase (Para quem usa CLI)

\`\`\`bash
# Execute a migração
supabase db push

# Ou execute direto o SQL
psql $DATABASE_URL -f database/migrations/016_add_inscricao_estadual_to_clientes.sql
\`\`\`

---

## 🧪 Como Testar Após a Migração

1. **Reinicie o servidor de desenvolvimento:**
   \`\`\`bash
   npm run dev:local
   \`\`\`

2. **Acesse o cadastro de clientes:**
   - Vá para `/clientes`
   - Clique em "Novo Cliente"

3. **Teste o campo Inscrição Estadual:**
   - Preencha os campos obrigatórios (Nome, Tipo)
   - Preencha opcionalmente a "Inscrição Estadual"
   - Salve o cliente

4. **Verifique:**
   - Cliente deve ser salvo com sucesso ✅
   - Nenhum erro 500 ✅
   - Campo IE aparece na lista de clientes ✅

---

## 📊 Detalhes da Migração

### O que a migração faz:

1. **Adiciona coluna `inscricao_estadual`:**
   - Tipo: `VARCHAR(50)`
   - Permite `NULL` (campo opcional)
   - Pode ser usado por clientes e fornecedores

2. **Cria índice para performance:**
   - Índice parcial (só para registros com IE preenchida)
   - Melhora performance de buscas por IE

3. **Adiciona comentário:**
   - Documenta o propósito do campo

4. **Verifica sucesso:**
   - Confirma que a coluna foi adicionada corretamente

---

## 🔒 Políticas RLS

A coluna `inscricao_estadual` herda automaticamente as políticas RLS existentes da tabela `clientes_fornecedores`:

✅ **SELECT** - Usuários autenticados podem ver
✅ **INSERT** - Usuários autenticados podem inserir
✅ **UPDATE** - Usuários autenticados podem atualizar
✅ **DELETE** - Apenas admins podem deletar

Não é necessário criar novas políticas.

---

## ⚠️ Importante

- **Campo é OPCIONAL:** Clientes podem ser cadastrados sem IE
- **Não afeta dados existentes:** Clientes já cadastrados terão IE = NULL
- **Migração é segura:** Usa `IF NOT EXISTS` para evitar erros se já executada
- **Pode executar múltiplas vezes:** Não causará erro se executar novamente

---

## 🐛 Troubleshooting

### Erro: "permission denied for table clientes_fornecedores"

**Solução:** Certifique-se de estar usando o usuário correto do banco. Pode ser necessário usar o Service Role Key.

### Erro: "column already exists"

**Solução:** A coluna já foi adicionada. Não é necessário fazer nada.

### Cliente ainda dá erro 500 após migração

**Possíveis causas:**
1. Cache do Supabase não atualizou
   - **Solução:** Aguarde 1-2 minutos

2. Servidor ainda está com cache antigo
   - **Solução:** Reinicie o servidor (`Ctrl+C` e `npm run dev:local`)

3. Navegador com cache
   - **Solução:** Limpe cache do navegador (Ctrl+Shift+R)

---

## ✅ Checklist Pós-Migração

- [ ] Executei o SQL no Supabase Dashboard
- [ ] Vi mensagem de sucesso no console
- [ ] Reiniciei o servidor de desenvolvimento
- [ ] Testei cadastro de cliente SEM IE (deve funcionar)
- [ ] Testei cadastro de cliente COM IE (deve funcionar)
- [ ] Verifiquei que não há erros 500

---

**Preparado por:** Claude Code
**Data:** 25/11/2025
**Arquivo SQL:** `database/migrations/016_add_inscricao_estadual_to_clientes.sql`
