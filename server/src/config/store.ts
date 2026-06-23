import fs from "fs";
import path from "path";

export type StoredConfig = {
  dbHost: string;
  dbPort: number;
  dbName: string;
  dbUser: string;
  dbPassword: string;
  jwtSecret: string;
  refreshSecret: string;
  cookieSecure: boolean;
};

const defaultConfigPath = process.env.CONFIG_PATH || "/app/config/config.json";

export function getConfigPath(): string {
  return defaultConfigPath;
}

export function ensureConfigDir(): void {
  const dir = path.dirname(getConfigPath());
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export function loadStoredConfig(): StoredConfig | null {
  const p = getConfigPath();
  if (!fs.existsSync(p)) return null;
  const raw = fs.readFileSync(p, "utf-8");
  return JSON.parse(raw) as StoredConfig;
}

export function saveStoredConfig(config: StoredConfig): void {
  ensureConfigDir();
  fs.writeFileSync(getConfigPath(), JSON.stringify(config, null, 2), "utf-8");
}

export function buildDatabaseUrl(cfg: Pick<StoredConfig, "dbHost" | "dbPort" | "dbName" | "dbUser" | "dbPassword">): string {
  const user = encodeURIComponent(cfg.dbUser);
  const pass = encodeURIComponent(cfg.dbPassword);
  return `mysql://${user}:${pass}@${cfg.dbHost}:${cfg.dbPort}/${cfg.dbName}?connection_limit=10&timezone=Z`;
}

