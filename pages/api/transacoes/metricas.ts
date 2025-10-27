import type { NextApiResponse } from 'next';
import { getSupabase } from '@/lib/supabase';
import { withSupabaseAuth, AuthenticatedRequest } from '@/lib/supabase-middleware';

// Simple in-memory cache (5 minutes TTL)
let metricasCache: { data: unknown; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const { method } = req;

  try {
    if (method === 'GET') {
      // Check cache first
      const now = Date.now();
      if (metricasCache && (now - metricasCache.timestamp) < CACHE_TTL) {
        console.log('💰 Serving financial metrics from cache');
        return res.status(200).json(metricasCache.data);
      }

      const supabase = getSupabase();
      // Calcular data de 6 meses atrás
      const dataInicio = new Date();
      dataInicio.setMonth(dataInicio.getMonth() - 6);
      dataInicio.setDate(1); // Primeiro dia do mês

      // Buscar todas as transações dos últimos 6 meses
      const { data: transacoes, error } = await supabase
        .from('transacoes')
        .select('tipo, valor, data_transacao')
        .gte('data_transacao', dataInicio.toISOString().split('T')[0])
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

      // Agrupar por mês para o gráfico
      const graficoMensal: Record<string, { receitas: number; despesas: number }> = {};

      (transacoes || []).forEach(t => {
        const data = new Date(t.data_transacao);
        const mes = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
        
        if (!graficoMensal[mes]) {
          graficoMensal[mes] = { receitas: 0, despesas: 0 };
        }

        const valor = parseFloat(t.valor.toString());
        if (t.tipo === 'receita') {
          graficoMensal[mes].receitas += valor;
        } else {
          graficoMensal[mes].despesas += valor;
        }
      });

      // Garantir que temos os últimos 6 meses no gráfico
      const grafico_mensal = [];
      for (let i = 5; i >= 0; i--) {
        const data = new Date();
        data.setMonth(data.getMonth() - i);
        const mes = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
        
        grafico_mensal.push({
          mes,
          receitas: graficoMensal[mes]?.receitas || 0,
          despesas: graficoMensal[mes]?.despesas || 0
        });
      }

      console.log('📊 Métricas calculadas:', {
        receita,
        despesas,
        lucro,
        margem: margem.toFixed(2),
        meses: grafico_mensal.length
      });

      const response = {
        success: true,
        data: {
          receita: parseFloat(receita.toFixed(2)),
          despesas: parseFloat(despesas.toFixed(2)),
          lucro: parseFloat(lucro.toFixed(2)),
          margem: parseFloat(margem.toFixed(2)),
          grafico_mensal
        }
      };

      // Cache the response
      metricasCache = { data: response, timestamp: now };

      return res.status(200).json(response);
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
