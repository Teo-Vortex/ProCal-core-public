import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { isMobilePushConfigured } from "../services/mobilePushService";
import { registerPushDevice, unregisterPushDevice } from "../services/pushDeviceService";
import { logger } from "../utils/logger";

export const pushRouter = Router();

const registerSchema = z.object({
  platform: z.literal("android"),
  installationId: z.string().trim().min(8).max(191),
  token: z.string().trim().min(16).max(512),
  appVersion: z.string().trim().max(64).optional(),
  deviceLabel: z.string().trim().max(191).optional(),
  notificationsEnabled: z.boolean().optional().default(true)
});

const unregisterSchema = z.object({
  installationId: z.string().trim().min(8).max(191).optional(),
  token: z.string().trim().min(16).max(512).optional()
}).refine((value) => Boolean((value.installationId || "").trim() || (value.token || "").trim()), {
  message: "installationId or token is required"
});

pushRouter.use(requireAuth);

pushRouter.get("/api/mobile/push/status", async (_req, res) => {
  res.json({
    ok: true,
    configured: isMobilePushConfigured()
  });
});

pushRouter.post("/api/mobile/push/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    logger.warn({
      userId: req.auth?.userId || "",
      error: parsed.error.flatten()
    }, "Rejected mobile push registration payload.");
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const device = await registerPushDevice({
    userId: req.auth!.userId,
    ...parsed.data
  });

  logger.info({
    userId: req.auth!.userId,
    platform: parsed.data.platform,
    notificationsEnabled: Boolean(parsed.data.notificationsEnabled),
    installationIdSuffix: String(parsed.data.installationId || "").slice(-8)
  }, "Registered mobile push device.");

  res.status(201).json({
    ok: true,
    configured: isMobilePushConfigured(),
    deviceId: device.id
  });
});

pushRouter.post("/api/mobile/push/unregister", async (req, res) => {
  const parsed = unregisterSchema.safeParse(req.body);
  if (!parsed.success) {
    logger.warn({
      userId: req.auth?.userId || "",
      error: parsed.error.flatten()
    }, "Rejected mobile push unregistration payload.");
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const removed = await unregisterPushDevice({
    userId: req.auth!.userId,
    installationId: parsed.data.installationId,
    token: parsed.data.token
  });

  logger.info({
    userId: req.auth!.userId,
    removed,
    installationIdSuffix: String(parsed.data.installationId || "").slice(-8)
  }, "Unregistered mobile push device.");

  res.json({
    ok: true,
    removed
  });
});
