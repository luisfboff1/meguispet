import type { NextApiResponse } from "next";
import {
    type AuthenticatedRequest,
    withSupabaseAuth,
} from "@/lib/supabase-middleware";
import { invalidateCacheAfterMutation } from "@/lib/cache-manager";
import {
    applySaleStock,
    applyStockDeltas,
    calculateStockDelta,
    revertSaleStock,
    validateStockAvailability,
} from "@/lib/stock-manager";
import { processarVendaComImpostos } from "@/lib/venda-impostos-processor";
import { fetchUserAccessProfile } from "@/lib/user-access";

interface VendaItemInput {
    produto_id: number;
    quantidade: number;
    preco_unitario: number;
    subtotal?: number;
    base_calculo_st?: number;
    icms_proprio?: number;
    icms_st_total?: number;
    icms_st_recolher?: number;
    mva_aplicado?: number;
    aliquota_icms?: number;
}

const buildEmptyPagination = (page: number, limit: number) => ({
    success: true,
    data: [],
    pagination: {
        page,
        limit,
        total: 0,
        pages: 0,
    },
});

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
    const { method } = req;
    const supabase = req.supabaseClient;

    try {
        if (method === "GET") {
            const accessProfile = await fetchUserAccessProfile(supabase, {
                id: req.user.id,
                email: req.user.email,
            });

            if (!accessProfile) {
                return res.status(403).json({
                    success: false,
                    message: "Usuário sem perfil configurado",
                });
            }

            const {
                page = "1",
                limit = "10",
                search = "",
                status = "",
                data_inicio = "",
                data_fim = "",
                vendedor_id = "",
                cliente_id = "",
            } = req.query;

            const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
            const limitNum = Math.min(
                100,
                Math.max(1, parseInt(limit as string, 10) || 10),
            );
            const offset = (pageNum - 1) * limitNum;

            const hasSearch = typeof search === "string" &&
                search.trim().length > 0;
            const hasStatus = typeof status === "string" &&
                status.trim().length > 0;
            const hasStart = typeof data_inicio === "string" &&
                data_inicio.trim().length > 0;
            const hasEnd = typeof data_fim === "string" &&
                data_fim.trim().length > 0;
            const hasCliente = typeof cliente_id === "string" &&
                cliente_id.trim().length > 0;

            const requestedVendorId =
                typeof vendedor_id === "string" && vendedor_id.trim().length > 0
                    ? parseInt(vendedor_id, 10)
                    : null;

            let effectiveVendorId = requestedVendorId;

            if (!accessProfile.canViewAllSales) {
                if (accessProfile.vendedorId) {
                    effectiveVendorId = accessProfile.vendedorId;
                } else {
                    return res.status(200).json(
                        buildEmptyPagination(pageNum, limitNum),
                    );
                }
            }

            if (
                requestedVendorId &&
                accessProfile.vendedorId &&
                requestedVendorId !== accessProfile.vendedorId &&
                !accessProfile.canViewAllSales
            ) {
                effectiveVendorId = accessProfile.vendedorId;
            }

            let query = supabase
                .from("vendas")
                .select(
                    `
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
            icms_proprio_aliquota,
            icms_proprio_valor,
            base_calculo_st,
            icms_st_aliquota,
            icms_st_valor,
            mva_aplicado,
            icms_proprio,
            icms_st_total,
            icms_st_recolher,
            aliquota_icms,
            produto:produtos(id, nome, preco_venda, ipi, icms, icms_proprio, st)
          )
        `,
                    { count: "exact" },
                );

            if (hasSearch) {
                const searchStr = `%${(search as string).trim()}%`;
                query = query.or(
                    `numero_venda.ilike.${searchStr},observacoes.ilike.${searchStr}`,
                );
            }

            if (hasStatus) {
                query = query.eq("status", (status as string).trim());
            }

            if (hasStart) {
                query = query.gte("data_venda", (data_inicio as string).trim());
            }

            if (hasEnd) {
                query = query.lte("data_venda", (data_fim as string).trim());
            }

            if (hasCliente) {
                query = query.eq("cliente_id", (cliente_id as string).trim());
            }

            if (effectiveVendorId) {
                query = query.eq("vendedor_id", effectiveVendorId);
            }

            const { data: vendas, count, error } = await query
                .order("data_venda", { ascending: false })
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

        if (method === "POST") {
            const {
                numero_venda,
                cliente_id,
                vendedor_id,
                estoque_id,
                forma_pagamento_id,
                condicao_pagamento_id,
                data_venda,
                valor_total,
                valor_final,
                desconto,
                data_pagamento,
                imposto_percentual,
                status,
                observacoes,
                uf_destino,
                itens,
                parcelas,
                sem_impostos,
            } = req.body;

            if (!numero_venda) {
                return res.status(400).json({
                    success: false,
                    message: "❌ Número da venda é obrigatório",
                });
            }

            if (!estoque_id) {
                return res.status(400).json({
                    success: false,
                    message: "❌ Estoque de origem é obrigatório",
                });
            }

            if (!itens || !Array.isArray(itens) || itens.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "❌ A venda deve conter pelo menos um item",
                });
            }

            const validation = await validateStockAvailability(
                itens as VendaItemInput[],
                estoque_id,
            );

            if (!validation.valid) {
                const insufficientMessages = validation.insufficientStock.map(
                    (item) =>
                        `${item.produto_nome} (disponível: ${item.disponivel}, solicitado: ${item.solicitado})`,
                );
                return res.status(400).json({
                    success: false,
                    message:
                        "❌ Estoque insuficiente para os seguintes produtos:\n" +
                        insufficientMessages.join("\n"),
                    insufficient_stock: validation.insufficientStock,
                });
            }

            const descontoValor = desconto || 0;
            const vendaProcessada = await processarVendaComImpostos(
                itens as VendaItemInput[],
                descontoValor,
                sem_impostos || false,
            );

            const { data: venda, error } = await supabase
                .from("vendas")
                .insert({
                    numero_venda,
                    cliente_id: cliente_id || null,
                    vendedor_id: vendedor_id || null,
                    estoque_id: estoque_id || null,
                    forma_pagamento_id: forma_pagamento_id || null,
                    condicao_pagamento_id: condicao_pagamento_id || null,
                    data_venda: data_venda || new Date().toISOString(),
                    valor_total: vendaProcessada.totais.total_produtos_bruto,
                    valor_final: vendaProcessada.totais.total_geral,
                    desconto: descontoValor,
                    prazo_pagamento: data_pagamento || null,
                    imposto_percentual: imposto_percentual || 0,
                    uf_destino: uf_destino || null,
                    sem_impostos: sem_impostos || false,
                    total_produtos_bruto:
                        vendaProcessada.totais.total_produtos_bruto,
                    desconto_total: vendaProcessada.totais.desconto_total,
                    total_produtos_liquido:
                        vendaProcessada.totais.total_produtos_liquido,
                    total_ipi: vendaProcessada.totais.total_ipi,
                    total_icms: vendaProcessada.totais.total_icms,
                    total_st: vendaProcessada.totais.total_st,
                    status: status || "pendente",
                    observacoes: observacoes || null,
                })
                .select()
                .single();

            if (error) {
                return res.status(500).json({
                    success: false,
                    message: "❌ Erro ao criar venda: " + error.message,
                });
            }

            const itensInsert = vendaProcessada.itens.map((item) => ({
                venda_id: venda.id,
                produto_id: item.produto_id,
                quantidade: item.quantidade,
                preco_unitario: item.preco_unitario,
                subtotal_bruto: item.subtotal_bruto,
                desconto_proporcional: item.desconto_proporcional,
                subtotal_liquido: item.subtotal_liquido,
                ipi_aliquota: item.ipi_aliquota,
                ipi_valor: item.ipi_valor,
                icms_aliquota: item.icms_aliquota,
                icms_valor: item.icms_valor,
                st_aliquota: item.st_aliquota,
                st_valor: item.st_valor,
                total_item: item.total_item,
                subtotal: item.total_item,
                icms_proprio_aliquota: item.icms_proprio_aliquota,
                icms_proprio_valor: item.icms_proprio_valor,
                base_calculo_st: item.base_calculo_st,
                icms_st_aliquota: item.icms_st_aliquota,
                icms_st_valor: item.icms_st_valor,
                mva_aplicado: item.mva_aplicado,
                icms_proprio: item.icms_proprio_valor,
                icms_st_total: item.icms_st_valor,
                icms_st_recolher: item.st_valor,
                aliquota_icms: (item.icms_st_aliquota || item.icms_aliquota) /
                    100,
            }));

            const { error: itensError } = await supabase.from("vendas_itens")
                .insert(itensInsert);

            if (itensError) {
                await supabase.from("vendas").delete().eq("id", venda.id);
                return res.status(500).json({
                    success: false,
                    message: "❌ Erro ao inserir itens da venda: " +
                        itensError.message,
                });
            }

            const stockResult = await applySaleStock(
                itens as VendaItemInput[],
                estoque_id,
                venda.id,
                req.user?.id,
            );

            if (!stockResult.success) {
                await supabase.from("vendas_itens").delete().eq(
                    "venda_id",
                    venda.id,
                );
                await supabase.from("vendas").delete().eq("id", venda.id);

                return res.status(500).json({
                    success: false,
                    message:
                        "❌ Erro ao dar baixa no estoque após múltiplas tentativas:\n" +
                        stockResult.errors.join("\n"),
                    stock_details: stockResult.adjustments,
                });
            }

            const algumErroEstoque = stockResult.errors.length > 0;

            if (parcelas && Array.isArray(parcelas) && parcelas.length > 0) {
                const totalParcelas = parcelas.reduce(
                    (sum: number, p: { valor_parcela: number }) =>
                        sum + Number(p.valor_parcela),
                    0,
                );
                const valorFinalVenda = Number(venda.valor_final);

                if (Math.abs(totalParcelas - valorFinalVenda) > 0.1) {
                    // Mantido para rastrear divergências; não bloqueia a operação
                }

                const { data: categoriaVendas } = await supabase
                    .from("categorias_financeiras")
                    .select("id")
                    .eq("nome", "Vendas")
                    .eq("tipo", "receita")
                    .eq("ativo", true)
                    .single();

                const categoria_id = categoriaVendas?.id || null;

                const parcelasToInsert = parcelas.map((
                    p: {
                        numero_parcela: number;
                        valor_parcela: number;
                        data_vencimento: string;
                        observacoes?: string;
                    },
                ) => ({
                    venda_id: venda.id,
                    numero_parcela: p.numero_parcela,
                    valor_parcela: p.valor_parcela,
                    data_vencimento: p.data_vencimento,
                    status: "pendente",
                    observacoes: p.observacoes || null,
                }));

                const { data: parcelasCreated, error: parcelasError } =
                    await supabase
                        .from("venda_parcelas")
                        .insert(parcelasToInsert)
                        .select();

                if (!parcelasError && parcelasCreated) {
                    const transacoesToInsert = parcelasCreated.map((
                        parcela: {
                            id: number;
                            numero_parcela: number;
                            valor_parcela: number;
                            data_vencimento: string;
                            observacoes?: string | null;
                        },
                    ) => ({
                        tipo: "receita",
                        valor: parcela.valor_parcela,
                        descricao:
                            `Receita Venda ${numero_venda} - Parcela ${parcela.numero_parcela}/${parcelas.length}`,
                        categoria: "Vendas",
                        categoria_id,
                        venda_id: venda.id,
                        venda_parcela_id: parcela.id,
                        data_transacao: parcela.data_vencimento,
                        observacoes: parcela.observacoes || null,
                    }));

                    await supabase.from("transacoes").insert(
                        transacoesToInsert,
                    );
                }
            } else {
                const { data: categoriaVendas } = await supabase
                    .from("categorias_financeiras")
                    .select("id")
                    .eq("nome", "Vendas")
                    .eq("tipo", "receita")
                    .eq("ativo", true)
                    .single();

                const categoria_id = categoriaVendas?.id || null;

                await supabase
                    .from("transacoes")
                    .insert({
                        tipo: "receita",
                        valor: venda.valor_final,
                        descricao: `Receita Venda ${numero_venda}`,
                        categoria: "Vendas",
                        categoria_id,
                        venda_id: venda.id,
                        data_transacao: data_pagamento || data_venda ||
                            new Date().toISOString(),
                        observacoes: observacoes || null,
                    });
            }

            invalidateCacheAfterMutation();

            return res.status(201).json({
                success: true,
                message: algumErroEstoque
                    ? "⚠️ Venda criada com sucesso, mas houve problemas ao atualizar o estoque de alguns produtos"
                    : "✅ Venda realizada com sucesso! Estoque atualizado.",
                data: venda,
                estoque_info: stockResult.adjustments,
            });
        }

        if (method === "PUT") {
            const {
                id,
                numero_venda,
                cliente_id,
                vendedor_id,
                estoque_id,
                forma_pagamento_id,
                condicao_pagamento_id,
                data_venda,
                desconto,
                data_pagamento,
                imposto_percentual,
                uf_destino,
                status,
                observacoes,
                itens,
                sem_impostos,
                parcelas,
            } = req.body;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: "ID da venda é obrigatório",
                });
            }

            let oldItems: Array<{ produto_id: number; quantidade: number }> =
                [];
            let oldEstoqueId: number | null = null;

            if (
                itens && Array.isArray(itens) && itens.length > 0 && estoque_id
            ) {
                const { data: vendaAtual, error: vendaError } = await supabase
                    .from("vendas")
                    .select(
                        "estoque_id, itens:vendas_itens(produto_id, quantidade)",
                    )
                    .eq("id", id)
                    .single();

                if (vendaError) {
                    return res.status(404).json({
                        success: false,
                        message: "Venda não encontrada",
                    });
                }

                if (vendaAtual) {
                    oldEstoqueId = vendaAtual.estoque_id;
                    oldItems = vendaAtual.itens || [];
                }
            }

            let vendaProcessada = null;
            let valor_total_calculado = 0;
            let valor_final_calculado = 0;

            if (itens && Array.isArray(itens) && itens.length > 0) {
                const descontoValor = desconto || 0;

                vendaProcessada = await processarVendaComImpostos(
                    itens as VendaItemInput[],
                    descontoValor,
                    sem_impostos || false,
                );

                valor_total_calculado =
                    vendaProcessada.totais.total_produtos_bruto;
                valor_final_calculado = vendaProcessada.totais.total_geral;
            }

            const { data, error } = await supabase
                .from("vendas")
                .update({
                    numero_venda,
                    cliente_id: cliente_id || null,
                    vendedor_id: vendedor_id || null,
                    estoque_id: estoque_id || null,
                    forma_pagamento_id: forma_pagamento_id || null,
                    condicao_pagamento_id: condicao_pagamento_id || null,
                    data_venda,
                    valor_total: valor_total_calculado,
                    valor_final: valor_final_calculado,
                    desconto: desconto || 0,
                    prazo_pagamento: data_pagamento || null,
                    imposto_percentual: imposto_percentual || 0,
                    uf_destino: uf_destino || null,
                    sem_impostos: sem_impostos || false,
                    total_produtos_bruto:
                        vendaProcessada?.totais.total_produtos_bruto ||
                        valor_total_calculado,
                    desconto_total: vendaProcessada?.totais.desconto_total ||
                        (desconto || 0),
                    total_produtos_liquido:
                        vendaProcessada?.totais.total_produtos_liquido ||
                        valor_final_calculado,
                    total_ipi: vendaProcessada?.totais.total_ipi || 0,
                    total_icms: vendaProcessada?.totais.total_icms || 0,
                    total_st: vendaProcessada?.totais.total_st || 0,
                    status,
                    observacoes: observacoes || null,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", id)
                .select();

            if (error) throw error;

            if (!data || data.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Venda não encontrada",
                });
            }

            if (
                itens && Array.isArray(itens) && itens.length > 0 &&
                estoque_id && oldEstoqueId
            ) {
                if (oldEstoqueId !== estoque_id) {
                    const revertResult = await revertSaleStock(
                        oldItems,
                        oldEstoqueId,
                        parseInt(id as string, 10),
                        req.user?.id,
                    );
                    if (!revertResult.success) {
                        return res.status(500).json({
                            success: false,
                            message:
                                "❌ Erro ao reverter estoque do local antigo:\n" +
                                revertResult.errors.join("\n"),
                            data: data[0],
                            stock_details: revertResult.adjustments,
                        });
                    }

                    const applyResult = await applySaleStock(
                        itens as VendaItemInput[],
                        estoque_id,
                        parseInt(id as string, 10),
                        req.user?.id,
                    );
                    if (!applyResult.success) {
                        const compensateResult = await applySaleStock(
                            oldItems,
                            oldEstoqueId,
                            parseInt(id as string, 10),
                            req.user?.id,
                        );

                        return res.status(500).json({
                            success: false,
                            message:
                                "❌ Venda atualizada, mas erro ao ajustar estoque:\n" +
                                applyResult.errors.join("\n") +
                                (compensateResult.success
                                    ? "\n✔️ O estoque antigo foi restaurado ao estado original."
                                    : "\n❌ ATENÇÃO: Falha ao restaurar o estoque antigo:\n" +
                                        (compensateResult.errors?.join("\n") ||
                                            "Erro desconhecido")),
                            data: data[0],
                        });
                    }
                } else {
                    const deltas = calculateStockDelta(
                        oldItems,
                        itens as VendaItemInput[],
                    );

                    if (deltas.length > 0) {
                        const deltaResult = await applyStockDeltas(
                            deltas,
                            estoque_id,
                            parseInt(id as string, 10),
                            req.user?.id,
                        );

                        if (!deltaResult.success) {
                            return res.status(500).json({
                                success: false,
                                message:
                                    "❌ Venda atualizada, mas erro ao ajustar estoque:\n" +
                                    deltaResult.errors.join("\n"),
                                data: data[0],
                                stock_details: deltaResult.adjustments,
                            });
                        }
                    }
                }
            }

            if (itens && Array.isArray(itens) && itens.length > 0) {
                await supabase.from("vendas_itens").delete().eq("venda_id", id);

                const itensInsert = vendaProcessada
                    ? vendaProcessada.itens.map((item) => ({
                        venda_id: parseInt(id as string, 10),
                        produto_id: item.produto_id,
                        quantidade: item.quantidade,
                        preco_unitario: item.preco_unitario,
                        subtotal_bruto: item.subtotal_bruto,
                        desconto_proporcional: item.desconto_proporcional,
                        subtotal_liquido: item.subtotal_liquido,
                        ipi_aliquota: item.ipi_aliquota,
                        ipi_valor: item.ipi_valor,
                        icms_aliquota: item.icms_aliquota,
                        icms_valor: item.icms_valor,
                        st_aliquota: item.st_aliquota,
                        st_valor: item.st_valor,
                        total_item: item.total_item,
                        subtotal: item.total_item,
                        icms_proprio_aliquota: item.icms_proprio_aliquota,
                        icms_proprio_valor: item.icms_proprio_valor,
                        base_calculo_st: item.base_calculo_st,
                        icms_st_aliquota: item.icms_st_aliquota,
                        icms_st_valor: item.icms_st_valor,
                        mva_aplicado: item.mva_aplicado,
                        icms_proprio: item.icms_proprio_valor,
                        icms_st_total: item.icms_st_valor,
                        icms_st_recolher: item.st_valor,
                        aliquota_icms:
                            (item.icms_st_aliquota || item.icms_aliquota) / 100,
                    }))
                    : (itens as VendaItemInput[]).map((item) => ({
                        venda_id: parseInt(id as string, 10),
                        produto_id: item.produto_id,
                        quantidade: item.quantidade,
                        preco_unitario: item.preco_unitario,
                        subtotal: item.quantidade * item.preco_unitario,
                        base_calculo_st: item.base_calculo_st || null,
                        icms_proprio: item.icms_proprio || null,
                        icms_st_total: item.icms_st_total || null,
                        icms_st_recolher: item.icms_st_recolher || null,
                        mva_aplicado: item.mva_aplicado || null,
                        aliquota_icms: item.aliquota_icms || null,
                    }));

                const { error: itensError } = await supabase.from(
                    "vendas_itens",
                ).insert(itensInsert);

                if (itensError) {
                    return res.status(500).json({
                        success: false,
                        message:
                            "❌ Venda atualizada, mas erro ao atualizar itens: " +
                            itensError.message,
                        data: data[0],
                    });
                }
            }

            // Delete existing financial transactions to prevent duplication
            const { error: deleteTransacoesError } = await supabase
                .from("transacoes")
                .delete()
                .eq("venda_id", id);

            if (deleteTransacoesError) {
                return res.status(500).json({
                    success: false,
                    message:
                        "❌ Erro ao deletar transações existentes: " +
                        deleteTransacoesError.message,
                    data: data[0],
                });
            }

            const { error: deleteParcelasError } = await supabase
                .from("venda_parcelas")
                .delete()
                .eq("venda_id", id);

            if (deleteParcelasError) {
                return res.status(500).json({
                    success: false,
                    message:
                        "❌ Erro ao deletar parcelas existentes: " +
                        deleteParcelasError.message,
                    data: data[0],
                });
            }

            // Helper function to get Vendas category with error handling
            const getVendasCategory = async () => {
                const { data: categoriaVendas, error } = await supabase
                    .from("categorias_financeiras")
                    .select("id")
                    .eq("nome", "Vendas")
                    .eq("tipo", "receita")
                    .eq("ativo", true)
                    .single();

                if (error) {
                    throw new Error(
                        `Erro ao buscar categoria Vendas: ${error.message}`,
                    );
                }

                return categoriaVendas?.id || null;
            };

            // Recreate financial transactions if parcelas are provided
            if (parcelas && Array.isArray(parcelas) && parcelas.length > 0) {
                let categoria_id: number | null = null;

                try {
                    categoria_id = await getVendasCategory();
                } catch (error) {
                    return res.status(500).json({
                        success: false,
                        message:
                            "❌ " +
                            (error instanceof Error
                                ? error.message
                                : "Erro ao buscar categoria financeira"),
                        data: data[0],
                    });
                }

                const parcelasToInsert = parcelas.map((
                    p: {
                        numero_parcela: number;
                        valor_parcela: number;
                        data_vencimento: string;
                        observacoes?: string;
                    },
                ) => ({
                    venda_id: parseInt(id as string, 10),
                    numero_parcela: p.numero_parcela,
                    valor_parcela: p.valor_parcela,
                    data_vencimento: p.data_vencimento,
                    status: "pendente",
                    observacoes: p.observacoes || null,
                }));

                const { data: parcelasCreated, error: parcelasError } =
                    await supabase
                        .from("venda_parcelas")
                        .insert(parcelasToInsert)
                        .select();

                if (parcelasError) {
                    return res.status(500).json({
                        success: false,
                        message:
                            "❌ Erro ao criar parcelas: " +
                            parcelasError.message,
                        data: data[0],
                    });
                }

                if (!parcelasCreated || parcelasCreated.length === 0) {
                    return res.status(500).json({
                        success: false,
                        message:
                            "❌ Erro inesperado: nenhuma parcela foi criada",
                        data: data[0],
                    });
                }

                const transacoesToInsert = parcelasCreated.map((
                        parcela: {
                            id: number;
                            numero_parcela: number;
                            valor_parcela: number;
                            data_vencimento: string;
                            observacoes?: string | null;
                        },
                    ) => ({
                        tipo: "receita",
                        valor: parcela.valor_parcela,
                        descricao:
                            `Receita Venda ${numero_venda} - Parcela ${parcela.numero_parcela}/${parcelas.length}`,
                        categoria: "Vendas",
                        categoria_id,
                        venda_id: parseInt(id as string, 10),
                        venda_parcela_id: parcela.id,
                        data_transacao: parcela.data_vencimento,
                        observacoes: parcela.observacoes || null,
                    }));

                const { error: transacoesError } = await supabase
                    .from("transacoes")
                    .insert(transacoesToInsert);

                if (transacoesError) {
                    return res.status(500).json({
                        success: false,
                        message:
                            "❌ Erro ao criar transações: " +
                            transacoesError.message,
                        data: data[0],
                    });
                }
            } else if (data && data[0]) {
                // No parcelas provided, create single transaction
                let categoria_id: number | null = null;

                try {
                    categoria_id = await getVendasCategory();
                } catch (error) {
                    return res.status(500).json({
                        success: false,
                        message:
                            "❌ " +
                            (error instanceof Error
                                ? error.message
                                : "Erro ao buscar categoria financeira"),
                        data: data[0],
                    });
                }

                // Use sale date as fallback, not current timestamp
                const transactionDate = data_pagamento || data_venda ||
                    data[0].data_venda || new Date().toISOString();

                const { error: transacaoError } = await supabase
                    .from("transacoes")
                    .insert({
                        tipo: "receita",
                        valor: data[0].valor_final,
                        descricao: `Receita Venda ${numero_venda}`,
                        categoria: "Vendas",
                        categoria_id,
                        venda_id: parseInt(id as string, 10),
                        data_transacao: transactionDate,
                        observacoes: observacoes || null,
                    });

                if (transacaoError) {
                    return res.status(500).json({
                        success: false,
                        message:
                            "❌ Erro ao criar transação: " +
                            transacaoError.message,
                        data: data[0],
                    });
                }
            }

            invalidateCacheAfterMutation();

            return res.status(200).json({
                success: true,
                message: "Venda atualizada com sucesso",
                data: data[0],
            });
        }

        if (method === "DELETE") {
            const { id } = req.query;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: "ID da venda é obrigatório",
                });
            }

            const { data: venda, error: vendaError } = await supabase
                .from("vendas")
                .select("*, itens:vendas_itens(produto_id, quantidade)")
                .eq("id", id)
                .single();

            if (vendaError || !venda) {
                return res.status(404).json({
                    success: false,
                    message: "Venda não encontrada",
                });
            }

            if (
                venda.itens && Array.isArray(venda.itens) &&
                venda.itens.length > 0 && venda.estoque_id
            ) {
                const stockResult = await revertSaleStock(
                    venda.itens,
                    venda.estoque_id,
                    parseInt(id as string, 10),
                    req.user?.id,
                );

                if (!stockResult.success) {
                    return res.status(500).json({
                        success: false,
                        message:
                            "❌ Erro ao reverter estoque após múltiplas tentativas:\n" +
                            stockResult.errors.join("\n"),
                        stock_details: stockResult.adjustments,
                    });
                }
            }

            await supabase.from("transacoes").delete().eq("venda_id", id);
            await supabase.from("venda_parcelas").delete().eq("venda_id", id);

            const { error: deleteItensError } = await supabase
                .from("vendas_itens")
                .delete()
                .eq("venda_id", id);

            if (deleteItensError) {
                return res.status(500).json({
                    success: false,
                    message: "Erro ao deletar itens da venda: " +
                        deleteItensError.message,
                });
            }

            const { error: deleteVendaError } = await supabase
                .from("vendas")
                .delete()
                .eq("id", id);

            if (deleteVendaError) {
                return res.status(500).json({
                    success: false,
                    message: "Erro ao deletar venda: " +
                        deleteVendaError.message,
                });
            }

            invalidateCacheAfterMutation();

            return res.status(200).json({
                success: true,
                message:
                    "Venda excluída com sucesso (estoque revertido e transações financeiras removidas)",
            });
        }

        return res.status(405).json({
            success: false,
            message: "Método não permitido",
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Erro interno do servidor",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};

export default withSupabaseAuth(handler);
