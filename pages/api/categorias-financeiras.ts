import type { NextApiResponse } from 'next';
import { getSupabase } from '@/lib/supabase';
import { withSupabaseAuth, AuthenticatedRequest } from '@/lib/supabase-middleware';

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const { method } = req;
  const supabase = getSupabase();

  try {
    if (method === 'GET') {
      const { tipo = '' } = req.query;

      let query = supabase.from('categorias_financeiras').select('*');

      // Filter by tipo if provided
      if (tipo && tipo !== 'ambos') {
        query = query.or(`tipo.eq.${tipo},tipo.eq.ambos`);
      }

      const { data, error } = await query.order('ordem', { ascending: true });

      if (error) throw error;

      return res.status(200).json({
        success: true,
        data: data || [],
      });
    }

    if (method === 'POST') {
      const { nome, tipo, cor, icone, descricao, ativo, ordem } = req.body;

      // Validate required fields
      if (!nome || !tipo) {
        return res.status(400).json({ 
          success: false, 
          message: 'Nome e tipo são obrigatórios' 
        });
      }

      // Check if categoria already exists
      const { data: existing } = await supabase
        .from('categorias_financeiras')
        .select('id')
        .eq('nome', nome)
        .single();

      if (existing) {
        return res.status(400).json({ 
          success: false, 
          message: 'Já existe uma categoria com este nome' 
        });
      }

      const { data, error } = await supabase
        .from('categorias_financeiras')
        .insert({
          nome,
          tipo,
          cor: cor || '#6B7280',
          icone: icone || null,
          descricao: descricao || null,
          ativo: ativo !== false,
          ordem: ordem || 0,
        })
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json({ 
        success: true, 
        message: 'Categoria criada com sucesso', 
        data 
      });
    }

    return res.status(405).json({ success: false, message: 'Método não permitido' });
  } catch (error) {
    console.error('Categorias Financeiras API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export default withSupabaseAuth(handler);
