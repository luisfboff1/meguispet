import type { NextApiResponse } from 'next';
import { getSupabase } from '@/lib/supabase';
import { withSupabaseAuth, AuthenticatedRequest } from '@/lib/supabase-middleware';

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const { method } = req;

  try {
    // Use authenticated Supabase client for RLS
    const supabase = req.supabaseClient;

    if (method === 'GET') {
      const { id, page = '1', limit = '10', search = '' } = req.query;

      if (id) {
        const { data: fornecedor, error } = await supabase
          .from('fornecedores')
          .select('*')
          .eq('id', id)
          .eq('ativo', true)
          .single();

        if (error || !fornecedor) {
          return res.status(404).json({ success: false, message: 'Fornecedor não encontrado' });
        }

        return res.status(200).json({ success: true, data: fornecedor });
      }

      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const offset = (pageNum - 1) * limitNum;

      let query = supabase
        .from('fornecedores')
        .select('*', { count: 'exact' })
        .eq('ativo', true);

      if (search) {
        const searchStr = `%${search}%`;
        query = query.or(`nome.ilike.${searchStr},nome_fantasia.ilike.${searchStr},cnpj.ilike.${searchStr},email.ilike.${searchStr}`);
      }

      const { data: fornecedores, count, error } = await query
        .order('nome', { ascending: true })
        .range(offset, offset + limitNum - 1);

      if (error) throw error;

      return res.status(200).json({
        success: true,
        data: fornecedores || [],
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: count || 0,
          pages: Math.ceil((count || 0) / limitNum),
        },
      });
    }

    if (method === 'POST') {
      const { nome, nome_fantasia, cnpj, inscricao_estadual, email, telefone, endereco, cidade, estado, cep, observacoes } = req.body;

      if (!nome) {
        return res.status(400).json({ success: false, message: 'Nome do fornecedor é obrigatório' });
      }

      const { data, error } = await supabase
        .from('fornecedores')
        .insert({
          nome,
          nome_fantasia: nome_fantasia || null,
          cnpj: cnpj || null,
          inscricao_estadual: inscricao_estadual || null,
          email: email || null,
          telefone: telefone || null,
          endereco: endereco || null,
          cidade: cidade || null,
          estado: estado || null,
          cep: cep || null,
          observacoes: observacoes || null,
        })
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json({
        success: true,
        message: 'Fornecedor criado com sucesso',
        data,
      });
    }

    if (method === 'PUT') {
      const { id, nome, nome_fantasia, cnpj, inscricao_estadual, email, telefone, endereco, cidade, estado, cep, observacoes } = req.body;

      if (!id) {
        return res.status(400).json({ success: false, message: 'ID do fornecedor é obrigatório' });
      }

      const { data, error } = await supabase
        .from('fornecedores')
        .update({
          nome,
          nome_fantasia: nome_fantasia || null,
          cnpj: cnpj || null,
          inscricao_estadual: inscricao_estadual || null,
          email: email || null,
          telefone: telefone || null,
          endereco: endereco || null,
          cidade: cidade || null,
          estado: estado || null,
          cep: cep || null,
          observacoes: observacoes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        return res.status(404).json({ success: false, message: 'Fornecedor não encontrado' });
      }

      return res.status(200).json({
        success: true,
        message: 'Fornecedor atualizado com sucesso',
        data: data[0],
      });
    }

    if (method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ success: false, message: 'ID do fornecedor é obrigatório' });
      }

      const { data, error } = await supabase
        .from('fornecedores')
        .update({ ativo: false, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        return res.status(404).json({ success: false, message: 'Fornecedor não encontrado' });
      }

      return res.status(200).json({
        success: true,
        message: 'Fornecedor removido com sucesso',
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
