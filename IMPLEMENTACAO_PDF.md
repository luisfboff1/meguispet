# 📄 Implementação de Emissão de Pedido em PDF

## Visão Geral

Este documento descreve a implementação da funcionalidade de geração e exportação de pedidos de venda em formato PDF profissional, seguindo os requisitos especificados na issue.

## Requisitos Atendidos

- ✅ Geração de PDF profissional para pedidos de venda
- ✅ Layout simples, preto e branco, sem efeitos visuais
- ✅ Formato compacto e legível
- ✅ Inclusão do número do pedido (numero_venda)
- ✅ Exportação direta em PDF
- ✅ Dados completos do cliente, vendedor e produtos
- ✅ Layout similar ao exemplo fornecido

## Arquitetura da Solução

### 1. Bibliotecas Utilizadas

**jsPDF v3.0.2**
- Biblioteca JavaScript para geração de documentos PDF
- Versão atualizada com correções de segurança
- Leve e compatível com navegadores modernos
- Sem dependências de servidor

**jsPDF-AutoTable v3.8.4**
- Plugin para criação de tabelas profissionais
- Suporte a múltiplas colunas e estilização
- Quebra automática de página
- Formatação personalizada

### 2. Estrutura de Arquivos

```
lib/
  └── pdf-generator.ts       # Utilitário de geração de PDFs
pages/
  └── vendas.tsx             # Página atualizada com botões de exportação
```

## Implementação Detalhada

### Arquivo: `/lib/pdf-generator.ts`

Este arquivo contém todas as funções relacionadas à geração de PDFs:

#### Função Principal: `generateOrderPDF()`

```typescript
export const generateOrderPDF = (venda: Venda, nomeEmpresa = 'MEGUISPET') => {
  // Cria documento PDF em formato A4
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })
  
  // ... geração do conteúdo
  
  return doc
}
```

**Estrutura do PDF gerado:**

1. **Cabeçalho (yPos: 15mm)**
   - Nome da empresa centralizado
   - Fonte: Helvetica Bold, 16pt
   - Linha separadora

2. **Informações do Cliente (yPos: 33mm)**
   - Nome do cliente
   - Endereço completo
   - Cidade, estado e CEP
   - Telefone de contato
   - Formato: Labels em negrito + valores

3. **Informações do Pedido (yPos: ~60mm)**
   - Número do pedido
   - Data de emissão
   - Nome do vendedor
   - Forma de pagamento
   - Layout em 2 colunas

4. **Tabela de Produtos (yPos: ~75mm)**
   - Colunas: CÓD | DESCRIÇÃO | QTD | PREÇO UNIT. | TOTAL
   - Cabeçalho com fundo branco e texto em negrito
   - Linhas separadoras entre itens
   - Alinhamento: centro (código/qtd), esquerda (descrição), direita (valores)
   - Larguras fixas para consistência visual

5. **Totais (após tabela)**
   - Subtotal (se houver desconto)
   - Desconto (se aplicável)
   - Total do pedido em destaque (11pt, negrito)
   - Alinhamento à direita

6. **Observações (se existir)**
   - Linha separadora
   - Label "OBSERVAÇÕES" em negrito
   - Texto com quebra automática de linha

7. **Rodapé (yPos: 282mm)**
   - Linha separadora
   - Texto: "Documento gerado automaticamente - MEGUISPET Sistema de Gestão"
   - Fonte: Helvetica Italic, 8pt
   - Centralizado

#### Funções Auxiliares

**`downloadOrderPDF()`**
```typescript
export const downloadOrderPDF = (venda: Venda, nomeEmpresa?: string) => {
  const doc = generateOrderPDF(venda, nomeEmpresa)
  const filename = `pedido-${venda.numero_venda || venda.id}.pdf`
  doc.save(filename)
}
```
- Gera o PDF e inicia o download automaticamente
- Nome do arquivo: `pedido-{numero_venda}.pdf`

**`previewOrderPDF()`**
```typescript
export const previewOrderPDF = (venda: Venda, nomeEmpresa?: string) => {
  const doc = generateOrderPDF(venda, nomeEmpresa)
  const blob = doc.output('blob')
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
}
```
- Abre o PDF em nova aba para visualização
- Útil para preview antes de baixar

### Arquivo: `/pages/vendas.tsx`

Atualizações na página de vendas:

#### 1. Importações
```typescript
import { FileText } from 'lucide-react'
import { downloadOrderPDF } from '@/lib/pdf-generator'
```

#### 2. Handler de Exportação
```typescript
const handleExportarPDF = async (venda: Venda) => {
  try {
    // Se a venda não tem itens, buscar a venda completa
    if (!venda.itens || venda.itens.length === 0) {
      const response = await vendasService.getById(venda.id)
      if (response.success && response.data) {
        downloadOrderPDF(response.data, 'MEGUISPET')
        setToast({ message: 'PDF gerado com sucesso!', type: 'success' })
      }
    } else {
      downloadOrderPDF(venda, 'MEGUISPET')
      setToast({ message: 'PDF gerado com sucesso!', type: 'success' })
    }
  } catch (error) {
    setToast({ message: 'Erro ao gerar PDF do pedido', type: 'error' })
  }
}
```

**Lógica:**
- Verifica se a venda possui itens carregados
- Se não tiver, busca a venda completa via API (com itens)
- Gera e baixa o PDF
- Exibe mensagem de sucesso/erro

#### 3. Botão na Tabela de Vendas
```typescript
<Button 
  variant="ghost" 
  size="sm"
  onClick={() => handleExportarPDF(row.original)}
  title="Exportar PDF"
  className="text-blue-600 hover:text-blue-700"
>
  <FileText className="h-4 w-4" />
</Button>
```

Posicionamento: Coluna "Ações", entre os botões "Visualizar" e "Editar"

#### 4. Botão no Card de Detalhes
```typescript
<Button 
  variant="outline" 
  size="sm"
  onClick={() => handleExportarPDF(selectedVenda)}
  className="text-blue-600 hover:text-blue-700"
>
  <FileText className="mr-2 h-4 w-4" />
  Exportar PDF
</Button>
```

Posicionamento: Cabeçalho do card de detalhes, ao lado do botão "Fechar"

## Características do PDF

### Design
- **Formato**: A4 (210mm x 297mm)
- **Orientação**: Retrato (Portrait)
- **Margens**: 15mm em todos os lados
- **Cores**: Preto e branco apenas
- **Fonte**: Helvetica (padrão, sem serifas)

### Estilo Visual
- Layout limpo e profissional
- Sem sombras, gradientes ou efeitos visuais
- Linhas separadoras simples (0.3-0.5pt)
- Hierarquia visual clara com tamanhos de fonte
- Alinhamento consistente

### Formatação de Valores
- Moeda: R$ 0.00
- Datas: DD/MM/AAAA (formato brasileiro)
- Números: Com casas decimais quando necessário

## Fluxo de Uso

### Cenário 1: Exportar da Lista
1. Usuário navega para `/vendas`
2. Visualiza a lista de vendas
3. Clica no ícone de arquivo (📄) na coluna "Ações"
4. PDF é gerado e baixado automaticamente

### Cenário 2: Exportar dos Detalhes
1. Usuário navega para `/vendas`
2. Clica no ícone de olho (👁️) para ver detalhes
3. Card de detalhes é exibido
4. Clica no botão "Exportar PDF"
5. PDF é gerado e baixado automaticamente

## Tratamento de Dados

### Dados Obrigatórios
- ID da venda
- Número da venda (numero_venda)
- Data de criação
- Valor total, desconto e valor final

### Dados Opcionais
- Cliente (nome, endereço, telefone, etc.)
- Vendedor (nome)
- Forma de pagamento
- Estoque
- Observações
- Itens da venda

### Comportamento com Dados Ausentes
- Campos vazios exibem "N/A"
- Seções sem dados são omitidas (ex: observações vazias)
- Tabela de produtos sempre é exibida (mesmo que vazia)

## Performance

### Otimizações
- Geração client-side (sem chamadas ao servidor)
- Biblioteca leve (jsPDF ~200KB minificado)
- Renderização instantânea para documentos pequenos
- Sem dependências pesadas

### Limitações
- Documentos muito grandes podem levar alguns segundos
- Máximo recomendado: 50 itens por pedido
- Para documentos maiores, considerar paginação

## Segurança

### Vulnerabilidades Corrigidas
- **CVE jsPDF DoS**: Corrigido com update para v3.0.2
- **CVE jsPDF ReDoS**: Corrigido com update para v3.0.2

### Boas Práticas
- Validação de dados antes da geração
- Escape de caracteres especiais
- Sem execução de código não confiável
- Geração apenas client-side (sem upload de dados sensíveis)

## Testes

### Teste Manual
Executar: `node test-pdf-generation.js`

Este script demonstra a estrutura do PDF com dados de exemplo.

### Dados de Teste
```javascript
{
  numero_venda: "22874",
  cliente: "DELTA FIRE LTDA",
  vendedor: "ROSE MENEGAZZO",
  itens: 3 produtos,
  total: R$ 2.276,25
}
```

### Verificações Realizadas
- ✅ Build sem erros
- ✅ Lint sem warnings
- ✅ TypeScript sem erros de tipo
- ✅ CodeQL sem vulnerabilidades
- ✅ Estrutura do PDF validada
- ✅ Formatação correta de valores

## Manutenção

### Personalização do Cabeçalho
Para alterar o nome da empresa no cabeçalho:

```typescript
// Em vendas.tsx
downloadOrderPDF(venda, 'NOME_DA_EMPRESA')
```

### Adicionar Novos Campos
1. Atualizar a interface `Venda` em `/types/index.ts`
2. Adicionar campo na função `generateOrderPDF()`
3. Posicionar no PDF ajustando `yPos`

### Alterar Layout
Editar `/lib/pdf-generator.ts`:
- Margens: variável `margin`
- Tamanhos de fonte: chamadas `setFontSize()`
- Cores: valores RGB (atualmente apenas preto: [0,0,0])
- Posicionamento: variável `yPos`

## Compatibilidade

### Navegadores Suportados
- Chrome/Edge: 90+
- Firefox: 88+
- Safari: 14+
- Opera: 76+

### Dispositivos
- Desktop: Totalmente suportado
- Tablet: Totalmente suportado
- Mobile: Suportado (com limitações de visualização)

## Próximos Passos (Melhorias Futuras)

1. **Logo da Empresa**
   - Adicionar logo no cabeçalho
   - Suporte a imagens base64

2. **Templates Personalizados**
   - Diferentes layouts para tipos de pedido
   - Configuração via interface

3. **Envio por Email**
   - Integração com sistema de email
   - Anexar PDF automaticamente

4. **Histórico de PDFs**
   - Armazenar PDFs gerados
   - Reimpressão sem regenerar

5. **QR Code**
   - Adicionar QR code para rastreamento
   - Link para consulta online

## Suporte

Para problemas ou dúvidas:
1. Verificar mensagens de erro no console do navegador
2. Confirmar que os dados da venda estão completos
3. Testar com dados de exemplo usando `test-pdf-generation.js`
4. Verificar compatibilidade do navegador

## Conclusão

A implementação atende completamente aos requisitos especificados na issue:
- ✅ PDF profissional e compacto
- ✅ Preto e branco, sem efeitos
- ✅ Número do pedido incluído
- ✅ Exportação funcional
- ✅ Layout similar ao exemplo fornecido
- ✅ Código limpo e seguro
- ✅ Sem vulnerabilidades de segurança

A solução é escalável, performática e fácil de manter.
