import fs from "fs";
import path from "path";
import { Router, type Request, type Response } from "express";
import archiver from "archiver";
import multer from "multer";
import { z } from "zod";
import { getPrisma } from "../db/prisma";
import { requireAuth, requirePermission } from "../middleware/auth";
import { requireRealmFeature } from "../middleware/requireRealmFeature";
import { hasPermission } from "../services/permissionService";
import {
  createExplorerFolder,
  deleteAsset,
  deleteExplorerFolder,
  getFilesStorageUsage,
  listExplorerFolder,
  listRealmArchiveAssets,
  listUserArchiveAssets,
  listChatAssetsForOwner,
  listChatAssetsForThread,
  listEventAssets,
  moveExplorerFile,
  moveExplorerFolder,
  renameExplorerFolder,
  resolveEventKeyByFolderName,
  resolveAssetForDownload,
  uploadChatAsset,
  uploadEventAsset,
  uploadSharedAsset,
  type ExplorerRoot
} from "../services/filesService";
import {
  getFilesRootDir,
  getRealmIdentifier
} from "../services/filesPathService";
import { writeAudit } from "../services/auditService";

export const filesRouter = Router();
const explorerRootSchema = z.enum(["chat", "events", "shared"]);
const MIN_UPLOAD_LIMIT_BYTES = 256 * 1024;
const UNLIMITED_UPLOAD_LIMIT_VALUES = new Set(["0", "-1", "unlimited", "none", "off"]);

function readUploadMaxBytes(): number {
  const raw = String(process.env.FILES_MAX_BYTES || "").trim().toLowerCase();
  if (!raw) return 15 * 1024 * 1024;
  if (UNLIMITED_UPLOAD_LIMIT_VALUES.has(raw)) return 0;
  const value = Number(raw);
  if (!Number.isFinite(value)) return 15 * 1024 * 1024;
  if (value <= 0) return 0;
  return Math.max(MIN_UPLOAD_LIMIT_BYTES, Math.trunc(value));
}

const uploadMaxBytes = readUploadMaxBytes();
const uploadParser = multer({
  storage: multer.memoryStorage(),
  limits: uploadMaxBytes > 0 ? { fileSize: uploadMaxBytes } : undefined
});

function getUploadLimitLabel() {
  if (uploadMaxBytes <= 0) return "unlimited";
  return `${Math.max(1, Math.floor(uploadMaxBytes / (1024 * 1024)))} MB`;
}

function parseBooleanField(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return fallback;
  if (["1", "true", "yes", "on"].includes(raw)) return true;
  if (["0", "false", "no", "off"].includes(raw)) return false;
  return fallback;
}

async function parseMultipartUpload(req: Request, res: Response) {
  return await new Promise<boolean>((resolve) => {
    uploadParser.single("file")(req, res, (error) => {
      if (!error) {
        resolve(true);
        return;
      }
      if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
        res.status(400).json({ error: `File is too large. Max size is ${getUploadLimitLabel()}.` });
        resolve(false);
        return;
      }
      res.status(400).json({ error: error instanceof Error ? error.message : "Upload payload is invalid." });
      resolve(false);
    });
  });
}

function parseUploadBinaryPayload(body: unknown, file?: Express.Multer.File) {
  if (file && Buffer.isBuffer(file.buffer)) {
    const fileName = String(file.originalname || "").trim();
    if (!fileName) {
      return { success: false as const, error: "Missing uploaded file name." };
    }
    return {
      success: true as const,
      data: {
        fileName,
        mimeType: String(file.mimetype || "").trim() || null,
        content: file.buffer
      }
    };
  }

  const parsed = z.object({
    fileName: z.string().trim().min(1).max(255),
    mimeType: z.string().trim().max(191).optional(),
    contentBase64: z.string().min(1)
  }).safeParse(body || {});
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten() };
  }
  return {
    success: true as const,
    data: {
      fileName: parsed.data.fileName,
      mimeType: parsed.data.mimeType || null,
      contentBase64: parsed.data.contentBase64
    }
  };
}

filesRouter.use(requireAuth);
filesRouter.use("/api/files", requireRealmFeature("files"));

filesRouter.get("/api/files/config", async (_req, res) => {
  res.json({
    ok: true,
    realmId: getRealmIdentifier(),
    uploadMaxBytes,
    uploadMaxLabel: getUploadLimitLabel()
  });
});

filesRouter.get("/api/files/storage", async (_req, res) => {
  const usage = getFilesStorageUsage();
  res.json({
    ok: true,
    usedBytes: usage.usedBytes,
    limitBytes: usage.limitBytes,
    percent: usage.percent
  });
});

filesRouter.get("/api/files/explorer", async (req, res) => {
  const parsed = z.object({
    root: explorerRootSchema.default("chat"),
    path: z.string().optional()
  }).safeParse(req.query || {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const permissions = new Set(req.auth!.permissions || []);
  const canReadEvents = hasPermission(permissions, "events.read") || hasPermission(permissions, "*");
  const canReadChat = hasPermission(permissions, "chat.read") || hasPermission(permissions, "*");
  const canManageEvents = hasPermission(permissions, "events.update") || hasPermission(permissions, "*");
  const canManageChat = hasPermission(permissions, "chat.write") || hasPermission(permissions, "*");
  const canManageBackups = hasPermission(permissions, "backups.manage") || hasPermission(permissions, "*");

  try {
    const body = listExplorerFolder({
      root: parsed.data.root as ExplorerRoot,
      path: parsed.data.path,
      userId: req.auth!.userId,
      canReadEvents,
      canReadChat,
      canManageBackups,
      canManageEvents,
      canManageChat
    });
    res.json({ ok: true, ...body });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Explorer load failed.";
    const status = message === "Forbidden" ? 403 : 400;
    res.status(status).json({ error: message });
  }
});

filesRouter.post("/api/files/explorer/folders", async (req, res) => {
  const parsed = z.object({
    root: explorerRootSchema,
    parentPath: z.string().optional(),
    name: z.string().min(1).max(128)
  }).safeParse(req.body || {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const permissions = new Set(req.auth!.permissions || []);
  const canManageEvents = hasPermission(permissions, "events.update") || hasPermission(permissions, "*");
  const canManageChat = hasPermission(permissions, "chat.write") || hasPermission(permissions, "*");
  try {
    const created = createExplorerFolder({
      root: parsed.data.root as ExplorerRoot,
      parentPath: parsed.data.parentPath,
      name: parsed.data.name,
      canManageEvents,
      canManageChat
    });
    await writeAudit(req.auth!.userId, "files.folder.create", "folder", `${created.root}:${created.path}`, {
      root: created.root,
      path: created.path
    });
    res.status(201).json({ ok: true, folder: created });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Folder create failed.";
    const status = message === "Forbidden" ? 403 : 400;
    res.status(status).json({ error: message });
  }
});

filesRouter.patch("/api/files/explorer/folders", async (req, res) => {
  const parsed = z.object({
    root: explorerRootSchema,
    path: z.string().min(1),
    targetRoot: explorerRootSchema.optional(),
    newName: z.string().min(1).max(128).optional(),
    targetPath: z.string().optional()
  }).safeParse(req.body || {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  if (!parsed.data.newName && parsed.data.targetPath === undefined) {
    res.status(400).json({ error: "newName or targetPath is required." });
    return;
  }
  const permissions = new Set(req.auth!.permissions || []);
  const canManageEvents = hasPermission(permissions, "events.update") || hasPermission(permissions, "*");
  const canManageChat = hasPermission(permissions, "chat.write") || hasPermission(permissions, "*");

  try {
    if (parsed.data.newName) {
      const renamed = renameExplorerFolder({
        root: parsed.data.root as ExplorerRoot,
        path: parsed.data.path,
        newName: parsed.data.newName,
        canManageEvents,
        canManageChat
      });
      await writeAudit(req.auth!.userId, "files.folder.rename", "folder", `${renamed.root}:${renamed.path}`, {
        root: renamed.root,
        path: renamed.path,
        newName: parsed.data.newName
      });
      res.json({ ok: true, folder: renamed });
      return;
    }
    const moved = moveExplorerFolder({
      root: parsed.data.root as ExplorerRoot,
      path: parsed.data.path,
      targetRoot: parsed.data.targetRoot as ExplorerRoot | undefined,
      targetPath: String(parsed.data.targetPath || ""),
      canManageEvents,
      canManageChat
    });
    await writeAudit(req.auth!.userId, "files.folder.move", "folder", `${moved.root}:${moved.path}`, {
      root: moved.root,
      path: moved.path,
      targetPath: parsed.data.targetPath || ""
    });
    res.json({ ok: true, folder: moved });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Folder update failed.";
    const status = message === "Forbidden" ? 403 : 400;
    res.status(status).json({ error: message });
  }
});

filesRouter.delete("/api/files/explorer/folders", async (req, res) => {
  const parsed = z.object({
    root: explorerRootSchema,
    path: z.string().min(1)
  }).safeParse(req.body || {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const permissions = new Set(req.auth!.permissions || []);
  const canManageEvents = hasPermission(permissions, "events.update") || hasPermission(permissions, "*");
  const canManageChat = hasPermission(permissions, "chat.write") || hasPermission(permissions, "*");
  try {
    let allowDeletedEventRootFolderDelete = false;
    if (parsed.data.root === "events") {
      const normalizedPath = String(parsed.data.path || "").replace(/\\/g, "/").trim();
      const pathSegments = normalizedPath.split("/").map((segment) => segment.trim()).filter(Boolean);
      if (pathSegments.length === 1) {
        const folderName = String(pathSegments[0] || "");
        const eventKey = String(resolveEventKeyByFolderName(folderName) || "").trim();
        if (eventKey) {
          try {
            const prisma = getPrisma();
            const sharedState = await prisma.sharedLegacyState.findUnique({
              where: { id: 1 },
              select: { dataJson: true }
            });
            const stateRec = sharedState && sharedState.dataJson && typeof sharedState.dataJson === "object" && !Array.isArray(sharedState.dataJson)
              ? sharedState.dataJson as Record<string, unknown>
              : {};
            const eventsRec = stateRec.events && typeof stateRec.events === "object" && !Array.isArray(stateRec.events)
              ? stateRec.events as Record<string, unknown>
              : {};
            let existsInCalendar = false;
            Object.values(eventsRec).forEach((list) => {
              if (existsInCalendar || !Array.isArray(list)) return;
              list.forEach((row) => {
                if (existsInCalendar || !row || typeof row !== "object" || Array.isArray(row)) return;
                const id = String((row as Record<string, unknown>).id || "").trim();
                if (id && id === eventKey) existsInCalendar = true;
              });
            });
            allowDeletedEventRootFolderDelete = !existsInCalendar;
          } catch {
            // Ignore fallback check failures; default lock policy applies.
          }
        }
      }
    }

    const result = deleteExplorerFolder({
      root: parsed.data.root as ExplorerRoot,
      path: parsed.data.path,
      actorUserId: req.auth!.userId,
      canManageEvents,
      canManageChat,
      isSystemAdmin: req.auth!.role === "system_admin",
      allowDeletedEventRootFolderDelete
    });
    await writeAudit(req.auth!.userId, "files.folder.delete", "folder", `${parsed.data.root}:${parsed.data.path}`, {
      root: parsed.data.root,
      path: parsed.data.path,
      deletedFiles: result.deletedFiles
    });
    res.json({ ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Folder delete failed.";
    const status = message === "Forbidden" ? 403 : 400;
    res.status(status).json({ error: message });
  }
});

filesRouter.post("/api/files/explorer/files/move", async (req, res) => {
  const parsed = z.object({
    fileId: z.string().min(1),
    targetRoot: explorerRootSchema,
    targetPath: z.string().optional()
  }).safeParse(req.body || {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const permissions = new Set(req.auth!.permissions || []);
  const canManageEvents = hasPermission(permissions, "events.update") || hasPermission(permissions, "*");
  const canManageChat = hasPermission(permissions, "chat.write") || hasPermission(permissions, "*");
  try {
    const moved = moveExplorerFile({
      fileId: parsed.data.fileId,
      targetRoot: parsed.data.targetRoot as ExplorerRoot,
      targetPath: String(parsed.data.targetPath || ""),
      actorUserId: req.auth!.userId,
      canManageEvents,
      canManageChat,
      isSystemAdmin: req.auth!.role === "system_admin"
    });
    await writeAudit(req.auth!.userId, "files.file.move", "file", parsed.data.fileId, {
      targetRoot: parsed.data.targetRoot,
      targetPath: parsed.data.targetPath || ""
    });
    res.json({ ...moved });
  } catch (error) {
    const message = error instanceof Error ? error.message : "File move failed.";
    const status = message === "Forbidden" ? 403 : 400;
    res.status(status).json({ error: message });
  }
});

filesRouter.post("/api/files/explorer/upload", async (req, res) => {
  if (!(await parseMultipartUpload(req, res))) return;
  const parsed = z.object({
    root: z.enum(["events", "shared"]),
    path: z.string().optional(),
    eventKey: z.string().trim().min(1).optional(),
    eventFolderName: z.string().trim().min(1).max(140).optional(),
    detachedFromCalendar: z.union([z.boolean(), z.string()]).optional()
  }).safeParse(req.body || {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const uploadPayload = parseUploadBinaryPayload(req.body, req.file);
  if (!uploadPayload.success) {
    res.status(400).json({ error: uploadPayload.error });
    return;
  }

  const permissions = new Set(req.auth!.permissions || []);
  const canManageEvents = hasPermission(permissions, "events.update") || hasPermission(permissions, "*");
  const canManageChat = hasPermission(permissions, "chat.write") || hasPermission(permissions, "*");
  const pathValue = String(parsed.data.path || "").replace(/\\/g, "/").replace(/^\/+/, "").trim();
  const pathSegments = pathValue ? pathValue.split("/").map((segment) => segment.trim()).filter(Boolean) : [];

  try {
    if (parsed.data.root === "shared") {
      const file = uploadSharedAsset({
        path: pathValue,
        ...uploadPayload.data,
        createdByUserId: req.auth!.userId
      });
      await writeAudit(req.auth!.userId, "files.shared.upload", "file", file.id, {
        path: pathValue,
        fileName: file.fileName,
        sizeBytes: file.sizeBytes
      });
      res.status(201).json({ ok: true, file });
      return;
    }

    if (!canManageEvents) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const pathFolderName = pathSegments.length ? pathSegments[0] : "";
    let eventKey = String(parsed.data.eventKey || "").trim();
    if (!eventKey && pathFolderName) {
      eventKey = String(resolveEventKeyByFolderName(pathFolderName) || "").trim();
    }
    if (!eventKey) {
      res.status(400).json({ error: "eventKey is required for events root upload." });
      return;
    }
    const eventFolderName = String(parsed.data.eventFolderName || pathFolderName || eventKey).trim();
    const uploaded = uploadEventAsset({
      eventKey,
      kind: "file",
      eventFolderName,
      detachedFromCalendar: parseBooleanField(parsed.data.detachedFromCalendar, false),
      ...uploadPayload.data,
      createdByUserId: req.auth!.userId
    });

    let file = uploaded;
    const defaultPath = `${eventFolderName}/other`;
    if (pathValue && pathValue !== defaultPath) {
      const moved = moveExplorerFile({
        fileId: uploaded.id,
        targetRoot: "events",
        targetPath: pathValue,
        actorUserId: req.auth!.userId,
        canManageEvents,
        canManageChat,
        isSystemAdmin: req.auth!.role === "system_admin"
      });
      file = moved.file;
    }

    await writeAudit(req.auth!.userId, "files.event.upload", "file", file.id, {
      eventKey,
      eventFolderName,
      path: pathValue,
      fileName: file.fileName,
      sizeBytes: file.sizeBytes
    });
    res.status(201).json({ ok: true, file });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed.";
    const status = message === "Forbidden" ? 403 : 400;
    res.status(status).json({ error: message });
  }
});

filesRouter.delete("/api/files/explorer/files", async (req, res) => {
  const parsed = z.object({
    fileId: z.string().trim().min(1)
  }).safeParse(req.body || {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const permissions = new Set(req.auth!.permissions || []);
  const canManageEvents = hasPermission(permissions, "events.update") || hasPermission(permissions, "*");
  const canManageChat = hasPermission(permissions, "chat.write") || hasPermission(permissions, "*");
  try {
    deleteAsset(parsed.data.fileId, {
      actorUserId: req.auth!.userId,
      canManageEvents,
      canManageChat,
      isSystemAdmin: req.auth!.role === "system_admin"
    });
    await writeAudit(req.auth!.userId, "files.file.delete", "file", parsed.data.fileId);
    res.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delete failed.";
    const status = message === "Forbidden" ? 403 : 400;
    res.status(status).json({ error: message });
  }
});

filesRouter.get("/api/files/events/:eventKey", requirePermission("events.read"), async (req, res) => {
  const eventKey = String(req.params.eventKey || "").trim();
  if (!eventKey) {
    res.status(400).json({ error: "Invalid event id." });
    return;
  }
  res.json({ ok: true, ...listEventAssets(eventKey) });
});

filesRouter.post("/api/files/events/:eventKey/upload", requirePermission("events.update"), async (req, res) => {
  if (!(await parseMultipartUpload(req, res))) return;
  const payload = z.object({
    kind: z.enum(["file", "program"]).default("file"),
    eventFolderName: z.string().trim().min(1).max(140).optional(),
    detachedFromCalendar: z.union([z.boolean(), z.string()]).optional()
  }).safeParse(req.body || {});
  if (!payload.success) {
    res.status(400).json({ error: payload.error.flatten() });
    return;
  }
  const uploadPayload = parseUploadBinaryPayload(req.body, req.file);
  if (!uploadPayload.success) {
    res.status(400).json({ error: uploadPayload.error });
    return;
  }

  const eventKey = String(req.params.eventKey || "").trim();
  if (!eventKey) {
    res.status(400).json({ error: "Invalid event id." });
    return;
  }

  try {
    const file = uploadEventAsset({
      eventKey,
      kind: payload.data.kind,
      eventFolderName: payload.data.eventFolderName || null,
      detachedFromCalendar: parseBooleanField(payload.data.detachedFromCalendar, false),
      ...uploadPayload.data,
      createdByUserId: req.auth!.userId
    });
    await writeAudit(req.auth!.userId, "files.event.upload", "file", file.id, {
      eventKey,
      kind: payload.data.kind,
      fileName: file.fileName,
      sizeBytes: file.sizeBytes
    });
    res.status(201).json({ ok: true, file });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Upload failed." });
  }
});

filesRouter.delete("/api/files/events/:eventKey/:fileId", requirePermission("events.update"), async (req, res) => {
  const eventKey = String(req.params.eventKey || "").trim();
  const fileId = String(req.params.fileId || "").trim();
  if (!eventKey) {
    res.status(400).json({ error: "Invalid event id." });
    return;
  }
  if (!fileId) {
    res.status(400).json({ error: "Invalid file id." });
    return;
  }
  try {
    deleteAsset(fileId, {
      actorUserId: req.auth!.userId,
      canManageEvents: true,
      canManageChat: false,
      isSystemAdmin: req.auth!.role === "system_admin",
      expectedEventKey: eventKey
    });
    await writeAudit(req.auth!.userId, "files.event.delete", "file", fileId);
    res.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delete failed.";
    const status = message === "Forbidden" ? 403 : 400;
    res.status(status).json({ error: message });
  }
});

filesRouter.get("/api/files/chat/my", requirePermission("chat.read"), async (req, res) => {
  res.json({
    ok: true,
    items: listChatAssetsForOwner(req.auth!.userId)
  });
});

filesRouter.get("/api/files/chat/thread", requirePermission("chat.read"), async (req, res) => {
  const parsed = z.object({
    scope: z.enum(["global", "direct"]).default("global"),
    peerUserId: z.string().trim().min(1).optional()
  }).safeParse(req.query || {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const scope = parsed.data.scope;
  const peerUserId = scope === "direct" ? String(parsed.data.peerUserId || "").trim() : "";
  if (scope === "direct" && !peerUserId) {
    res.status(400).json({ error: "peerUserId is required for direct thread." });
    return;
  }
  res.json({
    ok: true,
    ...listChatAssetsForThread(req.auth!.userId, scope, peerUserId || null)
  });
});

filesRouter.post("/api/files/chat/upload", requirePermission("chat.write"), async (req, res) => {
  if (!(await parseMultipartUpload(req, res))) return;
  const payload = z.object({
    scope: z.enum(["global", "direct"]).default("global"),
    peerUserId: z.string().trim().min(1).optional()
  }).safeParse(req.body || {});
  if (!payload.success) {
    res.status(400).json({ error: payload.error.flatten() });
    return;
  }
  const uploadPayload = parseUploadBinaryPayload(req.body, req.file);
  if (!uploadPayload.success) {
    res.status(400).json({ error: uploadPayload.error });
    return;
  }

  const scope = payload.data.scope;
  const peerUserId = scope === "direct" ? String(payload.data.peerUserId || "").trim() : "";
  if (scope === "direct" && !peerUserId) {
    res.status(400).json({ error: "peerUserId is required for direct thread." });
    return;
  }

  try {
    const file = uploadChatAsset({
      scope,
      peerUserId: peerUserId || null,
      ...uploadPayload.data,
      currentUserId: req.auth!.userId
    });
    await writeAudit(req.auth!.userId, "files.chat.upload", "file", file.id, {
      scope,
      peerUserId: peerUserId || null,
      fileName: file.fileName,
      sizeBytes: file.sizeBytes
    });
    res.status(201).json({ ok: true, file });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Upload failed." });
  }
});

filesRouter.delete("/api/files/chat/:fileId", requirePermission("chat.write"), async (req, res) => {
  const fileId = String(req.params.fileId || "").trim();
  if (!fileId) {
    res.status(400).json({ error: "Invalid file id." });
    return;
  }
  try {
    deleteAsset(fileId, {
      actorUserId: req.auth!.userId,
      canManageEvents: false,
      canManageChat: true,
      isSystemAdmin: req.auth!.role === "system_admin"
    });
    await writeAudit(req.auth!.userId, "files.chat.delete", "file", fileId);
    res.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delete failed.";
    const status = message === "Forbidden" ? 403 : 400;
    res.status(status).json({ error: message });
  }
});

filesRouter.get("/api/files/archive/my", async (req, res) => {
  const permissions = new Set(req.auth!.permissions || []);
  const canReadEvents = hasPermission(permissions, "events.read") || hasPermission(permissions, "*");
  const canReadChat = hasPermission(permissions, "chat.read") || hasPermission(permissions, "*");
  const archiveData = listUserArchiveAssets({
    userId: req.auth!.userId,
    canReadEvents,
    canReadChat
  });

  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  const userPart = pathSafe(String(req.auth!.userId || "user"));
  const fileName = `procal-user-archive-${userPart}-${stamp}.zip`;

  res.setHeader("content-type", "application/zip");
  res.setHeader("content-disposition", `attachment; filename="${fileName}"`);

  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.on("error", (error) => {
    if (!res.headersSent) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Archive failed." });
      return;
    }
    try {
      res.end();
    } catch {
      // no-op
    }
  });

  archive.pipe(res);
  const manifest = {
    generatedAt: new Date().toISOString(),
    userId: req.auth!.userId,
    username: req.auth!.userId,
    itemsCount: archiveData.items.length,
    totalBytes: archiveData.totalBytes,
    items: archiveData.items.map((item) => ({
      id: item.id,
      scope: item.scope,
      fileName: item.fileName,
      mimeType: item.mimeType,
      sizeBytes: item.sizeBytes,
      createdAt: item.createdAt,
      archivePath: item.archivePath
    }))
  };
  archive.append(JSON.stringify(manifest, null, 2), { name: "manifest.json" });

  for (const item of archiveData.items) {
    archive.file(item.absolutePath, {
      name: item.archivePath,
      date: new Date(item.createdAt || Date.now())
    });
  }

  void writeAudit(req.auth!.userId, "files.archive.download", "file_archive", req.auth!.userId, {
    fileName,
    itemsCount: archiveData.items.length,
    totalBytes: archiveData.totalBytes
  }).catch(() => undefined);

  void archive.finalize();
});

filesRouter.get("/api/admin/files/archive/download", requireRealmFeature("admin_files"), requirePermission("backups.manage"), async (req, res) => {
  const rootDir = getFilesRootDir();
  const realmId = pathSafe(getRealmIdentifier() || "realm");
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  const fileName = `procal-realm-files-${realmId}-${stamp}.zip`;
  const archiveData = listRealmArchiveAssets();

  res.setHeader("content-type", "application/zip");
  res.setHeader("content-disposition", `attachment; filename="${fileName}"`);

  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.on("error", (error) => {
    if (!res.headersSent) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Archive failed." });
      return;
    }
    try {
      res.end();
    } catch {
      // no-op
    }
  });
  archive.pipe(res);

  const usage = getFilesStorageUsage();
  archive.append(JSON.stringify({
    generatedAt: new Date().toISOString(),
    generatedByUserId: req.auth!.userId,
    realmId: getRealmIdentifier(),
    usedBytes: usage.usedBytes,
    limitBytes: usage.limitBytes,
    itemsCount: archiveData.items.length,
    totalBytes: archiveData.totalBytes,
    items: archiveData.items.map((item) => ({
      id: item.id,
      scope: item.scope,
      fileName: item.fileName,
      mimeType: item.mimeType,
      sizeBytes: item.sizeBytes,
      createdAt: item.createdAt,
      relativePath: item.relativePath,
      archivePath: item.archivePath
    }))
  }, null, 2), { name: "manifest.json" });

  const archivedAbsolutePaths = new Set<string>();
  for (const item of archiveData.items) {
    archivedAbsolutePaths.add(item.absolutePath);
    archive.file(item.absolutePath, {
      name: item.archivePath,
      date: new Date(item.createdAt || Date.now())
    });
  }

  const stack = [{ abs: rootDir, rel: "" }];
  while (stack.length) {
    const current = stack.pop();
    if (!current) continue;
    if (!fs.existsSync(current.abs)) continue;
    const entries = fs.readdirSync(current.abs, { withFileTypes: true });
    entries.forEach((entry) => {
      const abs = path.join(current.abs, entry.name);
      const rel = current.rel ? `${current.rel}/${entry.name}` : entry.name;
      const relPosix = rel.replace(/\\/g, "/");
      if (entry.isDirectory()) {
        stack.push({ abs, rel: relPosix });
        return;
      }
      if (!entry.isFile()) return;
      if (archivedAbsolutePaths.has(abs)) return;
      archive.file(abs, { name: relPosix });
    });
  }

  void writeAudit(req.auth!.userId, "files.realm_archive.download", "file_archive", realmId, {
    fileName,
    usedBytes: usage.usedBytes
  }).catch(() => undefined);

  void archive.finalize();
});

filesRouter.get("/api/files/download/:fileId", async (req, res) => {
  const fileId = String(req.params.fileId || "").trim();
  if (!fileId) {
    res.status(400).json({ error: "Invalid file id." });
    return;
  }

  const permissions = new Set(req.auth!.permissions || []);
  try {
    const resolved = resolveAssetForDownload(fileId, {
      userId: req.auth!.userId,
      canReadEvents: hasPermission(permissions, "events.read") || hasPermission(permissions, "*"),
      canReadChat: hasPermission(permissions, "chat.read") || hasPermission(permissions, "*")
    });
    res.setHeader("content-type", resolved.mimeType || "application/octet-stream");
    res.setHeader("content-length", String(resolved.sizeBytes || 0));
    res.setHeader("content-disposition", `attachment; filename="${pathSafe(resolved.fileName)}"`);
    res.sendFile(resolved.absolutePath);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Download failed.";
    const status = message === "Forbidden" ? 403 : 404;
    res.status(status).json({ error: message });
  }
});

filesRouter.get("/api/files/backups", requireRealmFeature("admin_backups"), requirePermission("backups.manage"), async (_req, res) => {
  res.status(410).json({
    error: "Backup catalog is disabled. Realm admins keep backup files outside the platform."
  });
});

filesRouter.get("/api/files/backups/:fileName/download", requireRealmFeature("admin_backups"), requirePermission("backups.manage"), async (_req, res) => {
  res.status(410).json({
    error: "Backup catalog is disabled. Download the backup when it is exported; server-retained backup files are not supported."
  });
});

function pathSafe(fileName: string): string {
  return String(fileName || "file.bin").replace(/[^a-zA-Z0-9._-]/g, "_");
}
