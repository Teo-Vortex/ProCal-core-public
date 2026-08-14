import { getPrisma } from "../db/prisma";
import { publishUserNotification } from "./realtimeSyncService";
import { getEffectivePermissions, hasPermission } from "./permissionService";
import { sendNotificationPush } from "./mobilePushService";

export type NotificationInput = {
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  metaJson?: unknown;
  persist?: boolean;
  sendPush?: boolean;
};

const DEDUPE_WINDOW_MS = 5000;
export const SELF_NOTIFY_PREF_TYPE = "self.notify";

function requiresLeaveAccess(type: string): boolean {
  return String(type || "").startsWith("leave.");
}

function normalizeNotificationType(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

function prefKey(userId: string, type: string): string {
  return `${userId}::${type}`;
}

export async function filterNotificationsByPreference(inputs: NotificationInput[]): Promise<NotificationInput[]> {
  const normalized = (inputs || [])
    .filter((row) => row && row.userId && row.title)
    .map((row) => ({ ...row, type: normalizeNotificationType(row.type || "system") || "system" }));
  if (!normalized.length) return [];

  const userIds = Array.from(new Set(normalized.map((row) => String(row.userId || "").trim()).filter(Boolean)));
  const types = Array.from(new Set(normalized.map((row) => normalizeNotificationType(row.type || "system")).filter(Boolean)));
  if (!userIds.length) return normalized;

  const neededTypes = new Set(types);
  normalized.forEach((row) => {
    const meta = row.metaJson && typeof row.metaJson === "object" ? (row.metaJson as Record<string, unknown>) : null;
    const actorUserId = String((meta && meta.actorUserId) || "").trim();
    const targetUserId = String(row.userId || "").trim();
    if (actorUserId && targetUserId && actorUserId === targetUserId) {
      neededTypes.add(SELF_NOTIFY_PREF_TYPE);
    }
  });
  if (!neededTypes.size) return normalized;

  const prisma = getPrisma();
  const disabledPrefs = await prisma.notificationPreference.findMany({
    where: {
      userId: { in: userIds },
      type: { in: Array.from(neededTypes) },
      enabled: false
    },
    select: { userId: true, type: true }
  });
  const disabled = new Set(disabledPrefs.map((row) => prefKey(String(row.userId), normalizeNotificationType(row.type))));
  const prefFiltered = normalized.filter((row) => {
    const targetUserId = String(row.userId || "").trim();
    const rowType = normalizeNotificationType(row.type || "system");
    if (disabled.has(prefKey(targetUserId, rowType))) return false;
    const meta = row.metaJson && typeof row.metaJson === "object" ? (row.metaJson as Record<string, unknown>) : null;
    const actorUserId = String((meta && meta.actorUserId) || "").trim();
    if (actorUserId && actorUserId === targetUserId && disabled.has(prefKey(targetUserId, SELF_NOTIFY_PREF_TYPE))) {
      return false;
    }
    return true;
  });

  const leaveRows = prefFiltered.filter((row) => requiresLeaveAccess(normalizeNotificationType(row.type || "system")));
  if (!leaveRows.length) return prefFiltered;

  const leaveUserIds = Array.from(new Set(leaveRows.map((row) => String(row.userId || "").trim()).filter(Boolean)));
  if (!leaveUserIds.length) return prefFiltered;

  const users = await prisma.user.findMany({
    where: { id: { in: leaveUserIds }, isDeleted: false, status: "active" },
    select: { id: true, role: true }
  });
  const byId = new Map(users.map((u) => [u.id, u.role]));
  const allowLeaveByUser = new Map<string, boolean>();
  for (const userId of leaveUserIds) {
    const role = byId.get(userId);
    if (!role) {
      allowLeaveByUser.set(userId, false);
      continue;
    }
    const effective = await getEffectivePermissions(userId, role);
    const allow = hasPermission(effective, "leave.read_self")
      || hasPermission(effective, "leave.read_all")
      || hasPermission(effective, "leave.manage")
      || hasPermission(effective, "*");
    allowLeaveByUser.set(userId, allow);
  }

  return prefFiltered.filter((row) => {
    const rowType = normalizeNotificationType(row.type || "system");
    if (!requiresLeaveAccess(rowType)) return true;
    const targetUserId = String(row.userId || "").trim();
    return Boolean(allowLeaveByUser.get(targetUserId));
  });
}

async function createNotificationUnchecked(input: NotificationInput) {
  const row = { ...input, type: normalizeNotificationType(input.type || "system") || "system" };
  if (row.persist === false) {
    if (row.sendPush !== false) {
      await sendNotificationPush(row.userId, {
        title: row.title,
        body: row.body || null,
        type: row.type,
        entityType: row.entityType || null,
        entityId: row.entityId || null
      }).catch(() => {});
    }
    return null;
  }
  const prisma = getPrisma();
  const dedupeSince = new Date(Date.now() - DEDUPE_WINDOW_MS);
  const duplicate = await prisma.notification.findFirst({
    where: {
      userId: row.userId,
      type: String(row.type || "system"),
      title: String(row.title || "").slice(0, 191),
      entityType: row.entityType ? String(row.entityType).slice(0, 120) : null,
      entityId: row.entityId ? String(row.entityId).slice(0, 191) : null,
      createdAt: { gte: dedupeSince }
    },
    select: { id: true }
  });
  if (duplicate) return null;

  const created = await prisma.notification.create({
    data: {
      userId: row.userId,
      type: String(row.type || "system"),
      title: String(row.title || "").slice(0, 191),
      body: row.body ? String(row.body).slice(0, 1000) : null,
      entityType: row.entityType ? String(row.entityType).slice(0, 120) : null,
      entityId: row.entityId ? String(row.entityId).slice(0, 191) : null,
      metaJson: (row.metaJson as object) || undefined
    }
  });

  const unreadCount = await prisma.notification.count({
    where: { userId: created.userId, userHiddenAt: null, readAt: null }
  });

  publishUserNotification({
    id: created.id,
    userId: created.userId,
    type: created.type,
    title: created.title,
    body: created.body || null,
    entityType: created.entityType || null,
    entityId: created.entityId || null,
    createdAt: created.createdAt.toISOString(),
    unreadCount
  });

  if (row.sendPush !== false) {
    void sendNotificationPush(created.userId, {
      title: created.title,
      body: created.body || null,
      type: created.type,
      entityType: created.entityType || null,
      entityId: created.entityId || null
    }).catch(() => {});
  }

  return created;
}

export async function createNotification(input: NotificationInput) {
  const allowed = await filterNotificationsByPreference([input]);
  if (!allowed.length) return null;
  return createNotificationUnchecked(allowed[0]);
}

export async function createNotifications(inputs: NotificationInput[]) {
  const allowed = await filterNotificationsByPreference(inputs || []);
  const out = [];
  for (const input of allowed) {
    if (!input || !input.userId || !input.title) continue;
    const created = await createNotificationUnchecked(input);
    if (created) out.push(created);
  }
  return out;
}

export async function findUsersWithPermission(permission: string): Promise<string[]> {
  const prisma = getPrisma();
  const users = await prisma.user.findMany({
    where: { isDeleted: false, status: "active" },
    select: { id: true, role: true }
  });
  const out: string[] = [];
  for (const user of users) {
    const effective = await getEffectivePermissions(user.id, user.role);
    if (hasPermission(effective, permission)) out.push(user.id);
  }
  return out;
}
