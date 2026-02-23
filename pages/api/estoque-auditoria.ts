import type { NextApiResponse } from 'next';
import { getSupabase } from '@/lib/supabase';
import { withSupabaseAuth, AuthenticatedRequest } from '@/lib/supabase-middleware';
import { fetchUserAccessProfile } from '@/lib/user-access';

interface AuditoriaEstoque {
  produto_id: number;
  produto_nome: string;
  estoque_inicial: number;
  total_entradas: number;
  total_saidas: number;
  total_vendas: number;
  estoque_calculado: number;
  estoque_atual: number;
  diferenca: number;
  status: 'ok' | 'divergente';
}

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const { method } = req;
  const supabase = req.supabaseClient;

  try {
    if (method === 'GET') {
      // Verificar permissão de estoque
      const accessProfile = await fetchUserAccessProfile(supabase, {
        id: req.user?.id,
        email: req.user?.email,
      });

      if (accessProfile && !accessProfile.permissions.estoque) {
        return res.status(403).json({
          success: false,
          message: 'Sem permissão para acessar auditoria de estoque',
        });
      }

      // Buscar todos os produtos com seus estoques atuais
      const { data: produtos, error: produtosError } = await supabase
        .from('produtos')
        .select(`
          id,
          nome,
          estoques:produtos_estoques(quantidade)
        `)
        .order('nome');

      if (produtosError) throw produtosError;

      // Buscar todas as movimentações de entrada
      const { data: movimentacoesEntrada, error: entradasError } = await supabase
        .from('movimentacoes_estoque')
        .select(`
          itens:movimentacoes_itens(produto_id, quantidade)
        `)
        .eq('tipo', 'entrada')
        .eq('status', 'confirmado');

      if (entradasError) throw entradasError;

      // Buscar todas as movimentações de saída (não vendas)
      const { data: movimentacoesSaida, error: saidasError } = await supabase
        .from('movimentacoes_estoque')
        .select(`
          itens:movimentacoes_itens(produto_id, quantidade)
        `)
        .eq('tipo', 'saida')
        .eq('status', 'confirmado');

      if (saidasError) throw saidasError;

      // Buscar todos os itens de vendas PAGAS (não canceladas, não pendentes)
      const { data: vendasItens, error: vendasError } = await supabase
        .from('vendas_itens')
        .select(`
          produto_id,
          quantidade,
          venda:vendas!inner(id, status)
        `)
        .eq('venda.status', 'pago')
        .not('venda.status', 'eq', 'cancelado'); // Garantir que não pegue canceladas

      if (vendasError) throw vendasError;

      console.log(`[AUDITORIA] Total de vendas_itens encontrados: ${vendasItens?.length || 0}`);

      // Buscar primeiro registro de histórico para cada produto (estoque inicial REAL)
      const { data: historicoPrimeiro, error: historicoError } = await supabase
        .from('estoques_historico')
        .select('produto_id, quantidade_anterior')
        .order('created_at', { ascending: true });

      if (historicoError) throw historicoError;

      // Mapear primeiro estoque de cada produto
      const estoqueInicialMap = new Map<number, number>();
      (historicoPrimeiro || []).forEach((h: any) => {
        if (!estoqueInicialMap.has(h.produto_id)) {
          estoqueInicialMap.set(h.produto_id, h.quantidade_anterior || 0);
        }
      });

      console.log(`[AUDITORIA] Mapeou estoque inicial de ${estoqueInicialMap.size} produtos do histórico`);

      // Calcular auditoria para cada produto
      const auditoria: AuditoriaEstoque[] = [];

      for (const produto of produtos || []) {
        const produto_id = produto.id;
        const produto_nome = produto.nome;

        // Estoque atual (soma de todos os estoques do produto)
        const estoque_atual = (produto.estoques || []).reduce((sum: number, e: any) => sum + (e.quantidade || 0), 0);

        // Total de entradas (movimentações)
        const total_entradas = (movimentacoesEntrada || []).reduce((sum, mov) => {
          const itens = mov.itens || [];
          const quantidade = itens
            .filter((item: any) => item.produto_id === produto_id)
            .reduce((itemSum: number, item: any) => itemSum + (item.quantidade || 0), 0);
          return sum + quantidade;
        }, 0);

        // Total de saídas de movimentações (não vendas)
        const total_saidas = (movimentacoesSaida || []).reduce((sum, mov) => {
          const itens = mov.itens || [];
          const quantidade = itens
            .filter((item: any) => item.produto_id === produto_id)
            .reduce((itemSum: number, item: any) => itemSum + (item.quantidade || 0), 0);
          return sum + quantidade;
        }, 0);

        // Total de vendas
        const total_vendas = (vendasItens || [])
          .filter((item: any) => item.produto_id === produto_id)
          .reduce((sum: number, item: any) => sum + (item.quantidade || 0), 0);

        // ESTOQUE INICIAL REAL: Primeiro registro do histórico (quantidade_anterior do primeiro movimento)
        // Se não houver histórico, usa o cálculo reverso como fallback
        const estoque_inicial_historico = estoqueInicialMap.get(produto_id);
        const estoque_inicial = estoque_inicial_historico !== undefined
          ? estoque_inicial_historico
          : estoque_atual - total_entradas + total_saidas + total_vendas; // Fallback: cálculo reverso

        // ESTOQUE CALCULADO (PROVA REAL):
        // Método 1 (usando histórico): Inicial + Entradas - Saídas - Vendas
        // Método 2 (simplificado): Inicial - Vendas (assumindo que vendas já estão contabilizadas)
        // Vamos usar o Método 1 completo para validação total
        const estoque_calculado = estoque_inicial + total_entradas - total_saidas - total_vendas;

        // Diferença (deve ser próxima de zero se os dados estiverem corretos)
        const diferenca = estoque_atual - estoque_calculado;

        // Status
        const status: 'ok' | 'divergente' = Math.abs(diferenca) < 0.01 ? 'ok' : 'divergente';

        auditoria.push({
          produto_id,
          produto_nome,
          estoque_inicial,
          total_entradas,
          total_saidas,
          total_vendas,
          estoque_calculado,
          estoque_atual,
          diferenca,
          status
        });
      }

      // Ordenar: divergentes primeiro, depois por nome
      auditoria.sort((a, b) => {
        if (a.status === 'divergente' && b.status === 'ok') return -1;
        if (a.status === 'ok' && b.status === 'divergente') return 1;
        return a.produto_nome.localeCompare(b.produto_nome);
      });

      // Calcular resumo geral
      const resumo = {
        total_produtos: auditoria.length,
        produtos_ok: auditoria.filter(a => a.status === 'ok').length,
        produtos_divergentes: auditoria.filter(a => a.status === 'divergente').length,
        total_vendas_registradas: vendasItens?.length || 0,
        total_entradas_registradas: movimentacoesEntrada?.reduce((sum, mov) => sum + (mov.itens?.length || 0), 0) || 0,
        total_saidas_registradas: movimentacoesSaida?.reduce((sum, mov) => sum + (mov.itens?.length || 0), 0) || 0,
      };

      console.log(`[AUDITORIA RESUMO]`, resumo);

      return res.status(200).json({
        success: true,
        data: auditoria,
        resumo,
      });
    }

    return res.status(405).json({ success: false, message: 'Método não permitido' });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export default withSupabaseAuth(handler);
