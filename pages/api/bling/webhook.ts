import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import { getPedidoVenda, getNfe } from "@/lib/bling/bling-client";
import { syncPedidoVenda, syncNfe, logSync } from "@/lib/bling/bling-sync";

/**
 * POST /api/bling/webhook
 *
 * Receives Bling webhook events. Public endpoint (no auth).
 * Validates HMAC-SHA256 signature, responds 200 immediately, processes async.
 *
 * Bling webhooks only send event type + ID.
 * Full data must be fetched via GET endpoint.
 */

// Disable body parser to read raw body for HMAC validation
export const config = {
  api: { bodyParser: false },
};

function getRawBody(req: NextApiRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function validateSignature(payload: string, signature: string): boolean {
  const clientSecret = process.env.BLING_CLIENT_SECRET;
  if (!clientSecret) return false;

  const hmac = crypto.createHmac("sha256", clientSecret);
  hmac.update(payload, "utf8");
  const expected = `sha256=${hmac.digest("hex")}`;

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signature),
    );
  } catch {
    return false;
  }
}

async function processWebhookEvent(
  event: string,
  data: Record<string, unknown>,
): Promise<void> {
  const resourceId = data.id as number;
  if (!resourceId) {
    console.warn("[Bling Webhook] Event without ID:", event);
    return;
  }

  const [resource, action] = event.split(".");

  try {
    if (resource === "pedido_venda" || resource === "pedidos_vendas") {
      const detail = await getPedidoVenda(resourceId);
      await syncPedidoVenda(detail.data);
      await logSync({
        tipo: "webhook",
        recurso: "pedido_venda",
        bling_id: resourceId,
        acao: action,
        status: "success",
      });
    } else if (resource === "nfe" || resource === "nota_fiscal") {
      const detail = await getNfe(resourceId);
      await syncNfe(detail.data);
      await logSync({
        tipo: "webhook",
        recurso: "nfe",
        bling_id: resourceId,
        acao: action,
        status: "success",
      });
    } else {
      // Log unhandled events for future reference
      await logSync({
        tipo: "webhook",
        recurso: resource,
        bling_id: resourceId,
        acao: action,
        status: "success",
        payload: { event, data, note: "unhandled_event_type" },
      });
    }
  } catch (err) {
    await logSync({
      tipo: "webhook",
      recurso: resource,
      bling_id: resourceId,
      acao: action,
      status: "error",
      erro_mensagem: err instanceof Error ? err.message : "Unknown error",
    });
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const rawBody = await getRawBody(req);
    const signature = req.headers["x-bling-signature-256"] as string;

    // Validate HMAC signature
    if (!signature || !validateSignature(rawBody, signature)) {
      console.warn("[Bling Webhook] Invalid or missing signature");
      await logSync({
        tipo: "webhook",
        recurso: "unknown",
        acao: "received",
        status: "error",
        erro_mensagem: "Invalid HMAC signature",
      });
      res.status(401).json({ error: "Invalid signature" });
      return;
    }

    // Respond 200 immediately (Bling requires response within 5s)
    res.status(200).json({ success: true });

    // Parse and process webhook async
    const webhook = JSON.parse(rawBody);
    const { event, data } = webhook;

    console.log(`[Bling Webhook] Received: ${event}`);

    // Fire and forget - don't await
    processWebhookEvent(event, data).catch((err) => {
      console.error("[Bling Webhook] Processing error:", err);
    });
  } catch (err) {
    console.error("[Bling Webhook] Handler error:", err);
    // Still try to respond 200 to prevent Bling from retrying
    if (!res.headersSent) {
      res.status(200).json({ success: true });
    }
  }
}
