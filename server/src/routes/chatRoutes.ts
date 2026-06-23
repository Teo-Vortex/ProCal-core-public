import { Router } from "express";
import { z } from "zod";
import { ChatMessageScope } from "@prisma/client";
import { requireAuth, requirePermission } from "../middleware/auth";
import { requireRealmFeature } from "../middleware/requireRealmFeature";
import { getPrisma } from "../db/prisma";
import { writeAudit } from "../services/auditService";
import { publishChatMessageEvent, publishChatPresenceSnapshot } from "../services/realtimeSyncService";
import { sendDirectChatPush } from "../services/mobilePushService";

export const chatRouter = Router();

const PRESENCE_TTL_MS = 35_000;
const presenceByUserId = new Map<string, number>();

function touchPresence(userId: string): void {
  const id = String(userId || "").trim();
  if (!id) return;
  presenceByUserId.set(id, Date.now());
}

function touchPresenceAndBroadcast(userId: string): void {
  touchPresence(userId);
  publishChatPresenceSnapshot({ type: "presence", onlineUserIds: getOnlineUserIds() });
}

function getOnlineUserIds(): string[] {
  const now = Date.now();
  const out: string[] = [];
  for (const [userId, ts] of presenceByUserId.entries()) {
    if (now - ts <= PRESENCE_TTL_MS) {
      out.push(userId);
      continue;
    }
    presenceByUserId.delete(userId);
  }
  return out;
}

function normId(v: unknown): string {
  return String(v || "").trim();
}

function threadKeyForGlobal(): string {
  return "global";
}

function threadKeyForDirect(a: string, b: string): string {
  const x = normId(a);
  const y = normId(b);
  return x < y ? `dm:${x}:${y}` : `dm:${y}:${x}`;
}

function messageThreadKey(msg: { scope: ChatMessageScope; senderId: string; recipientUserId: string | null }): string {
  if (msg.scope === "global") return threadKeyForGlobal();
  return threadKeyForDirect(msg.senderId, String(msg.recipientUserId || ""));
}

function serializeMessage(row: {
  id: string;
  scope: ChatMessageScope;
  senderId: string;
  recipientUserId: string | null;
  body: string;
  createdAt: Date;
}) {
  return {
    id: row.id,
    scope: row.scope,
    senderId: row.senderId,
    recipientUserId: row.recipientUserId || "",
    body: row.body,
    createdAt: row.createdAt.toISOString()
  };
}

const messagesQuerySchema = z.object({
  scope: z.enum(["global", "direct"]),
  peerUserId: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100)
});

const sendSchema = z.object({
  scope: z.enum(["global", "direct"]),
  peerUserId: z.string().min(1).optional(),
  body: z.string().trim().min(1).max(4000)
});

const readSchema = z.object({
  scope: z.enum(["global", "direct"]),
  peerUserId: z.string().min(1).optional()
});

chatRouter.use("/api/chat", requireAuth, requireRealmFeature("chat"), requirePermission("chat.read"));

chatRouter.get("/api/chat/presence", async (req, res) => {
  touchPresenceAndBroadcast(req.auth!.userId);
  res.json({ onlineUserIds: getOnlineUserIds() });
});

chatRouter.get("/api/chat/unread-count", async (req, res) => {
  touchPresence(req.auth!.userId);
  const prisma = getPrisma();
  const meId = req.auth!.userId;

  const [reads, rows] = await Promise.all([
    prisma.chatThreadRead.findMany({ where: { userId: meId } }),
    prisma.chatMessage.findMany({
      where: {
        OR: [
          { scope: "global" },
          { scope: "direct", senderId: meId },
          { scope: "direct", recipientUserId: meId }
        ]
      },
      orderBy: { createdAt: "desc" },
      take: 1000
    })
  ]);

  const readByThread = new Map(reads.map((r) => [r.threadKey, r.lastReadAt.getTime()]));
  let total = 0;
  for (const row of rows) {
    const threadKey = messageThreadKey(row);
    const senderId = normId(row.senderId);
    if (senderId === meId) continue;
    if (row.scope === "direct" && normId(row.recipientUserId) !== meId) continue;
    const lastReadTs = readByThread.get(threadKey) || 0;
    if (row.createdAt.getTime() > lastReadTs) total += 1;
  }
  res.json({ unreadCount: total });
});

chatRouter.get("/api/chat/threads", async (req, res) => {
  touchPresence(req.auth!.userId);
  const prisma = getPrisma();
  const meId = req.auth!.userId;
  const [reads, rows] = await Promise.all([
    prisma.chatThreadRead.findMany({ where: { userId: meId } }),
    prisma.chatMessage.findMany({
      where: {
        OR: [
          { scope: "global" },
          { scope: "direct", senderId: meId },
          { scope: "direct", recipientUserId: meId }
        ]
      },
      orderBy: { createdAt: "desc" },
      take: 1500
    })
  ]);
  const readByThread = new Map(reads.map((r) => [r.threadKey, r.lastReadAt.getTime()]));

  const byThread = new Map<string, {
    threadKey: string;
    scope: "global" | "direct";
    peerUserId: string;
    lastMessageAt: number;
    lastMessage: ReturnType<typeof serializeMessage> | null;
    unreadCount: number;
  }>();

  for (const row of rows) {
    const threadKey = messageThreadKey(row);
    const scope = row.scope === "global" ? "global" : "direct";
    const peerUserId = scope === "direct"
      ? (normId(row.senderId) === meId ? normId(row.recipientUserId) : normId(row.senderId))
      : "";
    const createdTs = row.createdAt.getTime();
    const senderId = normId(row.senderId);
    let bucket = byThread.get(threadKey);
    if (!bucket) {
      bucket = {
        threadKey,
        scope,
        peerUserId,
        lastMessageAt: createdTs,
        lastMessage: serializeMessage(row),
        unreadCount: 0
      };
      byThread.set(threadKey, bucket);
    }
    const isIncoming = scope === "global"
      ? senderId !== meId
      : (normId(row.recipientUserId) === meId && senderId !== meId);
    const lastReadTs = readByThread.get(threadKey) || 0;
    if (isIncoming && createdTs > lastReadTs) {
      bucket.unreadCount += 1;
    }
  }

  if (!byThread.has("global")) {
    byThread.set("global", {
      threadKey: "global",
      scope: "global",
      peerUserId: "",
      lastMessageAt: 0,
      lastMessage: null,
      unreadCount: 0
    });
  }

  const items = Array.from(byThread.values()).sort((a, b) => {
    if (a.scope === "global" && b.scope !== "global") return -1;
    if (b.scope === "global" && a.scope !== "global") return 1;
    return b.lastMessageAt - a.lastMessageAt;
  }).map((row) => ({
    threadKey: row.threadKey,
    scope: row.scope,
    peerUserId: row.peerUserId,
    unreadCount: row.unreadCount,
    lastMessageAt: row.lastMessageAt ? new Date(row.lastMessageAt).toISOString() : null,
    lastMessage: row.lastMessage
  }));

  res.json({ items, onlineUserIds: getOnlineUserIds() });
});

chatRouter.get("/api/chat/messages", async (req, res) => {
  touchPresence(req.auth!.userId);
  const parsed = messagesQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const prisma = getPrisma();
  const meId = req.auth!.userId;
  if (parsed.data.scope === "direct" && !normId(parsed.data.peerUserId)) {
    res.status(400).json({ error: "peerUserId is required for direct chat" });
    return;
  }

  const where = parsed.data.scope === "global"
    ? { scope: "global" as const }
    : {
        scope: "direct" as const,
        OR: [
          { senderId: meId, recipientUserId: normId(parsed.data.peerUserId) },
          { senderId: normId(parsed.data.peerUserId), recipientUserId: meId }
        ]
      };

  const rows = await prisma.chatMessage.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: parsed.data.limit
  });

  const messages = rows.reverse().map(serializeMessage);
  res.json({ items: messages });
});

chatRouter.post("/api/chat/read", async (req, res, next) => {
  touchPresence(req.auth!.userId);
  const parsed = readSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const meId = req.auth!.userId;
  const threadKey = parsed.data.scope === "global"
    ? threadKeyForGlobal()
    : threadKeyForDirect(meId, normId(parsed.data.peerUserId));
  if (parsed.data.scope === "direct" && !normId(parsed.data.peerUserId)) {
    res.status(400).json({ error: "peerUserId is required for direct chat" });
    return;
  }

  try {
    const prisma = getPrisma();
    const now = new Date();
    await prisma.chatThreadRead.upsert({
      where: { userId_threadKey: { userId: meId, threadKey } },
      create: { userId: meId, threadKey, lastReadAt: now },
      update: { lastReadAt: now }
    });
    publishChatPresenceSnapshot({ type: "presence", onlineUserIds: getOnlineUserIds() });
    res.json({ ok: true, threadKey, readAt: now.toISOString() });
  } catch (error) {
    next(error);
  }
});

chatRouter.post("/api/chat/messages", requirePermission("chat.write"), async (req, res) => {
  touchPresenceAndBroadcast(req.auth!.userId);
  const parsed = sendSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const prisma = getPrisma();
  const meId = req.auth!.userId;
  const scope = parsed.data.scope;
  const bodyText = parsed.data.body;
  let recipientUserId: string | null = null;

  if (scope === "direct") {
    recipientUserId = normId(parsed.data.peerUserId);
    if (!recipientUserId || recipientUserId === meId) {
      res.status(400).json({ error: "Invalid direct recipient" });
      return;
    }
    const target = await prisma.user.findUnique({
      where: { id: recipientUserId },
      select: { id: true, isDeleted: true, status: true }
    });
    if (!target || target.isDeleted || target.status !== "active") {
      res.status(404).json({ error: "Recipient not found" });
      return;
    }
  }

  const created = await prisma.chatMessage.create({
    data: {
      scope,
      senderId: meId,
      recipientUserId,
      body: bodyText
    }
  });

  const sender = await prisma.user.findUnique({
    where: { id: meId },
    select: { nickname: true, username: true, fullName: true }
  });

  const senderThreadKey = scope === "global" ? threadKeyForGlobal() : threadKeyForDirect(meId, recipientUserId || "");
  await prisma.chatThreadRead.upsert({
    where: { userId_threadKey: { userId: meId, threadKey: senderThreadKey } },
    create: { userId: meId, threadKey: senderThreadKey, lastReadAt: created.createdAt },
    update: { lastReadAt: created.createdAt }
  });

  await writeAudit(meId, "chat.message.create", "chatMessage", created.id, {
    scope: created.scope,
    recipientUserId: created.recipientUserId || null
  });

  publishChatMessageEvent({
    type: "message",
    message: {
      id: created.id,
      scope: created.scope === "global" ? "global" : "direct",
      senderId: created.senderId,
      recipientUserId: created.recipientUserId || null,
      createdAt: created.createdAt.toISOString()
    },
    recipients: scope === "global"
      ? [] // handled below
      : [meId, recipientUserId || ""]
  });

  if (scope === "global") {
    const users = await prisma.user.findMany({
      where: { isDeleted: false, status: "active" },
      select: { id: true }
    });
    publishChatMessageEvent({
      type: "message",
      message: {
        id: created.id,
        scope: "global",
        senderId: created.senderId,
        recipientUserId: null,
        createdAt: created.createdAt.toISOString()
      },
      recipients: users.map((u) => u.id)
    });
  }

  if (scope === "direct" && recipientUserId) {
    const senderLabel = String(
      (sender && (sender.fullName || sender.nickname || sender.username)) ||
      "ProCal"
    ).trim();
    void sendDirectChatPush({
      recipientUserId,
      senderUserId: meId,
      senderLabel,
      body: bodyText
    }).catch(() => {});
  }

  res.status(201).json({ ok: true, item: serializeMessage(created) });
});
