// ============================================================================
// IMPOSTOS SERVICE
// ============================================================================
// Service for managing product tax configuration (impostos_produto)
// Handles NCM, CEST, MVA, and tax rates per product
// ============================================================================

import { getSupabaseBrowser } from '@/lib/supabase'
import type { ImpostoProduto, ImpostoProdutoForm } from '@/types'

export interface ImpostoProdutoResponse {
  data: ImpostoProduto[]
  total: number
  page: number
  limit: number
}

export const impostosService = {
  /**
   * List all product tax configurations with pagination
   */
  async getAll(page = 1, limit = 50): Promise<ImpostoProdutoResponse> {
    const supabase = getSupabaseBrowser()
    const offset = (page - 1) * limit

    const { data, error, count } = await supabase
      .from('impostos_produto')
      .select(`
        *,
        produto:produtos(id, nome, codigo_barras)
      `, { count: 'exact' })
      .eq('ativo', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      throw new Error(`Erro ao buscar impostos: ${error.message}`)
    }

    return {
      data: data || [],
      total: count || 0,
      page,
      limit
    }
  },

  /**
   * Get tax configuration by ID
   */
  async getById(id: string): Promise<ImpostoProduto | null> {
    const supabase = getSupabaseBrowser()

    const { data, error } = await supabase
      .from('impostos_produto')
      .select(`
        *,
        produto:produtos(id, nome, codigo_barras, preco_venda, preco_custo)
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Not found
      }
      throw new Error(`Erro ao buscar imposto: ${error.message}`)
    }

    return data
  },

  /**
   * Get tax configuration by product ID
   */
  async getByProdutoId(produtoId: number): Promise<ImpostoProduto | null> {
    const supabase = getSupabaseBrowser()

    const { data, error } = await supabase
      .from('impostos_produto')
      .select(`
        *,
        produto:produtos(id, nome, codigo_barras, preco_venda, preco_custo)
      `)
      .eq('produto_id', produtoId)
      .eq('ativo', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Not found
      }
      throw new Error(`Erro ao buscar imposto do produto: ${error.message}`)
    }

    return data
  },

  /**
   * Get tax configuration by NCM
   */
  async getByNCM(ncm: string): Promise<ImpostoProduto[]> {
    const supabase = getSupabaseBrowser()

    const { data, error } = await supabase
      .from('impostos_produto')
      .select(`
        *,
        produto:produtos(id, nome, codigo_barras)
      `)
      .eq('ncm', ncm)
      .eq('ativo', true)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Erro ao buscar impostos por NCM: ${error.message}`)
    }

    return data || []
  },

  /**
   * Create new product tax configuration
   */
  async create(formData: ImpostoProdutoForm): Promise<ImpostoProduto> {
    const supabase = getSupabaseBrowser()


    const { data, error } = await supabase
      .from('impostos_produto')
      .insert(formData)
      .select(`
        *,
        produto:produtos(id, nome, codigo_barras)
      `)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Erro: A configuração não foi criada. Verifique as permissões.')
      }
      throw new Error(`Erro ao criar configuração de imposto: ${error.message}`)
    }

    if (!data) {
      throw new Error('Erro: Nenhum dado retornado após criar configuração')
    }

    return data
  },

  /**
   * Update product tax configuration
   */
  async update(id: string, formData: Partial<ImpostoProdutoForm>): Promise<ImpostoProduto> {
    const supabase = getSupabaseBrowser()


    const { data, error} = await supabase
      .from('impostos_produto')
      .update(formData)
      .eq('id', id)
      .select(`
        *,
        produto:produtos(id, nome, codigo_barras)
      `)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Erro: Registro não encontrado ou sem permissão para atualizar.')
      }
      throw new Error(`Erro ao atualizar imposto: ${error.message}`)
    }

    if (!data) {
      throw new Error('Erro: Nenhum dado retornado após atualizar configuração')
    }

    return data
  },

  /**
   * Update product tax configuration by product ID
   */
  async updateByProdutoId(produtoId: number, formData: Partial<ImpostoProdutoForm>): Promise<ImpostoProduto> {
    const supabase = getSupabaseBrowser()

    const { data, error } = await supabase
      .from('impostos_produto')
      .update(formData)
      .eq('produto_id', produtoId)
      .select(`
        *,
        produto:produtos(id, nome, codigo_barras)
      `)
      .single()

    if (error) {
      throw new Error(`Erro ao atualizar imposto do produto: ${error.message}`)
    }

    return data
  },

  /**
   * Delete product tax configuration (soft delete - sets ativo = false)
   */
  async delete(id: string): Promise<void> {
    const supabase = getSupabaseBrowser()

    const { error } = await supabase
      .from('impostos_produto')
      .update({ ativo: false })
      .eq('id', id)

    if (error) {
      throw new Error(`Erro ao deletar imposto: ${error.message}`)
    }
  },

  /**
   * Hard delete product tax configuration
   */
  async hardDelete(id: string): Promise<void> {
    const supabase = getSupabaseBrowser()

    const { error } = await supabase
      .from('impostos_produto')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Erro ao deletar permanentemente imposto: ${error.message}`)
    }
  },

  /**
   * Create or update product tax configuration (upsert)
   * If product already has tax config, update it; otherwise, create new
   */
  async upsert(formData: ImpostoProdutoForm): Promise<ImpostoProduto> {

    const existing = await this.getByProdutoId(formData.produto_id)

    if (existing) {
      return this.update(existing.id, formData)
    } else {
      return this.create(formData)
    }
  },

  /**
   * Get products without tax configuration
   */
  async getProdutosSemImposto(limit = 50): Promise<{ id: number; nome: string; codigo_barras?: string }[]> {
    const supabase = getSupabaseBrowser()

    // Get all product IDs that have tax config
    const { data: produtosComImposto, error: errorImposto } = await supabase
      .from('impostos_produto')
      .select('produto_id')
      .eq('ativo', true)

    if (errorImposto) {
      throw new Error(`Erro ao buscar produtos com imposto: ${errorImposto.message}`)
    }

    const produtoIdsComImposto = produtosComImposto?.map(p => p.produto_id) || []

    // Get produtos NOT in that list
    const { data: produtos, error: errorProdutos } = await supabase
      .from('produtos')
      .select('id, nome, codigo_barras')
      .eq('ativo', true)
      .not('id', 'in', `(${produtoIdsComImposto.join(',')})`)
      .order('nome', { ascending: true })
      .limit(limit)

    if (errorProdutos) {
      throw new Error(`Erro ao buscar produtos sem imposto: ${errorProdutos.message}`)
    }

    return produtos || []
  },

  /**
   * Bulk create tax configurations for multiple products
   */
  async bulkCreate(formDataArray: ImpostoProdutoForm[]): Promise<ImpostoProduto[]> {
    const supabase = getSupabaseBrowser()

    const { data, error } = await supabase
      .from('impostos_produto')
      .insert(formDataArray)
      .select(`
        *,
        produto:produtos(id, nome, codigo_barras)
      `)

    if (error) {
      throw new Error(`Erro ao criar configurações em lote: ${error.message}`)
    }

    return data || []
  },

  /**
   * Get MVA (Margem de Valor Agregado) and tax rates by UF and NCM
   * Used for ST (Substituição Tributária) calculation
   */
  async getMVA(uf: string, ncm: string): Promise<{
    mva: number | null
    aliquota_interna: number | null
    aliquota_efetiva: number | null
    sujeito_st: boolean
  } | null> {
    const supabase = getSupabaseBrowser()

    const { data, error } = await supabase
      .from('tabela_mva')
      .select('mva, aliquota_interna, aliquota_fundo, aliquota_efetiva, sujeito_st')
      .eq('uf', uf.toUpperCase())
      .eq('ncm', ncm)
      .eq('ativo', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Not found
      }
      throw new Error(`Erro ao buscar MVA: ${error.message}`)
    }

    return {
      mva: data.mva,
      aliquota_interna: data.aliquota_interna,
      aliquota_efetiva: data.aliquota_efetiva || data.aliquota_interna,
      sujeito_st: data.sujeito_st
    }
  }
}
