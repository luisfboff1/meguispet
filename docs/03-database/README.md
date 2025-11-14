# 🗄️ Banco de Dados

Documentação completa do schema do banco de dados PostgreSQL (Supabase).

---

## 📊 Visão Geral

O MeguisPet usa **PostgreSQL** via **Supabase** como banco de dados principal.

**Características:**
- PostgreSQL 15+
- Real-time capabilities (Supabase)
- Row Level Security (RLS)
- Migrations versionadas
- Índices otimizados para performance

---

## 📁 Documentos

| Documento | Descrição |
|-----------|-----------|
| [schema.md](./schema.md) | Schema completo de todas as tabelas |
| [migrations/](./migrations/) | Histórico de migrations SQL |

---

## 🔑 Tabelas Principais

### Gestão de Usuários
- `usuarios` - Usuários do sistema (admin/convidado)

### Gestão Comercial
- `clientes` - Clientes e fornecedores
- `vendedores` - Vendedores da loja
- `produtos` - Produtos cadastrados
- `estoques` - Estoques (lojas/depósitos)
- `produtos_estoques` - Produtos por estoque

### Vendas
- `vendas` - Vendas realizadas
- `itens_venda` - Itens de cada venda
- `formas_pagamento` - Formas de pagamento

### Relatórios (Novo)
- `relatorios_salvos` - Relatórios gerados e salvos
- `relatorios_templates` - Templates de relatórios reutilizáveis

---

## 🔄 Migrations

As migrations estão em:
```
database/migrations/
├── 001_initial_schema.sql
├── 002_vendedores.sql
├── 003_vendas_itens.sql
├── 004_multi_estoque.sql
├── 005_impostos_ipi_st.sql
├── 006_vendas_7_dias.sql
├── 007_vendas_completas.sql
└── 008_reports_system.sql
```

Para executar migrations:
```bash
# Via Supabase CLI
supabase db push

# Ou via SQL direto no Supabase Dashboard
```

---

## 📈 Índices de Performance

Índices criados para otimizar queries:

```sql
-- Vendas por período
CREATE INDEX idx_vendas_data ON vendas(data_venda)

-- Vendas por vendedor
CREATE INDEX idx_vendas_vendedor ON vendas(vendedor_id)

-- Itens por venda
CREATE INDEX idx_itens_venda ON itens_venda(venda_id)

-- Produtos por estoque
CREATE INDEX idx_produtos_estoques_produto ON produtos_estoques(produto_id)
```

Ver mais em: [schema.md](./schema.md)

---

## 🔐 Row Level Security (RLS)

**Status:** 🔴 A implementar

Atualmente o sistema usa autenticação via Supabase Auth mas RLS ainda não está configurado nas tabelas de negócio.

**Planejado:**
- RLS por role (admin/convidado)
- Isolamento por usuário em relatórios salvos
- Proteção de dados sensíveis

---

## 🔗 Relacionamentos

```
usuarios
  ↓
vendedores
  ↓
vendas → itens_venda → produtos
  ↓
clientes
```

Diagrama completo em: [schema.md](./schema.md)

---

## 📊 Estatísticas

- **Tabelas:** 12
- **Views:** 2 (vendas_7_dias, vendas_completas)
- **Índices:** 15+
- **Functions:** 0 (futuro: triggers para auditoria)

---

## 🔧 Ferramentas

- **Supabase Dashboard**: Interface visual para queries
- **Supabase CLI**: Migrations e deploy local
- **pgAdmin** (opcional): Client PostgreSQL avançado

---

[⬅️ Voltar para Documentação](../README.md)
