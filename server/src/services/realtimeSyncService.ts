import { Response } from "express";

type StreamMode = "personal" | "shared";

type StreamClient = {
  id: number;
  mode: StreamMode;
  userId: string;
  res: Response;
};

type LegacyStateChangePayload = {
  mode: StreamMode;
  userId?: string;
  version: number;
  updatedAt: string;
  actorUserId?: string;
};

type NotificationPayload = {
  id: string;
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  createdAt: string;
  unreadCount?: number;
};

type ChatMessageEventPayload = {
  type: "message";
  message: {
    id: string;
    scope: "global" | "direct";
    senderId: string;
    recipientUserId?: string | null;
    createdAt: string;
  };
  recipients: string[];
};

type ChatPresenceEventPayload = {
  type: "presence";
  onlineUserIds: string[];
};

const clients = new Map<number, StreamClient>();
let nextClientId = 1;
let heartbeatTimer: NodeJS.Timeout | null = null;

function ensureHeartbeat() {
  if (heartbeatTimer) return;
  heartbeatTimer = setInterval(() => {
    for (const client of clients.values()) {
      writeEvent(client.res, "ping", { ts: new Date().toISOString() });
    }
  }, 25000);
  heartbeatTimer.unref?.();
}

function maybeStopHeartbeat() {
  if (clients.size) return;
  if (!heartbeatTimer) return;
  clearInterval(heartbeatTimer);
  heartbeatTimer = null;
}

function writeEvent(res: Response, event: string, payload: unknown) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

export function registerSyncStreamClient(mode: StreamMode, userId: string, res: Response) {
  const id = nextClientId++;
  clients.set(id, { id, mode, userId, res });
  ensureHeartbeat();

  writeEvent(res, "connected", { mode, ts: new Date().toISOString() });

  return () => {
    clients.delete(id);
    maybeStopHeartbeat();
  };
}

export function publishLegacyStateChange(payload: LegacyStateChangePayload) {
  for (const client of clients.values()) {
    if (client.mode !== payload.mode) continue;
    if (payload.mode === "personal" && payload.userId && client.userId !== payload.userId) continue;
    writeEvent(client.res, "legacy_state_changed", payload);
  }
}

export function publishUserNotification(payload: NotificationPayload) {
  for (const client of clients.values()) {
    if (client.userId !== payload.userId) continue;
    writeEvent(client.res, "notification", payload);
  }
}

export function publishChatMessageEvent(payload: ChatMessageEventPayload) {
  const recipientSet = new Set((payload.recipients || []).map((x) => String(x || "")).filter(Boolean));
  if (!recipientSet.size) return;
  for (const client of clients.values()) {
    if (!recipientSet.has(client.userId)) continue;
    writeEvent(client.res, "chat_message", payload);
  }
}

export function publishChatPresenceSnapshot(payload: ChatPresenceEventPayload) {
  for (const client of clients.values()) {
    writeEvent(client.res, "chat_presence", payload);
  }
}
