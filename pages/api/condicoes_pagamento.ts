import type { NextApiResponse } from 'next';
import { getSupabase } from '@/lib/supabase';
import { withSupabaseAuth, AuthenticatedRequest } from '@/lib/supabase-middleware';

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const { method } = req;

  try {
    // Use authenticated Supabase client for RLS
    const supabase = req.supabaseClient;

    if (method === 'GET') {
      const { id, active } = req.query;

      // Get single payment term by ID
      if (id) {
        const { data: condicao, error } = await supabase
          .from('condicoes_pagamento')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            return res.status(404).json({ 
              success: false, 
              message: 'Condição de pagamento não encontrada' 
            });
          }
          throw error;
        }

        return res.status(200).json({
          success: true,
          data: condicao,
        });
      }

      // Get all payment terms
      let query = supabase
        .from('condicoes_pagamento')
        .select('*')
        .order('ordem', { ascending: true })
        .order('nome', { ascending: true });

      // Filter by active status if specified
      if (active !== undefined) {
        const isActive = active === '1' || active === 'true';
        query = query.eq('ativo', isActive);
      }

      const { data: condicoes, error } = await query;

      if (error) throw error;

      return res.status(200).json({
        success: true,
        data: condicoes || [],
      });
    }

    if (method === 'POST') {
      const { nome, descricao, dias_parcelas, ativo, ordem } = req.body;

      if (!nome) {
        return res.status(400).json({ 
          success: false, 
          message: 'Nome da condição de pagamento é obrigatório' 
        });
      }

      if (!dias_parcelas || !Array.isArray(dias_parcelas)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Dias de parcelas deve ser um array' 
        });
      }

      // Validate that all dias_parcelas are numbers
      if (!dias_parcelas.every(d => typeof d === 'number' && d >= 0)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Todos os dias de parcelas devem ser números não negativos' 
        });
      }

      const { data, error } = await supabase
        .from('condicoes_pagamento')
        .insert({
          nome,
          descricao: descricao || null,
          dias_parcelas,
          ativo: ativo !== false, // Default to true
          ordem: ordem || 0,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          return res.status(400).json({ 
            success: false, 
            message: 'Já existe uma condição de pagamento com este nome' 
          });
        }
        throw error;
      }

      return res.status(201).json({
        success: true,
        message: 'Condição de pagamento criada com sucesso',
        data,
      });
    }

    if (method === 'PUT') {
      const { id, nome, descricao, dias_parcelas, ativo, ordem } = req.body;

      if (!id) {
        return res.status(400).json({ 
          success: false, 
          message: 'ID da condição de pagamento é obrigatório' 
        });
      }

      // Validate dias_parcelas if provided
      if (dias_parcelas !== undefined) {
        if (!Array.isArray(dias_parcelas)) {
          return res.status(400).json({ 
            success: false, 
            message: 'Dias de parcelas deve ser um array' 
          });
        }
        if (!dias_parcelas.every(d => typeof d === 'number' && d >= 0)) {
          return res.status(400).json({ 
            success: false, 
            message: 'Todos os dias de parcelas devem ser números não negativos' 
          });
        }
      }

      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (nome !== undefined) updateData.nome = nome;
      if (descricao !== undefined) updateData.descricao = descricao || null;
      if (dias_parcelas !== undefined) updateData.dias_parcelas = dias_parcelas;
      if (ativo !== undefined) updateData.ativo = ativo;
      if (ordem !== undefined) updateData.ordem = ordem;

      const { data, error } = await supabase
        .from('condicoes_pagamento')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ 
            success: false, 
            message: 'Condição de pagamento não encontrada' 
          });
        }
        if (error.code === '23505') {
          return res.status(400).json({ 
            success: false, 
            message: 'Já existe uma condição de pagamento com este nome' 
          });
        }
        throw error;
      }

      return res.status(200).json({
        success: true,
        message: 'Condição de pagamento atualizada com sucesso',
        data,
      });
    }

    if (method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ 
          success: false, 
          message: 'ID da condição de pagamento é obrigatório' 
        });
      }

      // Check if the payment term is used in any sales
      const { data: vendas, error: vendasError } = await supabase
        .from('vendas')
        .select('id')
        .eq('condicao_pagamento_id', id)
        .limit(1);

      if (vendasError) throw vendasError;

      if (vendas && vendas.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Esta condição de pagamento está sendo usada em vendas e não pode ser excluída. Desative-a em vez disso.',
        });
      }

      const { error } = await supabase
        .from('condicoes_pagamento')
        .delete()
        .eq('id', id);

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ 
            success: false, 
            message: 'Condição de pagamento não encontrada' 
          });
        }
        throw error;
      }

      return res.status(200).json({
        success: true,
        message: 'Condição de pagamento removida com sucesso',
      });
    }

    return res.status(405).json({ success: false, message: 'Método não permitido' });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export default withSupabaseAuth(handler);
