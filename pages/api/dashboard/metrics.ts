import type { NextApiResponse } from 'next';
import { getSupabase } from '@/lib/supabase';
import { withAuth, AuthenticatedRequest } from '@/lib/api-middleware';

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const supabase = getSupabase();

  try {
    const { count: totalVendas } = await supabase.from('vendas').select('*', { count: 'exact', head: true }).neq('status', 'cancelado');
    const { count: vendasMes } = await supabase.from('vendas').select('*', { count: 'exact', head: true }).gte('data_venda', new Date(new Date().setDate(1)).toISOString()).neq('status', 'cancelado');
    const { data: receitaTotal } = await supabase.from('vendas').select('valor_final').eq('status', 'pago');
    const { data: receitaMes } = await supabase.from('vendas').select('valor_final').eq('status', 'pago').gte('data_venda', new Date(new Date().setDate(1)).toISOString());
    const { count: totalClientes } = await supabase.from('clientes_fornecedores').select('*', { count: 'exact', head: true }).eq('ativo', true);
    const { count: totalProdutos } = await supabase.from('produtos').select('*', { count: 'exact', head: true }).eq('ativo', true);
    const { count: produtosBaixoEstoque } = await supabase.from('produtos').select('*', { count: 'exact', head: true }).filter('estoque', 'lte', 'estoque_minimo').eq('ativo', true);
    const { count: vendasPendentes } = await supabase.from('vendas').select('*', { count: 'exact', head: true }).eq('status', 'pendente');

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

    return res.status(200).json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    console.error('Dashboard Metrics API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export default withAuth(handler);
