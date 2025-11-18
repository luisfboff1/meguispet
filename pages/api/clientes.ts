import type { NextApiResponse } from 'next';
import { withSupabaseAuth, AuthenticatedRequest } from '@/lib/supabase-middleware';
import { withValidation } from '@/lib/validation-middleware';
import { clienteCreateSchema, clienteUpdateSchema, ClienteInput, ClienteUpdateInput } from '@/lib/validations/cliente.schema';

/**
 * GET handler - List or get single cliente
 */
const handleGet = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const supabase = req.supabaseClient;
  const { page = '1', limit = '10', search = '', tipo = '', id } = req.query;

  // If requesting a specific cliente by ID, return just that one
  if (id) {
    const { data: cliente, error } = await supabase
      .from('clientes_fornecedores')
      .select('*, vendedor:vendedores(id, nome)')
      .eq('id', id)
      .single();

    if (error) throw error;

    return res.status(200).json({
      success: true,
      data: cliente,
    });
  }

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const offset = (pageNum - 1) * limitNum;

  let query = supabase
    .from('clientes_fornecedores')
    .select('*, vendedor:vendedores(id, nome)', { count: 'exact' });

  if (search) {
    const searchStr = `%${search}%`;
    query = query.or(`nome.ilike.${searchStr},email.ilike.${searchStr},documento.ilike.${searchStr}`);
  }

  if (tipo) {
    query = query.eq('tipo', tipo);
  }

  const { data: clientes, count, error } = await query
    .order('nome', { ascending: true })
    .range(offset, offset + limitNum - 1);

  if (error) throw error;

  return res.status(200).json({
    success: true,
    data: clientes || [],
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: count || 0,
      pages: Math.ceil((count || 0) / limitNum),
    },
  });
};

/**
 * POST handler - Create new cliente (with validation)
 */
const handlePost = withValidation(
  clienteCreateSchema,
  async (req: AuthenticatedRequest, res: NextApiResponse, validatedData: ClienteInput) => {
    const supabase = req.supabaseClient;

    // Convert empty strings to null for optional fields
    const clienteData = {
      nome: validatedData.nome,
      tipo: validatedData.tipo,
      email: validatedData.email || null,
      telefone: validatedData.telefone || null,
      endereco: validatedData.endereco || null,
      cidade: validatedData.cidade || null,
      estado: validatedData.estado || null,
      cep: validatedData.cep || null,
      documento: validatedData.documento || null,
      observacoes: validatedData.observacoes || null,
      vendedor_id: validatedData.vendedor_id || null,
    };

    const { data, error } = await supabase
      .from('clientes_fornecedores')
      .insert(clienteData)
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({
      success: true,
      message: 'Cliente criado com sucesso',
      data,
    });
  }
);

/**
 * PUT handler - Update existing cliente (with validation)
 */
const handlePut = withValidation(
  clienteUpdateSchema,
  async (req: AuthenticatedRequest, res: NextApiResponse, validatedData: ClienteUpdateInput) => {
    const supabase = req.supabaseClient;

    if (!validatedData.id) {
      return res.status(400).json({
        success: false,
        message: 'ID do cliente é obrigatório',
      });
    }

    // Prepare update data (exclude id from update)
    const { id, ...updateFields } = validatedData;

    // Convert empty strings to null for optional fields
    const updateData = {
      ...updateFields,
      email: updateFields.email || null,
      telefone: updateFields.telefone || null,
      endereco: updateFields.endereco || null,
      cidade: updateFields.cidade || null,
      estado: updateFields.estado || null,
      cep: updateFields.cep || null,
      documento: updateFields.documento || null,
      observacoes: updateFields.observacoes || null,
      vendedor_id: updateFields.vendedor_id || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('clientes_fornecedores')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cliente não encontrado',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Cliente atualizado com sucesso',
      data: data[0],
    });
  }
);

/**
 * DELETE handler - Soft delete cliente
 */
const handleDelete = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const supabase = req.supabaseClient;
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: 'ID do cliente é obrigatório',
    });
  }

  const { data, error } = await supabase
    .from('clientes_fornecedores')
    .update({ ativo: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select();

  if (error) throw error;

  if (!data || data.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Cliente não encontrado',
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Cliente removido com sucesso',
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
    console.error('[API /clientes] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export default withSupabaseAuth(handler);
