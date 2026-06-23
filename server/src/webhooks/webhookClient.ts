import { getPrisma } from "../db/prisma";
import { logger } from "../utils/logger";

export async function postWebhook(eventType: string, payload: unknown): Promise<void> {
  const prisma = getPrisma();
  const meta = await prisma.appMeta.findUnique({ where: { id: 1 } });
  const url = process.env.HA_WEBHOOK_URL || meta?.haWebhookUrl;
  if (!url) return;

  try {
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ eventType, occurredAt: new Date().toISOString(), payload })
    });
  } catch (err) {
    logger.warn({ err }, "Webhook POST failed");
  }
}

