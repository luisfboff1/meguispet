// 🔐 TIPOS DE PERMISSÕES - MEGUISPET SYSTEM
// Sistema de controle de acesso baseado em roles e permissões granulares

export type UserRole =
  | 'admin'           // Acesso total ao sistema
  | 'gerente'         // Gestão da equipe e relatórios completos
  | 'vendedor'        // Apenas suas vendas e clientes
  | 'financeiro'      // Módulo financeiro e relatórios
  | 'estoque'         // Gestão de produtos e estoque
  | 'operador'        // Operações básicas (PDV)
  | 'visualizador'    // Apenas visualização (read-only)

/**
 * Interface de Permissões Granulares
 *
 * Cada permissão controla acesso a uma funcionalidade específica.
 * true = permitido, false = negado
 */
export interface Permissoes {
  [key: string]: boolean                // Index signature para acesso dinâmico

  // ===== MÓDULOS PRINCIPAIS =====
  dashboard: boolean                    // Acesso ao dashboard
  vendas: boolean                       // Módulo de vendas
  clientes: boolean                     // Módulo de clientes
  produtos: boolean                     // Módulo de produtos
  estoque: boolean                      // Módulo de estoque
  financeiro: boolean                   // Módulo financeiro
  relatorios: boolean                   // Módulo de relatórios
  configuracoes: boolean                // Configurações gerais
  usuarios: boolean                     // Gestão de usuários

  // ===== AÇÕES DE VENDAS =====
  vendas_criar: boolean                 // Criar novas vendas
  vendas_editar: boolean                // Editar vendas existentes
  vendas_deletar: boolean               // Deletar vendas
  vendas_visualizar_todas: boolean      // Ver vendas de todos (false = só as próprias)

  // ===== AÇÕES DE CLIENTES =====
  clientes_criar: boolean               // Criar novos clientes
  clientes_editar: boolean              // Editar clientes
  clientes_deletar: boolean             // Deletar clientes
  clientes_visualizar_todos: boolean    // Ver todos os clientes (false = só os próprios)

  // ===== AÇÕES DE PRODUTOS =====
  produtos_criar: boolean               // Criar novos produtos
  produtos_editar: boolean              // Editar produtos
  produtos_deletar: boolean             // Deletar produtos
  produtos_ajustar_estoque: boolean     // Ajustar quantidades de estoque

  // ===== AÇÕES FINANCEIRAS =====
  financeiro_visualizar: boolean        // Visualizar módulo financeiro
  financeiro_criar_transacao: boolean   // Criar transações
  financeiro_editar_transacao: boolean  // Editar transações

  // ===== AÇÕES DE RELATÓRIOS =====
  relatorios_gerar: boolean             // Gerar novos relatórios
  relatorios_exportar: boolean          // Exportar relatórios (PDF, Excel, CSV)

  // ===== AÇÕES DE CONFIGURAÇÃO =====
  config_sistema: boolean               // Configurações do sistema
  config_usuarios: boolean              // Gerenciar usuários e permissões
}

/**
 * Presets de Permissões por Role
 *
 * Define o conjunto padrão de permissões para cada tipo de usuário.
 * Pode ser customizado individualmente pelo admin.
 */
export const PERMISSIONS_PRESETS: Record<UserRole, Partial<Permissoes>> = {
  /**
   * ADMIN - Acesso Total
   * Controle completo de todo o sistema
   */
  admin: {
    dashboard: true,
    vendas: true,
    vendas_criar: true,
    vendas_editar: true,
    vendas_deletar: true,
    vendas_visualizar_todas: true,
    clientes: true,
    clientes_criar: true,
    clientes_editar: true,
    clientes_deletar: true,
    clientes_visualizar_todos: true,
    produtos: true,
    produtos_criar: true,
    produtos_editar: true,
    produtos_deletar: true,
    produtos_ajustar_estoque: true,
    estoque: true,
    financeiro: true,
    financeiro_visualizar: true,
    financeiro_criar_transacao: true,
    financeiro_editar_transacao: true,
    relatorios: true,
    relatorios_gerar: true,
    relatorios_exportar: true,
    configuracoes: true,
    config_sistema: true,
    config_usuarios: true,
    usuarios: true,
  },

  /**
   * VENDEDOR - Foco em Vendas
   * Vê apenas suas vendas e clientes
   * Não acessa financeiro ou configurações
   */
  vendedor: {
    dashboard: true,
    vendas: true,
    vendas_criar: true,
    vendas_editar: true,
    vendas_deletar: false,
    vendas_visualizar_todas: false,        // ⚠️ Só vê as próprias vendas
    clientes: true,
    clientes_criar: true,
    clientes_editar: true,
    clientes_deletar: false,
    clientes_visualizar_todos: false,      // ⚠️ Só vê seus clientes
    produtos: true,                        // Pode ver produtos para fazer vendas
    produtos_criar: false,
    produtos_editar: false,
    produtos_deletar: false,
    produtos_ajustar_estoque: false,
    estoque: false,
    financeiro: false,                     // ⚠️ Não acessa financeiro
    financeiro_visualizar: false,
    financeiro_criar_transacao: false,
    financeiro_editar_transacao: false,
    relatorios: true,                      // Pode ver relatórios de suas vendas
    relatorios_gerar: false,
    relatorios_exportar: false,
    configuracoes: false,
    config_sistema: false,
    config_usuarios: false,
    usuarios: false,
  },

  /**
   * FINANCEIRO - Foco em Finanças
   * Acessa relatórios e financeiro
   * Não gerencia produtos ou estoque
   */
  financeiro: {
    dashboard: true,
    vendas: true,
    vendas_criar: false,
    vendas_editar: false,
    vendas_deletar: false,
    vendas_visualizar_todas: true,         // ✓ Vê todas as vendas
    clientes: true,
    clientes_criar: false,
    clientes_editar: false,
    clientes_deletar: false,
    clientes_visualizar_todos: true,       // ✓ Vê todos os clientes
    produtos: true,                        // Só visualização
    produtos_criar: false,
    produtos_editar: false,
    produtos_deletar: false,
    produtos_ajustar_estoque: false,
    estoque: false,
    financeiro: true,                      // ✓ Acesso total ao financeiro
    financeiro_visualizar: true,
    financeiro_criar_transacao: true,
    financeiro_editar_transacao: true,
    relatorios: true,
    relatorios_gerar: true,
    relatorios_exportar: true,
    configuracoes: false,
    config_sistema: false,
    config_usuarios: false,
    usuarios: false,
  },

  /**
   * GERENTE - Gestão de Equipe
   * Acessa quase tudo, menos configurações do sistema
   */
  gerente: {
    dashboard: true,
    vendas: true,
    vendas_criar: true,
    vendas_editar: true,
    vendas_deletar: true,
    vendas_visualizar_todas: true,
    clientes: true,
    clientes_criar: true,
    clientes_editar: true,
    clientes_deletar: true,
    clientes_visualizar_todos: true,
    produtos: true,
    produtos_criar: true,
    produtos_editar: true,
    produtos_deletar: false,               // Não deleta produtos
    produtos_ajustar_estoque: true,
    estoque: true,
    financeiro: true,
    financeiro_visualizar: true,
    financeiro_criar_transacao: false,     // Não cria transações financeiras
    financeiro_editar_transacao: false,
    relatorios: true,
    relatorios_gerar: true,
    relatorios_exportar: true,
    configuracoes: false,                  // Não acessa config do sistema
    config_sistema: false,
    config_usuarios: false,
    usuarios: false,
  },

  /**
   * ESTOQUE - Gestão de Produtos
   * Foco em produtos e movimentações de estoque
   */
  estoque: {
    dashboard: true,
    vendas: true,                          // Visualização de vendas
    vendas_criar: false,
    vendas_editar: false,
    vendas_deletar: false,
    vendas_visualizar_todas: true,
    clientes: false,
    clientes_criar: false,
    clientes_editar: false,
    clientes_deletar: false,
    clientes_visualizar_todos: false,
    produtos: true,
    produtos_criar: true,
    produtos_editar: true,
    produtos_deletar: false,
    produtos_ajustar_estoque: true,
    estoque: true,
    financeiro: false,
    financeiro_visualizar: false,
    financeiro_criar_transacao: false,
    financeiro_editar_transacao: false,
    relatorios: true,
    relatorios_gerar: true,
    relatorios_exportar: false,
    configuracoes: false,
    config_sistema: false,
    config_usuarios: false,
    usuarios: false,
  },

  /**
   * OPERADOR - Operações Básicas
   * PDV e cadastros simples
   */
  operador: {
    dashboard: true,
    vendas: true,
    vendas_criar: true,
    vendas_editar: false,
    vendas_deletar: false,
    vendas_visualizar_todas: false,
    clientes: true,
    clientes_criar: true,
    clientes_editar: false,
    clientes_deletar: false,
    clientes_visualizar_todos: false,
    produtos: true,
    produtos_criar: false,
    produtos_editar: false,
    produtos_deletar: false,
    produtos_ajustar_estoque: false,
    estoque: false,
    financeiro: false,
    financeiro_visualizar: false,
    financeiro_criar_transacao: false,
    financeiro_editar_transacao: false,
    relatorios: false,
    relatorios_gerar: false,
    relatorios_exportar: false,
    configuracoes: false,
    config_sistema: false,
    config_usuarios: false,
    usuarios: false,
  },

  /**
   * VISUALIZADOR - Apenas Leitura
   * Pode visualizar mas não editar nada
   */
  visualizador: {
    dashboard: true,
    vendas: true,
    vendas_criar: false,
    vendas_editar: false,
    vendas_deletar: false,
    vendas_visualizar_todas: true,
    clientes: true,
    clientes_criar: false,
    clientes_editar: false,
    clientes_deletar: false,
    clientes_visualizar_todos: true,
    produtos: true,
    produtos_criar: false,
    produtos_editar: false,
    produtos_deletar: false,
    produtos_ajustar_estoque: false,
    estoque: true,
    financeiro: false,
    financeiro_visualizar: false,
    financeiro_criar_transacao: false,
    financeiro_editar_transacao: false,
    relatorios: true,
    relatorios_gerar: false,
    relatorios_exportar: false,
    configuracoes: false,
    config_sistema: false,
    config_usuarios: false,
    usuarios: false,
  },
}

/**
 * Função helper para obter permissões padrão de um role
 */
export function getDefaultPermissions(role: UserRole): Partial<Permissoes> {
  return PERMISSIONS_PRESETS[role] || {}
}

/**
 * Função helper para verificar se um role tem acesso total
 */
export function isFullAccessRole(role: UserRole): boolean {
  return role === 'admin'
}

/**
 * Função helper para verificar se um role precisa de vendedor vinculado
 */
export function roleRequiresVendedor(role: UserRole): boolean {
  return role === 'vendedor'
}

/**
 * Mescla permissões de múltiplos roles
 *
 * @param primaryRole - Role primário do usuário
 * @param additionalRoles - Array de roles adicionais
 * @param customPermissions - Permissões customizadas pelo admin (sobrescreve tudo)
 * @returns Permissões mescladas (OR lógico: se qualquer role permite, a permissão é concedida)
 *
 * @example
 * ```typescript
 * // Usuário é vendedor + financeiro
 * const perms = mergePermissions('vendedor', ['financeiro'], {})
 * // Resultado: vendas_visualizar_todas = true (financeiro permite)
 * //            vendas_criar = true (vendedor permite)
 * //            financeiro = true (financeiro permite)
 * ```
 */
export function mergePermissions(
  primaryRole: UserRole,
  additionalRoles: UserRole[] = [],
  customPermissions: Partial<Permissoes> = {}
): Permissoes {
  // 1. Começar com permissões do role primário
  let merged = { ...PERMISSIONS_PRESETS[primaryRole] } as Partial<Permissoes>

  // 2. Adicionar permissões de roles adicionais (OR lógico)
  additionalRoles.forEach(role => {
    const rolePerms = PERMISSIONS_PRESETS[role]
    Object.keys(rolePerms).forEach(key => {
      const permKey = key as keyof Permissoes
      // Se qualquer role permite, conceder a permissão
      if (rolePerms[permKey] === true) {
        merged[permKey] = true
      }
    })
  })

  // 3. Aplicar customizações do admin (sobrescreve tudo)
  merged = { ...merged, ...customPermissions }

  // 4. Garantir que todas as permissões têm valor (default false)
  const allPermissions: Permissoes = {
    dashboard: false,
    vendas: false,
    vendas_criar: false,
    vendas_editar: false,
    vendas_deletar: false,
    vendas_visualizar_todas: false,
    clientes: false,
    clientes_criar: false,
    clientes_editar: false,
    clientes_deletar: false,
    clientes_visualizar_todos: false,
    produtos: false,
    produtos_criar: false,
    produtos_editar: false,
    produtos_deletar: false,
    produtos_ajustar_estoque: false,
    estoque: false,
    financeiro: false,
    financeiro_visualizar: false,
    financeiro_criar_transacao: false,
    financeiro_editar_transacao: false,
    relatorios: false,
    relatorios_gerar: false,
    relatorios_exportar: false,
    configuracoes: false,
    config_sistema: false,
    config_usuarios: false,
    usuarios: false,
    ...merged,
  }

  return allPermissions
}
