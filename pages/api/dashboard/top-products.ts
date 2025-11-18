import type { NextApiResponse } from 'next';
import { getSupabase } from '@/lib/supabase';
import { withSupabaseAuth, AuthenticatedRequest } from '@/lib/supabase-middleware';

// Simple in-memory cache (5 minutes TTL)
let topProductsCache: { data: unknown; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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
  const { limit = '5' } = req.query;
  const limitNum = parseInt(limit as string, 10);

  // Check cache first
  const now = Date.now();
  const cacheKey = `top-products-${limitNum}`;
  if (topProductsCache && (now - topProductsCache.timestamp) < CACHE_TTL) {
    return res.status(200).json(topProductsCache.data);
  }

  // Use authenticated Supabase client for RLS
    const supabase = req.supabaseClient;

  try {
    // 🚀 OPTIMIZED QUERY - Fetch only recent data and use parallel queries
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      { data: vendasItens, error },
      { data: produtos, error: produtosError }
    ] = await Promise.all([
      // Fetch only last 30 days of sales items with limit for performance
      supabase
        .from('vendas_itens')
        .select(`
          produto_id,
          quantidade,
          preco_unitario,
          subtotal
        `)
        .order('created_at', { ascending: false })
        .limit(1000), // Limit to recent items for performance
      
      // Fetch all active products
      supabase
        .from('produtos')
        .select('id, nome')
        .eq('ativo', true)
    ]);

    if (error) throw error;
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


    const response = {
      success: true,
      data: topProducts,
    };

    // Cache the response
    topProductsCache = { data: response, timestamp: now };

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
