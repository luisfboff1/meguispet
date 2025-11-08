import type { NextApiResponse } from 'next';
import { getSupabase } from '@/lib/supabase';
import { withSupabaseAuth, AuthenticatedRequest } from '@/lib/supabase-middleware';

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const { method } = req;
  const supabase = getSupabase();

  if (method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método não permitido' });
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all active recurring transactions that should be generated
    const { data: recorrentes, error: fetchError } = await supabase
        .from('transacoes_recorrentes')
        .select(`
          *,
          categoria:categoria_id (
            id,
            nome
          )
        `)
        .eq('ativo', true)
        .lte('proxima_geracao', today.toISOString().split('T')[0]);

    if (fetchError) throw fetchError;

    if (!recorrentes || recorrentes.length === 0) {
      return res.status(200).json({ 
        success: true, 
        message: 'Nenhuma transação recorrente pendente para gerar',
        generated: 0
      });
    }

    const transacoesGeradas = [];
    const atualizacoesRecorrentes = [];

    for (const recorrente of recorrentes) {
      // Check if should still generate (respecting data_fim)
      if (recorrente.data_fim) {
        const dataFim = new Date(recorrente.data_fim);
        if (today > dataFim) {
          // Inactivate this recorrente as it's past end date
          atualizacoesRecorrentes.push({
            id: recorrente.id,
            ativo: false
          });
          continue;
        }
      }

      // Generate the transaction
      const novaTransacao = {
        tipo: recorrente.tipo,
        categoria: recorrente.categoria?.nome || 'Recorrente',
        categoria_id: recorrente.categoria_id,
        descricao: recorrente.descricao,
        valor: recorrente.valor,
        data_transacao: recorrente.proxima_geracao,
        status: 'pendente',
        transacao_recorrente_id: recorrente.id,
        observacoes: recorrente.observacoes
      };

      transacoesGeradas.push(novaTransacao);

      // Calculate next generation date
      const proximaData = calculateNextDate(
        new Date(recorrente.proxima_geracao), 
        recorrente.frequencia, 
        recorrente.dia_vencimento
      );

      atualizacoesRecorrentes.push({
        id: recorrente.id,
        proxima_geracao: proximaData.toISOString().split('T')[0]
      });
    }

    // Insert generated transactions
    if (transacoesGeradas.length > 0) {
      const { error: insertError } = await supabase
        .from('transacoes')
        .insert(transacoesGeradas);

      if (insertError) throw insertError;
    }

    // Update recurring transactions
    for (const atualizacao of atualizacoesRecorrentes) {
      const { error: updateError } = await supabase
        .from('transacoes_recorrentes')
        .update({
          proxima_geracao: atualizacao.proxima_geracao,
          ativo: atualizacao.ativo !== undefined ? atualizacao.ativo : true,
          updated_at: new Date().toISOString()
        })
        .eq('id', atualizacao.id);

      if (updateError) {
        console.error(`Erro ao atualizar recorrente ${atualizacao.id}:`, updateError);
      }
    }

    return res.status(200).json({ 
      success: true, 
      message: `${transacoesGeradas.length} transação(ões) gerada(s) com sucesso`,
      generated: transacoesGeradas.length
    });

  } catch (error) {
    console.error('Gerar Transações Recorrentes API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao gerar transações recorrentes',
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
