import type { NextApiResponse } from 'next';
import { getSupabase } from '@/lib/supabase';
import { withSupabaseAuth, AuthenticatedRequest } from '@/lib/supabase-middleware';

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const { method, query } = req;
  const { id } = query;
  const supabase = getSupabase();

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ success: false, message: 'ID inválido' });
  }

  const recorrenteId = parseInt(id, 10);

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
        .eq('id', recorrenteId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ success: false, message: 'Transação recorrente não encontrada' });
        }
        throw error;
      }

      return res.status(200).json({ success: true, data });
    }

    if (method === 'PUT') {
      const { tipo, categoria_id, descricao, valor, frequencia, dia_vencimento, data_inicio, data_fim, observacoes, ativo } = req.body;

      // Check if recorrente exists
      const { data: existing, error: checkError } = await supabase
        .from('transacoes_recorrentes')
        .select('id, proxima_geracao')
        .eq('id', recorrenteId)
        .single();

      if (checkError || !existing) {
        return res.status(404).json({ success: false, message: 'Transação recorrente não encontrada' });
      }

      // Recalculate next generation if frequency or start date changed
      let proximaGeracao = existing.proxima_geracao;
      if (frequencia || data_inicio || dia_vencimento) {
        const startDate = data_inicio ? new Date(data_inicio) : new Date(existing.proxima_geracao);
        const freq = frequencia || 'mensal';
        const dia = dia_vencimento || 1;
        proximaGeracao = calculateNextDate(startDate, freq, dia).toISOString().split('T')[0];
      }

      const updateData = {
        ...(tipo !== undefined && { tipo }),
        ...(categoria_id !== undefined && { categoria_id }),
        ...(descricao !== undefined && { descricao }),
        ...(valor !== undefined && { valor }),
        ...(frequencia !== undefined && { frequencia }),
        ...(dia_vencimento !== undefined && { dia_vencimento }),
        ...(data_inicio !== undefined && { data_inicio }),
        ...(data_fim !== undefined && { data_fim }),
        ...(observacoes !== undefined && { observacoes }),
        ...(ativo !== undefined && { ativo }),
        proxima_geracao: proximaGeracao,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('transacoes_recorrentes')
        .update(updateData)
        .eq('id', recorrenteId)
        .select()
        .single();

      if (error) throw error;

      return res.status(200).json({ 
        success: true, 
        message: 'Transação recorrente atualizada com sucesso', 
        data 
      });
    }

    if (method === 'DELETE') {
      // Check if recorrente exists
      const { data: existing, error: checkError } = await supabase
        .from('transacoes_recorrentes')
        .select('id')
        .eq('id', recorrenteId)
        .single();

      if (checkError || !existing) {
        return res.status(404).json({ success: false, message: 'Transação recorrente não encontrada' });
      }

      const { error } = await supabase
        .from('transacoes_recorrentes')
        .delete()
        .eq('id', recorrenteId);

      if (error) throw error;

      return res.status(200).json({ 
        success: true, 
        message: 'Transação recorrente excluída com sucesso' 
      });
    }

    return res.status(405).json({ success: false, message: 'Método não permitido' });
  } catch (error) {
    console.error('Transações Recorrentes [id] API error:', error);
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
