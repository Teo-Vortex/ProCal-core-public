import express, { Router } from "express";
import { z } from "zod";
import { requireAuth, requirePermission } from "../middleware/auth";
import { requireRealmFeature } from "../middleware/requireRealmFeature";
import { writeAudit } from "../services/auditService";
import {
  applyMaintenanceRetention,
  loadMaintenanceRetentionSettings,
  markMaintenanceCleanupRun,
  saveMaintenanceRetentionSettings
} from "../services/maintenanceRetentionService";
import {
  createBackup,
  deleteBackupFile,  restoreFullBackupFromFile,
  saveImportedBackup,
  validateBackupFile
} from "../services/backupService";

export const backupRouter = Router();

backupRouter.use("/api/admin", requireAuth, requireRealmFeature("admin_backups"));
backupRouter.use("/api/admin/backups/import", express.text({ type: ["text/plain", "application/json"], limit: "200mb" }));
backupRouter.use("/api/admin/backups/validate-upload", express.text({ type: ["text/plain", "application/json", "application/vnd.procal.backup+json"], limit: "500mb" }));
backupRouter.use("/api/admin/backups/restore-upload", express.text({ type: ["text/plain", "application/json", "application/vnd.procal.backup+json"], limit: "500mb" }));

backupRouter.get("/api/admin/backups", requirePermission("backups.manage"), async (_req, res) => {
  res.json({
    items: [],
    retained: false,
    message: "Backup catalog is disabled. Realm admins keep backup files outside the platform."
  });
});

backupRouter.get("/api/admin/backups/settings", requirePermission("backups.manage"), async (_req, res) => {
  res.json({
    disabled: true,
    reason: "Automatic realm backups are disabled. Realm admins export encrypted backups manually and store them outside the platform.",
    full: { enabled: false, everyHours: 168, retentionDays: 0, lastRunAt: null },
    working: { enabled: false, everyHours: 168, retentionDays: 0, lastRunAt: null }
  });
});

backupRouter.get("/api/admin/retention-settings", requirePermission("backups.manage"), async (_req, res) => {
  res.json(loadMaintenanceRetentionSettings());
});

backupRouter.put("/api/admin/retention-settings", requirePermission("backups.manage"), async (req, res) => {
  const schema = z.object({
    notificationsRetentionDays: z.number().int().min(0).max(3650).optional(),
    auditRetentionDays: z.number().int().min(0).max(3650).optional(),
    chatRetentionDays: z.number().int().min(0).max(3650).optional(),
    chatFilesRetentionDays: z.number().int().min(0).max(3650).optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const saved = saveMaintenanceRetentionSettings(parsed.data);
  const applied = await applyMaintenanceRetention(saved);
  const savedWithRun = markMaintenanceCleanupRun(new Date());
  await writeAudit(req.auth!.userId, "retention.settings.update", "retention_settings", "1", {
    settings: savedWithRun,
    deletedNow: applied
  });
  res.json({ ok: true, settings: savedWithRun, deletedNow: applied });
});

backupRouter.put("/api/admin/backups/settings", requirePermission("backups.manage"), async (_req, res) => {
  res.status(410).json({
    error: "Automatic realm backup settings are disabled. Use manual encrypted export instead."
  });
});

backupRouter.post("/api/admin/backups/export", requirePermission("backups.manage"), async (req, res) => {
  const bodySchema = z.object({
    type: z.enum(["full", "working"]).optional().default("full"),
    encryptionKey: z.string().trim().min(16),
    encryptionWarningAccepted: z.boolean().optional().default(false)
  });
  const parsed = bodySchema.safeParse(req.body || {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  if (!parsed.data.encryptionWarningAccepted) {
    res.status(400).json({ error: "Encrypted_Backup_Warning_26.04.01 must be accepted before creating a backup." });
    return;
  }
  const result = await createBackup(parsed.data.type, req.auth?.userId || null, {
    encryptionKey: parsed.data.encryptionKey
  });
  await writeAudit(req.auth!.userId, "backup.export", "backup", result.fileName, {
    backupKind: result.pkg.backupKind || "full",
    sizeBytes: result.sizeBytes,
    appVersion: result.pkg.appVersion,
    tableCount: result.pkg.tables.length,
    serverCopyRetained: false
  });

  const safeName = pathSafe(result.fileName);
  res.setHeader("content-type", "application/vnd.procal.backup+json; charset=utf-8");
  res.setHeader("content-disposition", `attachment; filename="${safeName}"`);
  res.setHeader("x-procal-backup-file-name", safeName);
  res.setHeader("x-procal-backup-kind", result.pkg.backupKind || "full");
  res.setHeader("x-procal-backup-created-at", result.pkg.createdAt);
  res.setHeader("x-procal-backup-size-bytes", String(result.sizeBytes));
  res.sendFile(result.filePath, (error) => {
    try {
      deleteBackupFile(result.fileName);
    } catch {
      // Exported realm backups are temporary; cleanup is best-effort after the response finishes.
    }
    if (error && !res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  });
});

backupRouter.post("/api/admin/backups", requirePermission("backups.manage"), async (_req, res) => {
  res.status(410).json({
    error: "Persistent realm backup creation is disabled. Use /api/admin/backups/export for a direct encrypted download."
  });
});

backupRouter.post("/api/admin/backups/validate-upload", requirePermission("backups.manage"), async (req, res) => {
  const upload = parseUploadedBackupRequest(req);
  if (!upload.content.trim()) {
    res.status(400).json({ error: "Backup content is required." });
    return;
  }

  let item: ReturnType<typeof saveImportedBackup> | null = null;
  try {
    item = saveImportedBackup(upload.content, upload.fileName, { encryptionKey: upload.encryptionKey || undefined });
    const result = validateBackupFile(item.fileName, upload.encryptionKey || null);
    await writeAudit(req.auth!.userId, "backup.validate_upload", "backup", item.fileName, {
      backupKind: result.backupKind,
      sourceCreatedAt: result.createdAt,
      sourceAppVersion: result.appVersion,
      tableCount: result.tableCount,
      rowCount: result.rowCount,
      temporaryFileDeleted: true
    });
    res.json({ ...result, temporaryFileDeleted: true });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Backup validation failed" });
  } finally {
    if (item) deleteBackupFileQuiet(item.fileName);
  }
});

backupRouter.post("/api/admin/backups/restore-upload", requirePermission("backups.manage"), async (req, res) => {
  const upload = parseUploadedBackupRequest(req);
  if (!upload.content.trim()) {
    res.status(400).json({ error: "Backup content is required." });
    return;
  }

  let item: ReturnType<typeof saveImportedBackup> | null = null;
  try {
    item = saveImportedBackup(upload.content, upload.fileName, { encryptionKey: upload.encryptionKey || undefined });
    const result = await restoreFullBackupFromFile(item.fileName, upload.encryptionKey || null);
    await writeAudit(req.auth!.userId, "backup.restore_upload", "backup", result.fileName, {
      backupKind: result.backupKind,
      sourceCreatedAt: result.createdAt,
      sourceAppVersion: result.appVersion,
      clearedTableCount: result.clearedTableCount,
      insertedTables: result.insertedTables,
      insertedRows: result.insertedRows,
      skippedTables: result.skippedTables,
      temporaryFileDeleted: true
    });
    res.json({ ok: true, ...result, temporaryFileDeleted: true });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Backup restore failed" });
  } finally {
    if (item) deleteBackupFileQuiet(item.fileName);
  }
});

backupRouter.post("/api/admin/backups/import", requirePermission("backups.manage"), async (_req, res) => {
  res.status(410).json({
    error: "Backup import catalog is disabled. Validate or restore by uploading a backup file for a single temporary operation."
  });
});

backupRouter.get("/api/admin/backups/:fileName/download", requirePermission("backups.manage"), async (_req, res) => {
  res.status(410).json({
    error: "Backup catalog is disabled. Download the backup when it is exported; server-retained backup files are not supported."
  });
});

backupRouter.post("/api/admin/backups/:fileName/validate", requirePermission("backups.manage"), async (_req, res) => {
  res.status(410).json({
    error: "Backup catalog is disabled. Validate by uploading a backup file for a single temporary operation."
  });
});

backupRouter.post("/api/admin/backups/:fileName/restore", requirePermission("backups.manage"), async (_req, res) => {
  res.status(410).json({
    error: "Backup catalog is disabled. Restore by uploading a backup file for a single temporary operation."
  });
});

backupRouter.delete("/api/admin/backups/:fileName", requirePermission("backups.manage"), async (req, res) => {
  const fileName = String(req.params.fileName || "");
  deleteBackupFile(fileName);
  await writeAudit(req.auth!.userId, "backup.delete", "backup", fileName);
  res.json({ ok: true, fileName });
});

function parseUploadedBackupRequest(req: any): { content: string; fileName?: string; encryptionKey?: string } {
  const content = typeof req.body === "string" ? req.body : "";
  const fileNameFromQuery = typeof req.query?.fileName === "string" ? req.query.fileName : "";
  const fileNameFromHeader = decodeURIComponentSafe(String(req.header("x-procal-backup-file-name") || ""));
  const encryptionKey = decodeBase64Header(String(req.header("x-procal-backup-key-base64") || "")).trim();
  return {
    content,
    fileName: fileNameFromQuery || fileNameFromHeader || undefined,
    encryptionKey: encryptionKey || undefined
  };
}

function decodeURIComponentSafe(value: string): string {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function decodeBase64Header(value: string): string {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    return Buffer.from(raw, "base64").toString("utf8");
  } catch {
    return "";
  }
}

function deleteBackupFileQuiet(fileName: string): void {
  try {
    deleteBackupFile(fileName);
  } catch {
    // Uploaded backup files are temporary; cleanup is best-effort.
  }
}

function pathSafe(fileName: string): string {
  return String(fileName || "backup.json").replace(/[^a-zA-Z0-9._-]/g, "_");
}
