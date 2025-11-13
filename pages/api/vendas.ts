import type { NextApiResponse } from 'next';
import { getSupabase } from '@/lib/supabase';
import { withSupabaseAuth, AuthenticatedRequest } from '@/lib/supabase-middleware';
import {
  applySaleStock,
  revertSaleStock,
  calculateStockDelta,
  applyStockDeltas,
  validateStockAvailability,
} from '@/lib/stock-manager';
import { processarVendaComImpostos } from '@/lib/venda-impostos-processor';

interface VendaItemInput {
  produto_id: number;
  quantidade: number;
  preco_unitario: number;
  subtotal?: number;

  // Campos de impostos ICMS-ST
  base_calculo_st?: number;
  icms_proprio?: number;
  icms_st_total?: number;
  icms_st_recolher?: number;
  mva_aplicado?: number;
  aliquota_icms?: number;
}

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
          forma_pagamento_detalhe:formas_pagamento(id, nome),
          itens:vendas_itens(
            id,
            produto_id,
            quantidade,
            preco_unitario,
            subtotal,
            subtotal_bruto,
            desconto_proporcional,
            subtotal_liquido,
            ipi_aliquota,
            ipi_valor,
            icms_aliquota,
            icms_valor,
            st_aliquota,
            st_valor,
            total_item,
            base_calculo_st,
            icms_proprio,
            icms_st_total,
            icms_st_recolher,
            mva_aplicado,
            aliquota_icms,
            produto:produtos(id, nome, preco_venda)
          )
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
      const { numero_venda, cliente_id, vendedor_id, estoque_id, forma_pagamento_id, data_venda, valor_total, valor_final, desconto, prazo_pagamento, imposto_percentual, status, observacoes, uf_destino, itens } = req.body;

      if (!numero_venda) {
        return res.status(400).json({ success: false, message: '❌ Número da venda é obrigatório' });
      }

      if (!estoque_id) {
        return res.status(400).json({ success: false, message: '❌ Estoque de origem é obrigatório' });
      }

      if (!itens || !Array.isArray(itens) || itens.length === 0) {
        return res.status(400).json({ success: false, message: '❌ A venda deve conter pelo menos um item' });
      }

      // 🔍 VALIDAR ESTOQUE DISPONÍVEL ANTES DE CRIAR A VENDA (com locking para prevenir race conditions)
      const validation = await validateStockAvailability(itens as VendaItemInput[], estoque_id);

      if (!validation.valid) {
        const insufficientMessages = validation.insufficientStock.map(
          (item) => `${item.produto_nome} (disponível: ${item.disponivel}, solicitado: ${item.solicitado})`
        );
        return res.status(400).json({
          success: false,
          message: '❌ Estoque insuficiente para os seguintes produtos:\n' + insufficientMessages.join('\n'),
          insufficient_stock: validation.insufficientStock,
        });
      }

      // 💰 PROCESSAR VENDA COM IMPOSTOS (IPI, ICMS, ST)
      const descontoValor = desconto || 0;
      const vendaProcessada = await processarVendaComImpostos(
        itens as VendaItemInput[],
        descontoValor
      );

      console.log('📊 Venda processada com impostos:', {
        total_produtos_bruto: vendaProcessada.totais.total_produtos_bruto,
        desconto_total: vendaProcessada.totais.desconto_total,
        total_produtos_liquido: vendaProcessada.totais.total_produtos_liquido,
        total_ipi: vendaProcessada.totais.total_ipi,
        total_icms: vendaProcessada.totais.total_icms, // Informativo
        total_st: vendaProcessada.totais.total_st,
        total_geral: vendaProcessada.totais.total_geral // Total a pagar (sem ICMS)
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
          // Campos antigos (manter compatibilidade)
          valor_total: vendaProcessada.totais.total_produtos_bruto, // Total sem desconto
          valor_final: vendaProcessada.totais.total_geral, // Total final (com IPI e ST, sem ICMS)
          desconto: descontoValor,
          prazo_pagamento: prazo_pagamento || null,
          imposto_percentual: imposto_percentual || 0,
          uf_destino: uf_destino || null,
          // Novos campos de impostos
          total_produtos_bruto: vendaProcessada.totais.total_produtos_bruto,
          desconto_total: vendaProcessada.totais.desconto_total,
          total_produtos_liquido: vendaProcessada.totais.total_produtos_liquido,
          total_ipi: vendaProcessada.totais.total_ipi,
          total_icms: vendaProcessada.totais.total_icms, // Informativo, NÃO no total
          total_st: vendaProcessada.totais.total_st,
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

      // ✅ INSERIR ITENS DA VENDA (com impostos calculados)
      const itensInsert = vendaProcessada.itens.map((item) => ({
        venda_id: venda.id,
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario,
        // Campos novos de impostos
        subtotal_bruto: item.subtotal_bruto,
        desconto_proporcional: item.desconto_proporcional,
        subtotal_liquido: item.subtotal_liquido,
        ipi_aliquota: item.ipi_aliquota,
        ipi_valor: item.ipi_valor,
        icms_aliquota: item.icms_aliquota,
        icms_valor: item.icms_valor, // Informativo
        st_aliquota: item.st_aliquota,
        st_valor: item.st_valor,
        total_item: item.total_item, // Total com IPI e ST (sem ICMS)
        // Campo antigo (manter compatibilidade)
        subtotal: item.total_item, // Usar total_item para compatibilidade
        // Campos de impostos ICMS-ST (deprecados, manter para compatibilidade)
        base_calculo_st: null,
        icms_proprio: null,
        icms_st_total: null,
        icms_st_recolher: null,
        mva_aplicado: null,
        aliquota_icms: item.icms_aliquota,
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

      // ✅ DAR BAIXA NO ESTOQUE (com transação e histórico automático)
      const stockResult = await applySaleStock(
        itens as VendaItemInput[],
        estoque_id,
        venda.id, // Sale ID for audit trail
        req.user?.id // User ID from authenticated request
      );

      if (!stockResult.success) {
        // Rollback: Delete sale and items if stock update fails
        await supabase.from('vendas_itens').delete().eq('venda_id', venda.id);
        await supabase.from('vendas').delete().eq('id', venda.id);

        console.error('❌ Erro ao dar baixa no estoque (após retry automático):', stockResult.errors);
        return res.status(500).json({
          success: false,
          message: '❌ Erro ao dar baixa no estoque após múltiplas tentativas:\n' + stockResult.errors.join('\n'),
          stock_details: stockResult.adjustments,
        });
      }

      const algumErroEstoque = stockResult.errors.length > 0;

      return res.status(201).json({
        success: true,
        message: algumErroEstoque
          ? '⚠️ Venda criada com sucesso, mas houve problemas ao atualizar o estoque de alguns produtos'
          : '✅ Venda realizada com sucesso! Estoque atualizado.',
        data: venda,
        estoque_info: stockResult.adjustments,
      });
    }

    if (method === 'PUT') {
      const { id, numero_venda, cliente_id, vendedor_id, estoque_id, forma_pagamento_id, data_venda, desconto, prazo_pagamento, imposto_percentual, uf_destino, status, observacoes, itens } = req.body;

      if (!id) {
        return res.status(400).json({ success: false, message: 'ID da venda é obrigatório' });
      }

      // 🔍 Buscar venda atual para comparar os itens (se estoque_id estiver sendo atualizado)
      let oldItems: Array<{ produto_id: number; quantidade: number }> = [];
      let oldEstoqueId: number | null = null;

      if (itens && Array.isArray(itens) && itens.length > 0 && estoque_id) {
        const { data: vendaAtual, error: vendaError } = await supabase
          .from('vendas')
          .select('estoque_id, itens:vendas_itens(produto_id, quantidade)')
          .eq('id', id)
          .single();

        if (vendaError) {
          console.error('Erro ao buscar venda atual:', vendaError);
          return res.status(404).json({ success: false, message: 'Venda não encontrada' });
        }

        if (vendaAtual) {
          oldEstoqueId = vendaAtual.estoque_id;
          oldItems = vendaAtual.itens || [];
        }
      }

      // Se vier com itens, recalcular os valores
      let valor_total_calculado = 0;
      let valor_final_calculado = 0;

      if (itens && Array.isArray(itens) && itens.length > 0) {
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
          uf_destino: uf_destino || null,
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

      // 🔄 AJUSTAR ESTOQUE se os itens foram atualizados
      if (itens && Array.isArray(itens) && itens.length > 0 && estoque_id && oldEstoqueId) {
        // Se o estoque mudou, reverter do antigo e aplicar no novo
        if (oldEstoqueId !== estoque_id) {
          if (process.env.NODE_ENV === 'development') {
            console.log(`📦 Mudança de estoque detectada: ${oldEstoqueId} → ${estoque_id}`);
          }
          
          // Reverter do estoque antigo
          const revertResult = await revertSaleStock(
            oldItems,
            oldEstoqueId,
            parseInt(id as string, 10),
            req.user?.id
          );
          if (!revertResult.success) {
            console.error('⚠️ Erro ao reverter estoque antigo (após retry):', revertResult.errors);
            return res.status(500).json({
              success: false,
              message: '❌ Erro ao reverter estoque do local antigo:\n' + revertResult.errors.join('\n'),
              data: data[0],
              stock_details: revertResult.adjustments,
            });
          }

          // Aplicar no estoque novo
          const applyResult = await applySaleStock(
            itens as VendaItemInput[],
            estoque_id,
            parseInt(id as string, 10),
            req.user?.id
          );
          if (!applyResult.success) {
            console.error('⚠️ Erro ao aplicar no novo estoque (após retry):', applyResult.errors);

            // Tentar desfazer o revert no estoque antigo para manter consistência
            const compensateResult = await applySaleStock(
              oldItems,
              oldEstoqueId,
              parseInt(id as string, 10),
              req.user?.id
            );
            if (!compensateResult.success) {
              console.error('⚠️ Falha crítica ao desfazer o revert no estoque antigo:', compensateResult.errors);
            } else {
              console.log('✅ Revertido o revert no estoque antigo com sucesso.');
            }

            return res.status(500).json({
              success: false,
              message:
                '❌ Venda atualizada, mas erro ao ajustar estoque:\n' +
                applyResult.errors.join('\n') +
                (compensateResult.success
                  ? '\n✔️ O estoque antigo foi restaurado ao estado original.'
                  : '\n❌ ATENÇÃO: Falha ao restaurar o estoque antigo:\n' + (compensateResult.errors?.join('\n') || 'Erro desconhecido')),
              data: data[0],
            });
          }
        } else {
          // Mesmo estoque, calcular delta
          const deltas = calculateStockDelta(oldItems, itens as VendaItemInput[]);

          if (deltas.length > 0) {
            if (process.env.NODE_ENV === 'development') {
              console.log('📊 Ajustes de estoque necessários:', deltas);
            }
            const deltaResult = await applyStockDeltas(
              deltas,
              estoque_id,
              parseInt(id as string, 10),
              req.user?.id
            );

            if (!deltaResult.success) {
              console.error('⚠️ Erro ao ajustar estoque (após retry):', deltaResult.errors);
              return res.status(500).json({
                success: false,
                message: '❌ Venda atualizada, mas erro ao ajustar estoque:\n' + deltaResult.errors.join('\n'),
                data: data[0],
                stock_details: deltaResult.adjustments,
              });
            }

            console.log('✅ Estoque ajustado com sucesso:', deltaResult.adjustments);
          }
        }

        // 🗑️ Atualizar itens da venda no banco
        // Deletar itens antigos
        await supabase.from('vendas_itens').delete().eq('venda_id', id);

        // Inserir novos itens
        const itensInsert = (itens as VendaItemInput[]).map((item) => ({
          venda_id: parseInt(id as string, 10),
          produto_id: item.produto_id,
          quantidade: item.quantidade,
          preco_unitario: item.preco_unitario,
          subtotal: item.quantidade * item.preco_unitario,
          // Campos de impostos ICMS-ST (opcionais)
          base_calculo_st: item.base_calculo_st || null,
          icms_proprio: item.icms_proprio || null,
          icms_st_total: item.icms_st_total || null,
          icms_st_recolher: item.icms_st_recolher || null,
          mva_aplicado: item.mva_aplicado || null,
          aliquota_icms: item.aliquota_icms || null,
        }));

        const { error: itensError } = await supabase.from('vendas_itens').insert(itensInsert);
        
        if (itensError) {
          console.error('Erro ao atualizar itens da venda:', itensError);
          return res.status(500).json({
            success: false,
            message: '❌ Venda atualizada, mas erro ao atualizar itens: ' + itensError.message,
            data: data[0],
          });
        }
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

      // 2️⃣ Reverter estoque - devolver os produtos ao estoque (com transação e histórico)
      if (venda.itens && Array.isArray(venda.itens) && venda.itens.length > 0 && venda.estoque_id) {
        const stockResult = await revertSaleStock(
          venda.itens,
          venda.estoque_id,
          parseInt(id as string, 10),
          req.user?.id
        );

        if (!stockResult.success) {
          console.error('❌ Erro ao reverter estoque (após retry):', stockResult.errors);
          return res.status(500).json({
            success: false,
            message: '❌ Erro ao reverter estoque após múltiplas tentativas:\n' + stockResult.errors.join('\n'),
            stock_details: stockResult.adjustments,
          });
        }

        console.log('✅ Estoque revertido com sucesso:', stockResult.adjustments);
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
