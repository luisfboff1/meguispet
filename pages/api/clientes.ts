import type { NextApiResponse } from 'next';
import { getSupabase } from '@/lib/supabase';
import { withSupabaseAuth, AuthenticatedRequest } from '@/lib/supabase-middleware';

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const { method } = req;

  try {
    const supabase = getSupabase();

    if (method === 'GET') {
      const { page = '1', limit = '10', search = '', tipo = '' } = req.query;
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
    }

    if (method === 'POST') {
      const { nome, tipo, email, telefone, endereco, cidade, estado, cep, documento, observacoes, vendedor_id } = req.body;

      if (!nome || !tipo) {
        return res.status(400).json({
          success: false,
          message: 'Campos nome e tipo são obrigatórios',
        });
      }

      const { data, error } = await supabase
        .from('clientes_fornecedores')
        .insert({
          nome,
          tipo,
          email: email || null,
          telefone: telefone || null,
          endereco: endereco || null,
          cidade: cidade || null,
          estado: estado || null,
          cep: cep || null,
          documento: documento || null,
          observacoes: observacoes || null,
          vendedor_id: vendedor_id || null,
        })
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json({
        success: true,
        message: 'Cliente criado com sucesso',
        data,
      });
    }

    if (method === 'PUT') {
      const { id, nome, tipo, email, telefone, endereco, cidade, estado, cep, documento, observacoes, vendedor_id } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'ID do cliente é obrigatório',
        });
      }

      const { data, error } = await supabase
        .from('clientes_fornecedores')
        .update({
          nome,
          tipo,
          email: email || null,
          telefone: telefone || null,
          endereco: endereco || null,
          cidade: cidade || null,
          estado: estado || null,
          cep: cep || null,
          documento: documento || null,
          observacoes: observacoes || null,
          vendedor_id: vendedor_id || null,
          updated_at: new Date().toISOString(),
        })
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

    if (method === 'DELETE') {
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
    }

    return res.status(405).json({ success: false, message: 'Método não permitido' });
  } catch (error) {
    console.error('Clientes API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export default withSupabaseAuth(handler);
