# Guia Completo para Emissão de Nota Fiscal Eletrônica (NFe)

## Índice

1. [Visão Geral](#visão-geral)
2. [Requisitos Obrigatórios](#requisitos-obrigatórios)
3. [Passo a Passo para Credenciamento](#passo-a-passo-para-credenciamento)
4. [Certificado Digital](#certificado-digital)
5. [Ambientes SEFAZ](#ambientes-sefaz)
6. [Integração Técnica](#integração-técnica)
7. [Layout XML NFe 4.0](#layout-xml-nfe-40)
8. [DANFE - Documento Auxiliar](#danfe---documento-auxiliar)
9. [Novidades 2025](#novidades-2025)
10. [Próximos Passos](#próximos-passos)
11. [Links Úteis](#links-úteis)

---

## Visão Geral

A **Nota Fiscal Eletrônica (NFe)** é um documento digital emitido e armazenado eletronicamente para documentar operações e prestações de serviços. A NFe substitui a nota fiscal em papel e possui a mesma validade jurídica.

### Benefícios da NFe
- Redução de custos com papel e impressão
- Maior segurança fiscal
- Redução de erros no preenchimento
- Integração automática com a contabilidade
- Consulta online de notas emitidas
- Sustentabilidade ambiental

---

## Requisitos Obrigatórios

Para começar a emitir NFe, você precisará dos seguintes itens:

### 1. Inscrição Estadual (IE)
- Empresa deve estar cadastrada na Secretaria da Fazenda do seu estado
- Para MEI no RS: desde 2024, a SEFAZ RS concede automaticamente Inscrição Estadual para MEIs com CNAE de ICMS
- Inscrição Estadual é obrigatória no XML da NFe

### 2. Certificado Digital (e-CNPJ)
- Tipo A1 ou A3
- Padrão ICP-Brasil
- Com os dados do CNPJ da empresa
- Validade: A1 (1 ano) ou A3 (1 a 3 anos)

### 3. Software Emissor de NFe
- Sistema próprio desenvolvido internamente, ou
- Software de terceiros (ERPs como SAP, TOTVS, etc.), ou
- Emissores gratuitos disponibilizados pela SEFAZ

### 4. Credenciamento na SEFAZ
- Cadastro no portal da SEFAZ do seu estado
- Autorização para emissão em ambiente de homologação
- Após testes, autorização para ambiente de produção

---

## Passo a Passo para Credenciamento

### Etapa 1: Obtenção do Certificado Digital

1. **Escolha do tipo de certificado:**
   - **A1**: Arquivo digital armazenado no computador (validade 1 ano)
   - **A3**: Dispositivo físico (smart card ou token) - (validade 1 a 3 anos)

2. **Adquira o certificado:**
   - Procure uma Autoridade Certificadora credenciada pela ICP-Brasil
   - Exemplos: Certisign, Serasa, Soluti, Valid, etc.
   - Solicite um certificado e-CNPJ (tipo A1 ou A3)

3. **Instalação:**
   - **A1**: Instale o arquivo .pfx no computador que emitirá a NFe
   - **A3**: Conecte o dispositivo (token/smart card) ao computador e instale os drivers

### Etapa 2: Cadastro na SEFAZ

#### Para Rio Grande do Sul (SEFAZ RS)

1. **Acesse o portal:**
   - Portal NFe RS: https://www.sefaz.rs.gov.br/NFE/NFEindex.aspx
   - Portal SVRS: https://dfe-portal.svrs.rs.gov.br/

2. **Realize o cadastro:**
   - Acesse a área de cadastro de contribuinte
   - Preencha os dados da empresa (CNPJ, Razão Social, IE, etc.)
   - Informe os dados do responsável técnico

3. **Aguarde aprovação:**
   - A SEFAZ analisará o cadastro
   - Você receberá um e-mail com a confirmação

### Etapa 3: Credenciamento no Ambiente de Homologação

1. **Acesse o portal com seu certificado digital:**
   - Entre no portal da SEFAZ RS com o certificado instalado
   - Selecione a opção "NFe" → "Credenciamento"

2. **Solicite acesso ao ambiente de homologação:**
   - Preencha o formulário de credenciamento
   - O ambiente de homologação permite realizar testes sem valor jurídico

3. **Configure seu software emissor:**
   - Configure o software para apontar para os webservices de homologação
   - URLs dos webservices de homologação estarão disponíveis no portal da SEFAZ

### Etapa 4: Realização dos Testes Mínimos

Antes de ser autorizado a emitir NFe em produção, você deve realizar os seguintes testes:

1. **Emissão de NFe:**
   - Emita pelo menos 1 NFe de teste no ambiente de homologação
   - Verifique se o XML está sendo gerado corretamente

2. **Cancelamento de NFe:**
   - Cancele uma NFe emitida em homologação
   - Prazo: até 24 horas após a emissão

3. **Inutilização de Numeração:**
   - Inutilize uma sequência de numeração não utilizada
   - Necessário quando há "pulo" na numeração das notas

4. **Consulta de NFe:**
   - Consulte o status de uma NFe emitida
   - Verifique se a chave de acesso está sendo validada corretamente

5. **Carta de Correção Eletrônica (CCe):**
   - Emita uma CCe para corrigir informações de uma NFe (exceto valores)

### Etapa 5: Credenciamento no Ambiente de Produção

1. **Após concluir os testes:**
   - Solicite o credenciamento no ambiente de produção
   - Acesse novamente o portal da SEFAZ com seu certificado

2. **Preencha o formulário:**
   - Informe que os testes foram realizados com sucesso
   - Aguarde a aprovação final

3. **Configure o software para produção:**
   - Altere as URLs dos webservices de homologação para produção
   - **ATENÇÃO:** Após essa etapa, as notas emitidas terão valor jurídico!

4. **Comece a emitir:**
   - Emita sua primeira NFe oficial
   - Guarde o XML autorizado por no mínimo 5 anos

---

## Certificado Digital

### O que é?

O certificado digital é uma identidade eletrônica que permite assinar digitalmente a NFe, garantindo autenticidade, integridade e validade jurídica do documento.

### Tipos de Certificado

| Característica | A1 | A3 |
|---------------|-----|-----|
| **Armazenamento** | Computador (arquivo .pfx) | Token/Smart Card (dispositivo físico) |
| **Validade** | 1 ano | 1 a 3 anos |
| **Segurança** | Média (pode ser copiado) | Alta (não pode ser copiado) |
| **Mobilidade** | Limitada (vinculado ao PC) | Alta (pode ser usado em qualquer PC) |
| **Integração com ERP** | Fácil (ideal para automação) | Mais complexa (requer dispositivo conectado) |
| **Preço** | Menor | Maior |
| **Uso Recomendado** | Empresas com emissão automatizada | Empresas com alta exigência de segurança |

### Como Adquirir

1. **Escolha uma Autoridade Certificadora (AC):**
   - Certisign, Serasa Experian, Soluti, Valid, SafeWeb, etc.
   - Todas devem ser credenciadas pela ICP-Brasil

2. **Solicite o certificado e-CNPJ:**
   - Acesse o site da AC escolhida
   - Selecione "e-CNPJ A1" ou "e-CNPJ A3"
   - Escolha a validade (1 ano para A1; 1, 2 ou 3 anos para A3)

3. **Realize a validação presencial (videoconferência ou presencial):**
   - A AC exigirá documentos da empresa e do responsável
   - Documentos necessários: CNPJ, contrato social, RG e CPF do responsável

4. **Receba e instale o certificado:**
   - **A1**: Você receberá um link para download do arquivo .pfx
   - **A3**: Você receberá o token ou smart card pelos Correios

### Instalação do Certificado

#### Certificado A1 (.pfx)

1. **Windows:**
   - Clique duas vezes no arquivo .pfx
   - Siga o assistente de importação
   - Defina uma senha forte para proteção
   - Marque "Tornar esta chave exportável" (se necessário)

2. **Configuração no software emissor:**
   - Informe o caminho do arquivo .pfx
   - Informe a senha do certificado

#### Certificado A3 (Token/Smart Card)

1. **Instale os drivers:**
   - Baixe os drivers do fabricante (Safenet, Watchdata, etc.)
   - Instale conforme instruções

2. **Conecte o dispositivo:**
   - Insira o token USB ou smart card no leitor
   - Verifique se o sistema operacional reconheceu o dispositivo

3. **Configuração no software emissor:**
   - Selecione "Certificado A3"
   - O software detectará automaticamente o certificado no dispositivo

---

## Ambientes SEFAZ

A SEFAZ disponibiliza dois ambientes para emissão de NFe:

### 1. Ambiente de Homologação (Testes)

- **Finalidade:** Realizar testes de integração sem valor jurídico
- **Características:**
  - Notas emitidas não têm validade fiscal
  - Permite testar todas as operações (emissão, cancelamento, inutilização, CCe)
  - DANFE deve conter a expressão "SEM VALOR FISCAL"
  - Numeração independente do ambiente de produção

- **Quando usar:**
  - Durante a implementação do sistema emissor
  - Ao realizar atualizações no software
  - Para treinamento de equipe
  - Ao testar novas funcionalidades

- **URLs dos Webservices (Homologação - RS/SVRS):**
  ```
  Autorização: https://nfe-homologacao.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx
  Retorno Autorização: https://nfe-homologacao.svrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx
  Consulta Protocolo: https://nfe-homologacao.svrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx
  Inutilização: https://nfe-homologacao.svrs.rs.gov.br/ws/NfeInutilizacao/NfeInutilizacao4.asmx
  Eventos: https://nfe-homologacao.svrs.rs.gov.br/ws/RecepcaoEvento/RecepcaoEvento4.asmx
  ```

### 2. Ambiente de Produção

- **Finalidade:** Emissão de NFe com validade jurídica
- **Características:**
  - Notas emitidas têm valor fiscal
  - Obrigatório armazenar XML por no mínimo 5 anos
  - Numeração sequencial obrigatória
  - Cancelamento permitido em até 24 horas

- **Quando usar:**
  - Após aprovação no credenciamento
  - Para emitir notas fiscais oficiais da empresa

- **URLs dos Webservices (Produção - RS/SVRS):**
  ```
  Autorização: https://nfe.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx
  Retorno Autorização: https://nfe.svrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx
  Consulta Protocolo: https://nfe.svrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx
  Inutilização: https://nfe.svrs.rs.gov.br/ws/NfeInutilizacao/NfeInutilizacao4.asmx
  Eventos: https://nfe.svrs.rs.gov.br/ws/RecepcaoEvento/RecepcaoEvento4.asmx
  ```

### 3. Ambiente de Contingência

- **Finalidade:** Emitir NFe quando a SEFAZ está indisponível
- **Tipos:**
  - **SVC (SEFAZ Virtual de Contingência):** Serviço oferecido pela Receita Federal
  - **EPEC (Evento Prévio de Emissão em Contingência):** Registro prévio antes da emissão offline

- **Quando usar:**
  - Quando o webservice da SEFAZ está fora do ar
  - Problemas de conexão com a internet
  - Manutenção programada da SEFAZ

---

## Integração Técnica

### Arquitetura de Comunicação

A comunicação entre o sistema emissor e a SEFAZ é feita através de **webservices SOAP** (Simple Object Access Protocol), utilizando arquivos **XML** (Extensible Markup Language).

```
┌─────────────────┐        ┌──────────────┐        ┌─────────────┐
│  Sistema        │  XML   │  Webservice  │  XML   │   SEFAZ     │
│  Emissor NFe    │───────>│  SOAP        │───────>│   (Servidor)│
│  (Client)       │<───────│  (Transport) │<───────│             │
└─────────────────┘        └──────────────┘        └─────────────┘
```

### Principais Webservices

1. **NFeAutorizacao4:** Envio de lote de NFe para autorização
2. **NFeRetAutorizacao4:** Consulta do resultado do processamento do lote
3. **NFeConsultaProtocolo4:** Consulta de protocolo de uma NFe específica
4. **NFeInutilizacao4:** Inutilização de numeração de NFe
5. **RecepcaoEvento4:** Registro de eventos (cancelamento, CCe, manifestação)

### Protocolo SOAP

O SOAP é um protocolo baseado em XML para troca de mensagens estruturadas. A comunicação segue o padrão SOAP 1.2.

#### Estrutura de uma Requisição SOAP

```xml
<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
               xmlns:nfe="http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4">
  <soap:Header/>
  <soap:Body>
    <nfe:nfeDadosMsg>
      <!-- XML da NFe aqui -->
    </nfe:nfeDadosMsg>
  </soap:Body>
</soap:Envelope>
```

#### Estrutura de uma Resposta SOAP

```xml
<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
  <soap:Body>
    <nfeResultMsg>
      <!-- XML de retorno com status e protocolo -->
    </nfeResultMsg>
  </soap:Body>
</soap:Envelope>
```

### Fluxo de Autorização de NFe

```
1. Sistema gera XML da NFe
   ↓
2. Assina digitalmente com certificado (XML Signature)
   ↓
3. Envia via SOAP para webservice NFeAutorizacao4
   ↓
4. SEFAZ valida o XML (schema, regras de negócio, assinatura)
   ↓
5. SEFAZ retorna recibo de lote
   ↓
6. Sistema consulta resultado via NFeRetAutorizacao4
   ↓
7. SEFAZ retorna protocolo de autorização ou rejeição
   ↓
8. Sistema armazena XML autorizado + protocolo
   ↓
9. Gera DANFE (PDF) para impressão/envio ao cliente
```

### Validação de Schema XML

Antes de enviar a NFe, o sistema deve validar o XML contra os schemas XSD (XML Schema Definition) oficiais disponibilizados pela SEFAZ.

**Schemas NFe 4.0:**
- `nfe_v4.00.xsd` - Estrutura da NFe
- `envNFe_v4.00.xsd` - Envio de lote de NFe
- `retEnvNFe_v4.00.xsd` - Retorno do envio
- `consReciNFe_v4.00.xsd` - Consulta recibo
- `retConsReciNFe_v4.00.xsd` - Retorno da consulta
- E outros para eventos, inutilização, etc.

**Download dos schemas:**
https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=BMPFMBoln3w=

### Assinatura Digital XML

A NFe deve ser assinada digitalmente usando o padrão **XML Signature (XMLDSig)** com o certificado digital e-CNPJ.

**Elementos a serem assinados:**
- Tag `<infNFe>` - Informações da NFe
- Tag `<infEvento>` - Informações do evento (cancelamento, CCe)
- Tag `<infInut>` - Informações de inutilização

**Algoritmos:**
- Canonicalização: `http://www.w3.org/TR/2001/REC-xml-c14n-20010315`
- Assinatura: `http://www.w3.org/2000/09/xmldsig#rsa-sha1` ou SHA-256
- Transformação: `http://www.w3.org/2000/09/xmldsig#enveloped-signature`

---

## Layout XML NFe 4.0

### Estrutura Básica do XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
  <infNFe versao="4.00" Id="NFe[chave de acesso]">
    <ide><!-- Identificação da NFe --></ide>
    <emit><!-- Dados do Emitente --></emit>
    <dest><!-- Dados do Destinatário --></dest>
    <det nItem="1"><!-- Detalhamento de Produtos/Serviços --></det>
    <total><!-- Totais da NFe --></total>
    <transp><!-- Informações de Transporte --></transp>
    <pag><!-- Formas de Pagamento --></pag>
    <infAdic><!-- Informações Adicionais --></infAdic>
  </infNFe>
  <Signature><!-- Assinatura Digital --></Signature>
</NFe>
```

### Principais Grupos e Campos

#### Grupo IDE - Identificação da NFe

```xml
<ide>
  <cUF>43</cUF>                      <!-- Código UF: 43 = Rio Grande do Sul -->
  <cNF>12345678</cNF>                <!-- Código numérico aleatório -->
  <natOp>Venda de Mercadoria</natOp> <!-- Natureza da Operação -->
  <mod>55</mod>                       <!-- Modelo: 55 = NFe -->
  <serie>1</serie>                    <!-- Série da NFe -->
  <nNF>123</nNF>                      <!-- Número da NFe -->
  <dhEmi>2025-11-21T10:30:00-03:00</dhEmi> <!-- Data e Hora de Emissão -->
  <tpNF>1</tpNF>                      <!-- Tipo: 0=Entrada, 1=Saída -->
  <idDest>1</idDest>                  <!-- Destino: 1=Interna, 2=Interestadual, 3=Exterior -->
  <cMunFG>4304606</cMunFG>            <!-- Município de Emissão (Caxias do Sul) -->
  <tpImp>1</tpImp>                    <!-- Tipo Impressão: 1=DANFE normal -->
  <tpEmis>1</tpEmis>                  <!-- Tipo Emissão: 1=Normal -->
  <tpAmb>1</tpAmb>                    <!-- Ambiente: 1=Produção, 2=Homologação -->
  <finNFe>1</finNFe>                  <!-- Finalidade: 1=Normal, 2=Complementar, 3=Ajuste, 4=Devolução -->
  <indFinal>1</indFinal>              <!-- Consumidor Final: 0=Não, 1=Sim -->
  <indPres>1</indPres>                <!-- Presença: 1=Presencial, 2=Internet, etc. -->
</ide>
```

#### Grupo EMIT - Emitente

```xml
<emit>
  <CNPJ>12345678000195</CNPJ>         <!-- CNPJ do Emitente -->
  <xNome>MEGUISPET LTDA</xNome>       <!-- Razão Social -->
  <xFant>MeguisPet</xFant>            <!-- Nome Fantasia -->
  <enderEmit>
    <xLgr>Rua Exemplo</xLgr>          <!-- Logradouro -->
    <nro>123</nro>                     <!-- Número -->
    <xBairro>Centro</xBairro>          <!-- Bairro -->
    <cMun>4304606</cMun>               <!-- Código Município (Caxias do Sul) -->
    <xMun>Caxias do Sul</xMun>         <!-- Nome do Município -->
    <UF>RS</UF>                        <!-- UF -->
    <CEP>95010000</CEP>                <!-- CEP -->
    <cPais>1058</cPais>                <!-- Código País (1058 = Brasil) -->
    <xPais>Brasil</xPais>              <!-- Nome do País -->
  </enderEmit>
  <IE>1234567890</IE>                  <!-- Inscrição Estadual -->
  <CRT>1</CRT>                         <!-- Regime Tributário: 1=Simples Nacional -->
</emit>
```

#### Grupo DEST - Destinatário

```xml
<dest>
  <CNPJ>98765432000156</CNPJ>         <!-- CNPJ do Destinatário (ou CPF) -->
  <xNome>CLIENTE EXEMPLO LTDA</xNome> <!-- Razão Social -->
  <enderDest>
    <xLgr>Av Principal</xLgr>
    <nro>456</nro>
    <xBairro>Bairro Novo</xBairro>
    <cMun>4304606</cMun>
    <xMun>Caxias do Sul</xMun>
    <UF>RS</UF>
    <CEP>95020000</CEP>
    <cPais>1058</cPais>
    <xPais>Brasil</xPais>
  </enderDest>
  <indIEDest>1</indIEDest>             <!-- Indicador IE: 1=Contribuinte, 9=Não contribuinte -->
  <IE>9876543210</IE>                  <!-- Inscrição Estadual (se contribuinte) -->
</dest>
```

#### Grupo DET - Detalhamento de Produtos

```xml
<det nItem="1">
  <prod>
    <cProd>001</cProd>                 <!-- Código do Produto -->
    <cEAN>7891234567890</cEAN>         <!-- Código de Barras EAN -->
    <xProd>Ração Premium para Cães</xProd> <!-- Descrição do Produto -->
    <NCM>23091000</NCM>                <!-- NCM (Nomenclatura Comum do Mercosul) -->
    <CFOP>5102</CFOP>                  <!-- CFOP (Código Fiscal de Operação) -->
    <uCom>UN</uCom>                    <!-- Unidade Comercial -->
    <qCom>10.0000</qCom>               <!-- Quantidade Comercial -->
    <vUnCom>50.00</vUnCom>             <!-- Valor Unitário -->
    <vProd>500.00</vProd>              <!-- Valor Total do Produto -->
    <cEANTrib>7891234567890</cEANTrib> <!-- EAN Tributável -->
    <uTrib>UN</uTrib>                  <!-- Unidade Tributável -->
    <qTrib>10.0000</qTrib>             <!-- Quantidade Tributável -->
    <vUnTrib>50.00</vUnTrib>           <!-- Valor Unitário Tributável -->
    <indTot>1</indTot>                 <!-- Indica se compõe total: 1=Sim -->
  </prod>
  <imposto>
    <ICMS>
      <ICMSSN102>                       <!-- ICMS pelo Simples Nacional -->
        <orig>0</orig>                  <!-- Origem: 0=Nacional -->
        <CSOSN>102</CSOSN>              <!-- CSOSN: 102=Tributada sem permissão de crédito -->
      </ICMSSN102>
    </ICMS>
    <PIS>
      <PISNT>
        <CST>07</CST>                   <!-- PIS: 07=Operação isenta -->
      </PISNT>
    </PIS>
    <COFINS>
      <COFINSNT>
        <CST>07</CST>                   <!-- COFINS: 07=Operação isenta -->
      </COFINSNT>
    </COFINS>
  </imposto>
</det>
```

#### Grupo TOTAL - Totais da NFe

```xml
<total>
  <ICMSTot>
    <vBC>0.00</vBC>         <!-- Base de Cálculo ICMS -->
    <vICMS>0.00</vICMS>     <!-- Valor ICMS -->
    <vICMSDeson>0.00</vICMSDeson> <!-- Valor ICMS Desonerado -->
    <vFCP>0.00</vFCP>       <!-- Valor do Fundo de Combate à Pobreza -->
    <vBCST>0.00</vBCST>     <!-- Base de Cálculo ICMS ST -->
    <vST>0.00</vST>         <!-- Valor ICMS ST -->
    <vProd>500.00</vProd>   <!-- Valor Total dos Produtos -->
    <vFrete>0.00</vFrete>   <!-- Valor do Frete -->
    <vSeg>0.00</vSeg>       <!-- Valor do Seguro -->
    <vDesc>0.00</vDesc>     <!-- Valor do Desconto -->
    <vII>0.00</vII>         <!-- Valor do II (Imposto de Importação) -->
    <vIPI>0.00</vIPI>       <!-- Valor do IPI -->
    <vPIS>0.00</vPIS>       <!-- Valor do PIS -->
    <vCOFINS>0.00</vCOFINS> <!-- Valor do COFINS -->
    <vOutro>0.00</vOutro>   <!-- Outras Despesas -->
    <vNF>500.00</vNF>       <!-- Valor Total da NFe -->
  </ICMSTot>
</total>
```

#### Grupo PAG - Forma de Pagamento (OBRIGATÓRIO NFe 4.0)

```xml
<pag>
  <detPag>
    <tPag>01</tPag>         <!-- Forma: 01=Dinheiro, 03=Cartão Crédito, etc. -->
    <vPag>500.00</vPag>     <!-- Valor do Pagamento -->
  </detPag>
</pag>
```

### Chave de Acesso

A **Chave de Acesso** é um código de 44 dígitos que identifica unicamente a NFe:

```
Formato: cUF + AAMM + CNPJ + mod + serie + nNF + tpEmis + cNF + DV

Exemplo: 43251112345678000195550010000001231234567890
```

**Composição:**
- `cUF` (2 dígitos): Código da UF (43 = RS)
- `AAMM` (4 dígitos): Ano e Mês de emissão (2511 = novembro/2025)
- `CNPJ` (14 dígitos): CNPJ do emitente
- `mod` (2 dígitos): Modelo (55 = NFe)
- `serie` (3 dígitos): Série da NFe
- `nNF` (9 dígitos): Número da NFe
- `tpEmis` (1 dígito): Tipo de emissão (1 = Normal)
- `cNF` (8 dígitos): Código numérico aleatório
- `DV` (1 dígito): Dígito verificador (módulo 11)

---

## DANFE - Documento Auxiliar

### O que é DANFE?

O **DANFE** (Documento Auxiliar da Nota Fiscal Eletrônica) é a representação gráfica simplificada da NFe, impressa para acompanhar a mercadoria durante o transporte.

**Importante:**
- O DANFE **não é** a Nota Fiscal Eletrônica
- O DANFE é apenas um documento **auxiliar** que contém as informações principais da NFe
- A NFe oficial é o arquivo XML autorizado pela SEFAZ

### Informações no DANFE

O DANFE deve conter:
- **Chave de acesso** (44 dígitos)
- **Código de barras** da chave de acesso
- **QR Code** (para NFCe ou consulta online)
- Dados do emitente e destinatário
- Discriminação dos produtos/serviços
- Valores totais
- Dados de transporte
- Protocolo de autorização

### Tipos de DANFE

1. **DANFE em Retrato (padrão):**
   - Formato A4 vertical
   - Utilizado para a maioria das operações

2. **DANFE em Paisagem:**
   - Formato A4 horizontal
   - Pode ser configurado conforme necessidade

3. **DANFE Simplificado:**
   - Versão reduzida para operações específicas

### Layout do DANFE

O layout oficial do DANFE é definido pelo **Manual de Orientação do Contribuinte** disponível no portal da NFe.

**Campos obrigatórios:**
- Identificação do emitente (logo, razão social, endereço, IE, CNPJ)
- Chave de acesso + código de barras
- Natureza da operação
- Protocolo de autorização
- Dados do destinatário
- Relação de produtos com NCM, CFOP, CST, valores
- Cálculo do imposto
- Dados do transportador
- Observações e informações adicionais

**Expressões obrigatórias:**
- Ambiente de homologação: "**SEM VALOR FISCAL**"
- Contingência: "**DANFE EM CONTINGÊNCIA**"

### Geração do DANFE

O DANFE pode ser gerado de várias formas:
- Bibliotecas de relatório (JasperReports, FastReport, etc.)
- Componentes específicos para NFe (ACBr, NFeLib, etc.)
- APIs de terceiros especializadas em geração de DANFE

---

## Novidades 2025

### 1. Reforma Tributária - IBS/CBS

A partir de 2025, com a Reforma Tributária, novos campos relacionados ao **IBS** (Imposto sobre Bens e Serviços) e **CBS** (Contribuição sobre Bens e Serviços) podem ser exigidos no XML.

**Nota Técnica 2025.001:**
- Se o grupo IBS/CBS for informado, todas as regras de validação da NT 2025.001 serão aplicadas
- Acompanhe as atualizações no portal da NFe

### 2. Inscrição Estadual Obrigatória para MEI (RS)

**SEFAZ RS:**
- Desde 2024, a SEFAZ RS concede automaticamente Inscrição Estadual para MEIs com CNAE de ICMS
- A Inscrição Estadual tornou-se obrigatória no XML da NFe
- Verifique se sua IE foi gerada automaticamente no portal da Receita Estadual RS

### 3. Produtores Rurais

A obrigatoriedade da emissão de NFe e NFCe por **produtores rurais** foi adiada para **2 de janeiro de 2025**.

### 4. Versão 4.0 Consolidada

A versão 4.0 da NFe está consolidada e é obrigatória em todos os estados. A versão anterior (3.10) foi descontinuada.

**Principais mudanças da versão 4.0:**
- Grupo de Pagamento (`<pag>`) tornou-se obrigatório
- Novos campos para o FCP (Fundo de Combate à Pobreza)
- Suporte a operações interestaduais com partilha de ICMS
- Melhorias na validação de GTIN/EAN

---

## Próximos Passos

Agora que você conhece o processo completo, siga este roteiro para implementar a emissão de NFe no MeguisPet:

### 1. Preparação (1-2 semanas)

- [ ] Adquirir certificado digital e-CNPJ (A1 ou A3)
- [ ] Verificar se a empresa possui Inscrição Estadual ativa
- [ ] Cadastrar a empresa no portal da SEFAZ RS
- [ ] Definir qual software emissor será utilizado (desenvolver interno ou contratar terceiros)

### 2. Desenvolvimento/Configuração (2-4 semanas)

- [ ] Escolher biblioteca/componente para geração de XML e DANFE
  - Opções: ACBr (Delphi/Lazarus), NFeLib (.NET), node-nfe (Node.js), python-nfe (Python)
- [ ] Implementar geração de XML NFe 4.0 conforme layout oficial
- [ ] Implementar assinatura digital com certificado
- [ ] Implementar comunicação SOAP com webservices da SEFAZ
- [ ] Implementar validação de schema XSD
- [ ] Desenvolver geração de DANFE (PDF)
- [ ] Criar rotinas de armazenamento de XMLs autorizados

### 3. Testes em Homologação (1-2 semanas)

- [ ] Configurar ambiente de homologação (URLs de teste)
- [ ] Realizar testes de emissão de NFe
- [ ] Realizar testes de cancelamento
- [ ] Realizar testes de inutilização de numeração
- [ ] Realizar testes de consulta de NFe
- [ ] Realizar testes de Carta de Correção Eletrônica (CCe)
- [ ] Validar geração do DANFE
- [ ] Documentar possíveis erros e ajustar o código

### 4. Credenciamento em Produção (1 semana)

- [ ] Solicitar credenciamento no ambiente de produção na SEFAZ RS
- [ ] Aguardar aprovação
- [ ] Configurar URLs de produção no sistema
- [ ] Realizar primeira emissão em produção (teste controlado)

### 5. Operação e Monitoramento (contínuo)

- [ ] Monitorar status dos webservices da SEFAZ
- [ ] Implementar rotina de backup dos XMLs autorizados
- [ ] Treinar equipe para operação do sistema
- [ ] Configurar contingência (SVC/EPEC) para casos de indisponibilidade
- [ ] Manter atualização das Notas Técnicas e schemas XML

### Integração com o Sistema MeguisPet

Para integrar a emissão de NFe ao sistema MeguisPet (Next.js + Supabase), considere:

1. **Backend (API Routes Next.js):**
   - Criar serviço de emissão de NFe em `pages/api/nfe/`
   - Endpoints: `/api/nfe/emitir`, `/api/nfe/cancelar`, `/api/nfe/consultar`

2. **Armazenamento:**
   - Criar tabela `nfe` no Supabase para armazenar metadados
   - Armazenar XMLs autorizados no Supabase Storage ou filesystem

3. **Frontend:**
   - Criar página de listagem de NFe em `pages/nfe.tsx`
   - Criar modal para emissão de NFe a partir de uma venda
   - Exibir status da NFe (autorizada, cancelada, rejeitada)
   - Permitir download do XML e DANFE (PDF)

4. **Bibliotecas Node.js recomendadas:**
   - `node-forge`: Assinatura digital
   - `xmlbuilder2`: Construção de XML
   - `soap`: Cliente SOAP para webservices
   - `pdfkit` ou `puppeteer`: Geração de DANFE em PDF

---

## Links Úteis

### Portais Oficiais

- **Portal Nacional da NFe:** https://www.nfe.fazenda.gov.br/
- **SEFAZ RS - NFe:** https://www.sefaz.rs.gov.br/NFE/NFEindex.aspx
- **Portal SVRS (Sistema Virtual RS):** https://dfe-portal.svrs.rs.gov.br/

### Documentação Técnica

- **Manual de Integração do Contribuinte:** https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=d/NN9SSgick=
- **Schemas XML NFe 4.0:** https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=BMPFMBoln3w=
- **Notas Técnicas:** https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=/fwLvLUSmU8=

### Bibliotecas e Componentes

- **ACBr (Delphi/Lazarus):** http://www.projetoacbr.com.br/
- **NFeLib (.NET):** https://github.com/adeniltonbs/nfe
- **node-nfe (Node.js):** https://github.com/nfe/node-nfe (exemplo)
- **python-nfe (Python):** https://github.com/TadaSoftware/PyNFe

### Autoridades Certificadoras

- **Certisign:** https://www.certisign.com.br/
- **Serasa Experian:** https://serasa.certificadodigital.com.br/
- **Soluti:** https://www.soluti.com.br/
- **Valid:** https://www.valid.com/

### Suporte e Comunidades

- **SPED Brasil (Fórum):** https://www.spedbrasil.net/
- **Stack Overflow em Português:** https://pt.stackoverflow.com/ (tag: nfe)

---

## Considerações Finais

A emissão de NFe é um processo técnico e burocrático, mas essencial para a regularidade fiscal da empresa. Siga cada etapa com atenção, realize testes exaustivos no ambiente de homologação e mantenha-se sempre atualizado com as mudanças nas legislações e Notas Técnicas.

**Dicas importantes:**
- Sempre valide o XML contra os schemas XSD antes de enviar para a SEFAZ
- Armazene os XMLs autorizados por **no mínimo 5 anos** (obrigação legal)
- Implemente rotinas de backup automático dos XMLs
- Monitore os status dos webservices da SEFAZ (podem ficar indisponíveis)
- Implemente contingência para casos de indisponibilidade
- Mantenha o certificado digital sempre válido e renovado antes do vencimento
- Teste todas as operações (emissão, cancelamento, CCe, inutilização) antes de ir para produção

**Próximo documento sugerido:**
- `IMPLEMENTACAO_NFE.md`: Guia técnico de implementação da emissão de NFe no sistema MeguisPet (Next.js + Node.js)

---

**Última atualização:** 21/11/2025
**Versão do documento:** 1.0
**Responsável:** Equipe MeguisPet
