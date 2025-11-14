import type { NextApiResponse } from 'next';
import { getSupabase } from '@/lib/supabase';
import { withSupabaseAuth, AuthenticatedRequest } from '@/lib/supabase-middleware';

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const { method, query } = req;
  const { id } = query;
  const supabase = getSupabase();

  if (!id || Array.isArray(id)) {
    return res.status(400).json({
      success: false,
      message: 'ID da parcela é obrigatório',
    });
  }

  const parcelaId = parseInt(id, 10);

  try {
    if (method === 'GET') {
      // Buscar parcelas por ID da venda
      const { data: parcelas, error } = await supabase
        .from('venda_parcelas')
        .select(`
          *,
          venda:vendas(id, numero_venda, valor_final),
          transacao:transacoes(id, descricao, valor, data_transacao)
        `)
        .eq('venda_id', parcelaId)
        .order('numero_parcela', { ascending: true });

      if (error) {
        console.error('Erro ao buscar parcelas:', error);
        return res.status(500).json({
          success: false,
          message: 'Erro ao buscar parcelas: ' + error.message,
        });
      }

      return res.status(200).json({
        success: true,
        data: parcelas || [],
      });
    }

    if (method === 'PUT') {
      // Atualizar parcela
      const updateData = req.body;

      // Não permitir alterar venda_id ou numero_parcela
      delete updateData.venda_id;
      delete updateData.numero_parcela;
      delete updateData.id;

      const { data: parcelaAtualizada, error } = await supabase
        .from('venda_parcelas')
        .update(updateData)
        .eq('id', parcelaId)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar parcela:', error);
        return res.status(500).json({
          success: false,
          message: 'Erro ao atualizar parcela: ' + error.message,
        });
      }

      return res.status(200).json({
        success: true,
        data: parcelaAtualizada,
        message: 'Parcela atualizada com sucesso',
      });
    }

    if (method === 'DELETE') {
      // Deletar parcela
      const { error } = await supabase
        .from('venda_parcelas')
        .delete()
        .eq('id', parcelaId);

      if (error) {
        console.error('Erro ao deletar parcela:', error);
        return res.status(500).json({
          success: false,
          message: 'Erro ao deletar parcela: ' + error.message,
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Parcela deletada com sucesso',
      });
    }

    if (method === 'PATCH') {
      // Ações especiais via PATCH (atualizar data ou marcar como paga)
      const { action, data_vencimento, data_pagamento } = req.body;

      if (action === 'update-date' && data_vencimento) {
        const { data: parcelaAtualizada, error } = await supabase
          .from('venda_parcelas')
          .update({ data_vencimento })
          .eq('id', parcelaId)
          .select()
          .single();

        if (error) {
          return res.status(500).json({
            success: false,
            message: 'Erro ao atualizar data de vencimento: ' + error.message,
          });
        }

        return res.status(200).json({
          success: true,
          data: parcelaAtualizada,
          message: 'Data de vencimento atualizada com sucesso',
        });
      }

      if (action === 'mark-paid' && data_pagamento) {
        const { data: parcelaAtualizada, error } = await supabase
          .from('venda_parcelas')
          .update({ 
            data_pagamento,
            status: 'pago'
          })
          .eq('id', parcelaId)
          .select()
          .single();

        if (error) {
          return res.status(500).json({
            success: false,
            message: 'Erro ao marcar parcela como paga: ' + error.message,
          });
        }

        return res.status(200).json({
          success: true,
          data: parcelaAtualizada,
          message: 'Parcela marcada como paga com sucesso',
        });
      }

      return res.status(400).json({
        success: false,
        message: 'Ação inválida ou parâmetros faltando',
      });
    }

    return res.status(405).json({
      success: false,
      message: 'Método não permitido',
    });
  } catch (error: any) {
    console.error('Erro no endpoint de parcelas:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erro interno do servidor',
    });
  }
};

export default withSupabaseAuth(handler);
