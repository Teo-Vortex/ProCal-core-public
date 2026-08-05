import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth";
import {
  getMobilePushBootstrap,
  getMobilePushStatus,
  resetMobilePushRuntime,
  sendMobilePush,
  testMobilePushConfiguration
} from "../services/mobilePushService";
import {
  deleteMobilePushConfig,
  saveMobilePushConfig,
  updateMobilePushPayloadMode
} from "../services/mobilePushConfigService";
import { registerPushDevice, unregisterPushDevice } from "../services/pushDeviceService";
import { writeAudit } from "../services/auditService";
import { logger } from "../utils/logger";

export const pushRouter = Router();
export const publicPushRouter = Router();

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

const mobilePushConfigSchema = z.object({
  serviceAccount: z.record(z.unknown()),
  googleServices: z.record(z.unknown()),
  payloadMode: z.enum(["generic", "detailed"]).default("generic")
});

const mobilePushPayloadModeSchema = z.object({
  payloadMode: z.enum(["generic", "detailed"])
});

publicPushRouter.get("/api/mobile/push/bootstrap", (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const bootstrap = getMobilePushBootstrap();
  res.json({ ok: true, configured: bootstrap.configured, client: bootstrap.client });
});

pushRouter.use(requireAuth);

pushRouter.get("/api/mobile/push/status", async (_req, res) => {
  const status = getMobilePushStatus();
  res.json({
    ok: true,
    configured: status.configured,
    clientConfigured: status.clientConfigured,
    androidReady: status.androidReady,
    payloadMode: status.payloadMode,
    source: status.source,
    projectId: status.projectId,
    applicationId: status.applicationId,
    updatedAt: status.updatedAt,
    credentialEnv: status.credentialEnv,
    clientEnv: status.clientEnv,
    payloadModeEnv: status.payloadModeEnv
  });
});

pushRouter.get("/api/admin/mobile-push/config", requireRole(["system_admin"]), (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json({ ok: true, ...getMobilePushStatus() });
});

pushRouter.put("/api/admin/mobile-push/config", requireRole(["system_admin"]), async (req, res) => {
  const parsed = mobilePushConfigSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const saved = saveMobilePushConfig(parsed.data);
    await resetMobilePushRuntime();
    const test = testMobilePushConfiguration();
    await writeAudit(req.auth!.userId, "mobile_push.config.update", "mobilePushConfig", "firebase", {
      projectId: saved.client.projectId,
      applicationId: saved.client.applicationId,
      payloadMode: saved.payloadMode
    });
    res.json({ ok: true, test, ...getMobilePushStatus() });
  } catch (error) {
    logger.warn({ err: error, userId: req.auth!.userId }, "Rejected mobile push configuration.");
    res.status(400).json({ error: error instanceof Error ? error.message : "Invalid Firebase configuration" });
  }
});

pushRouter.patch("/api/admin/mobile-push/config", requireRole(["system_admin"]), async (req, res) => {
  const parsed = mobilePushPayloadModeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const saved = updateMobilePushPayloadMode(parsed.data.payloadMode);
    await writeAudit(req.auth!.userId, "mobile_push.payload_mode.update", "mobilePushConfig", "firebase", {
      payloadMode: saved.payloadMode
    });
    res.json({ ok: true, ...getMobilePushStatus() });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Could not update payload mode" });
  }
});

pushRouter.delete("/api/admin/mobile-push/config", requireRole(["system_admin"]), async (req, res) => {
  const removed = deleteMobilePushConfig();
  await resetMobilePushRuntime();
  await writeAudit(req.auth!.userId, "mobile_push.config.delete", "mobilePushConfig", "firebase", { removed });
  res.json({ ok: true, removed, ...getMobilePushStatus() });
});

pushRouter.post("/api/admin/mobile-push/test", requireRole(["system_admin"]), async (req, res) => {
  try {
    const configuration = testMobilePushConfiguration();
    const delivery = await sendMobilePush({
      userIds: [req.auth!.userId],
      title: "ProCal test notification",
      body: "Firebase mobile push is configured correctly.",
      url: "/?push=notifications",
      collapseKey: `mobile-push-test-${req.auth!.userId}`,
      data: { kind: "notification", notificationType: "mobile_push.test" }
    });
    await writeAudit(req.auth!.userId, "mobile_push.test", "mobilePushConfig", "firebase", {
      sent: delivery.sent,
      skipped: delivery.skipped
    });
    res.json({ ok: true, configuration, delivery });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Firebase test failed" });
  }
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
    configured: getMobilePushStatus().configured,
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
