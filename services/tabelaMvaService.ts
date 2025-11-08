// ============================================================================
// TABELA MVA SERVICE
// ============================================================================
// Service for managing MVA (Margem de Valor Agregado) table
// Handles tax rates and MVA values by state (UF) and NCM code
// ============================================================================

import { getSupabaseBrowser } from '@/lib/supabase'
import type { TabelaMva, TabelaMvaForm } from '@/types'

export interface TabelaMvaFilters {
  uf?: string
  ncm?: string
  sujeito_st?: boolean
  ativo?: boolean
}

export interface TabelaMvaResponse {
  data: TabelaMva[]
  total: number
  page: number
  limit: number
}

export const tabelaMvaService = {
  /**
   * List all MVA tables with pagination and filters
   */
  async getAll(
    page = 1,
    limit = 50,
    filters: TabelaMvaFilters = {}
  ): Promise<TabelaMvaResponse> {
    const supabase = getSupabaseBrowser()
    const offset = (page - 1) * limit

    let query = supabase
      .from('tabela_mva')
      .select('*', { count: 'exact' })
      .order('uf', { ascending: true })
      .order('ncm', { ascending: true })

    // Apply filters
    if (filters.uf) {
      query = query.eq('uf', filters.uf.toUpperCase())
    }

    if (filters.ncm) {
      query = query.eq('ncm', filters.ncm)
    }

    if (filters.sujeito_st !== undefined) {
      query = query.eq('sujeito_st', filters.sujeito_st)
    }

    if (filters.ativo !== undefined) {
      query = query.eq('ativo', filters.ativo)
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching tabela_mva:', error)
      throw new Error(`Erro ao buscar tabela MVA: ${error.message}`)
    }

    return {
      data: data || [],
      total: count || 0,
      page,
      limit
    }
  },

  /**
   * Get MVA table by ID
   */
  async getById(id: string): Promise<TabelaMva | null> {
    const supabase = getSupabaseBrowser()

    const { data, error } = await supabase
      .from('tabela_mva')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Not found
      }
      console.error('Error fetching tabela_mva by id:', error)
      throw new Error(`Erro ao buscar MVA: ${error.message}`)
    }

    return data
  },

  /**
   * Get MVA table by UF and NCM
   */
  async getByUfNcm(uf: string, ncm: string): Promise<TabelaMva | null> {
    const supabase = getSupabaseBrowser()

    const { data, error } = await supabase
      .from('tabela_mva')
      .select('*')
      .eq('uf', uf.toUpperCase())
      .eq('ncm', ncm)
      .eq('ativo', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Not found
      }
      console.error('Error fetching tabela_mva by UF/NCM:', error)
      throw new Error(`Erro ao buscar MVA: ${error.message}`)
    }

    return data
  },

  /**
   * Get all UFs (states) available in the table
   */
  async getAllUFs(): Promise<string[]> {
    const supabase = getSupabaseBrowser()

    const { data, error } = await supabase
      .from('tabela_mva')
      .select('uf')
      .eq('ativo', true)
      .order('uf', { ascending: true })

    if (error) {
      console.error('Error fetching UFs:', error)
      throw new Error(`Erro ao buscar UFs: ${error.message}`)
    }

    // Remove duplicates
    const uniqueUFs = Array.from(new Set(data.map(item => item.uf)))
    return uniqueUFs
  },

  /**
   * Get all NCMs available in the table
   */
  async getAllNCMs(): Promise<string[]> {
    const supabase = getSupabaseBrowser()

    const { data, error } = await supabase
      .from('tabela_mva')
      .select('ncm')
      .eq('ativo', true)
      .order('ncm', { ascending: true })

    if (error) {
      console.error('Error fetching NCMs:', error)
      throw new Error(`Erro ao buscar NCMs: ${error.message}`)
    }

    // Remove duplicates
    const uniqueNCMs = Array.from(new Set(data.map(item => item.ncm)))
    return uniqueNCMs
  },

  /**
   * Create new MVA table entry
   */
  async create(formData: TabelaMvaForm): Promise<TabelaMva> {
    const supabase = getSupabaseBrowser()

    const { data, error } = await supabase
      .from('tabela_mva')
      .insert({
        ...formData,
        uf: formData.uf.toUpperCase()
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating tabela_mva:', error)
      throw new Error(`Erro ao criar MVA: ${error.message}`)
    }

    return data
  },

  /**
   * Update MVA table entry
   */
  async update(id: string, formData: Partial<TabelaMvaForm>): Promise<TabelaMva> {
    const supabase = getSupabaseBrowser()

    const updateData: Record<string, unknown> = { ...formData }
    if (updateData.uf) {
      updateData.uf = (updateData.uf as string).toUpperCase()
    }

    const { data, error } = await supabase
      .from('tabela_mva')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating tabela_mva:', error)
      throw new Error(`Erro ao atualizar MVA: ${error.message}`)
    }

    return data
  },

  /**
   * Delete MVA table entry (soft delete - sets ativo = false)
   */
  async delete(id: string): Promise<void> {
    const supabase = getSupabaseBrowser()

    const { error } = await supabase
      .from('tabela_mva')
      .update({ ativo: false })
      .eq('id', id)

    if (error) {
      console.error('Error deleting tabela_mva:', error)
      throw new Error(`Erro ao deletar MVA: ${error.message}`)
    }
  },

  /**
   * Hard delete MVA table entry
   */
  async hardDelete(id: string): Promise<void> {
    const supabase = getSupabaseBrowser()

    const { error } = await supabase
      .from('tabela_mva')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error hard deleting tabela_mva:', error)
      throw new Error(`Erro ao deletar permanentemente MVA: ${error.message}`)
    }
  },

  /**
   * Search MVA tables by description
   */
  async search(searchTerm: string, limit = 20): Promise<TabelaMva[]> {
    const supabase = getSupabaseBrowser()

    const { data, error } = await supabase
      .from('tabela_mva')
      .select('*')
      .ilike('descricao', `%${searchTerm}%`)
      .eq('ativo', true)
      .order('uf', { ascending: true })
      .limit(limit)

    if (error) {
      console.error('Error searching tabela_mva:', error)
      throw new Error(`Erro ao buscar MVA: ${error.message}`)
    }

    return data || []
  }
}
