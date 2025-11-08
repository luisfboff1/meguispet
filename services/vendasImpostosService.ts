// ============================================================================
// VENDAS IMPOSTOS SERVICE
// ============================================================================
// Service for managing sale tax calculations (vendas_impostos)
// Handles consolidated tax calculations per sale
// ============================================================================

import { getSupabaseBrowser } from '@/lib/supabase'
import type { VendaImposto, VendaImpostoForm } from '@/types'

export const vendasImpostosService = {
  /**
   * Get tax calculation for a sale
   */
  async getByVendaId(vendaId: number): Promise<VendaImposto | null> {
    const supabase = getSupabaseBrowser()

    const { data, error } = await supabase
      .from('vendas_impostos')
      .select('*')
      .eq('venda_id', vendaId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Not found
      }
      console.error('Error fetching vendas_impostos:', error)
      throw new Error(`Erro ao buscar impostos da venda: ${error.message}`)
    }

    return data
  },

  /**
   * Get tax calculation by ID
   */
  async getById(id: string): Promise<VendaImposto | null> {
    const supabase = getSupabaseBrowser()

    const { data, error } = await supabase
      .from('vendas_impostos')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Not found
      }
      console.error('Error fetching vendas_impostos by id:', error)
      throw new Error(`Erro ao buscar impostos: ${error.message}`)
    }

    return data
  },

  /**
   * List all sale tax calculations with pagination
   */
  async getAll(page = 1, limit = 50): Promise<{
    data: VendaImposto[]
    total: number
    page: number
    limit: number
  }> {
    const supabase = getSupabaseBrowser()
    const offset = (page - 1) * limit

    const { data, error, count } = await supabase
      .from('vendas_impostos')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching vendas_impostos:', error)
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
   * Create new sale tax calculation
   */
  async create(formData: VendaImpostoForm): Promise<VendaImposto> {
    const supabase = getSupabaseBrowser()

    const { data, error } = await supabase
      .from('vendas_impostos')
      .insert(formData)
      .select()
      .single()

    if (error) {
      console.error('Error creating vendas_impostos:', error)
      throw new Error(`Erro ao criar impostos da venda: ${error.message}`)
    }

    return data
  },

  /**
   * Update sale tax calculation
   */
  async update(id: string, formData: Partial<VendaImpostoForm>): Promise<VendaImposto> {
    const supabase = getSupabaseBrowser()

    const { data, error } = await supabase
      .from('vendas_impostos')
      .update(formData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating vendas_impostos:', error)
      throw new Error(`Erro ao atualizar impostos: ${error.message}`)
    }

    return data
  },

  /**
   * Update sale tax calculation by venda_id
   */
  async updateByVendaId(vendaId: number, formData: Partial<VendaImpostoForm>): Promise<VendaImposto> {
    const supabase = getSupabaseBrowser()

    const { data, error } = await supabase
      .from('vendas_impostos')
      .update(formData)
      .eq('venda_id', vendaId)
      .select()
      .single()

    if (error) {
      console.error('Error updating vendas_impostos by venda_id:', error)
      throw new Error(`Erro ao atualizar impostos da venda: ${error.message}`)
    }

    return data
  },

  /**
   * Delete sale tax calculation
   */
  async delete(id: string): Promise<void> {
    const supabase = getSupabaseBrowser()

    const { error } = await supabase
      .from('vendas_impostos')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting vendas_impostos:', error)
      throw new Error(`Erro ao deletar impostos: ${error.message}`)
    }
  },

  /**
   * Delete sale tax calculation by venda_id
   */
  async deleteByVendaId(vendaId: number): Promise<void> {
    const supabase = getSupabaseBrowser()

    const { error } = await supabase
      .from('vendas_impostos')
      .delete()
      .eq('venda_id', vendaId)

    if (error) {
      console.error('Error deleting vendas_impostos by venda_id:', error)
      throw new Error(`Erro ao deletar impostos da venda: ${error.message}`)
    }
  },

  /**
   * Create or update sale tax calculation (upsert)
   * If venda already has tax calc, update it; otherwise, create new
   */
  async upsert(formData: VendaImpostoForm): Promise<VendaImposto> {
    const existing = await this.getByVendaId(formData.venda_id)

    if (existing) {
      return this.update(existing.id, formData)
    } else {
      return this.create(formData)
    }
  },

  /**
   * Toggle PDF display setting for a sale
   */
  async toggleExibirNoPdf(vendaId: number): Promise<VendaImposto> {
    const supabase = getSupabaseBrowser()

    const existing = await this.getByVendaId(vendaId)

    if (!existing) {
      throw new Error('Impostos da venda não encontrados')
    }

    const { data, error } = await supabase
      .from('vendas_impostos')
      .update({ exibir_no_pdf: !existing.exibir_no_pdf })
      .eq('venda_id', vendaId)
      .select()
      .single()

    if (error) {
      console.error('Error toggling exibir_no_pdf:', error)
      throw new Error(`Erro ao atualizar exibição no PDF: ${error.message}`)
    }

    return data
  },

  /**
   * Toggle detailed view setting for a sale
   */
  async toggleExibirDetalhamento(vendaId: number): Promise<VendaImposto> {
    const supabase = getSupabaseBrowser()

    const existing = await this.getByVendaId(vendaId)

    if (!existing) {
      throw new Error('Impostos da venda não encontrados')
    }

    const { data, error } = await supabase
      .from('vendas_impostos')
      .update({ exibir_detalhamento: !existing.exibir_detalhamento })
      .eq('venda_id', vendaId)
      .select()
      .single()

    if (error) {
      console.error('Error toggling exibir_detalhamento:', error)
      throw new Error(`Erro ao atualizar detalhamento: ${error.message}`)
    }

    return data
  },

  /**
   * Get sales with tax calculations in a date range
   */
  async getByDateRange(
    startDate: string,
    endDate: string,
    page = 1,
    limit = 50
  ): Promise<{
    data: VendaImposto[]
    total: number
    page: number
    limit: number
  }> {
    const supabase = getSupabaseBrowser()
    const offset = (page - 1) * limit

    const { data, error, count } = await supabase
      .from('vendas_impostos')
      .select('*', { count: 'exact' })
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching vendas_impostos by date range:', error)
      throw new Error(`Erro ao buscar impostos por período: ${error.message}`)
    }

    return {
      data: data || [],
      total: count || 0,
      page,
      limit
    }
  },

  /**
   * Get total ICMS-ST to collect in a date range
   */
  async getTotalICMSSTByDateRange(
    startDate: string,
    endDate: string
  ): Promise<{
    total_icms_st_recolher: number
    total_icms_proprio: number
    total_base_calculo_st: number
    count: number
  }> {
    const supabase = getSupabaseBrowser()

    const { data, error } = await supabase
      .from('vendas_impostos')
      .select('total_icms_st_recolher, total_icms_proprio, total_base_calculo_st')
      .gte('created_at', startDate)
      .lte('created_at', endDate)

    if (error) {
      console.error('Error calculating total ICMS-ST:', error)
      throw new Error(`Erro ao calcular total de ICMS-ST: ${error.message}`)
    }

    type TotalsAccumulator = {
      total_icms_st_recolher: number
      total_icms_proprio: number
      total_base_calculo_st: number
      count: number
    }

    const totals = (data || []).reduce<TotalsAccumulator>(
      (acc, item) => ({
        total_icms_st_recolher: acc.total_icms_st_recolher + (item.total_icms_st_recolher || 0),
        total_icms_proprio: acc.total_icms_proprio + (item.total_icms_proprio || 0),
        total_base_calculo_st: acc.total_base_calculo_st + (item.total_base_calculo_st || 0),
        count: acc.count + 1
      }),
      {
        total_icms_st_recolher: 0,
        total_icms_proprio: 0,
        total_base_calculo_st: 0,
        count: 0
      }
    )

    return totals
  }
}
