import type { NextApiResponse } from 'next';
import { getSupabase } from '@/lib/supabase';
import { withSupabaseAuth, AuthenticatedRequest } from '@/lib/supabase-middleware';

interface EstoqueItem {
  quantidade: number;
}

interface EstoqueInput {
  estoque_id: number;
  quantidade?: number;
}

interface ProdutoComEstoques {
  estoques?: EstoqueItem[];
  [key: string]: unknown;
}

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const { method } = req;

  try {
    const supabase = getSupabase();

    if (method === 'GET') {
      const { id, page = '1', limit = '10', search = '', categoria = '' } = req.query;

      if (id) {
        const { data: produto, error } = await supabase
          .from('produtos')
          .select('*, estoques:produtos_estoques(estoque_id, estoque:estoques(nome), quantidade)')
          .eq('id', id)
          .single();

        if (error || !produto) {
          return res.status(404).json({ success: false, message: 'Produto não encontrado' });
        }

        const estoqueTotal = produto.estoques?.reduce((sum: number, e: EstoqueItem) => sum + (e.quantidade || 0), 0) || 0;

        return res.status(200).json({
          success: true,
          data: { ...produto, estoque: estoqueTotal, estoque_total: estoqueTotal },
        });
      }

      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const offset = (pageNum - 1) * limitNum;

      let query = supabase
        .from('produtos')
        .select('*, estoques:produtos_estoques(estoque_id, quantidade, estoque:estoques(id, nome))', { count: 'exact' });

      if (search) {
        const searchStr = `%${search}%`;
        query = query.or(`nome.ilike.${searchStr},descricao.ilike.${searchStr},codigo_barras.ilike.${searchStr}`);
      }

      if (categoria) {
        query = query.eq('categoria', categoria);
      }

      const { data: produtos, count, error } = await query
        .eq('ativo', true)
        .order('nome', { ascending: true })
        .range(offset, offset + limitNum - 1);

      if (error) throw error;

      const produtosComEstoque = produtos?.map((p: ProdutoComEstoques) => {
        const estoqueTotal = p.estoques?.reduce((sum: number, e: EstoqueItem) => sum + (e.quantidade || 0), 0) || 0;
        return { ...p, estoque: estoqueTotal, estoque_total: estoqueTotal };
      });

      return res.status(200).json({
        success: true,
        data: produtosComEstoque || [],
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: count || 0,
          pages: Math.ceil((count || 0) / limitNum),
        },
      });
    }

    if (method === 'POST') {
      const { nome, descricao, preco_venda, preco_custo, estoque_minimo, categoria, codigo_barras, estoques } = req.body;

      if (!nome) {
        return res.status(400).json({ success: false, message: 'Nome do produto é obrigatório' });
      }

      if (codigo_barras) {
        const { data: existing } = await supabase
          .from('produtos')
          .select('id')
          .eq('codigo_barras', codigo_barras)
          .single();

        if (existing) {
          return res.status(400).json({ success: false, message: 'Código de barras já existe' });
        }
      }

      const { data: produto, error } = await supabase
        .from('produtos')
        .insert({
          nome,
          descricao: descricao || null,
          preco_venda: preco_venda || 0,
          preco_custo: preco_custo || 0,
          estoque_minimo: estoque_minimo || 0,
          categoria: categoria || null,
          codigo_barras: codigo_barras || null,
        })
        .select()
        .single();

      if (error) throw error;

      if (estoques && Array.isArray(estoques) && estoques.length > 0) {
        const estoquesInsert = estoques.map((e: EstoqueInput) => ({
          produto_id: produto.id,
          estoque_id: e.estoque_id,
          quantidade: e.quantidade || 0,
        }));

        await supabase.from('produtos_estoques').insert(estoquesInsert);
      }

      return res.status(201).json({
        success: true,
        message: 'Produto criado com sucesso',
        data: produto,
      });
    }

    if (method === 'PUT') {
      const { id, nome, descricao, preco_venda, preco_custo, estoque_minimo, categoria, codigo_barras, estoques } = req.body;

      if (!id) {
        return res.status(400).json({ success: false, message: 'ID do produto é obrigatório' });
      }

      if (codigo_barras) {
        const { data: existing } = await supabase
          .from('produtos')
          .select('id')
          .eq('codigo_barras', codigo_barras)
          .neq('id', id)
          .single();

        if (existing) {
          return res.status(400).json({ success: false, message: 'Código de barras já existe' });
        }
      }

      const { data: produto, error } = await supabase
        .from('produtos')
        .update({
          nome,
          descricao: descricao || null,
          preco_venda: preco_venda || 0,
          preco_custo: preco_custo || 0,
          estoque_minimo: estoque_minimo || 0,
          categoria: categoria || null,
          codigo_barras: codigo_barras || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select();

      if (error) throw error;

      if (!produto || produto.length === 0) {
        return res.status(404).json({ success: false, message: 'Produto não encontrado' });
      }

      if (estoques && Array.isArray(estoques)) {
        await supabase.from('produtos_estoques').delete().eq('produto_id', id);

        if (estoques.length > 0) {
          const estoquesInsert = estoques.map((e: EstoqueInput) => ({
            produto_id: id,
            estoque_id: e.estoque_id,
            quantidade: e.quantidade || 0,
          }));

          await supabase.from('produtos_estoques').insert(estoquesInsert);
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Produto atualizado com sucesso',
        data: produto[0],
      });
    }

    if (method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ success: false, message: 'ID do produto é obrigatório' });
      }

      const { data, error } = await supabase
        .from('produtos')
        .update({ ativo: false, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        return res.status(404).json({ success: false, message: 'Produto não encontrado' });
      }

      return res.status(200).json({
        success: true,
        message: 'Produto removido com sucesso',
      });
    }

    return res.status(405).json({ success: false, message: 'Método não permitido' });
  } catch (error) {
    console.error('Produtos API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export default withSupabaseAuth(handler);
