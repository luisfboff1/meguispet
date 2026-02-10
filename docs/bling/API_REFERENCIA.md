# Bling ERP - Referência da API v3

> Documentação de referência para integração com a API do Bling ERP.
> Baseada na pesquisa realizada em Fevereiro/2026.

---

## 1. Visão Geral

O **Bling** é um ERP voltado para e-commerce e marketplace que oferece uma API REST v3 com autenticação OAuth 2.0. A API permite acessar pedidos de venda, notas fiscais, contatos, produtos, estoque e muito mais.

| Item | Detalhe |
|------|---------|
| **Base URL da API** | `https://api.bling.com.br/Api/v3` |
| **Versão** | v3 (atual: v310) |
| **Protocolo** | REST (JSON via HTTP) |
| **Autenticação** | OAuth 2.0 (Authorization Code) |
| **Métodos HTTP** | GET, POST, PUT, PATCH, DELETE |
| **Portal do Desenvolvedor** | https://developer.bling.com.br |
| **Referência de Endpoints** | https://developer.bling.com.br/referencia |

---

## 2. Autenticação OAuth 2.0

O Bling usa o fluxo **Authorization Code** do OAuth 2.0.

### 2.1 Passo a Passo

```
┌─────────────┐     1. Redireciona      ┌─────────────────┐
│  MeguisPet  │ ──────────────────────►  │  Bling Auth     │
│  (Frontend) │                          │  (Authorize)    │
└─────────────┘                          └────────┬────────┘
                                                  │
                                         2. Usuário autoriza
                                                  │
┌─────────────┐     3. Callback c/ code  ┌────────▼────────┐
│  MeguisPet  │ ◄────────────────────── │  Bling Auth     │
│  (Callback) │                          │  (Redirect)     │
└──────┬──────┘                          └─────────────────┘
       │
       │ 4. POST /token (troca code por tokens)
       ▼
┌─────────────┐                          ┌─────────────────┐
│  MeguisPet  │ ──────────────────────►  │  Bling Token    │
│  (Backend)  │ ◄──────────────────────  │  (Endpoint)     │
└─────────────┘  5. access_token +       └─────────────────┘
                    refresh_token
```

### 2.2 URLs OAuth

| Endpoint | URL |
|----------|-----|
| **Authorize** | `https://www.bling.com.br/Api/v3/oauth/authorize` |
| **Token** | `https://www.bling.com.br/Api/v3/oauth/token` |
| **Revoke** | `https://www.bling.com.br/Api/v3/oauth/revoke` |

### 2.3 Passo 1: Redirecionar para Autorização

Redirecionar o usuário para:

```
https://www.bling.com.br/Api/v3/oauth/authorize?
  response_type=code&
  client_id={CLIENT_ID}&
  state={RANDOM_STATE}
```

| Parâmetro | Descrição |
|-----------|-----------|
| `response_type` | Sempre `code` |
| `client_id` | ID do app registrado no Bling |
| `state` | Valor aleatório para proteção CSRF (obrigatório, não pode ser vazio) |

O usuário faz login no Bling e autoriza o app. O Bling redireciona para a **Callback URL** configurada no app com o parâmetro `code`.

### 2.4 Passo 2: Trocar Code por Token

**IMPORTANTE:** O `code` expira em **1 minuto**. Deve ser trocado imediatamente.

```http
POST https://www.bling.com.br/Api/v3/oauth/token
Content-Type: application/x-www-form-urlencoded
Authorization: Basic {base64(client_id:client_secret)}

grant_type=authorization_code&code={CODE}
```

**Resposta (JSON):**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 21600,
  "refresh_token": "def50200a3b3c4..."
}
```

| Campo | Descrição |
|-------|-----------|
| `access_token` | Token para acessar a API (**duração: 6 horas** / 21600 segundos) |
| `token_type` | Sempre `Bearer` |
| `expires_in` | Tempo de expiração em segundos (21600 = 6h) |
| `refresh_token` | Token para renovar o access_token (**duração: 30 dias**) |

> **Confirmado pelo suporte Bling:** Access token dura 6 horas. Refresh token dura 30 dias. Implementar rotina automática de refresh.

### 2.5 Passo 3: Renovar Token (Refresh)

Quando o `access_token` expirar, usar o `refresh_token`:

```http
POST https://www.bling.com.br/Api/v3/oauth/token
Content-Type: application/x-www-form-urlencoded
Authorization: Basic {base64(client_id:client_secret)}

grant_type=refresh_token&refresh_token={REFRESH_TOKEN}
```

A resposta é idêntica à do passo 2 (novo `access_token` + novo `refresh_token`).

### 2.6 Passo 4: Revogar Token

```http
POST https://www.bling.com.br/Api/v3/oauth/revoke
Content-Type: application/x-www-form-urlencoded
Authorization: Basic {base64(client_id:client_secret)}

token={ACCESS_TOKEN}
```

### 2.7 Usando o Token nas Requisições

Todas as requisições à API devem incluir o header:

```http
Authorization: Bearer {access_token}
Content-Type: application/json
```

---

## 3. Criando um Aplicativo no Bling

### Informações Importantes (confirmadas com suporte Bling)

| Item | Detalhe |
|------|---------|
| **Tipo de App** | **Privado** - opera apenas na conta onde foi criado |
| **Conta necessária** | Usar a conta existente do cliente (MeguisPet) - NÃO precisa de conta de desenvolvedor |
| **Custo** | **ZERO** - a API é pública e gratuita |
| **Homologação** | **NÃO necessária** para app privado (apenas público precisa) |
| **Acesso** | Restrito às pessoas da conta - ninguém externo acessa |

### Visibilidade: Público vs Privado

| Visibilidade | Descrição |
|-------------|-----------|
| **Público** | Aparece na loja do Bling, requer homologação, qualquer cliente pode usar. Limite de 10 usuários enquanto não homologado. |
| **Privado** | Opera apenas na própria conta Bling, sem homologação, acesso restrito. **← Nosso caso** |

### Passo a Passo

1. Acessar https://developer.bling.com.br/aplicativos (logado na conta do cliente MeguisPet)
2. Clicar em **"Criar aplicativo"**
3. Preencher:
   - **Nome do app**: MeguisPet Integration (ou similar)
   - **Visibilidade**: **Privado**
   - **Callback URL**: `https://gestao.meguispet.com/api/bling/callback`
   - **Scopes**: selecionar os escopos necessários (ver seção 3.1)
4. Salvar → anotar `client_id` e `client_secret`
5. Na aba **"Webhooks"**: configurar URL e eventos (ver seção 5)

### 3.1 Scopes Necessários

| Scope | Permite acesso a |
|-------|-----------------|
| `order` | Pedidos de venda (GET/POST/PUT/DELETE) |
| `invoice` | Notas fiscais eletrônicas - NFe |
| `product` | Produtos |
| `stock` | Estoque |
| `contact` | Contatos (clientes/fornecedores) |

> **Nota:** A API v3 só permite acessar dados dos scopes autorizados pelo usuário.

---

## 4. Endpoints da API

> **Base URL:** `https://api.bling.com.br/Api/v3`
> **Teste:** `https://developer.bling.com.br/api/bling`
> **Spec OpenAPI completa:** salva localmente em `docs/bling/openapi-bling.json` (1MB)

### 4.1 Pedidos de Venda

#### Listar Pedidos
```http
GET /pedidos/vendas?pagina=1&limite=100
```

**Parâmetros de filtro:**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `pagina` | integer | Página (default: 1) |
| `limite` | integer | Registros por página (default: 100) |
| `idContato` | integer | ID do contato (cliente) |
| `idsSituacoes[]` | array[int] | Conjunto de IDs de situações |
| `dataInicial` | date | Data início (YYYY-MM-DD) |
| `dataFinal` | date | Data fim (YYYY-MM-DD) |
| `dataAlteracaoInicial` | datetime | Alteração desde (YYYY-MM-DD HH:MM:SS) |
| `dataAlteracaoFinal` | datetime | Alteração até (YYYY-MM-DD HH:MM:SS) |
| `dataPrevistaInicial` | date | Data prevista início |
| `dataPrevistaFinal` | date | Data prevista fim |
| `numero` | integer | Número do pedido de venda |
| `idLoja` | integer | ID da loja/canal |
| `idVendedor` | integer | ID do vendedor |
| `idControleCaixa` | integer | ID do controle de caixa |
| `numerosLojas[]` | array | Números dos pedidos nas lojas |

#### Consultar Pedido (schema completo da resposta)
```http
GET /pedidos/vendas/{idPedidoVenda}
```

**Resposta JSON (`data`):**

```
data.id                          : integer     — ID do pedido no Bling
data.numero                      : integer     — Número do pedido
data.numeroLoja                  : string      — Número do pedido na loja/marketplace
data.data                        : date        — Data do pedido (YYYY-MM-DD)
data.dataSaida                   : date        — Data de saída
data.dataPrevista                : date        — Data prevista de entrega
data.totalProdutos               : float       — Total dos produtos
data.total                       : float       — Valor total do pedido
data.numeroPedidoCompra          : string      — Número da ordem de compra
data.outrasDespesas              : float       — Outras despesas
data.observacoes                 : string      — Observações do pedido
data.observacoesInternas         : string      — Observações internas

data.contato.id                  : integer     — ID do contato
data.contato.nome                : string      — Nome do cliente
data.contato.tipoPessoa          : enum[F,J,E] — F=Física, J=Jurídica, E=Estrangeira
data.contato.numeroDocumento     : string      — CPF ou CNPJ

data.situacao.id                 : integer     — ID da situação
data.situacao.valor              : integer     — Valor numérico da situação

data.loja.id                     : integer     — ID da loja
data.loja.unidadeNegocio.id      : integer     — ID da unidade de negócio

data.desconto.valor              : float       — Valor do desconto
data.desconto.unidade            : enum        — REAL ou PERCENTUAL

data.categoria.id                : integer     — ID da categoria

data.notaFiscal.id               : integer     — ID da NFe vinculada

data.tributacao.totalICMS         : float       — Total ICMS
data.tributacao.totalIPI          : float       — Total IPI

data.vendedor.id                 : integer     — ID do vendedor

data.intermediador.cnpj          : string      — CNPJ do intermediador (marketplace)
data.intermediador.nomeUsuario   : string      — Nome do usuário no marketplace

data.taxas.taxaComissao          : float       — Taxa de comissão (%)
data.taxas.custoFrete            : float       — Custo do frete
data.taxas.valorBase             : float       — Valor base para cálculo de taxas

— ITENS (array) —
data.itens[].id                  : integer     — ID do item
data.itens[].codigo              : string      — SKU/código do produto
data.itens[].unidade             : string      — Unidade (UN, KG, etc.)
data.itens[].quantidade          : float       — Quantidade
data.itens[].desconto            : float       — Desconto percentual
data.itens[].valor               : float       — Valor unitário
data.itens[].aliquotaIPI         : float       — Alíquota IPI
data.itens[].descricao           : string      — Descrição do produto
data.itens[].descricaoDetalhada  : string      — Descrição detalhada
data.itens[].produto             : object      — Referência ao produto
data.itens[].comissao            : object      — Dados de comissão
data.itens[].naturezaOperacao    : object      — CFOP/natureza

— PARCELAS (array) —
data.parcelas[].id               : integer     — ID da parcela
data.parcelas[].dataVencimento   : date        — Data de vencimento
data.parcelas[].valor            : float       — Valor da parcela
data.parcelas[].observacoes      : string      — Observações
data.parcelas[].caut             : string      — Código de autorização (NSU)
data.parcelas[].formaPagamento   : object      — Forma de pagamento

— TRANSPORTE —
data.transporte.fretePorConta    : enum[0-4,9] — 0=CIF, 1=FOB, 2=Terceiros, 3=Próprio/Rem, 4=Próprio/Dest, 9=Sem frete
data.transporte.frete            : float       — Valor do frete
data.transporte.quantidadeVolumes: integer     — Qtd de volumes
data.transporte.pesoBruto        : float       — Peso bruto
data.transporte.prazoEntrega     : integer     — Prazo em dias
data.transporte.contato.id       : integer     — ID do transportador
data.transporte.contato.nome     : string      — Nome do transportador
data.transporte.etiqueta.nome    : string      — Nome na etiqueta
data.transporte.etiqueta.endereco: string      — Endereço
data.transporte.etiqueta.numero  : string      — Número
data.transporte.etiqueta.complemento: string   — Complemento
data.transporte.etiqueta.municipio: string     — Município
data.transporte.etiqueta.uf      : string      — UF
data.transporte.etiqueta.cep     : string      — CEP
data.transporte.etiqueta.bairro  : string      — Bairro
```

#### Outros endpoints de Pedidos de Venda
```http
POST   /pedidos/vendas                                  — Criar pedido
PUT    /pedidos/vendas/{id}                              — Alterar pedido
DELETE /pedidos/vendas/{id}                              — Excluir pedido
PATCH  /pedidos/vendas/{id}/situacoes/{idSituacao}       — Atualizar situação
POST   /pedidos/vendas/{id}/gerar-nfe                    — Gerar NFe do pedido
POST   /pedidos/vendas/{id}/gerar-nfce                   — Gerar NFCe do pedido
POST   /pedidos/vendas/{id}/lancar-contas                — Lançar contas a receber
POST   /pedidos/vendas/{id}/estornar-contas              — Estornar contas
POST   /pedidos/vendas/{id}/lancar-estoque               — Lançar estoque
POST   /pedidos/vendas/{id}/lancar-estoque/{idDeposito}  — Lançar estoque (depósito específico)
POST   /pedidos/vendas/{id}/estornar-estoque             — Estornar estoque
```

---

### 4.2 Notas Fiscais Eletrônicas (NFe)

#### Listar NFe
```http
GET /nfe?pagina=1&limite=100
```

**Parâmetros de filtro:**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `pagina` | integer | Página (default: 1) |
| `limite` | integer | Registros por página (default: 100) |
| `situacao` | integer | Status da NFe (ver tabela abaixo) |
| `tipo` | string | `0` Entrada, `1` Saída |
| `dataEmissaoInicial` | datetime | Emissão desde (YYYY-MM-DD HH:MM:SS) |
| `dataEmissaoFinal` | datetime | Emissão até (YYYY-MM-DD HH:MM:SS) |
| `numeroLoja` | string | Número do pedido na loja |
| `idTransportador` | integer | ID do contato do transportador |
| `chaveAcesso` | integer | Chave de acesso da NFe |
| `numero` | integer | Número da nota fiscal |
| `serie` | integer | Série da nota fiscal |

> **Obs:** Se `situacao` não for informado, notas canceladas NÃO são incluídas.

#### Situações da NFe

| Código | Descrição |
|--------|-----------|
| 1 | Pendente |
| 2 | Cancelada |
| 3 | Aguardando Recibo |
| 4 | Rejeitada |
| **5** | **Autorizada** |
| 6 | DANFE Emitida |
| 7 | Registrada |
| 8 | Aguardando Protocolo |
| 9 | Denegada |
| 10 | Consulta Situação |
| 11 | Bloqueada |

#### Consultar NFe (schema completo da resposta)
```http
GET /nfe/{idNotaFiscal}
```

**Resposta JSON (`data`):**

```
data.id                          : integer     — ID da NFe no Bling
data.tipo                        : enum[0,1]   — 0=Entrada, 1=Saída
data.situacao                    : enum[1-11]  — Status (ver tabela acima)
data.numero                      : string      — Número da nota
data.serie                       : integer     — Série
data.dataEmissao                 : datetime    — Data e hora da emissão
data.dataOperacao                : datetime    — Data de saída/entrada
data.chaveAcesso                 : string      — Chave de acesso (44 dígitos)
data.valorNota                   : float       — Valor total da nota
data.valorFrete                  : float       — Valor do frete
data.xml                         : string      — XML completo da NFe
data.linkDanfe                   : string      — URL para download do DANFE
data.linkPDF                     : string      — URL para download do PDF
data.optanteSimplesNacional      : boolean     — Se optante do Simples
data.numeroPedidoLoja            : string      — Número do pedido na loja
data.finalidade                  : enum[1-4]   — 1=Normal, 2=Complementar, 3=Ajuste, 4=Devolução

data.contato.id                  : integer     — ID do contato
data.contato.nome                : string      — Nome
data.contato.tipoPessoa          : enum[F,J,E] — Tipo de pessoa
data.contato.numeroDocumento     : string      — CPF/CNPJ
data.contato.ie                  : string      — Inscrição Estadual
data.contato.rg                  : string      — RG
data.contato.contribuinte        : enum[1,2,9] — 1=Contribuinte ICMS, 2=Isento, 9=Não contribuinte
data.contato.telefone            : string      — Telefone
data.contato.email               : string      — Email
data.contato.endereco.endereco   : string      — Logradouro
data.contato.endereco.numero     : string      — Número
data.contato.endereco.complemento: string      — Complemento
data.contato.endereco.bairro     : string      — Bairro
data.contato.endereco.cep        : string      — CEP
data.contato.endereco.municipio  : string      — Município
data.contato.endereco.uf         : string      — UF

data.naturezaOperacao.id         : integer     — ID da natureza da operação
data.loja.id                     : integer     — ID da loja
data.loja.numero                 : string      — Número na loja
data.vendedor.id                 : integer     — ID do vendedor

— ITENS (array) —
data.itens[].codigo              : string      — SKU/código
data.itens[].descricao           : string      — Descrição
data.itens[].unidade             : string      — Unidade
data.itens[].quantidade          : float       — Quantidade
data.itens[].valor               : float       — Valor unitário
data.itens[].valorTotal          : float       — Valor total do item
data.itens[].tipo                : enum[P,S]   — P=Produto, S=Serviço
data.itens[].pesoBruto           : float       — Peso bruto
data.itens[].pesoLiquido         : float       — Peso líquido
data.itens[].classificacaoFiscal : string      — NCM (9999.99.99)
data.itens[].cest                : string      — CEST
data.itens[].cfop                : string      — CFOP
data.itens[].origem              : enum[0-8]   — Origem da mercadoria
data.itens[].gtin                : string      — Código de barras
data.itens[].informacoesAdicionais: string     — Info adicionais
data.itens[].impostos            : object      — Impostos detalhados
data.itens[].documentoReferenciado: object     — Doc referenciado

— PARCELAS (array) —
data.parcelas[].data             : date        — Data de vencimento
data.parcelas[].valor            : float       — Valor
data.parcelas[].observacoes      : string      — Observações
data.parcelas[].caut             : string      — Código de autorização (NSU)
data.parcelas[].formaPagamento   : object      — Forma de pagamento

— TRANSPORTE —
data.transporte.fretePorConta    : enum[0-4,9] — Responsável pelo frete
data.transporte.transportador.nome: string     — Nome do transportador
data.transporte.transportador.numeroDocumento: string — CPF/CNPJ
data.transporte.etiqueta.*       : (mesmos campos do pedido)
```

#### Outros endpoints de NFe
```http
POST   /nfe                                 — Criar nota fiscal
PUT    /nfe/{id}                            — Alterar nota fiscal
DELETE /nfe                                 — Remover múltiplas notas
POST   /nfe/{id}/enviar                     — Enviar NFe para SEFAZ
POST   /nfe/{id}/lancar-contas              — Lançar contas
POST   /nfe/{id}/estornar-contas            — Estornar contas
POST   /nfe/{id}/lancar-estoque             — Lançar estoque
POST   /nfe/{id}/lancar-estoque/{idDeposito}— Lançar estoque (depósito)
POST   /nfe/{id}/estornar-estoque           — Estornar estoque
```

---

### 4.3 Notas Fiscais de Serviço (NFSe)

```http
GET    /nfse                                — Listar NFSe
GET    /nfse/{id}                           — Consultar NFSe
GET    /nfse/configuracoes                  — Configurações
POST   /nfse                                — Criar NFSe
POST   /nfse/{id}/enviar                    — Enviar NFSe
POST   /nfse/{id}/cancelar                  — Cancelar NFSe
PUT    /nfse/configuracoes                  — Alterar configurações
DELETE /nfse/{id}                           — Excluir NFSe
```

### 4.4 Contatos

```http
GET    /contatos?pagina=1&limite=100        — Listar
GET    /contatos/{id}                       — Consultar
GET    /contatos/tipos                      — Tipos de contato
GET    /contatos/situacoes                  — Situações
GET    /contatos/consumidor-final           — Dados consumidor final
POST   /contatos                            — Criar
PUT    /contatos/{id}                       — Atualizar
DELETE /contatos/{id}                       — Excluir
```

### 4.5 Produtos

```http
GET    /produtos?pagina=1&limite=100        — Listar
GET    /produtos/{id}                       — Consultar por ID
GET    /produtos?codigo={SKU}               — Consultar por SKU
```

### 4.6 Outros Endpoints Relevantes

| Endpoint | Descrição |
|----------|-----------|
| `GET /formas-pagamentos` | Formas de pagamento cadastradas |
| `GET /canais-venda` | Canais de venda (marketplaces) |
| `GET /depositos` | Depósitos/armazéns |
| `GET /vendedores` | Vendedores cadastrados |
| `GET /situacoes/modulos` | Módulos e suas situações |
| `GET /contas/receber` | Contas a receber |
| `GET /contas/pagar` | Contas a pagar |

---

## 5. Sistema de Webhooks

O Bling envia notificações automáticas via HTTP POST quando eventos ocorrem. Isso permite sincronização em **tempo real** sem necessidade de polling constante.

### 5.1 Configuração

1. No app registrado no Bling Developer Portal, ir na aba **"Webhooks"**
2. Configurar:
   - **URL do servidor**: `https://gestao.meguispet.com/api/bling/webhook`
   - **Recursos**: Pedidos de Venda, NFe
   - **Ações**: created, updated, deleted
   - **Versão do payload**: mais recente

### 5.2 Eventos Disponíveis

| Recurso | Scope | Ações | Evento |
|---------|-------|-------|--------|
| Pedidos de Venda | `order` | created, updated, deleted | `pedido_venda.created` |
| NFe | `invoice` | created, updated, deleted | `nfe.created` |
| Produtos | `product` | created, updated, deleted | `product.created` |
| Estoque | `stock` | created, updated, deleted | `stock.updated` |
| Estoque Virtual | `virtual_stock` | updated | `virtual_stock.updated` |

### 5.3 Formato do Payload

```json
{
  "eventId": "uuid-do-evento",
  "date": "2026-02-10T15:30:00-03:00",
  "version": "1",
  "event": "pedido_venda.created",
  "companyId": "123456",
  "data": {
    // dados específicos do recurso
    // normalmente contém o ID do registro
    // requer chamada GET adicional para dados completos
  }
}
```

### 5.4 Validação de Assinatura HMAC

**OBRIGATÓRIO**: Validar toda requisição recebida usando o header `X-Bling-Signature-256`.

O Bling gera um hash HMAC-SHA256 usando o payload JSON e o `client_secret` do app.

```typescript
import crypto from 'crypto'

function validateBlingWebhook(
  payload: string,          // req.body como string
  signature: string,        // header X-Bling-Signature-256
  clientSecret: string      // BLING_CLIENT_SECRET
): boolean {
  const hmac = crypto.createHmac('sha256', clientSecret)
  hmac.update(payload, 'utf8')
  const expected = `sha256=${hmac.digest('hex')}`

  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature)
  )
}
```

**Header de exemplo:**
```
X-Bling-Signature-256: sha256=a012da891d0cebcb375c8e12b881e81df40256dfffc25e08ba9db4ab35515516
```

### 5.5 Política de Retry

| Aspecto | Detalhe |
|---------|---------|
| **Resposta esperada** | HTTP 2xx em até 5 segundos |
| **Janela de retry** | Até 3 dias com backoff progressivo |
| **Ordem** | NÃO garantida (pode receber update antes de create) |
| **Idempotência** | Endpoint deve aceitar payloads duplicados (retornar 2xx) |
| **Falha total** | Após 3 dias, webhook é **desabilitado automaticamente** |

> **Importante:** Sempre responder com 200 rapidamente e processar o evento de forma assíncrona.

### 5.6 Fluxo Recomendado no Webhook

```
1. Receber POST
2. Validar HMAC signature → 401 se inválido
3. Responder 200 imediatamente
4. Extrair event type e ID do recurso
5. Buscar dados completos via GET /pedidos/vendas/{id} ou GET /nfe/{id}
6. Transformar e salvar no Supabase
7. Registrar no bling_sync_log
```

---

## 6. Biblioteca JavaScript/TypeScript

Existe uma biblioteca npm oficial da comunidade para integrar com a API v3:

### Instalação
```bash
pnpm add bling-erp-api
```

### Configuração
```typescript
import Bling from 'bling-erp-api'

const bling = new Bling(accessToken)
```

### Módulos Disponíveis (40+)

| Módulo | Exemplo de uso |
|--------|---------------|
| `pedidosVendas` | `bling.pedidosVendas.get()` |
| `nfes` | `bling.nfes.get()` |
| `contatos` | `bling.contatos.get()` |
| `produtos` | `bling.produtos.get()` |
| `estoques` | `bling.estoques.get()` |
| `formasPagamentos` | `bling.formasPagamentos.get()` |
| `vendedores` | `bling.vendedores.get()` |
| `canaisVenda` | `bling.canaisVenda.get()` |
| `nfces` | `bling.nfces.get()` |
| `nfses` | `bling.nfses.get()` |

### Características
- **100% TypeScript** com tipagem completa
- Compatível com API v3 (v310)
- Licença MIT
- GitHub: https://github.com/AlexandreBellas/bling-erp-api-js

> **Decisão:** Podemos usar esta biblioteca OU implementar nosso próprio client Axios. A biblioteca simplifica, mas adiciona uma dependência. Nosso client Axios dá mais controle sobre retry e error handling.

---

## 7. Rate Limits e Boas Práticas

### Rate Limits (confirmado pelo suporte)

| Limite | Valor |
|--------|-------|
| **Requisições por segundo** | **3 req/s** |
| **Requisições por dia** | **120.000 req/dia** |
| **Resposta ao exceder** | HTTP 429 (Too Many Requests) |

### Bloqueio por IP (proteção contra abuso)

| Condição | Duração do bloqueio |
|----------|-------------------|
| 300 erros em 10 segundos | 10 minutos |
| 600 requests em 10 segundos | 10 minutos |
| 20 requests para `/oauth/token` em 60 segundos | 60 minutos |
| Violações persistentes | Bloqueio indefinido |

### Restrições adicionais
- Filtros de período (dataInicial/dataFinal) com mais de **1 ano** retornam HTTP 400
- Ref: https://developer.bling.com.br/limites

### Boas Práticas
1. **Sempre armazenar `raw_data`** (JSONB) como backup do payload original
2. **Usar `dataAlteracaoInicial/Final`** no polling para buscar apenas registros alterados
3. **Implementar idempotência** - usar `bling_id` como chave única para evitar duplicatas
4. **Processar webhooks async** - responder 200 rápido, processar depois
5. **Monitorar `bling_sync_log`** para detectar falhas de sincronização
6. **Renovar token proativamente** - antes de expirar, não esperar erro 401

---

## 8. Mapeamento de Dados: Bling → MeguisPet

### Canais de Venda (Marketplace)
O campo `canal_venda` / `loja_nome` do Bling indica a origem:

| Bling (canal/loja) | MeguisPet `origem_venda` equivalente |
|--------------------|--------------------------------------|
| Loja Virtual | loja_fisica |
| Mercado Livre | mercado_livre |
| Shopee | shopee |
| Magazine Luiza | magazine_luiza |
| Americanas | americanas |
| Amazon | outros (ou novo: 'amazon') |
| Outros | outros |

### Formas de Pagamento
O Bling retorna a forma de pagamento como texto/ID. Mapear para os equivalentes locais:

| Bling | MeguisPet |
|-------|-----------|
| Dinheiro | dinheiro |
| Cartão de Crédito | credito |
| Cartão de Débito | debito |
| PIX | pix |
| Boleto | boleto |
| Transferência | transferencia |

### Status/Situação de Pedido
O Bling usa IDs numéricos customizáveis para situações. É necessário consultar `GET /situacoes/modulos` para obter a lista atualizada do cliente.

---

## 9. Troubleshooting

### Token Expirado
```
HTTP 401 Unauthorized
```
→ Fazer refresh do token automaticamente via `refresh_token`

### Code Expirado
```
Erro ao trocar code por token
```
→ O `authorization_code` expira em 1 minuto. Redirecionar o usuário novamente.

### Webhook Desabilitado
Se webhooks pararem de funcionar, verificar:
1. Logs de erro no `bling_sync_log`
2. O Bling desabilita webhooks após 3 dias de falhas
3. Reativar manualmente no painel do developer

### Dados Fora de Ordem
Webhooks podem chegar fora de sequência. Sempre usar `bling_id` + timestamp para determinar a versão mais recente.

---

## 10. Links de Referência

| Recurso | URL |
|---------|-----|
| Portal do Desenvolvedor | https://developer.bling.com.br/home |
| API Autenticação | https://developer.bling.com.br/bling-api |
| Webhooks | https://developer.bling.com.br/webhooks |
| Referência de Endpoints | https://developer.bling.com.br/referencia |
| Como Testar | https://developer.bling.com.br/como-testar |
| Registrar App | https://developer.bling.com.br/aplicativos |
| Migração v2→v3 | https://developer.bling.com.br/migracao-v2-v3 |
| Changelog | https://developer.bling.com.br/changelogs |
| Ajuda - NFe | https://ajuda.bling.com.br/hc/pt-br/sections/360008117354 |
| Ajuda - API | https://ajuda.bling.com.br/hc/pt-br/categories/360002186394 |
| Biblioteca JS/TS | https://github.com/AlexandreBellas/bling-erp-api-js |
| Bling API PHP | https://github.com/AlexandreBellas/bling-erp-api-php |
| Bling v3 SDK (PHP) | https://github.com/prhost/bling-v3-sdk |
| Limites de Requisição | https://developer.bling.com.br/limites |
| Tokens de Acesso | https://developer.bling.com.br/aplicativos#tokens-de-acesso |
| Recursos Webhooks | https://developer.bling.com.br/webhooks#recursos |

---

## 11. Resumo Técnico Rápido (confirmado com suporte Bling - Fev/2026)

| Item | Valor |
|------|-------|
| **Tipo de app** | Privado (direto na conta do cliente) |
| **Conta de dev** | Não precisa - usar conta existente |
| **Custo** | Zero (API pública e gratuita) |
| **Homologação** | Não necessária para app privado |
| **Access Token** | 6 horas (21600s) |
| **Refresh Token** | 30 dias |
| **Auth Code** | 1 minuto para trocar |
| **Rate limit** | 3 req/segundo, 120k req/dia |
| **Excesso** | HTTP 429 |
| **Webhook retry** | Até 3 dias, depois desabilita |
| **Webhook resposta** | HTTP 2xx em até 5 segundos |
| **Filtro máximo** | 1 ano (senão HTTP 400) |
| **API version** | v3 (v310) |
| **Base URL** | `https://api.bling.com.br/Api/v3` |
| **OpenAPI spec** | `docs/bling/openapi-bling.json` (1MB) |
