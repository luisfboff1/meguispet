# Plano de Integração Bling ERP + MeguisPet

> **Data:** Fevereiro 2026
> **Status:** Planejado - Aguardando implementação
> **Prioridade:** Alta

---

## 1. Visão Geral

O cliente utiliza o **Bling ERP** para gerenciar vendas de marketplaces (Amazon, Shopee, Mercado Livre, Magazine Luiza, etc.) e emissão de NFe. Esta integração sincronizará automaticamente os pedidos de venda e notas fiscais do Bling para o MeguisPet, centralizando a gestão do negócio.

### Decisões Técnicas
| Decisão | Escolha | Motivo |
|---------|---------|--------|
| Método de sincronização | Webhooks + Polling | Tempo real com fallback de segurança |
| Armazenamento | Tabelas separadas | Sem risco de conflito com dados locais |
| Importação de histórico | Sim | Cliente já tem vendas/NFe no Bling |

---

## 2. Pré-requisitos (antes de implementar)

### Informações confirmadas com o suporte Bling:
- **Tipo de app:** Privado (criado direto na conta do cliente MeguisPet)
- **Conta de desenvolvedor:** NÃO precisa - usa a conta existente do cliente
- **Custo:** ZERO - a API é pública e gratuita
- **Homologação:** NÃO necessária para app privado
- **Acesso:** Restrito apenas às pessoas da conta do cliente

### Checklist
- [ ] Acessar a conta Bling do cliente (MeguisPet já tem conta ativa)
- [ ] Criar **Aplicativo Privado** em https://developer.bling.com.br/aplicativos
  - Visibilidade: **Privado** (opera apenas na própria conta)
  - Scopes necessários: `order`, `invoice`, `product`, `stock`, `contact`
  - Callback URL: `https://gestao.meguispet.com/api/bling/callback`
- [ ] Anotar `client_id` e `client_secret` gerados
- [ ] Configurar variáveis de ambiente no Doppler:
  - `BLING_CLIENT_ID`
  - `BLING_CLIENT_SECRET`
- [ ] Configurar webhooks no app (aba "Webhooks" do app):
  - URL: `https://gestao.meguispet.com/api/bling/webhook`
  - Recursos: Pedidos de Venda (created/updated), NFe (created/updated)
- [ ] Definir período de histórico a importar com o cliente

---

## 3. Tabelas SQL a Criar no Supabase

**Arquivo de migração:** `database/migrations/024_bling_integration.sql`

### 3.1 `bling_config` - Configuração e Tokens OAuth
Armazena os tokens de acesso e configuração da integração.

```sql
CREATE TABLE bling_config (
  id SERIAL PRIMARY KEY,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  bling_company_id VARCHAR(50),
  scopes TEXT[],
  is_active BOOLEAN DEFAULT true,
  last_sync_vendas TIMESTAMPTZ,
  last_sync_nfe TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.2 `bling_vendas` - Pedidos de Venda Importados
Armazena os pedidos de venda vindos do Bling com todos os dados relevantes.

```sql
CREATE TABLE bling_vendas (
  id SERIAL PRIMARY KEY,
  bling_id BIGINT UNIQUE NOT NULL,        -- ID do pedido no Bling
  numero_pedido VARCHAR(50),
  numero_pedido_loja VARCHAR(100),         -- Número no marketplace (ex: Amazon order ID)
  data_pedido TIMESTAMPTZ,
  data_saida TIMESTAMPTZ,

  -- Cliente
  bling_contato_id BIGINT,
  contato_nome VARCHAR(255),
  contato_documento VARCHAR(20),           -- CPF/CNPJ
  contato_email VARCHAR(255),
  contato_telefone VARCHAR(50),

  -- Origem/Canal de Venda
  canal_venda VARCHAR(100),                -- Amazon, Shopee, Mercado Livre, etc.
  loja_id BIGINT,
  loja_nome VARCHAR(255),

  -- Valores Financeiros
  total_produtos DECIMAL(10,2),
  total_desconto DECIMAL(10,2),
  total_frete DECIMAL(10,2),
  total_outras_despesas DECIMAL(10,2),
  valor_total DECIMAL(10,2),

  -- Pagamento
  forma_pagamento VARCHAR(100),            -- Crédito, Débito, Dinheiro, PIX, Boleto

  -- Status
  situacao_id INTEGER,
  situacao_nome VARCHAR(100),              -- Aprovado, Cancelado, Em andamento, etc.

  -- Vendedor
  bling_vendedor_id BIGINT,
  vendedor_nome VARCHAR(255),

  -- Dados extras (JSON)
  endereco_entrega JSONB,
  transporte JSONB,

  -- Vinculações
  bling_nfe_id BIGINT,
  venda_local_id BIGINT REFERENCES vendas(id) ON DELETE SET NULL,

  -- Sync
  raw_data JSONB,                          -- Payload completo como backup
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.3 `bling_vendas_itens` - Itens dos Pedidos
```sql
CREATE TABLE bling_vendas_itens (
  id SERIAL PRIMARY KEY,
  bling_venda_id INTEGER REFERENCES bling_vendas(id) ON DELETE CASCADE,
  bling_produto_id BIGINT,
  codigo_produto VARCHAR(100),             -- SKU
  descricao VARCHAR(500),
  quantidade DECIMAL(10,4),
  valor_unitario DECIMAL(10,4),
  valor_desconto DECIMAL(10,2),
  valor_total DECIMAL(10,2),
  produto_local_id BIGINT REFERENCES produtos(id) ON DELETE SET NULL
);
```

### 3.4 `bling_nfe` - Notas Fiscais Importadas
```sql
CREATE TABLE bling_nfe (
  id SERIAL PRIMARY KEY,
  bling_id BIGINT UNIQUE NOT NULL,
  numero INTEGER,
  serie INTEGER,
  chave_acesso VARCHAR(44),

  tipo INTEGER,                            -- 0=entrada, 1=saída
  situacao INTEGER,                        -- 1=pendente, 5=autorizada, 2=cancelada, etc.
  situacao_nome VARCHAR(100),

  data_emissao TIMESTAMPTZ,
  data_operacao TIMESTAMPTZ,

  bling_contato_id BIGINT,
  contato_nome VARCHAR(255),
  contato_documento VARCHAR(20),

  valor_produtos DECIMAL(10,2),
  valor_frete DECIMAL(10,2),
  valor_icms DECIMAL(10,2),
  valor_ipi DECIMAL(10,2),
  valor_total DECIMAL(10,2),

  xml_url TEXT,
  danfe_url TEXT,

  bling_pedido_id BIGINT,
  bling_venda_id INTEGER REFERENCES bling_vendas(id) ON DELETE SET NULL,

  raw_data JSONB,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.5 `bling_sync_log` - Log de Sincronização
```sql
CREATE TABLE bling_sync_log (
  id SERIAL PRIMARY KEY,
  tipo VARCHAR(20) NOT NULL,               -- webhook | polling | manual
  recurso VARCHAR(50) NOT NULL,            -- pedido_venda | nfe
  bling_id BIGINT,
  acao VARCHAR(20),                        -- created | updated | deleted
  status VARCHAR(20) NOT NULL,             -- success | error
  erro_mensagem TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Índices
```sql
CREATE INDEX idx_bling_vendas_bling_id ON bling_vendas(bling_id);
CREATE INDEX idx_bling_vendas_data ON bling_vendas(data_pedido);
CREATE INDEX idx_bling_vendas_canal ON bling_vendas(canal_venda);
CREATE INDEX idx_bling_vendas_situacao ON bling_vendas(situacao_id);
CREATE INDEX idx_bling_vitens_venda ON bling_vendas_itens(bling_venda_id);
CREATE INDEX idx_bling_nfe_bling_id ON bling_nfe(bling_id);
CREATE INDEX idx_bling_nfe_chave ON bling_nfe(chave_acesso);
CREATE INDEX idx_bling_nfe_situacao ON bling_nfe(situacao);
CREATE INDEX idx_bling_nfe_data ON bling_nfe(data_emissao);
CREATE INDEX idx_bling_sync_log_tipo ON bling_sync_log(tipo, created_at);
```

---

## 4. Arquivos a Criar

### 4.1 Backend - Biblioteca Bling (`lib/bling/`)

| Arquivo | Responsabilidade |
|---------|-----------------|
| `lib/bling/bling-auth.ts` | Gerenciamento de tokens OAuth (obter, renovar, revogar) |
| `lib/bling/bling-client.ts` | Cliente HTTP Axios para a API v3 do Bling |
| `lib/bling/bling-sync.ts` | Transformação de dados + upsert nas tabelas Bling |

**`bling-auth.ts`** deve:
- `getValidToken()` - Busca token da `bling_config`, faz refresh se expirado
- `refreshAccessToken()` - POST para Bling com `grant_type=refresh_token`
- `revokeToken()` - POST para endpoint de revogação

**`bling-client.ts`** deve:
- Base URL: `https://api.bling.com.br/Api/v3`
- Header: `Authorization: Bearer {access_token}`
- Auto-refresh de token expirado via interceptor
- Métodos: `getPedidosVenda()`, `getPedidoVenda(id)`, `getNfe()`, `getNfeById(id)`, `getContatos()`

**`bling-sync.ts`** deve:
- `syncPedidoVenda(data)` - Transforma payload Bling → insere/atualiza `bling_vendas` + `bling_vendas_itens`
- `syncNfe(data)` - Transforma payload Bling → insere/atualiza `bling_nfe`
- `fullSync(tipo, dataInicial, dataFinal)` - Importação em massa com paginação

### 4.2 API Routes (`pages/api/bling/`)

| Arquivo | Método | Descrição |
|---------|--------|-----------|
| `pages/api/bling/authorize.ts` | GET | Redireciona para OAuth do Bling |
| `pages/api/bling/callback.ts` | GET | Recebe code, troca por token, salva |
| `pages/api/bling/webhook.ts` | POST | Recebe webhooks do Bling (valida HMAC) |
| `pages/api/bling/sync.ts` | POST | Trigger de polling/importação manual |
| `pages/api/bling/status.ts` | GET | Status da integração |
| `pages/api/bling/vendas/index.ts` | GET | Lista vendas Bling com filtros |
| `pages/api/bling/vendas/[id].ts` | GET | Detalhe de uma venda Bling |
| `pages/api/bling/nfe/index.ts` | GET | Lista NFe Bling com filtros |
| `pages/api/bling/nfe/[id].ts` | GET | Detalhe de uma NFe Bling |

### 4.3 Frontend - Páginas

| Arquivo | Descrição |
|---------|-----------|
| `pages/integracoes/bling.tsx` | Configuração: conectar/desconectar, status, sync manual, importação |
| `pages/bling/vendas.tsx` | Tabela de vendas do Bling com filtros por canal, data, status |
| `pages/bling/nfe.tsx` | Tabela de NFe do Bling com filtros por situação, data |

### 4.4 Types (`types/index.ts`)

Adicionar interfaces: `BlingVenda`, `BlingVendaItem`, `BlingNfe`, `BlingStatus`

---

## 5. Arquivos Existentes a Modificar

| Arquivo | O que modificar |
|---------|----------------|
| `types/index.ts` | Adicionar tipos da integração Bling |
| `services/api.ts` | Adicionar `blingService` com métodos para os novos endpoints |
| `components/layout/sidebar.tsx` | Adicionar grupo de menu "Integrações" com sub-itens Bling |
| `middleware.ts` | Excluir `/api/bling/webhook` da proteção de auth (é endpoint público) |

---

## 6. Ordem de Implementação

### Fase 1: Infraestrutura (Foundation)
1. [ ] Executar migração SQL no Supabase (criar todas as tabelas)
2. [ ] Configurar variáveis de ambiente no Doppler
3. [ ] Implementar `lib/bling/bling-auth.ts`
4. [ ] Implementar `lib/bling/bling-client.ts`

### Fase 2: OAuth + Sync Core
5. [ ] Implementar `pages/api/bling/authorize.ts`
6. [ ] Implementar `pages/api/bling/callback.ts`
7. [ ] Implementar `lib/bling/bling-sync.ts`
8. [ ] Implementar `pages/api/bling/webhook.ts`
9. [ ] Atualizar `middleware.ts` (excluir webhook de auth)

### Fase 3: Endpoints + Polling
10. [ ] Implementar `pages/api/bling/sync.ts`
11. [ ] Implementar `pages/api/bling/status.ts`
12. [ ] Implementar `pages/api/bling/vendas/index.ts` e `[id].ts`
13. [ ] Implementar `pages/api/bling/nfe/index.ts` e `[id].ts`

### Fase 4: Frontend
14. [ ] Adicionar tipos em `types/index.ts`
15. [ ] Adicionar `blingService` em `services/api.ts`
16. [ ] Criar `pages/integracoes/bling.tsx`
17. [ ] Criar `pages/bling/vendas.tsx`
18. [ ] Criar `pages/bling/nfe.tsx`
19. [ ] Atualizar sidebar com menu Bling

### Fase 5: Testes e Go-Live
20. [ ] Testar fluxo OAuth completo
21. [ ] Testar webhook com payload simulado
22. [ ] Importar histórico do cliente
23. [ ] Validar dados importados vs Bling
24. [ ] Monitorar sync em produção

---

## 7. Verificação e Testes

| Teste | Como validar |
|-------|-------------|
| OAuth Flow | Acessar config → "Conectar" → autorizar no Bling → token na `bling_config` |
| Webhook | Simular POST com HMAC → verificar inserção em `bling_vendas` |
| Polling | `POST /api/bling/sync` → verificar importação com paginação |
| Importação | Definir período → importar → comparar contagem com Bling |
| Frontend | Navegar páginas → filtros → dados corretos |
| E2E | Criar venda no Bling → verificar no MeguisPet via webhook |

---

## 8. Considerações Futuras

- **View unificada**: Criar SQL View que combina `vendas` + `bling_vendas` para relatórios consolidados
- **Mapeamento de produtos**: Vincular `bling_vendas_itens.produto_local_id` com produtos do MeguisPet
- **Mapeamento de clientes**: Vincular contatos Bling com `clientes_fornecedores` do MeguisPet
- **Dashboard unificado**: Métricas que incluem vendas de ambas as fontes
- **Vercel Cron**: Automatizar polling a cada 15-30 minutos como fallback
