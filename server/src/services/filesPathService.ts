import fs from "fs";
import path from "path";
import { getConfigPath } from "../config/store";
import { getRuntimeConfig } from "../config/env";

function sanitizeSegment(value: string): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "") || "default";
}

export function getRealmIdentifier(): string {
  const runtime = getRuntimeConfig();
  const fromRuntime = String(runtime.instanceSlug || "").trim();
  const fromEnv = String(process.env.INSTANCE_SLUG || "").trim();
  return sanitizeSegment(fromRuntime || fromEnv || "local");
}

export function getFilesRootDir(): string {
  const fromEnv = String(process.env.FILES_ROOT_DIR || "").trim();
  if (fromEnv) return fromEnv;
  const configDir = path.dirname(getConfigPath());
  return path.join(configDir, "files");
}

export function getEventsFilesRootDir(): string {
  return path.join(getFilesRootDir(), "events");
}

export function getChatFilesRootDir(): string {
  return path.join(getFilesRootDir(), "chat");
}

export function getBackupsRootDir(): string {
  return path.join(getFilesRootDir(), "backups");
}

export function getSharedFilesRootDir(): string {
  return path.join(getFilesRootDir(), "shared");
}

export function ensureFilesPathLayout(): void {
  const dirs = [
    getFilesRootDir(),
    getEventsFilesRootDir(),
    getChatFilesRootDir(),
    getBackupsRootDir(),
    getSharedFilesRootDir()
  ];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
}
