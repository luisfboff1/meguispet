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
    const supabase = getSupabase();

    if (method === 'GET') {
      // Buscar venda com todos os relacionamentos e itens
      const { data: venda, error } = await supabase
        .from('vendas')
        .select(`
          *,
          cliente:clientes_fornecedores(id, nome, email),
          vendedor:vendedores(id, nome, email),
          estoque:estoques(id, nome),
          forma_pagamento_detalhe:formas_pagamento(id, nome),
          itens:vendas_itens(
            id,
            produto_id,
            quantidade,
            preco_unitario,
            subtotal,
            produto:produtos(id, nome, preco_venda)
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Erro ao buscar venda:', error);
        return res.status(404).json({ 
          success: false, 
          message: 'Venda não encontrada: ' + error.message 
        });
      }

      if (!venda) {
        return res.status(404).json({ success: false, message: 'Venda não encontrada' });
      }

      return res.status(200).json({
        success: true,
        data: venda,
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
        console.error('Erro ao atualizar status:', error);
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
    console.error('Venda API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export default withSupabaseAuth(handler);
