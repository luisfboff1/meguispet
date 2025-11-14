# 📄 Sistema de Geração de PDF

Documentação do sistema de geração de pedidos em PDF do MeguisPet.

---

## 📋 Documentação

### 📝 Implementação
- **[Implementação PDF](./IMPLEMENTACAO_PDF.md)** - Documentação da implementação inicial
- **[Resumo da Implementação](./RESUMO_PDF.md)** - Resumo completo da implementação

### 🔄 Atualizações
- **[Atualização do Layout](./ATUALIZACAO_PDF.md)** - Atualização do layout do PDF

---

## 🎯 Funcionalidades

### ✅ Implementado

#### Geração de PDF
- ✅ Pedido de venda completo
- ✅ Dados do cliente
- ✅ Lista de produtos
- ✅ Valores e totais
- ✅ Impostos (IPI, ST, ICMS)
- ✅ Formas de pagamento

#### Layout
- ✅ Cabeçalho com logo
- ✅ Informações da empresa
- ✅ Dados do pedido (número, data, vendedor)
- ✅ Tabela de produtos formatada
- ✅ Totalizadores destacados
- ✅ Rodapé com observações

#### Download
- ✅ Geração server-side
- ✅ Download automático
- ✅ Nome do arquivo com número do pedido
- ✅ Formato A4

---

## 🚀 Como Usar

### Gerar PDF de um Pedido
```typescript
import { generatePedidoPDF } from '@/lib/pdf-generator';

// Gerar PDF
const pdfBuffer = await generatePedidoPDF(venda_id);

// Enviar para download
res.setHeader('Content-Type', 'application/pdf');
res.setHeader('Content-Disposition', `attachment; filename=pedido-${numero}.pdf`);
res.send(pdfBuffer);
```

### Endpoint da API
```
GET /api/vendas/[id]/pdf
```

### No Frontend
```typescript
// Abrir PDF em nova aba
const handleViewPDF = (vendaId) => {
  window.open(`/api/vendas/${vendaId}/pdf`, '_blank');
};

// Download direto
const handleDownloadPDF = async (vendaId) => {
  const response = await fetch(`/api/vendas/${vendaId}/pdf`);
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pedido-${numero}.pdf`;
  a.click();
};
```

---

## 📊 Estrutura do PDF

### Cabeçalho
```
┌─────────────────────────────────────────────┐
│  [LOGO]          MEGUISPET                  │
│               Pet Shop & Vet                │
│  Endereço, Telefone, Email                  │
└─────────────────────────────────────────────┘
```

### Dados do Pedido
```
Pedido Nº: 12345              Data: 01/01/2025
Cliente: João Silva           Vendedor: Maria
CPF/CNPJ: 123.456.789-00     Telefone: (11) 99999-9999
```

### Tabela de Produtos
```
┌──────┬─────────────────┬──────┬────────┬───────────┐
│ Item │ Produto         │ Qtd  │ Valor  │ Subtotal  │
├──────┼─────────────────┼──────┼────────┼───────────┤
│  1   │ Ração Premium   │  2   │ 50,00  │  100,00   │
│  2   │ Antipulgas      │  1   │ 30,00  │   30,00   │
└──────┴─────────────────┴──────┴────────┴───────────┘
```

### Totalizadores
```
Subtotal:           R$ 130,00
IPI:                R$  10,00
ST:                 R$   5,00
Desconto:           R$  15,00
────────────────────────────
TOTAL:              R$ 130,00
```

### Formas de Pagamento
```
Dinheiro:           R$ 100,00
Cartão de Crédito:  R$  30,00
────────────────────────────
PAGO:               R$ 130,00
```

---

## 🛠️ Stack Técnico

### Biblioteca
- **PDFKit** - Geração de PDF em Node.js

### Integração
- Next.js API Routes (Server-side)
- Stream de dados para download
- Formatação de valores brasileiros

---

## 🔗 Links Relacionados

- [Vendas](../vendas/) - Sistema de vendas
- [Impostos](../impostos/) - Cálculo de impostos
- [API](../../05-api/) - Documentação de APIs

---

[⬅️ Voltar para Features](../README.md)
