import fs from "fs";
import path from "path";
import { getPrisma } from "../db/prisma";
import { getConfigPath } from "../config/store";
import { purgeChatFileAssetsOlderThan } from "./filesService";

export type MaintenanceRetentionSettings = {
  notificationsRetentionDays: number;
  auditRetentionDays: number;
  chatRetentionDays: number;
  chatFilesRetentionDays: number;
  lastCleanupRunAt: string | null;
};

const DEFAULT_SETTINGS: MaintenanceRetentionSettings = {
  notificationsRetentionDays: 90,
  auditRetentionDays: 180,
  chatRetentionDays: 180,
  chatFilesRetentionDays: 180,
  lastCleanupRunAt: null
};

function getSettingsPath(): string {
  const cfgDir = path.dirname(getConfigPath());
  return path.join(cfgDir, "maintenance-retention.json");
}

function normalize(input?: Partial<MaintenanceRetentionSettings> | null): MaintenanceRetentionSettings {
  const normalizeDays = (value: unknown, fallback: number) =>
    Math.max(0, Math.min(3650, Math.trunc(Number(value ?? fallback) || fallback)));
  return {
    notificationsRetentionDays: normalizeDays(input?.notificationsRetentionDays, DEFAULT_SETTINGS.notificationsRetentionDays),
    auditRetentionDays: normalizeDays(input?.auditRetentionDays, DEFAULT_SETTINGS.auditRetentionDays),
    chatRetentionDays: normalizeDays(input?.chatRetentionDays, DEFAULT_SETTINGS.chatRetentionDays),
    chatFilesRetentionDays: normalizeDays(input?.chatFilesRetentionDays, DEFAULT_SETTINGS.chatFilesRetentionDays),
    lastCleanupRunAt: typeof input?.lastCleanupRunAt === "string" && !Number.isNaN(Date.parse(input.lastCleanupRunAt))
      ? new Date(input.lastCleanupRunAt).toISOString()
      : null
  };
}

export function loadMaintenanceRetentionSettings(): MaintenanceRetentionSettings {
  const p = getSettingsPath();
  if (!fs.existsSync(p)) return normalize();
  try {
    const raw = fs.readFileSync(p, "utf-8");
    return normalize(JSON.parse(raw) as Partial<MaintenanceRetentionSettings>);
  } catch {
    return normalize();
  }
}

export function saveMaintenanceRetentionSettings(patch: Partial<MaintenanceRetentionSettings>): MaintenanceRetentionSettings {
  const current = loadMaintenanceRetentionSettings();
  const next = normalize({ ...current, ...patch });
  const p = getSettingsPath();
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(p, JSON.stringify(next, null, 2), "utf-8");
  return next;
}

export function markMaintenanceCleanupRun(at: Date = new Date()): MaintenanceRetentionSettings {
  return saveMaintenanceRetentionSettings({ lastCleanupRunAt: at.toISOString() });
}

async function deleteByAge(table: "notification" | "auditLog", days: number): Promise<number> {
  const retentionDays = Math.max(0, Math.trunc(Number(days || 0)));
  if (retentionDays <= 0) return 0;
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const prisma = getPrisma();
  if (table === "notification") {
    const result = await prisma.notification.deleteMany({ where: { createdAt: { lt: cutoff } } });
    return result.count;
  }
  const result = await prisma.auditLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
  return result.count;
}

export async function applyMaintenanceRetention(settings?: MaintenanceRetentionSettings): Promise<{
  notificationsDeleted: number;
  auditDeleted: number;
  chatMessagesDeleted: number;
  chatReadsDeleted: number;
  chatFilesDeleted: number;
  chatFilesDeletedBytes: number;
}> {
  const s = settings || loadMaintenanceRetentionSettings();
  const chatMessageRetentionDays = Math.max(0, Math.trunc(Number(s.chatRetentionDays || 0)));
  const cutoff = new Date(Date.now() - chatMessageRetentionDays * 24 * 60 * 60 * 1000);
  const prisma = getPrisma();
  const [notificationsDeleted, auditDeleted, chatMessagesDeleted, chatReadsDeleted] = await Promise.all([
    deleteByAge("notification", s.notificationsRetentionDays),
    deleteByAge("auditLog", s.auditRetentionDays),
    chatMessageRetentionDays > 0 ? prisma.chatMessage.deleteMany({ where: { createdAt: { lt: cutoff } } }).then((r) => r.count) : Promise.resolve(0),
    chatMessageRetentionDays > 0 ? prisma.chatThreadRead.deleteMany({ where: { updatedAt: { lt: cutoff } } }).then((r) => r.count) : Promise.resolve(0)
  ]);
  const chatFilesCleanup = purgeChatFileAssetsOlderThan(s.chatFilesRetentionDays);
  return {
    notificationsDeleted,
    auditDeleted,
    chatMessagesDeleted,
    chatReadsDeleted,
    chatFilesDeleted: chatFilesCleanup.deletedRows,
    chatFilesDeletedBytes: chatFilesCleanup.deletedBytes
  };
}
