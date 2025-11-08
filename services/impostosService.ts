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
        tabela_mva(*),
        produto:produtos(id, nome, codigo_barras)
      `, { count: 'exact' })
      .eq('ativo', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching impostos_produto:', error)
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
        tabela_mva(*),
        produto:produtos(id, nome, codigo_barras, preco_venda, preco_custo)
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Not found
      }
      console.error('Error fetching impostos_produto by id:', error)
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
        tabela_mva(*),
        produto:produtos(id, nome, codigo_barras, preco_venda, preco_custo)
      `)
      .eq('produto_id', produtoId)
      .eq('ativo', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Not found
      }
      console.error('Error fetching impostos_produto by produto_id:', error)
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
        tabela_mva(*),
        produto:produtos(id, nome, codigo_barras)
      `)
      .eq('ncm', ncm)
      .eq('ativo', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching impostos_produto by NCM:', error)
      throw new Error(`Erro ao buscar impostos por NCM: ${error.message}`)
    }

    return data || []
  },

  /**
   * Create new product tax configuration
   */
  async create(formData: ImpostoProdutoForm): Promise<ImpostoProduto> {
    const supabase = getSupabaseBrowser()

    console.log('[impostosService.create] Creating with data:', formData)

    const { data, error } = await supabase
      .from('impostos_produto')
      .insert(formData)
      .select(`
        *,
        tabela_mva(*),
        produto:produtos(id, nome, codigo_barras)
      `)
      .single()

    if (error) {
      console.error('[impostosService.create] Error:', error)
      if (error.code === 'PGRST116') {
        throw new Error('Erro: A configuração não foi criada. Verifique as permissões.')
      }
      throw new Error(`Erro ao criar configuração de imposto: ${error.message}`)
    }

    if (!data) {
      console.error('[impostosService.create] No data returned')
      throw new Error('Erro: Nenhum dado retornado após criar configuração')
    }

    console.log('[impostosService.create] Success:', data)
    return data
  },

  /**
   * Update product tax configuration
   */
  async update(id: string, formData: Partial<ImpostoProdutoForm>): Promise<ImpostoProduto> {
    const supabase = getSupabaseBrowser()

    console.log('[impostosService.update] Updating id:', id, 'with data:', formData)

    const { data, error } = await supabase
      .from('impostos_produto')
      .update(formData)
      .eq('id', id)
      .select(`
        *,
        tabela_mva(*),
        produto:produtos(id, nome, codigo_barras)
      `)
      .single()

    if (error) {
      console.error('[impostosService.update] Error:', error)
      if (error.code === 'PGRST116') {
        throw new Error('Erro: Registro não encontrado ou sem permissão para atualizar.')
      }
      throw new Error(`Erro ao atualizar imposto: ${error.message}`)
    }

    if (!data) {
      console.error('[impostosService.update] No data returned')
      throw new Error('Erro: Nenhum dado retornado após atualizar configuração')
    }

    console.log('[impostosService.update] Success:', data)
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
        tabela_mva(*),
        produto:produtos(id, nome, codigo_barras)
      `)
      .single()

    if (error) {
      console.error('Error updating impostos_produto by produto_id:', error)
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
      console.error('Error deleting impostos_produto:', error)
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
      console.error('Error hard deleting impostos_produto:', error)
      throw new Error(`Erro ao deletar permanentemente imposto: ${error.message}`)
    }
  },

  /**
   * Create or update product tax configuration (upsert)
   * If product already has tax config, update it; otherwise, create new
   */
  async upsert(formData: ImpostoProdutoForm): Promise<ImpostoProduto> {
    console.log('[impostosService.upsert] Called with produto_id:', formData.produto_id)

    const existing = await this.getByProdutoId(formData.produto_id)

    if (existing) {
      console.log('[impostosService.upsert] Found existing config, updating...')
      return this.update(existing.id, formData)
    } else {
      console.log('[impostosService.upsert] No existing config, creating new...')
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
      console.error('Error fetching produtos with imposto:', errorImposto)
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
      console.error('Error fetching produtos sem imposto:', errorProdutos)
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
        tabela_mva(*),
        produto:produtos(id, nome, codigo_barras)
      `)

    if (error) {
      console.error('Error bulk creating impostos_produto:', error)
      throw new Error(`Erro ao criar configurações em lote: ${error.message}`)
    }

    return data || []
  }
}
