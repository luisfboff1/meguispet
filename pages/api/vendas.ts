import type { NextApiResponse } from 'next';
import { getSupabase } from '@/lib/supabase';
import { withSupabaseAuth, AuthenticatedRequest } from '@/lib/supabase-middleware';

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const { method } = req;

  try {
    const supabase = getSupabase();

    if (method === 'GET') {
      const { page = '1', limit = '10', search = '', status = '', data_inicio = '', data_fim = '' } = req.query;
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const offset = (pageNum - 1) * limitNum;

      let query = supabase
        .from('vendas')
        .select(`
          *,
          cliente:clientes_fornecedores(nome, email),
          vendedor:vendedores(nome, email),
          estoque:estoques(id, nome),
          forma_pagamento_detalhe:formas_pagamento(id, nome)
        `, { count: 'exact' });

      if (search) {
        const searchStr = `%${search}%`;
        query = query.or(`numero_venda.ilike.${searchStr},observacoes.ilike.${searchStr}`);
      }

      if (status) {
        query = query.eq('status', status);
      }

      if (data_inicio) {
        query = query.gte('data_venda', data_inicio);
      }

      if (data_fim) {
        query = query.lte('data_venda', data_fim);
      }

      const { data: vendas, count, error } = await query
        .order('data_venda', { ascending: false })
        .range(offset, offset + limitNum - 1);

      if (error) throw error;

      return res.status(200).json({
        success: true,
        data: vendas || [],
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: count || 0,
          pages: Math.ceil((count || 0) / limitNum),
        },
      });
    }

    if (method === 'POST') {
      const { numero_venda, cliente_id, vendedor_id, estoque_id, forma_pagamento_id, data_venda, valor_total, valor_final, desconto, prazo_pagamento, imposto_percentual, status, observacoes, itens } = req.body;

      if (!numero_venda) {
        return res.status(400).json({ success: false, message: '❌ Número da venda é obrigatório' });
      }

      if (!estoque_id) {
        return res.status(400).json({ success: false, message: '❌ Estoque de origem é obrigatório' });
      }

      if (!itens || !Array.isArray(itens) || itens.length === 0) {
        return res.status(400).json({ success: false, message: '❌ A venda deve conter pelo menos um item' });
      }

      interface VendaItemInput {
        produto_id: number;
        quantidade: number;
        preco_unitario: number;
        subtotal: number;
      }

      // 🔍 VALIDAR ESTOQUE DISPONÍVEL ANTES DE CRIAR A VENDA
      const produtosComEstoqueInsuficiente: string[] = [];

      for (const item of itens as VendaItemInput[]) {
        const { data: produtoEstoque } = await supabase
          .from('produtos_estoques')
          .select('quantidade, produto:produtos(nome)')
          .eq('produto_id', item.produto_id)
          .eq('estoque_id', estoque_id)
          .single();

        if (!produtoEstoque) {
          const { data: produto } = await supabase
            .from('produtos')
            .select('nome')
            .eq('id', item.produto_id)
            .single();

          produtosComEstoqueInsuficiente.push(`${produto?.nome || 'Produto'} (estoque não configurado)`);
        } else if (produtoEstoque.quantidade < item.quantidade) {
          // Type assertion para lidar com a estrutura de produto do Supabase
          const produtoData = produtoEstoque.produto as { nome?: string } | null;
          const nomeProduto = produtoData?.nome || 'Produto';
          produtosComEstoqueInsuficiente.push(
            `${nomeProduto} (disponível: ${produtoEstoque.quantidade}, solicitado: ${item.quantidade})`
          );
        }
      }

      if (produtosComEstoqueInsuficiente.length > 0) {
        return res.status(400).json({
          success: false,
          message: '❌ Estoque insuficiente para os seguintes produtos:\n' + produtosComEstoqueInsuficiente.join('\n'),
        });
      }

      // 💰 CALCULAR VALORES DA VENDA
      const subtotalItens = (itens as VendaItemInput[]).reduce((sum, item) => {
        return sum + (item.quantidade * item.preco_unitario);
      }, 0);

      const descontoValor = desconto || 0;
      const valorSemDesconto = subtotalItens;
      const valorComDesconto = Math.max(0, subtotalItens - descontoValor);
      
      // Imposto é aplicado APÓS o desconto
      const impostoPercentual = imposto_percentual || 0;
      const valorImposto = (valorComDesconto * impostoPercentual) / 100;
      const valorFinalCalculado = valorComDesconto + valorImposto;

      console.log('📊 Cálculo da venda:', {
        subtotalItens,
        desconto: descontoValor,
        valorComDesconto,
        impostoPercentual,
        valorImposto,
        valorFinal: valorFinalCalculado
      });

      // ✅ CRIAR A VENDA
      const { data: venda, error } = await supabase
        .from('vendas')
        .insert({
          numero_venda,
          cliente_id: cliente_id || null,
          vendedor_id: vendedor_id || null,
          estoque_id: estoque_id || null,
          forma_pagamento_id: forma_pagamento_id || null,
          data_venda: data_venda || new Date().toISOString(),
          valor_total: valorSemDesconto, // Valor SEM desconto e SEM imposto (para comissão)
          valor_final: valorFinalCalculado, // Valor COM desconto e COM imposto (valor real da venda)
          desconto: descontoValor,
          prazo_pagamento: prazo_pagamento || null,
          imposto_percentual: impostoPercentual,
          status: status || 'pendente',
          observacoes: observacoes || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar venda:', error);
        return res.status(500).json({
          success: false,
          message: '❌ Erro ao criar venda: ' + error.message,
        });
      }

      // ✅ INSERIR ITENS DA VENDA
      const itensInsert = (itens as VendaItemInput[]).map((item) => ({
        venda_id: venda.id,
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario,
        subtotal: item.subtotal,
      }));

      const { error: itensError } = await supabase.from('vendas_itens').insert(itensInsert);

      if (itensError) {
        // Reverter venda se falhar ao inserir itens
        await supabase.from('vendas').delete().eq('id', venda.id);
        console.error('Erro ao inserir itens da venda:', itensError);
        return res.status(500).json({
          success: false,
          message: '❌ Erro ao inserir itens da venda: ' + itensError.message,
        });
      }

      // ✅ DAR BAIXA NO ESTOQUE
      const estoqueAtualizacoes = [];
      for (const item of itens as VendaItemInput[]) {
        const { data: produtoEstoque } = await supabase
          .from('produtos_estoques')
          .select('quantidade')
          .eq('produto_id', item.produto_id)
          .eq('estoque_id', estoque_id)
          .single();

        if (produtoEstoque) {
          const novaQuantidade = produtoEstoque.quantidade - item.quantidade;

          const { error: updateError } = await supabase
            .from('produtos_estoques')
            .update({ quantidade: novaQuantidade, updated_at: new Date().toISOString() })
            .eq('produto_id', item.produto_id)
            .eq('estoque_id', estoque_id);

          if (updateError) {
            console.error('Erro ao atualizar estoque:', updateError);
            estoqueAtualizacoes.push({ produto_id: item.produto_id, erro: updateError.message });
          } else {
            estoqueAtualizacoes.push({ produto_id: item.produto_id, sucesso: true });
          }
        }
      }

      const algumErroEstoque = estoqueAtualizacoes.some((a: { produto_id: number; sucesso?: boolean; erro?: string }) => a.erro);

      return res.status(201).json({
        success: true,
        message: algumErroEstoque
          ? '⚠️ Venda criada com sucesso, mas houve problemas ao atualizar o estoque de alguns produtos'
          : '✅ Venda realizada com sucesso! Estoque atualizado.',
        data: venda,
        estoque_info: algumErroEstoque ? estoqueAtualizacoes : undefined,
      });
    }

    if (method === 'PUT') {
      const { id, numero_venda, cliente_id, vendedor_id, estoque_id, forma_pagamento_id, data_venda, desconto, prazo_pagamento, imposto_percentual, status, observacoes, itens } = req.body;

      if (!id) {
        return res.status(400).json({ success: false, message: 'ID da venda é obrigatório' });
      }

      // Se vier com itens, recalcular os valores
      let valor_total_calculado = 0;
      let valor_final_calculado = 0;

      if (itens && Array.isArray(itens) && itens.length > 0) {
        interface VendaItemInput {
          produto_id: number;
          quantidade: number;
          preco_unitario: number;
        }

        const subtotalItens = (itens as VendaItemInput[]).reduce((sum, item) => {
          return sum + (item.quantidade * item.preco_unitario);
        }, 0);

        const descontoValor = desconto || 0;
        const valorComDesconto = Math.max(0, subtotalItens - descontoValor);
        const impostoPercentual = imposto_percentual || 0;
        const valorImposto = (valorComDesconto * impostoPercentual) / 100;

        valor_total_calculado = subtotalItens;
        valor_final_calculado = valorComDesconto + valorImposto;

        console.log('📊 Recálculo da venda (PUT):', {
          subtotalItens,
          desconto: descontoValor,
          valorComDesconto,
          impostoPercentual,
          valorImposto,
          valorFinal: valor_final_calculado
        });
      }

      const { data, error } = await supabase
        .from('vendas')
        .update({
          numero_venda,
          cliente_id: cliente_id || null,
          vendedor_id: vendedor_id || null,
          estoque_id: estoque_id || null,
          forma_pagamento_id: forma_pagamento_id || null,
          data_venda,
          valor_total: valor_total_calculado,
          valor_final: valor_final_calculado,
          desconto: desconto || 0,
          prazo_pagamento: prazo_pagamento || null,
          imposto_percentual: imposto_percentual || 0,
          status,
          observacoes: observacoes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        return res.status(404).json({ success: false, message: 'Venda não encontrada' });
      }

      return res.status(200).json({
        success: true,
        message: 'Venda atualizada com sucesso',
        data: data[0],
      });
    }

    if (method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ success: false, message: 'ID da venda é obrigatório' });
      }

      // 1️⃣ Buscar a venda e seus itens para reverter o estoque
      const { data: venda, error: vendaError } = await supabase
        .from('vendas')
        .select('*, itens:vendas_itens(produto_id, quantidade)')
        .eq('id', id)
        .single();

      if (vendaError) {
        console.error('Erro ao buscar venda:', vendaError);
        return res.status(404).json({ success: false, message: 'Venda não encontrada' });
      }

      if (!venda) {
        return res.status(404).json({ success: false, message: 'Venda não encontrada' });
      }

      // 2️⃣ Reverter estoque - devolver os produtos ao estoque
      if (venda.itens && Array.isArray(venda.itens) && venda.itens.length > 0 && venda.estoque_id) {
        for (const item of venda.itens) {
          const { data: produtoEstoque } = await supabase
            .from('produtos_estoques')
            .select('quantidade')
            .eq('produto_id', item.produto_id)
            .eq('estoque_id', venda.estoque_id)
            .single();

          if (produtoEstoque) {
            const novaQuantidade = produtoEstoque.quantidade + item.quantidade;

            await supabase
              .from('produtos_estoques')
              .update({ quantidade: novaQuantidade, updated_at: new Date().toISOString() })
              .eq('produto_id', item.produto_id)
              .eq('estoque_id', venda.estoque_id);
          }
        }
      }

      // 3️⃣ Deletar itens da venda
      const { error: deleteItensError } = await supabase
        .from('vendas_itens')
        .delete()
        .eq('venda_id', id);

      if (deleteItensError) {
        console.error('Erro ao deletar itens da venda:', deleteItensError);
        return res.status(500).json({ 
          success: false, 
          message: 'Erro ao deletar itens da venda: ' + deleteItensError.message 
        });
      }

      // 4️⃣ Deletar a venda
      const { error: deleteVendaError } = await supabase
        .from('vendas')
        .delete()
        .eq('id', id);

      if (deleteVendaError) {
        console.error('Erro ao deletar venda:', deleteVendaError);
        return res.status(500).json({ 
          success: false, 
          message: 'Erro ao deletar venda: ' + deleteVendaError.message 
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Venda excluída com sucesso e estoque foi revertido',
      });
    }

    return res.status(405).json({ success: false, message: 'Método não permitido' });
  } catch (error) {
    console.error('Vendas API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export default withSupabaseAuth(handler);
