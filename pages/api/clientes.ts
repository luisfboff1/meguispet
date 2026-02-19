import type { NextApiResponse } from 'next';
import { withSupabaseAuth, AuthenticatedRequest } from '@/lib/supabase-middleware';
import { withValidation } from '@/lib/validation-middleware';
import { clienteCreateSchema, clienteUpdateSchema, ClienteInput, ClienteUpdateInput } from '@/lib/validations/cliente.schema';
import { z } from 'zod';
import { GeocodingService } from '@/services/geocoding';
import { fetchUserAccessProfile } from '@/lib/user-access';

/**
 * Helper function to translate Supabase/PostgreSQL errors into user-friendly messages
 */
const translateDatabaseError = (error: any): string => {
  // PostgreSQL error codes: https://www.postgresql.org/docs/current/errcodes-appendix.html
  const code = error?.code;
  const message = error?.message || '';
  const details = error?.details || '';

  // 23505: unique_violation - Duplicate key value violates unique constraint
  if (code === '23505') {
    if (message.includes('documento') || details.includes('documento')) {
      return 'Já existe um cliente/fornecedor cadastrado com este CPF/CNPJ';
    }
    if (message.includes('email') || details.includes('email')) {
      return 'Já existe um cliente/fornecedor cadastrado com este e-mail';
    }
    return 'Este registro já existe no banco de dados';
  }

  // 23503: foreign_key_violation - Referenced record doesn't exist
  if (code === '23503') {
    if (message.includes('vendedor_id') || details.includes('vendedor_id')) {
      return 'O vendedor selecionado não existe';
    }
    return 'Erro de relacionamento: um dos registros referenciados não existe';
  }

  // 23502: not_null_violation - Required field is missing
  if (code === '23502') {
    const field = message.match(/column "([^"]+)"/)?.[1];
    return `O campo ${field || 'obrigatório'} não pode estar vazio`;
  }

  // 23514: check_violation - Check constraint violated
  if (code === '23514') {
    return 'Os dados fornecidos violam as regras de validação do banco';
  }

  // 42P01: undefined_table - Table doesn't exist (shouldn't happen in production)
  if (code === '42P01') {
    return 'Erro de configuração do banco de dados';
  }

  // Default error message
  return 'Erro no banco de dados';
};

/**
 * GET handler - List or get single cliente
 */
const handleGet = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const supabase = req.supabaseClient;
  const { page = '1', limit = '10', search = '', tipo = '', id, includeInactive = 'false' } = req.query;

  // Fetch access profile to enforce vendedor filtering
  const accessProfile = await fetchUserAccessProfile(supabase, {
    id: req.user?.id,
    email: req.user?.email,
  });

  // If requesting a specific cliente by ID, return just that one
  if (id) {
    let idQuery = supabase
      .from('clientes_fornecedores')
      .select('*, vendedor:vendedores(id, nome)')
      .eq('id', id);

    // Restrict to own clients if vendedor cannot see all
    if (accessProfile && !accessProfile.canViewAllClients && accessProfile.vendedorId) {
      idQuery = idQuery.eq('vendedor_id', accessProfile.vendedorId);
    }

    const { data: cliente, error } = await idQuery.single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ success: false, message: 'Cliente não encontrado' });
      }
      throw error;
    }

    return res.status(200).json({
      success: true,
      data: cliente,
    });
  }

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const offset = (pageNum - 1) * limitNum;

  // If user cannot view all clients and has no vendedor link, return empty
  if (accessProfile && !accessProfile.canViewAllClients && !accessProfile.vendedorId) {
    return res.status(200).json({
      success: true,
      data: [],
      pagination: { page: pageNum, limit: limitNum, total: 0, pages: 0 },
    });
  }

  let query = supabase
    .from('clientes_fornecedores')
    .select('*, vendedor:vendedores(id, nome)', { count: 'exact' });

  // Server-side filtering: restrict to vendedor's own clients if not allowed to see all
  if (accessProfile && !accessProfile.canViewAllClients && accessProfile.vendedorId) {
    query = query.eq('vendedor_id', accessProfile.vendedorId);
  }

  // Por padrão, mostrar apenas clientes ativos
  if (includeInactive !== 'true') {
    query = query.eq('ativo', true);
  }

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

    // Auto-assign vendedor_id: if user is a vendedor and no vendedor_id provided, use theirs
    let effectiveVendedorId = validatedData.vendedor_id || null;
    if (!effectiveVendedorId) {
      const accessProfile = await fetchUserAccessProfile(supabase, {
        id: req.user?.id,
        email: req.user?.email,
      });
      if (accessProfile && !accessProfile.canViewAllClients && accessProfile.vendedorId) {
        effectiveVendedorId = accessProfile.vendedorId;
      }
    }

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
      inscricao_estadual: validatedData.inscricao_estadual || null,
      observacoes: validatedData.observacoes || null,
      vendedor_id: effectiveVendedorId,
      // Geolocation fields
      latitude: validatedData.latitude ?? null,
      longitude: validatedData.longitude ?? null,
      geocoded_at: validatedData.geocoded_at ?? null,
      geocoding_source: validatedData.geocoding_source ?? null,
      geocoding_precision: validatedData.geocoding_precision ?? null,
    };

    // Geocodificar automaticamente se houver CEP
    if (clienteData.cep && !clienteData.latitude && !clienteData.longitude) {
      console.log(`[API Clientes] Geocodificando automaticamente cliente: ${clienteData.nome}`);
      try {
        const geocodingResult = await GeocodingService.geocodeFromCEP(clienteData.cep);

        if (geocodingResult) {
          console.log(`[API Clientes] ✅ Geocodificação bem-sucedida (${geocodingResult.precision})`);
          clienteData.latitude = geocodingResult.latitude;
          clienteData.longitude = geocodingResult.longitude;
          clienteData.geocoded_at = new Date().toISOString();
          clienteData.geocoding_source = geocodingResult.source;
          clienteData.geocoding_precision = geocodingResult.precision;
        } else {
          console.log(`[API Clientes] ⚠️ Geocodificação falhou - cliente será criado sem coordenadas`);
        }
      } catch (geocodingError) {
        console.error(`[API Clientes] ❌ Erro na geocodificação:`, geocodingError);
        // Continuar criando o cliente mesmo se a geocodificação falhar
      }
    }

    const { data, error } = await supabase
      .from('clientes_fornecedores')
      .insert(clienteData)
      .select()
      .single();

    if (error) {
      console.error('[API Clientes] Erro ao criar cliente:', error);
      const userFriendlyMessage = translateDatabaseError(error);
      return res.status(400).json({
        success: false,
        message: userFriendlyMessage,
        code: error.code,
      });
    }

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

    // Get current cliente data to check if CEP changed
    const { data: currentCliente } = await supabase
      .from('clientes_fornecedores')
      .select('cep, latitude, longitude')
      .eq('id', id)
      .single();

    // Convert empty strings to null for optional fields
    const updateData: any = {
      ...updateFields,
      email: updateFields.email || null,
      telefone: updateFields.telefone || null,
      endereco: updateFields.endereco || null,
      cidade: updateFields.cidade || null,
      estado: updateFields.estado || null,
      cep: updateFields.cep || null,
      documento: updateFields.documento || null,
      inscricao_estadual: updateFields.inscricao_estadual || null,
      observacoes: updateFields.observacoes || null,
      vendedor_id: updateFields.vendedor_id || null,
      // Geolocation fields
      latitude: updateFields.latitude ?? undefined,
      longitude: updateFields.longitude ?? undefined,
      geocoded_at: updateFields.geocoded_at ?? undefined,
      geocoding_source: updateFields.geocoding_source ?? undefined,
      geocoding_precision: updateFields.geocoding_precision ?? undefined,
      updated_at: new Date().toISOString(),
    };

    // Geocodificar automaticamente se o CEP foi alterado
    const cepChanged = updateData.cep && currentCliente && updateData.cep !== currentCliente.cep;
    if (cepChanged) {
      console.log(`[API Clientes] CEP alterado, re-geocodificando cliente ID ${id}`);
      try {
        const geocodingResult = await GeocodingService.geocodeFromCEP(updateData.cep);

        if (geocodingResult) {
          console.log(`[API Clientes] ✅ Re-geocodificação bem-sucedida (${geocodingResult.precision})`);
          updateData.latitude = geocodingResult.latitude;
          updateData.longitude = geocodingResult.longitude;
          updateData.geocoded_at = new Date().toISOString();
          updateData.geocoding_source = geocodingResult.source;
          updateData.geocoding_precision = geocodingResult.precision;
        } else {
          console.log(`[API Clientes] ⚠️ Re-geocodificação falhou - coordenadas antigas serão mantidas`);
        }
      } catch (geocodingError) {
        console.error(`[API Clientes] ❌ Erro na re-geocodificação:`, geocodingError);
        // Continuar atualizando o cliente mesmo se a geocodificação falhar
      }
    }

    const { data, error } = await supabase
      .from('clientes_fornecedores')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) {
      console.error('[API Clientes] Erro ao atualizar cliente:', error);
      const userFriendlyMessage = translateDatabaseError(error);
      return res.status(400).json({
        success: false,
        message: userFriendlyMessage,
        code: error.code,
      });
    }

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

    // Se for erro de validação Zod, retornar detalhes específicos
    if (error && typeof error === 'object' && 'issues' in error) {
      const zodError = error as z.ZodError;
      console.error('[API /clientes] Validation errors:', zodError.issues);
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos',
        errors: zodError.issues.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      });
    }

    // Se for erro do Supabase, retornar detalhes com mensagem amigável
    if (error && typeof error === 'object' && 'code' in error) {
      console.error('[API /clientes] Database error:', error);
      const userFriendlyMessage = translateDatabaseError(error);
      return res.status(400).json({
        success: false,
        message: userFriendlyMessage,
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
