# 🔄 Importação em Lote de Clientes

> **Feature**: Sistema de importação em lote de clientes via CSV/TXT com preview, validação automática e busca de CEP

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Fluxo do Usuário](#fluxo-do-usuário)
3. [Formato do Arquivo](#formato-do-arquivo)
4. [Mapeamento de Campos](#mapeamento-de-campos)
5. [Busca Automática de CEP](#busca-automática-de-cep)
6. [Preview e Validação](#preview-e-validação)
7. [Importação e Resultado](#importação-e-resultado)
8. [Integração com Mapa](#integração-com-mapa)
9. [Especificações Técnicas](#especificações-técnicas)
10. [Casos de Uso](#casos-de-uso)

---

## 🎯 Visão Geral

Sistema completo para importação em lote de clientes a partir de arquivos CSV/TXT, com:

- ✅ Upload de arquivo (drag & drop ou file picker)
- ✅ Preview interativo dos dados antes da importação
- ✅ Busca automática de CEP via ViaCEP (gratuita)
- ✅ Validação de CNPJ/CPF com dígitos verificadores
- ✅ Indicadores visuais de status (válido, aviso, erro)
- ✅ Seleção individual de registros para importar
- ✅ Tratamento inteligente de duplicatas
- ✅ Integração automática com o mapa de clientes
- ✅ Relatório detalhado pós-importação

**Status**: 🚧 Em Desenvolvimento
**Prioridade**: Alta
**Versão**: 1.0.0

---

## 👤 Fluxo do Usuário

### **Passo 1: Acesso à Funcionalidade**

Na página `/clientes`, novo botão ao lado de "Novo Cliente":

```
┌─────────────────────────────────────────┐
│  📊 Clientes                            │
├─────────────────────────────────────────┤
│  [+ Novo Cliente] [📥 Importar Clientes]│
└─────────────────────────────────────────┘
```

### **Passo 2: Upload do Arquivo**

Modal abre com área de upload:

```
┌───────────────────────────────────────────────────┐
│  🔄 Importar Clientes                        [X]  │
├───────────────────────────────────────────────────┤
│                                                   │
│  📁 SELECIONE O ARQUIVO                           │
│  ┌─────────────────────────────────────────────┐ │
│  │                                             │ │
│  │     📄 Arraste o arquivo aqui              │ │
│  │        ou clique para selecionar           │ │
│  │                                             │ │
│  │   Formatos aceitos: .txt, .csv             │ │
│  │   Separador: ; (ponto e vírgula)           │ │
│  │                                             │ │
│  └─────────────────────────────────────────────┘ │
│                                                   │
│  💡 Dica: Seu arquivo deve conter as colunas:    │
│     Código | Nome | Razão Social | CNPJ/CPF |   │
│     Estado | Cidade | Telefone                   │
│                                                   │
│  [📥 Baixar Template de Exemplo]                 │
│                                                   │
└───────────────────────────────────────────────────┘
```

### **Passo 3: Configurações da Importação**

Após selecionar o arquivo, mostrar opções:

```
┌───────────────────────────────────────────────────┐
│  ⚙️ CONFIGURAÇÕES                                 │
├───────────────────────────────────────────────────┤
│                                                   │
│  Arquivo selecionado: cliente.txt (15.2 KB)      │
│                                                   │
│  Tipo padrão:                                     │
│  ◉ Cliente  ○ Fornecedor  ○ Ambos                │
│                                                   │
│  Buscar CEP automaticamente:                      │
│  [✓] Sim, buscar CEP aproximado (centro da cidade)│
│      ⚠️ CEPs serão aproximados - revise depois    │
│                                                   │
│  Em caso de duplicatas (mesmo CNPJ/CPF):          │
│  [Ignorar ▼]                                      │
│    - Ignorar (não importar)                       │
│    - Atualizar dados existentes                   │
│    - Importar como novo (com aviso)               │
│                                                   │
│  [Cancelar]              [Analisar Arquivo →]    │
│                                                   │
└───────────────────────────────────────────────────┘
```

### **Passo 4: Preview e Validação**

Sistema processa o arquivo e mostra preview:

```
┌───────────────────────────────────────────────────────────────────┐
│  👁️ PREVIEW DA IMPORTAÇÃO                                    [X]  │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  📊 Arquivo: cliente.txt                                          │
│  📈 79 registros encontrados                                      │
│                                                                   │
│  Status:                                                          │
│  ✅ 73 válidos | ⚠️ 4 avisos | ❌ 2 erros | 🔄 3 duplicatas      │
│                                                                   │
│  CEP:                                                             │
│  ✅ 68 encontrados | ⚠️ 9 aproximados | ❌ 2 não encontrados     │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ [☑ Selecionar todos (76)]  🔍 Filtrar: [Todos ▼]  [🔄]    │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │ ┌─┬──┬─────────────┬──────────────┬──────────┬────────────┐│ │
│  │ │✓│ST│ Nome        │ CNPJ/CPF     │ Cidade   │ CEP        ││ │
│  │ ├─┼──┼─────────────┼──────────────┼──────────┼────────────┤│ │
│  │ │✓│✅│ YELLOW21... │ 40.950...010 │ Caxias.. │✅ 95020-000││ │
│  │ │✓│✅│ CELEIRO...  │ 27.937...026 │ Caxias.. │✅ 95010-000││ │
│  │ │✓│⚠️│ QUEIJARIA...│ 30.134...075 │ Caxias.. │⚠️ 95020-000││ │
│  │ │ │❌│ TESTE SA    │ 11.111.111.. │ São Paulo│❌ CNPJ inválido ││ │
│  │ │ │🔄│ YELLOW21... │ 40.950...010 │ Caxias.. │🔄 Duplicata││ │
│  │ │✓│⚠️│ PET SHOP X  │ 226.907...41 │ S.André  │❌ Não encontrado││ │
│  │ └─┴──┴─────────────┴──────────────┴──────────┴────────────┘│ │
│  │                                              [Expandir tudo]│ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  Legenda:                                                         │
│  ✅ Válido e pronto para importar                                │
│  ⚠️ Aviso - campo opcional faltando ou CEP aproximado            │
│  ❌ Erro - campo obrigatório inválido (não será importado)       │
│  🔄 Duplicata - CNPJ já existe no sistema                        │
│                                                                   │
│  [◀ Voltar]  [Cancelar]          [✅ Importar 76 clientes]      │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

### **Passo 5: Detalhes de um Registro**

Clicar em uma linha expande os detalhes:

```
┌───────────────────────────────────────────────────────────────────┐
│  YELLOW21 ATACADO E VAREJO DE PRODUTOS PET LTDA                   │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  📋 Dados Originais:                                              │
│  ├─ Código: 112                                                   │
│  ├─ Nome: YELLOW21 ATACADO E VAREJO DE PRODUTOS PET LTDA         │
│  ├─ Razão Social: YELLOW21 ATACADO E VAREJO DE PRODUTOS PET LTDA │
│  ├─ CNPJ: 40.950.139/0001-10                                      │
│  ├─ Estado: RIO GRANDE DO SUL                                     │
│  ├─ Cidade: CAXIAS DO SUL                                         │
│  └─ Telefone: (0xx54)3027-7233                                    │
│                                                                   │
│  ✅ Dados que serão importados:                                   │
│  ├─ Nome: YELLOW21 ATACADO E VAREJO DE PRODUTOS PET LTDA         │
│  ├─ CNPJ: 40950139000110 ✅ (válido)                              │
│  ├─ Telefone: (54) 3027-7233 ✅ (formatado)                       │
│  ├─ Cidade: Caxias do Sul                                         │
│  ├─ Estado: RS                                                    │
│  ├─ CEP: 95020-000 ✅ (Rua Sinimbu, Centro)                       │
│  ├─ Endereço: Rua Sinimbu, Centro - Caxias do Sul/RS             │
│  ├─ Tipo: Cliente                                                 │
│  ├─ Ativo: Sim                                                    │
│  └─ Observações: ID antigo: 112                                   │
│                                                                   │
│  🔍 CEP encontrado via ViaCEP:                                    │
│  ✅ CEP exato do centro de Caxias do Sul/RS                       │
│                                                                   │
│  [Editar antes de importar]                          [Fechar]    │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

### **Passo 6: Processamento da Importação**

Durante a importação, mostrar progresso:

```
┌───────────────────────────────────────────────────┐
│  ⏳ Importando Clientes...                        │
├───────────────────────────────────────────────────┤
│                                                   │
│  ████████████████░░░░░░░░░░  76%                 │
│                                                   │
│  Importando 58 de 76 clientes...                 │
│  ✅ 57 importados | ❌ 1 erro                     │
│                                                   │
│  Por favor, aguarde...                            │
│                                                   │
└───────────────────────────────────────────────────┘
```

### **Passo 7: Resultado da Importação**

Após concluir, mostrar resumo:

```
┌───────────────────────────────────────────────────┐
│  ✅ Importação Concluída com Sucesso!             │
├───────────────────────────────────────────────────┤
│                                                   │
│  📊 Resumo da Importação:                         │
│                                                   │
│  ✅ 73 clientes importados com sucesso            │
│  🗺️  68 clientes adicionados ao mapa             │
│  ⚠️  3 duplicatas ignoradas                       │
│  ⚠️  5 CEPs aproximados (revisar)                 │
│  ❌  2 erros (CNPJ inválido)                      │
│                                                   │
│  Os clientes importados já estão disponíveis      │
│  na lista de clientes e no mapa.                  │
│                                                   │
│  [📄 Ver Detalhes] [📥 Baixar Relatório] [OK]    │
│                                                   │
└───────────────────────────────────────────────────┘
```

### **Passo 8: Relatório Detalhado** (Opcional)

```
┌─────────────────────────────────────────────────────────────────┐
│  📄 Relatório de Importação - 09/12/2025 17:30                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Arquivo: cliente.txt                                           │
│  Total de registros: 79                                         │
│                                                                 │
│  ✅ IMPORTADOS COM SUCESSO (73):                                │
│  ├─ YELLOW21 ATACADO E VAREJO... (CNPJ: 40950139000110)       │
│  ├─ CELEIRO DAS RACOES LTDA (CNPJ: 27937017000126)            │
│  ├─ TUDO EM RACOES DISTRIBUIDORA... (CNPJ: 31850950000139)    │
│  └─ ... (ver todos)                                             │
│                                                                 │
│  🔄 DUPLICATAS IGNORADAS (3):                                   │
│  ├─ YELLOW21... - já existe com CNPJ 40950139000110           │
│  ├─ VETUS SAUDE ANIMAL - já existe com CNPJ 35534016000169    │
│  └─ PETILE COMERCIO... - já existe com CNPJ 57766113000110    │
│                                                                 │
│  ❌ ERROS (2):                                                  │
│  ├─ TESTE SA - CNPJ inválido: 11.111.111/0001-11              │
│  └─ EMPRESA X - Nome obrigatório não informado                 │
│                                                                 │
│  ⚠️ AVISOS (5):                                                 │
│  ├─ PET SHOP X - CEP não encontrado (campo vazio)             │
│  ├─ QUEIJARIA NICOLINI - Telefone não informado                │
│  ├─ AGROPECUARIA ANA RECH - CEP aproximado (95020-000)        │
│  └─ ... (ver todos)                                             │
│                                                                 │
│  [📥 Baixar PDF] [📥 Baixar CSV] [Fechar]                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📄 Formato do Arquivo

### **Estrutura do CSV/TXT**

```csv
Código;Nome;Razão social;CNPJ/CPF;Estado;Cidade;Telefone;
112;YELLOW21 ATACADO...;YELLOW21 ATACADO...;40.950.139/0001-10;RIO GRANDE DO SUL;CAXIAS DO SUL;(0xx54)3027-7233;
111;CELEIRO DAS RACOES...;CELEIRO DAS RACOES...;27.937.017/0001-26;RIO GRANDE DO SUL;CAXIAS DO SUL;(0xx54)3226-4469;
```

### **Requisitos do Arquivo**

- **Separador**: Ponto e vírgula (`;`)
- **Encoding**: UTF-8
- **Primeira linha**: Header com nomes das colunas
- **Extensão**: `.txt` ou `.csv`

### **Colunas Obrigatórias**

| Coluna | Obrigatório | Descrição |
|--------|-------------|-----------|
| Código | Não | ID do sistema antigo |
| Nome | **Sim** | Nome fantasia ou razão social |
| Razão social | Não | Razão social da empresa |
| CNPJ/CPF | **Sim** | Documento (pode ter formatação) |
| Estado | **Sim** | Nome completo ou UF |
| Cidade | **Sim** | Nome da cidade |
| Telefone | Não | Telefone com qualquer formatação |

### **Formatos Aceitos**

**CNPJ:**
- `40.950.139/0001-10` (com formatação) ✅
- `40950139000110` (sem formatação) ✅

**CPF:**
- `226.907.148-41` (com formatação) ✅
- `22690714841` (sem formatação) ✅

**Telefone:**
- `(0xx54)3027-7233` ✅
- `(54) 3027-7233` ✅
- `54 3027-7233` ✅
- `30277233` ✅

**Estado:**
- `RIO GRANDE DO SUL` (nome completo) ✅
- `RS` (UF) ✅

---

## 🗺️ Mapeamento de Campos

### **Do Arquivo para o Banco de Dados**

| Campo no Arquivo | Campo no Banco | Transformação |
|------------------|----------------|---------------|
| Código | `observacoes` | "ID antigo: 112" |
| Nome | `nome` | Sem alteração |
| Razão social | `razao_social` | Sem alteração (se empresa) |
| CNPJ/CPF | `cpf_cnpj` | Remove formatação: `40.950.139/0001-10` → `40950139000110` |
| Estado | `estado` | Converte para UF: `RIO GRANDE DO SUL` → `RS` |
| Cidade | `cidade` | Capitaliza: `CAXIAS DO SUL` → `Caxias do Sul` |
| Telefone | `telefone` | Formata: `(0xx54)3027-7233` → `(54) 3027-7233` |
| (busca ViaCEP) | `cep` | CEP encontrado: `95020-000` |
| (busca ViaCEP) | `endereco` | Monta: `Rua Sinimbu, Centro - Caxias do Sul/RS` |
| (padrão) | `tipo` | Configurável: `cliente` (padrão) |
| (padrão) | `ativo` | Sempre `true` |
| (vazio) | `email` | `null` |
| (vazio) | `data_nascimento` | `null` |

### **Exemplo de Transformação Completa**

**Entrada (linha do arquivo):**
```csv
112;YELLOW21 ATACADO...;YELLOW21 ATACADO...;40.950.139/0001-10;RIO GRANDE DO SUL;CAXIAS DO SUL;(0xx54)3027-7233;
```

**Saída (objeto Cliente):**
```json
{
  "nome": "YELLOW21 ATACADO E VAREJO DE PRODUTOS PET LTDA",
  "razao_social": "YELLOW21 ATACADO E VAREJO DE PRODUTOS PET LTDA",
  "cpf_cnpj": "40950139000110",
  "email": null,
  "telefone": "(54) 3027-7233",
  "endereco": "Rua Sinimbu, Centro - Caxias do Sul/RS",
  "cidade": "Caxias do Sul",
  "estado": "RS",
  "cep": "95020-000",
  "data_nascimento": null,
  "observacoes": "ID antigo: 112",
  "tipo": "cliente",
  "ativo": true
}
```

---

## 🔍 Busca Automática de CEP

### **Como Funciona**

1. **Para cada cliente** com Cidade + Estado:
   - Converter estado para UF: `RIO GRANDE DO SUL` → `RS`
   - Normalizar cidade: `CAXIAS DO SUL` → `Caxias Do Sul`
   - Fazer busca na ViaCEP: `GET https://viacep.com.br/ws/RS/Caxias%20Do%20Sul/Centro/json/`

2. **Processamento da resposta:**
   - ✅ Se encontrar: usar o **primeiro CEP** (geralmente centro)
   - ❌ Se não encontrar: deixar campo `cep` vazio
   - Montar endereço completo com os dados retornados

3. **Indicadores no preview:**
   - ✅ **CEP exato**: encontrado com sucesso
   - ⚠️ **CEP aproximado**: CEP do centro da cidade (revisar)
   - ❌ **CEP não encontrado**: campo vazio (preencher manualmente)

### **Exemplo de Busca ViaCEP**

**Request:**
```http
GET https://viacep.com.br/ws/RS/Caxias%20Do%20Sul/Centro/json/
```

**Response:**
```json
[
  {
    "cep": "95020-000",
    "logradouro": "Rua Sinimbu",
    "complemento": "até 799/800",
    "bairro": "Centro",
    "localidade": "Caxias do Sul",
    "uf": "RS",
    "ibge": "4305108",
    "gia": "",
    "ddd": "54",
    "siafi": "8599"
  },
  {
    "cep": "95010-000",
    "logradouro": "Rua Marquês do Herval",
    "bairro": "Centro",
    ...
  }
]
```

**Resultado:**
- CEP: `95020-000`
- Endereço: `Rua Sinimbu, Centro - Caxias do Sul/RS`
- Status: ✅ CEP exato (centro da cidade)

### **Cache de CEPs**

Para otimizar performance (evitar buscas duplicadas):

```typescript
// Cache em memória durante o processo de importação
const cepCache = new Map<string, ViaCEPResult>()

// Exemplo: 10 clientes de "Caxias do Sul/RS"
// Busca 1x, reutiliza para os outros 9
const cacheKey = `${estado}-${cidade}` // "RS-Caxias do Sul"
```

**Benefícios:**
- ⚡ Reduz chamadas à API (de 79 para ~20-30)
- ⚡ Importação mais rápida
- ✅ Respeita limites da ViaCEP

### **Tratamento de Erros**

| Erro | Ação |
|------|------|
| Cidade não encontrada | Deixar CEP vazio, status ❌ |
| Timeout da API | Tentar 2x, depois deixar vazio |
| Cidade com caracteres especiais | Normalizar e tentar novamente |
| Estado inválido | Converter para UF e tentar novamente |

### **Mapa de Estados**

Conversão automática de nome completo para UF:

```typescript
const estadosMap = {
  'ACRE': 'AC',
  'ALAGOAS': 'AL',
  'AMAPÁ': 'AP',
  'AMAZONAS': 'AM',
  'BAHIA': 'BA',
  'CEARÁ': 'CE',
  'DISTRITO FEDERAL': 'DF',
  'ESPÍRITO SANTO': 'ES',
  'GOIÁS': 'GO',
  'MARANHÃO': 'MA',
  'MATO GROSSO': 'MT',
  'MATO GROSSO DO SUL': 'MS',
  'MINAS GERAIS': 'MG',
  'PARÁ': 'PA',
  'PARAÍBA': 'PB',
  'PARANÁ': 'PR',
  'PERNAMBUCO': 'PE',
  'PIAUÍ': 'PI',
  'RIO DE JANEIRO': 'RJ',
  'RIO GRANDE DO NORTE': 'RN',
  'RIO GRANDE DO SUL': 'RS',
  'RONDÔNIA': 'RO',
  'RORAIMA': 'RR',
  'SANTA CATARINA': 'SC',
  'SÃO PAULO': 'SP',
  'SERGIPE': 'SE',
  'TOCANTINS': 'TO'
}
```

---

## ✅ Preview e Validação

### **Validações Automáticas**

#### 1. **CNPJ/CPF**
```typescript
✅ Válido: dígitos verificadores corretos
❌ Inválido: dígitos verificadores incorretos
⚠️ Duplicata: já existe no banco de dados
```

**Exemplos:**
- `40.950.139/0001-10` → ✅ CNPJ válido
- `11.111.111/0001-11` → ❌ CNPJ inválido (dígitos verificadores)
- `40.950.139/0001-10` → 🔄 Duplicata (já existe)

#### 2. **Nome**
```typescript
✅ Válido: não vazio
❌ Inválido: vazio ou apenas espaços
```

#### 3. **Telefone**
```typescript
✅ Válido: tem números
⚠️ Aviso: vazio (campo opcional)
```

#### 4. **CEP**
```typescript
✅ Encontrado: busca ViaCEP com sucesso
⚠️ Aproximado: CEP do centro da cidade
❌ Não encontrado: cidade não localizada
```

### **Status dos Registros**

Cada registro pode ter um dos seguintes status:

| Status | Ícone | Descrição | Ação |
|--------|-------|-----------|------|
| Válido | ✅ | Todos os campos OK | Importar |
| Aviso | ⚠️ | Campo opcional faltando ou CEP aproximado | Importar com aviso |
| Erro | ❌ | Campo obrigatório inválido | NÃO importar |
| Duplicata | 🔄 | CNPJ já existe | Ignorar ou Atualizar |

### **Filtros no Preview**

```
[Filtro: Todos ▼]
  - Todos (79)
  - ✅ Válidos (73)
  - ⚠️ Avisos (4)
  - ❌ Erros (2)
  - 🔄 Duplicatas (3)
  - 📍 Com CEP (77)
  - 🚫 Sem CEP (2)
```

### **Seleção de Registros**

- [☑] Checkbox "Selecionar todos"
- [☑] Checkbox individual por registro
- Registros com ❌ erro não podem ser selecionados
- Duplicatas 🔄 seguem a configuração escolhida

### **Ações no Preview**

| Ação | Descrição |
|------|-----------|
| 🔄 Atualizar | Refaz a análise do arquivo |
| 🔍 Expandir | Mostra detalhes de um registro |
| ✏️ Editar | Edita dados antes de importar |
| 🗑️ Remover | Remove da seleção |

---

## 📥 Importação e Resultado

### **Processo de Importação**

1. **Validação final** de todos os registros selecionados
2. **Importação em lote** (bulk insert) no banco de dados
3. **Geocodificação** para coordenadas do mapa (se CEP disponível)
4. **Geração de relatório** com resultado detalhado

### **Bulk Insert Otimizado**

```sql
INSERT INTO clientes (nome, cpf_cnpj, telefone, endereco, cidade, estado, cep, tipo, ativo, observacoes)
VALUES
  ('YELLOW21...', '40950139000110', '(54) 3027-7233', '...', 'Caxias do Sul', 'RS', '95020-000', 'cliente', true, 'ID antigo: 112'),
  ('CELEIRO...', '27937017000126', '(54) 3226-4469', '...', 'Caxias do Sul', 'RS', '95010-000', 'cliente', true, 'ID antigo: 111'),
  ...
ON CONFLICT (cpf_cnpj) DO NOTHING; -- Se duplicata, ignorar
```

### **Geocodificação para o Mapa**

Para cada cliente importado com CEP:

```typescript
// Buscar coordenadas via ViaCEP ou outra API
const coordenadas = await buscarCoordenadasPorCEP(cliente.cep)

// Atualizar cliente com lat/lng
await clientesService.update(cliente.id, {
  latitude: coordenadas.lat,
  longitude: coordenadas.lng
})
```

**Nota**: Se o banco já tiver colunas `latitude` e `longitude`, popular automaticamente. Se não, os clientes aparecerão no mapa quando o usuário abrir a página (geocodificação lazy).

### **Relatório de Importação**

Após importação, gerar objeto com:

```typescript
interface RelatorioImportacao {
  total: number                    // Total de registros no arquivo
  importados: number               // Importados com sucesso
  duplicatas: number               // Ignorados por serem duplicatas
  erros: number                    // Com erro (não importados)
  avisos: number                   // Importados com avisos

  detalhes: {
    importados: ClienteImportado[]
    duplicatas: ClienteDuplicata[]
    erros: ClienteErro[]
    avisos: ClienteAviso[]
  }

  cep: {
    encontrados: number            // CEPs encontrados
    aproximados: number            // CEPs aproximados (centro)
    naoEncontrados: number         // Sem CEP
  }

  mapa: {
    adicionados: number            // Clientes no mapa
    semCoordenadas: number         // Sem coordenadas
  }
}
```

### **Tipos de Resultado**

#### Sucesso Completo
```
✅ 73 clientes importados com sucesso!
🗺️  68 clientes adicionados ao mapa
```

#### Sucesso com Avisos
```
✅ 73 clientes importados
⚠️  5 CEPs aproximados (revisar posteriormente)
⚠️  3 sem telefone
```

#### Sucesso Parcial
```
✅ 70 clientes importados
❌ 3 erros (CNPJ inválido)
⚠️  6 avisos
```

#### Erro Total
```
❌ Nenhum cliente importado
- 79 registros com erros
- Verifique o formato do arquivo
```

---

## 🗺️ Integração com Mapa

### **Fluxo de Integração**

Após importação bem-sucedida:

1. **Clientes aparecem automaticamente** na página `/clientes`
2. **Clientes aparecem automaticamente** no mapa `/mapa-clientes`
3. **Sem necessidade de reload** da página (atualização via state)

### **Atualização Automática**

```typescript
// Após importação, atualizar lista de clientes
await loadClientes() // Recarrega lista de clientes

// Se estiver na página do mapa, atualizar também
if (router.pathname === '/mapa-clientes') {
  await loadClientesNoMapa()
}
```

### **Toast de Feedback**

```typescript
// Após importação
setToast({
  message: '✅ 73 clientes importados! Veja-os no mapa.',
  type: 'success',
  action: {
    label: '🗺️ Ver no Mapa',
    onClick: () => router.push('/mapa-clientes')
  }
})
```

### **Geocodificação Lazy** (Opcional)

Se não houver coordenadas na importação:

```typescript
// Na página do mapa, geocodificar sob demanda
useEffect(() => {
  const clientesSemCoordenadas = clientes.filter(c => !c.latitude || !c.longitude)

  clientesSemCoordenadas.forEach(async (cliente) => {
    if (cliente.cep) {
      const coords = await buscarCoordenadasPorCEP(cliente.cep)
      await clientesService.update(cliente.id, coords)
    }
  })
}, [clientes])
```

---

## 🛠️ Especificações Técnicas

### **Arquitetura**

```
Frontend (React + Next.js)
├── components/modals/
│   └── ClienteImportModal.tsx          // Modal principal
├── components/import/
│   ├── FileUploader.tsx                // Upload de arquivo
│   ├── ImportConfigForm.tsx            // Configurações
│   ├── ImportPreviewTable.tsx          // Tabela de preview
│   └── ImportResultSummary.tsx         // Resultado final
└── services/
    └── importService.ts                // Calls para API

Backend (Next.js API Routes)
├── api/clientes/import/
│   ├── preview.ts                      // POST - Análise do arquivo
│   ├── execute.ts                      // POST - Execução da importação
│   └── template.ts                     // GET - Download do template
└── lib/
    ├── csv-parser.ts                   // Parser CSV
    ├── cnpj-validator.ts               // Validação CNPJ/CPF
    ├── estado-mapper.ts                // Estado → UF
    └── viacep-client.ts                // Cliente ViaCEP
```

### **Endpoints da API**

#### 1. Preview do Arquivo
```typescript
POST /api/clientes/import/preview
Content-Type: multipart/form-data

Body:
{
  file: File,
  tipo: 'cliente' | 'fornecedor' | 'ambos',
  buscarCEP: boolean,
  duplicatas: 'ignorar' | 'atualizar' | 'novo'
}

Response:
{
  success: true,
  data: {
    registros: ClientePreview[],
    resumo: {
      total: number,
      validos: number,
      avisos: number,
      erros: number,
      duplicatas: number
    },
    cep: {
      encontrados: number,
      aproximados: number,
      naoEncontrados: number
    }
  }
}
```

#### 2. Executar Importação
```typescript
POST /api/clientes/import/execute
Content-Type: application/json

Body:
{
  clientes: ClienteForm[],
  opcoes: {
    tipo: 'cliente' | 'fornecedor' | 'ambos',
    duplicatas: 'ignorar' | 'atualizar' | 'novo'
  }
}

Response:
{
  success: true,
  data: {
    importados: number,
    duplicatas: number,
    erros: number,
    detalhes: RelatorioImportacao
  }
}
```

#### 3. Download do Template
```typescript
GET /api/clientes/import/template

Response:
File: template-importacao-clientes.csv
Content-Type: text/csv
```

### **Tipos TypeScript**

```typescript
// Cliente no preview (antes de importar)
interface ClientePreview {
  linha: number
  status: 'valido' | 'aviso' | 'erro' | 'duplicata'
  dados: {
    original: Record<string, string>  // Dados originais do CSV
    processado: ClienteForm           // Dados processados
  }
  validacoes: {
    cnpj: { valido: boolean; mensagem?: string }
    nome: { valido: boolean; mensagem?: string }
    cep: {
      encontrado: boolean
      aproximado: boolean
      valor?: string
      endereco?: string
      mensagem?: string
    }
  }
  mensagens: string[]                 // Avisos e erros
  selecionado: boolean                // Para checkbox
}

// Resultado da importação
interface RelatorioImportacao {
  total: number
  importados: number
  duplicatas: number
  erros: number
  avisos: number
  detalhes: {
    importados: Array<{
      linha: number
      nome: string
      cnpj: string
      id: number
    }>
    duplicatas: Array<{
      linha: number
      nome: string
      cnpj: string
      mensagem: string
    }>
    erros: Array<{
      linha: number
      nome: string
      mensagem: string
    }>
    avisos: Array<{
      linha: number
      nome: string
      mensagem: string
    }>
  }
  cep: {
    encontrados: number
    aproximados: number
    naoEncontrados: number
  }
  mapa: {
    adicionados: number
    semCoordenadas: number
  }
  timestamp: string
}
```

### **Validação de CNPJ/CPF**

```typescript
// lib/cnpj-validator.ts

export function validarCNPJ(cnpj: string): boolean {
  // Remove formatação
  cnpj = cnpj.replace(/[^\d]/g, '')

  // Verifica se tem 14 dígitos
  if (cnpj.length !== 14) return false

  // Verifica se todos os dígitos são iguais (CNPJ inválido)
  if (/^(\d)\1+$/.test(cnpj)) return false

  // Calcula dígitos verificadores
  let soma = 0
  let peso = 2

  for (let i = 11; i >= 0; i--) {
    soma += parseInt(cnpj[i]) * peso
    peso = peso === 9 ? 2 : peso + 1
  }

  let digito1 = soma % 11 < 2 ? 0 : 11 - (soma % 11)
  if (parseInt(cnpj[12]) !== digito1) return false

  soma = 0
  peso = 2

  for (let i = 12; i >= 0; i--) {
    soma += parseInt(cnpj[i]) * peso
    peso = peso === 9 ? 2 : peso + 1
  }

  let digito2 = soma % 11 < 2 ? 0 : 11 - (soma % 11)
  return parseInt(cnpj[13]) === digito2
}

export function validarCPF(cpf: string): boolean {
  // Remove formatação
  cpf = cpf.replace(/[^\d]/g, '')

  // Verifica se tem 11 dígitos
  if (cpf.length !== 11) return false

  // Verifica se todos os dígitos são iguais (CPF inválido)
  if (/^(\d)\1+$/.test(cpf)) return false

  // Calcula primeiro dígito verificador
  let soma = 0
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpf[i]) * (10 - i)
  }

  let digito1 = 11 - (soma % 11)
  if (digito1 >= 10) digito1 = 0
  if (parseInt(cpf[9]) !== digito1) return false

  // Calcula segundo dígito verificador
  soma = 0
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpf[i]) * (11 - i)
  }

  let digito2 = 11 - (soma % 11)
  if (digito2 >= 10) digito2 = 0
  return parseInt(cpf[10]) === digito2
}

export function validarDocumento(doc: string): boolean {
  doc = doc.replace(/[^\d]/g, '')

  if (doc.length === 11) return validarCPF(doc)
  if (doc.length === 14) return validarCNPJ(doc)

  return false
}
```

### **Cliente ViaCEP**

```typescript
// lib/viacep-client.ts

interface ViaCEPResult {
  cep: string
  logradouro: string
  complemento: string
  bairro: string
  localidade: string
  uf: string
  ibge: string
  ddd: string
}

export async function buscarCEPPorCidade(
  uf: string,
  cidade: string
): Promise<ViaCEPResult | null> {
  try {
    const cidadeNormalizada = cidade
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/\s+/g, '%20')

    const url = `https://viacep.com.br/ws/${uf}/${cidadeNormalizada}/Centro/json/`

    const response = await fetch(url, {
      timeout: 5000,
      headers: { 'User-Agent': 'MeguisPet/1.0' }
    })

    if (!response.ok) return null

    const data = await response.json()

    // ViaCEP retorna array ou objeto com "erro": true
    if (Array.isArray(data) && data.length > 0) {
      return data[0] // Primeiro resultado (geralmente centro)
    }

    if (data.erro) return null

    return data as ViaCEPResult

  } catch (error) {
    console.error('Erro ao buscar CEP:', error)
    return null
  }
}

export function montarEndereco(result: ViaCEPResult): string {
  const partes = [
    result.logradouro,
    result.bairro,
    `${result.localidade}/${result.uf}`
  ].filter(Boolean)

  return partes.join(', ')
}
```

### **Parser CSV**

```typescript
// lib/csv-parser.ts

interface CSVRow {
  [key: string]: string
}

export function parseCSV(
  content: string,
  delimiter: string = ';'
): CSVRow[] {
  const lines = content.split(/\r?\n/).filter(line => line.trim())

  if (lines.length < 2) {
    throw new Error('Arquivo vazio ou sem dados')
  }

  // Primeira linha é o header
  const headers = lines[0].split(delimiter).map(h => h.trim())

  // Linhas subsequentes são os dados
  const rows: CSVRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(delimiter)

    const row: CSVRow = {}
    headers.forEach((header, index) => {
      row[header] = values[index]?.trim() || ''
    })

    rows.push(row)
  }

  return rows
}
```

---

## 📚 Casos de Uso

### **Caso 1: Importação Simples (Sucesso Total)**

**Cenário**: Arquivo com 10 clientes, todos válidos

**Passos:**
1. Usuário seleciona arquivo `clientes.txt`
2. Configura tipo como "Cliente" e buscar CEP
3. Sistema analisa: 10 válidos, 0 erros
4. Sistema busca CEP: 10 encontrados
5. Usuário clica em "Importar"
6. Sistema importa os 10 clientes
7. Clientes aparecem na lista e no mapa

**Resultado:**
```
✅ 10 clientes importados com sucesso!
🗺️  10 clientes adicionados ao mapa
```

---

### **Caso 2: Importação com Avisos**

**Cenário**: Arquivo com 20 clientes, alguns sem telefone

**Passos:**
1. Usuário seleciona arquivo
2. Sistema analisa: 18 válidos, 2 avisos (sem telefone)
3. Usuário vê preview com avisos ⚠️
4. Usuário decide importar mesmo assim
5. Sistema importa os 20 clientes

**Resultado:**
```
✅ 20 clientes importados
⚠️  2 sem telefone (revisar depois)
```

---

### **Caso 3: Importação com Erros**

**Cenário**: Arquivo com 15 clientes, 3 com CNPJ inválido

**Passos:**
1. Usuário seleciona arquivo
2. Sistema analisa: 12 válidos, 3 erros (CNPJ inválido)
3. Usuário vê preview com erros ❌ (não selecionáveis)
4. Usuário importa apenas os 12 válidos
5. Sistema importa 12 clientes

**Resultado:**
```
✅ 12 clientes importados
❌ 3 erros (CNPJ inválido)
📄 Baixar relatório de erros
```

---

### **Caso 4: Importação com Duplicatas**

**Cenário**: Arquivo com 25 clientes, 5 já existem no banco

**Passos:**
1. Usuário seleciona arquivo
2. Configura duplicatas como "Ignorar"
3. Sistema analisa: 20 válidos, 5 duplicatas 🔄
4. Preview mostra duplicatas (não selecionadas)
5. Usuário importa apenas os 20 novos
6. Sistema importa 20 clientes

**Resultado:**
```
✅ 20 clientes importados
🔄 5 duplicatas ignoradas
```

**Alternativa**: Se configurar "Atualizar"
```
✅ 20 clientes importados
🔄 5 clientes atualizados
```

---

### **Caso 5: CEP Não Encontrado**

**Cenário**: Arquivo com clientes de cidades pequenas

**Passos:**
1. Usuário seleciona arquivo
2. Sistema busca CEP: 8 encontrados, 2 não encontrados
3. Preview mostra ❌ CEP não encontrado
4. Usuário decide importar mesmo assim
5. Sistema importa com campo CEP vazio

**Resultado:**
```
✅ 10 clientes importados
✅ 8 com CEP
❌ 2 sem CEP (preencher manualmente)
```

---

### **Caso 6: Arquivo com Formato Incorreto**

**Cenário**: Arquivo com delimitador errado (vírgula em vez de ponto e vírgula)

**Passos:**
1. Usuário seleciona arquivo
2. Sistema tenta analisar com `;`
3. Erro: "Arquivo com formato incorreto"
4. Sistema sugere: "Verifique se o separador é `;`"
5. Usuário corrige arquivo e tenta novamente

**Resultado:**
```
❌ Erro ao processar arquivo
💡 Verifique se o separador é ; (ponto e vírgula)
```

---

## 📝 Checklist de Implementação

### **Backend**
- [ ] Criar endpoint `POST /api/clientes/import/preview`
- [ ] Criar endpoint `POST /api/clientes/import/execute`
- [ ] Criar endpoint `GET /api/clientes/import/template`
- [ ] Implementar parser CSV (`lib/csv-parser.ts`)
- [ ] Implementar validação CNPJ/CPF (`lib/cnpj-validator.ts`)
- [ ] Implementar mapeamento Estado → UF (`lib/estado-mapper.ts`)
- [ ] Implementar cliente ViaCEP (`lib/viacep-client.ts`)
- [ ] Implementar cache de CEPs
- [ ] Implementar bulk insert otimizado
- [ ] Implementar geração de relatório
- [ ] Testar com arquivo de exemplo

### **Frontend**
- [ ] Criar modal `ClienteImportModal.tsx`
- [ ] Criar componente `FileUploader.tsx` (drag & drop)
- [ ] Criar componente `ImportConfigForm.tsx`
- [ ] Criar componente `ImportPreviewTable.tsx`
- [ ] Criar componente `ImportResultSummary.tsx`
- [ ] Implementar service `importService.ts`
- [ ] Adicionar botão "Importar Clientes" na página `/clientes`
- [ ] Implementar feedback visual (toast/alert)
- [ ] Implementar atualização automática da lista
- [ ] Integrar com mapa de clientes
- [ ] Testar responsividade mobile
- [ ] Adicionar loading states
- [ ] Adicionar tratamento de erros

### **Testes**
- [ ] Testar importação com arquivo válido
- [ ] Testar importação com erros (CNPJ inválido)
- [ ] Testar importação com duplicatas
- [ ] Testar busca de CEP (sucesso e falha)
- [ ] Testar com arquivo grande (100+ clientes)
- [ ] Testar com caracteres especiais
- [ ] Testar com diferentes encodings (UTF-8, Latin1)
- [ ] Testar cancelamento durante importação

### **Documentação**
- [x] Criar documento de especificação
- [ ] Criar template de exemplo para download
- [ ] Atualizar documentação do usuário
- [ ] Criar vídeo tutorial (opcional)

---

## 🎯 Próximos Passos

1. **Revisão do Plano**: Validar especificações com stakeholders
2. **Desenvolvimento**: Implementar backend e frontend
3. **Testes**: QA completo com diferentes cenários
4. **Deploy**: Subir para produção
5. **Monitoramento**: Acompanhar uso e feedback dos usuários

---

## 📞 Suporte

**Dúvidas ou problemas?**
- Consultar documentação: `/docs/04-features/clientes/`
- Abrir issue no GitHub
- Contatar equipe de desenvolvimento

---

**Última atualização**: 09/12/2025
**Versão do documento**: 1.0.0
**Status**: ✅ Planejamento Completo
