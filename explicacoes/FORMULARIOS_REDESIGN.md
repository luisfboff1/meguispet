# MeguisPet – Plano de Unificação e Simplificação de Formulários

## 1. Objetivo e Escopo
- Eliminar redundâncias entre formulários de cadastro e operação.
- Garantir que cada fluxo tenha propósito único e localização clara na navegação.
- Preparar a aplicação para o modelo multi-estoque e integrações financeiras sem duplicar lógica.

## 2. Inventário Atual de Formulários
| Formulário Atual | Caminho do Componente | Finalidade Principal | Páginas/Rotas que Consomem | Sobreposições Identificadas |
| --- | --- | --- | --- | --- |
| **ClienteForm** | `components/forms/ClienteForm.tsx` | Cadastro/edição de clientes e flag de tipo (`cliente/fornecedor/ambos`). | `pages/clientes.tsx` | Campos de dados pessoais, endereço e contato repetidos em `FornecedorForm`.
| **FornecedorForm** | `components/forms/FornecedorForm.tsx` | Cadastro/edição de fornecedores. | `pages/produtos-estoque.tsx` (aba Fornecedores) | Repete 90% dos campos de `ClienteForm`; status ativo poderia ser flag no cadastro unificado.
| **ProdutoForm** | `components/forms/ProdutoForm.tsx` | Cadastro/edição de produtos, preços e distribuição entre estoques. | `pages/produtos-estoque.tsx` (aba Produtos) | Mistura cadastro de item com gestão de estoque; itens de UI compartilháveis com outras telas.
| **AjusteEstoqueForm** | `components/forms/AjusteEstoqueForm.tsx` | Ajuste manual simples (entrada/saída/inventário). | `pages/produtos-estoque.tsx` (modais). | Duplica buscas de produtos/vendedores presentes em `MovimentacaoForm`.
| **MovimentacaoForm** | `components/forms/MovimentacaoForm.tsx` | Entradas/saídas complejas com lista de itens, cliente/fornecedor. | `pages/produtos-estoque.tsx` (aba Movimentações). | Sobreposição ampla com `VendaForm` (seleção de itens, participantes, estoque).
| **VendaForm** | `components/forms/VendaForm.tsx` | Registrar venda e gerar movimentação de estoque + pagamento. | `pages/vendas.tsx` | Repete todos os seletores de itens, cliente, estoque, pagamento poderia ser módulo ligado a `MovimentacaoForm`.
| **TransacaoForm** | `components/forms/TransacaoForm.tsx` | Registrar receitas/despesas financeiras. | `pages/financeiro.tsx` | Fluxo exclusivo; sem sobreposição.
| **Login Form** | `pages/login.tsx` | Autenticação. | `/login` | Fora do escopo de unificação administrativa.

## 3. Problemas Principais
- **Duplicidade de campos**: clientes e fornecedores usam formulários separados apesar de 90% dos campos coincidirem.
- **Responsabilidades misturadas**: `ProdutoForm` lida com cadastro e distribuição de estoque na mesma tela, enquanto ajustes existem em formulários separados.
- **Fluxos paralelos**: `MovimentacaoForm` e `VendaForm` mantêm lógicas de itens quase idênticas, dificultando manutenção do cálculo de totais e validações.
- **Navegação confusa**: página `/produtos-estoque` concentra quatro fluxos (produtos, estoques, movimentações, fornecedores), tornando a descoberta de ações menos intuitiva.

## 4. Estrutura Proposta
| Elemento Proposto | Tipo | Responsabilidade | Substitui / Consolida | Observações |
| --- | --- | --- | --- | --- |
| **PessoaForm** | Formulário base | Cadastro de entidades com papéis dinâmicos (`cliente`, `fornecedor`, `ambos`). | Une `ClienteForm` e `FornecedorForm`. | Seções opcionais por papel; permite filtros por papel na listagem.
| **ProdutoForm (refatorado)** | Formulário | Cadastro do item (SKU, preços, categorias, flags). | Evolui o formulário atual, removendo lógica de movimentação. | Saldos apenas exibidos; ajustes ficam em módulo próprio.
| **EstoqueOperacaoForm** | Núcleo reutilizável | Entradas, saídas, inventário, transferências entre estoques. | Consolida `AjusteEstoqueForm` e `MovimentacaoForm`. | Recebe preset de contexto (ex.: `inventario`, `entrada_fornecedor`, `saida_cliente`).
| **OperacaoComercialForm** | Núcleo reutilizável | Fluxos comerciais com pagamento (vendas, pedidos). | Envolve `VendaForm` e futuras reservas/pedidos. | Embute `EstoqueOperacaoForm` para itens + módulo financeiro (pagamento, desconto, origem).
| **TransacaoForm** | Formulário | Continua responsável por lançamentos financeiros avulsos. | Mantido. | Pode consumir componentes auxiliares (input monetário, categoria) compartilhados no futuro.

### Navegação Recomendada
- **Cadastros** → **Pessoas** (subfiltros Cliente/Fornecedor/Ambos).
- **Catálogo** → **Produtos** (somente cadastro/consulta de produtos).
- **Operações** → **Estoques** (ajustes + movimentações) e **Vendas** (registro e histórico comercial).
- `Transações` permanece no módulo Financeiro.

## 5. Roadmap de Implementação
1. **Documentação & Componentes Auxiliares**  
   - Criar componentes compartilhados: `EnderecoSection`, `ContatoSection`, `ItensListEditor`, `ParticipanteSelector`, `EstoqueSelector`.
   - Definir tipos TypeScript para novos formulários (`PessoaFormInput`, `EstoqueOperacaoInput`, `OperacaoComercialInput`).

2. **Unificação de Pessoas**  
   - Criar `PessoaForm` com renderização condicional para papéis.  
   - Atualizar páginas `clientes.tsx` e `fornecedores.tsx` para usar o novo formulário com filtros.  
   - Descontinuar `FornecedorForm` após migração.

3. **Reorganização Produtos & Estoque**  
   - Refatorar `ProdutoForm` removendo lógica de distribuição manual (delegar a componente reutilizável).  
   - Criar rota/aba dedicada a estoques (`pages/estoques.tsx` ou `pages/operacoes/estoques.tsx`) consumindo `EstoqueOperacaoForm`.  
   - Simplificar `/produtos-estoque` ou redirecionar para novas rotas.

4. **Operações de Estoque**  
   - Implementar `EstoqueOperacaoForm` unificando ajustes e movimentações.  
   - Adequar serviços/API (`movimentacoesService`, endpoints PHP) para aceitar payload unificado e presets.

5. **Fluxo Comercial**  
   - Implementar `OperacaoComercialForm` (com módulos de pagamento, descontos, origem).  
   - Atualizar `VendaForm` para wrapper do núcleo.  
   - Garantir compatibilidade com API `vendas.php`.

6. **Limpeza & Navegação**  
   - Atualizar `Sidebar` para refletir novos agrupamentos.  
   - Remover formulários antigos e componentes obsoletos após migração.  
   - Atualizar documentação interna e treinar usuários.

## 6. Riscos e Considerações
- Verificar dependências externas (scripts SQL, relatórios) antes de alterar payloads de API.  
- Planejar migração gradual para evitar interrupções em produção.  
- Garantir regressão mínima com testes manuais/automatizados (especialmente vendas e estoque).

---
Última atualização: 2025-10-16.
