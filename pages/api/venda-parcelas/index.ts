import type { NextApiResponse } from 'next';
import { getSupabase } from '@/lib/supabase';
import { withSupabaseAuth, AuthenticatedRequest } from '@/lib/supabase-middleware';
import type { VendaParcelaInput } from '@/types';

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const { method } = req;
  const supabase = getSupabase();

  try {
    if (method === 'POST') {
      // Criar parcelas para uma venda
      const { vendaId, parcelas } = req.body;

      if (!vendaId) {
        return res.status(400).json({
          success: false,
          message: 'ID da venda é obrigatório',
        });
      }

      if (!parcelas || !Array.isArray(parcelas) || parcelas.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Lista de parcelas é obrigatória',
        });
      }

      // Validar se a venda existe
      const { data: venda, error: vendaError } = await supabase
        .from('vendas')
        .select('id, valor_final')
        .eq('id', vendaId)
        .single();

      if (vendaError || !venda) {
        return res.status(404).json({
          success: false,
          message: 'Venda não encontrada',
        });
      }

      // Validar se o total das parcelas está correto
      const totalParcelas = parcelas.reduce((sum, p) => sum + Number(p.valor_parcela), 0);
      const valorFinalVenda = Number(venda.valor_final);
      
      // Permitir uma diferença de até R$ 0.10 devido a arredondamentos
      if (Math.abs(totalParcelas - valorFinalVenda) > 0.10) {
        return res.status(400).json({
          success: false,
          message: `O total das parcelas (R$ ${totalParcelas.toFixed(2)}) deve ser igual ao valor final da venda (R$ ${valorFinalVenda.toFixed(2)})`,
        });
      }

      // Inserir parcelas
      const parcelasToInsert = parcelas.map((p: VendaParcelaInput) => ({
        venda_id: vendaId,
        numero_parcela: p.numero_parcela,
        valor_parcela: p.valor_parcela,
        data_vencimento: p.data_vencimento,
        status: 'pendente',
        observacoes: p.observacoes || null,
      }));

      const { data: parcelasCreated, error: parcelasError } = await supabase
        .from('venda_parcelas')
        .insert(parcelasToInsert)
        .select();

      if (parcelasError) {
        console.error('Erro ao criar parcelas:', parcelasError);
        return res.status(500).json({
          success: false,
          message: 'Erro ao criar parcelas: ' + parcelasError.message,
        });
      }

      return res.status(201).json({
        success: true,
        data: parcelasCreated,
        message: 'Parcelas criadas com sucesso',
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
