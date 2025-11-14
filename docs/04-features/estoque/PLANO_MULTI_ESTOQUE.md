# Plano de Evolução: Suporte a Multiestoque e Formas de Pagamento Dinâmicas

## 1. Objetivos
- Permitir registrar, consultar e analisar vendas com origem de estoque distinta (ex.: São Paulo, Rio Grande do Sul).
- Associar clientes a vendedores padrão para facilitar o preenchimento do formulário.
- Tornar a lista de formas de pagamento configurável via banco de dados.
- Garantir consistência na baixa de estoque e relatórios após as mudanças.

## 2. Alterações de Banco de Dados
1. **Tabela `estoques`**
   - `id` (PK, auto increment)
   - `nome` (ex.: "São Paulo")
   - `descricao`
   - `ativo`
   - `created_at`, `updated_at`

2. **Tabela pivô `produtos_estoques`**
   - `id` (PK)
   - `produto_id` (FK `produtos.id`)
   - `estoque_id` (FK `estoques.id`)
   - `quantidade`
   - Índices compostos para `produto_id + estoque_id`.
   - Substitui o campo `produtos.estoque` como fonte de verdade (campo pode ser mantido para compatibilidade, mas passa a ser derivado).

3. **Tabela `formas_pagamento`**
   - `id` (PK)
   - `nome` (ex.: "Boleto")
   - `ativo`
   - `ordem` (opcional, para ordenação em UI)

4. **Atualização na tabela `vendas`**
   - Adicionar colunas `estoque_id` (FK `estoques.id`) e `forma_pagamento_id` (FK `formas_pagamento.id`).
   - Manter colunas legadas (`forma_pagamento`) durante migração para não quebrar relatórios existentes; migrar dados para a tabela de pagamento e após validação considerar remoção.

5. **Tabela `clientes_fornecedores`**
   - Adicionar coluna `vendedor_id` (FK `vendedores.id`) para salvar o vendedor padrão.

6. **Procedures/Triggers**
   - Atualizar procedures de movimentação para trabalhar com `produtos_estoques`.
   - Criar procedure para recalcular estoque total (`produtos.estoque = SUM(produtos_estoques.quantidade)`), caso campo seja mantido.

7. **Migração de Dados**
   - Criar registros default na tabela `estoques` (São Paulo, Rio Grande do Sul).
   - Popular `formas_pagamento` com valores atuais (Dinheiro, Cartão, PIX, Transferência, Boleto).
   - Migrar estoque atual de `produtos` para `produtos_estoques` usando estoque padrão (definido em configuração) para evitar perda de informação.
   - Migrar coluna `forma_pagamento` de `vendas` para `forma_pagamento_id`.

## 3. Backend PHP
1. **Configuração Geral**
   - Atualizar `api/config.php` se necessário para suportar novos scripts SQL.

2. **Endpoints**
   - `api/vendas.php`
     - `GET`: retornar `estoque` e `forma_pagamento` detalhados (id + nome).
     - `POST`: validar `estoque_id` e `forma_pagamento_id`, inserir nos campos novos, alimentar pivot de estoque.
     - Ajustar baixa de estoque para atuar em `produtos_estoques` e atualizar `produtos.estoque` via trigger/procedure.
   - `api/produtos.php`, `api/movimentacoes.php`: adaptar para multiestoque (entradas/saídas por estoque).
   - Criar endpoints auxiliares: `api/estoques.php`, `api/formas_pagamento.php` para CRUD simples.
   - `api/clientes.php`: permitir salvar/retornar `vendedor_id`.

3. **Recalcular Estoque**
   - Ao criar venda: baixar quantidade na combinação produto+estoque.
   - Ao cancelar venda ou ajustar movimentação, repor quantidade.

4. **Relatórios e Dashboard**
   - Ajustar queries em `api/dashboard` que somam estoque/valor para considerar pivot.
   - Permitir filtro por `estoque_id` onde fizer sentido (ex.: vendas por estoque, movimentação).

## 4. Frontend (Next.js)
1. **Camada de Serviços (`services/api.ts`)**
   - Adicionar clientes que retornam listas de `estoques` e `formas_pagamento`.
   - Atualizar serviços de `vendas`, `produtos`, `movimentacoes` para enviar/receber os novos campos.

2. **Contextos/Stores**
   - Caso exista store de configurações, armazenar opções de estoque e formas de pagamento carregadas da API.

3. **Componentes**
   - `VendaForm`
     - Já inclui seleção de estoque; trocar lista fixa por dados da API.
     - Usar lista dinâmica de formas de pagamento.
   - `ClienteForm`
     - Adicionar controle para `vendedor_id` default.
   - Componentes de estoque/movimentação
     - Incluir seleção de `estoque` nos formulários (entrada/saída/ajuste).
     - Atualizar listagens para indicar de qual estoque é cada linha.
   - `Dashboard` e `Relatórios`
     - Exibir métricas separadas por estoque quando aplicável.

4. **Páginas**
   - `pages/vendas.tsx`: mostrar origem do estoque e nova forma de pagamento.
   - `pages/estoque.tsx`: apresentar visão consolidada (por estoque) e permitir filtro.

## 5. Migração e Deploy
1. Adicionar script SQL incremental (ex.: `database/2025-10-12_multiestoque.sql`) com todas as alterações e migrações de dados.
2. Atualizar `scripts/build.js` para garantir que novos endpoints/rotas estão incluídos no export.
3. Testar fluxo completo em ambiente local:
   - Cadastro de cliente com vendedor default
   - Cadastro de estoque adicional
   - Cadastro de produto e vinculação a estoques
   - Venda baixa estoque correto
   - Relatórios e dashboard exibem informações esperadas
4. Atualizar pipeline de deploy se necessário (ex.: upload de novos arquivos `api/estoques.php`, `api/formas_pagamento.php`).

## 6. Riscos e Mitigações
- **Complexidade de migração**: rodar scripts em ambiente de staging antes de produção.
- **Compatibilidade API/Frontend**: liberar alterações de backend antes de publicar frontend para evitar chamadas com campos inexistentes.
- **Dados herdados**: definir estoque padrão para vendas/produtos antigos.
- **Performance**: garantir índices em tabelas pivô e colunas usadas em filtros.

## 7. Próximos Passos
1. Implementar script SQL incremental.
2. Criar endpoints `api/estoques.php` e `api/formas_pagamento.php`.
3. Atualizar `api/vendas.php` para usar novas colunas/tabelas.
4. Adequar serviços e componentes no frontend conforme descrito.
5. Executar testes end-to-end e ajustar documentação.
