import type { NextApiResponse } from 'next';
import { getSupabase } from '@/lib/supabase';
import { withSupabaseAuth, AuthenticatedRequest } from '@/lib/supabase-middleware';

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const { method } = req;
  const supabase = getSupabase();

  try {
    if (method === 'GET') {
      const { data, error } = await supabase
        .from('transacoes_recorrentes')
        .select(`
          *,
          categoria:categoria_id (
            id,
            nome,
            tipo,
            cor
          )
        `)
        .order('proxima_geracao', { ascending: true });

      if (error) throw error;

      return res.status(200).json({
        success: true,
        data: data || [],
      });
    }

    if (method === 'POST') {
      const { tipo, categoria_id, descricao, valor, frequencia, dia_vencimento, data_inicio, data_fim, observacoes, ativo } = req.body;

      // Validate required fields
      if (!tipo || !descricao || !valor || !frequencia || !data_inicio) {
        return res.status(400).json({ 
          success: false, 
          message: 'Tipo, descrição, valor, frequência e data de início são obrigatórios' 
        });
      }

      // Calculate next generation date
      const proximaGeracao = calculateNextDate(new Date(data_inicio), frequencia, dia_vencimento);

      const { data, error } = await supabase
        .from('transacoes_recorrentes')
        .insert({
          tipo,
          categoria_id: categoria_id || null,
          descricao,
          valor,
          frequencia,
          dia_vencimento: dia_vencimento || 1,
          data_inicio,
          data_fim: data_fim || null,
          proxima_geracao: proximaGeracao.toISOString().split('T')[0],
          observacoes: observacoes || null,
          ativo: ativo !== false,
        })
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json({ 
        success: true, 
        message: 'Transação recorrente criada com sucesso', 
        data 
      });
    }

    return res.status(405).json({ success: false, message: 'Método não permitido' });
  } catch (error) {
    console.error('Transações Recorrentes API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Helper function to calculate next date based on frequency
function calculateNextDate(startDate: Date, frequencia: string, diaVencimento?: number): Date {
  const nextDate = new Date(startDate);
  const dia = diaVencimento || 1;

  switch (frequencia) {
    case 'diaria':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case 'semanal':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'quinzenal':
      nextDate.setDate(nextDate.getDate() + 15);
      break;
    case 'mensal':
      nextDate.setMonth(nextDate.getMonth() + 1);
      nextDate.setDate(Math.min(dia, new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate()));
      break;
    case 'bimestral':
      nextDate.setMonth(nextDate.getMonth() + 2);
      nextDate.setDate(Math.min(dia, new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate()));
      break;
    case 'trimestral':
      nextDate.setMonth(nextDate.getMonth() + 3);
      nextDate.setDate(Math.min(dia, new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate()));
      break;
    case 'semestral':
      nextDate.setMonth(nextDate.getMonth() + 6);
      nextDate.setDate(Math.min(dia, new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate()));
      break;
    case 'anual':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      nextDate.setDate(Math.min(dia, new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate()));
      break;
  }

  return nextDate;
}

export default withSupabaseAuth(handler);
