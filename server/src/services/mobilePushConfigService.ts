import crypto from "crypto";
import fs from "fs";
import path from "path";
import { getConfigPath, loadStoredConfig } from "../config/store";

export type FirebaseClientConfig = {
  apiKey: string;
  applicationId: string;
  projectId: string;
  senderId: string;
  storageBucket?: string;
};

export type StoredMobilePushConfig = {
  serviceAccount: Record<string, unknown>;
  client: FirebaseClientConfig;
  payloadMode: "generic" | "detailed";
  updatedAt: string;
};

type EncryptedConfigEnvelope = {
  version: 1;
  algorithm: "aes-256-gcm";
  iv: string;
  tag: string;
  ciphertext: string;
};

export const MOBILE_PUSH_SECRET_FILE = "mobile-push.secrets.json";

function getSecretPath(): string {
  return path.join(path.dirname(getConfigPath()), MOBILE_PUSH_SECRET_FILE);
}

function deriveEncryptionKey(): Buffer {
  const config = loadStoredConfig();
  if (!config) throw new Error("Configuration missing");
  const material = Buffer.from(`${config.jwtSecret}\0${config.refreshSecret}`, "utf8");
  return Buffer.from(crypto.hkdfSync(
    "sha256",
    material,
    Buffer.from("procal-mobile-push-config-v1", "utf8"),
    Buffer.from("firebase-admin-credentials", "utf8"),
    32
  ));
}

function normalizePayloadMode(value: unknown): "generic" | "detailed" {
  const mode = String(value || "").trim().toLowerCase();
  return mode === "full" || mode === "detailed" || mode === "content" ? "detailed" : "generic";
}

function requiredString(source: Record<string, unknown>, key: string): string {
  const value = String(source[key] || "").trim();
  if (!value) throw new Error(`Firebase configuration is missing ${key}`);
  return value;
}

export function normalizeServiceAccount(input: unknown, validatePrivateKey = true): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Firebase service account JSON must be an object");
  }
  const source = input as Record<string, unknown>;
  const type = requiredString(source, "type");
  const projectId = requiredString(source, "project_id");
  const clientEmail = requiredString(source, "client_email");
  const privateKey = requiredString(source, "private_key");
  const privateKeyHeader = ["BEGIN", "PRIVATE", "KEY"].join(" ");
  if (type !== "service_account") throw new Error("Firebase JSON is not a service account");
  if (!clientEmail.includes("@") || !privateKey.includes(privateKeyHeader)) {
    throw new Error("Firebase service account credentials are invalid");
  }
  if (validatePrivateKey) {
    try {
      crypto.createPrivateKey(privateKey);
    } catch {
      throw new Error("Firebase service account private key is invalid");
    }
  }
  return { ...source, type, project_id: projectId, client_email: clientEmail, private_key: privateKey };
}

export function extractFirebaseClientConfig(input: unknown): FirebaseClientConfig {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("google-services.json must be an object");
  }
  const root = input as Record<string, any>;
  const projectInfo = root.project_info && typeof root.project_info === "object" ? root.project_info : {};
  const clients = Array.isArray(root.client) ? root.client : [];
  const androidClient = clients.find((item: any) => (
    String(item?.client_info?.android_client_info?.package_name || "").trim() === "com.procal.mobile"
  ));
  if (!androidClient) throw new Error("google-services.json has no com.procal.mobile Android client");
  const apiKey = Array.isArray(androidClient.api_key)
    ? String(androidClient.api_key.find((item: any) => String(item?.current_key || "").trim())?.current_key || "").trim()
    : "";
  const client: FirebaseClientConfig = {
    apiKey,
    applicationId: String(androidClient?.client_info?.mobilesdk_app_id || "").trim(),
    projectId: String(projectInfo.project_id || "").trim(),
    senderId: String(projectInfo.project_number || "").trim(),
    storageBucket: String(projectInfo.storage_bucket || "").trim() || undefined
  };
  Object.entries(client).forEach(([key, value]) => {
    if (key !== "storageBucket" && !String(value || "").trim()) {
      throw new Error(`google-services.json is missing ${key}`);
    }
  });
  return client;
}

export function saveMobilePushConfig(input: {
  serviceAccount: unknown;
  googleServices: unknown;
  payloadMode?: unknown;
}): StoredMobilePushConfig {
  const serviceAccount = normalizeServiceAccount(input.serviceAccount);
  const client = extractFirebaseClientConfig(input.googleServices);
  if (String(serviceAccount.project_id || "") !== client.projectId) {
    throw new Error("The service account and google-services.json belong to different Firebase projects");
  }
  const config: StoredMobilePushConfig = {
    serviceAccount,
    client,
    payloadMode: normalizePayloadMode(input.payloadMode),
    updatedAt: new Date().toISOString()
  };
  return writeMobilePushConfig(config);
}

function writeMobilePushConfig(config: StoredMobilePushConfig): StoredMobilePushConfig {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", deriveEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(config), "utf8"), cipher.final()]);
  const envelope: EncryptedConfigEnvelope = {
    version: 1,
    algorithm: "aes-256-gcm",
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64")
  };
  const target = getSecretPath();
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const temporary = `${target}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(envelope), { encoding: "utf8", mode: 0o600 });
  fs.renameSync(temporary, target);
  try { fs.chmodSync(target, 0o600); } catch { /* Best effort on non-POSIX filesystems. */ }
  return config;
}

export function updateMobilePushPayloadMode(payloadMode: unknown): StoredMobilePushConfig {
  const existing = loadMobilePushConfig();
  if (!existing) throw new Error("Upload the Firebase configuration before changing the payload mode");
  return writeMobilePushConfig({
    ...existing,
    payloadMode: normalizePayloadMode(payloadMode),
    updatedAt: new Date().toISOString()
  });
}

export function loadMobilePushConfig(): StoredMobilePushConfig | null {
  const target = getSecretPath();
  if (!fs.existsSync(target)) return null;
  const envelope = JSON.parse(fs.readFileSync(target, "utf8")) as EncryptedConfigEnvelope;
  if (envelope.version !== 1 || envelope.algorithm !== "aes-256-gcm") {
    throw new Error("Unsupported mobile push configuration format");
  }
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    deriveEncryptionKey(),
    Buffer.from(envelope.iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(envelope.ciphertext, "base64")),
    decipher.final()
  ]).toString("utf8");
  const parsed = JSON.parse(plaintext) as StoredMobilePushConfig;
  return {
    serviceAccount: normalizeServiceAccount(parsed.serviceAccount, false),
    client: parsed.client,
    payloadMode: normalizePayloadMode(parsed.payloadMode),
    updatedAt: String(parsed.updatedAt || "")
  };
}

export function deleteMobilePushConfig(): boolean {
  const target = getSecretPath();
  if (!fs.existsSync(target)) return false;
  fs.unlinkSync(target);
  return true;
}
