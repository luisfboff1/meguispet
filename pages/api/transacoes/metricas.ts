import type { NextApiResponse } from 'next';
import { getSupabase } from '@/lib/supabase';
import { withSupabaseAuth, AuthenticatedRequest } from '@/lib/supabase-middleware';
import { cacheManager } from '@/lib/cache-manager';

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const { method } = req;

  try {
    if (method === 'GET') {
      // Check cache first
      if (cacheManager.metricas.isValid()) {
        console.log('💰 Serving financial metrics from cache');
        const cached = cacheManager.metricas.get();
        return res.status(200).json(cached?.data);
      }

      const supabase = getSupabase();
      // Buscar transações dos últimos 180 dias + próximos 60 dias (para incluir parcelas futuras)
      // Para fluxo de caixa, limitamos para performance
      const dataInicio = new Date();
      dataInicio.setDate(dataInicio.getDate() - 180);

      const dataFim = new Date();
      dataFim.setDate(dataFim.getDate() + 60);

      const { data: transacoes, error } = await supabase
        .from('transacoes')
        .select('tipo, valor, data_transacao')
        .gte('data_transacao', dataInicio.toISOString().split('T')[0])
        .lte('data_transacao', dataFim.toISOString().split('T')[0])
        .order('data_transacao', { ascending: true });

      if (error) throw error;

      // Calcular métricas do mês atual
      const hoje = new Date();
      const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      
      const transacoesMes = (transacoes || []).filter(t => {
        const dataTransacao = new Date(t.data_transacao);
        return dataTransacao >= primeiroDiaMes;
      });

      const receita = transacoesMes
        .filter(t => t.tipo === 'receita')
        .reduce((sum, t) => sum + parseFloat(t.valor.toString()), 0);

      const despesas = transacoesMes
        .filter(t => t.tipo === 'despesa')
        .reduce((sum, t) => sum + parseFloat(t.valor.toString()), 0);

      const lucro = receita - despesas;
      const margem = receita > 0 ? ((lucro / receita) * 100) : 0;

      // Agrupar por DIA para o gráfico (com fluxo de caixa acumulativo)
      const graficoDiario: Record<string, { receitas: number; despesas: number }> = {};

      (transacoes || []).forEach(t => {
        const data = new Date(t.data_transacao);
        const dia = data.toISOString().split('T')[0]; // YYYY-MM-DD

        if (!graficoDiario[dia]) {
          graficoDiario[dia] = { receitas: 0, despesas: 0 };
        }

        const valor = parseFloat(t.valor.toString());
        if (t.tipo === 'receita') {
          graficoDiario[dia].receitas += valor;
        } else {
          graficoDiario[dia].despesas += valor;
        }
      });

      // Buscar transações recorrentes ativas para projeção futura
      const { data: recorrentes } = await supabase
        .from('transacoes_recorrentes')
        .select('*')
        .eq('ativo', true);

      // Criar array com TODOS os dias desde a primeira transação até +90 dias no futuro
      // Incluindo dias sem movimentação (para permitir customização no frontend)
      const grafico_diario = [];

      if (Object.keys(graficoDiario).length > 0) {
        const primeiraData = new Date(Object.keys(graficoDiario)[0]);
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        // Projetar 60 dias para o futuro (otimizado para performance)
        const dataFinal = new Date(hoje);
        dataFinal.setDate(dataFinal.getDate() + 60);

        // Gerar transações recorrentes futuras
        const transacoesProjetadas: Record<string, { receitas: number; despesas: number }> = {};

        if (recorrentes && recorrentes.length > 0) {
          for (const rec of recorrentes) {
            const proximaGeracao = new Date(rec.proxima_geracao);
            const dataFimRec = rec.data_fim ? new Date(rec.data_fim) : dataFinal;
            let currentDate = new Date(proximaGeracao);

            while (currentDate <= dataFinal && currentDate <= dataFimRec) {
              const diaStr = currentDate.toISOString().split('T')[0];

              if (currentDate > hoje) { // Apenas futuras
                if (!transacoesProjetadas[diaStr]) {
                  transacoesProjetadas[diaStr] = { receitas: 0, despesas: 0 };
                }

                const valor = parseFloat(rec.valor.toString());
                if (rec.tipo === 'receita') {
                  transacoesProjetadas[diaStr].receitas += valor;
                } else {
                  transacoesProjetadas[diaStr].despesas += valor;
                }
              }

              // Calcular próxima data baseado na frequência
              if (rec.frequencia === 'mensal') {
                currentDate = new Date(currentDate.setMonth(currentDate.getMonth() + 1));
              } else if (rec.frequencia === 'semanal') {
                currentDate = new Date(currentDate.setDate(currentDate.getDate() + 7));
              } else if (rec.frequencia === 'anual') {
                currentDate = new Date(currentDate.setFullYear(currentDate.getFullYear() + 1));
              } else {
                break; // Frequência não suportada
              }
            }
          }
        }

        // Calcular saldo inicial (soma de todas as transações antes do período)
        let saldoInicial = 0;
        (transacoes || []).forEach(t => {
          const dataTransacao = new Date(t.data_transacao);
          if (dataTransacao < new Date(Object.keys(graficoDiario)[0])) {
            const valor = parseFloat(t.valor.toString());
            if (t.tipo === 'receita') {
              saldoInicial += valor;
            } else {
              saldoInicial -= valor;
            }
          }
        });

        let saldoAcumulado = saldoInicial;

        for (let d = new Date(primeiraData); d <= dataFinal; d.setDate(d.getDate() + 1)) {
          const diaStr = d.toISOString().split('T')[0];
          const ehFuturo = d > hoje;

          // Dados históricos ou projetados
          // Para dias futuros: somar transações já cadastradas (parcelas) + recorrentes projetadas
          const receitas = ehFuturo
            ? (graficoDiario[diaStr]?.receitas || 0) + (transacoesProjetadas[diaStr]?.receitas || 0)
            : (graficoDiario[diaStr]?.receitas || 0);
          const despesas = ehFuturo
            ? (graficoDiario[diaStr]?.despesas || 0) + (transacoesProjetadas[diaStr]?.despesas || 0)
            : (graficoDiario[diaStr]?.despesas || 0);

          const fluxoDia = receitas - despesas;
          saldoAcumulado += fluxoDia;

          grafico_diario.push({
            data: diaStr,
            receitas,
            despesas: -despesas, // NEGATIVO para despesas
            fluxoCaixa: fluxoDia,
            saldoAcumulado,
            temMovimentacao: receitas > 0 || despesas > 0,
            ehProjecao: ehFuturo
          });
        }
      }

      // Também criar gráfico mensal para compatibilidade (agregando os dias)
      const graficoMensal: Record<string, { receitas: number; despesas: number }> = {};
      grafico_diario.forEach(dia => {
        const mes = dia.data.substring(0, 7); // YYYY-MM
        if (!graficoMensal[mes]) {
          graficoMensal[mes] = { receitas: 0, despesas: 0 };
        }
        graficoMensal[mes].receitas += dia.receitas;
        graficoMensal[mes].despesas += dia.despesas;
      });

      const grafico_mensal = Object.entries(graficoMensal).map(([mes, valores]) => ({
        mes,
        receitas: valores.receitas,
        despesas: valores.despesas
      }));

      console.log('📊 Métricas calculadas:', {
        receita,
        despesas,
        lucro,
        margem: margem.toFixed(2),
        meses: grafico_mensal.length,
        dias: grafico_diario.length
      });

      const response = {
        success: true,
        data: {
          receita: parseFloat(receita.toFixed(2)),
          despesas: parseFloat(despesas.toFixed(2)),
          lucro: parseFloat(lucro.toFixed(2)),
          margem: parseFloat(margem.toFixed(2)),
          grafico_mensal,
          grafico_diario
        }
      };

      // Cache the response
      cacheManager.metricas.set(response);

      return res.status(200).json(response);
    }

    if (method === 'DELETE') {
      // Endpoint para forçar invalidação do cache
      cacheManager.metricas.invalidate();
      return res.status(200).json({
        success: true,
        message: 'Cache de métricas invalidado com sucesso'
      });
    }

    return res.status(405).json({ success: false, message: 'Método não permitido' });
  } catch (error) {
    console.error('Transacoes Metricas API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export default withSupabaseAuth(handler);
