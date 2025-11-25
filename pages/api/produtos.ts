import type { NextApiResponse } from 'next';
import { withSupabaseAuth, AuthenticatedRequest } from '@/lib/supabase-middleware';
import { withValidation } from '@/lib/validation-middleware';
import { produtoCreateSchema, produtoUpdateSchema, ProdutoInput, ProdutoUpdateInput } from '@/lib/validations/produto.schema';
import { z } from 'zod';

interface EstoqueItem {
  quantidade: number;
}

interface ProdutoComEstoques {
  estoques?: EstoqueItem[];
  [key: string]: unknown;
}

/**
 * GET handler - List or get single produto
 */
const handleGet = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const supabase = req.supabaseClient;
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
};

/**
 * POST handler - Create new produto (with validation)
 */
const handlePost = withValidation(
  produtoCreateSchema,
  async (req: AuthenticatedRequest, res: NextApiResponse, validatedData: ProdutoInput) => {
    const supabase = req.supabaseClient;

    // Check if codigo_barras already exists
    if (validatedData.codigo_barras) {
      const { data: existing } = await supabase
        .from('produtos')
        .select('id')
        .eq('codigo_barras', validatedData.codigo_barras)
        .single();

      if (existing) {
        return res.status(400).json({ success: false, message: 'Código de barras já existe' });
      }
    }

    // Prepare product data
    const produtoData = {
      nome: validatedData.nome,
      descricao: validatedData.descricao || null,
      preco_venda: validatedData.preco_venda,
      preco_custo: validatedData.preco_custo,
      estoque_minimo: validatedData.estoque_minimo,
      categoria: validatedData.categoria || null,
      codigo_barras: validatedData.codigo_barras || null,
      ipi: validatedData.ipi,
      icms: validatedData.icms,
      st: validatedData.st,
    };

    const { data: produto, error } = await supabase
      .from('produtos')
      .insert(produtoData)
      .select()
      .single();

    if (error) throw error;

    // Insert stock entries if provided
    if (validatedData.estoques && validatedData.estoques.length > 0) {
      const estoquesInsert = validatedData.estoques.map((e) => ({
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
);

/**
 * PUT handler - Update existing produto (with validation)
 */
const handlePut = withValidation(
  produtoUpdateSchema,
  async (req: AuthenticatedRequest, res: NextApiResponse, validatedData: ProdutoUpdateInput) => {
    const supabase = req.supabaseClient;

    if (!validatedData.id) {
      return res.status(400).json({ success: false, message: 'ID do produto é obrigatório' });
    }

    // Check if codigo_barras already exists for another product
    if (validatedData.codigo_barras) {
      const { data: existing } = await supabase
        .from('produtos')
        .select('id')
        .eq('codigo_barras', validatedData.codigo_barras)
        .neq('id', validatedData.id)
        .single();

      if (existing) {
        return res.status(400).json({ success: false, message: 'Código de barras já existe' });
      }
    }

    // Prepare update data (exclude id)
    const { id, estoques, ...updateFields } = validatedData;

    const updateData = {
      ...updateFields,
      descricao: updateFields.descricao || null,
      categoria: updateFields.categoria || null,
      codigo_barras: updateFields.codigo_barras || null,
      updated_at: new Date().toISOString(),
    };

    const { data: produto, error } = await supabase
      .from('produtos')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) throw error;

    if (!produto || produto.length === 0) {
      return res.status(404).json({ success: false, message: 'Produto não encontrado' });
    }

    // Update stock entries if provided
    if (estoques) {
      // Delete existing stock entries
      await supabase.from('produtos_estoques').delete().eq('produto_id', id);

      // Insert new stock entries
      if (estoques.length > 0) {
        const estoquesInsert = estoques.map((e) => ({
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
);

/**
 * DELETE handler - Soft delete produto
 */
const handleDelete = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const supabase = req.supabaseClient;
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
};

/**
 * Main handler - Routes to appropriate method handler
 */
const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const { method } = req;

  try {
    if (method === 'GET') {
      return await handleGet(req, res);
    }

    if (method === 'POST') {
      return await handlePost(req, res);
    }

    if (method === 'PUT') {
      return await handlePut(req, res);
    }

    if (method === 'DELETE') {
      return await handleDelete(req, res);
    }

    return res.status(405).json({ success: false, message: 'Método não permitido' });
  } catch (error) {
    console.error('[API /produtos] Error:', error);

    // Se for erro de validação Zod, retornar detalhes específicos
    if (error && typeof error === 'object' && 'issues' in error) {
      const zodError = error as z.ZodError;
      console.error('[API /produtos] Validation errors:', zodError.issues);
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos',
        errors: zodError.issues.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      });
    }

    // Se for erro do Supabase, retornar detalhes
    if (error && typeof error === 'object' && 'code' in error) {
      console.error('[API /produtos] Database error:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro no banco de dados',
        error: error instanceof Error ? error.message : 'Unknown error',
        code: (error as { code: string }).code,
      });
    }

    // Erro genérico
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export default withSupabaseAuth(handler);
