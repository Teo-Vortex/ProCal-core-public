import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { requireRealmFeature } from "../middleware/requireRealmFeature";
import { getPrisma } from "../db/prisma";
import { createNotifications, SELF_NOTIFY_PREF_TYPE } from "../services/notificationService";
import { hasPermission } from "../services/permissionService";
import { writeAudit } from "../services/auditService";

export const notificationRouter = Router();
const ADMIN_NOTIFICATION_TYPES = [
  "announcement",
  "admin.important",
  "admin.user_registration_pending",
  "admin.bug_reported",
  "leave.pending",
  "leave.approved",
  "leave.deleted",
  "event.created",
  "event.updated",
  "event.deleted",
  "event.participant_added",
  "event.participant_removed",
  "task.created",
  "task.updated",
  "task.deleted",
  "task.assigned",
  "task.unassigned",
  "task.personal_collab_invite",
  "task.personal_collab_accepted",
  "task.personal_collab_declined",
  "task.personal_collab_member_added",
  "task.personal_collab_member_removed",
  "task.personal_collab_member_left",
  "comp.entry.created",
  "note.received",
  "note.shared_with_you",
  "note.unshared_from_you",
  "note.share_permission_changed"
] as const;

function canManageNotifications(permissions: Set<string>): boolean {
  return hasPermission(permissions, "users.update") || hasPermission(permissions, "*");
}

function normalizeNotificationType(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

notificationRouter.use(requireAuth);

notificationRouter.get("/api/notifications", async (req, res) => {
  const limitRaw = Number(req.query.limit || 30);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.trunc(limitRaw), 1), 100) : 30;
  const unreadOnly = String(req.query.unread || "") === "1";
  const cursor = String(req.query.cursor || "").trim();
  const where = {
    userId: req.auth!.userId,
    userHiddenAt: null as null,
    ...(unreadOnly ? { readAt: null } : {})
  };

  const prisma = getPrisma();
  const rows = await prisma.notification.findMany({
    where,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1
  });
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore && page.length ? page[page.length - 1].id : null;
  const unreadCount = await prisma.notification.count({ where: { userId: req.auth!.userId, userHiddenAt: null, readAt: null } });

  res.json({
    items: page.map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      body: row.body || "",
      entityType: row.entityType || "",
      entityId: row.entityId || "",
      metaJson: row.metaJson,
      createdAt: row.createdAt.toISOString(),
      readAt: row.readAt ? row.readAt.toISOString() : null
    })),
    nextCursor,
    hasMore,
    unreadCount
  });
});

notificationRouter.get("/api/notifications/unread-count", async (req, res) => {
  const prisma = getPrisma();
  const unreadCount = await prisma.notification.count({ where: { userId: req.auth!.userId, userHiddenAt: null, readAt: null } });
  res.json({ unreadCount });
});

notificationRouter.post("/api/notifications/:id/read", async (req, res) => {
  const id = String(req.params.id || "").trim();
  if (!id) {
    res.status(400).json({ error: "Invalid notification id" });
    return;
  }
  const prisma = getPrisma();
  const existing = await prisma.notification.findFirst({ where: { id, userId: req.auth!.userId, userHiddenAt: null } });
  if (!existing) {
    res.status(404).json({ error: "Notification not found" });
    return;
  }
  if (!existing.readAt) {
    await prisma.notification.update({ where: { id: existing.id }, data: { readAt: new Date() } });
  }
  const unreadCount = await prisma.notification.count({ where: { userId: req.auth!.userId, userHiddenAt: null, readAt: null } });
  res.json({ ok: true, id: existing.id, unreadCount });
});

notificationRouter.post("/api/notifications/read-all", async (req, res) => {
  const prisma = getPrisma();
  await prisma.notification.updateMany({
    where: { userId: req.auth!.userId, userHiddenAt: null, readAt: null },
    data: { readAt: new Date() }
  });
  res.json({ ok: true, unreadCount: 0 });
});

notificationRouter.post("/api/notifications/clear", async (req, res) => {
  const prisma = getPrisma();
  const now = new Date();
  const updated = await prisma.notification.updateMany({
    where: { userId: req.auth!.userId, userHiddenAt: null },
    data: { userHiddenAt: now, readAt: now }
  });
  await writeAudit(req.auth!.userId, "notification.clear.self", "notification", "bulk", { count: updated.count });
  res.json({ ok: true, cleared: updated.count, unreadCount: 0 });
});

notificationRouter.post("/api/admin/notifications/broadcast", requireRealmFeature("admin_notifications"), async (req, res) => {
  const permissions = new Set(req.auth!.permissions || []);
  if (!canManageNotifications(permissions)) {
    res.status(403).json({ error: "Forbidden", missingPermission: "users.update" });
    return;
  }
  const schema = z.object({
    title: z.string().min(1).max(191),
    body: z.string().max(1000).optional(),
    type: z.string().min(1).max(64).default("announcement"),
    userIds: z.array(z.string().min(1)).max(1000).optional(),
    includeSelf: z.boolean().optional().default(false)
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const prisma = getPrisma();
  const targetUsers = parsed.data.userIds && parsed.data.userIds.length
    ? parsed.data.userIds
    : (await prisma.user.findMany({
      where: { isDeleted: false, status: "active" },
      select: { id: true }
    })).map((u) => u.id);

  const uniqueUserIds = Array.from(new Set(targetUsers.filter((id) => id && (parsed.data.includeSelf || id !== req.auth!.userId))));
  await createNotifications(uniqueUserIds.map((userId) => ({
    userId,
    type: parsed.data.type,
    title: parsed.data.title,
    body: parsed.data.body || "",
    entityType: "system",
    entityId: "broadcast",
    metaJson: { actorUserId: req.auth!.userId }
  })));
  await writeAudit(req.auth!.userId, "notification.broadcast", "notification", "bulk", {
    type: parsed.data.type,
    count: uniqueUserIds.length
  });
  res.status(201).json({ ok: true, count: uniqueUserIds.length });
});

notificationRouter.get("/api/admin/notifications/settings", requireRealmFeature("admin_notifications"), async (req, res) => {
  const permissions = new Set(req.auth!.permissions || []);
  if (!canManageNotifications(permissions)) {
    res.status(403).json({ error: "Forbidden", missingPermission: "users.update" });
    return;
  }
  const prisma = getPrisma();
  const users = await prisma.user.findMany({
    where: { isDeleted: false },
    orderBy: [{ nickname: "asc" }, { username: "asc" }],
    select: { id: true, username: true, nickname: true, role: true, status: true, displayColor: true }
  });
  const prefs = await prisma.notificationPreference.findMany({
    where: { userId: { in: users.map((u) => u.id) }, enabled: false },
    select: { userId: true, type: true }
  });
  const dbTypes = await prisma.notificationPreference.findMany({
    where: { userId: { in: users.map((u) => u.id) } },
    select: { type: true },
    distinct: ["type"]
  });
  const liveTypes = await prisma.notification.findMany({
    select: { type: true },
    distinct: ["type"],
    take: 200
  });
  const typeSet = new Set<string>(ADMIN_NOTIFICATION_TYPES);
  dbTypes.forEach((row) => typeSet.add(normalizeNotificationType(row.type)));
  liveTypes.forEach((row) => typeSet.add(normalizeNotificationType(row.type)));
  const types = Array.from(typeSet).filter((type) => Boolean(type) && type !== SELF_NOTIFY_PREF_TYPE).sort();
  const selfNotifyDisabledUserIds = prefs
    .filter((p) => normalizeNotificationType(p.type) === SELF_NOTIFY_PREF_TYPE)
    .map((p) => String(p.userId || ""));

  res.json({
    users: users.map((u) => ({
      id: u.id,
      username: u.username,
      nickname: (u.nickname || u.username || "").trim() || u.username,
      role: u.role,
      status: u.status,
      color: /^#[0-9a-fA-F]{6}$/.test(String(u.displayColor || "")) ? String(u.displayColor) : "#64748b"
    })),
    types,
    disabled: prefs.map((p) => ({ userId: p.userId, type: normalizeNotificationType(p.type) })),
    selfNotifyDisabledUserIds
  });
});

notificationRouter.put("/api/admin/notifications/settings", requireRealmFeature("admin_notifications"), async (req, res) => {
  const permissions = new Set(req.auth!.permissions || []);
  if (!canManageNotifications(permissions)) {
    res.status(403).json({ error: "Forbidden", missingPermission: "users.update" });
    return;
  }
  const schema = z.object({
    scopeUserIds: z.array(z.string().min(1)).max(5000).default([]),
    scopeTypes: z.array(z.string().min(1).max(191)).max(500).default([]),
    selfNotifyDisabledUserIds: z.array(z.string().min(1)).max(5000).default([]),
    disabled: z.array(z.object({
      userId: z.string().min(1),
      type: z.string().min(1).max(191)
    })).max(20000).default([])
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const rows = parsed.data.disabled.map((row) => ({
    userId: String(row.userId || "").trim(),
    type: normalizeNotificationType(row.type)
  })).filter((row) => row.userId && row.type);
  const selfDisabledRows = Array.from(new Set((parsed.data.selfNotifyDisabledUserIds || []).map((id) => String(id || "").trim()).filter(Boolean)))
    .map((userId) => ({ userId, type: SELF_NOTIFY_PREF_TYPE }));

  const scopeUserIds = Array.from(new Set([
    ...(parsed.data.scopeUserIds || []).map((id) => String(id || "").trim()).filter(Boolean),
    ...selfDisabledRows.map((row) => row.userId)
  ]));
  const scopeTypes = Array.from(new Set((parsed.data.scopeTypes || []).map((type) => normalizeNotificationType(type)).filter(Boolean)));
  const userIds = Array.from(new Set([...scopeUserIds, ...rows.map((row) => row.userId)]));
  const types = Array.from(new Set([...scopeTypes, ...rows.map((row) => row.type), SELF_NOTIFY_PREF_TYPE]));
  const prisma = getPrisma();
  const existingUsers = await prisma.user.findMany({
    where: { id: { in: userIds }, isDeleted: false },
    select: { id: true }
  });
  const existingSet = new Set(existingUsers.map((u) => u.id));
  const filtered = rows.filter((row) => existingSet.has(row.userId));
  const filteredSelfDisabled = selfDisabledRows.filter((row) => existingSet.has(row.userId));
  const combinedDisabled = filtered.concat(filteredSelfDisabled);

  await prisma.$transaction(async (tx) => {
    if (userIds.length) {
      await tx.notificationPreference.deleteMany({
        where: {
          userId: { in: userIds },
          ...(types.length ? { type: { in: types } } : {})
        }
      });
    }
    if (combinedDisabled.length) {
      await tx.notificationPreference.createMany({
        data: combinedDisabled.map((row) => ({
          userId: row.userId,
          type: row.type,
          enabled: false
        })),
        skipDuplicates: true
      });
    }
  });

  await writeAudit(req.auth!.userId, "notification.settings.update", "notificationPreference", "bulk", {
    users: userIds.length,
    types: types.length,
    disabled: combinedDisabled.length,
    selfNotifyDisabled: filteredSelfDisabled.length
  });
  res.json({ ok: true, disabled: filtered.length });
});

notificationRouter.get("/api/admin/notifications", requireRealmFeature("admin_notifications"), async (req, res) => {
  const permissions = new Set(req.auth!.permissions || []);
  if (!canManageNotifications(permissions)) {
    res.status(403).json({ error: "Forbidden", missingPermission: "users.update" });
    return;
  }
  const limitRaw = Number(req.query.limit || 100);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.trunc(limitRaw), 1), 300) : 100;
  const cursor = String(req.query.cursor || "").trim();
  const userId = String(req.query.userId || "").trim();
  const type = normalizeNotificationType(req.query.type || "");
  const read = String(req.query.read || "").trim().toLowerCase();
  const q = String(req.query.q || "").trim();
  const where = {
    ...(userId ? { userId } : {}),
    ...(type ? { type } : {}),
    ...(read === "unread" ? { readAt: null } : {}),
    ...(read === "read" ? { NOT: { readAt: null as null } } : {}),
    ...(q ? {
      OR: [
        { title: { contains: q } },
        { body: { contains: q } },
        { entityId: { contains: q } }
      ]
    } : {})
  };

  const prisma = getPrisma();
  const rows = await prisma.notification.findMany({
    where,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    include: {
      user: {
        select: { id: true, username: true, nickname: true, role: true }
      }
    }
  });
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore && page.length ? page[page.length - 1].id : null;
  res.json({
    items: page.map((row) => ({
      id: row.id,
      userId: row.userId,
      userName: (row.user && (row.user.nickname || row.user.username)) || row.userId,
      username: row.user ? row.user.username : "",
      role: row.user ? row.user.role : "",
      type: row.type,
      title: row.title,
      body: row.body || "",
      entityType: row.entityType || "",
      entityId: row.entityId || "",
      createdAt: row.createdAt.toISOString(),
      readAt: row.readAt ? row.readAt.toISOString() : null
    })),
    hasMore,
    nextCursor
  });
});

notificationRouter.post("/api/admin/notifications/:id/read", requireRealmFeature("admin_notifications"), async (req, res) => {
  const permissions = new Set(req.auth!.permissions || []);
  if (!canManageNotifications(permissions)) {
    res.status(403).json({ error: "Forbidden", missingPermission: "users.update" });
    return;
  }
  const id = String(req.params.id || "").trim();
  if (!id) {
    res.status(400).json({ error: "Invalid notification id" });
    return;
  }
  const prisma = getPrisma();
  const row = await prisma.notification.findUnique({ where: { id } });
  if (!row) {
    res.status(404).json({ error: "Notification not found" });
    return;
  }
  if (!row.readAt) {
    await prisma.notification.update({ where: { id: row.id }, data: { readAt: new Date() } });
  }
  res.json({ ok: true, id: row.id });
});

notificationRouter.delete("/api/admin/notifications/:id", requireRealmFeature("admin_notifications"), async (req, res) => {
  const permissions = new Set(req.auth!.permissions || []);
  if (!canManageNotifications(permissions)) {
    res.status(403).json({ error: "Forbidden", missingPermission: "users.update" });
    return;
  }
  const id = String(req.params.id || "").trim();
  if (!id) {
    res.status(400).json({ error: "Invalid notification id" });
    return;
  }
  const prisma = getPrisma();
  const row = await prisma.notification.findUnique({ where: { id } });
  if (!row) {
    res.status(404).json({ error: "Notification not found" });
    return;
  }
  await prisma.notification.delete({ where: { id: row.id } });
  await writeAudit(req.auth!.userId, "notification.delete", "notification", row.id, {
    userId: row.userId,
    type: row.type
  });
  res.json({ ok: true, id: row.id });
});
