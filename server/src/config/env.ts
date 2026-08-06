import crypto from "crypto";
import { loadStoredConfig } from "./store";

export type RuntimeConfig = {
  port: number;
  nodeEnv: string;
  setupPath: string;
  accessTokenTtlSec: number;
  refreshTokenTtlSec: number;
  webhookUrl?: string;
  instanceSlug?: string;
  mobileAppDownloadUrl?: string;
  bugReportUrl?: string;
};

const fallbackSecrets = {
  jwtSecret: process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex"),
  refreshSecret: process.env.REFRESH_SECRET || crypto.randomBytes(32).toString("hex")
};

export function getRuntimeConfig(): RuntimeConfig {
  return {
    port: Number(process.env.PORT || 8080),
    nodeEnv: process.env.NODE_ENV || "production",
    setupPath: "/setup",
    accessTokenTtlSec: Number(process.env.ACCESS_TTL_SEC || 900),
    refreshTokenTtlSec: Number(process.env.REFRESH_TTL_SEC || 1209600),
    webhookUrl: process.env.HA_WEBHOOK_URL || undefined,
    instanceSlug: process.env.INSTANCE_SLUG || undefined,
    mobileAppDownloadUrl: process.env.MOBILE_APP_DOWNLOAD_URL || "https://github.com/Teo-Vortex/ProCal-core-public/releases/latest",
    bugReportUrl: process.env.BUG_REPORT_URL || "https://github.com/Teo-Vortex/ProCal-core-public/issues/new?template=bug_report.yml"
  };
}

export function getSecrets(): { jwtSecret: string; refreshSecret: string } {
  const fromFile = loadStoredConfig();
  return {
    jwtSecret: fromFile?.jwtSecret || fallbackSecrets.jwtSecret,
    refreshSecret: fromFile?.refreshSecret || fallbackSecrets.refreshSecret
  };
}
