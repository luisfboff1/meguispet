import type { NextApiResponse } from 'next';
import { getSupabase } from '@/lib/supabase';
import { withSupabaseAuth, AuthenticatedRequest } from '@/lib/supabase-middleware';

interface VendedorMetricas {
  faturamentoTotal: number;
  faturamentoPeriodoAnterior: number;
  variacaoFaturamento: number;
  quantidadeVendas: number;
  quantidadePeriodoAnterior: number;
  variacaoQuantidade: number;
  ticketMedio: number;
  ticketMedioPeriodoAnterior: number;
  variacaoTicketMedio: number;
  comissaoTotal: number;
  ultimaVenda: {
    id: number;
    numero_venda: string;
    data_venda: string;
    valor_final: number;
  } | null;
  graficoVendas: Array<{
    data: string; // YYYY-MM-DD
    faturamento: number;
    quantidade: number;
  }>;
}

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const { method, query } = req;
  const { id } = query;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ success: false, message: 'ID do vendedor inválido' });
  }

  const vendedorId = parseInt(id, 10);

  if (method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Método não permitido' });
  }

  try {
    const supabase = getSupabase();

    // Obter parâmetro de período (padrão: 30 dias)
    const periodo = (query.periodo as string) || '30d';

    let diasPeriodo = 30;
    if (periodo === '7d') diasPeriodo = 7;
    else if (periodo === '90d') diasPeriodo = 90;
    else if (periodo === '30d') diasPeriodo = 30;

    // Calcular datas
    const dataFim = new Date();
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - diasPeriodo);

    // Período anterior (para comparação)
    const dataInicioAnterior = new Date(dataInicio);
    dataInicioAnterior.setDate(dataInicioAnterior.getDate() - diasPeriodo);
    const dataFimAnterior = new Date(dataInicio);

    console.log('📊 Calculando métricas do vendedor', {
      vendedorId,
      periodo,
      diasPeriodo,
      dataInicio: dataInicio.toISOString().split('T')[0],
      dataFim: dataFim.toISOString().split('T')[0],
      dataInicioAnterior: dataInicioAnterior.toISOString().split('T')[0],
      dataFimAnterior: dataFimAnterior.toISOString().split('T')[0],
    });

    // 1. Buscar vendas do período atual
    const { data: vendasPeriodoAtual, error: erroVendasAtual } = await supabase
      .from('vendas')
      .select('id, numero_venda, data_venda, valor_final')
      .eq('vendedor_id', vendedorId)
      .gte('data_venda', dataInicio.toISOString().split('T')[0])
      .lte('data_venda', dataFim.toISOString().split('T')[0])
      .order('data_venda', { ascending: false });

    if (erroVendasAtual) throw erroVendasAtual;

    // 2. Buscar vendas do período anterior (para comparação)
    const { data: vendasPeriodoAnterior, error: erroVendasAnterior } = await supabase
      .from('vendas')
      .select('valor_final')
      .eq('vendedor_id', vendedorId)
      .gte('data_venda', dataInicioAnterior.toISOString().split('T')[0])
      .lt('data_venda', dataFimAnterior.toISOString().split('T')[0]);

    if (erroVendasAnterior) throw erroVendasAnterior;

    // 3. Calcular métricas do período atual
    const quantidadeVendas = vendasPeriodoAtual?.length || 0;
    const faturamentoTotal = (vendasPeriodoAtual || []).reduce(
      (sum, v) => sum + parseFloat(v.valor_final.toString()),
      0
    );
    const ticketMedio = quantidadeVendas > 0 ? faturamentoTotal / quantidadeVendas : 0;

    // 4. Calcular métricas do período anterior
    const quantidadePeriodoAnterior = vendasPeriodoAnterior?.length || 0;
    const faturamentoPeriodoAnterior = (vendasPeriodoAnterior || []).reduce(
      (sum, v) => sum + parseFloat(v.valor_final.toString()),
      0
    );
    const ticketMedioPeriodoAnterior =
      quantidadePeriodoAnterior > 0
        ? faturamentoPeriodoAnterior / quantidadePeriodoAnterior
        : 0;

    // 5. Calcular variações percentuais
    const variacaoFaturamento =
      faturamentoPeriodoAnterior > 0
        ? ((faturamentoTotal - faturamentoPeriodoAnterior) / faturamentoPeriodoAnterior) * 100
        : 0;

    const variacaoQuantidade =
      quantidadePeriodoAnterior > 0
        ? ((quantidadeVendas - quantidadePeriodoAnterior) / quantidadePeriodoAnterior) * 100
        : 0;

    const variacaoTicketMedio =
      ticketMedioPeriodoAnterior > 0
        ? ((ticketMedio - ticketMedioPeriodoAnterior) / ticketMedioPeriodoAnterior) * 100
        : 0;

    // 6. Buscar comissão do vendedor
    const { data: vendedor, error: erroVendedor } = await supabase
      .from('vendedores')
      .select('comissao')
      .eq('id', vendedorId)
      .single();

    if (erroVendedor) throw erroVendedor;

    const percentualComissao = vendedor?.comissao || 0;
    const comissaoTotal = (faturamentoTotal * percentualComissao) / 100;

    // 7. Última venda
    const ultimaVenda = vendasPeriodoAtual && vendasPeriodoAtual.length > 0
      ? {
          id: vendasPeriodoAtual[0].id,
          numero_venda: vendasPeriodoAtual[0].numero_venda,
          data_venda: vendasPeriodoAtual[0].data_venda,
          valor_final: parseFloat(vendasPeriodoAtual[0].valor_final.toString()),
        }
      : null;

    // 8. Agrupar vendas por dia para o gráfico
    const graficoMap: Record<string, { faturamento: number; quantidade: number }> = {};

    (vendasPeriodoAtual || []).forEach((venda) => {
      const dia = venda.data_venda.split('T')[0]; // YYYY-MM-DD

      if (!graficoMap[dia]) {
        graficoMap[dia] = { faturamento: 0, quantidade: 0 };
      }

      graficoMap[dia].faturamento += parseFloat(venda.valor_final.toString());
      graficoMap[dia].quantidade += 1;
    });

    // Converter para array e ordenar por data
    const graficoVendas = Object.entries(graficoMap)
      .map(([data, valores]) => ({
        data,
        faturamento: parseFloat(valores.faturamento.toFixed(2)),
        quantidade: valores.quantidade,
      }))
      .sort((a, b) => a.data.localeCompare(b.data));

    // 9. Montar resposta
    const metricas: VendedorMetricas = {
      faturamentoTotal: parseFloat(faturamentoTotal.toFixed(2)),
      faturamentoPeriodoAnterior: parseFloat(faturamentoPeriodoAnterior.toFixed(2)),
      variacaoFaturamento: parseFloat(variacaoFaturamento.toFixed(2)),
      quantidadeVendas,
      quantidadePeriodoAnterior,
      variacaoQuantidade: parseFloat(variacaoQuantidade.toFixed(2)),
      ticketMedio: parseFloat(ticketMedio.toFixed(2)),
      ticketMedioPeriodoAnterior: parseFloat(ticketMedioPeriodoAnterior.toFixed(2)),
      variacaoTicketMedio: parseFloat(variacaoTicketMedio.toFixed(2)),
      comissaoTotal: parseFloat(comissaoTotal.toFixed(2)),
      ultimaVenda,
      graficoVendas,
    };

    console.log('✅ Métricas calculadas:', {
      vendedorId,
      faturamentoTotal: metricas.faturamentoTotal,
      quantidadeVendas: metricas.quantidadeVendas,
      variacaoFaturamento: `${metricas.variacaoFaturamento}%`,
    });

    return res.status(200).json({
      success: true,
      data: metricas,
    });
  } catch (error) {
    console.error('Erro ao buscar métricas do vendedor:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar métricas do vendedor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export default withSupabaseAuth(handler);
