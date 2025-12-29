import type { NextApiResponse } from 'next';
import { getSupabase } from '@/lib/supabase';
import { withSupabaseAuth, AuthenticatedRequest } from '@/lib/supabase-middleware';
import { SupabaseClient } from '@supabase/supabase-js';

// Função helper para atualizar estoque (entrada ou saída)
async function atualizarEstoque(
  supabase: SupabaseClient,
  itens: Array<{ produto_id: number; quantidade: number; preco_unitario?: number }>,
  tipo: 'entrada' | 'saida',
  estoqueId?: number | null
) {
  for (const item of itens) {
    // Se não foi especificado estoque_id, usar o estoque padrão do produto
    let estoque_id = estoqueId;

    if (!estoque_id) {
      // Buscar estoque padrão do produto
      const { data: produto } = await supabase
        .from('produtos')
        .select('estoque_id')
        .eq('id', item.produto_id)
        .single();

      estoque_id = produto?.estoque_id || 1; // Default para estoque 1 se não encontrar
    }

    // Calcular delta (positivo para entrada, negativo para saída)
    const delta = tipo === 'entrada' ? item.quantidade : -item.quantidade;

    // Atualizar ou inserir registro em produtos_estoques
    const { data: existing } = await supabase
      .from('produtos_estoques')
      .select('*')
      .eq('produto_id', item.produto_id)
      .eq('estoque_id', estoque_id)
      .single();

    if (existing) {
      // Atualizar quantidade existente
      await supabase
        .from('produtos_estoques')
        .update({ quantidade: existing.quantidade + delta })
        .eq('produto_id', item.produto_id)
        .eq('estoque_id', estoque_id);
    } else {
      // Criar novo registro
      await supabase
        .from('produtos_estoques')
        .insert({
          produto_id: item.produto_id,
          estoque_id,
          quantidade: Math.max(0, delta) // Não permitir negativo na criação
        });
    }

    // CALCULAR PREÇO MÉDIO PONDERADO para entradas
    if (tipo === 'entrada' && item.preco_unitario !== undefined && item.preco_unitario > 0) {
      // Buscar produto atual com estoque total e custo atual
      const { data: produto } = await supabase
        .from('produtos')
        .select(`
          id,
          preco_custo,
          estoques:produtos_estoques(quantidade)
        `)
        .eq('id', item.produto_id)
        .single();

      if (produto) {
        // Calcular estoque total ANTES da entrada
        const estoqueAnterior = (produto.estoques || []).reduce(
          (sum: number, e: any) => sum + (e.quantidade || 0),
          0
        ) - item.quantidade; // Subtrair a entrada que acabamos de adicionar

        const custoAtual = produto.preco_custo || 0;

        // Preço médio ponderado = (qtd_anterior × custo_anterior + qtd_nova × custo_novo) / (qtd_anterior + qtd_nova)
        let novoPrecoMedio: number;

        if (estoqueAnterior <= 0) {
          // Se não tinha estoque, usar o custo da entrada
          novoPrecoMedio = item.preco_unitario;
        } else {
          // Calcular média ponderada
          const valorAnterior = estoqueAnterior * custoAtual;
          const valorNovo = item.quantidade * item.preco_unitario;
          const quantidadeTotal = estoqueAnterior + item.quantidade;
          novoPrecoMedio = (valorAnterior + valorNovo) / quantidadeTotal;
        }

        // Atualizar preco_custo do produto
        await supabase
          .from('produtos')
          .update({ preco_custo: novoPrecoMedio })
          .eq('id', item.produto_id);
      }
    }
  }
}

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const { method } = req;
  // Use authenticated Supabase client for RLS
    const supabase = req.supabaseClient;

  try {
    if (method === 'GET') {
      const { id, page = '1', limit = '10', tipo = '', status = '' } = req.query;

      // Se ID foi fornecido, buscar movimentação específica
      if (id) {
        const { data, error } = await supabase
          .from('movimentacoes_estoque')
          .select('*, fornecedor:fornecedores(nome), itens:movimentacoes_itens(*, produto:produtos(nome, id))')
          .eq('id', id)
          .single();

        if (error) {
          return res.status(404).json({ success: false, message: 'Movimentação não encontrada' });
        }

        return res.status(200).json({
          success: true,
          data,
        });
      }

      // Lista paginada de movimentações
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const offset = (pageNum - 1) * limitNum;

      let query = supabase
        .from('movimentacoes_estoque')
        .select('*, fornecedor:fornecedores(nome), itens:movimentacoes_itens(*, produto:produtos(nome))', { count: 'exact' });

      if (tipo) query = query.eq('tipo', tipo);
      if (status) query = query.eq('status', status);

      const { data, count, error } = await query
        .order('data_movimentacao', { ascending: false })
        .range(offset, offset + limitNum - 1);

      if (error) throw error;

      return res.status(200).json({
        success: true,
        data: data || [],
        pagination: { page: pageNum, limit: limitNum, total: count || 0, pages: Math.ceil((count || 0) / limitNum) },
      });
    }

    if (method === 'POST') {
      const { tipo, fornecedor_id, numero_pedido, data_movimentacao, valor_total, condicao_pagamento, status, observacoes, itens } = req.body;

      const { data: movimentacao, error } = await supabase
        .from('movimentacoes_estoque')
        .insert({
          tipo,
          fornecedor_id: fornecedor_id || null,
          numero_pedido: numero_pedido || null,
          data_movimentacao: data_movimentacao || new Date().toISOString(),
          valor_total: valor_total || 0,
          condicao_pagamento: condicao_pagamento || 'avista',
          status: status || 'confirmado',
          observacoes: observacoes || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Inserir itens da movimentação
      if (itens && Array.isArray(itens) && itens.length > 0) {
        interface MovimentacaoItemInput {
          produto_id: number;
          quantidade: number;
          preco_unitario: number;
          subtotal?: number;
          valor_total?: number;
        }

        const itensInsert = itens.map((item: MovimentacaoItemInput) => ({
          movimentacao_id: movimentacao.id,
          produto_id: item.produto_id,
          quantidade: item.quantidade,
          preco_unitario: item.preco_unitario,
          // Aceitar subtotal ou valor_total (compatibilidade)
          subtotal: item.subtotal ?? item.valor_total ?? (item.quantidade * item.preco_unitario),
        }));

        const { error: itensError } = await supabase.from('movimentacoes_itens').insert(itensInsert);

        if (itensError) {
          // Se falhou ao inserir itens, deletar a movimentação criada
          await supabase.from('movimentacoes_estoque').delete().eq('id', movimentacao.id);
          throw new Error(`Erro ao inserir itens da movimentação: ${itensError.message}`);
        }

        // Atualizar estoque automaticamente (já que status é 'confirmado' por padrão)
        try {
          await atualizarEstoque(supabase, itens, tipo, movimentacao.estoque_id);
        } catch (estoqueError) {
          // Se falhou ao atualizar estoque, deletar movimentação e itens
          await supabase.from('movimentacoes_itens').delete().eq('movimentacao_id', movimentacao.id);
          await supabase.from('movimentacoes_estoque').delete().eq('id', movimentacao.id);
          throw new Error(`Erro ao atualizar estoque: ${estoqueError instanceof Error ? estoqueError.message : 'Erro desconhecido'}`);
        }
      } else {
        // Se não há itens, deletar a movimentação e retornar erro
        await supabase.from('movimentacoes_estoque').delete().eq('id', movimentacao.id);
        return res.status(400).json({
          success: false,
          message: 'Movimentação deve conter ao menos um item'
        });
      }

      return res.status(201).json({
        success: true,
        message: 'Movimentação criada com sucesso. Estoque atualizado.',
        data: movimentacao,
      });
    }

    if (method === 'PUT') {
      const { id, tipo, fornecedor_id, numero_pedido, data_movimentacao, valor_total, condicao_pagamento, status, observacoes, itens } = req.body;

      if (!id) {
        return res.status(400).json({ success: false, message: 'ID da movimentação é obrigatório' });
      }

      // Buscar movimentação atual para reverter estoque
      const { data: movimentacaoAtual, error: fetchError } = await supabase
        .from('movimentacoes_estoque')
        .select('*, itens:movimentacoes_itens(*)')
        .eq('id', id)
        .single();

      if (fetchError || !movimentacaoAtual) {
        return res.status(404).json({ success: false, message: 'Movimentação não encontrada' });
      }

      // Se há itens sendo atualizados, reverter estoque da movimentação antiga
      if (itens && itens.length > 0 && movimentacaoAtual.itens && movimentacaoAtual.itens.length > 0) {
        try {
          // Reverter estoque da movimentação antiga
          const tipoReversao = movimentacaoAtual.tipo === 'entrada' ? 'saida' : 'entrada';
          await atualizarEstoque(supabase, movimentacaoAtual.itens, tipoReversao, movimentacaoAtual.estoque_id);
        } catch (estoqueError) {
          throw new Error(`Erro ao reverter estoque antigo: ${estoqueError instanceof Error ? estoqueError.message : 'Erro desconhecido'}`);
        }
      }

      // Atualizar dados da movimentação
      const { data: movimentacaoAtualizada, error: updateError } = await supabase
        .from('movimentacoes_estoque')
        .update({
          tipo: tipo || movimentacaoAtual.tipo,
          fornecedor_id: fornecedor_id !== undefined ? fornecedor_id : movimentacaoAtual.fornecedor_id,
          numero_pedido: numero_pedido !== undefined ? numero_pedido : movimentacaoAtual.numero_pedido,
          data_movimentacao: data_movimentacao || movimentacaoAtual.data_movimentacao,
          valor_total: valor_total !== undefined ? valor_total : movimentacaoAtual.valor_total,
          condicao_pagamento: condicao_pagamento || movimentacaoAtual.condicao_pagamento,
          status: status || movimentacaoAtual.status,
          observacoes: observacoes !== undefined ? observacoes : movimentacaoAtual.observacoes,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Se há novos itens, atualizar
      if (itens && itens.length > 0) {
        // Deletar itens antigos
        await supabase.from('movimentacoes_itens').delete().eq('movimentacao_id', id);

        // Inserir novos itens
        interface MovimentacaoItemInput {
          produto_id: number;
          quantidade: number;
          preco_unitario: number;
          subtotal?: number;
          valor_total?: number;
        }

        const itensInsert = itens.map((item: MovimentacaoItemInput) => ({
          movimentacao_id: id,
          produto_id: item.produto_id,
          quantidade: item.quantidade,
          preco_unitario: item.preco_unitario,
          subtotal: item.subtotal ?? item.valor_total ?? (item.quantidade * item.preco_unitario),
        }));

        const { error: itensError } = await supabase.from('movimentacoes_itens').insert(itensInsert);

        if (itensError) {
          throw new Error(`Erro ao atualizar itens: ${itensError.message}`);
        }

        // Aplicar novo ajuste de estoque
        try {
          await atualizarEstoque(supabase, itens, tipo || movimentacaoAtual.tipo, movimentacaoAtualizada.estoque_id);
        } catch (estoqueError) {
          throw new Error(`Erro ao aplicar novo estoque: ${estoqueError instanceof Error ? estoqueError.message : 'Erro desconhecido'}`);
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Movimentação atualizada com sucesso. Estoque ajustado.',
        data: movimentacaoAtualizada,
      });
    }

    if (method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ success: false, message: 'ID da movimentação é obrigatório' });
      }

      // Buscar movimentação e seus itens antes de deletar para reverter estoque
      const { data: movimentacao, error: fetchError } = await supabase
        .from('movimentacoes_estoque')
        .select(`
          *,
          itens:movimentacoes_itens(*)
        `)
        .eq('id', id)
        .single();

      if (fetchError || !movimentacao) {
        return res.status(404).json({ success: false, message: 'Movimentação não encontrada' });
      }

      // Reverter estoque (inverter a operação)
      if (movimentacao.itens && movimentacao.itens.length > 0) {
        try {
          // Se era entrada, reverter removendo (fazendo saída)
          // Se era saída, reverter adicionando (fazendo entrada)
          const tipoReversao = movimentacao.tipo === 'entrada' ? 'saida' : 'entrada';
          await atualizarEstoque(supabase, movimentacao.itens, tipoReversao, movimentacao.estoque_id);
        } catch (estoqueError) {
          throw new Error(`Erro ao reverter estoque: ${estoqueError instanceof Error ? estoqueError.message : 'Erro desconhecido'}`);
        }
      }

      // Deletar itens da movimentação (cascade deveria fazer isso, mas garantindo)
      await supabase.from('movimentacoes_itens').delete().eq('movimentacao_id', id);

      // Deletar movimentação
      const { error: deleteError } = await supabase
        .from('movimentacoes_estoque')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      return res.status(200).json({
        success: true,
        message: 'Movimentação excluída com sucesso. Estoque revertido.',
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
