# Bling ERP - Documentacao Completa da Integracao

> Documento de referencia para a integracao MeguisPet + Bling ERP v3.
> Atualizado em: 2026-02-10

---

## 1. Visao Geral

A integracao com o Bling ERP permite sincronizar **pedidos de venda** e **notas fiscais** do Bling para o banco de dados local (Supabase). Os dados sao consultados localmente pelo frontend, sem chamadas diretas a API do Bling em tempo de leitura.

### Arquitetura em 3 Camadas

```
CAMADA 1: WEBHOOK (tempo real)
  Bling evento --> POST /api/bling/webhook --> valida HMAC --> busca detalhe --> upsert DB

CAMADA 2: POLLING INCREMENTAL (catch-up)
  Botao "Atualizar" ou sync manual --> busca alterados desde last_sync --> upsert DB

CAMADA 3: FRONTEND (leitura rapida)
  Pagina le direto do Supabase (bling_vendas, bling_nfe) --> sem chamada API Bling
```

### Fluxo de Dados

```
Bling API v3 --> bling-client.ts (HTTP + rate limit + retry)
                      |
                      v
               bling-sync.ts (mapeia dados --> upsert Supabase)
                      |
                      v
               Supabase (bling_vendas, bling_nfe, itens)
                      |
                      v
               API Routes (vendas.ts, nfe.ts) --> consulta local com filtros
                      |
                      v
               Frontend (blingService.ts --> bling.tsx)
```

---

## 2. Arquivos do Projeto

### Backend - Lib (`lib/bling/`)

| Arquivo | Descricao |
|---------|-----------|
| `bling-auth.ts` | OAuth token management (exchange, refresh, save, getValidToken, disconnect) |
| `bling-client.ts` | HTTP client com rate limiting (3 req/s, 334ms delay), retry automatico, endpoints tipados |
| `bling-sync.ts` | Logica de sync: mapeia Bling -> DB, marketplace detection, incremental/historical sync |

### Backend - API Routes (`pages/api/bling/`)

| Rota | Metodo | Auth | Descricao |
|------|--------|------|-----------|
| `/api/bling/authorize` | GET | Sim | Inicia fluxo OAuth, redireciona para Bling |
| `/api/bling/callback` | GET | Nao* | Recebe callback OAuth com `code`, troca por tokens |
| `/api/bling/status` | GET | Sim | Retorna status da conexao, token, contadores |
| `/api/bling/sync` | POST | Sim (admin/gerente) | Sync manual: incremental ou historico com datas |
| `/api/bling/vendas` | GET | Sim | Consulta local bling_vendas com filtros e paginacao |
| `/api/bling/nfe` | GET | Sim | Consulta local bling_nfe com filtros e paginacao |
| `/api/bling/webhook` | POST | HMAC | Recebe webhooks do Bling (publico, validacao HMAC) |
| `/api/bling/disconnect` | POST | Sim (admin/gerente) | Desativa conexao, remove tokens |

*O callback redireciona de volta para `/integracoes/bling` apos salvar tokens.

### Frontend

| Arquivo | Descricao |
|---------|-----------|
| `services/blingService.ts` | Service layer (axios) com metodos: getStatus, getVendas, getNfe, sync |
| `pages/integracoes/bling.tsx` | Pagina principal com 3 abas (Vendas, NFe, Config) + modais de detalhe |

### Database Migrations

| Arquivo | Status | Descricao |
|---------|--------|-----------|
| `024_bling_integration.sql` | Executada | Tabelas principais: bling_config, bling_vendas, bling_vendas_itens, bling_nfe, bling_sync_log + RLS |
| `025_bling_extras.sql` | Pendente | Colunas extras (observacoes, intermediador, etc.) + bling_nfe_itens |

---

## 3. Banco de Dados (Supabase/PostgreSQL)

### Tabela: `bling_config`

Armazena tokens OAuth e timestamps de sync. Apenas 1 registro ativo por vez.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | SERIAL PK | ID local |
| access_token | TEXT | Token de acesso (valido 6h) |
| refresh_token | TEXT | Token de refresh (valido 30 dias) |
| token_expires_at | TIMESTAMPTZ | Expiracao do access_token |
| is_active | BOOLEAN | Se a integracao esta ativa |
| last_sync_vendas | TIMESTAMPTZ | Timestamp da ultima sync de vendas |
| last_sync_nfe | TIMESTAMPTZ | Timestamp da ultima sync de NFe |

### Tabela: `bling_vendas`

Pedidos de venda importados do Bling. Chave unica: `bling_id`.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | SERIAL PK | ID local |
| bling_id | BIGINT UNIQUE | ID no Bling |
| numero_pedido | VARCHAR(50) | Numero do pedido |
| numero_pedido_loja | VARCHAR(100) | Numero no marketplace (ex: 260210B42XE0F4) |
| data_pedido | TIMESTAMPTZ | Data do pedido |
| data_saida | TIMESTAMPTZ | Data de saida |
| contato_nome | VARCHAR(255) | Nome do cliente |
| contato_documento | VARCHAR(20) | CPF/CNPJ do cliente |
| canal_venda | VARCHAR(100) | Canal detectado (Amazon, Shopee, etc.) |
| loja_nome | VARCHAR(255) | Nome da loja/marketplace |
| total_produtos | DECIMAL | Valor total dos produtos |
| total_desconto | DECIMAL | Total de desconto |
| total_frete | DECIMAL | Total de frete |
| valor_total | DECIMAL | Valor total do pedido |
| forma_pagamento | VARCHAR(100) | Forma de pagamento |
| situacao_id | INTEGER | ID da situacao no Bling |
| situacao_nome | VARCHAR(100) | Nome da situacao (Em aberto, Atendido, etc.) |
| vendedor_nome | VARCHAR(255) | Nome do vendedor |
| observacoes | TEXT | Observacoes do pedido (migration 025) |
| observacoes_internas | TEXT | Observacoes internas (migration 025) |
| intermediador_cnpj | VARCHAR(20) | CNPJ do marketplace intermediador (migration 025) |
| intermediador_usuario | VARCHAR(255) | Usuario no marketplace (migration 025) |
| taxa_comissao | DECIMAL | Taxa de comissao do marketplace (migration 025) |
| custo_frete_marketplace | DECIMAL | Custo de frete cobrado pelo marketplace (migration 025) |
| endereco_entrega | JSONB | Endereco de entrega completo |
| transporte | JSONB | Dados de transporte |
| raw_data | JSONB | JSON completo retornado pela API do Bling |
| synced_at | TIMESTAMPTZ | Quando foi sincronizado |

### Tabela: `bling_vendas_itens`

Itens de cada pedido. Relacao: `bling_venda_id` -> `bling_vendas.id` (CASCADE).

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | SERIAL PK | ID local |
| bling_venda_id | INTEGER FK | Referencia ao pedido |
| bling_produto_id | BIGINT | ID do produto no Bling |
| codigo_produto | VARCHAR(100) | Codigo/SKU |
| descricao | VARCHAR(500) | Descricao do produto |
| quantidade | DECIMAL(10,4) | Quantidade |
| valor_unitario | DECIMAL(10,4) | Preco unitario |
| valor_desconto | DECIMAL(10,2) | Desconto do item |
| valor_total | DECIMAL(10,2) | Total do item |

### Tabela: `bling_nfe`

Notas fiscais importadas. Chave unica: `bling_id`.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | SERIAL PK | ID local |
| bling_id | BIGINT UNIQUE | ID no Bling |
| numero | INTEGER | Numero da NFe |
| serie | INTEGER | Serie |
| chave_acesso | VARCHAR(44) | Chave de acesso da NFe |
| tipo | INTEGER | 0=Entrada, 1=Saida |
| situacao | INTEGER | 1=Pendente, 2=Emitida, 3=Cancelada, etc. |
| data_emissao | TIMESTAMPTZ | Data de emissao |
| contato_nome | VARCHAR(255) | Nome do cliente |
| valor_total | DECIMAL | Valor total da nota |
| xml_url | TEXT | URL do XML |
| danfe_url | TEXT | URL do DANFE |
| pdf_url | TEXT | URL do PDF (migration 025) |
| finalidade | INTEGER | 1=Normal, 2=Complementar, 3=Ajuste, 4=Devolucao (migration 025) |
| raw_data | JSONB | JSON completo da API |

### Tabela: `bling_nfe_itens` (migration 025)

Itens da NFe. Relacao: `bling_nfe_id` -> `bling_nfe.id` (CASCADE).

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| codigo | VARCHAR(100) | Codigo do produto |
| descricao | VARCHAR(500) | Descricao |
| unidade | VARCHAR(10) | Unidade (UN, KG, etc.) |
| quantidade | DECIMAL | Quantidade |
| valor_unitario | DECIMAL | Preco unitario |
| valor_total | DECIMAL | Total |
| ncm | VARCHAR(20) | NCM do produto |
| cfop | VARCHAR(10) | CFOP |
| impostos | JSONB | Impostos detalhados |

### Tabela: `bling_sync_log`

Log de todas as sincronizacoes (webhook, polling, manual).

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| tipo | VARCHAR(20) | webhook, polling, manual |
| recurso | VARCHAR(50) | pedido_venda, nfe |
| bling_id | BIGINT | ID do recurso no Bling |
| acao | VARCHAR(20) | created, updated, deleted |
| status | VARCHAR(20) | success, error |
| erro_mensagem | TEXT | Mensagem de erro (se houver) |
| payload | JSONB | Dados extras para debug |

### RLS (Row Level Security)

- **bling_config**: Apenas `admin` pode ler/escrever
- **bling_vendas, bling_nfe, itens**: Qualquer usuario autenticado pode LER; apenas `admin/gerente` pode ESCREVER
- **bling_sync_log**: Mesma politica de vendas

**Importante**: O sync roda server-side com `getSupabaseServiceRole()` que bypassa RLS.

---

## 4. API do Bling v3

### Credenciais

Armazenadas no **Doppler** (dev e prd):

| Variavel | Descricao |
|----------|-----------|
| `BLING_CLIENT_ID` | Client ID do app OAuth |
| `BLING_CLIENT_SECRET` | Client Secret (usado tambem para validar HMAC dos webhooks) |

### Rate Limits

- **3 requests/segundo** (delay de 334ms entre requests)
- **120.000 requests/dia**
- HTTP 429 quando excedido
- 300 erros em 10s = IP bloqueado 10 min

O `bling-client.ts` implementa:
- Queue com delay de 334ms (`enforceRateLimit()`)
- Retry automatico em 429, 503, erros de rede (via `withRetry`)
- Max 3 tentativas com backoff exponencial (1s, 2s, 4s)

### Tokens OAuth

- **Access Token**: valido 6 horas
- **Refresh Token**: valido 30 dias
- Auto-refresh com buffer de 5 minutos antes da expiracao
- URL do token: `https://www.bling.com.br/Api/v3/oauth/token`

### Endpoints Utilizados

| Endpoint | Descricao |
|----------|-----------|
| `GET /pedidos/vendas` | Lista pedidos com filtros (data, paginacao) |
| `GET /pedidos/vendas/{id}` | Detalhe completo de 1 pedido |
| `GET /nfe` | Lista notas fiscais |
| `GET /nfe/{id}` | Detalhe completo de 1 NFe |
| `GET /situacoes/modulos?idModuloSistema=98310` | Nomes das situacoes de venda |
| `GET /contatos` | Lista contatos (usado para testar conexao) |

### Estrutura de Resposta do Bling

```json
// Listagem
{ "data": [ { "id": 123, "numero": 420, ... } ] }

// Detalhe
{ "data": { "id": 123, "numero": 420, "contato": { ... }, "itens": [ ... ] } }
```

### Dados Importantes da API

**Pedido de Venda (detalhe)**:
- `situacao: { id: 6, valor: 0 }` - apenas IDs numericos, sem nome
- `itens[]: { id, codigo, descricao, unidade, quantidade, valor, desconto }`
- `intermediador: { cnpj, nomeUsuario }` - dados do marketplace
- `transporte: { fretePorConta, contato: { nome, endereco, cep, ... } }`
- `parcelas[]: { formaPagamento: { id, descricao } }`
- `numeroLoja` - numero no marketplace (padrao indica a origem)

**Situacoes de Venda (IDs conhecidos)**:

| ID | Nome |
|----|------|
| 6 | Em aberto |
| 9 | Atendido |
| 12 | Cancelado |
| 15 | Em andamento |
| 18 | Verificado |
| 21 | Venda agenciada |
| 24 | Em digitacao |

---

## 5. Deteccao de Marketplace

O sistema detecta automaticamente a origem do pedido (Amazon, Shopee, Mercado Livre, etc.) usando 3 estrategias, tanto no backend (`bling-sync.ts`) quanto no frontend (fallback para dados antigos):

### Estrategia 1: CNPJ do Intermediador (mais confiavel)

```
35635824000112 --> Shopee
03007331000181 --> Amazon
10573521000191 --> Mercado Livre
09339936000116 --> Magazine Luiza
```

### Estrategia 2: Padrao do `numero_pedido_loja` (regex)

```
/^\d{3}-\d{7}-\d{7}$/  --> Amazon (ex: 701-9929051-5347409)
/^26\d{4}[A-Z0-9]+$/i  --> Shopee (ex: 260210B42XE0F4)
/^\d{10,}$/             --> Mercado Livre
```

### Estrategia 3: Texto do `intermediador.nomeUsuario`

Busca por substrings: "amazon", "shopee", "mercado", "magalu", "magazine".

O frontend em `bling.tsx` tem a funcao `detectMarketplaceFrontend()` que replica essa logica para dados que foram sincronizados antes da implementacao da deteccao no backend.

---

## 6. Webhook

### Configuracao

- **URL**: `https://gestao.meguispet.com/api/bling/webhook`
- **Metodo**: POST
- **Autenticacao**: HMAC-SHA256 via header `X-Bling-Signature-256`
- **Secret**: Usa `BLING_CLIENT_SECRET`
- **Timeout**: Bling espera resposta em ate 5 segundos

### Funcionamento

1. Recebe POST com raw body
2. Valida HMAC-SHA256 (`sha256=<hex>`)
3. Responde HTTP 200 imediatamente
4. Processa async (fire-and-forget):
   - Parse event type (`pedido_venda.created`, `nfe.updated`, etc.)
   - Fetch dados completos via GET (webhook so envia ID)
   - Upsert no banco via `syncPedidoVenda()` ou `syncNfe()`
   - Log em `bling_sync_log`

### Eventos Suportados

| Evento | Acao |
|--------|------|
| `pedido_venda.*` | Busca detalhe + syncPedidoVenda() |
| `pedidos_vendas.*` | Idem (variacao do nome) |
| `nfe.*` | Busca detalhe + syncNfe() |
| `nota_fiscal.*` | Idem (variacao do nome) |
| Outros | Logado em bling_sync_log como unhandled |

### Importante

- O body parser do Next.js esta desabilitado (`export const config = { api: { bodyParser: false } }`)
- O endpoint NAO usa `withSupabaseAuth` (e publico, so validado por HMAC)
- Usa `getSupabaseServiceRole()` para escrita no banco

---

## 7. Sync Manual

### Endpoint: `POST /api/bling/sync`

**Permissao**: admin ou gerente

**Body**:
```json
{
  "tipo": "vendas" | "nfe" | "all",
  "dataInicial": "2026-01-01",    // opcional
  "dataFinal": "2026-02-10"       // opcional
}
```

### Modos

- **Sem datas (incremental)**: Busca alteracoes desde `last_sync_vendas/nfe` da `bling_config`
- **Com datas (historico)**: Importa todos os pedidos no range de datas

### Fluxo Incremental

1. Le `last_sync_vendas` da `bling_config`
2. Busca pedidos com `dataAlteracaoInicial = last_sync` e `dataAlteracaoFinal = agora`
3. Para cada pedido na listagem: busca detalhe completo → `syncPedidoVenda()`
4. Atualiza `last_sync_vendas` na `bling_config`

### Fluxo Historico

1. Busca pedidos com `dataInicial` e `dataFinal`
2. Paginacao automatica (100 por pagina)
3. Para cada pedido: busca detalhe → sync
4. NAO atualiza `last_sync` (e uma importacao pontual)

---

## 8. Frontend (Pagina Bling)

### Rota: `/integracoes/bling`

**Permissao no sidebar**: `configuracoes`

### Abas

#### Aba Vendas
- **Cards**: Total vendas, Valor total, Ultima sync, Canais
- **Busca**: Por cliente, numero pedido, documento
- **Tabela simplificada**: Pedido, Origem, Data, Cliente, Situacao, Produtos, Total
- **Click na linha**: Abre modal com TODOS os detalhes (estilo Bling)

#### Aba NFe
- **Cards**: Total NFe, Valor total, Ultima sync, Emitidas
- **Busca**: Por cliente, chave de acesso, documento
- **Tabela simplificada**: Numero, Emissao, Cliente, Tipo, Situacao, Itens, Total
- **Click na linha**: Abre modal com detalhes completos + links DANFE/XML/PDF

#### Aba Configuracao
- **Status**: Conexao, Token (validade), API acessivel
- **Contadores**: Total vendas/NFe sincronizadas com timestamps
- **Sync incremental**: Botao "Sincronizar Agora"
- **Importacao historica**: Seletor de tipo + date range + botao "Importar"
- **Desconectar**: Remove tokens (dados sincronizados sao mantidos)

### Modal de Detalhe (Venda)

Secoes organizadas como no Bling:

1. **Dados do cliente** - Cliente, Documento, Vendedor, Loja
2. **Itens do pedido** - Tabela: Descricao, Codigo, Qtd, Preco un., Desc., Total
3. **Totais** - N itens, Qtd total, Total itens, Desconto, Frete, Outras despesas, Comissao, **Total da venda**
4. **Detalhes da venda** - Numero, Datas, N loja virtual, Origem, Tipo integracao, ID Bling
5. **Pagamento** - Forma, Custo frete marketplace
6. **Transportador** - Frete por conta, Volumes, Peso bruto, Frete
7. **Endereco de entrega** - Nome, CEP, UF, Cidade, Bairro, Endereco, Numero, Complemento
8. **Dados adicionais** - Observacoes, Observacoes internas
9. **Intermediador** - CNPJ, Usuario, Marketplace

### Service Layer (`blingService.ts`)

```typescript
blingService.getStatus()                    // GET /api/bling/status
blingService.getVendas({ page, search })    // GET /api/bling/vendas
blingService.getNfe({ page, search })       // GET /api/bling/nfe
blingService.sync({ tipo, dataInicial })    // POST /api/bling/sync
```

Timeout de 120s (sync pode demorar). Auto-injeta token Supabase via interceptor.

---

## 9. Tipos TypeScript

Definidos em `types/index.ts`:

```typescript
BlingVenda         // Pedido de venda com todos os campos
BlingVendaItem     // Item do pedido (descricao, qtd, valores)
BlingNfe           // Nota fiscal com todos os campos
BlingNfeItem       // Item da NFe (descricao, NCM, CFOP, impostos)
BlingStatus        // Status da conexao + contadores
BlingSyncResult    // Resultado de sync (vendas_synced, nfe_synced, errors)
```

---

## 10. Consultas Supabase (API Routes)

### Vendas (`/api/bling/vendas`)

```sql
SELECT *, itens:bling_vendas_itens(*)
FROM bling_vendas
WHERE ...filtros...
ORDER BY data_pedido DESC
LIMIT 50 OFFSET ...
```

**Filtros**: `canal_venda` (ilike), `situacao_id` (eq), `data_inicio/fim` (gte/lte), `search` (or: contato_nome, numero_pedido, numero_pedido_loja, contato_documento)

### NFe (`/api/bling/nfe`)

```sql
SELECT *, itens:bling_nfe_itens(*)
FROM bling_nfe
WHERE ...filtros...
ORDER BY data_emissao DESC
LIMIT 50 OFFSET ...
```

**Filtros**: `situacao` (eq), `tipo` (eq), `data_inicio/fim` (gte/lte), `search` (or: contato_nome, chave_acesso, contato_documento)

**Nota**: O alias `itens:bling_vendas_itens(*)` e `itens:bling_nfe_itens(*)` renomeia a chave no resultado para `itens`, facilitando o uso no frontend.

---

## 11. Tratamento de Itens no Sync

### Vendas

Os itens sao gerenciados com **delete + insert** (nao upsert) porque o Bling nao garante IDs estaveis para itens:

```typescript
// 1. Delete itens existentes
await supabase.from("bling_vendas_itens").delete().eq("bling_venda_id", localId)

// 2. Insert novos itens
await supabase.from("bling_vendas_itens").insert(itensRows)
```

### NFe

Mesmo padrao de delete + insert para `bling_nfe_itens`.

---

## 12. Componente DataTable - onRowClick

O componente `DataTable` (`components/ui/data-table.tsx`) aceita a prop opcional `onRowClick`:

```typescript
interface DataTableProps<TData, TValue> {
  // ...existing props
  onRowClick?: (row: TData) => void
}
```

Quando definida, as linhas ganham `cursor-pointer` e hover highlight. O click dispara o callback com os dados da linha original.

---

## 13. Checklist para Futuras Alteracoes

### Adicionar novo campo do Bling

1. Adicionar coluna no SQL (ALTER TABLE ou nova migration)
2. Executar migration no Supabase SQL Editor
3. Adicionar campo no tipo TypeScript (`types/index.ts`)
4. Mapear no `bling-sync.ts` (funcao `syncPedidoVenda` ou `syncNfe`)
5. Exibir no modal de detalhe (`bling.tsx` - componente `VendaDetailDialog` ou `NfeDetailDialog`)

### Adicionar novo marketplace

1. Adicionar CNPJ no `MARKETPLACE_BY_CNPJ` em `bling-sync.ts` (backend)
2. Adicionar CNPJ no `MARKETPLACE_BY_CNPJ` em `bling.tsx` (frontend fallback)
3. Adicionar cor no `MARKETPLACE_STYLES` em `bling.tsx`
4. Adicionar regex no `detectMarketplace()` se tiver padrao de `numero_pedido_loja`

### Adicionar novo recurso do Bling (ex: Compras)

1. Criar endpoint no `bling-client.ts` (GET/list, GET/detail)
2. Criar funcao de sync no `bling-sync.ts` (mapear + upsert)
3. Criar migration com tabela + itens + indices + RLS
4. Executar migration no Supabase
5. Criar API route em `pages/api/bling/` (consulta local)
6. Adicionar tipo em `types/index.ts`
7. Adicionar metodo no `blingService.ts`
8. Adicionar aba/secao na pagina `bling.tsx`
9. Registrar webhook para o novo recurso no painel Bling

### Re-sincronizar dados

Na aba Configuracao da pagina Bling:
1. Selecionar tipo (Vendas, NFe, ou Tudo)
2. Definir data inicial e final
3. Clicar "Importar"

Isso re-busca e atualiza (upsert) todos os pedidos no range.

---

## 14. Variaveis de Ambiente

| Variavel | Obrigatoria | Onde | Descricao |
|----------|-------------|------|-----------|
| `BLING_CLIENT_ID` | Sim | Doppler | Client ID do app OAuth |
| `BLING_CLIENT_SECRET` | Sim | Doppler | Client Secret (OAuth + HMAC webhook) |
| `NEXT_PUBLIC_SUPABASE_URL` | Sim | Doppler/Vercel | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sim | Doppler/Vercel | Chave anonima do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim | Doppler/Vercel | Chave service role (bypassa RLS) |

---

## 15. Troubleshooting

| Problema | Causa | Solucao |
|----------|-------|---------|
| "Bling integration not configured" | Nenhum registro ativo em bling_config | Reconectar via OAuth (/integracoes/bling) |
| Origem mostra "Venda direta" | Dados antigos sem marketplace detectado | Re-sincronizar o periodo ou aguardar re-sync |
| Situacao mostra "ID 6" | Dados sem nome de situacao | Re-sincronizar (backend agora busca nomes via API) |
| Items count mostra 0 | Alias Supabase incorreto | Verificar `.select("*, itens:bling_vendas_itens(*)")` |
| 429 Rate Limit | Muitas requests rapidas | Rate limiter automatico; aguardar retry |
| Token expirado | Access token vence a cada 6h | Auto-refresh; se refresh token venceu (30d), reconectar OAuth |
| Webhook nao chega | URL nao configurada no Bling | Configurar webhook no painel do Bling apontando para a URL de producao |
| HMAC validation failed | Secret errado ou body modificado | Verificar BLING_CLIENT_SECRET; bodyParser deve estar desabilitado |
