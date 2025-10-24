import type { NextApiResponse } from 'next';
import { getSupabase } from '@/lib/supabase';
import { withSupabaseAuth, AuthenticatedRequest } from '@/lib/supabase-middleware';

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const { method } = req;

  try {
    const supabase = getSupabase();

    if (method === 'GET') {
      const { page = '1', limit = '10', search = '' } = req.query;
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const offset = (pageNum - 1) * limitNum;

      let query = supabase
        .from('vendedores')
        .select('*', { count: 'exact' })
        .eq('ativo', true);

      if (search) {
        const searchStr = `%${search}%`;
        query = query.or(`nome.ilike.${searchStr},email.ilike.${searchStr},telefone.ilike.${searchStr}`);
      }

      const { data: vendedores, count, error } = await query
        .order('nome', { ascending: true })
        .range(offset, offset + limitNum - 1);

      if (error) throw error;

      // Buscar estatísticas de vendas para cada vendedor
      const vendedoresComVendas = await Promise.all(
        (vendedores || []).map(async (vendedor) => {
          const { data: vendas, error: vendasError } = await supabase
            .from('vendas')
            .select('id, valor_final, valor_total, status, numero_venda')
            .eq('vendedor_id', vendedor.id)
            .neq('status', 'cancelado');

          if (vendasError) {
            console.error('Erro ao buscar vendas do vendedor', vendedor.id, vendasError);
          }

          console.log(`\n=== Vendedor: ${vendedor.nome} (ID: ${vendedor.id}) ===`);
          console.log(`Total de vendas encontradas: ${vendas?.length || 0}`);
          
          if (vendas && vendas.length > 0) {
            vendas.forEach(v => {
              console.log(`  Venda #${v.numero_venda} (ID: ${v.id}):`);
              console.log(`    valor_total: ${v.valor_total}`);
              console.log(`    valor_final: ${v.valor_final}`);
              console.log(`    status: ${v.status}`);
            });
          }

          const totalVendas = vendas?.length || 0;
          const totalFaturamento = vendas?.reduce((sum, v) => {
            const valor = parseFloat(String(v.valor_final)) || 0;
            return sum + valor;
          }, 0) || 0;

          console.log(`RESULTADO: ${totalVendas} vendas, Faturamento Total: R$ ${totalFaturamento.toFixed(2)}\n`);

          return {
            ...vendedor,
            total_vendas: totalVendas,
            total_faturamento: totalFaturamento,
          };
        })
      );

      return res.status(200).json({
        success: true,
        data: vendedoresComVendas,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: count || 0,
          pages: Math.ceil((count || 0) / limitNum),
        },
      });
    }

    if (method === 'POST') {
      const { nome, email, telefone, comissao } = req.body;

      if (!nome) {
        return res.status(400).json({ success: false, message: 'Nome do vendedor é obrigatório' });
      }

      const { data, error } = await supabase
        .from('vendedores')
        .insert({
          nome,
          email: email || null,
          telefone: telefone || null,
          comissao: comissao || 0,
        })
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json({
        success: true,
        message: 'Vendedor criado com sucesso',
        data,
      });
    }

    if (method === 'PUT') {
      const { id, nome, email, telefone, comissao } = req.body;

      if (!id) {
        return res.status(400).json({ success: false, message: 'ID do vendedor é obrigatório' });
      }

      const { data, error } = await supabase
        .from('vendedores')
        .update({
          nome,
          email: email || null,
          telefone: telefone || null,
          comissao: comissao || 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        return res.status(404).json({ success: false, message: 'Vendedor não encontrado' });
      }

      return res.status(200).json({
        success: true,
        message: 'Vendedor atualizado com sucesso',
        data: data[0],
      });
    }

    if (method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ success: false, message: 'ID do vendedor é obrigatório' });
      }

      const { data, error } = await supabase
        .from('vendedores')
        .update({ ativo: false, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        return res.status(404).json({ success: false, message: 'Vendedor não encontrado' });
      }

      return res.status(200).json({
        success: true,
        message: 'Vendedor removido com sucesso',
      });
    }

    return res.status(405).json({ success: false, message: 'Método não permitido' });
  } catch (error) {
    console.error('Vendedores API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export default withSupabaseAuth(handler);
