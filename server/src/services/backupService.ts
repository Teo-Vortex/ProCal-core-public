import crypto from "crypto";
import fs from "fs";
import path from "path";
import { Prisma } from "@prisma/client";
import { closePrisma, getPrisma } from "../db/prisma";
import { getConfigPath, loadStoredConfig } from "../config/store";
import { hashPassword } from "../auth/tokens";
import { getBackupsRootDir, getRealmIdentifier } from "./filesPathService";
import { upsertUserInSharedPersonnel } from "./personnelSyncService";

type Primitive = string | number | boolean | null;
type JsonValue = Primitive | JsonValue[] | { [k: string]: JsonValue };

type EncodedScalar =
  | { __procalType: "date"; value: string }
  | { __procalType: "bigint"; value: string }
  | { __procalType: "buffer"; value: string }
  | { __procalType: "decimal"; value: string };

export type BackupFileEntry = {
  path: string;
  contentBase64: string;
  encoding: "base64";
};

export type BackupTableSnapshot = {
  table: string;
  rows: Array<Record<string, JsonValue | EncodedScalar>>;
};

export type BackupKind = "full" | "working";

export type ProcalBackupPackage = {
  format: "procal-backup-v1";
  backupKind?: BackupKind;
  createdAt: string;
  appVersion: string;
  source: {
    dbName: string;
    realmId?: string;
  };
  tables: BackupTableSnapshot[];
  configFiles: BackupFileEntry[];
};

type EncryptedBackupPackage = {
  format: "procal-encrypted-backup-v1";
  encrypted: true;
  backupKind?: BackupKind;
  createdAt: string;
  appVersion: string;
  source?: {
    dbName?: string;
    realmId?: string;
  };
  tableCount?: number;
  configFileCount?: number;
  encryption: {
    algorithm: "aes-256-gcm";
    kdf: "scrypt";
    saltBase64: string;
    ivBase64: string;
    tagBase64: string;
  };
  payloadBase64: string;
};

export type BackupListItem = {
  fileName: string;
  backupKind?: BackupKind;
  encrypted?: boolean;
  sizeBytes: number;
  mtime: string;
  createdAt?: string;
  appVersion?: string;
  tableCount?: number;
  dbName?: string;
  realmId?: string;
};

export type BackupValidationResult = {
  ok: boolean;
  fileName: string;
  backupKind: BackupKind;
  createdAt: string;
  appVersion: string;
  tableCount: number;
  rowCount: number;
  configFileCount: number;
  dbName?: string;
  realmId?: string;
  realmMatch?: boolean;
};

export type CrossRealmImportResult = {
  fileName: string;
  backupKind: BackupKind;
  appVersion: string;
  createdAt: string;
  sourceRealmId?: string;
  clearedTableCount: number;
  clearedOnlyTableCount: number;
  insertedTables: number;
  insertedRows: number;
  skippedTables: string[];
  matchedUsers: number;
  placeholderUsers: number;
  ignoredConfigFiles: boolean;
};

type SaveImportedBackupOptions = {
  allowCrossRealm?: boolean;
  encryptionKey?: string | null;
};

type ImportTablesOptions = {
  allowedTables?: Set<string> | null;
  transformRow?: ((table: string, row: Record<string, JsonValue | EncodedScalar>) => Record<string, JsonValue | EncodedScalar> | null) | null;
};

type CreateBackupOptions = {
  encryptionKey?: string | null;
};

type BackupUserProfile = {
  sourceId: string;
  username: string;
  nickname: string | null;
  fullName: string | null;
  workplace: string | null;
  jobTitle: string | null;
  role: string | null;
  viewMode: string | null;
  displayColor: string | null;
  calendarTintOpacity: number;
};

const CROSS_REALM_IMPORT_SKIP_TABLES = new Set([
  "AppMeta",
  "User",
  "RefreshToken",
  "ServiceToken",
  "AuditLog",
  "IdempotencyRecord",
  "LegacyState",
  "SharedLegacyState",
  "Notification",
  "PushDevice",
  "BugReport",
  "ChatThreadRead"
]);

const CROSS_REALM_CLEAR_ONLY_TABLES = new Set([
  "LegacyState",
  "SharedLegacyState",
  "Notification",
  "ChatThreadRead",
  "BugReport",
  "IdempotencyRecord"
]);

const USER_REFERENCE_FIELDS = new Set([
  "userId",
  "createdById",
  "ownerId",
  "authorId",
  "senderId",
  "recipientUserId",
  "actorUserId"
]);

const DECIMAL_FIELD_MAP = new Map<string, Set<string>>([
  ["LeaveAllowance", new Set(["days"])],
  ["LeaveRecord", new Set(["days"])]
]);

export type BackupAutomationSettings = {
  full: {
    enabled: boolean;
    everyHours: number;
    retentionDays: number;
    lastRunAt: string | null;
  };
  working: {
    enabled: boolean;
    everyHours: number;
    retentionDays: number;
    lastRunAt: string | null;
  };
};

export type BackupAutomationSettingsPatch = {
  full?: Partial<BackupAutomationSettings["full"]>;
  working?: Partial<BackupAutomationSettings["working"]>;
};

function getServerPackageVersion(): string {
  try {
    const p = path.resolve(__dirname, "../../package.json");
    const raw = fs.readFileSync(p, "utf-8");
    const parsed = JSON.parse(raw) as { version?: unknown };
    return String(parsed.version || "").trim() || "unknown";
  } catch {
    return "unknown";
  }
}

function normalizeBackupEncryptionKey(value?: string | null): string {
  const key = String(value || "").trim();
  if (key.length < 16) {
    throw new Error("Backup encryption key must be at least 16 characters.");
  }
  return key;
}

function deriveBackupEncryptionKey(passphrase: string, salt: Buffer): Buffer {
  return crypto.scryptSync(passphrase, salt, 32);
}

function encryptBackupPackage(pkg: ProcalBackupPackage, encryptionKey: string): EncryptedBackupPackage {
  const key = normalizeBackupEncryptionKey(encryptionKey);
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const derived = deriveBackupEncryptionKey(key, salt);
  const cipher = crypto.createCipheriv("aes-256-gcm", derived, iv);
  const raw = JSON.stringify(pkg);
  const encrypted = Buffer.concat([cipher.update(raw, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    format: "procal-encrypted-backup-v1",
    encrypted: true,
    backupKind: pkg.backupKind === "working" ? "working" : "full",
    createdAt: pkg.createdAt,
    appVersion: pkg.appVersion,
    source: {
      dbName: pkg.source?.dbName,
      realmId: pkg.source?.realmId
    },
    tableCount: Array.isArray(pkg.tables) ? pkg.tables.length : 0,
    configFileCount: Array.isArray(pkg.configFiles) ? pkg.configFiles.length : 0,
    encryption: {
      algorithm: "aes-256-gcm",
      kdf: "scrypt",
      saltBase64: salt.toString("base64"),
      ivBase64: iv.toString("base64"),
      tagBase64: tag.toString("base64")
    },
    payloadBase64: encrypted.toString("base64")
  };
}

function isEncryptedBackupPackage(value: unknown): value is EncryptedBackupPackage {
  const parsed = value as Partial<EncryptedBackupPackage> | null;
  return Boolean(parsed && parsed.format === "procal-encrypted-backup-v1" && parsed.encryption && parsed.payloadBase64);
}

function decryptBackupPackage(wrapper: EncryptedBackupPackage, encryptionKey?: string | null): ProcalBackupPackage {
  const key = normalizeBackupEncryptionKey(encryptionKey);
  if (
    !wrapper.encryption ||
    wrapper.encryption.algorithm !== "aes-256-gcm" ||
    wrapper.encryption.kdf !== "scrypt"
  ) {
    throw new Error("Unsupported encrypted backup format.");
  }
  const salt = Buffer.from(String(wrapper.encryption.saltBase64 || ""), "base64");
  const iv = Buffer.from(String(wrapper.encryption.ivBase64 || ""), "base64");
  const tag = Buffer.from(String(wrapper.encryption.tagBase64 || ""), "base64");
  const encrypted = Buffer.from(String(wrapper.payloadBase64 || ""), "base64");
  try {
    const derived = deriveBackupEncryptionKey(key, salt);
    const decipher = crypto.createDecipheriv("aes-256-gcm", derived, iv);
    decipher.setAuthTag(tag);
    const raw = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
    return parseBackupPackageObject(JSON.parse(raw));
  } catch {
    throw new Error("Backup encryption key is invalid or the backup file is damaged.");
  }
}

function parseBackupPackageObject(value: unknown): ProcalBackupPackage {
  const parsed = value as ProcalBackupPackage;
  if (!parsed || parsed.format !== "procal-backup-v1" || !Array.isArray(parsed.tables)) {
    throw new Error("Invalid backup file");
  }
  return {
    ...parsed,
    backupKind: parsed.backupKind === "working" ? "working" : "full",
    configFiles: Array.isArray(parsed.configFiles) ? parsed.configFiles : []
  };
}

function getConfigDir(): string {
  return path.dirname(getConfigPath());
}

function getBackupSettingsPath(): string {
  return path.join(getConfigDir(), "backup-settings.json");
}

function normalizeBackupSettings(input?: Partial<BackupAutomationSettings> | null): BackupAutomationSettings {
  const pick = (key: BackupKind) => {
    const src = (input && (input as Record<string, unknown>)[key]) as Record<string, unknown> | undefined;
    const everyHours = Math.max(1, Math.min(24 * 365, Math.trunc(Number(src?.everyHours ?? 168) || 168)));
    const retentionDays = Math.max(0, Math.min(3650, Math.trunc(Number(src?.retentionDays ?? (key === "full" ? 30 : 14)) || 0)));
    const lastRunAtRaw = typeof src?.lastRunAt === "string" ? String(src.lastRunAt).trim() : null;
    const lastRunAt = lastRunAtRaw && !Number.isNaN(Date.parse(lastRunAtRaw)) ? new Date(lastRunAtRaw).toISOString() : null;
    return {
      enabled: Boolean(src?.enabled),
      everyHours,
      retentionDays,
      lastRunAt
    };
  };
  return { full: pick("full"), working: pick("working") };
}

export function loadBackupAutomationSettings(): BackupAutomationSettings {
  const p = getBackupSettingsPath();
  if (!fs.existsSync(p)) return normalizeBackupSettings();
  try {
    const raw = fs.readFileSync(p, "utf-8");
    return normalizeBackupSettings(JSON.parse(raw) as Partial<BackupAutomationSettings>);
  } catch {
    return normalizeBackupSettings();
  }
}

export function saveBackupAutomationSettings(input: BackupAutomationSettingsPatch): BackupAutomationSettings {
  const current = loadBackupAutomationSettings();
  const merged = normalizeBackupSettings({
    full: { ...current.full, ...(input.full || {}) },
    working: { ...current.working, ...(input.working || {}) }
  });
  const p = getBackupSettingsPath();
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(p, JSON.stringify(merged, null, 2), "utf-8");
  return merged;
}

export function getBackupDir(): string {
  const fromEnv = String(process.env.BACKUP_DIR || "").trim();
  if (fromEnv) return fromEnv;
  return getBackupsRootDir();
}

function ensureBackupDir(): void {
  const dir = getBackupDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function sanitizeBackupFileName(fileName: string): string {
  const base = path.basename(String(fileName || "").trim());
  if (!/^[a-zA-Z0-9._-]+$/.test(base)) {
    throw new Error("Invalid backup file name");
  }
  return base;
}

function encodeSpecial(value: unknown): JsonValue | EncodedScalar {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return { __procalType: "date", value: value.toISOString() };
  if (typeof value === "bigint") return { __procalType: "bigint", value: value.toString() };
  if (Buffer.isBuffer(value)) return { __procalType: "buffer", value: value.toString("base64") };
  if (Prisma.Decimal.isDecimal(value)) return { __procalType: "decimal", value: value.toString() };
  if (Array.isArray(value)) return value.map((v) => encodeSpecial(v)) as JsonValue;
  if (typeof value === "object") {
    const out: Record<string, JsonValue | EncodedScalar> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = encodeSpecial(v);
    return out as JsonValue;
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  return String(value) as JsonValue;
}

function decodeSpecial(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value.map((v) => decodeSpecial(v));
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const tag = obj.__procalType;
    if (tag === "date" && typeof obj.value === "string") return new Date(obj.value);
    if (tag === "bigint" && typeof obj.value === "string") return obj.value;
    if (tag === "buffer" && typeof obj.value === "string") return Buffer.from(obj.value, "base64");
    if (tag === "decimal" && typeof obj.value === "string") return obj.value;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) out[k] = decodeSpecial(v);
    return out;
  }
  return value;
}

function isDecimalField(table: string, field: string): boolean {
  const fields = DECIMAL_FIELD_MAP.get(String(table || "").trim());
  return Boolean(fields && fields.has(String(field || "").trim()));
}

function isLegacyDecimalShape(value: unknown): value is { s: number; e: number; d: number[] } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.s === "number" &&
    typeof candidate.e === "number" &&
    Array.isArray(candidate.d) &&
    candidate.d.every((item) => typeof item === "number")
  );
}

function normalizeDecodedBackupValue(table: string, field: string, value: unknown): unknown {
  if (!isDecimalField(table, field)) {
    return value;
  }
  if (typeof value === "string" || typeof value === "number" || value === null) {
    return value;
  }
  if (!isLegacyDecimalShape(value)) {
    return value;
  }
  try {
    return Object.assign(Object.create(Prisma.Decimal.prototype), value).toString();
  } catch {
    return value;
  }
}

function formatTimestampForFile(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function escapeId(name: string): string {
  return `\`${String(name).replace(/`/g, "``")}\``;
}

function toSqlParam(value: unknown): unknown {
  if (value === undefined) return null;
  if (value === null) return null;
  if (value instanceof Date) return value;
  if (Buffer.isBuffer(value)) return value;
  if (Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === "object") return JSON.stringify(value);
  return value;
}

function walkFiles(dir: string, rootDir: string, out: BackupFileEntry[]): void {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    const rel = path.relative(rootDir, abs).replace(/\\/g, "/");
    if (rel === "backups" || rel.startsWith("backups/")) continue;
    if (entry.isDirectory()) {
      walkFiles(abs, rootDir, out);
      continue;
    }
    const buf = fs.readFileSync(abs);
    out.push({ path: rel, contentBase64: buf.toString("base64"), encoding: "base64" });
  }
}

function readConfigFilesSnapshot(): BackupFileEntry[] {
  const root = getConfigDir();
  if (!fs.existsSync(root)) return [];
  const out: BackupFileEntry[] = [];
  walkFiles(root, root, out);
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

function clearDirectoryRecursive(dir: string): void {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      clearDirectoryRecursive(abs);
      try {
        fs.rmdirSync(abs);
      } catch {
        // Directory may already be removed by nested cleanup.
      }
      continue;
    }
    fs.unlinkSync(abs);
  }
}

function writeConfigFilesSnapshot(entries: BackupFileEntry[]): void {
  const root = getConfigDir();
  if (!fs.existsSync(root)) fs.mkdirSync(root, { recursive: true });
  clearDirectoryRecursive(root);

  for (const entry of entries) {
    const rel = String(entry.path || "").replace(/\\/g, "/").replace(/^\/+/, "");
    if (!rel || rel.startsWith("backups/") || rel === "backups") continue;
    const abs = path.join(root, rel);
    const dir = path.dirname(abs);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(abs, Buffer.from(String(entry.contentBase64 || ""), "base64"));
  }
}

async function listDatabaseTables(dbName: string): Promise<string[]> {
  const prisma = getPrisma();
  const rows = await prisma.$queryRawUnsafe<Array<{ TABLE_NAME: string }>>(
    "SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema = ? ORDER BY TABLE_NAME ASC",
    dbName
  );
  return rows
    .map((r) => String(r.TABLE_NAME || "").trim())
    .filter((t) => Boolean(t) && t !== "_prisma_migrations");
}

async function exportTables(dbName: string): Promise<BackupTableSnapshot[]> {
  const prisma = getPrisma();
  const tables = await listDatabaseTables(dbName);
  const result: BackupTableSnapshot[] = [];
  for (const table of tables) {
    const rows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(`SELECT * FROM ${escapeId(table)}`);
    result.push({
      table,
      rows: rows.map((row) => {
        const out: Record<string, JsonValue | EncodedScalar> = {};
        for (const [k, v] of Object.entries(row)) out[k] = encodeSpecial(v);
        return out;
      })
    });
  }
  return result;
}

export async function createBackup(
  kind: BackupKind = "full",
  actorUserId?: string | null,
  options?: CreateBackupOptions
): Promise<{ fileName: string; filePath: string; sizeBytes: number; pkg: ProcalBackupPackage }> {
  const cfg = loadStoredConfig();
  if (!cfg) throw new Error("Configuration missing");
  ensureBackupDir();
  const realmId = getRealmIdentifier();

  const now = new Date();
  const pkg: ProcalBackupPackage = {
    format: "procal-backup-v1",
    backupKind: kind,
    createdAt: now.toISOString(),
    appVersion: getServerPackageVersion(),
    source: { dbName: cfg.dbName, realmId },
    tables: await exportTables(cfg.dbName),
    configFiles: kind === "full" ? readConfigFilesSnapshot() : []
  };

  const stamp = formatTimestampForFile(now);
  const actorPart = actorUserId ? `-${String(actorUserId).slice(0, 8)}` : "";
  const encryptedPkg = options?.encryptionKey ? encryptBackupPackage(pkg, options.encryptionKey) : null;
  const fileName = `procal-${realmId}-${kind}-${stamp}${actorPart}${encryptedPkg ? ".procalbak" : ".json"}`;
  const filePath = path.join(getBackupDir(), fileName);
  const raw = JSON.stringify(encryptedPkg || pkg);
  fs.writeFileSync(filePath, raw, "utf-8");
  const st = fs.statSync(filePath);
  return { fileName, filePath, sizeBytes: st.size, pkg };
}

export async function createFullBackup(actorUserId?: string | null) {
  return createBackup("full", actorUserId);
}

function parseBackupFile(filePath: string, options?: { encryptionKey?: string | null }): ProcalBackupPackage {
  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(raw);
  if (isEncryptedBackupPackage(parsed)) {
    return decryptBackupPackage(parsed, options?.encryptionKey);
  }
  return parseBackupPackageObject(parsed);
}

export function validateBackupFile(fileName: string, encryptionKey?: string | null): BackupValidationResult {
  const filePath = getBackupFilePath(fileName);
  if (!fs.existsSync(filePath)) throw new Error("Backup file not found");
  const parsed = parseBackupFile(filePath, { encryptionKey });
  const realmId = String(parsed.source?.realmId || "").trim() || undefined;
  const currentRealmId = getRealmIdentifier();
  const rowCount = (Array.isArray(parsed.tables) ? parsed.tables : []).reduce((sum, t) => sum + (Array.isArray(t.rows) ? t.rows.length : 0), 0);
  return {
    ok: true,
    fileName,
    backupKind: parsed.backupKind === "working" ? "working" : "full",
    createdAt: String(parsed.createdAt || ""),
    appVersion: String(parsed.appVersion || "unknown"),
    tableCount: Array.isArray(parsed.tables) ? parsed.tables.length : 0,
    rowCount,
    configFileCount: Array.isArray(parsed.configFiles) ? parsed.configFiles.length : 0,
    dbName: parsed.source?.dbName,
    realmId,
    realmMatch: realmId ? realmId === currentRealmId : false
  };
}

export function listBackupFiles(): BackupListItem[] {
  ensureBackupDir();
  const dir = getBackupDir();
  const files = fs.readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && (e.name.toLowerCase().endsWith(".json") || e.name.toLowerCase().endsWith(".procalbak")))
    .map((e) => e.name);

  return files.map((fileName) => {
    const filePath = path.join(dir, fileName);
    const st = fs.statSync(filePath);
    let meta: Partial<BackupListItem> = {};
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      const header = JSON.parse(raw);
      if (isEncryptedBackupPackage(header)) {
        meta = {
          encrypted: true,
          backupKind: header.backupKind === "working" ? "working" : "full",
          createdAt: header.createdAt,
          appVersion: header.appVersion,
          tableCount: typeof header.tableCount === "number" ? header.tableCount : undefined,
          dbName: header.source?.dbName,
          realmId: header.source?.realmId
        };
      } else {
        const parsed = parseBackupPackageObject(header);
        meta = {
          encrypted: false,
          backupKind: parsed.backupKind === "working" ? "working" : "full",
          createdAt: parsed.createdAt,
          appVersion: parsed.appVersion,
          tableCount: parsed.tables.length,
          dbName: parsed.source?.dbName,
          realmId: parsed.source?.realmId
        };
      }
    } catch {
      // keep file visible even if invalid
    }
    return {
      fileName,
      sizeBytes: st.size,
      mtime: st.mtime.toISOString(),
      ...meta
    };
  }).sort((a, b) => String(b.createdAt || b.mtime).localeCompare(String(a.createdAt || a.mtime)));
}

export function getBackupFilePath(fileName: string): string {
  ensureBackupDir();
  return path.join(getBackupDir(), sanitizeBackupFileName(fileName));
}

export function saveImportedBackup(rawText: string, preferredName?: string, options?: SaveImportedBackupOptions): BackupListItem {
  ensureBackupDir();
  const rawParsed = JSON.parse(rawText);
  const encrypted = isEncryptedBackupPackage(rawParsed);
  const parsed = encrypted
    ? (options?.encryptionKey ? decryptBackupPackage(rawParsed, options.encryptionKey) : null)
    : parseBackupPackageObject(rawParsed);
  const currentRealmId = getRealmIdentifier();
  const backupRealmId = String((parsed || rawParsed).source?.realmId || "").trim();
  const allowCrossRealm = Boolean(options?.allowCrossRealm);
  if (!allowCrossRealm && parsed) {
    if (!backupRealmId) {
      throw new Error("Backup is missing realm lock (source.realmId).");
    }
    if (backupRealmId !== currentRealmId) {
      throw new Error(`Backup realm mismatch. Expected "${currentRealmId}", got "${backupRealmId}".`);
    }
  }
  const backupKind: BackupKind = ((parsed || rawParsed).backupKind === "working" ? "working" : "full");

  const stamp = formatTimestampForFile(new Date());
  let fileName = preferredName ? sanitizeBackupFileName(preferredName) : `procal-import-${stamp}${encrypted ? ".procalbak" : ".json"}`;
  if (!fileName.toLowerCase().endsWith(".json") && !fileName.toLowerCase().endsWith(".procalbak")) {
    fileName = `${fileName}${encrypted ? ".procalbak" : ".json"}`;
  }
  const base = fileName.replace(/\.(json|procalbak)$/i, "");
  const ext = fileName.toLowerCase().endsWith(".procalbak") ? ".procalbak" : ".json";
  let i = 1;
  while (fs.existsSync(path.join(getBackupDir(), fileName))) {
    fileName = `${base}-${i}${ext}`;
    i += 1;
  }
  const filePath = path.join(getBackupDir(), fileName);
  fs.writeFileSync(filePath, rawText, "utf-8");
  const st = fs.statSync(filePath);
  return {
    fileName,
    encrypted,
    backupKind,
    sizeBytes: st.size,
    mtime: st.mtime.toISOString(),
    createdAt: String((parsed || rawParsed).createdAt || ""),
    appVersion: String((parsed || rawParsed).appVersion || ""),
    tableCount: parsed && Array.isArray(parsed.tables)
      ? parsed.tables.length
      : (typeof rawParsed.tableCount === "number" ? rawParsed.tableCount : undefined),
    dbName: (parsed || rawParsed).source?.dbName,
    realmId: (parsed || rawParsed).source?.realmId
  };
}

export function deleteBackupFile(fileName: string): void {
  const filePath = getBackupFilePath(fileName);
  if (!fs.existsSync(filePath)) throw new Error("Backup file not found");
  fs.unlinkSync(filePath);
}

export async function importBackupIntoCurrentRealmFromContent(
  rawText: string,
  preferredName?: string,
  options?: { encryptionKey?: string | null }
): Promise<CrossRealmImportResult> {
  const item = saveImportedBackup(rawText, preferredName, {
    allowCrossRealm: true,
    encryptionKey: options?.encryptionKey || undefined
  });
  try {
    return await importBackupIntoCurrentRealmFromFile(item.fileName, options?.encryptionKey || null);
  } finally {
    try {
      deleteBackupFile(item.fileName);
    } catch {
      // Best effort cleanup for temporary operator import files.
    }
  }
}

async function clearCurrentDatabase(dbName: string, tablesToClear?: Iterable<string>): Promise<string[]> {
  const prisma = getPrisma();
  const tables = await listDatabaseTables(dbName);
  const selectedTableSet = tablesToClear ? new Set(Array.from(tablesToClear)) : null;
  const selected = tablesToClear
    ? tables.filter((table) => Boolean(selectedTableSet && selectedTableSet.has(table)))
    : tables;
  await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");
  try {
    for (const table of selected) {
      await prisma.$executeRawUnsafe(`DELETE FROM ${escapeId(table)}`);
    }
  } finally {
    await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
  }
  return selected;
}

async function importTables(
  snapshotTables: BackupTableSnapshot[],
  options?: ImportTablesOptions | null
): Promise<{ insertedTables: number; insertedRows: number; skippedTables: string[] }> {
  const cfg = loadStoredConfig();
  if (!cfg) throw new Error("Configuration missing");
  const prisma = getPrisma();
  const existing = new Set(await listDatabaseTables(cfg.dbName));
  const allowedTables = options?.allowedTables || null;
  let insertedTables = 0;
  let insertedRows = 0;
  const skippedTables: string[] = [];

  await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");
  try {
    for (const tableSnap of snapshotTables) {
      const table = String(tableSnap.table || "").trim();
      if (allowedTables && !allowedTables.has(table)) {
        continue;
      }
      if (!table || !existing.has(table)) {
        if (table) skippedTables.push(table);
        continue;
      }
      insertedTables += 1;
      for (const row of Array.isArray(tableSnap.rows) ? tableSnap.rows : []) {
        const transformed = options?.transformRow ? options.transformRow(table, row || {}) : (row || {});
        if (!transformed) {
          continue;
        }
        const entries = Object.entries(transformed);
        if (!entries.length) {
          await prisma.$executeRawUnsafe(`INSERT INTO ${escapeId(table)} () VALUES ()`);
          insertedRows += 1;
          continue;
        }
        const cols = entries.map(([k]) => k);
        const values = entries.map(([field, value]) => {
          const decoded = decodeSpecial(value);
          return toSqlParam(normalizeDecodedBackupValue(table, field, decoded));
        });
        const placeholders = cols.map(() => "?").join(", ");
        const sql = `INSERT INTO ${escapeId(table)} (${cols.map(escapeId).join(", ")}) VALUES (${placeholders})`;
        await prisma.$executeRawUnsafe(sql, ...values);
        insertedRows += 1;
      }
    }
  } finally {
    await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
  }

  return { insertedTables, insertedRows, skippedTables };
}

function trimString(value: unknown): string {
  return String(value || "").trim();
}

function clampInteger(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(100, Math.trunc(parsed)));
}

function normalizeImportedRole(value: unknown): "system_admin" | "admin" | "boss" | "hr" | "pr" | "user" | "role_a" | "role_b" | "role_c" | "role_d" {
  const raw = trimString(value);
  if (["system_admin", "admin", "boss", "hr", "pr", "user", "role_a", "role_b", "role_c", "role_d"].includes(raw)) {
    return raw as "system_admin" | "admin" | "boss" | "hr" | "pr" | "user" | "role_a" | "role_b" | "role_c" | "role_d";
  }
  return "user";
}

function normalizeImportedViewMode(value: unknown): "simple" | "tasks" {
  return trimString(value) === "tasks" ? "tasks" : "simple";
}

function normalizeImportedColor(value: unknown): string | null {
  const raw = trimString(value);
  return /^#[0-9a-fA-F]{6}$/.test(raw) ? raw : null;
}

function sanitizeImportedUsernameSegment(value: string): string {
  const raw = trimString(value).toLowerCase();
  const normalized = raw.replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return (normalized || "user").slice(0, 40);
}

function buildBackupUserProfileMap(snapshotTables: BackupTableSnapshot[]): Map<string, BackupUserProfile> {
  const map = new Map<string, BackupUserProfile>();
  const userTable = snapshotTables.find((entry) => String(entry.table || "").trim() === "User");
  for (const row of Array.isArray(userTable?.rows) ? userTable!.rows : []) {
    const sourceId = trimString((row as Record<string, unknown>).id);
    if (!sourceId) continue;
    map.set(sourceId, {
      sourceId,
      username: trimString((row as Record<string, unknown>).username) || `backup-user-${sourceId.slice(0, 8)}`,
      nickname: trimString((row as Record<string, unknown>).nickname) || null,
      fullName: trimString((row as Record<string, unknown>).fullName) || null,
      workplace: trimString((row as Record<string, unknown>).workplace) || null,
      jobTitle: trimString((row as Record<string, unknown>).jobTitle) || null,
      role: trimString((row as Record<string, unknown>).role) || null,
      viewMode: trimString((row as Record<string, unknown>).viewMode) || null,
      displayColor: trimString((row as Record<string, unknown>).displayColor) || null,
      calendarTintOpacity: clampInteger((row as Record<string, unknown>).calendarTintOpacity, 10)
    });
  }
  return map;
}

function isUserReferenceField(fieldName: string): boolean {
  const raw = trimString(fieldName);
  return USER_REFERENCE_FIELDS.has(raw) || raw.endsWith("UserId");
}

function collectReferencedUserIds(snapshotTables: BackupTableSnapshot[]): Set<string> {
  const ids = new Set<string>();
  for (const tableSnap of snapshotTables) {
    const table = trimString(tableSnap.table);
    if (!table || CROSS_REALM_IMPORT_SKIP_TABLES.has(table)) continue;
    for (const row of Array.isArray(tableSnap.rows) ? tableSnap.rows : []) {
      for (const [field, value] of Object.entries(row || {})) {
        if (!isUserReferenceField(field)) continue;
        const userId = trimString(value);
        if (userId) ids.add(userId);
      }
    }
  }
  return ids;
}

async function buildUniqueImportedUsername(baseUsername: string): Promise<string> {
  const prisma = getPrisma();
  const base = `imported-${sanitizeImportedUsernameSegment(baseUsername)}`;
  let candidate = base || "imported-user";
  let suffix = 2;
  while (await prisma.user.findUnique({ where: { username: candidate } })) {
    candidate = `${base.slice(0, 52)}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

async function createImportedPlaceholderUser(profile: BackupUserProfile) {
  const prisma = getPrisma();
  const passwordHash = await hashPassword(crypto.randomBytes(18).toString("hex"));
  const username = await buildUniqueImportedUsername(profile.username || profile.sourceId);
  const nickname = trimString(profile.nickname || profile.fullName || profile.username) || `Imported ${profile.sourceId.slice(0, 8)}`;
  const fullName = trimString(profile.fullName || profile.nickname || profile.username) || "Imported backup user";
  const created = await prisma.user.create({
    data: {
      username,
      nickname,
      fullName,
      workplace: trimString(profile.workplace) || "Imported backup",
      jobTitle: trimString(profile.jobTitle) || "Imported from backup",
      passwordHash,
      role: normalizeImportedRole(profile.role),
      status: "suspended",
      viewMode: normalizeImportedViewMode(profile.viewMode),
      displayColor: normalizeImportedColor(profile.displayColor),
      calendarTintOpacity: clampInteger(profile.calendarTintOpacity, 10),
      isDeleted: false
    }
  });
  await upsertUserInSharedPersonnel(prisma, created);
  return created;
}

async function buildCrossRealmUserIdMap(snapshotTables: BackupTableSnapshot[]): Promise<{ userIdMap: Map<string, string>; matchedUsers: number; placeholderUsers: number }> {
  const prisma = getPrisma();
  const userProfiles = buildBackupUserProfileMap(snapshotTables);
  const referencedIds = collectReferencedUserIds(snapshotTables);
  for (const sourceId of userProfiles.keys()) {
    referencedIds.add(sourceId);
  }

  const existingUsers = await prisma.user.findMany({
    select: { id: true, username: true }
  });
  const byUsername = new Map(existingUsers.map((user) => [trimString(user.username).toLowerCase(), user]));
  const userIdMap = new Map<string, string>();
  let matchedUsers = 0;
  let placeholderUsers = 0;

  for (const sourceId of referencedIds) {
    const profile = userProfiles.get(sourceId) || {
      sourceId,
      username: `backup-user-${sourceId.slice(0, 8)}`,
      nickname: null,
      fullName: null,
      workplace: null,
      jobTitle: null,
      role: "user",
      viewMode: "simple",
      displayColor: null,
      calendarTintOpacity: 10
    };
    const match = byUsername.get(trimString(profile.username).toLowerCase());
    if (match) {
      userIdMap.set(sourceId, match.id);
      matchedUsers += 1;
      continue;
    }
    const created = await createImportedPlaceholderUser(profile);
    byUsername.set(trimString(created.username).toLowerCase(), { id: created.id, username: created.username });
    userIdMap.set(sourceId, created.id);
    placeholderUsers += 1;
  }

  return { userIdMap, matchedUsers, placeholderUsers };
}

function buildCrossRealmImportTables(snapshotTables: BackupTableSnapshot[]): BackupTableSnapshot[] {
  return snapshotTables.filter((entry) => {
    const table = trimString(entry.table);
    return Boolean(table) && !CROSS_REALM_IMPORT_SKIP_TABLES.has(table);
  });
}

function buildCrossRealmClearTableNames(snapshotTables: BackupTableSnapshot[]): string[] {
  const names = new Set<string>();
  for (const entry of snapshotTables) {
    const table = trimString(entry.table);
    if (!table) continue;
    if (!CROSS_REALM_IMPORT_SKIP_TABLES.has(table)) {
      names.add(table);
      continue;
    }
    if (CROSS_REALM_CLEAR_ONLY_TABLES.has(table)) {
      names.add(table);
    }
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b));
}

function remapCrossRealmImportRow(
  table: string,
  row: Record<string, JsonValue | EncodedScalar>,
  userIdMap: Map<string, string>
): Record<string, JsonValue | EncodedScalar> | null {
  if (trimString(table) === "User") {
    return null;
  }
  const next: Record<string, JsonValue | EncodedScalar> = {};
  for (const [field, value] of Object.entries(row || {})) {
    if (isUserReferenceField(field)) {
      const sourceUserId = trimString(value);
      if (sourceUserId) {
        const mapped = userIdMap.get(sourceUserId);
        if (!mapped) {
          throw new Error(`Cross-realm import could not map user reference "${sourceUserId}" in ${table}.${field}.`);
        }
        next[field] = mapped;
        continue;
      }
    }
    next[field] = value;
  }
  return next;
}

export async function restoreFullBackupFromFile(fileName: string, encryptionKey?: string | null): Promise<{
  fileName: string;
  backupKind: BackupKind;
  appVersion: string;
  createdAt: string;
  clearedTableCount: number;
  insertedTables: number;
  insertedRows: number;
  skippedTables: string[];
}> {
  const cfg = loadStoredConfig();
  if (!cfg) throw new Error("Configuration missing");
  const filePath = getBackupFilePath(fileName);
  if (!fs.existsSync(filePath)) throw new Error("Backup file not found");
  const pkg = parseBackupFile(filePath, { encryptionKey });
  const currentRealmId = getRealmIdentifier();
  const backupRealmId = String(pkg.source?.realmId || "").trim();
  if (!backupRealmId) {
    throw new Error("Backup is missing realm lock (source.realmId). Restore blocked.");
  }
  if (backupRealmId !== currentRealmId) {
    throw new Error(`Backup realm mismatch. Restore blocked for safety (expected "${currentRealmId}", got "${backupRealmId}").`);
  }

  const clearedTables = await clearCurrentDatabase(cfg.dbName);
  const importResult = await importTables(pkg.tables);
  if (pkg.backupKind !== "working") {
    writeConfigFilesSnapshot(pkg.configFiles);
  }
  await closePrisma();

  return {
    fileName,
    backupKind: pkg.backupKind === "working" ? "working" : "full",
    appVersion: String(pkg.appVersion || "unknown"),
    createdAt: String(pkg.createdAt || ""),
    clearedTableCount: clearedTables.length,
    insertedTables: importResult.insertedTables,
    insertedRows: importResult.insertedRows,
    skippedTables: importResult.skippedTables
  };
}

export async function importBackupIntoCurrentRealmFromFile(
  fileName: string,
  encryptionKey?: string | null
): Promise<CrossRealmImportResult> {
  const cfg = loadStoredConfig();
  if (!cfg) throw new Error("Configuration missing");
  const filePath = getBackupFilePath(fileName);
  if (!fs.existsSync(filePath)) throw new Error("Backup file not found");
  const pkg = parseBackupFile(filePath, { encryptionKey });
  const userMapResult = await buildCrossRealmUserIdMap(pkg.tables);
  const importTablesList = buildCrossRealmImportTables(pkg.tables);
  const clearTableNames = buildCrossRealmClearTableNames(pkg.tables);
  const clearedTables = await clearCurrentDatabase(cfg.dbName, clearTableNames);
  const clearOnlyTableCount = clearedTables.filter((table) => !importTablesList.some((entry) => trimString(entry.table) === table)).length;
  const allowedTables = new Set(importTablesList.map((entry) => trimString(entry.table)).filter(Boolean));
  const importResult = await importTables(importTablesList, {
    allowedTables,
    transformRow: (table, row) => remapCrossRealmImportRow(table, row, userMapResult.userIdMap)
  });
  await closePrisma();

  return {
    fileName,
    backupKind: pkg.backupKind === "working" ? "working" : "full",
    appVersion: String(pkg.appVersion || "unknown"),
    createdAt: String(pkg.createdAt || ""),
    sourceRealmId: trimString(pkg.source?.realmId) || undefined,
    clearedTableCount: clearedTables.length,
    clearedOnlyTableCount: clearOnlyTableCount,
    insertedTables: importResult.insertedTables,
    insertedRows: importResult.insertedRows,
    skippedTables: importResult.skippedTables,
    matchedUsers: userMapResult.matchedUsers,
    placeholderUsers: userMapResult.placeholderUsers,
    ignoredConfigFiles: true
  };
}

export function applyBackupRetention(kind: BackupKind, retentionDays: number): { deleted: string[]; kept: number } {
  const days = Math.max(0, Math.trunc(Number(retentionDays || 0)));
  const items = listBackupFiles();
  const filtered = items.filter((x) => (x.backupKind || "full") === kind);
  if (days <= 0) return { deleted: [], kept: filtered.length };

  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const deleted: string[] = [];
  for (const item of filtered) {
    const t = Date.parse(String(item.createdAt || item.mtime || ""));
    if (!Number.isFinite(t) || t >= cutoff) continue;
    try {
      deleteBackupFile(item.fileName);
      deleted.push(item.fileName);
    } catch {
      // ignore failed delete and continue
    }
  }
  return { deleted, kept: Math.max(0, filtered.length - deleted.length) };
}

export function applyAllBackupRetention(settings?: BackupAutomationSettings): { fullDeleted: string[]; workingDeleted: string[] } {
  const cfg = settings || loadBackupAutomationSettings();
  const fullRes = applyBackupRetention("full", cfg.full.retentionDays);
  const workingRes = applyBackupRetention("working", cfg.working.retentionDays);
  return { fullDeleted: fullRes.deleted, workingDeleted: workingRes.deleted };
}
