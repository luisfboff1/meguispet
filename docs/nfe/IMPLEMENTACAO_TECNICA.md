# Implementação Técnica - NFe no MeguisPet

## Visão Geral

A emissão de NFe será **integrada diretamente** ao sistema MeguisPet, sem necessidade de software externo. Toda a comunicação com a SEFAZ será feita através de APIs REST no backend Next.js.

**Você NÃO precisa:**
- ❌ Baixar programa externo
- ❌ Instalar software de terceiros
- ❌ Sair do sistema MeguisPet para emitir nota

**Você VAI fazer:**
- ✅ Instalar bibliotecas Node.js no projeto
- ✅ Criar APIs em `pages/api/nfe/`
- ✅ Integrar com a interface existente
- ✅ Emitir NFe direto da tela de vendas

---

## Arquitetura da Solução

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Vendas      │  │  NFe List    │  │  NFe Modal   │      │
│  │  (Emitir)    │  │  (Consulta)  │  │  (Detalhes)  │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                            │                                 │
└────────────────────────────┼─────────────────────────────────┘
                             │ HTTP/REST
┌────────────────────────────┼─────────────────────────────────┐
│                            ▼                                 │
│              Backend API Routes (Next.js)                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  /api/nfe/emitir    - Emissão de NFe                │   │
│  │  /api/nfe/cancelar  - Cancelamento                  │   │
│  │  /api/nfe/consultar - Consulta de NFe               │   │
│  │  /api/nfe/danfe     - Geração de DANFE (PDF)        │   │
│  │  /api/nfe/inutilizar - Inutilização de numeração    │   │
│  └──────────────┬────────────────────────────────────────┘   │
│                 │                                            │
│  ┌──────────────▼────────────────────────────────────────┐   │
│  │         Serviço NFe (services/nfeService.ts)         │   │
│  │  - Geração de XML                                    │   │
│  │  - Assinatura digital                                │   │
│  │  - Comunicação SOAP                                  │   │
│  │  - Validação de schema                               │   │
│  └──────────────┬────────────────────────────────────────┘   │
└─────────────────┼──────────────────────────────────────────┘
                  │ SOAP/XML
┌─────────────────▼──────────────────────────────────────────┐
│              Webservices SEFAZ (SOAP)                       │
│  - NFeAutorizacao4                                          │
│  - NFeRetAutorizacao4                                       │
│  - NFeConsultaProtocolo4                                    │
│  - RecepcaoEvento4                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Bibliotecas Necessárias

### Instalação

```bash
pnpm install node-forge xmlbuilder2 axios fast-xml-parser
pnpm install --save-dev @types/node-forge
```

### Descrição das Bibliotecas

| Biblioteca | Finalidade |
|-----------|------------|
| `node-forge` | Assinatura digital do XML com certificado |
| `xmlbuilder2` | Construção do XML da NFe |
| `axios` | Comunicação HTTP com webservices SOAP |
| `fast-xml-parser` | Parse do XML de resposta da SEFAZ |

**Opcional para DANFE (PDF):**
```bash
pnpm install pdfkit
pnpm install --save-dev @types/pdfkit
```

---

## Estrutura de Arquivos

```
pages/
  api/
    nfe/
      emitir.ts          # POST - Emite NFe
      cancelar.ts        # POST - Cancela NFe
      consultar.ts       # GET  - Consulta NFe
      danfe.ts           # GET  - Gera PDF DANFE
      inutilizar.ts      # POST - Inutiliza numeração

services/
  nfeService.ts          # Lógica de NFe (geração XML, SOAP, etc.)
  nfeXmlBuilder.ts       # Construção do XML NFe
  nfeSoapClient.ts       # Cliente SOAP para SEFAZ
  nfeSignature.ts        # Assinatura digital XML
  danfeGenerator.ts      # Geração de DANFE (PDF)

types/
  nfe.ts                 # Tipos TypeScript para NFe

database/
  migrations/
    018_create_nfe_table.sql  # Tabela para armazenar NFe

public/
  certificados/
    certificado.pfx      # Certificado A1 (NUNCA commitar!)
```

---

## Banco de Dados - Tabela NFe

### Migration SQL

```sql
-- database/migrations/018_create_nfe_table.sql

CREATE TABLE IF NOT EXISTS nfe (
  id SERIAL PRIMARY KEY,
  chave_acesso VARCHAR(44) UNIQUE NOT NULL,
  numero INTEGER NOT NULL,
  serie INTEGER NOT NULL DEFAULT 1,
  modelo VARCHAR(2) NOT NULL DEFAULT '55',
  tipo_emissao INTEGER NOT NULL DEFAULT 1,
  tipo_ambiente INTEGER NOT NULL DEFAULT 2, -- 1=Produção, 2=Homologação

  -- Relacionamento
  venda_id INTEGER REFERENCES vendas(id) ON DELETE SET NULL,
  cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,

  -- Datas
  data_emissao TIMESTAMP NOT NULL DEFAULT NOW(),
  data_autorizacao TIMESTAMP,
  data_cancelamento TIMESTAMP,

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'pendente', -- pendente, autorizada, rejeitada, cancelada
  protocolo_autorizacao VARCHAR(50),
  protocolo_cancelamento VARCHAR(50),

  -- Valores
  valor_total DECIMAL(10, 2) NOT NULL,
  valor_produtos DECIMAL(10, 2) NOT NULL,
  valor_icms DECIMAL(10, 2) DEFAULT 0,
  valor_desconto DECIMAL(10, 2) DEFAULT 0,

  -- XMLs
  xml_enviado TEXT,              -- XML enviado para SEFAZ
  xml_autorizado TEXT,           -- XML autorizado pela SEFAZ
  xml_cancelamento TEXT,         -- XML de cancelamento

  -- Informações adicionais
  natureza_operacao VARCHAR(100) NOT NULL DEFAULT 'Venda de Mercadoria',
  cfop VARCHAR(4) NOT NULL DEFAULT '5102',
  motivo_rejeicao TEXT,
  codigo_status_sefaz VARCHAR(10),
  mensagem_sefaz TEXT,

  -- Contingência
  justificativa_contingencia TEXT,

  -- Auditoria
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by INTEGER REFERENCES usuarios(id),

  CONSTRAINT nfe_numero_serie_unique UNIQUE(numero, serie, tipo_ambiente)
);

-- Índices
CREATE INDEX idx_nfe_chave_acesso ON nfe(chave_acesso);
CREATE INDEX idx_nfe_venda_id ON nfe(venda_id);
CREATE INDEX idx_nfe_cliente_id ON nfe(cliente_id);
CREATE INDEX idx_nfe_status ON nfe(status);
CREATE INDEX idx_nfe_data_emissao ON nfe(data_emissao);

-- Sequence para numeração
CREATE SEQUENCE IF NOT EXISTS nfe_numero_seq START WITH 1;

-- Trigger para updated_at
CREATE TRIGGER update_nfe_updated_at
  BEFORE UPDATE ON nfe
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE nfe IS 'Armazena as Notas Fiscais Eletrônicas emitidas';
COMMENT ON COLUMN nfe.tipo_ambiente IS '1=Produção, 2=Homologação';
COMMENT ON COLUMN nfe.status IS 'pendente, autorizada, rejeitada, cancelada';
```

---

## Configuração do Certificado Digital

### 1. Armazenamento do Certificado A1

**IMPORTANTE:** O certificado deve ser armazenado de forma segura e NUNCA deve ser commitado no Git!

```bash
# Criar diretório de certificados (fora do projeto)
mkdir C:\certificados\meguispet

# Copiar certificado.pfx para lá
# Caminho: C:\certificados\meguispet\certificado.pfx
```

### 2. Variáveis de Ambiente

Adicione ao Doppler (ou `.env.local`):

```bash
# NFe - Certificado Digital
NFE_CERTIFICADO_PATH=C:\certificados\meguispet\certificado.pfx
NFE_CERTIFICADO_PASSWORD=sua_senha_segura

# NFe - Configurações
NFE_AMBIENTE=2                    # 1=Produção, 2=Homologação
NFE_SERIE=1                       # Série da NFe
NFE_UF=RS                         # Estado
NFE_CODIGO_UF=43                  # Código RS
NFE_CODIGO_MUNICIPIO=4304606      # Caxias do Sul

# NFe - Emitente (dados da empresa)
NFE_EMITENTE_CNPJ=12345678000195
NFE_EMITENTE_RAZAO_SOCIAL=MEGUISPET LTDA
NFE_EMITENTE_NOME_FANTASIA=MeguisPet
NFE_EMITENTE_IE=1234567890
NFE_EMITENTE_REGIME_TRIBUTARIO=1  # 1=Simples Nacional
NFE_EMITENTE_ENDERECO_LOGRADOURO=Rua Exemplo
NFE_EMITENTE_ENDERECO_NUMERO=123
NFE_EMITENTE_ENDERECO_BAIRRO=Centro
NFE_EMITENTE_ENDERECO_CEP=95010000
NFE_EMITENTE_ENDERECO_MUNICIPIO=Caxias do Sul
```

---

## Implementação do Serviço NFe

### 1. Tipos TypeScript

```typescript
// types/nfe.ts

export interface NFeConfig {
  ambiente: 1 | 2 // 1=Produção, 2=Homologação
  certificadoPath: string
  certificadoPassword: string
  serie: number
  uf: string
  codigoUF: number
  codigoMunicipio: number
}

export interface NFeEmitente {
  cnpj: string
  razaoSocial: string
  nomeFantasia: string
  inscricaoEstadual: string
  regimeTributario: 1 | 2 | 3 // 1=Simples, 2=Normal, 3=MEI
  endereco: {
    logradouro: string
    numero: string
    complemento?: string
    bairro: string
    municipio: string
    uf: string
    cep: string
  }
}

export interface NFeDestinatario {
  tipo: 'F' | 'J' // F=Física, J=Jurídica
  cpfCnpj: string
  nome: string
  inscricaoEstadual?: string
  indicadorIE: 1 | 2 | 9 // 1=Contribuinte, 2=Isento, 9=Não contribuinte
  endereco: {
    logradouro: string
    numero: string
    complemento?: string
    bairro: string
    municipio: string
    uf: string
    cep: string
  }
  email?: string
  telefone?: string
}

export interface NFeProduto {
  codigo: string
  descricao: string
  ncm: string
  cfop: string
  unidadeComercial: string
  quantidadeComercial: number
  valorUnitario: number
  valorTotal: number
  ean?: string
  origem: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 // Origem da mercadoria
  cst?: string // CST/CSOSN
}

export interface NFePagamento {
  tipo: '01' | '02' | '03' | '04' | '05' // 01=Dinheiro, 03=Cartão Crédito, etc.
  valor: number
}

export interface NFeEmissaoRequest {
  vendaId: number
  destinatario: NFeDestinatario
  produtos: NFeProduto[]
  pagamentos: NFePagamento[]
  naturezaOperacao?: string
  informacoesComplementares?: string
}

export interface NFeEmissaoResponse {
  success: boolean
  chaveAcesso?: string
  protocolo?: string
  dataAutorizacao?: string
  xml?: string
  mensagem?: string
  erro?: string
}

export interface NFeCancelamentoRequest {
  chaveAcesso: string
  protocolo: string
  justificativa: string // Mínimo 15 caracteres
}
```

### 2. Serviço de Geração de XML

```typescript
// services/nfeXmlBuilder.ts

import { create } from 'xmlbuilder2'
import { NFeEmitente, NFeDestinatario, NFeProduto, NFePagamento } from '@/types/nfe'

export class NFeXmlBuilder {

  static gerarChaveAcesso(params: {
    codigoUF: number
    anoMes: string // AAMM
    cnpj: string
    modelo: string
    serie: number
    numero: number
    tipoEmissao: number
    codigoNumerico: number
  }): string {
    const { codigoUF, anoMes, cnpj, modelo, serie, numero, tipoEmissao, codigoNumerico } = params

    const chave =
      codigoUF.toString().padStart(2, '0') +
      anoMes +
      cnpj.padStart(14, '0') +
      modelo.padStart(2, '0') +
      serie.toString().padStart(3, '0') +
      numero.toString().padStart(9, '0') +
      tipoEmissao.toString() +
      codigoNumerico.toString().padStart(8, '0')

    const dv = this.calcularDigitoVerificador(chave)
    return chave + dv
  }

  static calcularDigitoVerificador(chave: string): string {
    let soma = 0
    let peso = 2

    for (let i = chave.length - 1; i >= 0; i--) {
      soma += parseInt(chave[i]) * peso
      peso = peso === 9 ? 2 : peso + 1
    }

    const resto = soma % 11
    const dv = resto === 0 || resto === 1 ? 0 : 11 - resto
    return dv.toString()
  }

  static construirXML(params: {
    chaveAcesso: string
    numero: number
    serie: number
    dataEmissao: Date
    emitente: NFeEmitente
    destinatario: NFeDestinatario
    produtos: NFeProduto[]
    pagamentos: NFePagamento[]
    naturezaOperacao: string
    ambiente: 1 | 2
  }): string {
    const { chaveAcesso, numero, serie, dataEmissao, emitente, destinatario, produtos, pagamentos, naturezaOperacao, ambiente } = params

    // Calcula totais
    const valorTotalProdutos = produtos.reduce((sum, p) => sum + p.valorTotal, 0)
    const valorTotalNF = valorTotalProdutos

    const doc = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('NFe', { xmlns: 'http://www.portalfiscal.inf.br/nfe' })
        .ele('infNFe', { versao: '4.00', Id: `NFe${chaveAcesso}` })

          // IDE - Identificação
          .ele('ide')
            .ele('cUF').txt(emitente.endereco.uf === 'RS' ? '43' : '43').up()
            .ele('cNF').txt(chaveAcesso.substring(35, 43)).up()
            .ele('natOp').txt(naturezaOperacao).up()
            .ele('mod').txt('55').up()
            .ele('serie').txt(serie.toString()).up()
            .ele('nNF').txt(numero.toString()).up()
            .ele('dhEmi').txt(dataEmissao.toISOString()).up()
            .ele('tpNF').txt('1').up() // 1=Saída
            .ele('idDest').txt('1').up() // 1=Operação interna
            .ele('cMunFG').txt('4304606').up() // Caxias do Sul
            .ele('tpImp').txt('1').up() // 1=DANFE normal
            .ele('tpEmis').txt('1').up() // 1=Emissão normal
            .ele('cDV').txt(chaveAcesso.substring(43, 44)).up()
            .ele('tpAmb').txt(ambiente.toString()).up()
            .ele('finNFe').txt('1').up() // 1=NFe normal
            .ele('indFinal').txt('1').up() // 1=Consumidor final
            .ele('indPres').txt('1').up() // 1=Operação presencial
            .ele('procEmi').txt('0').up() // 0=Emissão própria
            .ele('verProc').txt('1.0').up()
          .up()

          // EMIT - Emitente
          .ele('emit')
            .ele('CNPJ').txt(emitente.cnpj).up()
            .ele('xNome').txt(emitente.razaoSocial).up()
            .ele('xFant').txt(emitente.nomeFantasia).up()
            .ele('enderEmit')
              .ele('xLgr').txt(emitente.endereco.logradouro).up()
              .ele('nro').txt(emitente.endereco.numero).up()
              .ele('xBairro').txt(emitente.endereco.bairro).up()
              .ele('cMun').txt('4304606').up()
              .ele('xMun').txt(emitente.endereco.municipio).up()
              .ele('UF').txt(emitente.endereco.uf).up()
              .ele('CEP').txt(emitente.endereco.cep.replace(/\D/g, '')).up()
              .ele('cPais').txt('1058').up()
              .ele('xPais').txt('Brasil').up()
            .up()
            .ele('IE').txt(emitente.inscricaoEstadual).up()
            .ele('CRT').txt(emitente.regimeTributario.toString()).up()
          .up()

          // DEST - Destinatário
          .ele('dest')
            .ele(destinatario.tipo === 'J' ? 'CNPJ' : 'CPF').txt(destinatario.cpfCnpj).up()
            .ele('xNome').txt(destinatario.nome).up()
            .ele('enderDest')
              .ele('xLgr').txt(destinatario.endereco.logradouro).up()
              .ele('nro').txt(destinatario.endereco.numero).up()
              .ele('xBairro').txt(destinatario.endereco.bairro).up()
              .ele('cMun').txt('4304606').up()
              .ele('xMun').txt(destinatario.endereco.municipio).up()
              .ele('UF').txt(destinatario.endereco.uf).up()
              .ele('CEP').txt(destinatario.endereco.cep.replace(/\D/g, '')).up()
              .ele('cPais').txt('1058').up()
              .ele('xPais').txt('Brasil').up()
            .up()
            .ele('indIEDest').txt(destinatario.indicadorIE.toString()).up()
          .up()

    // DET - Produtos
    const infNFe = doc.first()
    produtos.forEach((produto, index) => {
      infNFe
        .ele('det', { nItem: (index + 1).toString() })
          .ele('prod')
            .ele('cProd').txt(produto.codigo).up()
            .ele('cEAN').txt(produto.ean || 'SEM GTIN').up()
            .ele('xProd').txt(produto.descricao).up()
            .ele('NCM').txt(produto.ncm).up()
            .ele('CFOP').txt(produto.cfop).up()
            .ele('uCom').txt(produto.unidadeComercial).up()
            .ele('qCom').txt(produto.quantidadeComercial.toFixed(4)).up()
            .ele('vUnCom').txt(produto.valorUnitario.toFixed(2)).up()
            .ele('vProd').txt(produto.valorTotal.toFixed(2)).up()
            .ele('cEANTrib').txt(produto.ean || 'SEM GTIN').up()
            .ele('uTrib').txt(produto.unidadeComercial).up()
            .ele('qTrib').txt(produto.quantidadeComercial.toFixed(4)).up()
            .ele('vUnTrib').txt(produto.valorUnitario.toFixed(2)).up()
            .ele('indTot').txt('1').up()
          .up()
          .ele('imposto')
            .ele('ICMS')
              .ele('ICMSSN102') // Simples Nacional
                .ele('orig').txt(produto.origem.toString()).up()
                .ele('CSOSN').txt('102').up()
              .up()
            .up()
            .ele('PIS')
              .ele('PISNT')
                .ele('CST').txt('07').up()
              .up()
            .up()
            .ele('COFINS')
              .ele('COFINSNT')
                .ele('CST').txt('07').up()
              .up()
            .up()
          .up()
        .up()
    })

    // TOTAL
    infNFe
      .ele('total')
        .ele('ICMSTot')
          .ele('vBC').txt('0.00').up()
          .ele('vICMS').txt('0.00').up()
          .ele('vICMSDeson').txt('0.00').up()
          .ele('vFCP').txt('0.00').up()
          .ele('vBCST').txt('0.00').up()
          .ele('vST').txt('0.00').up()
          .ele('vFCPST').txt('0.00').up()
          .ele('vFCPSTRet').txt('0.00').up()
          .ele('vProd').txt(valorTotalProdutos.toFixed(2)).up()
          .ele('vFrete').txt('0.00').up()
          .ele('vSeg').txt('0.00').up()
          .ele('vDesc').txt('0.00').up()
          .ele('vII').txt('0.00').up()
          .ele('vIPI').txt('0.00').up()
          .ele('vIPIDevol').txt('0.00').up()
          .ele('vPIS').txt('0.00').up()
          .ele('vCOFINS').txt('0.00').up()
          .ele('vOutro').txt('0.00').up()
          .ele('vNF').txt(valorTotalNF.toFixed(2)).up()
        .up()
      .up()

    // TRANSP
    infNFe
      .ele('transp')
        .ele('modFrete').txt('9').up() // 9=Sem frete
      .up()

    // PAG - Pagamento (obrigatório NFe 4.0)
    const pag = infNFe.ele('pag')
    pagamentos.forEach(pagamento => {
      pag
        .ele('detPag')
          .ele('tPag').txt(pagamento.tipo).up()
          .ele('vPag').txt(pagamento.valor.toFixed(2)).up()
        .up()
    })
    pag.up()

    const xml = doc.end({ prettyPrint: true })
    return xml
  }
}
```

### 3. Assinatura Digital

```typescript
// services/nfeSignature.ts

import * as forge from 'node-forge'
import * as fs from 'fs'
import { XMLParser, XMLBuilder } from 'fast-xml-parser'

export class NFeSignature {

  static assinarXML(xml: string, certificadoPath: string, senha: string): string {
    // Carregar certificado PFX
    const pfxBuffer = fs.readFileSync(certificadoPath)
    const pfxBase64 = pfxBuffer.toString('base64')
    const p12Asn1 = forge.util.decode64(pfxBase64)
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, senha)

    // Extrair chave privada e certificado
    const bags = p12.getBags({ bagType: forge.pki.oids.certBag })
    const certBag = bags[forge.pki.oids.certBag]?.[0]
    const cert = certBag?.cert

    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })
    const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0]
    const privateKey = keyBag?.key

    if (!cert || !privateKey) {
      throw new Error('Certificado ou chave privada não encontrados')
    }

    // Parse XML
    const parser = new XMLParser({
      ignoreAttributes: false,
      preserveOrder: true,
      trimValues: false
    })
    const xmlObj = parser.parse(xml)

    // Encontrar infNFe para assinar
    const infNFeId = this.extrairIdInfNFe(xml)

    // Canonicalização do XML (C14N)
    const infNFeXml = this.extrairInfNFe(xml)
    const canonicalized = this.canonicalize(infNFeXml)

    // Criar hash SHA-1
    const md = forge.md.sha1.create()
    md.update(canonicalized, 'utf8')
    const digest = md.digest()

    // Assinar com chave privada
    const signature = (privateKey as forge.pki.rsa.PrivateKey).sign(md)
    const signatureBase64 = forge.util.encode64(signature)

    // Gerar X509Certificate
    const certPem = forge.pki.certificateToPem(cert)
    const certBase64 = certPem
      .replace('-----BEGIN CERTIFICATE-----', '')
      .replace('-----END CERTIFICATE-----', '')
      .replace(/\n/g, '')

    // Construir Signature XML
    const signatureXml = `
    <Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
      <SignedInfo>
        <CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
        <SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>
        <Reference URI="#${infNFeId}">
          <Transforms>
            <Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
            <Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
          </Transforms>
          <DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>
          <DigestValue>${forge.util.encode64(digest.bytes())}</DigestValue>
        </Reference>
      </SignedInfo>
      <SignatureValue>${signatureBase64}</SignatureValue>
      <KeyInfo>
        <X509Data>
          <X509Certificate>${certBase64}</X509Certificate>
        </X509Data>
      </KeyInfo>
    </Signature>`

    // Inserir Signature no XML
    const xmlAssinado = xml.replace('</infNFe>', `</infNFe>${signatureXml}`)

    return xmlAssinado
  }

  private static extrairIdInfNFe(xml: string): string {
    const match = xml.match(/Id="(NFe\d{44})"/)
    return match ? match[1] : ''
  }

  private static extrairInfNFe(xml: string): string {
    const match = xml.match(/<infNFe[\s\S]*?<\/infNFe>/)
    return match ? match[0] : ''
  }

  private static canonicalize(xml: string): string {
    // Implementação simplificada de C14N
    // Para produção, use biblioteca como 'xml-crypto'
    return xml
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/>\s+</g, '><')
      .trim()
  }
}
```

**NOTA:** Para produção, considere usar bibliotecas mais robustas como `xml-crypto` ou `node-signpdf` para assinatura digital.

### 4. Cliente SOAP

```typescript
// services/nfeSoapClient.ts

import axios from 'axios'

export class NfeSoapClient {

  private static getWebserviceUrl(servico: string, ambiente: 1 | 2, uf: string): string {
    const base = ambiente === 1
      ? 'https://nfe.svrs.rs.gov.br/ws'
      : 'https://nfe-homologacao.svrs.rs.gov.br/ws'

    const urls: Record<string, string> = {
      'autorizacao': `${base}/NfeAutorizacao/NFeAutorizacao4.asmx`,
      'retorno': `${base}/NfeRetAutorizacao/NFeRetAutorizacao4.asmx`,
      'consulta': `${base}/NfeConsulta/NfeConsulta4.asmx`,
      'evento': `${base}/RecepcaoEvento/RecepcaoEvento4.asmx`,
      'inutilizacao': `${base}/NfeInutilizacao/NfeInutilizacao4.asmx`
    }

    return urls[servico] || urls.autorizacao
  }

  static async enviarNFe(xml: string, ambiente: 1 | 2): Promise<any> {
    const url = this.getWebserviceUrl('autorizacao', ambiente, 'RS')

    const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
    <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:nfe="http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4">
      <soap:Header/>
      <soap:Body>
        <nfe:nfeDadosMsg>${xml}</nfe:nfeDadosMsg>
      </soap:Body>
    </soap:Envelope>`

    const response = await axios.post(url, soapEnvelope, {
      headers: {
        'Content-Type': 'application/soap+xml;charset=UTF-8',
        'SOAPAction': 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4/nfeAutorizacaoLote'
      }
    })

    return this.parseResponse(response.data)
  }

  static async consultarRecibo(recibo: string, ambiente: 1 | 2): Promise<any> {
    const url = this.getWebserviceUrl('retorno', ambiente, 'RS')

    const xmlConsulta = `<?xml version="1.0" encoding="UTF-8"?>
    <consReciNFe versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
      <tpAmb>${ambiente}</tpAmb>
      <nRec>${recibo}</nRec>
    </consReciNFe>`

    const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
    <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:nfe="http://www.portalfiscal.inf.br/nfe/wsdl/NFeRetAutorizacao4">
      <soap:Header/>
      <soap:Body>
        <nfe:nfeDadosMsg>${xmlConsulta}</nfe:nfeDadosMsg>
      </soap:Body>
    </soap:Envelope>`

    const response = await axios.post(url, soapEnvelope, {
      headers: {
        'Content-Type': 'application/soap+xml;charset=UTF-8',
        'SOAPAction': 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeRetAutorizacao4/nfeRetAutorizacaoLote'
      }
    })

    return this.parseResponse(response.data)
  }

  static async cancelarNFe(chaveAcesso: string, protocolo: string, justificativa: string, ambiente: 1 | 2, cnpj: string): Promise<any> {
    const url = this.getWebserviceUrl('evento', ambiente, 'RS')

    const dataEvento = new Date().toISOString()
    const sequencia = '1'

    const xmlEvento = `<?xml version="1.0" encoding="UTF-8"?>
    <envEvento versao="1.00" xmlns="http://www.portalfiscal.inf.br/nfe">
      <idLote>1</idLote>
      <evento versao="1.00">
        <infEvento Id="ID110111${chaveAcesso}01">
          <cOrgao>43</cOrgao>
          <tpAmb>${ambiente}</tpAmb>
          <CNPJ>${cnpj}</CNPJ>
          <chNFe>${chaveAcesso}</chNFe>
          <dhEvento>${dataEvento}</dhEvento>
          <tpEvento>110111</tpEvento>
          <nSeqEvento>${sequencia}</nSeqEvento>
          <verEvento>1.00</verEvento>
          <detEvento versao="1.00">
            <descEvento>Cancelamento</descEvento>
            <nProt>${protocolo}</nProt>
            <xJust>${justificativa}</xJust>
          </detEvento>
        </infEvento>
      </evento>
    </envEvento>`

    // Aqui você precisaria assinar o XML do evento também
    // const xmlAssinado = NFeSignature.assinarXML(xmlEvento, ...)

    const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
    <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:nfe="http://www.portalfiscal.inf.br/nfe/wsdl/RecepcaoEvento4">
      <soap:Header/>
      <soap:Body>
        <nfe:nfeDadosMsg>${xmlEvento}</nfe:nfeDadosMsg>
      </soap:Body>
    </soap:Envelope>`

    const response = await axios.post(url, soapEnvelope, {
      headers: {
        'Content-Type': 'application/soap+xml;charset=UTF-8',
        'SOAPAction': 'http://www.portalfiscal.inf.br/nfe/wsdl/RecepcaoEvento4/nfeRecepcaoEvento'
      }
    })

    return this.parseResponse(response.data)
  }

  private static parseResponse(xmlResponse: string): any {
    // Parse simplificado - use fast-xml-parser ou similar
    const parser = new (require('fast-xml-parser').XMLParser)()
    return parser.parse(xmlResponse)
  }
}
```

---

## API Routes

### POST /api/nfe/emitir

```typescript
// pages/api/nfe/emitir.ts

import type { NextApiRequest, NextApiResponse } from 'next'
import { NFeXmlBuilder } from '@/services/nfeXmlBuilder'
import { NFeSignature } from '@/services/nfeSignature'
import { NfeSoapClient } from '@/services/nfeSoapClient'
import { NFeEmissaoRequest, NFeEmissaoResponse } from '@/types/nfe'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<NFeEmissaoResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, erro: 'Método não permitido' })
  }

  try {
    const data: NFeEmissaoRequest = req.body

    // 1. Buscar próximo número da NFe
    const numero = await buscarProximoNumero()
    const serie = parseInt(process.env.NFE_SERIE || '1')
    const ambiente = parseInt(process.env.NFE_AMBIENTE || '2') as 1 | 2

    // 2. Gerar chave de acesso
    const codigoNumerico = Math.floor(Math.random() * 100000000)
    const agora = new Date()
    const anoMes = agora.getFullYear().toString().substring(2) + (agora.getMonth() + 1).toString().padStart(2, '0')

    const chaveAcesso = NFeXmlBuilder.gerarChaveAcesso({
      codigoUF: 43,
      anoMes,
      cnpj: process.env.NFE_EMITENTE_CNPJ!,
      modelo: '55',
      serie,
      numero,
      tipoEmissao: 1,
      codigoNumerico
    })

    // 3. Construir XML
    const emitente = {
      cnpj: process.env.NFE_EMITENTE_CNPJ!,
      razaoSocial: process.env.NFE_EMITENTE_RAZAO_SOCIAL!,
      nomeFantasia: process.env.NFE_EMITENTE_NOME_FANTASIA!,
      inscricaoEstadual: process.env.NFE_EMITENTE_IE!,
      regimeTributario: 1 as 1,
      endereco: {
        logradouro: process.env.NFE_EMITENTE_ENDERECO_LOGRADOURO!,
        numero: process.env.NFE_EMITENTE_ENDERECO_NUMERO!,
        bairro: process.env.NFE_EMITENTE_ENDERECO_BAIRRO!,
        municipio: process.env.NFE_EMITENTE_ENDERECO_MUNICIPIO!,
        uf: 'RS',
        cep: process.env.NFE_EMITENTE_ENDERECO_CEP!
      }
    }

    const xml = NFeXmlBuilder.construirXML({
      chaveAcesso,
      numero,
      serie,
      dataEmissao: agora,
      emitente,
      destinatario: data.destinatario,
      produtos: data.produtos,
      pagamentos: data.pagamentos,
      naturezaOperacao: data.naturezaOperacao || 'Venda de Mercadoria',
      ambiente
    })

    // 4. Assinar XML
    const xmlAssinado = NFeSignature.assinarXML(
      xml,
      process.env.NFE_CERTIFICADO_PATH!,
      process.env.NFE_CERTIFICADO_PASSWORD!
    )

    // 5. Enviar para SEFAZ
    const resultado = await NfeSoapClient.enviarNFe(xmlAssinado, ambiente)

    // 6. Processar resultado
    if (resultado.sucesso) {
      // Salvar no banco de dados
      await salvarNFe({
        chaveAcesso,
        numero,
        serie,
        vendaId: data.vendaId,
        xml: xmlAssinado,
        protocolo: resultado.protocolo,
        status: 'autorizada'
      })

      return res.status(200).json({
        success: true,
        chaveAcesso,
        protocolo: resultado.protocolo,
        dataAutorizacao: resultado.dataAutorizacao,
        xml: xmlAssinado,
        mensagem: 'NFe autorizada com sucesso'
      })
    } else {
      // Salvar como rejeitada
      await salvarNFe({
        chaveAcesso,
        numero,
        serie,
        vendaId: data.vendaId,
        xml: xmlAssinado,
        status: 'rejeitada',
        motivoRejeicao: resultado.mensagem
      })

      return res.status(400).json({
        success: false,
        erro: resultado.mensagem
      })
    }

  } catch (error: any) {
    console.error('Erro ao emitir NFe:', error)
    return res.status(500).json({
      success: false,
      erro: error.message || 'Erro ao emitir NFe'
    })
  }
}

async function buscarProximoNumero(): Promise<number> {
  // Consultar último número no banco de dados
  // SELECT MAX(numero) FROM nfe WHERE serie = 1
  return 1 // Exemplo
}

async function salvarNFe(dados: any): Promise<void> {
  // Salvar no Supabase
  // INSERT INTO nfe ...
}
```

---

## Interface Frontend

### Botão "Emitir NFe" na tela de Vendas

```typescript
// pages/vendas.tsx (adicionar botão)

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FileText } from 'lucide-react'
import { toast } from '@/hooks/useToast'

export default function VendasPage() {
  const [emitindoNFe, setEmitindoNFe] = useState(false)

  const handleEmitirNFe = async (vendaId: number) => {
    setEmitindoNFe(true)

    try {
      const response = await fetch('/api/nfe/emitir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendaId,
          // ... outros dados
        })
      })

      const resultado = await response.json()

      if (resultado.success) {
        toast({
          title: 'NFe emitida com sucesso!',
          description: `Chave: ${resultado.chaveAcesso}`,
          variant: 'success'
        })
      } else {
        toast({
          title: 'Erro ao emitir NFe',
          description: resultado.erro,
          variant: 'error'
        })
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao comunicar com servidor',
        variant: 'error'
      })
    } finally {
      setEmitindoNFe(false)
    }
  }

  return (
    <div>
      {/* ... resto da página ... */}

      <Button
        onClick={() => handleEmitirNFe(venda.id)}
        disabled={emitindoNFe}
      >
        <FileText className="mr-2 h-4 w-4" />
        {emitindoNFe ? 'Emitindo...' : 'Emitir NFe'}
      </Button>
    </div>
  )
}
```

---

## Próximos Passos

1. **Instalar dependências**
   ```bash
   pnpm install node-forge xmlbuilder2 axios fast-xml-parser
   ```

2. **Criar migration do banco de dados**
   ```bash
   # Executar database/migrations/018_create_nfe_table.sql no Supabase
   ```

3. **Configurar certificado e variáveis de ambiente**

4. **Implementar serviços** (nfeService.ts, nfeXmlBuilder.ts, etc.)

5. **Criar API routes** (/api/nfe/emitir, etc.)

6. **Testar em homologação**

7. **Criar interface de usuário**

---

**Resumo:**
- ✅ Tudo integrado no Next.js
- ✅ Sem necessidade de software externo
- ✅ Comunicação direta com SEFAZ via APIs
- ✅ Interface integrada ao sistema MeguisPet

Qualquer dúvida sobre a implementação, estou à disposição!
