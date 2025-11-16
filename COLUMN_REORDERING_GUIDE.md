# 📋 Guia de Reordenação de Colunas

## 🎯 O que foi implementado?

Agora você pode **reorganizar as colunas das tabelas** arrastando-as para a posição desejada! A ordem que você escolher ficará **salva no seu navegador**, então mesmo fechando e abrindo novamente, suas preferências estarão lá.

### ✨ Principais Funcionalidades

1. **Coluna de Ações no Início** 🎬
   - A coluna "Ações" agora aparece sempre no início da tabela
   - Facilita o acesso rápido aos botões de editar, visualizar, excluir, etc.

2. **Arrastar e Soltar** 🖱️
   - Clique e segure o ícone de arrastar (⋮⋮) no cabeçalho da coluna
   - Arraste para a posição desejada
   - Solte para fixar a nova ordem

3. **Persistência Local** 💾
   - Sua ordem preferida fica salva no navegador
   - Funciona mesmo depois de fechar e abrir o site
   - Cada tabela tem sua própria configuração

## 🖥️ Como Usar

### No Desktop (Computador/Notebook)

1. **Identifique o ícone de arrastar**
   ```
   [⋮⋮] Nome da Coluna
   ```
   O ícone ⋮⋮ aparece no lado esquerdo de cada cabeçalho de coluna

2. **Arraste a coluna**
   - Clique e segure no ícone ⋮⋮
   - Arraste para a esquerda ou direita
   - A coluna sendo arrastada ficará semi-transparente

3. **Solte na nova posição**
   - Solte o botão do mouse na posição desejada
   - A ordem é salva automaticamente!

### No Mobile (Celular/Tablet)

- O recurso de arrastar está **desabilitado** no mobile para melhor experiência
- Colunas essenciais já vêm pré-configuradas para mobile
- Você ainda pode usar o botão "Selecionar Colunas" para mostrar/ocultar colunas

## 📱 Tabelas Atualizadas

Todas as seguintes tabelas agora suportam reordenação de colunas:

| Página | Tabela | Colunas no Mobile |
|--------|--------|-------------------|
| **Clientes** | Lista de clientes | Ações, Nome, Tipo |
| **Vendas** | Lista de vendas | Ações, Nº Venda, Total, Status |
| **Vendas** | Condições de Pagamento | Ações, Nome, Prazos |
| **Fornecedores** | Lista de fornecedores | Ações, Nome, Telefone |
| **Usuários** | Lista de usuários | Ações, Nome, Email, Função |
| **Vendedores** | Lista de vendedores | Ações, Nome, Telefone, Comissão |

## 🎨 Exemplo Visual

### Antes (ordem padrão):
```
| Nome     | Email           | Telefone     | Ações |
|----------|-----------------|--------------|-------|
| João     | joao@email.com  | (11) 99999   | [👁️✏️] |
```

### Depois (ordem personalizada):
```
| Ações | Nome     | Telefone     | Email           |
|-------|----------|--------------|-----------------|
| [👁️✏️] | João     | (11) 99999   | joao@email.com  |
```

## 🔄 Como Resetar para o Padrão

Se quiser voltar para a ordem original das colunas:

1. **Opção 1 - Limpar localStorage (recomendado)**
   - Abra o Console do Navegador (F12)
   - Digite: `localStorage.clear()`
   - Recarregue a página (F5)

2. **Opção 2 - Arrastar manualmente**
   - Arraste as colunas de volta para a ordem original

## 💡 Dicas de Uso

### 📍 Organize por Prioridade
Coloque as colunas que você mais usa no início:
- Exemplo: Para vendas, você pode querer: Ações → Cliente → Valor → Status

### 🎯 Por Contexto de Trabalho
Configure cada tabela de acordo com sua rotina:
- **Financeiro**: Priorize valores e datas
- **Clientes**: Priorize nome e contato
- **Vendas**: Priorize número e status

### 🔍 Use com Visibilidade de Colunas
Combine com o botão "Selecionar Colunas" para:
1. Ocultar colunas que você não usa
2. Reordenar apenas as que ficaram visíveis
3. Criar uma visualização perfeita para você!

## 🛠️ Detalhes Técnicos

### Armazenamento
- **Formato**: JSON no localStorage do navegador
- **Chaves**: 
  - `table-column-order-{nome-da-tabela}` → Ordem das colunas
  - `table-column-visibility-{nome-da-tabela}` → Visibilidade

### Compatibilidade
- ✅ Chrome, Firefox, Safari, Edge (versões modernas)
- ✅ Desktop e Tablets
- ⚠️ Mobile (arrastar desabilitado, mas ordem salva funciona)

### Privacidade
- ✅ Dados salvos **apenas no seu navegador**
- ✅ Não são enviados para o servidor
- ✅ Cada navegador/dispositivo tem suas próprias preferências

## ❓ Perguntas Frequentes

**P: Minhas configurações aparecem em outro computador?**
R: Não. As configurações ficam salvas apenas no navegador que você usou. Se usar outro computador, terá que configurar novamente.

**P: Posso mover a coluna de Ações para o final?**
R: Sim! Embora ela inicie no começo por ser a mais usada, você pode movê-la para qualquer posição.

**P: O que acontece se eu limpar o cache do navegador?**
R: As configurações de ordem de colunas serão perdidas e voltarão ao padrão.

**P: Funciona no modo anônimo/privativo?**
R: Sim, mas as configurações são perdidas quando você fecha a janela anônima.

**P: E se eu adicionar ou remover colunas no futuro?**
R: O sistema é inteligente! Novas colunas aparecerão no final, e colunas removidas não afetarão sua ordem personalizada.

## 🆘 Suporte

Se encontrar algum problema:
1. Tente recarregar a página (F5)
2. Limpe o cache do navegador
3. Teste em modo anônimo para verificar se é um problema local
4. Entre em contato com o suporte técnico

---

**Desenvolvido com ❤️ para melhorar sua experiência de uso!**
