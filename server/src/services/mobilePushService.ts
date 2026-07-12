import admin from "firebase-admin";
import { logger } from "../utils/logger";
import { listEnabledPushDevicesForUsers, removePushDevicesByIds } from "./pushDeviceService";

type PushMessageInput = {
  userIds: string[];
  title: string;
  body?: string | null;
  url?: string | null;
  data?: Record<string, unknown> | null;
  collapseKey?: string | null;
};

let firebaseApp: admin.app.App | null | undefined;
let initLogged = false;

function readServiceAccountJson(): admin.ServiceAccount | null {
  const rawBase64 = String(
    process.env.FCM_SERVICE_ACCOUNT_JSON_BASE64 ||
    process.env.PROCAL_FCM_SERVICE_ACCOUNT_JSON_BASE64 ||
    ""
  ).trim();
  const rawJson = String(
    process.env.FCM_SERVICE_ACCOUNT_JSON ||
    process.env.PROCAL_FCM_SERVICE_ACCOUNT_JSON ||
    ""
  ).trim();

  try {
    if (rawBase64) {
      return JSON.parse(Buffer.from(rawBase64, "base64").toString("utf8")) as admin.ServiceAccount;
    }
    if (rawJson) {
      return JSON.parse(rawJson) as admin.ServiceAccount;
    }
  } catch (error) {
    if (!initLogged) {
      logger.warn({ err: error }, "Invalid Firebase service account JSON for mobile push.");
      initLogged = true;
    }
  }
  return null;
}

export function isMobilePushConfigured(): boolean {
  return Boolean(readServiceAccountJson());
}

export function getMobilePushStatus() {
  const payloadMode = String(process.env.PROCAL_PUSH_PAYLOAD_MODE || "generic").trim().toLowerCase() || "generic";
  return {
    configured: isMobilePushConfigured(),
    payloadMode,
    credentialEnv: "PROCAL_FCM_SERVICE_ACCOUNT_JSON_BASE64",
    payloadModeEnv: "PROCAL_PUSH_PAYLOAD_MODE"
  };
}

function getFirebaseApp(): admin.app.App | null {
  if (firebaseApp === null) return null;
  if (firebaseApp) return firebaseApp;

  const serviceAccount = readServiceAccountJson();
  if (!serviceAccount) {
    if (!initLogged) {
      logger.info("Mobile push is not configured. Missing Firebase service account credentials.");
      initLogged = true;
    }
    firebaseApp = null;
    return null;
  }

  try {
    firebaseApp = admin.apps.length
      ? admin.app()
      : admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
    return firebaseApp;
  } catch (error) {
    logger.error({ err: error }, "Failed to initialize Firebase Admin for mobile push.");
    firebaseApp = null;
    return null;
  }
}

function getMessaging(): admin.messaging.Messaging | null {
  const app = getFirebaseApp();
  return app ? admin.messaging(app) : null;
}

function buildRealmUrl(relativePath: string): string {
  const nextPath = String(relativePath || "/").trim() || "/";
  return nextPath.startsWith("/") ? nextPath : `/${nextPath}`;
}

function normalizeDataMap(input: Record<string, unknown> | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!input || typeof input !== "object") return out;
  Object.entries(input).forEach(([key, value]) => {
    if (!key) return;
    out[key] = value == null ? "" : String(value);
  });
  return out;
}

function isDetailedPushPayloadEnabled(): boolean {
  const mode = String(process.env.PROCAL_PUSH_PAYLOAD_MODE || "generic").trim().toLowerCase();
  return mode === "full" || mode === "detailed" || mode === "content";
}

function genericPushBody(data: Record<string, string>): string {
  if (data.kind === "chat") return "You have a new chat message.";
  return "You have a new notification.";
}

function chunkItems<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    out.push(items.slice(index, index + size));
  }
  return out;
}

export async function sendMobilePush(input: PushMessageInput): Promise<{ sent: number; skipped: boolean }> {
  const messaging = getMessaging();
  const userIds = Array.from(new Set((input.userIds || []).map((item) => String(item || "").trim()).filter(Boolean)));
  if (!messaging || !userIds.length) {
    return { sent: 0, skipped: true };
  }

  const devices = await listEnabledPushDevicesForUsers(userIds);
  if (!devices.length) {
    logger.info({
      userCount: userIds.length,
      kind: String(input.data?.kind || "notification").slice(0, 80)
    }, "Skipped mobile push because no registered devices were found.");
    return { sent: 0, skipped: true };
  }

  const url = buildRealmUrl(input.url || "/");
  const rawTitle = String(input.title || "").trim().slice(0, 191);
  const rawBody = String(input.body || "").trim().slice(0, 1000);
  const payloadData = normalizeDataMap(input.data);
  payloadData.url = url;
  const detailedPayload = isDetailedPushPayloadEnabled();
  const title = detailedPayload ? rawTitle : "ProCal";
  const body = detailedPayload ? rawBody : genericPushBody(payloadData);
  if (detailedPayload) {
    payloadData.title = rawTitle;
    payloadData.body = rawBody;
  } else {
    payloadData.privacyMode = "generic";
  }
  const collapseKey = input.collapseKey ? String(input.collapseKey).trim().slice(0, 64) : undefined;

  let sent = 0;
  const staleIds: string[] = [];
  const messageEntries = devices.map((device) => ({
    deviceId: device.id,
    token: device.token,
    message: {
      token: device.token,
      notification: {
        title,
        body
      },
      data: payloadData,
      android: {
        priority: "high" as const,
        collapseKey,
        notification: {
          channelId: "procal_updates",
          sound: "default",
          tag: collapseKey
        }
      }
    }
  }));

  for (const batch of chunkItems(messageEntries, 500)) {
    try {
      const response = await messaging.sendEach(batch.map((item) => item.message));
      response.responses.forEach((item, index) => {
        if (item.success) {
          sent += 1;
          return;
        }
        const code = String(item.error?.code || "");
        if (
          code === "messaging/registration-token-not-registered" ||
          code === "messaging/invalid-registration-token" ||
          code === "messaging/invalid-argument"
        ) {
          staleIds.push(batch[index].deviceId);
        }
      });
    } catch (error) {
      logger.error({ err: error }, "Failed to send mobile push batch.");
    }
  }

  if (staleIds.length) {
    await removePushDevicesByIds(staleIds);
  }

  logger.info({
    userCount: userIds.length,
    deviceCount: devices.length,
    sent,
    staleCount: staleIds.length,
    kind: String(payloadData.kind || "notification").slice(0, 80),
    detailedPayload
  }, "Processed mobile push batch.");

  return { sent, skipped: false };
}

export async function sendNotificationPush(userId: string, input: {
  title: string;
  body?: string | null;
  type?: string | null;
  entityType?: string | null;
  entityId?: string | null;
}): Promise<void> {
  const targetUserId = String(userId || "").trim();
  if (!targetUserId) return;
  await sendMobilePush({
    userIds: [targetUserId],
    title: input.title,
    body: input.body || "",
    url: "/?push=notifications",
    collapseKey: `notification-${targetUserId}`,
    data: {
      kind: "notification",
      notificationType: input.type || "",
      entityType: input.entityType || "",
      entityId: input.entityId || ""
    }
  });
}

export async function sendDirectChatPush(input: {
  recipientUserId: string;
  senderUserId: string;
  senderLabel: string;
  body: string;
}): Promise<void> {
  const recipientUserId = String(input.recipientUserId || "").trim();
  const senderUserId = String(input.senderUserId || "").trim();
  if (!recipientUserId || !senderUserId || recipientUserId === senderUserId) return;

  await sendMobilePush({
    userIds: [recipientUserId],
    title: input.senderLabel ? `New message from ${input.senderLabel}` : "New chat message",
    body: String(input.body || "").trim().slice(0, 300),
    url: `/?push=chat&scope=direct&peerUserId=${encodeURIComponent(senderUserId)}`,
    collapseKey: `chat-${recipientUserId}-${senderUserId}`,
    data: {
      kind: "chat",
      scope: "direct",
      peerUserId: senderUserId,
      senderUserId
    }
  });
}
