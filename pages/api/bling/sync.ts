import type { NextApiResponse } from "next";
import {
  withSupabaseAuth,
  AuthenticatedRequest,
} from "@/lib/supabase-middleware";
import {
  incrementalSyncVendas,
  incrementalSyncNfe,
  syncVendasByDateRange,
  syncNfeByDateRange,
} from "@/lib/bling/bling-sync";

/**
 * POST /api/bling/sync
 *
 * Manual sync trigger. Supports:
 * - Incremental sync (no dates) - syncs changes since last sync
 * - Historical import (with dates) - imports a date range
 *
 * Body: { tipo: 'vendas' | 'nfe' | 'all', dataInicial?: string, dataFinal?: string }
 */
const handler = async (
  req: AuthenticatedRequest,
  res: NextApiResponse,
): Promise<void> => {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, message: "Método não permitido" });
    return;
  }

  // Only admin and gerente can trigger sync
  if (!["admin", "gerente"].includes(req.user.tipo_usuario)) {
    res.status(403).json({
      success: false,
      message: "Apenas administradores e gerentes podem sincronizar.",
    });
    return;
  }

  const { tipo, dataInicial, dataFinal } = req.body as {
    tipo?: "vendas" | "nfe" | "all";
    dataInicial?: string;
    dataFinal?: string;
  };

  if (!tipo || !["vendas", "nfe", "all"].includes(tipo)) {
    res.status(400).json({
      success: false,
      message: "Campo 'tipo' obrigatório: 'vendas', 'nfe' ou 'all'",
    });
    return;
  }

  try {
    let vendas_synced = 0;
    let nfe_synced = 0;
    const allErrors: string[] = [];

    // Sync vendas
    if (tipo === "vendas" || tipo === "all") {
      if (dataInicial) {
        // Historical import with date range
        const result = await syncVendasByDateRange(
          "manual",
          dataInicial,
          dataFinal,
        );
        vendas_synced = result.synced;
        allErrors.push(...result.errors);
      } else {
        // Incremental sync
        const result = await incrementalSyncVendas();
        vendas_synced = result.synced;
        allErrors.push(...result.errors);
      }
    }

    // Sync NFe
    if (tipo === "nfe" || tipo === "all") {
      if (dataInicial) {
        const result = await syncNfeByDateRange("manual", dataInicial, dataFinal);
        nfe_synced = result.synced;
        allErrors.push(...result.errors);
      } else {
        const result = await incrementalSyncNfe();
        nfe_synced = result.synced;
        allErrors.push(...result.errors);
      }
    }

    res.status(200).json({
      success: true,
      data: {
        vendas_synced,
        nfe_synced,
        errors: allErrors,
      },
      message: `Sincronização concluída: ${vendas_synced} vendas, ${nfe_synced} NFe`,
    });
  } catch (err) {
    console.error("[Bling Sync] Error:", err);
    res.status(500).json({
      success: false,
      message: "Erro na sincronização",
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
};

export default withSupabaseAuth(handler);
