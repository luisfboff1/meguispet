import type { NextApiResponse } from 'next';
import { getSupabase } from '@/lib/supabase';
import { withSupabaseAuth, AuthenticatedRequest } from '@/lib/supabase-middleware';

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const { method } = req;
  const { id } = req.query;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ success: false, message: 'ID da venda é obrigatório' });
  }

  try {
    // Use authenticated Supabase client for RLS
    const supabase = req.supabaseClient;

    if (method === 'GET') {
      // Buscar venda com todos os relacionamentos e itens
      const { data: venda, error } = await supabase
        .from('vendas')
        .select(`
          *,
          cliente:clientes_fornecedores(id, nome, email, documento, endereco, cidade, estado, cep, bairro, inscricao_estadual),
          vendedor:vendedores(id, nome, email),
          estoque:estoques(id, nome),
          forma_pagamento_detalhe:formas_pagamento(id, nome),
          itens:vendas_itens(
            id,
            produto_id,
            quantidade,
            preco_unitario,
            subtotal,
            subtotal_bruto,
            desconto_proporcional,
            subtotal_liquido,
            ipi_aliquota,
            ipi_valor,
            icms_aliquota,
            icms_valor,
            st_aliquota,
            st_valor,
            total_item,
            icms_proprio_aliquota,
            icms_proprio_valor,
            base_calculo_st,
            icms_st_aliquota,
            icms_st_valor,
            mva_aplicado,
            icms_proprio,
            icms_st_total,
            icms_st_recolher,
            aliquota_icms,
            produto:produtos(id, nome, preco_venda, ipi, icms, icms_proprio, st)
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        return res.status(404).json({ 
          success: false, 
          message: 'Venda não encontrada: ' + error.message 
        });
      }

      if (!venda) {
        return res.status(404).json({ success: false, message: 'Venda não encontrada' });
      }

      // Buscar parcelas separadamente (não falha se a tabela não existir)
      interface Parcela {
        id: number;
        numero_parcela: number;
        valor_parcela: number;
        data_vencimento: string;
        data_pagamento: string | null;
        status: string;
        observacoes: string | null;
      }
      let parcelas: Parcela[] = [];
      try {
        const { data: parcelasData } = await supabase
          .from('venda_parcelas')
          .select('id, numero_parcela, valor_parcela, data_vencimento, data_pagamento, status, observacoes')
          .eq('venda_id', id)
          .order('numero_parcela', { ascending: true });
        
        if (parcelasData) {
          parcelas = parcelasData as Parcela[];
        }
      } catch {
        // Ignore parcelas error - table may not exist yet
      }

      return res.status(200).json({
        success: true,
        data: { ...venda, parcelas },
      });
    }

    if (method === 'PATCH') {
      // Atualizar apenas o status da venda
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ success: false, message: 'Status é obrigatório' });
      }

      const { data, error } = await supabase
        .from('vendas')
        .update({ 
          status, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return res.status(500).json({ 
          success: false, 
          message: 'Erro ao atualizar status: ' + error.message 
        });
      }

      return res.status(200).json({
        success: true,
        message: `Venda ${status === 'pago' ? 'confirmada' : 'atualizada'} com sucesso`,
        data,
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
