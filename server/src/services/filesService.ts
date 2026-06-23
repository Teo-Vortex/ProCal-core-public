import crypto from "crypto";
import fs from "fs";
import path from "path";
import { getBackupsRootDir, getChatFilesRootDir, getEventsFilesRootDir, getFilesRootDir, getSharedFilesRootDir, ensureFilesPathLayout } from "./filesPathService";

export type FileAssetScope = "event_file" | "event_program" | "chat_file" | "shared_file";
export type ChatThreadScope = "global" | "direct";
export type EventUploadKind = "file" | "program";
export type ExplorerRoot = "chat" | "events" | "backups" | "shared";

type FileAssetRow = {
  id: string;
  scope: FileAssetScope;
  eventKey: string | null;
  threadKey: string | null;
  threadScope: ChatThreadScope | null;
  ownerUserId: string | null;
  createdByUserId: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  relativePath: string;
  createdAt: string;
  deletedAt: string | null;
};

type DownloadResolveResult = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  absolutePath: string;
};

type EventUploadInput = {
  eventKey: string;
  kind: EventUploadKind;
  eventFolderName?: string | null;
  detachedFromCalendar?: boolean | null;
  fileName: string;
  mimeType?: string | null;
  content?: Buffer | null;
  contentBase64?: string | null;
  createdByUserId: string;
};

type ChatUploadInput = {
  scope: ChatThreadScope;
  peerUserId?: string | null;
  fileName: string;
  mimeType?: string | null;
  content?: Buffer | null;
  contentBase64?: string | null;
  currentUserId: string;
};

type SharedUploadInput = {
  path?: string | null;
  fileName: string;
  mimeType?: string | null;
  content?: Buffer | null;
  contentBase64?: string | null;
  createdByUserId: string;
};

type DownloadAccessContext = {
  userId: string;
  canReadEvents: boolean;
  canReadChat: boolean;
};

type DeleteAccessContext = {
  actorUserId: string;
  canManageEvents: boolean;
  canManageChat: boolean;
  isSystemAdmin?: boolean;
  expectedEventKey?: string | null;
};

type UserArchiveAccessContext = {
  userId: string;
  canReadEvents: boolean;
  canReadChat: boolean;
};

export type UserArchiveAsset = {
  id: string;
  scope: FileAssetScope;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  relativePath: string;
  archivePath: string;
  absolutePath: string;
};

export type ExplorerFolderEntry = {
  entryType: "folder";
  name: string;
  path: string;
  locked: boolean;
  eventKey?: string | null;
  canRename?: boolean;
  canMove?: boolean;
  canDelete?: boolean;
  eventDeletedFromCalendar?: boolean;
  eventDeletedAt?: string | null;
  createdAt: string;
  modifiedAt: string;
};

export type ExplorerFileEntry = {
  entryType: "file";
  id: string;
  name: string;
  path: string;
  sizeBytes: number;
  mimeType: string;
  createdAt: string;
  modifiedAt: string;
  scope: FileAssetScope | "backup_file";
  backup: boolean;
  downloadPath: string;
};

export type ExplorerListResult = {
  root: ExplorerRoot;
  path: string;
  eventKey?: string | null;
  breadcrumbs: Array<{ name: string; path: string }>;
  folders: ExplorerFolderEntry[];
  files: ExplorerFileEntry[];
  canCreateFolder: boolean;
  canUpload: boolean;
};

const FILES_INDEX_FILE = path.join(getFilesRootDir(), "index.json");
const EVENT_FOLDERS_FILE = path.join(getFilesRootDir(), "event-folders.json");
const DEFAULT_MAX_BYTES = Math.max(256 * 1024, Number(process.env.FILES_MAX_BYTES || 15 * 1024 * 1024));
const DEFAULT_STORAGE_LIMIT_BYTES = Math.max(DEFAULT_MAX_BYTES, Number(process.env.FILES_STORAGE_LIMIT_BYTES || 1024 * 1024 * 1024));

function formatBytesForLimitMessage(bytes: number): string {
  const value = Math.max(0, Number(bytes || 0));
  const mb = value / (1024 * 1024);
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(2)} GB`;
  }
  return `${Math.max(0.01, mb).toFixed(2)} MB`;
}

function assertStorageCapacity(requiredBytes: number): void {
  const nextBytes = Math.max(0, Number(requiredBytes || 0));
  if (!nextBytes) return;
  const usage = getFilesStorageUsage();
  const projectedBytes = usage.usedBytes + nextBytes;
  if (projectedBytes > usage.limitBytes) {
    throw new Error(
      `Storage quota exceeded. Used ${formatBytesForLimitMessage(usage.usedBytes)} of ${formatBytesForLimitMessage(usage.limitBytes)}.`
    );
  }
}

type EventFolderRow = {
  eventKey: string;
  folderName: string;
  title: string;
  startDate: string;
  endDate: string;
  detachedFromCalendar: boolean;
  deletedFromCalendarAt: string | null;
  updatedAt: string;
};

export type CalendarEventFolderSyncInput = {
  eventKey: string;
  title?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  filesFolderEnabled?: boolean | null;
  filesDetached?: boolean | null;
};

function normalizeText(value: unknown): string {
  return String(value || "").trim();
}

function normalizeDateOnly(value: unknown): string {
  const raw = normalizeText(value);
  if (!raw) return "";
  const direct = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (direct) return direct[0];
  const parsedMs = Date.parse(raw);
  if (!Number.isFinite(parsedMs)) return "";
  return new Date(parsedMs).toISOString().slice(0, 10);
}

function normalizeBooleanFlag(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  const raw = normalizeText(value).toLowerCase();
  if (!raw) return fallback;
  if (["1", "true", "yes", "on"].includes(raw)) return true;
  if (["0", "false", "no", "off"].includes(raw)) return false;
  return fallback;
}

function formatDateForFolderLabel(dateOnly: string): string {
  const normalized = normalizeDateOnly(dateOnly);
  return normalized ? normalized.replace(/-/g, ".") : "";
}

function normalizeSegment(value: unknown, fallback: string): string {
  const cleaned = normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || fallback;
}

function splitPathSegments(value: unknown): string[] {
  const raw = String(value || "").replace(/\\/g, "/").trim();
  if (!raw) return [];
  return raw.split("/").map((segment) => segment.trim()).filter(Boolean);
}

function normalizeDisplayFolderName(value: unknown, fallback: string): string {
  const raw = String(value || "")
    .replace(/[<>:"/\\|?*\x00-\x1F]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const next = raw || fallback;
  return String(next).slice(0, 140);
}

function normalizeEventFolderName(value: unknown, eventKey: string): string {
  const fallback = normalizeSegment(eventKey, "event");
  return normalizeDisplayFolderName(value, fallback);
}

function buildPreferredEventFolderName(eventKey: string, title?: unknown, startDate?: unknown): string {
  const normalizedKey = normalizeSegment(eventKey, "event");
  const safeTitle = normalizeDisplayFolderName(title, "").trim();
  const dateLabel = formatDateForFolderLabel(normalizeDateOnly(startDate));
  if (dateLabel && safeTitle) return normalizeEventFolderName(`${dateLabel} - ${safeTitle}`, normalizedKey);
  if (safeTitle) return normalizeEventFolderName(safeTitle, normalizedKey);
  if (dateLabel) return normalizeEventFolderName(dateLabel, normalizedKey);
  return normalizeEventFolderName(normalizedKey, normalizedKey);
}

function buildEventFolderDisplayName(row: EventFolderRow | null, fallbackFolderName: string): string {
  if (!row) return fallbackFolderName;
  const title = normalizeDisplayFolderName(row.title, "").trim();
  const dateLabel = formatDateForFolderLabel(row.startDate);
  if (dateLabel && title) return `${dateLabel} - ${title}`;
  if (title) return title;
  if (dateLabel) return dateLabel;
  return fallbackFolderName;
}

function normalizeFileName(fileName: string): string {
  const raw = String(fileName || "").trim();
  const base = path.basename(raw).replace(/[<>:"/\\|?*\x00-\x1F]+/g, "_");
  return base || "file.bin";
}

function extractExt(fileName: string, mimeType: string): string {
  const fromName = path.extname(fileName || "").trim().toLowerCase();
  if (fromName && /^[.][a-z0-9]{1,12}$/.test(fromName)) return fromName;
  const mime = String(mimeType || "").trim().toLowerCase();
  if (mime === "application/pdf") return ".pdf";
  if (mime === "image/png") return ".png";
  if (mime === "image/jpeg") return ".jpg";
  if (mime === "image/webp") return ".webp";
  if (mime === "text/plain") return ".txt";
  if (mime === "application/json") return ".json";
  return ".bin";
}

function decodeBase64Payload(contentBase64: string): Buffer {
  const raw = String(contentBase64 || "").trim();
  if (!raw) throw new Error("Missing file content.");
  const match = raw.match(/^data:([^;]+);base64,(.+)$/i);
  const payload = match ? match[2] : raw;
  const buffer = Buffer.from(payload, "base64");
  if (!buffer.length) throw new Error("Invalid file payload.");
  if (buffer.length > DEFAULT_MAX_BYTES) {
    throw new Error(`File is too large. Max size is ${Math.floor(DEFAULT_MAX_BYTES / (1024 * 1024))} MB.`);
  }
  return buffer;
}

function resolveUploadContent(content?: Buffer | null, contentBase64?: string | null): Buffer {
  if (Buffer.isBuffer(content)) {
    if (!content.length) throw new Error("Missing file content.");
    if (content.length > DEFAULT_MAX_BYTES) {
      throw new Error(`File is too large. Max size is ${Math.floor(DEFAULT_MAX_BYTES / (1024 * 1024))} MB.`);
    }
    return content;
  }
  return decodeBase64Payload(String(contentBase64 || ""));
}

function normalizeMimeType(value: unknown): string {
  const mime = normalizeText(value).toLowerCase();
  return mime || "application/octet-stream";
}

function buildThreadKey(scope: ChatThreadScope, userId: string, peerUserId?: string | null): string {
  if (scope === "global") return "global";
  const left = normalizeSegment(userId, "u");
  const right = normalizeSegment(peerUserId || "", "u");
  return left < right ? `dm:${left}:${right}` : `dm:${right}:${left}`;
}

function parseDmThreadKey(threadKey: string): { left: string; right: string } | null {
  const raw = String(threadKey || "");
  const match = raw.match(/^dm:([a-z0-9._-]+):([a-z0-9._-]+)$/);
  if (!match) return null;
  return { left: match[1], right: match[2] };
}

function ensureIndexFile(): void {
  ensureFilesPathLayout();
  if (!fs.existsSync(FILES_INDEX_FILE)) {
    fs.writeFileSync(FILES_INDEX_FILE, JSON.stringify({ items: [] }, null, 2), "utf-8");
  }
}

function normalizeEventFolderRow(input: unknown): EventFolderRow | null {
  if (!input || typeof input !== "object") return null;
  const row = input as Record<string, unknown>;
  const eventKey = normalizeSegment(row.eventKey, "");
  const folderName = normalizeDisplayFolderName(row.folderName, "");
  if (!eventKey || !folderName) return null;
  const title = normalizeDisplayFolderName(row.title, "").trim();
  const startDate = normalizeDateOnly(row.startDate);
  const endDate = normalizeDateOnly(row.endDate) || startDate;
  const detachedFromCalendar = normalizeBooleanFlag(row.detachedFromCalendar, false);
  const deletedRaw = normalizeText(row.deletedFromCalendarAt);
  const deletedFromCalendarAt = deletedRaw && !Number.isNaN(Date.parse(deletedRaw))
    ? new Date(deletedRaw).toISOString()
    : null;
  const updatedAtRaw = normalizeText(row.updatedAt);
  const updatedAt = updatedAtRaw && !Number.isNaN(Date.parse(updatedAtRaw))
    ? new Date(updatedAtRaw).toISOString()
    : new Date().toISOString();
  return {
    eventKey,
    folderName,
    title,
    startDate,
    endDate,
    detachedFromCalendar,
    deletedFromCalendarAt,
    updatedAt
  };
}

function ensureEventFoldersFile(): void {
  ensureFilesPathLayout();
  if (!fs.existsSync(EVENT_FOLDERS_FILE)) {
    fs.writeFileSync(EVENT_FOLDERS_FILE, JSON.stringify({ items: [] }, null, 2), "utf-8");
  }
}

function loadEventFolderRows(): EventFolderRow[] {
  ensureEventFoldersFile();
  try {
    const parsed = JSON.parse(fs.readFileSync(EVENT_FOLDERS_FILE, "utf-8")) as { items?: unknown[] };
    return Array.isArray(parsed.items)
      ? parsed.items.map(normalizeEventFolderRow).filter(Boolean) as EventFolderRow[]
      : [];
  } catch {
    return [];
  }
}

function saveEventFolderRows(rows: EventFolderRow[]): void {
  ensureEventFoldersFile();
  const normalized = rows.map(normalizeEventFolderRow).filter(Boolean) as EventFolderRow[];
  fs.writeFileSync(EVENT_FOLDERS_FILE, JSON.stringify({ items: normalized }, null, 2), "utf-8");
}

function getEventFolderFromRelativePath(relativePath: string): string | null {
  const segments = splitPathSegments(relativePath);
  if (!segments.length) return null;
  if (segments[0] === "events" && segments.length >= 2) {
    return segments[1];
  }
  if (segments[0] !== "events") return null;
  return null;
}

function findEventFolderRowByFolderName(folderName: string, rows?: EventFolderRow[] | null): EventFolderRow | null {
  const normalized = normalizeDisplayFolderName(folderName, "").trim().toLowerCase();
  if (!normalized) return null;
  const sourceRows = Array.isArray(rows) ? rows : loadEventFolderRows();
  return sourceRows.find((row) => String(row.folderName || "").trim().toLowerCase() === normalized) || null;
}

function findEventFolderRowByEventKey(eventKey: string, rows?: EventFolderRow[] | null): EventFolderRow | null {
  const normalized = normalizeSegment(eventKey, "");
  if (!normalized) return null;
  const sourceRows = Array.isArray(rows) ? rows : loadEventFolderRows();
  return sourceRows.find((row) => row.eventKey === normalized) || null;
}

function findEventFolderRowByPath(relPath: string, rows?: EventFolderRow[] | null): EventFolderRow | null {
  const segments = getPathSegments(relPath);
  if (!segments.length) return null;
  return findEventFolderRowByFolderName(String(segments[0] || ""), rows);
}

function isDeletedCalendarEventFolderPath(relPath: string, rows?: EventFolderRow[] | null): boolean {
  const segments = getPathSegments(relPath);
  if (segments.length !== 1) return false;
  const row = findEventFolderRowByPath(relPath, rows);
  return Boolean(row && row.deletedFromCalendarAt);
}

function inferEventFolderForKey(eventKey: string, rows: FileAssetRow[]): string | null {
  const hit = rows.find((row) => (
    !row.deletedAt
    && row.eventKey === eventKey
    && (row.scope === "event_file" || row.scope === "event_program")
  ));
  if (!hit) return null;
  return getEventFolderFromRelativePath(hit.relativePath);
}

function ensureUniqueEventFolderName(
  baseName: string,
  eventKey: string,
  rows: EventFolderRow[],
  allowExactName?: string | null
): string {
  const eventsRoot = getEventsFilesRootDir();
  const lowerTaken = new Set<string>();
  rows.forEach((row) => {
    if (!row || row.eventKey === eventKey) return;
    lowerTaken.add(String(row.folderName || "").toLowerCase());
  });
  if (fs.existsSync(eventsRoot)) {
    try {
      fs.readdirSync(eventsRoot, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .forEach((entry) => lowerTaken.add(String(entry.name || "").toLowerCase()));
    } catch {
      // Ignore directory listing failures and keep map-only uniqueness check.
    }
  }

  const base = normalizeDisplayFolderName(baseName, normalizeSegment(eventKey, "event"));
  const allowedLower = String(allowExactName || "").trim().toLowerCase();
  let candidate = base;
  let suffix = 2;
  while (lowerTaken.has(candidate.toLowerCase()) && candidate.toLowerCase() !== allowedLower) {
    candidate = `${base} (${suffix})`;
    suffix += 1;
  }
  return candidate;
}

function upsertEventFolderForKey(
  eventKey: string,
  folderName: string,
  rows?: EventFolderRow[],
  options?: {
    allowExactName?: string | null;
    title?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    detachedFromCalendar?: boolean | null;
    deletedFromCalendarAt?: string | null;
  }
): string {
  const normalizedEventKey = normalizeSegment(eventKey, "event");
  const currentRows = Array.isArray(rows) ? rows.slice() : loadEventFolderRows();
  const normalizedFolder = normalizeEventFolderName(folderName, normalizedEventKey);
  const uniqueFolder = ensureUniqueEventFolderName(
    normalizedFolder,
    normalizedEventKey,
    currentRows,
    options && options.allowExactName ? options.allowExactName : null
  );
  const nowIso = new Date().toISOString();
  const existingIndex = currentRows.findIndex((row) => row.eventKey === normalizedEventKey);
  const existing = existingIndex >= 0 ? currentRows[existingIndex] : null;
  const titleFromOptions = normalizeDisplayFolderName(options && options.title || "", "").trim();
  const startDateFromOptions = normalizeDateOnly(options && options.startDate || "");
  const endDateFromOptions = normalizeDateOnly(options && options.endDate || "") || startDateFromOptions;
  const deletedRaw = normalizeText(options && options.deletedFromCalendarAt || "");
  const deletedFromOptions = deletedRaw && !Number.isNaN(Date.parse(deletedRaw))
    ? new Date(deletedRaw).toISOString()
    : null;
  const title = titleFromOptions || (existing ? existing.title : "");
  const startDate = startDateFromOptions || (existing ? existing.startDate : "");
  const endDate = endDateFromOptions || (existing ? existing.endDate : startDate);
  const detachedFromCalendar = options && Object.prototype.hasOwnProperty.call(options, "detachedFromCalendar")
    ? normalizeBooleanFlag(options.detachedFromCalendar, false)
    : (existing ? Boolean(existing.detachedFromCalendar) : false);
  const deletedFromCalendarAt = options && Object.prototype.hasOwnProperty.call(options, "deletedFromCalendarAt")
    ? deletedFromOptions
    : (existing ? existing.deletedFromCalendarAt : null);
  if (existingIndex >= 0) {
    currentRows[existingIndex] = {
      eventKey: normalizedEventKey,
      folderName: uniqueFolder,
      title,
      startDate,
      endDate,
      detachedFromCalendar,
      deletedFromCalendarAt,
      updatedAt: nowIso
    };
  } else {
    currentRows.unshift({
      eventKey: normalizedEventKey,
      folderName: uniqueFolder,
      title,
      startDate,
      endDate,
      detachedFromCalendar,
      deletedFromCalendarAt,
      updatedAt: nowIso
    });
  }
  saveEventFolderRows(currentRows);
  return uniqueFolder;
}

function resolveEventFolderName(
  eventKey: string,
  rows: FileAssetRow[],
  preferredFolderName?: string | null,
  options?: {
    detachedFromCalendar?: boolean | null;
  }
): string {
  const normalizedEventKey = normalizeSegment(eventKey, "event");
  const folderRows = loadEventFolderRows();
  const existing = folderRows.find((row) => row.eventKey === normalizedEventKey);
  if (existing && existing.folderName) {
    return normalizeEventFolderName(existing.folderName, normalizedEventKey);
  }

  const inferred = inferEventFolderForKey(normalizedEventKey, rows);
  if (inferred) {
    return upsertEventFolderForKey(
      normalizedEventKey,
      inferred,
      folderRows,
      {
        allowExactName: inferred,
        detachedFromCalendar: options && Object.prototype.hasOwnProperty.call(options, "detachedFromCalendar")
          ? options.detachedFromCalendar
          : undefined
      }
    );
  }

  return upsertEventFolderForKey(
    normalizedEventKey,
    normalizeEventFolderName(preferredFolderName, normalizedEventKey),
    folderRows,
    {
      detachedFromCalendar: options && Object.prototype.hasOwnProperty.call(options, "detachedFromCalendar")
        ? options.detachedFromCalendar
        : undefined
    }
  );
}

export function resolveEventKeyByFolderName(folderName: string): string | null {
  const normalizedFolder = normalizeDisplayFolderName(folderName, "").trim().toLowerCase();
  if (!normalizedFolder) return null;

  const folderRows = loadEventFolderRows();
  const mapped = folderRows.find((row) => String(row.folderName || "").trim().toLowerCase() === normalizedFolder);
  if (mapped && mapped.eventKey) {
    return normalizeSegment(mapped.eventKey, "");
  }

  const rows = loadIndexRows();
  const inferred = rows.find((row) => {
    if (row.deletedAt) return false;
    if (row.scope !== "event_file" && row.scope !== "event_program") return false;
    const rowFolder = getEventFolderFromRelativePath(row.relativePath);
    if (!rowFolder) return false;
    return String(rowFolder).trim().toLowerCase() === normalizedFolder && Boolean(row.eventKey);
  });
  if (inferred && inferred.eventKey) {
    return normalizeSegment(inferred.eventKey, "");
  }
  return null;
}

export function syncEventFoldersFromCalendarEvents(events: CalendarEventFolderSyncInput[]): {
  created: number;
  renamed: number;
  markedDeleted: number;
  reactivated: number;
} {
  ensureFilesPathLayout();
  const eventsRoot = getEventsFilesRootDir();
  if (!fs.existsSync(eventsRoot)) fs.mkdirSync(eventsRoot, { recursive: true });

  const uniqueByKey = new Map<string, CalendarEventFolderSyncInput>();
  (Array.isArray(events) ? events : []).forEach((raw) => {
    const eventKey = normalizeSegment(raw && raw.eventKey, "");
    if (!eventKey) return;
    const previous = uniqueByKey.get(eventKey);
    if (!previous) {
      uniqueByKey.set(eventKey, raw);
      return;
    }
    const prevHasTitle = Boolean(normalizeText(previous.title));
    const nextHasTitle = Boolean(normalizeText(raw.title));
    const prevHasDate = Boolean(normalizeDateOnly(previous.startDate));
    const nextHasDate = Boolean(normalizeDateOnly(raw.startDate));
    if ((!prevHasTitle && nextHasTitle) || (!prevHasDate && nextHasDate)) {
      uniqueByKey.set(eventKey, raw);
    }
  });

  const activeKeys = new Set(uniqueByKey.keys());
  const nowIso = new Date().toISOString();
  let rows = loadEventFolderRows();
  let indexRows = loadIndexRows();
  let indexChanged = false;
  let created = 0;
  let renamed = 0;
  let markedDeleted = 0;
  let reactivated = 0;

  uniqueByKey.forEach((event, eventKey) => {
    const title = normalizeDisplayFolderName(event && event.title || "", "").trim();
    const startDate = normalizeDateOnly(event && event.startDate || "");
    const endDate = normalizeDateOnly(event && event.endDate || "") || startDate;
    const filesFolderEnabled = normalizeBooleanFlag(event && event.filesFolderEnabled, true);
    const detachedFromCalendar = normalizeBooleanFlag(event && event.filesDetached, false);
    const preferredFolderName = buildPreferredEventFolderName(eventKey, title, startDate);
    const existingIndex = rows.findIndex((row) => row.eventKey === eventKey);
    const existing = existingIndex >= 0 ? rows[existingIndex] : null;
    const inferredFolder = !existing ? inferEventFolderForKey(eventKey, indexRows) : null;
    const oldFolderName = existing
      ? normalizeEventFolderName(existing.folderName, eventKey)
      : (inferredFolder ? normalizeEventFolderName(inferredFolder, eventKey) : "");
    if (!filesFolderEnabled) {
      if (!existing && !oldFolderName) {
        return;
      }
      const keepFolderName = oldFolderName || ensureUniqueEventFolderName(preferredFolderName, eventKey, rows);
      const nextRow: EventFolderRow = {
        eventKey,
        folderName: keepFolderName,
        title,
        startDate,
        endDate,
        detachedFromCalendar: true,
        deletedFromCalendarAt: null,
        updatedAt: nowIso
      };
      if (!existing) {
        created += 1;
        rows.unshift(nextRow);
      } else {
        if (existing.deletedFromCalendarAt) reactivated += 1;
        rows[existingIndex] = nextRow;
      }
      return;
    }

    let nextFolderName = oldFolderName && detachedFromCalendar
      ? oldFolderName
      : ensureUniqueEventFolderName(
        preferredFolderName,
        eventKey,
        rows,
        oldFolderName || null
      );

    if (!detachedFromCalendar && oldFolderName && oldFolderName !== nextFolderName) {
      const oldAbs = path.join(eventsRoot, oldFolderName);
      const nextAbs = path.join(eventsRoot, nextFolderName);
      if (fs.existsSync(oldAbs) && fs.statSync(oldAbs).isDirectory() && !fs.existsSync(nextAbs)) {
        fs.renameSync(oldAbs, nextAbs);
        const oldPrefix = toPosixPath(path.posix.join("events", oldFolderName));
        const newPrefix = toPosixPath(path.posix.join("events", nextFolderName));
        indexRows = updateRowsForMovedPrefix(indexRows, oldPrefix, newPrefix);
        indexChanged = true;
        renamed += 1;
      } else if (fs.existsSync(nextAbs)) {
        nextFolderName = oldFolderName;
      }
    }

    if (!existing) {
      created += 1;
    } else if (existing.deletedFromCalendarAt) {
      reactivated += 1;
    }

    const folderAbs = path.join(eventsRoot, nextFolderName);
    if (!detachedFromCalendar || !oldFolderName || fs.existsSync(folderAbs)) {
      if (!fs.existsSync(folderAbs)) fs.mkdirSync(folderAbs, { recursive: true });
      const programAbs = path.join(folderAbs, "program");
      const otherAbs = path.join(folderAbs, "other");
      if (!fs.existsSync(programAbs)) fs.mkdirSync(programAbs, { recursive: true });
      if (!fs.existsSync(otherAbs)) fs.mkdirSync(otherAbs, { recursive: true });
    }

    const nextRow: EventFolderRow = {
      eventKey,
      folderName: nextFolderName,
      title,
      startDate,
      endDate,
      detachedFromCalendar,
      deletedFromCalendarAt: null,
      updatedAt: nowIso
    };

    if (existingIndex >= 0) {
      rows[existingIndex] = nextRow;
    } else {
      rows.unshift(nextRow);
    }
  });

  rows = rows.map((row) => {
    if (activeKeys.has(row.eventKey)) return row;
    if (row.detachedFromCalendar) return row;
    if (row.deletedFromCalendarAt) return row;
    markedDeleted += 1;
    return {
      ...row,
      deletedFromCalendarAt: nowIso,
      updatedAt: nowIso
    };
  });

  saveEventFolderRows(rows);
  if (indexChanged) {
    saveIndexRows(sortRowsByDateDesc(indexRows));
  }

  return {
    created,
    renamed,
    markedDeleted,
    reactivated
  };
}

function normalizeRow(input: unknown): FileAssetRow | null {
  if (!input || typeof input !== "object") return null;
  const row = input as Record<string, unknown>;
  const id = normalizeText(row.id);
  const scope = normalizeText(row.scope) as FileAssetScope;
  const createdByUserId = normalizeSegment(row.createdByUserId, "");
  const relativePath = String(row.relativePath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!id || !["event_file", "event_program", "chat_file", "shared_file"].includes(scope) || !createdByUserId || !relativePath) {
    return null;
  }
  return {
    id,
    scope,
    eventKey: row.eventKey == null ? null : normalizeSegment(row.eventKey, "event"),
    threadKey: row.threadKey == null ? null : normalizeText(row.threadKey),
    threadScope: row.threadScope === "direct" ? "direct" : (row.threadScope === "global" ? "global" : null),
    ownerUserId: row.ownerUserId == null ? null : normalizeSegment(row.ownerUserId, "u"),
    createdByUserId,
    originalFileName: normalizeFileName(String(row.originalFileName || "file.bin")),
    mimeType: normalizeMimeType(row.mimeType),
    sizeBytes: Math.max(0, Number(row.sizeBytes || 0) || 0),
    relativePath,
    createdAt: normalizeText(row.createdAt) || new Date().toISOString(),
    deletedAt: row.deletedAt == null ? null : normalizeText(row.deletedAt) || null
  };
}

function loadIndexRows(): FileAssetRow[] {
  ensureIndexFile();
  try {
    const parsed = JSON.parse(fs.readFileSync(FILES_INDEX_FILE, "utf-8")) as { items?: unknown[] };
    const rows = Array.isArray(parsed.items) ? parsed.items.map(normalizeRow).filter(Boolean) as FileAssetRow[] : [];
    return rows.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  } catch {
    return [];
  }
}

function saveIndexRows(rows: FileAssetRow[]): void {
  ensureIndexFile();
  const normalized = rows.map(normalizeRow).filter(Boolean) as FileAssetRow[];
  fs.writeFileSync(FILES_INDEX_FILE, JSON.stringify({ items: normalized }, null, 2), "utf-8");
}

function buildPublicRow(row: FileAssetRow) {
  return {
    id: row.id,
    scope: row.scope,
    eventKey: row.eventKey,
    threadKey: row.threadKey,
    threadScope: row.threadScope,
    ownerUserId: row.ownerUserId,
    createdByUserId: row.createdByUserId,
    fileName: row.originalFileName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    createdAt: row.createdAt,
    downloadPath: `/api/files/download/${encodeURIComponent(row.id)}`
  };
}

function markDeleted(rows: FileAssetRow[], predicate: (row: FileAssetRow) => boolean): FileAssetRow[] {
  const now = new Date().toISOString();
  return rows.map((row) => {
    if (!row.deletedAt && predicate(row)) {
      return { ...row, deletedAt: now };
    }
    return row;
  });
}

function writeBinary(relativePath: string, content: Buffer): void {
  const absolutePath = path.join(getFilesRootDir(), relativePath);
  const dir = path.dirname(absolutePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(absolutePath, content);
}

function unlinkQuiet(relativePath: string): void {
  const absolutePath = path.join(getFilesRootDir(), relativePath);
  if (absolutePath.startsWith(getFilesRootDir()) && fs.existsSync(absolutePath)) {
    try {
      fs.unlinkSync(absolutePath);
    } catch {
      // Ignore unlink failures to keep metadata cleanup resilient.
    }
  }
}

function createRow(params: {
  scope: FileAssetScope;
  eventKey?: string | null;
  threadKey?: string | null;
  threadScope?: ChatThreadScope | null;
  ownerUserId?: string | null;
  createdByUserId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  relativePath: string;
}): FileAssetRow {
  return {
    id: `fl_${crypto.randomBytes(8).toString("hex")}`,
    scope: params.scope,
    eventKey: params.eventKey || null,
    threadKey: params.threadKey || null,
    threadScope: params.threadScope || null,
    ownerUserId: params.ownerUserId || null,
    createdByUserId: normalizeSegment(params.createdByUserId, "u"),
    originalFileName: normalizeFileName(params.fileName),
    mimeType: normalizeMimeType(params.mimeType),
    sizeBytes: Math.max(0, Number(params.sizeBytes || 0)),
    relativePath: params.relativePath.replace(/\\/g, "/"),
    createdAt: new Date().toISOString(),
    deletedAt: null
  };
}

function sortRowsByDateDesc(items: FileAssetRow[]): FileAssetRow[] {
  return items.slice().sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

function canReadChatRow(row: FileAssetRow, userId: string): boolean {
  if (row.scope !== "chat_file") return false;
  const normalizedUser = normalizeSegment(userId, "");
  if (!normalizedUser) return false;
  if (row.threadScope === "global") return true;
  const parsed = parseDmThreadKey(String(row.threadKey || ""));
  if (!parsed) return false;
  return parsed.left === normalizedUser || parsed.right === normalizedUser;
}

export function listEventAssets(eventKey: string) {
  const normalizedEvent = normalizeSegment(eventKey, "event");
  const allRows = loadIndexRows();
  const rows = allRows.filter((row) => !row.deletedAt && row.eventKey === normalizedEvent);
  const program = rows.find((row) => row.scope === "event_program") || null;
  const files = rows
    .filter((row) => row.scope === "event_file")
    .map(buildPublicRow);
  const folderRow = findEventFolderRowByEventKey(normalizedEvent);
  const inferredFolder = inferEventFolderForKey(normalizedEvent, allRows);
  const folderPath = folderRow && folderRow.folderName
    ? normalizeEventFolderName(folderRow.folderName, normalizedEvent)
    : (inferredFolder ? normalizeEventFolderName(inferredFolder, normalizedEvent) : "");
  return {
    eventKey: normalizedEvent,
    folderPath,
    defaultPath: folderPath ? `${folderPath}/other` : "",
    program: program ? buildPublicRow(program) : null,
    files
  };
}

export function listChatAssetsForOwner(ownerUserId: string) {
  const owner = normalizeSegment(ownerUserId, "u");
  const rows = loadIndexRows()
    .filter((row) => !row.deletedAt && row.scope === "chat_file" && row.ownerUserId === owner)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return rows.map(buildPublicRow);
}

export function listChatAssetsForThread(userId: string, scope: ChatThreadScope, peerUserId?: string | null) {
  const threadKey = buildThreadKey(scope, userId, peerUserId);
  const rows = loadIndexRows()
    .filter((row) => !row.deletedAt && row.scope === "chat_file" && row.threadKey === threadKey)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return {
    scope,
    threadKey,
    items: rows.map(buildPublicRow)
  };
}

export function uploadEventAsset(input: EventUploadInput) {
  const eventKey = normalizeSegment(input.eventKey, "event");
  const kind = input.kind === "program" ? "program" : "file";
  const fileName = normalizeFileName(input.fileName);
  const mimeType = normalizeMimeType(input.mimeType);
  const content = resolveUploadContent(input.content, input.contentBase64);
  const ext = extractExt(fileName, mimeType);

  const rows = loadIndexRows();
  const eventFolderName = resolveEventFolderName(
    eventKey,
    rows,
    input.eventFolderName || null,
    { detachedFromCalendar: input.detachedFromCalendar }
  );
  let nextRows = rows;
  if (kind === "program") {
    const toDelete = rows.filter((row) => !row.deletedAt && row.scope === "event_program" && row.eventKey === eventKey);
    for (const row of toDelete) unlinkQuiet(row.relativePath);
    nextRows = markDeleted(rows, (row) => !row.deletedAt && row.scope === "event_program" && row.eventKey === eventKey);
  }

  const folder = kind === "program" ? "program" : "other";
  const relativeBaseDir = path.posix.join("events", eventFolderName, folder);
  const recordId = `fl_${crypto.randomBytes(8).toString("hex")}`;
  const storedName = `${recordId}${ext}`;
  const relativePath = path.posix.join(relativeBaseDir, storedName);
  assertStorageCapacity(content.length);
  writeBinary(relativePath, content);

  const row = createRow({
    scope: kind === "program" ? "event_program" : "event_file",
    eventKey,
    createdByUserId: input.createdByUserId,
    fileName,
    mimeType,
    sizeBytes: content.length,
    relativePath
  });
  row.id = recordId;
  nextRows.unshift(row);
  saveIndexRows(sortRowsByDateDesc(nextRows));

  return buildPublicRow(row);
}

export function uploadChatAsset(input: ChatUploadInput) {
  const scope = input.scope === "direct" ? "direct" : "global";
  const ownerUserId = normalizeSegment(input.currentUserId, "u");
  const peerUserId = scope === "direct" ? normalizeSegment(input.peerUserId || "", "u") : null;
  if (scope === "direct" && (!peerUserId || peerUserId === ownerUserId)) {
    throw new Error("Invalid direct recipient.");
  }

  const fileName = normalizeFileName(input.fileName);
  const mimeType = normalizeMimeType(input.mimeType);
  const content = resolveUploadContent(input.content, input.contentBase64);
  const ext = extractExt(fileName, mimeType);
  const threadKey = buildThreadKey(scope, ownerUserId, peerUserId);
  const rows = loadIndexRows();
  const copyCount = scope === "direct" && peerUserId && peerUserId !== ownerUserId ? 2 : 1;
  assertStorageCapacity(content.length * copyCount);

  const createChatRowForOwner = (targetOwnerUserId: string) => {
    const recordId = `fl_${crypto.randomBytes(8).toString("hex")}`;
    const relativePath = path.posix.join("chat", targetOwnerUserId, threadKey, `${recordId}${ext}`);
    writeBinary(relativePath, content);
    const row = createRow({
      scope: "chat_file",
      threadKey,
      threadScope: scope,
      ownerUserId: targetOwnerUserId,
      createdByUserId: ownerUserId,
      fileName,
      mimeType,
      sizeBytes: content.length,
      relativePath
    });
    row.id = recordId;
    rows.unshift(row);
    return row;
  };

  const senderRow = createChatRowForOwner(ownerUserId);
  if (scope === "direct" && peerUserId && peerUserId !== ownerUserId) {
    createChatRowForOwner(peerUserId);
  }

  saveIndexRows(sortRowsByDateDesc(rows));
  return buildPublicRow(senderRow);
}

export function uploadSharedAsset(input: SharedUploadInput) {
  const actorUserId = normalizeSegment(input.createdByUserId, "u");
  const fileName = normalizeFileName(input.fileName);
  const mimeType = normalizeMimeType(input.mimeType);
  const content = resolveUploadContent(input.content, input.contentBase64);
  const ext = extractExt(fileName, mimeType);
  const target = resolveRootPath("shared", normalizeExplorerPath(input.path || ""));
  if (!fs.existsSync(target.abs) || !fs.statSync(target.abs).isDirectory()) {
    throw new Error("Destination folder not found.");
  }

  const recordId = `fl_${crypto.randomBytes(8).toString("hex")}`;
  const relativePath = path.posix.join("shared", target.path, `${recordId}${ext}`);
  assertStorageCapacity(content.length);
  writeBinary(relativePath, content);

  const rows = loadIndexRows();
  const row = createRow({
    scope: "shared_file",
    createdByUserId: actorUserId,
    fileName,
    mimeType,
    sizeBytes: content.length,
    relativePath
  });
  row.id = recordId;
  rows.unshift(row);
  saveIndexRows(sortRowsByDateDesc(rows));
  return buildPublicRow(row);
}

export function resolveAssetForDownload(fileId: string, ctx: DownloadAccessContext): DownloadResolveResult {
  const id = normalizeText(fileId);
  const userId = normalizeSegment(ctx.userId, "");
  if (!id || !userId) throw new Error("Invalid file id.");

  const row = loadIndexRows().find((item) => item.id === id && !item.deletedAt);
  if (!row) throw new Error("File not found.");

  if ((row.scope === "event_file" || row.scope === "event_program") && !ctx.canReadEvents) {
    throw new Error("Forbidden");
  }
  if (row.scope === "chat_file") {
    if (!ctx.canReadChat || !canReadChatRow(row, userId)) {
      throw new Error("Forbidden");
    }
  }

  const absolutePath = path.join(getFilesRootDir(), row.relativePath);
  if (!absolutePath.startsWith(getFilesRootDir()) || !fs.existsSync(absolutePath)) {
    throw new Error("File is missing from storage.");
  }

  return {
    id: row.id,
    fileName: row.originalFileName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    absolutePath
  };
}

export function deleteAsset(fileId: string, ctx: DeleteAccessContext): { ok: true } {
  const id = normalizeText(fileId);
  const actorUserId = normalizeSegment(ctx.actorUserId, "");
  if (!id || !actorUserId) throw new Error("Invalid file id.");

  const rows = loadIndexRows();
  const target = rows.find((row) => row.id === id && !row.deletedAt);
  if (!target) throw new Error("File not found.");

  if (target.scope === "event_file" || target.scope === "event_program") {
    if (!ctx.canManageEvents) throw new Error("Forbidden");
    const expectedEventKey = normalizeSegment(ctx.expectedEventKey || "", "");
    const actualEventKey = normalizeSegment(target.eventKey || "", "");
    if (expectedEventKey && actualEventKey !== expectedEventKey) {
      throw new Error("File does not belong to this event.");
    }
  } else if (target.scope === "chat_file") {
    const isOwner = target.ownerUserId === actorUserId || target.createdByUserId === actorUserId;
    if (!ctx.canManageChat || (!isOwner && !ctx.isSystemAdmin)) {
      throw new Error("Forbidden");
    }
  } else if (target.scope === "shared_file") {
    const isOwner = target.createdByUserId === actorUserId;
    if (!isOwner && !ctx.isSystemAdmin) {
      throw new Error("Forbidden");
    }
  }

  unlinkQuiet(target.relativePath);
  const nextRows = rows.map((row) => {
    if (row.id !== id || row.deletedAt) return row;
    return {
      ...row,
      deletedAt: new Date().toISOString()
    };
  });
  saveIndexRows(sortRowsByDateDesc(nextRows));
  return { ok: true };
}

export function purgeChatFileAssetsOlderThan(retentionDays: number): {
  deletedRows: number;
  deletedBytes: number;
} {
  const days = Math.max(0, Math.trunc(Number(retentionDays || 0)));
  if (days <= 0) return { deletedRows: 0, deletedBytes: 0 };

  const cutoffMs = Date.now() - days * 24 * 60 * 60 * 1000;
  const rows = loadIndexRows();
  let deletedRows = 0;
  let deletedBytes = 0;
  const nowIso = new Date().toISOString();

  const nextRows = rows.map((row) => {
    if (row.deletedAt || row.scope !== "chat_file") return row;
    const createdAtMs = Date.parse(String(row.createdAt || ""));
    if (!Number.isFinite(createdAtMs) || createdAtMs >= cutoffMs) return row;
    unlinkQuiet(row.relativePath);
    deletedRows += 1;
    deletedBytes += Math.max(0, Number(row.sizeBytes || 0));
    return {
      ...row,
      deletedAt: nowIso
    };
  });

  if (deletedRows > 0) {
    saveIndexRows(sortRowsByDateDesc(nextRows));
  }
  return { deletedRows, deletedBytes };
}

function buildAbsolutePath(relativePath: string): string | null {
  const absolutePath = path.join(getFilesRootDir(), String(relativePath || ""));
  if (!absolutePath.startsWith(getFilesRootDir())) return null;
  if (!fs.existsSync(absolutePath)) return null;
  return absolutePath;
}

function safeArchiveName(value: string, fallback: string): string {
  const clean = String(value || "")
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]+/g, "_");
  return clean || fallback;
}

function readDirectorySize(dirPath: string): number {
  if (!fs.existsSync(dirPath)) return 0;
  let total = 0;
  const stack = [dirPath];
  while (stack.length) {
    const current = stack.pop();
    if (!current) continue;
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      if (!entry.isFile()) continue;
      try {
        total += Math.max(0, fs.statSync(fullPath).size || 0);
      } catch {
        // ignore unreadable files
      }
    }
  }
  return total;
}

function ensureUniqueArchivePath(basePath: string, used: Set<string>): string {
  const normalizedBase = String(basePath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!used.has(normalizedBase)) {
    used.add(normalizedBase);
    return normalizedBase;
  }
  const ext = path.posix.extname(normalizedBase);
  const stem = ext ? normalizedBase.slice(0, -ext.length) : normalizedBase;
  let counter = 2;
  let candidate = `${stem}-${counter}${ext}`;
  while (used.has(candidate)) {
    counter += 1;
    candidate = `${stem}-${counter}${ext}`;
  }
  used.add(candidate);
  return candidate;
}

function buildHumanArchivePath(row: Pick<FileAssetRow, "id" | "relativePath" | "originalFileName">): string {
  const rel = toPosixPath(row.relativePath || "");
  const segs = splitPathSegments(rel);
  const safeFolders = segs
    .slice(0, Math.max(0, segs.length - 1))
    .map((segment) => safeArchiveName(segment, "folder"));
  const archiveFileName = safeArchiveName(String(row.originalFileName || ""), `${String(row.id || "file")}_file.bin`);
  return safeFolders.length
    ? path.posix.join(...safeFolders, archiveFileName)
    : archiveFileName;
}

function normalizeFolderName(value: string): string {
  const cleaned = String(value || "")
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\s+/g, " ");
  if (!cleaned) throw new Error("Folder name is required.");
  if (cleaned === "." || cleaned === "..") throw new Error("Invalid folder name.");
  return cleaned.slice(0, 128);
}

function normalizeExplorerPath(value: unknown): string {
  const raw = String(value || "").replace(/\\/g, "/").trim();
  if (!raw) return "";
  const parts = raw
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => {
      if (segment === "." || segment === "..") return "";
      return segment.replace(/[<>"/\\|?*\x00-\x1F]/g, "_").slice(0, 128);
    })
    .filter(Boolean);
  return parts.join("/");
}

function toPosixPath(value: string): string {
  return String(value || "").replace(/\\/g, "/").replace(/^\/+/, "");
}

function getRootDir(root: ExplorerRoot): string {
  if (root === "events") return getEventsFilesRootDir();
  if (root === "chat") return getChatFilesRootDir();
  if (root === "shared") return getSharedFilesRootDir();
  return getBackupsRootDir();
}

function ensureRootReady(root: ExplorerRoot): void {
  ensureFilesPathLayout();
  const rootDir = getRootDir(root);
  if (!fs.existsSync(rootDir)) fs.mkdirSync(rootDir, { recursive: true });
}

function resolveRootPath(root: ExplorerRoot, maybePath?: string | null): { rootDir: string; path: string; abs: string } {
  ensureRootReady(root);
  const rootDir = path.resolve(getRootDir(root));
  const rel = normalizeExplorerPath(maybePath || "");
  const abs = path.resolve(rootDir, rel || ".");
  if (abs !== rootDir && !abs.startsWith(`${rootDir}${path.sep}`)) {
    throw new Error("Invalid path.");
  }
  return { rootDir, path: rel, abs };
}

function relativeToFilesRoot(absPath: string): string {
  const filesRoot = path.resolve(getFilesRootDir());
  const resolved = path.resolve(absPath);
  if (resolved !== filesRoot && !resolved.startsWith(`${filesRoot}${path.sep}`)) {
    throw new Error("Invalid files path.");
  }
  return toPosixPath(path.relative(filesRoot, resolved));
}

function rowReadableByContext(row: FileAssetRow, ctx: {
  userId: string;
  canReadEvents: boolean;
  canReadChat: boolean;
}): boolean {
  if (row.scope === "event_file" || row.scope === "event_program") {
    return Boolean(ctx.canReadEvents);
  }
  if (row.scope === "chat_file") {
    return Boolean(ctx.canReadChat) && canReadChatRow(row, ctx.userId);
  }
  if (row.scope === "shared_file") {
    return true;
  }
  return false;
}

function rowWritableByContext(row: FileAssetRow, ctx: {
  actorUserId: string;
  canManageEvents: boolean;
  canManageChat: boolean;
  isSystemAdmin?: boolean;
}): boolean {
  if (row.scope === "event_file" || row.scope === "event_program") {
    return Boolean(ctx.canManageEvents);
  }
  if (row.scope === "chat_file") {
    const actor = normalizeSegment(ctx.actorUserId, "");
    const isOwner = row.ownerUserId === actor || row.createdByUserId === actor;
    return Boolean(ctx.canManageChat) && (isOwner || Boolean(ctx.isSystemAdmin));
  }
  if (row.scope === "shared_file") {
    const actor = normalizeSegment(ctx.actorUserId, "");
    return row.createdByUserId === actor || Boolean(ctx.isSystemAdmin);
  }
  return false;
}

function getPathSegments(relPath: string): string[] {
  const normalized = normalizeExplorerPath(relPath);
  return normalized ? normalized.split("/").filter(Boolean) : [];
}

function getChatOwnerPathForUser(userId: string): string {
  return normalizeSegment(userId, "u");
}

function isChatPathVisibleForUser(relPath: string, userId: string): boolean {
  const segments = getPathSegments(relPath);
  if (!segments.length) return true;
  const owner = getChatOwnerPathForUser(userId);
  return String(segments[0] || "") === owner;
}

function isFolderCreateAllowed(root: ExplorerRoot, relPath: string): boolean {
  const segments = getPathSegments(relPath);
  if (root === "backups" || root === "chat") return false;
  if (root === "shared") return true;
  if (root === "events") {
    if (segments.length < 2) return false;
    const lane = String(segments[1] || "").toLowerCase();
    return lane === "other";
  }
  return false;
}

function isUploadAllowed(root: ExplorerRoot, relPath: string): boolean {
  const segments = getPathSegments(relPath);
  if (root === "backups" || root === "chat") return false;
  if (root === "shared") return true;
  if (root === "events") {
    if (segments.length < 2) return false;
    const lane = String(segments[1] || "").toLowerCase();
    return lane !== "program";
  }
  return false;
}

type FolderAccessPolicy = {
  locked: boolean;
  canRename: boolean;
  canMove: boolean;
  canDelete: boolean;
};

function getFolderAccessPolicy(root: ExplorerRoot, relPath: string, eventRows?: EventFolderRow[] | null): FolderAccessPolicy {
  const segments = getPathSegments(relPath);
  if (!segments.length) {
    return {
      locked: true,
      canRename: false,
      canMove: false,
      canDelete: false
    };
  }
  if (root === "backups" || root === "chat") {
    return {
      locked: true,
      canRename: false,
      canMove: false,
      canDelete: false
    };
  }
  if (root === "shared") {
    return {
      locked: false,
      canRename: true,
      canMove: true,
      canDelete: true
    };
  }
  if (root === "events") {
    const sourceRows = Array.isArray(eventRows) ? eventRows : loadEventFolderRows();
    if (segments.length === 1) {
      const row = findEventFolderRowByPath(relPath, sourceRows);
      const deletedFromCalendar = Boolean(row && row.deletedFromCalendarAt);
      const detachedFromCalendar = Boolean(row && row.detachedFromCalendar);
      if (deletedFromCalendar) {
        return {
          locked: false,
          canRename: false,
          canMove: false,
          canDelete: true
        };
      }
      if (detachedFromCalendar) {
        return {
          locked: false,
          canRename: true,
          canMove: false,
          canDelete: true
        };
      }
      return {
        locked: true,
        canRename: false,
        canMove: false,
        canDelete: false
      };
    }
    const lane = String(segments[1] || "").toLowerCase();
    if (lane === "program") {
      return {
        locked: true,
        canRename: false,
        canMove: false,
        canDelete: false
      };
    }
    if (lane === "other" || lane === "files") {
      if (segments.length === 2) {
        return {
          locked: false,
          canRename: false,
          canMove: false,
          canDelete: true
        };
      }
      return {
        locked: false,
        canRename: true,
        canMove: true,
        canDelete: true
      };
    }
    return {
      locked: false,
      canRename: true,
      canMove: true,
      canDelete: true
    };
  }
  return {
    locked: true,
    canRename: false,
    canMove: false,
    canDelete: false
  };
}

function isLockedFolder(root: ExplorerRoot, relPath: string, eventRows?: EventFolderRow[] | null): boolean {
  return getFolderAccessPolicy(root, relPath, eventRows).locked;
}

function buildBreadcrumbs(root: ExplorerRoot, relPath: string, eventRows?: EventFolderRow[] | null): Array<{ name: string; path: string }> {
  const rootName = root === "chat"
    ? "Chat"
    : root === "events"
      ? "Events"
      : root === "shared"
        ? "Shared"
        : "Backups";
  const items: Array<{ name: string; path: string }> = [{ name: rootName, path: "" }];
  const segments = getPathSegments(relPath);
  if (!segments.length) return items;
  let acc = "";
  for (let index = 0; index < segments.length; index += 1) {
    const segment = String(segments[index] || "");
    acc = acc ? `${acc}/${segment}` : segment;
    let display = segment;
    if (root === "events") {
      if (index === 0) {
        const eventRow = findEventFolderRowByFolderName(segment, eventRows);
        const base = buildEventFolderDisplayName(eventRow, segment);
        display = base;
      } else if (String(segment).toLowerCase() === "program") {
        display = "Program";
      } else if (["other", "files"].includes(String(segment).toLowerCase())) {
        display = "Other";
      }
    }
    items.push({ name: display, path: acc });
  }
  return items;
}

function getFolderDisplayName(root: ExplorerRoot, childRelPath: string, folderName: string, eventRows?: EventFolderRow[] | null): string {
  if (root !== "events") return folderName;
  const segs = getPathSegments(childRelPath);
  if (segs.length === 1) {
    const row = findEventFolderRowByFolderName(segs[0], eventRows);
    return buildEventFolderDisplayName(row, folderName);
  }
  if (segs.length >= 2) {
    const last = String(segs[segs.length - 1] || "").toLowerCase();
    if (last === "program") return "Program";
    if (last === "other" || last === "files") return "Other";
  }
  return folderName;
}

function ensureUniqueFileName(targetDir: string, baseName: string): string {
  const safeBase = normalizeFileName(baseName);
  const ext = path.extname(safeBase);
  const stem = ext ? safeBase.slice(0, -ext.length) : safeBase;
  let candidate = safeBase;
  let i = 2;
  while (fs.existsSync(path.join(targetDir, candidate))) {
    candidate = `${stem}-${i}${ext}`;
    i += 1;
  }
  return candidate;
}

export function listUserArchiveAssets(ctx: UserArchiveAccessContext): { items: UserArchiveAsset[]; totalBytes: number } {
  const userId = normalizeSegment(ctx.userId, "");
  if (!userId) return { items: [], totalBytes: 0 };

  const rows = loadIndexRows()
    .filter((row) => !row.deletedAt)
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));

  const usedArchivePaths = new Set<string>();
  const items: UserArchiveAsset[] = [];
  let totalBytes = 0;

  for (const row of rows) {
    if ((row.scope === "event_file" || row.scope === "event_program") && !ctx.canReadEvents) continue;
    if (row.scope === "chat_file" && (!ctx.canReadChat || !canReadChatRow(row, userId))) continue;

    const absolutePath = buildAbsolutePath(row.relativePath);
    if (!absolutePath) continue;

    const uniqueArchivePath = ensureUniqueArchivePath(buildHumanArchivePath(row), usedArchivePaths);
    items.push({
      id: row.id,
      scope: row.scope,
      fileName: row.originalFileName,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      createdAt: row.createdAt,
      relativePath: toPosixPath(row.relativePath || ""),
      archivePath: uniqueArchivePath,
      absolutePath
    });
    totalBytes += Math.max(0, Number(row.sizeBytes || 0));
  }

  return { items, totalBytes };
}

export function listRealmArchiveAssets(): { items: UserArchiveAsset[]; totalBytes: number } {
  const rows = loadIndexRows()
    .filter((row) => !row.deletedAt)
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));

  const usedArchivePaths = new Set<string>();
  const items: UserArchiveAsset[] = [];
  let totalBytes = 0;

  for (const row of rows) {
    const absolutePath = buildAbsolutePath(row.relativePath);
    if (!absolutePath) continue;
    const uniqueArchivePath = ensureUniqueArchivePath(buildHumanArchivePath(row), usedArchivePaths);
    items.push({
      id: row.id,
      scope: row.scope,
      fileName: row.originalFileName,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      createdAt: row.createdAt,
      relativePath: toPosixPath(row.relativePath || ""),
      archivePath: uniqueArchivePath,
      absolutePath
    });
    totalBytes += Math.max(0, Number(row.sizeBytes || 0));
  }

  return { items, totalBytes };
}

export function getFilesStorageUsage(): {
  usedBytes: number;
  limitBytes: number;
  percent: number;
} {
  ensureFilesPathLayout();
  const filesRoot = getFilesRootDir();
  const usedBytes = readDirectorySize(filesRoot);
  const limitBytes = Math.max(DEFAULT_MAX_BYTES, Number(process.env.FILES_STORAGE_LIMIT_BYTES || DEFAULT_STORAGE_LIMIT_BYTES));
  const percent = limitBytes > 0 ? Math.min(100, Math.round((usedBytes / limitBytes) * 100)) : 0;
  return {
    usedBytes,
    limitBytes,
    percent
  };
}

function scopeToRoot(scope: FileAssetScope): ExplorerRoot {
  if (scope === "chat_file") return "chat";
  if (scope === "shared_file") return "shared";
  return "events";
}

function findActiveRowById(rows: FileAssetRow[], id: string): FileAssetRow | null {
  const normalized = normalizeText(id);
  if (!normalized) return null;
  return rows.find((row) => !row.deletedAt && row.id === normalized) || null;
}

function updateRowsForMovedPrefix(rows: FileAssetRow[], oldPrefix: string, newPrefix: string): FileAssetRow[] {
  const oldValue = toPosixPath(oldPrefix).replace(/\/+$/, "");
  const newValue = toPosixPath(newPrefix).replace(/\/+$/, "");
  if (!oldValue || !newValue) return rows;
  return rows.map((row) => {
    if (row.deletedAt) return row;
    const rel = toPosixPath(row.relativePath || "");
    if (rel === oldValue) {
      return { ...row, relativePath: newValue };
    }
    if (!rel.startsWith(`${oldValue}/`)) return row;
    const suffix = rel.slice(oldValue.length);
    return {
      ...row,
      relativePath: `${newValue}${suffix}`
    };
  });
}

function normalizeFolderMoveTargetPath(root: ExplorerRoot, targetPath: string): string {
  const cleanPath = normalizeExplorerPath(targetPath);
  if (root !== "events") return cleanPath;
  const segments = getPathSegments(cleanPath);
  if (segments.length === 1) {
    return `${segments[0]}/other`;
  }
  return cleanPath;
}

function resolveEventKeyByEventPath(relPath: string, rows?: EventFolderRow[] | null): string | null {
  const sourceRows = Array.isArray(rows) ? rows : loadEventFolderRows();
  const hit = findEventFolderRowByPath(relPath, sourceRows);
  if (hit && hit.eventKey) return normalizeSegment(hit.eventKey, "");
  const segments = getPathSegments(relPath);
  if (!segments.length) return null;
  return resolveEventKeyByFolderName(String(segments[0] || ""));
}

function rewriteMovedFolderRows(
  rows: FileAssetRow[],
  sourceRoot: ExplorerRoot,
  fromPath: string,
  targetRoot: ExplorerRoot,
  targetFolderPath: string,
  eventRows?: EventFolderRow[] | null
): FileAssetRow[] {
  const oldPrefix = toPosixPath(path.join(sourceRoot, fromPath));
  const newPrefix = toPosixPath(path.join(targetRoot, targetFolderPath));
  const sourceEventRows = Array.isArray(eventRows) ? eventRows : loadEventFolderRows();
  const targetEventKey = targetRoot === "events"
    ? normalizeSegment(resolveEventKeyByEventPath(targetFolderPath, sourceEventRows) || "", "")
    : "";

  return rows.map((row) => {
    if (row.deletedAt) return row;
    const rel = toPosixPath(row.relativePath || "");
    if (rel !== oldPrefix && !rel.startsWith(`${oldPrefix}/`)) return row;
    const suffix = rel === oldPrefix ? "" : rel.slice(oldPrefix.length);
    const nextRelativePath = `${newPrefix}${suffix}`;
    if (targetRoot === "shared") {
      return {
        ...row,
        scope: "shared_file",
        eventKey: null,
        relativePath: nextRelativePath
      };
    }
    if (targetRoot === "events") {
      return {
        ...row,
        scope: "event_file",
        eventKey: targetEventKey || null,
        relativePath: nextRelativePath
      };
    }
    return {
      ...row,
      relativePath: nextRelativePath
    };
  });
}

function ensureFolderMovePathCompatible(
  sourceRoot: ExplorerRoot,
  fromPath: string,
  targetRoot: ExplorerRoot,
  targetPath: string
): void {
  if (sourceRoot === "backups" || targetRoot === "backups") {
    throw new Error("Backups are read-only.");
  }
  if (sourceRoot === "chat" || targetRoot === "chat") {
    throw new Error("Chat folders are system-managed.");
  }

  const sourceSegments = getPathSegments(fromPath);
  const targetSegments = getPathSegments(targetPath);
  if (!sourceSegments.length) {
    throw new Error("This folder cannot be moved.");
  }

  if (sourceRoot === "events") {
    if (sourceSegments.length === 1) {
      throw new Error("This folder cannot be moved.");
    }
    const sourceLane = String(sourceSegments[1] || "").toLowerCase();
    if (sourceLane === "program") {
      throw new Error("Program folder is system-managed.");
    }
    if ((sourceLane === "other" || sourceLane === "files") && sourceSegments.length === 2) {
      throw new Error("This folder cannot be moved.");
    }
    if (!["other", "files"].includes(sourceLane)) {
      throw new Error("Event folders must stay inside Other.");
    }
  }

  if (targetRoot === "events") {
    if (targetSegments.length < 2) {
      throw new Error("Choose an event folder or Event > Other.");
    }
    const targetLane = String(targetSegments[1] || "").toLowerCase();
    if (targetLane === "program") {
      throw new Error("Program folder is system-managed.");
    }
    if (!["other", "files"].includes(targetLane)) {
      throw new Error("Event folders must be moved into Other.");
    }
  }

  const crossRoot = sourceRoot !== targetRoot;
  if (!crossRoot) return;

  const allowedSource = sourceRoot === "shared" || sourceRoot === "events";
  const allowedTarget = targetRoot === "shared" || targetRoot === "events";
  if (!allowedSource || !allowedTarget) {
    throw new Error("Cross-root folder move is not allowed.");
  }
}

export function listExplorerFolder(input: {
  root: ExplorerRoot;
  path?: string | null;
  userId: string;
  canReadEvents: boolean;
  canReadChat: boolean;
  canManageBackups: boolean;
  canManageEvents: boolean;
  canManageChat: boolean;
}): ExplorerListResult {
  const root = input.root;
  const ctxPath = normalizeExplorerPath(input.path || "");
  const eventFolderRows = root === "events" ? loadEventFolderRows() : [];
  const currentEventKey = root === "events"
    ? normalizeSegment(resolveEventKeyByEventPath(ctxPath, eventFolderRows) || "", "")
    : "";
  if (root === "backups" && !input.canManageBackups) throw new Error("Forbidden");
  if (root === "events" && !input.canReadEvents) throw new Error("Forbidden");
  if (root === "chat" && !input.canReadChat) throw new Error("Forbidden");
  if (root === "chat" && !isChatPathVisibleForUser(ctxPath, input.userId)) throw new Error("Forbidden");

  const resolved = resolveRootPath(root, ctxPath);
  const folderMissing = !fs.existsSync(resolved.abs) || !fs.statSync(resolved.abs).isDirectory();
  if (folderMissing) {
    if (root === "backups") throw new Error("Folder not found.");
    const canCreateFolder = root === "events"
      ? input.canManageEvents && isFolderCreateAllowed(root, resolved.path)
      : root === "shared";
    const canUpload = root === "events"
      ? input.canManageEvents && isUploadAllowed(root, resolved.path)
      : root === "shared";
    return {
      root,
      path: resolved.path,
      eventKey: currentEventKey || null,
      breadcrumbs: buildBreadcrumbs(root, resolved.path, eventFolderRows),
      folders: [],
      files: [],
      canCreateFolder,
      canUpload
    };
  }

  const rows = loadIndexRows().filter((row) => !row.deletedAt);
  const byRelativePath = new Map<string, FileAssetRow>();
  rows.forEach((row) => {
    byRelativePath.set(toPosixPath(row.relativePath || ""), row);
  });

  const folders: ExplorerFolderEntry[] = [];
  const files: ExplorerFileEntry[] = [];
  const entries = fs.readdirSync(resolved.abs, { withFileTypes: true });

  entries.forEach((entry) => {
    const fullPath = path.join(resolved.abs, entry.name);
    const childRel = toPosixPath(path.relative(resolved.rootDir, fullPath));
    if (root === "chat" && !isChatPathVisibleForUser(childRel, input.userId)) {
      return;
    }
    const childStat = fs.statSync(fullPath);
    if (entry.isDirectory()) {
      const policy = getFolderAccessPolicy(root, childRel, eventFolderRows);
      const locked = policy.locked;
      const eventDeleted = root === "events" && isDeletedCalendarEventFolderPath(childRel, eventFolderRows);
      const canRename = policy.canRename;
      const canMove = policy.canMove;
      const canDelete = policy.canDelete || eventDeleted;
      const eventMeta = root === "events" ? findEventFolderRowByPath(childRel, eventFolderRows) : null;
      folders.push({
        entryType: "folder",
        name: getFolderDisplayName(root, childRel, entry.name, eventFolderRows),
        path: childRel,
        locked: locked,
        eventKey: eventMeta && eventMeta.eventKey ? eventMeta.eventKey : null,
        canRename,
        canMove,
        canDelete,
        eventDeletedFromCalendar: eventDeleted,
        eventDeletedAt: eventMeta && eventMeta.deletedFromCalendarAt ? eventMeta.deletedFromCalendarAt : null,
        createdAt: childStat.birthtime.toISOString(),
        modifiedAt: childStat.mtime.toISOString()
      });
      return;
    }
    if (!entry.isFile()) return;

    if (root === "backups") {
      files.push({
        entryType: "file",
        id: "",
        name: entry.name,
        path: childRel,
        sizeBytes: Math.max(0, Number(childStat.size || 0)),
        mimeType: "application/json",
        createdAt: childStat.birthtime.toISOString(),
        modifiedAt: childStat.mtime.toISOString(),
        scope: "backup_file",
        backup: true,
        downloadPath: `/api/files/backups/${encodeURIComponent(entry.name)}/download`
      });
      return;
    }

    const relFromFilesRoot = relativeToFilesRoot(fullPath);
    const row = byRelativePath.get(relFromFilesRoot);
    if (!row) return;
    if (!rowReadableByContext(row, {
      userId: input.userId,
      canReadEvents: input.canReadEvents,
      canReadChat: input.canReadChat
    })) {
      return;
    }
    files.push({
      entryType: "file",
      id: row.id,
      name: row.originalFileName,
      path: childRel,
      sizeBytes: row.sizeBytes,
      mimeType: row.mimeType,
      createdAt: row.createdAt,
      modifiedAt: childStat.mtime.toISOString(),
      scope: row.scope,
      backup: false,
      downloadPath: `/api/files/download/${encodeURIComponent(row.id)}`
    });
  });

  folders.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  files.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

  const canCreateFolder = root === "events"
    ? input.canManageEvents && isFolderCreateAllowed(root, resolved.path)
    : root === "shared";
  const canUpload = root === "events"
    ? input.canManageEvents && isUploadAllowed(root, resolved.path)
    : root === "shared";

  return {
    root,
    path: resolved.path,
    eventKey: currentEventKey || null,
    breadcrumbs: buildBreadcrumbs(root, resolved.path, eventFolderRows),
    folders,
    files,
    canCreateFolder,
    canUpload
  };
}

export function createExplorerFolder(input: {
  root: ExplorerRoot;
  parentPath?: string | null;
  name: string;
  canManageEvents: boolean;
  canManageChat: boolean;
}): { root: ExplorerRoot; path: string; name: string } {
  const root = input.root;
  if (root === "backups") throw new Error("Backups are read-only.");
  if (root === "chat") throw new Error("Chat folders are system-managed.");
  if (root === "events" && !input.canManageEvents) throw new Error("Forbidden");

  const parent = resolveRootPath(root, normalizeExplorerPath(input.parentPath || ""));
  if (!fs.existsSync(parent.abs) || !fs.statSync(parent.abs).isDirectory()) {
    throw new Error("Parent folder not found.");
  }
  const folderName = normalizeFolderName(input.name);
  const parentSegments = getPathSegments(parent.path);
  const allowEventSystemLane = root === "events"
    && parentSegments.length === 1
    && ["other", "files"].includes(folderName.toLowerCase());
  if (root === "events" && !allowEventSystemLane && !isFolderCreateAllowed(root, parent.path)) {
    throw new Error("Create folders only inside Event > Other.");
  }
  const targetAbs = path.join(parent.abs, folderName);
  if (fs.existsSync(targetAbs)) throw new Error("Folder already exists.");
  fs.mkdirSync(targetAbs, { recursive: false });
  const rel = toPosixPath(path.relative(parent.rootDir, targetAbs));
  return {
    root,
    path: rel,
    name: folderName
  };
}

export function renameExplorerFolder(input: {
  root: ExplorerRoot;
  path: string;
  newName: string;
  canManageEvents: boolean;
  canManageChat: boolean;
}): { root: ExplorerRoot; path: string; name: string } {
  const root = input.root;
  if (root === "backups") throw new Error("Backups are read-only.");
  if (root === "chat") throw new Error("Chat folders are system-managed.");
  if (root === "events" && !input.canManageEvents) throw new Error("Forbidden");

  const currentPath = normalizeExplorerPath(input.path);
  if (!currentPath) throw new Error("Cannot rename root folder.");
  const policy = getFolderAccessPolicy(root, currentPath);
  if (!policy.canRename) {
    throw new Error(policy.locked ? "This folder is locked." : "This folder cannot be renamed.");
  }

  const source = resolveRootPath(root, currentPath);
  if (!fs.existsSync(source.abs) || !fs.statSync(source.abs).isDirectory()) throw new Error("Folder not found.");

  const parentPath = path.dirname(currentPath).replace(/\\/g, "/");
  const parent = resolveRootPath(root, parentPath === "." ? "" : parentPath);
  const newName = normalizeFolderName(input.newName);
  const targetAbs = path.join(parent.abs, newName);
  if (fs.existsSync(targetAbs)) throw new Error("Folder with this name already exists.");

  fs.renameSync(source.abs, targetAbs);

  const oldPrefix = toPosixPath(path.join(root, currentPath));
  const newRel = toPosixPath(path.relative(parent.rootDir, targetAbs));
  const newPrefix = toPosixPath(path.join(root, newRel));
  const rows = loadIndexRows();
  const nextRows = updateRowsForMovedPrefix(rows, oldPrefix, newPrefix);
  saveIndexRows(sortRowsByDateDesc(nextRows));
  if (root === "events" && getPathSegments(currentPath).length === 1) {
    const currentFolderName = String(getPathSegments(currentPath)[0] || "");
    const folderRows = loadEventFolderRows();
    const rowIndex = folderRows.findIndex((row) => String(row.folderName || "").trim().toLowerCase() === currentFolderName.trim().toLowerCase());
    if (rowIndex >= 0) {
      folderRows[rowIndex] = {
        ...folderRows[rowIndex],
        folderName: newName,
        updatedAt: new Date().toISOString()
      };
      saveEventFolderRows(folderRows);
    }
  }
  return {
    root,
    path: newRel,
    name: newName
  };
}

export function moveExplorerFolder(input: {
  root: ExplorerRoot;
  path: string;
  targetRoot?: ExplorerRoot;
  targetPath: string;
  canManageEvents: boolean;
  canManageChat: boolean;
}): { root: ExplorerRoot; path: string } {
  const root = input.root;
  const targetRoot = input.targetRoot || input.root;
  if (root === "backups" || targetRoot === "backups") throw new Error("Backups are read-only.");
  if (root === "chat" || targetRoot === "chat") throw new Error("Chat folders are system-managed.");
  if ((root === "events" || targetRoot === "events") && !input.canManageEvents) throw new Error("Forbidden");

  const fromPath = normalizeExplorerPath(input.path);
  const toPath = normalizeFolderMoveTargetPath(targetRoot, input.targetPath);
  if (!fromPath) throw new Error("Cannot move root folder.");
  const sourcePolicy = getFolderAccessPolicy(root, fromPath);
  if (!sourcePolicy.canMove) {
    throw new Error(sourcePolicy.locked ? "This folder is locked." : "This folder cannot be moved.");
  }
  if ((root === targetRoot && fromPath === toPath) || (root === targetRoot && toPath.startsWith(`${fromPath}/`))) {
    throw new Error("Invalid destination folder.");
  }
  ensureFolderMovePathCompatible(root, fromPath, targetRoot, toPath);

  const source = resolveRootPath(root, fromPath);
  const target = resolveRootPath(targetRoot, toPath);
  if (!fs.existsSync(source.abs) || !fs.statSync(source.abs).isDirectory()) throw new Error("Folder not found.");
  if (!fs.existsSync(target.abs) || !fs.statSync(target.abs).isDirectory()) throw new Error("Destination folder not found.");

  const folderName = path.basename(source.abs);
  const targetAbs = path.join(target.abs, folderName);
  if (fs.existsSync(targetAbs)) throw new Error("Destination already contains this folder.");
  fs.renameSync(source.abs, targetAbs);

  const newRel = toPosixPath(path.relative(target.rootDir, targetAbs));
  const rows = loadIndexRows();
  const nextRows = rewriteMovedFolderRows(rows, root, fromPath, targetRoot, newRel);
  saveIndexRows(sortRowsByDateDesc(nextRows));

  return { root: targetRoot, path: newRel };
}

export function deleteExplorerFolder(input: {
  root: ExplorerRoot;
  path: string;
  actorUserId: string;
  canManageEvents: boolean;
  canManageChat: boolean;
  isSystemAdmin?: boolean;
  allowDeletedEventRootFolderDelete?: boolean;
}): { ok: true; deletedFiles: number } {
  const root = input.root;
  if (root === "backups") throw new Error("Backups are read-only.");
  if (root === "chat") throw new Error("Chat folders are system-managed.");
  if (root === "events" && !input.canManageEvents) throw new Error("Forbidden");

  const relPath = normalizeExplorerPath(input.path);
  if (!relPath) throw new Error("Cannot delete root folder.");
  const eventFolderRows = root === "events" ? loadEventFolderRows() : [];
  const folderPolicy = getFolderAccessPolicy(root, relPath, eventFolderRows);
  const deletedFromCalendar = root === "events" && isDeletedCalendarEventFolderPath(relPath, eventFolderRows);
  const allowDeletedEventRootFolderDelete = Boolean(
    input.allowDeletedEventRootFolderDelete
    && root === "events"
    && getPathSegments(relPath).length === 1
  );
  if (!folderPolicy.canDelete && !deletedFromCalendar) {
    if (allowDeletedEventRootFolderDelete) {
      // Route-level calendar validation confirmed this event no longer exists.
    } else
    if (root === "events" && getPathSegments(relPath).length === 1) {
      throw new Error("Delete the event from calendar first, then remove its folder.");
    }
    else {
      throw new Error(folderPolicy.locked ? "This folder is locked." : "This folder cannot be deleted.");
    }
  }

  const target = resolveRootPath(root, relPath);
  if (!fs.existsSync(target.abs) || !fs.statSync(target.abs).isDirectory()) throw new Error("Folder not found.");

  const prefix = toPosixPath(path.join(root, relPath));
  const rows = loadIndexRows();
  const affected = rows.filter((row) => !row.deletedAt && toPosixPath(row.relativePath || "").startsWith(`${prefix}/`));
  for (const row of affected) {
    if (!rowWritableByContext(row, {
      actorUserId: input.actorUserId,
      canManageEvents: input.canManageEvents,
      canManageChat: input.canManageChat,
      isSystemAdmin: input.isSystemAdmin
    })) {
      throw new Error("Forbidden");
    }
  }

  fs.rmSync(target.abs, { recursive: true, force: false });
  const now = new Date().toISOString();
  const nextRows = rows.map((row) => {
    if (row.deletedAt) return row;
    const rel = toPosixPath(row.relativePath || "");
    if (!rel.startsWith(`${prefix}/`)) return row;
    return { ...row, deletedAt: now };
  });
  saveIndexRows(sortRowsByDateDesc(nextRows));

  if (root === "events") {
    const segs = getPathSegments(relPath);
    if (segs.length === 1) {
      const folderName = String(segs[0] || "");
      const targetRow = findEventFolderRowByFolderName(folderName, eventFolderRows);
      if (targetRow && targetRow.detachedFromCalendar) {
        const updatedRows = eventFolderRows.map((row) => (
          row.eventKey === targetRow.eventKey
            ? { ...row, updatedAt: new Date().toISOString() }
            : row
        ));
        saveEventFolderRows(updatedRows);
      } else {
        const remainingEventRows = eventFolderRows.filter((row) => (
          String(row.folderName || "").trim().toLowerCase() !== folderName.trim().toLowerCase()
        ));
        if (remainingEventRows.length !== eventFolderRows.length) {
          saveEventFolderRows(remainingEventRows);
        }
      }
    }
  }

  return { ok: true, deletedFiles: affected.length };
}

function getEventFolderForRow(row: FileAssetRow): string {
  const fromPath = getEventFolderFromRelativePath(row.relativePath);
  if (fromPath) return fromPath;
  return normalizeSegment(row.eventKey || "", "event");
}

function ensureMovePathCompatible(row: FileAssetRow, targetRoot: ExplorerRoot, targetRelPath: string): void {
  const target = normalizeExplorerPath(targetRelPath);
  if (scopeToRoot(row.scope) !== targetRoot) {
    throw new Error("Cross-root move is not allowed.");
  }
  const segments = getPathSegments(target);
  if (row.scope === "event_program") {
    const expectedFolder = getEventFolderForRow(row);
    if (segments.length < 2 || segments[0] !== expectedFolder || String(segments[1] || "").toLowerCase() !== "program") {
      throw new Error("Program files must stay in event Program folder.");
    }
  }
  if (row.scope === "event_file") {
    const expectedFolder = getEventFolderForRow(row);
    if (!segments.length || segments[0] !== expectedFolder) {
      throw new Error("Event files must stay inside the same event folder.");
    }
    if (segments.length >= 2 && String(segments[1] || "").toLowerCase() === "program") {
      throw new Error("Event attachments cannot be moved into Program folder.");
    }
  }
  if (row.scope === "chat_file") {
    const owner = String(row.ownerUserId || "");
    const thread = String(row.threadKey || "");
    if (segments.length < 2 || segments[0] !== owner || segments[1] !== thread) {
      throw new Error("Chat files must stay inside the same chat thread folder.");
    }
  }
}

export function moveExplorerFile(input: {
  fileId: string;
  targetRoot: ExplorerRoot;
  targetPath: string;
  actorUserId: string;
  canManageEvents: boolean;
  canManageChat: boolean;
  isSystemAdmin?: boolean;
}): { ok: true; file: ReturnType<typeof buildPublicRow> } {
  if (input.targetRoot === "backups") throw new Error("Cannot move files into backups.");
  const rows = loadIndexRows();
  const row = findActiveRowById(rows, input.fileId);
  if (!row) throw new Error("File not found.");
  if (!rowWritableByContext(row, {
    actorUserId: input.actorUserId,
    canManageEvents: input.canManageEvents,
    canManageChat: input.canManageChat,
    isSystemAdmin: input.isSystemAdmin
  })) {
    throw new Error("Forbidden");
  }

  const target = resolveRootPath(input.targetRoot, input.targetPath);
  if (!fs.existsSync(target.abs) || !fs.statSync(target.abs).isDirectory()) throw new Error("Destination folder not found.");
  ensureMovePathCompatible(row, input.targetRoot, target.path);

  const currentAbs = path.join(getFilesRootDir(), row.relativePath);
  if (!fs.existsSync(currentAbs)) throw new Error("File is missing from storage.");
  const newStoredName = ensureUniqueFileName(target.abs, path.basename(currentAbs));
  const targetAbs = path.join(target.abs, newStoredName);
  fs.renameSync(currentAbs, targetAbs);

  const updatedRel = relativeToFilesRoot(targetAbs);
  const nextRows = rows.map((item) => {
    if (item.id !== row.id || item.deletedAt) return item;
    return { ...item, relativePath: updatedRel };
  });
  saveIndexRows(sortRowsByDateDesc(nextRows));
  const updated = nextRows.find((item) => item.id === row.id && !item.deletedAt);
  if (!updated) throw new Error("File move failed.");
  return {
    ok: true,
    file: buildPublicRow(updated)
  };
}
