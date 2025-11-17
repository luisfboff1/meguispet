import type { NextApiResponse } from 'next';
import { getSupabase } from '@/lib/supabase';
import { withSupabaseAuth, AuthenticatedRequest } from '@/lib/supabase-middleware';

// Simple in-memory cache (5 minutes TTL)
let metricsCache: { data: unknown; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  // Check cache first
  const now = Date.now();
  if (metricsCache && (now - metricsCache.timestamp) < CACHE_TTL) {
    return res.status(200).json(metricsCache.data);
  }

  const supabase = getSupabase();

  try {
    const firstDayOfMonth = new Date(new Date().setDate(1)).toISOString();

    // 🚀 PARALLEL QUERIES - Execute all queries simultaneously
    const [
      { count: totalVendas },
      { count: vendasMes },
      { data: receitaTotal },
      { data: receitaMes },
      { count: totalClientes },
      { count: totalProdutos },
      { count: produtosBaixoEstoque },
      { count: vendasPendentes }
    ] = await Promise.all([
      supabase.from('vendas').select('*', { count: 'exact', head: true }).neq('status', 'cancelado'),
      supabase.from('vendas').select('*', { count: 'exact', head: true }).gte('data_venda', firstDayOfMonth).neq('status', 'cancelado'),
      supabase.from('vendas').select('valor_final').eq('status', 'pago'),
      supabase.from('vendas').select('valor_final').eq('status', 'pago').gte('data_venda', firstDayOfMonth),
      supabase.from('clientes_fornecedores').select('*', { count: 'exact', head: true }).eq('ativo', true),
      supabase.from('produtos').select('*', { count: 'exact', head: true }).eq('ativo', true),
      supabase.from('produtos').select('*', { count: 'exact', head: true }).filter('estoque', 'lte', 'estoque_minimo').eq('ativo', true),
      supabase.from('vendas').select('*', { count: 'exact', head: true }).eq('status', 'pendente')
    ]);

    const receitaTotalValue = receitaTotal?.reduce((sum, v) => sum + (parseFloat(String(v.valor_final)) || 0), 0) || 0;
    const receitaMesValue = receitaMes?.reduce((sum, v) => sum + (parseFloat(String(v.valor_final)) || 0), 0) || 0;

    const metrics = [
      {
        title: 'Vendas Total',
        value: totalVendas || 0,
        change: `${vendasMes || 0} este mês`,
        changeType: 'positive' as const,
        icon: 'TrendingUp',
      },
      {
        title: 'Receita Total',
        value: `R$ ${receitaTotalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        change: `R$ ${receitaMesValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} este mês`,
        changeType: 'positive' as const,
        icon: 'DollarSign',
      },
      {
        title: 'Total de Clientes',
        value: totalClientes || 0,
        change: 'Ativos',
        changeType: 'positive' as const,
        icon: 'Users',
      },
      {
        title: 'Total de Produtos',
        value: totalProdutos || 0,
        change: `${produtosBaixoEstoque || 0} com estoque baixo`,
        changeType: produtosBaixoEstoque && produtosBaixoEstoque > 0 ? 'negative' as const : 'positive' as const,
        icon: 'Package',
      },
      {
        title: 'Vendas Pendentes',
        value: vendasPendentes || 0,
        change: 'Aguardando',
        changeType: vendasPendentes && vendasPendentes > 0 ? 'negative' as const : 'positive' as const,
        icon: 'AlertCircle',
      },
    ];

    const response = {
      success: true,
      data: metrics,
    };

    // Cache the response
    metricsCache = { data: response, timestamp: now };

    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export default withSupabaseAuth(handler);
