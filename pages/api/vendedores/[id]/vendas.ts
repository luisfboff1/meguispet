import type { NextApiResponse } from 'next';
import { getSupabase } from '@/lib/supabase';
import { withSupabaseAuth, AuthenticatedRequest } from '@/lib/supabase-middleware';

interface VendaDatabase {
  id: number;
  cliente_id: number | null;
  numero_venda?: string;
  data_venda: string;
  valor_final: number | string;
  status: string;
  forma_pagamento_id?: number | null;
}

interface ClienteDatabase {
  id: number;
  nome: string;
}

interface FormaPagamentoDatabase {
  id: number;
  nome: string;
}

interface VendedorVenda {
  id: number;
  numero_venda: string | undefined;
  cliente: {
    id: number;
    nome: string;
  } | null;
  data_venda: string;
  valor_final: number;
  status: string;
  forma_pagamento: string;
}

interface VendedorVendasResponse {
  vendas: VendedorVenda[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const { method, query } = req;
  const { id } = query;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ success: false, message: 'ID do vendedor inválido' });
  }

  const vendedorId = parseInt(id, 10);

  if (method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Método não permitido' });
  }

  try {
    // Use authenticated Supabase client for RLS
    const supabase = req.supabaseClient;

    // Parâmetros de paginação
    const page = parseInt((query.page as string) || '1', 10);
    const limit = parseInt((query.limit as string) || '10', 10);
    const offset = (page - 1) * limit;

    // Parâmetros de filtro
    const periodo = (query.periodo as string) || '30d';
    const statusFilter = query.status as string;
    const searchTerm = query.search as string;

    // Calcular datas do período
    let diasPeriodo = 30;
    if (periodo === '7d') diasPeriodo = 7;
    else if (periodo === '90d') diasPeriodo = 90;
    else if (periodo === '30d') diasPeriodo = 30;

    const dataFim = new Date();
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - diasPeriodo);

    // Montar query base
    let queryBuilder = supabase
      .from('vendas')
      .select(
        `
        id,
        numero_venda,
        data_venda,
        valor_final,
        status,
        cliente_id,
        forma_pagamento_id
      `,
        { count: 'exact' }
      )
      .eq('vendedor_id', vendedorId)
      .gte('data_venda', dataInicio.toISOString().split('T')[0])
      .lte('data_venda', dataFim.toISOString().split('T')[0]);

    // Aplicar filtro de status
    if (statusFilter && statusFilter !== '') {
      queryBuilder = queryBuilder.eq('status', statusFilter);
    }

    // Aplicar busca por número da venda
    if (searchTerm && searchTerm !== '') {
      queryBuilder = queryBuilder.ilike('numero_venda', `%${searchTerm}%`);
    }

    // Ordenar e paginar
    queryBuilder = queryBuilder
      .order('data_venda', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: vendas, error, count } = await queryBuilder;

    if (error) throw error;

    // Buscar dados relacionados (clientes e formas de pagamento) separadamente
    const clienteIds = Array.from(new Set((vendas || []).map((v: VendaDatabase) => v.cliente_id).filter(Boolean)));
    const formaPagamentoIds = Array.from(new Set((vendas || []).map((v: VendaDatabase) => v.forma_pagamento_id).filter(Boolean)));

    // Buscar clientes
    const clientesMap: Record<number, { id: number; nome: string }> = {};
    if (clienteIds.length > 0) {
      const { data: clientes } = await supabase
        .from('clientes')
        .select('id, nome')
        .in('id', clienteIds);

      (clientes || []).forEach((c: ClienteDatabase) => {
        clientesMap[c.id] = { id: c.id, nome: c.nome };
      });
    }

    // Buscar formas de pagamento
    const formasPagamentoMap: Record<number, string> = {};
    if (formaPagamentoIds.length > 0) {
      const { data: formasPagamento } = await supabase
        .from('formas_pagamento')
        .select('id, nome')
        .in('id', formaPagamentoIds);

      (formasPagamento || []).forEach((fp: FormaPagamentoDatabase) => {
        formasPagamentoMap[fp.id] = fp.nome;
      });
    }

    // Formatar dados
    const vendasFormatadas: VendedorVenda[] = (vendas || []).map((venda: VendaDatabase) => ({
      id: venda.id,
      numero_venda: venda.numero_venda,
      cliente: venda.cliente_id && clientesMap[venda.cliente_id]
        ? clientesMap[venda.cliente_id]
        : null,
      data_venda: venda.data_venda,
      valor_final: parseFloat(venda.valor_final.toString()),
      status: venda.status,
      forma_pagamento: venda.forma_pagamento_id && formasPagamentoMap[venda.forma_pagamento_id]
        ? formasPagamentoMap[venda.forma_pagamento_id]
        : 'Não informado',
    }));

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    const response: VendedorVendasResponse = {
      vendas: vendasFormatadas,
      total,
      page,
      limit,
      totalPages,
    };

    return res.status(200).json({
      success: true,
      data: response,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar vendas do vendedor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export default withSupabaseAuth(handler);
