/**
 * Database schema metadata for the MeguisPet system.
 * Used to provide context to the LangChain SQL Agent about
 * available tables, columns, and relationships.
 */

export interface TableSchema {
  name: string
  description: string
  columns: {
    name: string
    type: string
    nullable: boolean
    description: string
  }[]
  relationships: {
    column: string
    references: string
  }[]
}

/**
 * Tables accessible by the SQL Agent (read-only).
 * Sensitive tables (usuarios, role_permissions_config, agent_*)
 * are intentionally EXCLUDED.
 */
export const AGENT_ACCESSIBLE_TABLES = [
  'vendas',
  'vendas_itens',
  'clientes_fornecedores',
  'produtos',
  'estoques',
  'produtos_estoques',
  'vendedores',
  'transacoes',
  'categorias_financeiras',
  'formas_pagamento',
  'venda_parcelas',
  'movimentacoes_estoque',
  'movimentacoes_itens',
  'impostos_produto',
  'bling_vendas',
  'bling_nfe',
] as const

/**
 * Human-readable descriptions of each table for the system prompt.
 * This helps the LLM understand the business context.
 */
export const TABLE_DESCRIPTIONS: Record<string, string> = {
  vendas:
    'Vendas realizadas. Campos principais: id, numero_venda, cliente_id (FK clientes_fornecedores), vendedor_id (FK vendedores), estoque_id (FK estoques), data_venda, total_produtos_bruto, desconto_total, total_produtos_liquido, total_ipi, total_icms, total_st, valor_final, status, observacoes, forma_pagamento_id. O valor_final e o total real cobrado do cliente.',
  vendas_itens:
    'Itens de cada venda. Campos: id, venda_id (FK vendas), produto_id (FK produtos), quantidade, preco_unitario, desconto_percentual, desconto_valor, subtotal, valor_ipi, valor_icms, valor_st, total_item. Cada linha e um produto vendido.',
  clientes_fornecedores:
    'Clientes e fornecedores unificados. Campo "tipo" diferencia: "cliente", "fornecedor" ou "ambos". Campos: id, nome, tipo, cpf_cnpj, email, telefone, celular, endereco, numero, complemento, bairro, cidade, uf, cep, inscricao_estadual, observacoes, vendedor_id (FK vendedores - vendedor responsavel), ativo.',
  produtos:
    'Catalogo de produtos. Campos: id, nome, sku, descricao, preco_venda, preco_custo, unidade, categoria, ncm, cfop, origem, marca, ativo. Precos em BRL.',
  estoques:
    'Depositos/lojas para controle de estoque. Campos: id, nome, descricao, ativo. Ex: "Matriz", "Filial Centro".',
  produtos_estoques:
    'Quantidade de cada produto em cada deposito. Campos: id, produto_id (FK produtos), estoque_id (FK estoques), quantidade, estoque_minimo, estoque_maximo.',
  vendedores:
    'Equipe de vendas. Campos: id, nome, email, telefone, comissao_percentual, ativo, usuario_id (FK usuarios - link opcional com login do sistema).',
  transacoes:
    'Transacoes financeiras (receitas e despesas). Campos: id, tipo ("receita" ou "despesa"), descricao, valor, data_transacao, data_vencimento, data_pagamento, status ("pendente", "pago", "cancelado"), categoria_id (FK categorias_financeiras), venda_id (FK vendas - se originada de venda), observacoes.',
  categorias_financeiras:
    'Categorias para classificar transacoes financeiras. Campos: id, nome, tipo ("receita" ou "despesa"), descricao, ativo.',
  formas_pagamento:
    'Formas de pagamento aceitas. Campos: id, nome, taxa_percentual, prazo_dias, parcelas_max, ativo. Ex: "Dinheiro", "Cartao Credito", "PIX", "Boleto".',
  venda_parcelas:
    'Parcelas de vendas parceladas. Campos: id, venda_id (FK vendas), numero_parcela, valor, data_vencimento, data_pagamento, status ("pendente", "pago", "atrasado"), forma_pagamento_id.',
  movimentacoes_estoque:
    'Movimentacoes de estoque (entradas, saidas, transferencias, ajustes). Campos: id, tipo ("entrada", "saida", "transferencia", "ajuste"), estoque_origem_id, estoque_destino_id, observacoes, created_at.',
  movimentacoes_itens:
    'Itens de cada movimentacao de estoque. Campos: id, movimentacao_id (FK movimentacoes_estoque), produto_id (FK produtos), quantidade.',
  impostos_produto:
    'Configuracao de impostos por produto. Campos: id, produto_id (FK produtos), ncm, cfop, origem, aliquota_ipi, aliquota_icms, mva, aliquota_icms_st, uf, ativo.',
  bling_vendas:
    'Vendas sincronizadas do Bling ERP. Campos: id, bling_id, numero_pedido, data_pedido, contato_nome, total_produtos, valor_total, situacao_id, marketplace, raw_data (JSONB com dados completos do Bling), synced_at.',
  bling_nfe:
    'Notas fiscais sincronizadas do Bling ERP. Campos: id, bling_id, numero_nfe, serie, data_emissao, valor_total, situacao, tipo, chave_acesso, raw_data (JSONB), synced_at.',
}

/**
 * Generates a schema description string for the system prompt.
 * This gives the LLM enough context to generate accurate SQL queries.
 */
export function generateSchemaDescription(): string {
  const lines: string[] = ['Tabelas disponiveis no banco de dados:\n']

  for (const table of AGENT_ACCESSIBLE_TABLES) {
    const desc = TABLE_DESCRIPTIONS[table]
    if (desc) {
      lines.push(`- **${table}**: ${desc}`)
    }
  }

  lines.push('\nRelacionamentos importantes:')
  lines.push('- vendas.cliente_id -> clientes_fornecedores.id')
  lines.push('- vendas.vendedor_id -> vendedores.id')
  lines.push('- vendas.estoque_id -> estoques.id')
  lines.push('- vendas.forma_pagamento_id -> formas_pagamento.id')
  lines.push('- vendas_itens.venda_id -> vendas.id')
  lines.push('- vendas_itens.produto_id -> produtos.id')
  lines.push('- produtos_estoques.produto_id -> produtos.id')
  lines.push('- produtos_estoques.estoque_id -> estoques.id')
  lines.push('- transacoes.categoria_id -> categorias_financeiras.id')
  lines.push('- transacoes.venda_id -> vendas.id')
  lines.push('- venda_parcelas.venda_id -> vendas.id')
  lines.push('- movimentacoes_itens.movimentacao_id -> movimentacoes_estoque.id')
  lines.push('- movimentacoes_itens.produto_id -> produtos.id')
  lines.push('- clientes_fornecedores.vendedor_id -> vendedores.id')

  return lines.join('\n')
}
