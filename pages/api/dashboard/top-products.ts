import type { NextApiResponse } from 'next';
import { getSupabase } from '@/lib/supabase';
import { withSupabaseAuth, AuthenticatedRequest } from '@/lib/supabase-middleware';

interface VendaItem {
  produto_id: number;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
}

interface Produto {
  id: number;
  nome: string;
}

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const supabase = getSupabase();

  try {
    const { limit = '5' } = req.query;
    const limitNum = parseInt(limit as string, 10);

    // Buscar produtos mais vendidos baseado nos itens de vendas
    const { data: vendasItens, error } = await supabase
      .from('vendas_itens')
      .select(`
        produto_id,
        quantidade,
        preco_unitario,
        subtotal
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Buscar nomes dos produtos
    const produtoIds = Array.from(new Set((vendasItens || []).map((item: VendaItem) => item.produto_id)));
    const { data: produtos, error: produtosError } = await supabase
      .from('produtos')
      .select('id, nome')
      .in('id', produtoIds);

    if (produtosError) throw produtosError;

    // Criar mapa de produtos por ID
    const produtosById = new Map(
      (produtos || []).map((p: Produto) => [p.id, p.nome])
    );

    // Agrupar por produto e calcular totais
    const produtosMap = new Map<number, {
      nome: string;
      vendas: number;
      receita: number;
    }>();

    (vendasItens || []).forEach((item: VendaItem) => {
      if (!item.produto_id) return;

      const produtoId = item.produto_id;
      const quantidade = parseFloat(item.quantidade?.toString() || '0');
      const subtotal = parseFloat(item.subtotal?.toString() || '0');
      const nomeProduto = produtosById.get(produtoId);

      if (!nomeProduto) return;

      if (produtosMap.has(produtoId)) {
        const produto = produtosMap.get(produtoId)!;
        produto.vendas += quantidade;
        produto.receita += subtotal;
      } else {
        produtosMap.set(produtoId, {
          nome: nomeProduto,
          vendas: quantidade,
          receita: subtotal
        });
      }
    });

    // Converter para array e ordenar por quantidade de vendas
    const topProducts = Array.from(produtosMap.values())
      .sort((a, b) => b.vendas - a.vendas)
      .slice(0, limitNum);

    console.log('📊 Top products calculados:', topProducts);

    return res.status(200).json({
      success: true,
      data: topProducts,
    });
  } catch (error) {
    console.error('Dashboard Top Products API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export default withSupabaseAuth(handler);
